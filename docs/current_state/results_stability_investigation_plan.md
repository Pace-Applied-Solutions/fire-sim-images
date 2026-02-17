# Results Stability Investigation Plan

## Objectives
- Stop disappearing/unstable results by finding and fixing regressions introduced in recent iterations.
- Validate that persistence and UI paths no longer drop or hide images/anchor/thinking text.
- Confirm whether Function instance churn is a factor after fixes, or if bugs are confined to client/server logic.

## Steps
1) **Reproduce current regression**
   - Use a fresh scenario generation and observe polling responses; note when images vanish or status returns empty `results`.
2) **Inspect client polling/state handling**
   - Verify the guard in `ScenarioInputPanel` that preserves existing images when polls lack results; add logging to confirm branches taken.
3) **Verify API progress persistence**
   - Ensure `persistProgress` is called immediately when anchor/derived images are added; check for debounce gaps and missing awaits.
4) **Check status payload integrity**
   - Inspect `getGenerationStatus` responses across multiple polls/instances to see if images/anchor are omitted despite progress being stored.
5) **Audit blob progress durability**
   - Validate `saveProgress`/`loadProgress` writes and reads the latest images/anchor when the host restarts.
6) **UI stability sweep**
   - Confirm results panel single-scroll behavior and thinking panel bounds; watch for nested scroll or remounts during updates.
7) **Regression tests**
   - Run web tests (`npm run test --workspace apps/web`) and a targeted manual generation flow to confirm images persist through polling.

## Key Code References
- Client polling/state: `apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx`
- Results panel rendering/scroll: `apps/web/src/components/Layout/ResultsPanel.tsx`, `apps/web/src/components/GeneratedImages/GeneratedImages.tsx`
- API progress handling: `apps/api/src/services/generationOrchestrator.ts` (progress updates, debounced persistence)
- Status endpoint: `apps/api/src/functions/getGenerationStatus.ts`
- Blob persistence: `apps/api/src/services/blobStorage.ts` (`saveProgress`, `loadProgress`)

## Success Criteria
- Polling never replaces existing images/anchor with empty arrays when the backend returns partial/empty results.
- Status payloads consistently include available images/anchor across polls and after host restarts.
- Results panel remains stable (single scrollbar) and images stay visible through generation completion.
- Web tests remain green; manual generation validates images do not disappear during polling.
