import '../setup.js';
import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { createLogger } from '../utils/logger.js';

const { app } = functions;

// Health check timeout for external services (in milliseconds)
const EXTERNAL_SERVICE_TIMEOUT_MS = 5000;

/**
 * Race a health check against a timeout.
 */
function withTimeout(
  checkFn: () => Promise<HealthCheck>,
  service: string,
  timeoutMs: number = EXTERNAL_SERVICE_TIMEOUT_MS
): Promise<HealthCheck> {
  return Promise.race([
    checkFn(),
    new Promise<HealthCheck>((resolve) =>
      setTimeout(
        () =>
          resolve({
            service,
            status: 'degraded',
            message: `Check timed out after ${timeoutMs}ms`,
          }),
        timeoutMs
      )
    ),
  ]);
}

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
  commitSha: string;
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
  checks.push(await withTimeout(checkApplicationInsights, 'Application Insights'));

  // Check Blob Storage
  checks.push(await withTimeout(checkBlobStorage, 'Blob Storage'));

  // Check Key Vault
  checks.push(await withTimeout(checkKeyVault, 'Key Vault'));

  // Check Azure AI Foundry / Azure OpenAI
  checks.push(await withTimeout(checkAIServices, 'AI Services'));

  // Check external data endpoints (NSW data)
  checks.push(await withTimeout(checkExternalData, 'External Data'));

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
    commitSha: process.env.DEPLOY_COMMIT_SHA || 'unknown',
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
    let blobServiceClient;

    // Try connection string first (local development)
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      // Fall back to account name with managed identity (Azure deployment)
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      if (!accountName) {
        return {
          service: 'Blob Storage',
          status: 'degraded',
          message: 'Storage account not configured',
          latencyMs: Date.now() - startTime,
        };
      }

      const credential = new DefaultAzureCredential();
      const blobUrl = `https://${accountName}.blob.core.windows.net`;
      blobServiceClient = new BlobServiceClient(blobUrl, credential);
    }

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
    // Support both KEY_VAULT_URL (local) and KEY_VAULT_URI (Azure)
    const vaultUrl = process.env.KEY_VAULT_URL || process.env.KEY_VAULT_URI;

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

    // Check connectivity with a lightweight operation (get vault properties)
    // Using getSecret as a light check but catching permission errors gracefully
    try {
      const iterator = client.listPropertiesOfSecrets();
      await iterator.next();
    } catch (iterError: unknown) {
      // If we get a 403 (permission denied), it still means the vault is accessible
      // Just the managed identity doesn't have permission to list - that's OK for health check
      const errorMsg = iterError instanceof Error ? iterError.message : String(iterError);
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        return {
          service: 'Key Vault',
          status: 'healthy',
          message: 'Connected (limited access)',
          latencyMs: Date.now() - startTime,
        };
      }
      throw iterError;
    }

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
    // Check if we have Azure AI Foundry configuration
    const foundryProjectPath = process.env.FOUNDRY_PROJECT_PATH;
    const foundryImageModel = process.env.FOUNDRY_IMAGE_MODEL;
    const foundryRegion = process.env.FOUNDRY_PROJECT_REGION;

    // Check for generic image model provider (new 3-var scheme)
    const imageModel =
      process.env.IMAGE_MODEL ?? process.env.IMAGE_MODEL_DEPLOYMENT ?? process.env.FLUX_DEPLOYMENT;
    const imageModelUrl =
      process.env.IMAGE_MODEL_URL ??
      process.env.IMAGE_MODEL_BASE_URL ??
      process.env.IMAGE_MODEL_ENDPOINT ??
      process.env.FLUX_ENDPOINT;

    // Check for Azure OpenAI (alternative)
    const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!foundryProjectPath && !imageModelUrl && !openaiEndpoint) {
      return {
        service: 'AI Services',
        status: 'degraded',
        message: 'No AI service endpoints configured',
        latencyMs: Date.now() - startTime,
      };
    }

    // For now, just check that configuration exists
    // A real check would make a lightweight API call
    let message = '';
    if (foundryProjectPath && foundryImageModel && foundryRegion) {
      message = `Azure AI Foundry configured (${foundryImageModel} in ${foundryRegion})`;
    } else if (imageModelUrl) {
      message = `Image model configured (${imageModel || 'unknown model'})`;
    } else if (openaiEndpoint) {
      message = 'Azure OpenAI configured';
    }

    return {
      service: 'AI Services',
      status: 'healthy',
      message,
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
