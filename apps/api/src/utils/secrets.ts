/**
 * Secrets management utility for accessing configuration values.
 * Supports Azure Key Vault in production and environment variables in development.
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

let secretClient: SecretClient | null = null;
const secretCache = new Map<string, string>();

/**
 * Initialize Azure Key Vault client.
 * Only initialized in production when KEY_VAULT_URL is set.
 */
function initializeKeyVault(): SecretClient | null {
  const keyVaultUrl = process.env.KEY_VAULT_URL;

  if (!keyVaultUrl) {
    // Not using Key Vault, will fall back to environment variables
    return null;
  }

  try {
    const credential = new DefaultAzureCredential();
    return new SecretClient(keyVaultUrl, credential);
  } catch (error) {
    console.error('[Secrets] Failed to initialize Key Vault client:', error);
    return null;
  }
}

/**
 * Get a secret value from Azure Key Vault or environment variables.
 * Caches values to avoid repeated Key Vault calls.
 */
export async function getSecretValue(secretName: string): Promise<string | null> {
  // Check cache first
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  // Try environment variable first (for local development)
  const envValue = process.env[secretName];
  if (envValue) {
    secretCache.set(secretName, envValue);
    return envValue;
  }

  // Try Azure Key Vault (production)
  if (!secretClient) {
    secretClient = initializeKeyVault();
  }

  if (secretClient) {
    try {
      const secret = await secretClient.getSecret(secretName);
      if (secret.value) {
        secretCache.set(secretName, secret.value);
        return secret.value;
      }
    } catch (error: any) {
      console.warn(`[Secrets] Failed to fetch secret "${secretName}" from Key Vault:`, error.message);
    }
  }

  // Secret not found
  return null;
}

/**
 * Get a required secret value, throwing if not found.
 */
export async function getRequiredSecret(secretName: string): Promise<string> {
  const value = await getSecretValue(secretName);
  if (!value) {
    throw new Error(`Required secret "${secretName}" not found in environment or Key Vault`);
  }
  return value;
}

/**
 * Clear the secret cache (useful for testing).
 */
export function clearSecretCache(): void {
  secretCache.clear();
}
