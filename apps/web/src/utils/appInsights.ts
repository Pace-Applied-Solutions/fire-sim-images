/**
 * Application Insights telemetry initialization for the web app.
 */

import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsights: ApplicationInsights | null = null;

/**
 * Initialize Application Insights for the web application.
 * Call this once during app startup.
 */
export function initializeAppInsights(): ApplicationInsights | null {
  // Check if already initialized
  if (appInsights) {
    return appInsights;
  }

  // Get connection string from environment variable
  const connectionString = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    // Silently return null in development/local environments
    return null;
  }

  try {
    appInsights = new ApplicationInsights({
      config: {
        connectionString,
        enableAutoRouteTracking: true, // Track page views automatically
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        enableCorsCorrelation: true,
        enableUnhandledPromiseRejectionTracking: true,
        disableFetchTracking: false, // Track API calls
      },
    });

    appInsights.loadAppInsights();
    appInsights.trackPageView(); // Manually track initial page view

    console.log('[AppInsights] Initialized successfully');
    return appInsights;
  } catch (error) {
    console.error('[AppInsights] Failed to initialize:', error);
    return null;
  }
}

/**
 * Get the Application Insights instance.
 */
export function getAppInsights(): ApplicationInsights | null {
  return appInsights;
}

/**
 * Track a custom event.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (appInsights) {
    appInsights.trackEvent({ name }, properties as Record<string, string>);
  }
}

/**
 * Track an exception.
 */
export function trackException(error: Error, properties?: Record<string, unknown>): void {
  if (appInsights) {
    appInsights.trackException({ exception: error }, properties as Record<string, string>);
  } else {
    console.error('[AppInsights] Exception occurred but telemetry not initialized:', error);
  }
}

/**
 * Track a custom metric.
 */
export function trackMetric(
  name: string,
  value: number,
  properties?: Record<string, unknown>
): void {
  if (appInsights) {
    appInsights.trackMetric({ name, average: value }, properties as Record<string, string>);
  }
}

/**
 * Set authenticated user context.
 */
export function setAuthenticatedUser(userId: string): void {
  if (appInsights) {
    appInsights.setAuthenticatedUserContext(userId);
  }
}

/**
 * Clear authenticated user context.
 */
export function clearAuthenticatedUser(): void {
  if (appInsights) {
    appInsights.clearAuthenticatedUserContext();
  }
}

/**
 * Track page view manually (if auto-tracking is disabled).
 */
export function trackPageView(name?: string, uri?: string): void {
  if (appInsights) {
    appInsights.trackPageView({ name, uri });
  }
}
