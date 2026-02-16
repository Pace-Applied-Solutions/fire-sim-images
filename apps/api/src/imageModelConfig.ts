import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { InvocationContext } from '@azure/functions';

/**
 * Unified image model configuration.
 *
 * Three environment variables control which model and endpoint to use:
 *
 *   IMAGE_MODEL     – Model / deployment name (e.g. "gemini-3-pro-image-preview", "gemini-2.5-flash-image")
 *   IMAGE_MODEL_KEY – API key or access token
 *   IMAGE_MODEL_URL – Base endpoint URL (e.g. "https://generativelanguage.googleapis.com/v1beta")
 *
 * Each provider constructs the full request URL from these three values.
 * Key Vault secret names mirror the env vars with "--" separators:
 *   ImageModel--Model, ImageModel--Key, ImageModel--Url
 */
export interface ImageModelConfig {
  /** Model or deployment name (e.g. "gemini-3-pro-image-preview", "gemini-2.5-flash-image") */
  model: string;
  /** API key or access token */
  key: string;
  /** Base endpoint URL */
  url: string;
}

/** @deprecated Use ImageModelConfig instead */
export type FluxConfig = ImageModelConfig;

const cache: { config?: ImageModelConfig } = {};

/**
 * Read config from environment variables.
 * Falls back to legacy FLUX_* and IMAGE_MODEL_* names for backward compatibility.
 */
const getEnvConfig = (): ImageModelConfig => {
  const config: ImageModelConfig = {
    model:
      process.env.IMAGE_MODEL ??
      process.env.IMAGE_MODEL_DEPLOYMENT ??
      process.env.FLUX_DEPLOYMENT ??
      '',
    key:
      process.env.IMAGE_MODEL_KEY ??
      process.env.IMAGE_MODEL_API_KEY ??
      process.env.FLUX_API_KEY ??
      '',
    url:
      process.env.IMAGE_MODEL_URL ??
      process.env.IMAGE_MODEL_BASE_URL ??
      process.env.IMAGE_MODEL_ENDPOINT ??
      process.env.FLUX_ENDPOINT ??
      '',
  };

  console.log('[ImageModelConfig] Environment configuration:', {
    model: config.model || '(not set)',
    key: config.key ? '***' : '(not set)',
    url: config.url ? '***' : '(not set)',
  });

  return config;
};

const isComplete = (config: ImageModelConfig): boolean =>
  Boolean(config.model && config.key && config.url);

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

export const getImageModelConfig = async (
  context: InvocationContext
): Promise<ImageModelConfig | null> => {
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

  // Try Key Vault if configured
  const keyVaultUri = process.env.KEY_VAULT_URI || process.env.KEY_VAULT_URL;
  if (keyVaultUri) {
    try {
      const credential = new DefaultAzureCredential();
      const client = new SecretClient(keyVaultUri, credential);

      const [model, key, url] = await Promise.all([
        safeGetSecret(client, 'ImageModel--Model')
          .then((v) => v ?? safeGetSecret(client, 'ImageModel--Deployment'))
          .then((v) => v ?? safeGetSecret(client, 'Flux--Deployment')),
        safeGetSecret(client, 'ImageModel--Key')
          .then((v) => v ?? safeGetSecret(client, 'ImageModel--ApiKey'))
          .then((v) => v ?? safeGetSecret(client, 'Flux--ApiKey')),
        safeGetSecret(client, 'ImageModel--Url')
          .then((v) => v ?? safeGetSecret(client, 'ImageModel--BaseUrl'))
          .then((v) => v ?? safeGetSecret(client, 'ImageModel--Endpoint'))
          .then((v) => v ?? safeGetSecret(client, 'Flux--Endpoint')),
      ]);

      const kvConfig: ImageModelConfig = {
        model: model ?? envConfig.model,
        key: key ?? envConfig.key,
        url: url ?? envConfig.url,
      };

      if (isComplete(kvConfig)) {
        cache.config = kvConfig;
        console.log('[ImageModelConfig] Using config from Key Vault');
        return kvConfig;
      }

      context.warn('[ImageModelConfig] Config incomplete after Key Vault lookup.', {
        model: !!kvConfig.model,
        key: !!kvConfig.key,
        url: !!kvConfig.url,
      });
    } catch (error) {
      context.warn('[ImageModelConfig] Key Vault lookup failed, continuing with env vars.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Final check
  if (isComplete(envConfig)) {
    cache.config = envConfig;
    console.log(
      '[ImageModelConfig] Using config from environment variables (after Key Vault fallback)'
    );
    return envConfig;
  }

  context.warn(
    '[ImageModelConfig] Image model config not available. Set IMAGE_MODEL, IMAGE_MODEL_KEY, and IMAGE_MODEL_URL. Using mock provider.'
  );
  return null;
};

/** @deprecated Use getImageModelConfig instead */
export const getFluxConfig = getImageModelConfig;

/** Reset the cached config — useful for testing. */
export const resetConfigCache = (): void => {
  delete cache.config;
};
