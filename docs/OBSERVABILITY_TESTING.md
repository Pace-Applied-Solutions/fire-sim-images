# Observability & Monitoring Testing Guide

This document provides instructions for testing the observability and monitoring features implemented in Issue #13.

## Prerequisites

- Azure Functions Core Tools v4 installed (`npm i -g azure-functions-core-tools@4`)
- Azure Application Insights resource deployed
- Application Insights connection string configured in environment variables

## Environment Setup

### API (Azure Functions)

Add to `apps/api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=your-key;IngestionEndpoint=https://...",
    "STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;...",
    "KEY_VAULT_URL": "https://your-vault.vault.azure.net/",
    "AI_FOUNDRY_ENDPOINT": "https://your-foundry.cognitiveservices.azure.com/",
    "AZURE_OPENAI_ENDPOINT": "https://your-openai.openai.azure.com/"
  }
}
```

### Web App (React)

Add to `apps/web/.env.local`:

```
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;IngestionEndpoint=https://...
```

## Testing Structured Logging

### 1. Start the API

```bash
cd apps/api
npm run build
npm run dev
```

### 2. Generate a Scenario

Make a POST request to trigger generation:

```bash
curl -X POST http://localhost:7071/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "perimeter": {...},
    "inputs": {...},
    "geoContext": {...},
    "requestedViews": ["aerial", "ground_north"]
  }'
```

### 3. Check Logs

Look for structured log entries in the console output:

```
[INFO] Generation request received | scenarioId=abc-123, requestedViews=2
[INFO] Generating prompts | scenarioId=abc-123
[INFO] Starting anchor image generation | scenarioId=abc-123, anchorViewpoint=aerial
[INFO] Anchor image generated | scenarioId=abc-123, viewpoint=aerial, durationMs=3245
[INFO] Generation completed | scenarioId=abc-123, status=completed, completedImages=2
```

### 4. Verify Application Insights

1. Go to Azure Portal > Application Insights resource
2. Navigate to **Logs** section
3. Run KQL query:

```kql
traces
| where timestamp > ago(1h)
| where customDimensions.scenarioId != ""
| project timestamp, message, customDimensions.scenarioId, customDimensions.level
| order by timestamp desc
```

## Testing Performance Metrics

### 1. View Custom Metrics

In Application Insights > Metrics:

- Select metric namespace: **Custom**
- Available metrics:
  - `generation.duration_ms`
  - `generation.images_count`
  - `generation.errors_count`
  - `geodata.lookup.duration_ms`
  - `model.call.duration_ms`
  - `blob.upload.duration_ms`

### 2. Query Metrics in Logs

```kql
customMetrics
| where name in ("generation.duration_ms", "generation.images_count")
| where timestamp > ago(1h)
| project timestamp, name, value, customDimensions
| order by timestamp desc
```

## Testing Health Check Endpoint

### 1. Call Health Check

```bash
curl http://localhost:7071/api/health | jq
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-02-15T05:30:00.000Z",
  "version": "0.1.0",
  "checks": [
    {
      "service": "Application Insights",
      "status": "healthy",
      "message": "Connected",
      "latencyMs": 15
    },
    {
      "service": "Blob Storage",
      "status": "healthy",
      "message": "Connected",
      "latencyMs": 45
    },
    {
      "service": "Key Vault",
      "status": "healthy",
      "message": "Connected",
      "latencyMs": 120
    },
    {
      "service": "AI Services",
      "status": "healthy",
      "message": "Azure AI Foundry configured",
      "latencyMs": 10
    },
    {
      "service": "External Data",
      "status": "healthy",
      "message": "NSW spatial services accessible",
      "latencyMs": 230
    }
  ]
}
```

### 2. Test Degraded Health

Temporarily remove environment variables to simulate degraded services:

```bash
# Remove STORAGE_CONNECTION_STRING
curl http://localhost:7071/api/health | jq '.status'
# Should return "degraded"
```

## Testing Cost Tracking

### 1. Generate Multiple Scenarios

Create 3-5 scenarios to accumulate usage data.

### 2. Check Usage Summary

```bash
curl http://localhost:7071/api/admin/usage-summary | jq
```

Expected response:

```json
{
  "date": "2024-02-15",
  "totalScenarios": 5,
  "totalImages": 25,
  "totalVideos": 0,
  "totalCost": 0.825,
  "costBreakdown": {
    "images": {
      "count": 25,
      "costPerImage": 0.033,
      "totalCost": 0.825
    },
    "videos": {
      "count": 0,
      "costPerVideo": 0.5,
      "totalCost": 0
    },
    "storage": {
      "sizeBytes": 52428800,
      "costPerGB": 0.02,
      "totalCost": 0.001
    },
    "totalCost": 0.826
  }
}
```

### 3. Query Specific Date

```bash
curl "http://localhost:7071/api/admin/usage-summary?date=2024-02-14" | jq
```

## Testing Front-End Error Tracking

### 1. Start Web App

```bash
cd apps/web
npm run dev
```

### 2. Trigger Error Boundary

In browser console:

```javascript
// Force a React error
throw new Error('Test error boundary');
```

You should see:

- Error boundary fallback UI
- "Try Again" button
- Error details in console (dev mode only)

### 3. Check Application Insights

In Application Insights > Failures:

```kql
exceptions
| where timestamp > ago(1h)
| where customDimensions.errorBoundary == "ErrorBoundary"
| project timestamp, outerMessage, customDimensions
```

### 4. Track Custom Events

Test custom event tracking:

```javascript
import { trackEvent, trackMetric } from './utils/appInsights';

// Track an event
trackEvent('scenario_generated', {
  viewCount: 5,
  fireIntensity: 'high',
});

// Track a metric
trackMetric('scenario_generation_time', 12500);
```

### 5. Verify Page Views

In Application Insights > Usage > Page views:

- Should see automatic page view tracking
- Route changes tracked automatically

## Testing API Call Tracking

### 1. Make API Calls from Web App

1. Navigate to scenario page
2. Draw a fire perimeter
3. Click "Generate"

### 2. View in Application Insights

```kql
dependencies
| where type == "Fetch" or type == "Ajax"
| where timestamp > ago(1h)
| project timestamp, name, target, duration, success
| order by timestamp desc
```

## Verifying Structured Logs

### Example Log Queries

**All generation-related logs:**

```kql
traces
| where customDimensions.scenarioId != ""
| project timestamp, message, customDimensions
| order by timestamp desc
```

**Only errors:**

```kql
traces
| where customDimensions.level == "error"
| project timestamp, message, customDimensions
```

**Performance analysis:**

```kql
customMetrics
| where name contains "duration"
| summarize avg(value), max(value), min(value) by name
```

**Cost analysis:**

```kql
traces
| where message contains "Cost estimated"
| extend totalCost = todouble(customDimensions.totalCost)
| summarize sum(totalCost), count() by bin(timestamp, 1h)
```

## Success Criteria

- [ ] Application Insights receives telemetry from both API and front-end
- [ ] All API operations produce structured log entries with `scenarioId`
- [ ] End-to-end generation time is tracked and visible in Application Insights
- [ ] Per-step latency metrics are captured
- [ ] Cost per scenario is estimated and stored
- [ ] `GET /api/health` returns current system health status
- [ ] Front-end errors are captured and sent to Application Insights
- [ ] Admin usage summary API returns daily totals

## Troubleshooting

### No telemetry in Application Insights

1. Check connection string format
2. Verify resource is deployed
3. Check Application Insights > Live Metrics for real-time data
4. Wait 2-5 minutes for data to appear in queries

### Health check returns unhealthy

1. Verify all environment variables are set
2. Check Azure service connectivity
3. Review error messages in health check response
4. Ensure managed identities have proper permissions (production)

### Logs not structured

1. Verify `initializeAppInsights()` is called on startup
2. Check that logger is imported and used correctly
3. Ensure Application Insights SDK is installed

### Cost tracking shows zero

1. Verify scenarios are being generated successfully
2. Check that `globalUsageTracker` is recording scenarios
3. Ensure cost estimator is configured with correct pricing

## Production Deployment

When deploying to Azure:

1. **Static Web App configuration:**
   - Add `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` to application settings
   - Ensure connection string is available at build time

2. **Azure Functions configuration:**
   - Application Insights is auto-configured via `APPLICATIONINSIGHTS_CONNECTION_STRING`
   - Enable Application Insights integration in Azure Portal

3. **Set up alerts:**
   - Error rate > 20% over 5 minutes
   - Average generation latency > 120 seconds
   - Daily cost exceeds threshold

4. **Configure sampling:**
   - For high-volume production, consider adaptive sampling
   - Configure in Application Insights SDK or portal
