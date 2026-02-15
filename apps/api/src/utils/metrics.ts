/**
 * Performance metrics tracking utility using Application Insights.
 */

import * as appInsights from 'applicationinsights';
import type { LogContext } from './logger.js';

export interface MetricContext extends LogContext {
  [key: string]: unknown;
}

let telemetryClient: appInsights.TelemetryClient | null = null;

/**
 * Set the telemetry client (should be the same one used by logger).
 */
export function setTelemetryClient(client: appInsights.TelemetryClient | null): void {
  telemetryClient = client;
}

/**
 * Get the current telemetry client.
 */
export function getTelemetryClient(): appInsights.TelemetryClient | null {
  if (!telemetryClient && appInsights.defaultClient) {
    telemetryClient = appInsights.defaultClient;
  }
  return telemetryClient;
}

/**
 * Track a custom metric value.
 */
export function trackMetric(
  name: string,
  value: number,
  context?: MetricContext
): void {
  const client = getTelemetryClient();
  
  if (!client) {
    console.debug(`[Metrics] ${name}: ${value}`, context);
    return;
  }

  client.trackMetric({
    name,
    value,
    properties: context as Record<string, string>,
  });
}

/**
 * Track duration of an operation in milliseconds.
 */
export function trackDuration(
  operationName: string,
  durationMs: number,
  context?: MetricContext
): void {
  trackMetric(`${operationName}.duration_ms`, durationMs, context);
}

/**
 * Track a counter (increment by 1).
 */
export function trackCount(
  name: string,
  context?: MetricContext
): void {
  trackMetric(name, 1, context);
}

/**
 * Performance timer for measuring operation duration.
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private context?: MetricContext;

  constructor(operation: string, context?: MetricContext) {
    this.operation = operation;
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Stop the timer and track the duration.
   */
  stop(): number {
    const durationMs = Date.now() - this.startTime;
    trackDuration(this.operation, durationMs, this.context);
    return durationMs;
  }

  /**
   * Get the elapsed time without stopping the timer.
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Start a performance timer for an operation.
 */
export function startTimer(
  operation: string,
  context?: MetricContext
): PerformanceTimer {
  return new PerformanceTimer(operation, context);
}

/**
 * Measure the duration of an async operation.
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: MetricContext
): Promise<T> {
  const timer = startTimer(operation, context);
  try {
    const result = await fn();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Measure the duration of a synchronous operation.
 */
export function measureSync<T>(
  operation: string,
  fn: () => T,
  context?: MetricContext
): T {
  const timer = startTimer(operation, context);
  try {
    const result = fn();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Track generation-specific metrics.
 */
export const GenerationMetrics = {
  /**
   * Track end-to-end generation time.
   */
  trackGenerationDuration(durationMs: number, context?: MetricContext): void {
    trackDuration('generation', durationMs, context);
  },

  /**
   * Track number of images generated.
   */
  trackImagesCount(count: number, context?: MetricContext): void {
    trackMetric('generation.images_count', count, context);
  },

  /**
   * Track generation errors.
   */
  trackGenerationError(context?: MetricContext): void {
    trackCount('generation.errors_count', context);
  },

  /**
   * Track geodata lookup time.
   */
  trackGeodataLookup(durationMs: number, context?: MetricContext): void {
    trackDuration('geodata.lookup', durationMs, context);
  },

  /**
   * Track model call duration.
   */
  trackModelCall(durationMs: number, modelId: string, context?: MetricContext): void {
    trackDuration('model.call', durationMs, {
      ...context,
      modelId,
    });
  },

  /**
   * Track blob upload duration.
   */
  trackBlobUpload(durationMs: number, context?: MetricContext): void {
    trackDuration('blob.upload', durationMs, context);
  },

  /**
   * Track video generation duration.
   */
  trackVideoGeneration(durationMs: number, context?: MetricContext): void {
    trackDuration('video.generation', durationMs, context);
  },
};
