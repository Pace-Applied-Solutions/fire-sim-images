/**
 * Hook to monitor backend API health status.
 * Polls the /api/health endpoint at regular intervals.
 */

import { useEffect, useState } from 'react';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'checking';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: Array<{
    service: string;
    status: string;
    message?: string;
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const HEALTH_CHECK_INTERVAL = 30000; // Poll every 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout per request

/**
 * Hook to monitor API health status
 */
export function useHealthCheck(): {
  status: HealthStatus;
  lastChecked?: Date;
  message?: string;
} {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date>();
  const [message, setMessage] = useState<string>();

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setStatus('unhealthy');
        setMessage('API returned an error');
        setLastChecked(new Date());
        return;
      }

      const data: HealthCheckResponse = await response.json();
      setStatus(data.status as HealthStatus);
      setLastChecked(new Date());

      // Build a message showing which services are degraded/unhealthy
      const problemServices = data.checks
        .filter((c) => c.status !== 'healthy')
        .map((c) => `${c.service} (${c.status})`)
        .join(', ');

      setMessage(problemServices || undefined);
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

  return { status, lastChecked, message };
}
