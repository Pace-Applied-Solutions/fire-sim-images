/**
 * Content safety service for scanning AI-generated content.
 * Uses Azure AI Content Safety to detect inappropriate content in prompts and images.
 */

import ContentSafetyClient, { isUnexpected } from '@azure-rest/ai-content-safety';
import { AzureKeyCredential } from '@azure/core-auth';
import type { ContentSafetyResult, ContentSafetyConfig } from '@fire-sim/shared';
import crypto from 'node:crypto';

/**
 * Configuration for content safety service.
 */
interface ContentSafetyServiceConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  config: ContentSafetyConfig;
}

let client: ReturnType<typeof ContentSafetyClient> | null = null;
let serviceConfig: ContentSafetyServiceConfig | null = null;

/**
 * Default content safety configuration tuned for fire scenarios.
 */
export const DEFAULT_CONTENT_SAFETY_CONFIG: ContentSafetyConfig = {
  enabled: true,
  strictnessLevel: 'medium',
  violenceThreshold: 0.7, // Higher threshold for fire scenarios (legitimate violence)
  hateThreshold: 0.3,
  selfHarmThreshold: 0.3,
  sexualThreshold: 0.3,
};

/**
 * Initialize content safety service with Azure AI Content Safety.
 */
export function initializeContentSafety(config: ContentSafetyServiceConfig): void {
  serviceConfig = config;

  if (!config.enabled) {
    console.log('[ContentSafety] Content safety is disabled');
    return;
  }

  if (!config.endpoint || !config.apiKey) {
    console.warn(
      '[ContentSafety] Azure Content Safety credentials not provided, content safety disabled'
    );
    return;
  }

  try {
    client = ContentSafetyClient(config.endpoint, new AzureKeyCredential(config.apiKey));
    console.log('[ContentSafety] Content safety service initialized successfully');
  } catch (error) {
    console.error('[ContentSafety] Failed to initialize content safety service:', error);
    throw error;
  }
}

/**
 * Check text content (e.g., prompts) for safety issues.
 */
export async function checkTextSafety(text: string): Promise<ContentSafetyResult> {
  if (!client || !serviceConfig?.enabled) {
    console.log('[ContentSafety] Content safety disabled, skipping text check');
    return createSafeResult();
  }

  try {
    const response = await client.path('/text:analyze').post({
      body: {
        text,
      },
    });

    if (isUnexpected(response)) {
      console.error('[ContentSafety] Unexpected response from text analysis:', response.status);
      // Fail open - allow content if service is unavailable
      return createSafeResult();
    }

    const result = response.body;
    const config = serviceConfig.config;

    // Check each category against thresholds
    const violenceDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'Violence')?.severity || 0) / 6 >
      config.violenceThreshold;
    const hateDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'Hate')?.severity || 0) / 6 >
      config.hateThreshold;
    const selfHarmDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'SelfHarm')?.severity || 0) / 6 >
      config.selfHarmThreshold;
    const sexualDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'Sexual')?.severity || 0) / 6 >
      config.sexualThreshold;

    const safe = !violenceDetected && !hateDetected && !selfHarmDetected && !sexualDetected;

    return {
      safe,
      categories: {
        violence: {
          detected: violenceDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'Violence')?.severity || 0) / 6,
        },
        hate: {
          detected: hateDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'Hate')?.severity || 0) / 6,
        },
        selfHarm: {
          detected: selfHarmDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'SelfHarm')?.severity || 0) / 6,
        },
        sexual: {
          detected: sexualDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'Sexual')?.severity || 0) / 6,
        },
      },
      prompt: text,
    };
  } catch (error) {
    console.error('[ContentSafety] Error checking text safety:', error);
    // Fail open - allow content if service is unavailable
    return createSafeResult();
  }
}

/**
 * Check image content for safety issues.
 */
export async function checkImageSafety(imageBuffer: Buffer): Promise<ContentSafetyResult> {
  if (!client || !serviceConfig?.enabled) {
    console.log('[ContentSafety] Content safety disabled, skipping image check');
    return createSafeResult();
  }

  try {
    // Convert buffer to base64
    const imageBase64 = imageBuffer.toString('base64');
    const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

    const response = await client.path('/image:analyze').post({
      body: {
        image: {
          content: imageBase64,
        },
      },
    });

    if (isUnexpected(response)) {
      console.error('[ContentSafety] Unexpected response from image analysis:', response.status);
      // Fail open - allow content if service is unavailable
      return createSafeResult();
    }

    const result = response.body;
    const config = serviceConfig.config;

    // Check each category against thresholds
    const violenceDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'Violence')?.severity || 0) / 6 >
      config.violenceThreshold;
    const hateDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'Hate')?.severity || 0) / 6 >
      config.hateThreshold;
    const selfHarmDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'SelfHarm')?.severity || 0) / 6 >
      config.selfHarmThreshold;
    const sexualDetected =
      (result.categoriesAnalysis?.find((c) => c.category === 'Sexual')?.severity || 0) / 6 >
      config.sexualThreshold;

    const safe = !violenceDetected && !hateDetected && !selfHarmDetected && !sexualDetected;

    return {
      safe,
      categories: {
        violence: {
          detected: violenceDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'Violence')?.severity || 0) / 6,
        },
        hate: {
          detected: hateDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'Hate')?.severity || 0) / 6,
        },
        selfHarm: {
          detected: selfHarmDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'SelfHarm')?.severity || 0) / 6,
        },
        sexual: {
          detected: sexualDetected,
          severity:
            (result.categoriesAnalysis?.find((c) => c.category === 'Sexual')?.severity || 0) / 6,
        },
      },
      imageHash,
    };
  } catch (error) {
    console.error('[ContentSafety] Error checking image safety:', error);
    // Fail open - allow content if service is unavailable
    return createSafeResult();
  }
}

/**
 * Create a safe result (all checks passed).
 */
function createSafeResult(): ContentSafetyResult {
  return {
    safe: true,
    categories: {
      violence: { detected: false, severity: 0 },
      hate: { detected: false, severity: 0 },
      selfHarm: { detected: false, severity: 0 },
      sexual: { detected: false, severity: 0 },
    },
  };
}

/**
 * Update content safety configuration (admin only).
 */
export function updateContentSafetyConfig(newConfig: ContentSafetyConfig): void {
  if (serviceConfig) {
    serviceConfig.config = newConfig;
    console.log('[ContentSafety] Configuration updated:', newConfig);
  }
}

/**
 * Get current content safety configuration.
 */
export function getContentSafetyConfig(): ContentSafetyConfig {
  return serviceConfig?.config || DEFAULT_CONTENT_SAFETY_CONFIG;
}
