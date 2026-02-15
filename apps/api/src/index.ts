/**
 * Main entry point for Azure Functions.
 * All function registrations should happen in their respective files.
 *
 * IMPORTANT: This file MUST export the app object for Azure Functions v4
 * runtime to discover functions during deployment. Without this export,
 * deployment will fail with "Failed to deploy the Azure Functions" error.
 */

// Initialize Application Insights first
import { initializeAppInsights } from './utils/logger.js';
initializeAppInsights();

// Import all function modules to trigger their registration
import './functions/healthCheck.js';
import './functions/generateScenario.js';
import './functions/geodata.js';
import './functions/prompts.js';
import './functions/getGenerationStatus.js';
import './functions/getGenerationResults.js';
import './functions/getUsageSummary.js';

// Export the app object for Azure Functions runtime discovery
// This is required for the v4 programming model to work correctly
import { app } from '@azure/functions';
export default app;
