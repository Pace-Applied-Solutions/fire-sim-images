import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { InvocationContext } from '@azure/functions';

export interface FluxConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

const cache: { config?: FluxConfig } = {};

const getEnvConfig = (): FluxConfig => {
  const config = {
    endpoint: process.env.FLUX_ENDPOINT ?? '',
    apiKey: process.env.FLUX_API_KEY ?? '',
    deployment: process.env.FLUX_DEPLOYMENT ?? '',
    apiVersion: process.env.FLUX_API_VERSION ?? '2024-12-01-preview',
  };

  console.log('[FluxConfig] Environment configuration loaded:', {
    endpoint: config.endpoint ? '***' : 'missing',
    apiKey: config.apiKey ? '***' : 'missing',
    deployment: config.deployment || 'missing',
    apiVersion: config.apiVersion,
  });

  return config;
};

const isComplete = (config: FluxConfig): boolean =>
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

export const getFluxConfig = async (context: InvocationContext): Promise<FluxConfig | null> => {
  if (cache.config) {
    return cache.config;
  }

  const envConfig = getEnvConfig();

  // Check env vars first — always the fastest path
  if (isComplete(envConfig)) {
    cache.config = envConfig;
    console.log('[FluxConfig] Using Flux config from environment variables');
    return envConfig;
  }

  // Try Key Vault if configured
  const keyVaultUri = process.env.KEY_VAULT_URI || process.env.KEY_VAULT_URL;
  if (keyVaultUri) {
    try {
      const credential = new DefaultAzureCredential();
      const client = new SecretClient(keyVaultUri, credential);

      const [endpoint, apiKey, deployment, apiVersion] = await Promise.all([
        safeGetSecret(client, 'Flux--Endpoint'),
        safeGetSecret(client, 'Flux--ApiKey'),
        safeGetSecret(client, 'Flux--Deployment'),
        safeGetSecret(client, 'Flux--ApiVersion'),
      ]);

      const kvConfig: FluxConfig = {
        endpoint: endpoint ?? envConfig.endpoint,
        apiKey: apiKey ?? envConfig.apiKey,
        deployment: deployment ?? envConfig.deployment,
        apiVersion: apiVersion ?? envConfig.apiVersion,
      };

      if (isComplete(kvConfig)) {
        cache.config = kvConfig;
        console.log('[FluxConfig] Using Flux config from Key Vault');
        return kvConfig;
      }

      context.warn('[FluxConfig] Flux config incomplete after Key Vault lookup.', {
        endpoint: !!kvConfig.endpoint,
        apiKey: !!kvConfig.apiKey,
        deployment: !!kvConfig.deployment,
      });
    } catch (error) {
      context.warn('[FluxConfig] Key Vault lookup failed, continuing with env vars.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Final check — env vars might still be partially filled from above
  if (isComplete(envConfig)) {
    cache.config = envConfig;
    console.log('[FluxConfig] Using Flux config from environment variables (after Key Vault fallback)');
    return envConfig;
  }

  context.warn('[FluxConfig] Flux config not available from any source. Image generation will use mock provider.');
  return null;
};
