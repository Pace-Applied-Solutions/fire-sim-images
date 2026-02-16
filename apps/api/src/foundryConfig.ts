import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { InvocationContext } from '@azure/functions';

export interface FoundryConfig {
  projectPath: string;
  projectRegion: string;
  imageModel: string;
  projectAuthToken?: string; // Optional: use managed identity if not provided
}

const cache: { config?: FoundryConfig } = {};

const getEnvConfig = (): FoundryConfig => ({
  projectPath: process.env.FOUNDRY_PROJECT_PATH ?? '',
  projectRegion: process.env.FOUNDRY_PROJECT_REGION ?? '',
  imageModel: process.env.FOUNDRY_IMAGE_MODEL ?? '',
  projectAuthToken: process.env.FOUNDRY_PROJECT_AUTH_TOKEN,
});

const isComplete = (config: FoundryConfig): boolean =>
  Boolean(config.projectPath && config.projectRegion && config.imageModel);

export const getFoundryConfig = async (context: InvocationContext): Promise<FoundryConfig> => {
  if (cache.config) {
    return cache.config;
  }

  const envConfig = getEnvConfig();
  if (!process.env.KEY_VAULT_URI) {
    if (!isComplete(envConfig)) {
      context.error('Foundry config missing in environment variables.');
    }
    cache.config = envConfig;
    return envConfig;
  }

  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(process.env.KEY_VAULT_URI, credential);
    const [projectPath, projectRegion, imageModel, projectAuthToken] = await Promise.all([
      client.getSecret('Foundry--ProjectPath'),
      client.getSecret('Foundry--ProjectRegion'),
      client.getSecret('Foundry--ImageModel'),
      client.getSecret('Foundry--ProjectAuthToken').catch(() => ({ value: undefined })),
    ]);

    const config: FoundryConfig = {
      projectPath: projectPath.value ?? envConfig.projectPath,
      projectRegion: projectRegion.value ?? envConfig.projectRegion,
      imageModel: imageModel.value ?? envConfig.imageModel,
      projectAuthToken: projectAuthToken.value ?? envConfig.projectAuthToken,
    };

    if (!isComplete(config)) {
      context.error('Foundry config missing in Key Vault and environment variables.');
    }

    cache.config = config;
    return config;
  } catch (error) {
    context.error('Failed to read Foundry config from Key Vault.', error);
    cache.config = envConfig;
    return envConfig;
  }
};
