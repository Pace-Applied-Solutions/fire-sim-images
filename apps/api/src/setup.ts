/**
 * Application setup and initialization.
 * This file configures global settings and hooks for the Azure Functions app.
 * Import this file in each function file to ensure setup runs before any function handlers.
 * 
 * Note: Node.js module caching ensures this code only runs once, even when imported
 * by multiple function files. Additionally, initializeAppInsights() is idempotent.
 */

import { app } from '@azure/functions';
import { initializeAppInsights } from './utils/logger.js';

// Configure Azure Functions app settings
app.setup({ enableHttpStream: true });

// Initialize Application Insights telemetry
initializeAppInsights();
