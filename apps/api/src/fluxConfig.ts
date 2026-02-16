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
    deployment: config.deployment,
    apiVersion: config.apiVersion,
  });
  
  return config;
};

const isComplete = (config: FluxConfig): boolean =>
  Boolean(config.endpoint && config.apiKey && config.deployment && config.apiVersion);

export const getFluxConfig = async (context: InvocationContext): Promise<FluxConfig | null> => {
  if (cache.config) {
    return cache.config;
  }

  const envConfig = getEnvConfig();

  // If no Key Vault configured, rely on env vars
  if (!process.env.KEY_VAULT_URI) {
    console.log('[FluxConfig] No Key Vault configured, checking environment variables');
    if (!isComplete(envConfig)) {
      context.warn('[FluxConfig] Flux config incomplete in environment variables.', {
        endpoint: !!envConfig.endpoint,
        apiKey: !!envConfig.apiKey,
        deployment: !!envConfig.deployment,
      });
      return null;
    }
    cache.config = envConfig;
    console.log('[FluxConfig] Using Flux config from environment variables');
    return envConfig;
  }

  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(process.env.KEY_VAULT_URI, credential);
    const [endpoint, apiKey, deployment, apiVersion] = await Promise.all([
      client.getSecret('Flux--Endpoint'),
      client.getSecret('Flux--ApiKey'),
      client.getSecret('Flux--Deployment'),
      client.getSecret('Flux--ApiVersion'),
    ]);

    const config: FluxConfig = {
      endpoint: endpoint.value ?? envConfig.endpoint,
      apiKey: apiKey.value ?? envConfig.apiKey,
      deployment: deployment.value ?? envConfig.deployment,
      apiVersion: apiVersion.value ?? envConfig.apiVersion,
    };

    if (!isComplete(config)) {
      context.warn('Flux config incomplete in Key Vault/environment.');
      return null;
    }

    cache.config = config;
    console.log('[FluxConfig] Using Flux config from Key Vault');
    return config;
  } catch (error) {
    context.error('Failed to read Flux config from Key Vault.', error);
    if (isComplete(envConfig)) {
      cache.config = envConfig;
      console.log('[FluxConfig] Fell back to environment variables after Key Vault error');
      return envConfig;
    }
    return null;
  }
};
