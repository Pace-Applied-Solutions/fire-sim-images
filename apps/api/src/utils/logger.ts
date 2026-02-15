/**
 * Structured logging utility for the API.
 * Integrates with Azure Application Insights and Azure Functions context logging.
 */

import type { InvocationContext } from '@azure/functions';
import * as appInsights from 'applicationinsights';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  scenarioId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

let telemetryClient: appInsights.TelemetryClient | null = null;

/**
 * Initialize Application Insights telemetry client.
 * Should be called once during app startup.
 */
export function initializeAppInsights(): void {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('[Logger] Application Insights connection string not found. Telemetry disabled.');
    return;
  }

  if (telemetryClient) {
    return; // Already initialized
  }

  try {
    appInsights.setup(connectionString);
    appInsights.start();
    
    telemetryClient = appInsights.defaultClient;
    console.log('[Logger] Application Insights initialized successfully');
  } catch (error) {
    console.error('[Logger] Failed to initialize Application Insights:', error);
  }
}

/**
 * Structured logger class that wraps Azure Functions context logging
 * and Application Insights telemetry.
 */
export class Logger {
  private functionContext?: InvocationContext;
  private defaultContext: LogContext;

  constructor(functionContext?: InvocationContext, defaultContext?: LogContext) {
    this.functionContext = functionContext;
    this.defaultContext = defaultContext || {};
  }

  /**
   * Log a debug message (verbose information for troubleshooting).
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log an informational message.
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message.
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message.
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    };
    this.log('error', message, errorContext);
  }

  /**
   * Internal log method that writes to multiple outputs.
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const mergedContext = { ...this.defaultContext, ...context };
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: mergedContext,
    };

    // Log to Azure Functions context if available
    if (this.functionContext) {
      const contextMsg = this.formatMessage(entry);
      
      switch (level) {
        case 'error':
          this.functionContext.error(contextMsg);
          break;
        case 'warn':
          this.functionContext.warn(contextMsg);
          break;
        default:
          this.functionContext.log(contextMsg);
      }
    }

    // Log to console (backup/local dev)
    const consoleMsg = this.formatMessage(entry);
    switch (level) {
      case 'debug':
        console.debug(consoleMsg);
        break;
      case 'warn':
        console.warn(consoleMsg);
        break;
      case 'error':
        console.error(consoleMsg);
        break;
      default:
        console.log(consoleMsg);
    }

    // Log to Application Insights
    if (telemetryClient) {
      const properties = {
        level,
        ...mergedContext,
      };
      
      if (level === 'error' && mergedContext.error) {
        // Track as exception
        telemetryClient.trackException({
          exception: new Error(message),
          properties,
        });
      } else {
        // Track as trace
        telemetryClient.trackTrace({
          message,
          properties,
        });
      }
    }
  }

  /**
   * Format log entry as a string for console/context output.
   */
  private formatMessage(entry: LogEntry): string {
    const parts = [
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ];

    if (entry.context) {
      const contextParts: string[] = [];
      if (entry.context.scenarioId) contextParts.push(`scenarioId=${entry.context.scenarioId}`);
      if (entry.context.userId) contextParts.push(`userId=${entry.context.userId}`);
      if (entry.context.correlationId) contextParts.push(`correlationId=${entry.context.correlationId}`);
      
      if (contextParts.length > 0) {
        parts.push(`| ${contextParts.join(', ')}`);
      }

      // Add other context properties
      const otherProps = Object.entries(entry.context)
        .filter(([key]) => !['scenarioId', 'userId', 'correlationId', 'error'].includes(key))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      
      if (otherProps) {
        parts.push(`| ${otherProps}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Create a child logger with additional default context.
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(this.functionContext, {
      ...this.defaultContext,
      ...additionalContext,
    });
  }
}

/**
 * Create a logger instance.
 * @param functionContext - Azure Functions invocation context
 * @param defaultContext - Default context to include in all log entries
 */
export function createLogger(
  functionContext?: InvocationContext,
  defaultContext?: LogContext
): Logger {
  return new Logger(functionContext, defaultContext);
}

/**
 * Flush all pending telemetry to Application Insights.
 * Should be called before process exit or at the end of long-running operations.
 */
export function flushTelemetry(): Promise<void> {
  if (!telemetryClient) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    telemetryClient?.flush();
    // Give it a moment to flush, then resolve
    setTimeout(() => resolve(), 500);
  });
}
