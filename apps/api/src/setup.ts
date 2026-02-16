/**
 * Application setup and initialization.
 * This file configures global settings and hooks for the Azure Functions app.
 * Import this file in each function file to ensure setup runs before any function handlers.
 */

import { app } from '@azure/functions';
import { initializeAppInsights } from './utils/logger.js';

// Register setup hook to run once during app startup
app.setup({ enableHttpStream: true });

// Initialize Application Insights telemetry
initializeAppInsights();
