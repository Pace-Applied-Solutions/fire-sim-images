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

const getEnvConfig = (): FluxConfig => ({
  endpoint: process.env.FLUX_ENDPOINT ?? '',
  apiKey: process.env.FLUX_API_KEY ?? '',
  deployment: process.env.FLUX_DEPLOYMENT ?? '',
  apiVersion: process.env.FLUX_API_VERSION ?? '2024-12-01-preview',
});

const isComplete = (config: FluxConfig): boolean =>
  Boolean(config.endpoint && config.apiKey && config.deployment && config.apiVersion);

export const getFluxConfig = async (context: InvocationContext): Promise<FluxConfig | null> => {
  if (cache.config) {
    return cache.config;
  }

  const envConfig = getEnvConfig();

  // If no Key Vault configured, rely on env vars
  if (!process.env.KEY_VAULT_URI) {
    if (!isComplete(envConfig)) {
      context.warn('Flux config missing env vars and Key Vault is not configured.');
      return null;
    }
    cache.config = envConfig;
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
    return config;
  } catch (error) {
    context.error('Failed to read Flux config from Key Vault.', error);
    if (isComplete(envConfig)) {
      cache.config = envConfig;
      return envConfig;
    }
    return null;
  }
};
