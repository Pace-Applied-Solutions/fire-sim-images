/**
 * Hook to monitor backend API health status.
 * Polls the /api/health endpoint at regular intervals.
 */

import { useEffect, useState } from 'react';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'checking';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs?: number;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheck[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const FALLBACK_API_BASE_URL = '/api';
const HEALTH_CHECK_INTERVAL = 30000; // Poll every 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout per request

/**
 * Hook to monitor API health status
 */
export function useHealthCheck(): {
  status: HealthStatus;
  lastChecked?: Date;
  message?: string;
  checks?: HealthCheck[];
} {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date>();
  const [message, setMessage] = useState<string>();
  const [checks, setChecks] = useState<HealthCheck[]>();

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up periodic polling
    const interval = setInterval(() => {
      checkHealth();
    }, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const baseUrls = [API_BASE_URL, FALLBACK_API_BASE_URL].filter(
        (value, index, self) => self.indexOf(value) === index
      );

      let lastError: Error | null = null;

      for (const baseUrl of baseUrls) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        try {
          const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            lastError = new Error(`API returned ${response.status}`);
            continue;
          }

          const data: HealthCheckResponse = await response.json();
          setStatus(data.status as HealthStatus);
          setChecks(data.checks);
          setLastChecked(new Date());

          // Build a message showing which services are degraded/unhealthy
          const problemServices = data.checks
            .filter((c) => c.status !== 'healthy')
            .map((c) => `${c.service} (${c.status})`)
            .join(', ');

          setMessage(problemServices || undefined);
          return;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error) {
            lastError = error;
          }
        }
      }

      if (lastError?.name === 'AbortError') {
        setStatus('unhealthy');
        setMessage('Health check timeout - API not responding');
      } else {
        setStatus('unhealthy');
        setMessage('Unable to reach API');
      }
      setLastChecked(new Date());
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setStatus('unhealthy');
        setMessage('Health check timeout - API not responding');
      } else {
        setStatus('unhealthy');
        setMessage('Unable to reach API');
      }
      setLastChecked(new Date());
    }
  };

  return { status, lastChecked, message, checks };
}
