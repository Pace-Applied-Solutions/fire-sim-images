# Results Gallery Stability Fixes Summary

**Date:** 2026-02-17
**Related Issue:** [Investigate and Fix Results Gallery Stability Issues](../issues)
**Audit Reference:** [generation_results_audit.md](./generation_results_audit.md)
**Investigation Plan:** [results_stability_investigation_plan.md](./results_stability_investigation_plan.md)

## Changes Implemented

### 1. Fixed API Build Failures

**Problem:** The API workspace build was failing with `TS2307: Cannot find module '@fire-sim/shared'` and missing Node.js type definitions.

**Root Cause:**
- The workspace build script used `npm run build --workspaces` which doesn't guarantee build order
- The `@fire-sim/shared` package wasn't built before the API, causing TypeScript to fail resolving the module
- The API's `tsconfig.json` was missing `types: ["node"]` configuration

**Solution:**
- Updated root `package.json` build script to explicitly order builds: `packages/shared` → `apps/api` → `apps/web`
- Added `types: ["node"]` to `apps/api/tsconfig.json` to enable Node.js type definitions
- Updated `.gitignore` to prevent compiled TypeScript outputs from being committed

**Files Changed:**
- `package.json` - Build script now: `npm run build --workspace=packages/shared && npm run build --workspace=apps/api && npm run build --workspace=apps/web`
- `apps/api/tsconfig.json` - Added `"types": ["node"]`
- `.gitignore` - Added patterns for `.js`, `.d.ts`, `.js.map`, `.d.ts.map` files with exceptions for config files

**Verification:** `npm run build` now completes successfully without errors.

---

### 2. Hardened Progress Persistence (Immediate Writes)

**Problem:** Generation progress was persisted with a 1-second debounce when anchor/derived images were added. During this window, if a poll hit a fresh Functions instance, the status response would lack images, causing the frontend to clear already-rendered results.

**Root Cause:**
- `GenerationOrchestrator.persistProgress()` accepted an `immediate` parameter but was called without it (defaulting to `false`) when images were added
- The 1-second debounce meant images weren't immediately available in blob storage for cold instances to load
- Lines 413 and 532 in `generationOrchestrator.ts` called `persistProgress` without `immediate: true`

**Solution:**
- Changed `persistProgress(scenarioId, progress)` to `persistProgress(scenarioId, progress, true)` at:
  - Line 413: After anchor image generation and upload
  - Line 532: After each derived image generation and upload
- Thinking text updates remain debounced (line 337) to avoid flooding blob storage with frequent incremental updates

**Files Changed:**
- `apps/api/src/services/generationOrchestrator.ts` - Lines 413 and 532

**Impact:**
- Images are now persisted immediately to blob storage when generated
- Polling can retrieve images even when landing on a different/fresh Functions instance
- Eliminates the 1-second window where results could disappear

---

### 3. Flattened Results Panel Scrolling (Single Scrollbar UX)

**Problem:** The results panel had two nested vertical scroll containers:
- `ResultsPanel .content` with `flex: 1; overflow-y: auto`
- `GeneratedImages .container` with `height: 100%; overflow-y: auto`

This caused:
- Jumpy scroll behavior with two scrollbars visible
- Difficulty keeping anchor/image cards in view
- Poor accessibility on touch devices

**Root Cause:**
- The `GeneratedImages` component unnecessarily created its own scroll container inside the already-scrollable `ResultsPanel`
- Both CSS modules defined `overflow-y: auto` on their respective containers

**Solution:**
- Removed `height: 100%` and `overflow-y: auto` from `.container` in `GeneratedImages.module.css`
- Let `ResultsPanel .content` be the single scroll container for all panel contents
- Thinking panel body already had `max-height: none` and `overflow: visible`, allowing it to grow within the single scrollable area

**Files Changed:**
- `apps/web/src/components/GeneratedImages/GeneratedImages.module.css` - Line 1-3 (removed height and overflow-y)

**Impact:**
- Results panel now has a single, stable scrollbar
- Scroll position is preserved across thinking text updates and image additions
- Better touch/keyboard navigation and accessibility

---

### 4. Verified Client-Side Polling Guards

**Status:** Already in place (no changes needed)

**Implementation:** The frontend polling callback in `ScenarioInputPanel.tsx` (lines 433-442) includes guards that:
1. Retrieve existing `generationResult` from state before processing poll response
2. Check if poll response contains new images via `hasNewImages = !!status.results?.images?.length`
3. Preserve existing images when poll lacks results:
   ```typescript
   const images =
     hasNewImages && status.results
       ? status.results.images           // Use new images if present
       : existingResult?.images && existingResult.images.length > 0
         ? existingResult.images          // Fall back to existing
         : [];                            // Empty only as last resort
   ```
4. Similarly preserve `anchorImage` when missing from poll response

**Files Reviewed:**
- `apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx` - Lines 433-442

**Impact:**
- Frontend never replaces existing images with empty arrays from partial/empty status responses
- Complements server-side immediate persistence for end-to-end stability

---

## Testing

### Build Verification
```bash
npm run build
```
**Result:** All workspaces build successfully without TypeScript errors

### Unit Tests
```bash
npm run test
```
**Result:** All tests pass (163 total: 29 web, 134 shared)

### Manual Verification Needed
- [ ] Start a generation and observe that images remain visible through polling
- [ ] Verify single scrollbar in results panel (desktop and mobile)
- [ ] Confirm thinking text scrolls smoothly without nested scroll containers
- [ ] Test that restarting Functions host during generation preserves images

---

## Remaining Work

Per the investigation plan, the following should still be validated:
1. Manual generation flow testing to confirm images persist through polling across instance restarts
2. Verify status payload integrity when polls hit fresh instances
3. Confirm blob progress durability after host restarts

These require a deployed Azure Functions environment with the updated persistence logic.

---

## Architecture Implications

### Functions vs App Service
The audit noted that even with immediate blob persistence, the polling-based Functions model may still see instability if:
- Blob writes are slower than poll intervals
- Instance churn happens during critical persistence windows
- Scale-out causes race conditions between in-memory and blob state

If issues persist after deployment, consider:
- **Functions Premium** with sticky sessions and always-on instances
- **App Service** with dedicated workers and simpler in-process state management
- **SignalR/WebSocket push** to replace polling (requires App Service or Functions Premium)

For now, the immediate persistence fix should be sufficient for the Consumption/Flex plan deployment model.

---

## References

- [Generation & Results Stability Audit](./generation_results_audit.md)
- [Results Stability Investigation Plan](./results_stability_investigation_plan.md)
- [Master Plan - Phase 3: Results Gallery & Scenario History](../master_plan.md#phase-3-results-gallery--scenario-history)
- [Master Plan - Section 13: Stability Hardening](../master_plan.md#13-stability-hardening)
