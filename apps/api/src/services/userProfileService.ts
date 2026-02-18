/**
 * User profile service for managing user tier, subscription, and usage data.
 * Stores profile data in Azure Table Storage and syncs with Stripe.
 */

import { TableClient, TableEntity } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';
import type {
  UserProfile,
  MembershipTier,
  SubscriptionStatus,
  UsageStats,
  OveragePack,
} from '@fire-sim/shared';

let tableClient: TableClient | null = null;

const PARTITION_KEY = 'UserProfile';
const TABLE_NAME = 'UserProfiles';

/**
 * Initialize Table Storage client.
 */
function getTableClient(): TableClient {
  if (tableClient) {
    return tableClient;
  }

  const storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const tableEndpoint = `https://${storageAccount}.table.core.windows.net`;

  const credential = new DefaultAzureCredential();
  tableClient = new TableClient(tableEndpoint, TABLE_NAME, credential);

  return tableClient;
}

/**
 * User profile entity stored in Table Storage.
 */
interface UserProfileEntity extends TableEntity {
  partitionKey: string;
  rowKey: string; // userId
  email: string;
  displayName?: string;
  tier: MembershipTier;
  stripeCustomerId?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  scenariosGenerated: number;
  imagesGenerated: number;
  videosGenerated: number;
  lifetimeScenarios?: number;
  lastUpdated: string;
  overagePacksJson?: string; // JSON-serialized array of OveragePack
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user profile by user ID.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getTableClient();

  try {
    const entity = await client.getEntity<UserProfileEntity>(PARTITION_KEY, userId);
    return entityToProfile(entity);
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a new user profile.
 */
export async function createUserProfile(
  userId: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  const client = getTableClient();
  const now = new Date().toISOString();

  const entity: UserProfileEntity = {
    partitionKey: PARTITION_KEY,
    rowKey: userId,
    email,
    displayName,
    tier: 'free',
    scenariosGenerated: 0,
    imagesGenerated: 0,
    videosGenerated: 0,
    lifetimeScenarios: 0,
    lastUpdated: now,
    createdAt: now,
    updatedAt: now,
  };

  await client.createEntity(entity);
  return entityToProfile(entity);
}

/**
 * Update user profile.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const client = getTableClient();
  const now = new Date().toISOString();

  const existingEntity = await client.getEntity<UserProfileEntity>(PARTITION_KEY, userId);

  const updatedEntity: UserProfileEntity = {
    ...existingEntity,
    ...profileToEntityUpdates(updates),
    updatedAt: now,
  };

  await client.updateEntity(updatedEntity, 'Merge');
  return entityToProfile(updatedEntity);
}

/**
 * Update user tier and subscription info.
 */
export async function updateUserTier(
  userId: string,
  tier: MembershipTier,
  stripeCustomerId: string | null,
  subscriptionStatus: SubscriptionStatus | null,
  subscriptionId: string | null,
  currentPeriodStart: string | null,
  currentPeriodEnd: string | null
): Promise<UserProfile> {
  return updateUserProfile(userId, {
    tier,
    stripeCustomerId,
    subscriptionStatus,
    subscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
    usage: {} as UsageStats, // Preserve existing usage
    overagePacks: [], // Preserve existing packs
  } as Partial<UserProfile>);
}

/**
 * Increment usage counters for a user.
 */
export async function incrementUsage(
  userId: string,
  scenarios: number = 0,
  images: number = 0,
  videos: number = 0
): Promise<UserProfile> {
  const client = getTableClient();
  const entity = await client.getEntity<UserProfileEntity>(PARTITION_KEY, userId);

  const updatedEntity: UserProfileEntity = {
    ...entity,
    scenariosGenerated: entity.scenariosGenerated + scenarios,
    imagesGenerated: entity.imagesGenerated + images,
    videosGenerated: entity.videosGenerated + videos,
    lifetimeScenarios: (entity.lifetimeScenarios || 0) + scenarios,
    lastUpdated: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await client.updateEntity(updatedEntity, 'Merge');
  return entityToProfile(updatedEntity);
}

/**
 * Reset usage counters for new billing period (paid tiers only).
 */
export async function resetUsageForBillingPeriod(userId: string): Promise<UserProfile> {
  const client = getTableClient();
  const entity = await client.getEntity<UserProfileEntity>(PARTITION_KEY, userId);

  const updatedEntity: UserProfileEntity = {
    ...entity,
    scenariosGenerated: 0,
    imagesGenerated: 0,
    videosGenerated: 0,
    lastUpdated: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await client.updateEntity(updatedEntity, 'Merge');
  return entityToProfile(updatedEntity);
}

/**
 * Add an overage pack to user profile.
 */
export async function addOveragePack(userId: string, pack: OveragePack): Promise<UserProfile> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  const packs = [...profile.overagePacks, pack];
  return updateUserProfile(userId, {
    ...profile,
    overagePacks: packs,
  });
}

/**
 * Use credits from overage packs (FIFO - oldest packs first).
 */
export async function useOveragePackCredits(
  userId: string,
  creditsToUse: number
): Promise<{ success: boolean; remainingCredits: number }> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  let remainingToUse = creditsToUse;
  const updatedPacks: OveragePack[] = [];
  const now = new Date();

  // Sort packs by purchase date (oldest first) and filter out expired packs
  const validPacks = profile.overagePacks
    .filter((pack) => new Date(pack.expirationDate) > now)
    .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

  for (const pack of validPacks) {
    if (remainingToUse <= 0) {
      updatedPacks.push(pack);
      continue;
    }

    const availableCredits = pack.remainingCredits;
    const creditsUsed = Math.min(availableCredits, remainingToUse);

    updatedPacks.push({
      ...pack,
      usedCredits: pack.usedCredits + creditsUsed,
      remainingCredits: pack.remainingCredits - creditsUsed,
    });

    remainingToUse -= creditsUsed;
  }

  // Update profile with modified packs
  await updateUserProfile(userId, {
    ...profile,
    overagePacks: updatedPacks,
  });

  return {
    success: remainingToUse === 0,
    remainingCredits: updatedPacks.reduce((sum, pack) => sum + pack.remainingCredits, 0),
  };
}

/**
 * Get total available overage pack credits.
 */
export function getAvailableOverageCredits(profile: UserProfile): number {
  const now = new Date();
  return profile.overagePacks
    .filter((pack) => new Date(pack.expirationDate) > now)
    .reduce((sum, pack) => sum + pack.remainingCredits, 0);
}

/**
 * Convert Table Storage entity to UserProfile.
 */
function entityToProfile(entity: UserProfileEntity): UserProfile {
  let overagePacks: OveragePack[] = [];
  if (entity.overagePacksJson) {
    try {
      overagePacks = JSON.parse(entity.overagePacksJson);
    } catch (error) {
      console.error('[UserProfile] Failed to parse overage packs JSON:', error);
    }
  }

  return {
    userId: entity.rowKey,
    email: entity.email,
    displayName: entity.displayName,
    tier: entity.tier,
    stripeCustomerId: entity.stripeCustomerId || null,
    subscriptionStatus: (entity.subscriptionStatus as SubscriptionStatus) || null,
    subscriptionId: entity.subscriptionId || null,
    currentPeriodStart: entity.currentPeriodStart || null,
    currentPeriodEnd: entity.currentPeriodEnd || null,
    usage: {
      scenariosGenerated: entity.scenariosGenerated,
      imagesGenerated: entity.imagesGenerated,
      videosGenerated: entity.videosGenerated,
      lastUpdated: entity.lastUpdated,
      lifetimeScenarios: entity.lifetimeScenarios,
    },
    overagePacks,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * Convert UserProfile updates to entity updates.
 */
function profileToEntityUpdates(updates: Partial<UserProfile>): Partial<UserProfileEntity> {
  const entityUpdates: Partial<UserProfileEntity> = {};

  if (updates.displayName !== undefined) {
    entityUpdates.displayName = updates.displayName;
  }

  if (updates.tier !== undefined) {
    entityUpdates.tier = updates.tier;
  }

  if (updates.stripeCustomerId !== undefined) {
    entityUpdates.stripeCustomerId = updates.stripeCustomerId || undefined;
  }

  if (updates.subscriptionStatus !== undefined) {
    entityUpdates.subscriptionStatus = updates.subscriptionStatus || undefined;
  }

  if (updates.subscriptionId !== undefined) {
    entityUpdates.subscriptionId = updates.subscriptionId || undefined;
  }

  if (updates.currentPeriodStart !== undefined) {
    entityUpdates.currentPeriodStart = updates.currentPeriodStart || undefined;
  }

  if (updates.currentPeriodEnd !== undefined) {
    entityUpdates.currentPeriodEnd = updates.currentPeriodEnd || undefined;
  }

  if (updates.overagePacks !== undefined) {
    entityUpdates.overagePacksJson = JSON.stringify(updates.overagePacks);
  }

  return entityUpdates;
}
