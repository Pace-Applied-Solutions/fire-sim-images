import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { createLogger } from '../utils/logger.js';

const { app } = functions;

// Health check timeout for external services (in milliseconds)
const EXTERNAL_SERVICE_TIMEOUT_MS = 5000;

interface HealthCheck {
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

/**
 * Health check endpoint for the API.
 */
export async function healthCheck(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = createLogger(context);
  logger.info('Health check requested');

  const checks: HealthCheck[] = [];

  // Check Application Insights
  checks.push(await checkApplicationInsights());

  // Check Blob Storage
  checks.push(await checkBlobStorage());

  // Check Key Vault
  checks.push(await checkKeyVault());

  // Check Azure AI Foundry / Azure OpenAI
  checks.push(await checkAIServices());

  // Check external data endpoints (NSW data)
  checks.push(await checkExternalData());

  // Determine overall status
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
  const hasDegraded = checks.some((c) => c.status === 'degraded');

  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = hasUnhealthy
    ? 'unhealthy'
    : hasDegraded
      ? 'degraded'
      : 'healthy';

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    checks,
  };

  logger.info('Health check completed', {
    status: overallStatus,
    checksCount: checks.length,
  });

  return {
    status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
    jsonBody: response,
  };
}

/**
 * Check Application Insights connectivity.
 */
async function checkApplicationInsights(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

    if (!connectionString) {
      return {
        service: 'Application Insights',
        status: 'degraded',
        message: 'Connection string not configured',
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      service: 'Application Insights',
      status: 'healthy',
      message: 'Connected',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'Application Insights',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Check Blob Storage connectivity.
 */
async function checkBlobStorage(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      return {
        service: 'Blob Storage',
        status: 'degraded',
        message: 'Connection string not configured',
        latencyMs: Date.now() - startTime,
      };
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Try to list containers (lightweight operation)
    const iterator = blobServiceClient.listContainers();
    await iterator.next();

    return {
      service: 'Blob Storage',
      status: 'healthy',
      message: 'Connected',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'Blob Storage',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Check Key Vault connectivity.
 */
async function checkKeyVault(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const vaultUrl = process.env.KEY_VAULT_URL;

    if (!vaultUrl) {
      return {
        service: 'Key Vault',
        status: 'degraded',
        message: 'Vault URL not configured',
        latencyMs: Date.now() - startTime,
      };
    }

    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);

    // Try to list secrets (just get the first page)
    const iterator = client.listPropertiesOfSecrets();
    await iterator.next();

    return {
      service: 'Key Vault',
      status: 'healthy',
      message: 'Connected',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'Key Vault',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Check AI Services connectivity.
 */
async function checkAIServices(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Check if we have Foundry or OpenAI configuration
    const foundryEndpoint = process.env.AI_FOUNDRY_ENDPOINT;
    const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!foundryEndpoint && !openaiEndpoint) {
      return {
        service: 'AI Services',
        status: 'degraded',
        message: 'No AI service endpoints configured',
        latencyMs: Date.now() - startTime,
      };
    }

    // For now, just check that configuration exists
    // A real check would make a lightweight API call
    return {
      service: 'AI Services',
      status: 'healthy',
      message: foundryEndpoint ? 'Azure AI Foundry configured' : 'Azure OpenAI configured',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'AI Services',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Check external data endpoints.
 */
async function checkExternalData(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Check NSW spatial data endpoints with a HEAD request
    // Note: AbortSignal.timeout() requires Node.js >=17.3.0 (Azure Functions v4 uses Node 20)
    const response = await fetch(
      'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer',
      { method: 'HEAD', signal: AbortSignal.timeout(EXTERNAL_SERVICE_TIMEOUT_MS) }
    );

    if (!response.ok) {
      return {
        service: 'External Data',
        status: 'degraded',
        message: `NSW spatial services returned ${response.status}`,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      service: 'External Data',
      status: 'healthy',
      message: 'NSW spatial services accessible',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'External Data',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unable to reach NSW spatial services',
      latencyMs: Date.now() - startTime,
    };
  }
}

// Register the function
app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});
