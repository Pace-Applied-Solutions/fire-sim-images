# Scenario URL Sharing

## Overview

The Fire Sim Images app now supports scenario sharing and refresh safety through URL parameters. Each generated scenario is assigned a unique ID that is reflected in the URL, enabling users to:

- Share scenarios with collaborators via URL
- Bookmark specific scenarios
- Reload the page without losing progress
- Navigate between scenarios using browser history

## Implementation

### URL Format

Scenarios are identified by a query parameter:

```
https://your-app.com/?scenario=<scenario-id>
```

Example:
```
https://your-app.com/?scenario=abc123-def456-ghi789
```

### Architecture

#### 1. API Endpoint

**GET /api/scenarios/{scenarioId}**

Returns complete scenario metadata including:
- Fire perimeter (GeoJSON)
- Scenario inputs (weather, fire behavior, etc.)
- Geographic context (vegetation, terrain)
- Generated images and results
- Creation and completion timestamps

Response format (ScenarioMetadata):
```typescript
{
  id: string;
  perimeter: FirePerimeter;
  inputs: ScenarioInputs;
  geoContext: GeoContext;
  requestedViews: ViewPoint[];
  result: GenerationResult;
  promptVersion?: string;
}
```

#### 2. Frontend Hook (`useScenarioUrl`)

Custom React hook that synchronizes scenario state with URL parameters:

**Location**: `apps/web/src/hooks/useScenarioUrl.ts`

**Responsibilities**:
1. **Load from URL**: On mount, detects scenario parameter and fetches scenario data
2. **Restore State**: Hydrates app store with perimeter, inputs, geoContext, and results
3. **Update URL**: When new scenario completes, updates URL with scenario ID
4. **Error Handling**: Manages loading states, errors, and invalid scenario IDs

**Key Features**:
- Prevents duplicate loads of the same scenario
- Avoids circular updates when loading from URL
- Displays toast notifications for success/failure
- Removes invalid parameters from URL on error

#### 3. State Management

Uses existing Zustand store (`useAppStore`) to manage scenario state:

```typescript
// State restored from URL
setPerimeter(scenario.perimeter)
setGeoContext(scenario.geoContext)
setScenarioInputs(scenario.inputs)
setGenerationResult(scenario.result)
setScenarioState('complete')
```

## User Flows

### Flow 1: Generate and Share

1. User draws fire perimeter and configures scenario
2. User clicks "Generate Scenario"
3. After generation completes, URL updates to `/?scenario=<new-id>`
4. User copies URL and shares with colleague
5. Colleague opens URL → sees full scenario with all images

### Flow 2: Refresh Recovery

1. User has generated scenario loaded (URL has `?scenario=<id>`)
2. User accidentally refreshes page
3. App detects scenario parameter in URL
4. App fetches scenario from API and restores all state
5. User sees their scenario exactly as before refresh

### Flow 3: Invalid Scenario

1. User navigates to `/?scenario=invalid-id`
2. API returns 404 error
3. Hook shows error toast: "Failed to load scenario: Scenario not found"
4. URL parameter is removed → URL becomes `/`
5. User can start new scenario

## Technical Details

### Scenario ID Generation

Scenario IDs are generated server-side as UUIDs when a generation request is initiated:

**Location**: `apps/api/src/functions/generateScenario.ts`

```typescript
const scenarioId = crypto.randomUUID();
```

### Data Storage

Scenario metadata is stored in Azure Blob Storage:

- **Container**: `scenario-data`
- **Path**: `{scenarioId}/metadata.json`
- **Format**: JSON (ScenarioMetadata structure)

### Loading States

The hook uses the app store's `scenarioState` to show loading feedback:

1. **Before Load**: State is typically `'idle'` or current scenario state
2. **During Load**: `setScenarioState('generating')` shows spinner
3. **After Success**: `setScenarioState('complete')` shows results
4. **After Error**: `setScenarioState('error')` with error message

### Browser History

URL updates use `replace: false` to create history entries:

```typescript
setSearchParams({ scenario: generationResult.id }, { replace: false });
```

This allows users to:
- Use browser back/forward buttons
- Navigate between scenarios
- Maintain proper history stack

## Testing

### Unit Tests

**Location**: `apps/web/src/hooks/__tests__/useScenarioUrl.test.ts`

Tests cover:
- ✅ Successful scenario load from URL
- ✅ Error handling for invalid scenarios
- ✅ No-op when no scenario parameter present
- ✅ State restoration verification

Run tests:
```bash
npm run test --workspace=apps/web
```

### Manual Testing

1. **Generate and Reload**:
   - Generate a scenario
   - Verify URL updates with scenario ID
   - Refresh page
   - Verify scenario loads correctly

2. **Direct URL**:
   - Copy scenario URL
   - Open in new tab/incognito window
   - Verify full scenario loads

3. **Invalid Scenario**:
   - Navigate to `/?scenario=fake-id`
   - Verify error toast appears
   - Verify URL parameter is removed

4. **Browser Navigation**:
   - Generate scenario A
   - Generate scenario B
   - Click browser back button
   - Verify scenario A loads

## Limitations

1. **Map Screenshots**: Original terrain screenshots used during generation are not persisted, only the final generated fire images are saved and restored.

2. **Pending Scenarios**: If a scenario is still generating when the URL is loaded, it's treated as complete. Future enhancement could poll for completion.

3. **Session Data**: User-specific session data (like UI panel states) is not persisted in the URL.

## Future Enhancements

1. **Short URLs**: Implement URL shortening for easier sharing
2. **Scenario Versioning**: Allow viewing different versions of the same scenario
3. **Partial State**: Support partial URL parameters for pre-filling inputs
4. **QR Codes**: Generate QR codes for mobile sharing

## References

- **Master Plan**: See `docs/master_plan.md` for overall project context
- **API Reference**: See `docs/api-reference.md` for API endpoint details
- **Type Definitions**: See `packages/shared/src/types.ts` for data structures
- **State Management**: See `apps/web/src/store/appStore.ts` for app state
