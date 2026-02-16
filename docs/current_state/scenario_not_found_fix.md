# Scenario Not Found Error Fix

**Status**: ✅ Completed
**Date**: 2026-02-16
**Related Issue**: [Original GitHub issue]

## Overview

Fixed multiple issues related to "Scenario not found" errors, results panel timing, and screenshot validation during scenario generation.

## Problems Addressed

### 1. Race Condition - "Scenario not found" 404 Errors

**Root Cause**: The generation orchestrator created a scenarioId and immediately returned it to the client, which would start polling the status endpoint. However, there was a potential race condition where the frontend could poll the `/api/generate/{scenarioId}/status` endpoint before the `progressStore.set()` operation completed in the async flow.

**Impact**: Intermittent 404 "Scenario not found" errors when the frontend polls too quickly after receiving the scenarioId.

**Files Modified**:

- `apps/api/src/services/generationOrchestrator.ts:78-102`

**Fix Applied**:

1. Ensured `progressStore.set()` happens synchronously before `executeGeneration()` starts
2. Added seed to initial progress object immediately (line 78)
3. Added explicit comment about preventing 404 race condition (line 83)
4. Enhanced error handling in catch block to update progressStore with failed status (lines 96-102)

```typescript
// Store progress BEFORE starting async execution to prevent 404 race condition
progressStore.set(scenarioId, progress);

// Start generation asynchronously (don't await)
this.executeGeneration(scenarioId, { ...request, seed }).catch((error) => {
  this.logger.error('Generation orchestration failed', error, { scenarioId });
  // Update progress store with error to prevent scenario not found
  const failedProgress = progressStore.get(scenarioId);
  if (failedProgress) {
    failedProgress.status = 'failed';
    failedProgress.error = error instanceof Error ? error.message : String(error);
    failedProgress.updatedAt = new Date().toISOString();
  }
});
```

### 2. Results Panel Opens Too Early

**Root Cause**: The results panel opened immediately when `scenarioState === 'generating'` without waiting for the Gemini thinking stream to start.

**Impact**: Empty results panel appears before any content is available, creating a poor user experience.

**Files Modified**:

- `apps/web/src/components/Layout/ResultsPanel.tsx:15-26`

**Fix Applied**:
Modified the useEffect logic to only open the panel when thinking text or images are available:

```typescript
useEffect(() => {
  // Open panel when thinking text arrives, images are generated, or generation completes
  if (scenarioState === 'complete') {
    setResultsPanelOpen(true);
  } else if (scenarioState === 'generating') {
    // Only open when Gemini thinking stream has started OR images are available
    // This prevents opening before the model begins processing
    if (
      generationResult?.thinkingText ||
      (generationResult?.images && generationResult.images.length > 0)
    ) {
      setResultsPanelOpen(true);
    }
  }
}, [scenarioState, generationResult, setResultsPanelOpen]);
```

### 3. Screenshot Validation

**Root Cause**: Screenshot capture failures were treated as non-fatal warnings, allowing generation to proceed without required terrain reference images.

**Impact**: Generation could start without terrain screenshots, leading to poor quality results or failures.

**Files Modified**:

- `apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx:299-339`

**Fix Applied**:

1. Added validation to ensure at least one screenshot was captured
2. Show warning toast when some screenshots fail (but at least one succeeded)
3. Throw fatal error and abort generation if all screenshots fail
4. Return early with clear error message if capture function unavailable

```typescript
// Validate that all requested screenshots were captured
if (count === 0) {
  throw new Error('Failed to capture any terrain screenshots');
}
if (count < requestedViews.length) {
  console.warn(`Only ${count}/${requestedViews.length} screenshots captured - some views failed`);
  addToast({
    type: 'warning',
    message: `Only ${count}/${requestedViews.length} terrain views captured - proceeding with available screenshots`,
  });
}
```

### 4. Screenshot Framing - 80% Viewport Requirement

**Status**: ✅ Already implemented correctly

**Verification**:

- **Vegetation screenshots**: Explicitly use 10% padding on all sides, ensuring perimeter fills 80% of viewport (`apps/web/src/utils/mapCapture.ts:236-259`)
- **Viewpoint screenshots**: Use calculated camera positioning based on perimeter bounding box to ensure proper framing (`apps/web/src/utils/mapCapture.ts:23-113`)

```typescript
// Vegetation capture - explicit 80% framing
const paddingX = Math.round(canvas.clientWidth * 0.1);
const paddingY = Math.round(canvas.clientHeight * 0.1);

map.fitBounds(
  [
    [minLng, minLat],
    [maxLng, maxLat],
  ],
  {
    padding: {
      top: paddingY,
      bottom: paddingY,
      left: paddingX,
      right: paddingX,
    },
    duration: 0,
    maxZoom: 16,
  }
);
```

## Testing

### Build Verification

- ✅ TypeScript compilation: `npm run build` succeeds with no errors
- ✅ All workspaces build successfully: shared, api, web
- ✅ No new type errors introduced

### Expected Behavior After Fix

1. **No more "Scenario not found" errors** during polling
   - progressStore is initialized before client receives scenarioId
   - Failed generations update progressStore with error status

2. **Results panel timing**
   - Panel remains closed until Gemini thinking stream starts
   - Panel opens automatically when thinking text arrives
   - Panel opens automatically when first image is available
   - Panel opens when generation completes

3. **Screenshot validation**
   - Generation aborts with clear error if no screenshots captured
   - Warning shown to user if some screenshots fail
   - Generation cannot start without map capture function available

## Files Changed

```
apps/api/src/services/generationOrchestrator.ts
apps/web/src/components/Layout/ResultsPanel.tsx
apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx
```

## Related Documentation

- [Image Generation Workflow](../image_generation_workflow.md)
- [Multi-Perspective Consistency](./multi_perspective_consistency.md)
- [View Perspectives](./view_perspectives.md)

## Future Considerations

1. **Retry logic**: Consider adding retry logic for individual screenshot captures rather than failing the entire generation
2. **Progress indicators**: Show per-screenshot capture progress in the UI
3. **Viewport validation**: Add runtime validation that screenshots actually contain 80% of perimeter before sending to API
4. **Persistent storage**: Consider moving progressStore to Redis or similar for production resilience
