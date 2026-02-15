# Issue 13 Implementation Summary: Observability, Monitoring & Structured Logging

## Overview

This implementation provides comprehensive observability, monitoring, and structured logging across the fire-sim-images application, enabling the team to understand system health, diagnose issues, and track generation costs from day one.

## What Was Implemented

### 1. Structured Logging System

**File:** `apps/api/src/utils/logger.ts`

- **Logger class** with debug, info, warn, error levels
- **Context tracking:** scenarioId, userId, correlationId automatically included
- **Multiple outputs:** 
  - Azure Functions context logging
  - Console (for local development)
  - Application Insights (for production monitoring)
- **Child loggers** for scoped context
- **Type-safe** error property access

**Usage Example:**
```typescript
const logger = createLogger(context, { scenarioId: 'abc-123' });
logger.info('Generation started', { viewCount: 5 });
logger.error('Generation failed', error, { viewpoint: 'aerial' });
```

### 2. Performance Metrics Tracking

**File:** `apps/api/src/utils/metrics.ts`

- **PerformanceTimer** class for operation timing
- **Metric tracking:** Custom metrics sent to Application Insights
- **Helper functions:**
  - `startTimer()` - Start a timer
  - `measureAsync()` - Measure async operations
  - `trackDuration()` - Track duration metrics
  - `trackMetric()` - Track custom metrics

**Generation-Specific Metrics:**
- `generation.duration_ms` - End-to-end generation time
- `generation.images_count` - Number of images generated
- `generation.errors_count` - Generation failures
- `geodata.lookup.duration_ms` - Geodata lookup time
- `model.call.duration_ms` - AI model call duration
- `blob.upload.duration_ms` - Blob storage upload time

### 3. Cost Tracking & Estimation

**File:** `apps/api/src/utils/costTracking.ts`

- **CostEstimator** class for scenario cost calculation
- **Pricing configuration** (DALL-E 3, Stable Image Core, video, storage)
- **UsageTracker** for aggregating usage data
- **Daily summaries** for reporting

**Pricing (USD):**
- DALL-E 3 Standard: $0.040 per image
- DALL-E 3 HD: $0.080 per image
- Stable Image Core: $0.033 per image
- Video Generation: $0.50 per video (estimated)
- Storage: $0.020 per GB/month

### 4. Enhanced Health Check Endpoint

**File:** `apps/api/src/functions/healthCheck.ts`
**Endpoint:** `GET /api/health`

**Service Checks:**
- Application Insights connectivity
- Blob Storage (list containers test)
- Key Vault (list secrets test)
- AI Services (endpoint configuration check)
- External Data (NSW spatial services HEAD request)

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-02-15T05:30:00.000Z",
  "version": "0.1.0",
  "checks": [
    {
      "service": "Blob Storage",
      "status": "healthy",
      "message": "Connected",
      "latencyMs": 45
    }
  ]
}
```

### 5. Admin Usage Summary API

**File:** `apps/api/src/functions/getUsageSummary.ts`
**Endpoint:** `GET /api/admin/usage-summary?date=YYYY-MM-DD`
**Authentication:** Function-level (requires API key)

**Response:**
```json
{
  "date": "2024-02-15",
  "totalScenarios": 5,
  "totalImages": 25,
  "totalVideos": 0,
  "totalCost": 0.825,
  "costBreakdown": {
    "images": { "count": 25, "costPerImage": 0.033, "totalCost": 0.825 },
    "videos": { "count": 0, "costPerVideo": 0.5, "totalCost": 0 },
    "storage": { "sizeBytes": 52428800, "costPerGB": 0.02, "totalCost": 0.001 }
  }
}
```

### 6. Front-End Error Tracking

**File:** `apps/web/src/utils/appInsights.ts`

- **Application Insights SDK** initialization
- **Auto-tracking:** Page views, route changes, API calls
- **Manual tracking functions:**
  - `trackEvent()` - Custom events
  - `trackException()` - Exceptions
  - `trackMetric()` - Metrics
  - `setAuthenticatedUser()` / `clearAuthenticatedUser()` - User context

**File:** `apps/web/src/components/error/ErrorBoundary.tsx`

- **Error boundary** component for React crash recovery
- **User-friendly fallback UI** with "Try Again" button
- **Dev mode:** Shows error details and stack trace
- **Automatic reporting** to Application Insights

### 7. Generation Pipeline Instrumentation

**File:** `apps/api/src/services/generationOrchestrator.ts`

**Logged Events:**
- Generation request received (scenarioId, viewCount)
- Prompts generated (count, templateVersion)
- Anchor image generation start/complete (viewpoint, duration, model)
- Derived views generation start/complete (viewCount, using reference)
- Image upload success/failure (viewpoint, duration)
- Consistency validation (score, warnings)
- Cost estimation (totalCost, imageCount)
- Generation completion (status, completedImages, failedImages, totalDuration)

**Performance Tracking:**
- End-to-end generation timer
- Per-step timers (prompt, anchor image, uploads)
- All durations sent as custom metrics

**Cost Tracking:**
- Automatic cost estimation after generation
- Cost breakdown stored with scenario
- Usage recorded in global tracker

## Configuration

### API Environment Variables

Add to `apps/api/local.settings.json`:

```json
{
  "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=...;IngestionEndpoint=https://...",
  "STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;...",
  "KEY_VAULT_URL": "https://your-vault.vault.azure.net/",
  "AI_FOUNDRY_ENDPOINT": "https://your-foundry.cognitiveservices.azure.com/",
  "AZURE_OPENAI_ENDPOINT": "https://your-openai.openai.azure.com/"
}
```

### Web App Environment Variables

Add to `apps/web/.env.local`:

```
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
```

## Testing

See `docs/OBSERVABILITY_TESTING.md` for comprehensive testing guide including:

- Health check testing
- Structured logging verification
- Performance metrics queries (KQL)
- Cost tracking validation
- Front-end error tracking
- Application Insights dashboard setup

## Application Insights Queries

### View All Generation Logs

```kql
traces
| where customDimensions.scenarioId != ""
| project timestamp, message, customDimensions
| order by timestamp desc
```

### View Performance Metrics

```kql
customMetrics
| where name in ("generation.duration_ms", "geodata.lookup.duration_ms")
| summarize avg(value), max(value), min(value) by name
```

### View Cost Analysis

```kql
traces
| where message contains "Cost estimated"
| extend totalCost = todouble(customDimensions.totalCost)
| summarize sum(totalCost), count() by bin(timestamp, 1d)
```

### View Errors

```kql
traces
| where customDimensions.level == "error"
| project timestamp, message, customDimensions
```

## Security

- **Health check endpoint:** Anonymous (public status)
- **Admin usage summary:** Function-level authentication (requires API key)
- **Application Insights:** Managed by Azure, data encrypted in transit and at rest
- **Future:** Full RBAC to be implemented in Issue 12

## Cost Management

**Application Insights Free Tier:**
- 5 GB/month data ingestion included
- Overage: $2.30/GB
- Monitor usage: Azure Portal > Application Insights > Usage and estimated costs

**Typical Usage (estimate):**
- Log entry: ~1-2 KB
- Metric: ~0.5 KB
- Exception: ~2-4 KB
- 1000 scenario generations: ~5-10 MB (well within free tier)

## Production Deployment

1. **Static Web App configuration:**
   - Add `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` to app settings
   - Ensure build-time availability

2. **Azure Functions:**
   - Application Insights auto-configured via `APPLICATIONINSIGHTS_CONNECTION_STRING`
   - Enable in Azure Portal if not automatic

3. **Set up alerts:**
   - Error rate > 20% over 5 minutes
   - Average generation latency > 120 seconds
   - Daily cost exceeds threshold
   - Health check returns unhealthy

4. **Dashboard:**
   - Create Application Insights dashboard with key metrics
   - Pin to Azure Portal for quick access

## Known Limitations

1. **In-memory storage:** Usage tracking stored in memory (lost on function restart). Future: Use Table Storage or Cosmos DB for persistence.

2. **Cost estimates:** Based on public pricing, may vary by region or change over time. Consider implementing dynamic pricing updates.

3. **Authentication:** Admin endpoints use function-level auth (API key). Full RBAC planned for Issue 12.

4. **Sampling:** No sampling configured. Consider adaptive sampling for high-volume production.

## Success Criteria

All acceptance criteria from Issue #13 have been met:

- ✅ Application Insights receives telemetry from both API and front-end
- ✅ All API operations produce structured log entries with scenarioId and userId
- ✅ End-to-end generation time is tracked and visible in Application Insights
- ✅ Per-step latency (geodata, prompt, image, upload) is tracked as custom metrics
- ✅ Cost per scenario is estimated and stored in metadata
- ✅ `GET /api/health` returns current system health status
- ✅ Alerts can be configured via Application Insights
- ✅ Front-end errors are captured and sent to Application Insights
- ✅ Admin usage summary API returns daily totals

## Maintenance

**Periodic Tasks:**

1. **Review pricing** (quarterly): Update `costTracking.ts` with current Azure pricing
2. **Review metrics** (monthly): Ensure metrics are actionable and not excessive
3. **Review alerts** (as needed): Adjust thresholds based on actual usage patterns
4. **Clean up logs** (as needed): Application Insights retention is configurable

## Next Steps

After Issue 13 is complete, consider:

1. **Issue 14:** End-to-End Testing & Trainer Validation
2. **Issue 12:** Full authentication and RBAC implementation
3. **Custom dashboards:** Build Application Insights dashboards for specific use cases
4. **Alert fine-tuning:** Adjust alert thresholds based on production data
5. **Persistent storage:** Move usage tracking to Table Storage or Cosmos DB

## Conclusion

This implementation provides production-ready observability, monitoring, and structured logging that will enable the team to:

- **Debug issues quickly** with structured logs and context
- **Monitor performance** with custom metrics and dashboards
- **Track costs** with scenario-level estimates and daily summaries
- **Ensure uptime** with health checks and alerts
- **Improve quality** with error tracking and analysis

The system is instrumented, tested, documented, and ready for deployment.
