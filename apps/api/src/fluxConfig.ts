import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { InvocationContext } from '@azure/functions';

export interface ImageModelConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

/** @deprecated Use ImageModelConfig instead */
export type FluxConfig = ImageModelConfig;

const cache: { config?: ImageModelConfig } = {};

const getEnvConfig = (): ImageModelConfig => {
  const config = {
    // Support both new generic names and legacy FLUX_ names for backward compatibility
    endpoint: process.env.IMAGE_MODEL_ENDPOINT ?? process.env.FLUX_ENDPOINT ?? '',
    apiKey: process.env.IMAGE_MODEL_API_KEY ?? process.env.FLUX_API_KEY ?? '',
    deployment: process.env.IMAGE_MODEL_DEPLOYMENT ?? process.env.FLUX_DEPLOYMENT ?? '',
    apiVersion: process.env.IMAGE_MODEL_API_VERSION ?? process.env.FLUX_API_VERSION ?? '2024-12-01-preview',
  };

  console.log('[ImageModelConfig] Environment configuration loaded:', {
    endpoint: config.endpoint ? '***' : 'missing',
    apiKey: config.apiKey ? '***' : 'missing',
    deployment: config.deployment || 'missing',
    apiVersion: config.apiVersion,
  });

  return config;
};

const isComplete = (config: ImageModelConfig): boolean =>
  Boolean(config.endpoint && config.apiKey && config.deployment && config.apiVersion);

/**
 * Helper to safely read a Key Vault secret, returning undefined on any error.
 */
const safeGetSecret = async (
  client: SecretClient,
  secretName: string
): Promise<string | undefined> => {
  try {
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch {
    return undefined;
  }
};

export const getImageModelConfig = async (context: InvocationContext): Promise<ImageModelConfig | null> => {
  if (cache.config) {
    return cache.config;
  }

  const envConfig = getEnvConfig();

  // Check env vars first — always the fastest path
  if (isComplete(envConfig)) {
    cache.config = envConfig;
    console.log('[ImageModelConfig] Using config from environment variables');
    return envConfig;
  }

  // Try Key Vault if configured (support both new and legacy secret names)
  const keyVaultUri = process.env.KEY_VAULT_URI || process.env.KEY_VAULT_URL;
  if (keyVaultUri) {
    try {
      const credential = new DefaultAzureCredential();
      const client = new SecretClient(keyVaultUri, credential);

      const [endpoint, apiKey, deployment, apiVersion] = await Promise.all([
        safeGetSecret(client, 'ImageModel--Endpoint').then(v => v ?? safeGetSecret(client, 'Flux--Endpoint')),
        safeGetSecret(client, 'ImageModel--ApiKey').then(v => v ?? safeGetSecret(client, 'Flux--ApiKey')),
        safeGetSecret(client, 'ImageModel--Deployment').then(v => v ?? safeGetSecret(client, 'Flux--Deployment')),
        safeGetSecret(client, 'ImageModel--ApiVersion').then(v => v ?? safeGetSecret(client, 'Flux--ApiVersion')),
      ]);

      const kvConfig: ImageModelConfig = {
        endpoint: endpoint ?? envConfig.endpoint,
        apiKey: apiKey ?? envConfig.apiKey,
        deployment: deployment ?? envConfig.deployment,
        apiVersion: apiVersion ?? envConfig.apiVersion,
      };

      if (isComplete(kvConfig)) {
        cache.config = kvConfig;
        console.log('[ImageModelConfig] Using config from Key Vault');
        return kvConfig;
      }

      context.warn('[ImageModelConfig] Config incomplete after Key Vault lookup.', {
        endpoint: !!kvConfig.endpoint,
        apiKey: !!kvConfig.apiKey,
        deployment: !!kvConfig.deployment,
      });
    } catch (error) {
      context.warn('[ImageModelConfig] Key Vault lookup failed, continuing with env vars.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Final check — env vars might still be partially filled from above
  if (isComplete(envConfig)) {
    cache.config = envConfig;
    console.log('[ImageModelConfig] Using config from environment variables (after Key Vault fallback)');
    return envConfig;
  }

  context.warn('[ImageModelConfig] Image model config not available from any source. Image generation will use mock provider.');
  return null;
};

/** @deprecated Use getImageModelConfig instead */
export const getFluxConfig = getImageModelConfig;
