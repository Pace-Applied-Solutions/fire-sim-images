# Generation & Results Stability Audit

**Date:** 2026-02-17  
**Master plan alignment:** Results Gallery & Scenario History (Phase 3) and stability hardening (Section 13)

## Scope
- Investigate disappearing generation results and unstable results panel UX
- Identify sources of unreliability in generation status/result return path
- Review results panel layout for nested scroll/instability

## Baseline Checks
- `npm run lint` → passes with existing warnings (`@typescript-eslint/no-explicit-any`, unused eslint-disable) — unchanged
- `npm run build` → **fails** in `@fire-sim/api` because `@fire-sim/shared` modules are not resolved by `tsc` (`TS2307` across functions/services)
- `npm run test` → all web/api/shared Vitest suites pass

## Findings

### 1) Status/results can regress or disappear when polling hits a new Functions instance
- **What happens:** During generation the frontend poller overwrites `generationResult` on every status response. If a poll lands on a fresh Functions instance before progress is persisted, the status response contains no images and the UI clears already-rendered results.
- **Root cause:** `GenerationOrchestrator` keeps progress in an in-memory `progressStore` per instance and defers persistence with a 1s debounce (`persistProgress` in `apps/api/src/services/generationOrchestrator.ts`). Updates after anchor/derived images call `persistProgress(...)` without `immediate` and without `await`, so a scale-out or host recycle inside that debounce window returns a status payload without images (or 404). The client then replaces `generationResult` with an empty array via `setGenerationResult` in the polling callback.
- **Impact:** Intermittent “images briefly appear then vanish” when Azure Functions routes polling to another instance or recycles during generation; user loses confidence in results.

### 2) Results panel uses two vertical scroll containers (jumpy UX)
- **What happens:** The right-hand panel shows multiple vertical scrollbars; the inner content jumps or hides behind the outer scroller, especially while thinking text grows.
- **Root cause:** `ResultsPanel` wraps children in `.content { flex: 1; overflow-y: auto; }` while `GeneratedImages` wraps everything in `.container { height: 100%; overflow-y: auto; }` (`apps/web/src/components/Layout/ResultsPanel.module.css`, `apps/web/src/components/GeneratedImages/GeneratedImages.module.css`). The stacked overflow regions and an unbounded `ThinkingPanel` body create nested scrollable areas.
- **Impact:** Unstable scroll behavior, difficulty keeping anchor/image cards in view, and poor accessibility on touch devices.

### 3) API workspace cannot build (deploys blocked)
- **What happens:** `npm run build` fails before finishing API compilation with `TS2307: Cannot find module '@fire-sim/shared'` in multiple functions/services.
- **Root cause:** The API `tsconfig` path/resolution is not picking up the workspace alias for `@fire-sim/shared` during isolated `tsc` (apps/api build runs before the shared package is emitted or lacks path mapping).
- **Impact:** CI/CD build for the Functions app is currently broken, blocking reliable releases of any generation fixes.

## Reproduction Steps
- **Disappearing results:** Start a generation, wait for the first status that includes an image. Before the next 2s poll, restart or recycle the Functions host (or route the next status call to a cold instance). The status endpoint returns no `results.images`, the frontend polling callback writes that empty array to the store, and the results panel clears.
- **Nested scroll/jumpy panel:** Generate or load a scenario with multiple images. Open the results panel on desktop: two vertical scrollbars appear (outer panel + inner GeneratedImages). Scrolling the thinking text causes the inner container to scroll independently from the outer panel.
- **Broken build:** Run `npm run build` from repo root; API build fails with `TS2307` missing `@fire-sim/shared` modules.

## Recommendations
1) **Harden status persistence:** Persist progress immediately (no debounce) when images/anchor arrive, or at least mark `immediate=true` for image updates. Consider using a durable store (Table Storage/Cosmos) or sticky routing for status polling to avoid cross-instance regressions. In the client, avoid replacing existing images with an empty set unless the server explicitly reports 0/total completed.
2) **Flatten results scrolling:** Let the panel own scrolling and remove the inner `overflow-y: auto`/`height: 100%` on `GeneratedImages`, adding a max-height on the thinking panel body. This collapses to a single scrollbar and stabilizes touch/keyboard scrolling.
3) **Unblock API builds:** Add workspace path mapping (or TS project references) so `@fire-sim/shared` resolves during `apps/api` `tsc`, and ensure the shared package is built before the API in CI.
