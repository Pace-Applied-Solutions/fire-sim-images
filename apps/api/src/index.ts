/**
 * Main entry point for Azure Functions.
 * All function registrations should happen in their respective files.
 */

import './functions/healthCheck.js';
import './functions/generateScenario.js';
import './functions/geodata.js';
import './functions/prompts.js';
import './functions/getGenerationStatus.js';
import './functions/getGenerationResults.js';
