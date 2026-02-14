/**
 * Quota tracking and enforcement service.
 * Tracks usage per user per day (AEST timezone) and enforces daily limits.
 */

import { TableClient, TableServiceClient, AzureNamedKeyCredential } from '@azure/data-tables';
import type { User, QuotaConfig, UsageTracking, QuotaStatus, UserRole } from '@fire-sim/shared';

/**
 * Configuration for quota service.
 */
interface QuotaServiceConfig {
  enabled: boolean;
  storageAccountName?: string;
  storageAccountKey?: string;
  tableName: string;
  defaultQuotas: Record<UserRole, QuotaConfig>;
}

/**
 * Table entity for usage tracking.
 */
interface UsageEntity {
  partitionKey: string; // userId
  rowKey: string; // date in YYYY-MM-DD (AEST)
  scenariosGenerated: number;
  imagesGenerated: number;
  videosGenerated: number;
  estimatedCost: number;
  lastUpdated: Date;
}

let tableClient: TableClient | null = null;
let config: QuotaServiceConfig | null = null;

/**
 * Default quota configuration by role.
 */
export const DEFAULT_QUOTAS: Record<UserRole, QuotaConfig> = {
  trainer: {
    scenariosPerDay: 20,
    imagesPerDay: 100,
    videosPerDay: 5,
  },
  admin: {
    scenariosPerDay: 999999, // Effectively unlimited
    imagesPerDay: 999999,
    videosPerDay: 999999,
  },
};

/**
 * Initialize quota tracking service with Azure Table Storage.
 */
export async function initializeQuotaService(serviceConfig: QuotaServiceConfig): Promise<void> {
  config = serviceConfig;

  if (!config.enabled) {
    console.log('[Quota] Quota tracking is disabled');
    return;
  }

  if (!config.storageAccountName || !config.storageAccountKey) {
    console.warn('[Quota] Azure Table Storage credentials not provided, quota tracking disabled');
    return;
  }

  try {
    // Create table service client
    const credential = new AzureNamedKeyCredential(
      config.storageAccountName,
      config.storageAccountKey
    );
    
    // Create table if it doesn't exist
    const tableService = new TableServiceClient(
      `https://${config.storageAccountName}.table.core.windows.net`,
      credential
    );
    await tableService.createTable(config.tableName);

    // Get table client using TableClient directly
    tableClient = new TableClient(
      `https://${config.storageAccountName}.table.core.windows.net`,
      config.tableName,
      credential
    );
    
    console.log(`[Quota] Quota service initialized with table: ${config.tableName}`);
  } catch (error) {
    console.error('[Quota] Failed to initialize quota service:', error);
    throw error;
  }
}

/**
 * Get the current date in AEST (UTC+11) as YYYY-MM-DD.
 */
function getCurrentDateAEST(): string {
  const now = new Date();
  // Convert to AEST (UTC+11)
  const aestTime = new Date(now.getTime() + 11 * 60 * 60 * 1000);
  return aestTime.toISOString().split('T')[0];
}

/**
 * Get midnight AEST as ISO timestamp (when quota resets).
 */
function getMidnightAESTTimestamp(): string {
  const now = new Date();
  const aestTime = new Date(now.getTime() + 11 * 60 * 60 * 1000);
  const midnight = new Date(aestTime.toISOString().split('T')[0] + 'T00:00:00.000Z');
  midnight.setDate(midnight.getDate() + 1); // Tomorrow midnight
  return midnight.toISOString();
}

/**
 * Get quota configuration for a user based on their role.
 */
function getQuotaForUser(user: User): QuotaConfig {
  // Admin gets highest quota
  if (user.roles.includes('admin')) {
    return config?.defaultQuotas.admin || DEFAULT_QUOTAS.admin;
  }
  // Trainer gets default quota
  return config?.defaultQuotas.trainer || DEFAULT_QUOTAS.trainer;
}

/**
 * Get current usage for a user on the current day (AEST).
 */
export async function getUserUsage(user: User): Promise<UsageTracking> {
  const date = getCurrentDateAEST();
  const userId = user.id;

  // If quota service not initialized, return zero usage
  if (!tableClient || !config?.enabled) {
    return {
      userId,
      date,
      scenariosGenerated: 0,
      imagesGenerated: 0,
      videosGenerated: 0,
      estimatedCost: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const entity = await tableClient.getEntity<UsageEntity>(userId, date);
    return {
      userId,
      date,
      scenariosGenerated: entity.scenariosGenerated || 0,
      imagesGenerated: entity.imagesGenerated || 0,
      videosGenerated: entity.videosGenerated || 0,
      estimatedCost: entity.estimatedCost || 0,
      lastUpdated: entity.lastUpdated?.toISOString() || new Date().toISOString(),
    };
  } catch (error: any) {
    // Entity doesn't exist yet (no usage today)
    if (error.statusCode === 404) {
      return {
        userId,
        date,
        scenariosGenerated: 0,
        imagesGenerated: 0,
        videosGenerated: 0,
        estimatedCost: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
    throw error;
  }
}

/**
 * Get quota status for a user (limits, usage, remaining).
 */
export async function getQuotaStatus(user: User): Promise<QuotaStatus> {
  const limits = getQuotaForUser(user);
  const usage = await getUserUsage(user);

  return {
    limits,
    usage,
    remaining: {
      scenarios: Math.max(0, limits.scenariosPerDay - usage.scenariosGenerated),
      images: Math.max(0, limits.imagesPerDay - usage.imagesGenerated),
      videos: Math.max(0, limits.videosPerDay - usage.videosGenerated),
    },
    resetsAt: getMidnightAESTTimestamp(),
  };
}

/**
 * Increment usage counters for a user.
 */
export async function incrementUsage(
  user: User,
  increments: {
    scenarios?: number;
    images?: number;
    videos?: number;
    cost?: number;
  }
): Promise<void> {
  if (!tableClient || !config?.enabled) {
    console.log('[Quota] Quota tracking disabled, skipping increment');
    return;
  }

  const date = getCurrentDateAEST();
  const userId = user.id;

  try {
    // Get current usage
    let entity: UsageEntity;
    try {
      entity = await tableClient.getEntity<UsageEntity>(userId, date);
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Create new entity
        entity = {
          partitionKey: userId,
          rowKey: date,
          scenariosGenerated: 0,
          imagesGenerated: 0,
          videosGenerated: 0,
          estimatedCost: 0,
          lastUpdated: new Date(),
        };
      } else {
        throw error;
      }
    }

    // Update counters
    entity.scenariosGenerated += increments.scenarios || 0;
    entity.imagesGenerated += increments.images || 0;
    entity.videosGenerated += increments.videos || 0;
    entity.estimatedCost += increments.cost || 0;
    entity.lastUpdated = new Date();

    // Upsert entity
    await tableClient.upsertEntity(entity, 'Merge');

    console.log(`[Quota] Updated usage for user ${userId} on ${date}`, increments);
  } catch (error) {
    console.error('[Quota] Failed to increment usage:', error);
    // Don't throw - quota tracking failure shouldn't block requests
  }
}

/**
 * Check if user has exceeded any quota limits.
 * Returns null if within limits, or an error message if exceeded.
 */
export async function checkQuotaExceeded(
  user: User,
  requestType: 'scenario' | 'image' | 'video'
): Promise<string | null> {
  const status = await getQuotaStatus(user);

  switch (requestType) {
    case 'scenario':
      if (status.remaining.scenarios <= 0) {
        return `Daily scenario limit reached (${status.limits.scenariosPerDay}). Resets at midnight AEST.`;
      }
      break;
    case 'image':
      if (status.remaining.images <= 0) {
        return `Daily image limit reached (${status.limits.imagesPerDay}). Resets at midnight AEST.`;
      }
      break;
    case 'video':
      if (status.remaining.videos <= 0) {
        return `Daily video limit reached (${status.limits.videosPerDay}). Resets at midnight AEST.`;
      }
      break;
  }

  return null; // Within limits
}
