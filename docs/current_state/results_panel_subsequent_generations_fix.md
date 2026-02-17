# Results Panel Not Opening for Subsequent Generations - Fix

**Date:** February 17, 2026  
**Issue:** Results panel would not open for second and subsequent image generations without a page refresh  
**Related PR:** Follow-up to #127 (Results Panel Refresh Bug Fix)

## Problem Description

After implementing the results panel refresh fix (PR #127), users reported that generated images were not appearing in the results panel. Investigation revealed:

1. The panel would open correctly for the first generation
2. Subsequent generations would complete successfully but the panel would not open
3. Generated images existed but were not visible to the user
4. Console logs showed generation progressing normally (0/5, 5/5 images)
5. No errors were thrown

## Root Cause Analysis

The refresh fix (PR #127) introduced `hasOpenedRef` tracking to prevent the panel from refreshing on every thinking text update:

```typescript
const hasOpenedRef = useRef(false);

useEffect(() => {
  if (hasOpenedRef.current) return; // Early exit if already opened
  
  if (scenarioState === 'complete') {
    setResultsPanelOpen(true);
    hasOpenedRef.current = true;
  }
  // ...
}, [scenarioState, generationResult?.thinkingText, generationResult?.images?.length]);
```

The ref was reset in a separate useEffect:

```typescript
useEffect(() => {
  if (scenarioState === 'idle' || scenarioState === 'drawing') {
    hasOpenedRef.current = false;
  }
}, [scenarioState]);
```

**The bug:** The application never sets `scenarioState` to 'idle' or 'drawing' in production code (these states only appear in tests). The typical flow is:

1. First generation: `scenarioState` → 'generating' → 'complete' → panel opens, `hasOpenedRef.current = true`
2. Second generation: `scenarioState` → 'generating' → 'complete'
3. Ref is never reset, so useEffect early-returns, panel never opens

## Solution

Add 'generating' state to the ref reset condition, since this is the actual state transition that occurs when starting a new generation:

```typescript
useEffect(() => {
  if (scenarioState === 'idle' || scenarioState === 'drawing' || scenarioState === 'generating') {
    hasOpenedRef.current = false;
  }
}, [scenarioState]);
```

Now when each generation starts (state becomes 'generating'), the ref resets, allowing the panel to open when results are ready.

## Files Modified

- `apps/web/src/components/Layout/ResultsPanel.tsx` — Added 'generating' to ref reset condition

## Testing

### Unit Tests
- All 29 existing tests pass
- No test changes required (existing tests already cover the core store behavior)

### Manual Testing
1. ✅ Panel opens for first generation
2. ✅ Panel opens for second generation without page refresh
3. ✅ Panel opens for third+ generations
4. ✅ Panel does not refresh on thinking text updates (performance fix from PR #127 preserved)
5. ✅ Panel does not refresh when images are added progressively

## Impact

- **User Experience:** Restores expected behavior - results appear for every generation
- **Performance:** Preserves the ~50% reduction in re-renders from PR #127
- **Regression Prevention:** Highlights the importance of aligning state machine design with actual application flow (not just test scenarios)

## Lessons Learned

1. **State Machine Completeness:** When designing state transitions, verify all states are actually reachable in production code, not just tests
2. **Ref Reset Timing:** Refs used for one-time actions need reset conditions that match the actual application flow
3. **Integration Testing:** End-to-end tests that cycle through multiple scenarios would have caught this issue before production

## Future Improvements

Consider:
1. Adding 'idle' or 'ready' state that's explicitly set when a scenario completes and panel is open
2. Creating integration tests that perform multiple generate → complete cycles
3. Documenting the complete state machine with all transitions in ADR format
