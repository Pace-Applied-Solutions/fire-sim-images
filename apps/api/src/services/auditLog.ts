/**
 * Audit logging service for security compliance and user action tracking.
 * Logs all user actions with identity information to Application Insights.
 */

import appInsights from 'applicationinsights';
import type { AuditLogEntry, AuditAction, User } from '@fire-sim/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for audit logging service.
 */
interface AuditLogConfig {
  enabled: boolean;
  connectionString?: string;
  logToConsole: boolean; // Fallback for dev environments
}

/**
 * Initialize Application Insights telemetry client.
 */
let telemetryClient: appInsights.TelemetryClient | null = null;

export function initializeAuditLogging(config: AuditLogConfig): void {
  if (!config.enabled) {
    console.log('[AuditLog] Audit logging is disabled');
    return;
  }

  if (config.connectionString) {
    // Initialize Application Insights
    appInsights
      .setup(config.connectionString)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(false)
      .start();

    telemetryClient = appInsights.defaultClient;
    telemetryClient.context.tags[telemetryClient.context.keys.cloudRole] = 'fire-sim-api';

    console.log('[AuditLog] Application Insights initialized successfully');
  } else {
    console.warn(
      '[AuditLog] No Application Insights connection string provided, logging to console only'
    );
  }
}

/**
 * Log an audit event with user identity and action details.
 */
export function logAuditEvent(
  user: User | null,
  action: AuditAction,
  result: 'success' | 'failure',
  options?: {
    resourceId?: string;
    details?: Record<string, unknown>;
    errorMessage?: string;
  }
): void {
  const entry: AuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    userId: user?.id || 'anonymous',
    userEmail: user?.email || 'anonymous',
    authMethod: user?.authMethod || 'none',
    action,
    resourceId: options?.resourceId,
    details: options?.details,
    result,
    errorMessage: options?.errorMessage,
  };

  // Log to Application Insights if available
  if (telemetryClient) {
    telemetryClient.trackEvent({
      name: 'AuditLog',
      properties: {
        auditId: entry.id,
        timestamp: entry.timestamp,
        userId: entry.userId,
        userEmail: entry.userEmail,
        authMethod: entry.authMethod,
        action: entry.action,
        resourceId: entry.resourceId || 'N/A',
        result: entry.result,
        errorMessage: entry.errorMessage || 'N/A',
        ...entry.details,
      },
      measurements: {
        success: result === 'success' ? 1 : 0,
        failure: result === 'failure' ? 1 : 0,
      },
    });
  }

  // Always log to console for dev environments
  const logLevel = result === 'success' ? 'info' : 'error';
  const logMessage = `[AUDIT] ${action} by ${entry.userEmail} (${entry.userId}): ${result}`;
  const logData = {
    ...entry,
    ...options?.details,
  };

  if (logLevel === 'error') {
    console.error(logMessage, logData);
  } else {
    console.log(logMessage, logData);
  }
}

/**
 * Query recent audit logs (admin only).
 * Returns logs from Application Insights query.
 */
export async function queryAuditLogs(
  limit: number = 100,
  userId?: string,
  action?: AuditAction
): Promise<AuditLogEntry[]> {
  if (!telemetryClient) {
    console.warn('[AuditLog] Application Insights not configured, cannot query logs');
    return [];
  }

  // In production, this would use Application Insights Query API
  // For now, we return an empty array as this requires additional setup
  console.log(`[AuditLog] Query requested: limit=${limit}, userId=${userId}, action=${action}`);
  console.warn(
    '[AuditLog] Audit log querying not yet implemented - requires Application Insights Query API'
  );

  return [];
}

/**
 * Flush telemetry and close Application Insights connection.
 */
export function shutdownAuditLogging(): Promise<void> {
  if (telemetryClient) {
    return new Promise((resolve) => {
      telemetryClient!.flush();
      console.log('[AuditLog] Audit logs flushed successfully');
      resolve();
    });
  }
  return Promise.resolve();
}
