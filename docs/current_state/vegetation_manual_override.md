# Vegetation Type Manual Override

## Overview

This feature allows trainers to manually select the primary vegetation type when the automatic identification from NVIS (National Vegetation Information System) is unreliable or inaccurate. This is particularly useful in areas with complex land uses such as plantations, farms, or regions where the automatic detection may misclassify vegetation.

## Why This Feature?

The application automatically identifies vegetation type based on the NVIS dataset, which performs a 9-point spatial sampling around the fire perimeter. However, this automated process can sometimes return inaccurate results in:

- Plantation and agricultural areas
- Recently cleared or modified land
- Mixed vegetation zones
- Areas with outdated vegetation data
- Transition zones between vegetation types

Since vegetation type directly impacts fire behavior calculations (flame height and rate of spread), having an accurate vegetation classification is critical for realistic scenario generation.

## User Interface

### Location

The vegetation selector appears in the **Vegetation & Fuel** section within the Scenario Inputs panel, positioned between the **Fire Behaviour** and **Timing** sections.

### When Available

The vegetation section only appears after:
1. A fire perimeter has been drawn on the map
2. Geographic context has been successfully loaded from NVIS

### Visual Indicators

- **Auto-detected mode**: Shows the automatically identified vegetation type with data source and confidence level
- **Manual override mode**: Displays an orange "Manual Override" badge and highlights the selected vegetation type
- **Info text**: Displays context about the current selection mode and original auto-detected type

## How It Works

### Automatic Detection (Default)

1. User draws a fire perimeter on the map
2. System queries NVIS WMS service with 9-point sampling (center + 8 compass directions)
3. Returns vegetation type, data source, and confidence level
4. Fire behavior parameters (flame height, rate of spread) are automatically calculated
5. Vegetation type is displayed as "Auto-detected: [Type Name]"

### Manual Override

1. User opens the vegetation type dropdown
2. Selects a vegetation type from the list of 13 major vegetation groupings:
   - Dry Sclerophyll Forest
   - Wet Sclerophyll Forest
   - Grassy Woodland
   - Grassland
   - Heath
   - Rainforest
   - Cumberland Plain Woodland
   - Riverine Forest
   - Swamp Sclerophyll Forest
   - Coastal Sand Heath
   - Alpine Complex
   - Plantation Forest
   - Cleared/Urban

3. System recalculates fire behavior parameters based on selected type
4. Orange "Manual Override" badge appears
5. Info text shows: "Using manual selection (was: [original auto-detected type])"

### Reverting to Auto-Detection

To return to automatic detection, the user selects the "Auto-detected: [Type Name]" option at the top of the dropdown. This:
1. Clears the manual override
2. Reverts to the original auto-detected vegetation type
3. Removes the "Manual Override" badge
4. Recalculates fire behavior using the auto-detected type

## Technical Implementation

### Data Model

The `GeoContext` interface was extended with two new optional fields:

```typescript
export interface GeoContext {
  vegetationType: string;                    // Auto-detected type from NVIS
  manualVegetationType?: string;             // User-selected override
  isVegetationManuallySet?: boolean;         // Flag indicating manual override
  // ... other fields
}
```

### Effective Vegetation Type

A helper function `getEffectiveVegetationType()` determines which vegetation type to use:

```typescript
function getEffectiveVegetationType(geoContext): string {
  return geoContext?.manualVegetationType || geoContext?.vegetationType || 'Dry Sclerophyll Forest';
}
```

This function is used throughout the application:
- Fire behavior calculations
- Prompt generation for AI image models
- Display in UI components

### State Management

The manual override is stored in the Zustand app store as part of `geoContext`. Changes trigger:
1. Re-calculation of fire behavior (flame height and rate of spread)
2. Update of scenario inputs
3. No re-fetch of NVIS data (preserves original auto-detected type)

### Persistence

Manual override persists:
- Throughout the current scenario session
- When changing other scenario parameters (fire danger, weather, etc.)
- When applying presets

Manual override is **cleared** when:
- User draws a new fire perimeter (triggers new NVIS query)
- User explicitly selects "Auto-detected" option

## Fire Behavior Impact

When vegetation type is changed (auto or manual), the system recalculates:

1. **Flame Height**: Based on fire danger rating and vegetation fuel characteristics
2. **Rate of Spread**: Based on fire danger rating and vegetation fire propagation characteristics

The calculations use predefined behavior matrices for each vegetation type and fire danger rating combination, ensuring that manual overrides produce realistic and consistent fire behavior parameters.

## Accessibility

The vegetation selector component follows accessibility best practices:

- Semantic HTML with proper `<label>` and `<select>` elements
- Keyboard navigation fully supported
- Screen reader friendly with descriptive labels and ARIA attributes
- Visual focus indicators for keyboard users
- Clear visual hierarchy with badges and info text

## Future Enhancements

Potential improvements for future iterations:

1. **Vegetation confidence display**: Show NVIS confidence scores more prominently
2. **Recent override history**: Remember frequently used overrides per location
3. **Vegetation preview**: Show sample images or descriptions of each vegetation type
4. **Mixed vegetation**: Support selecting multiple vegetation types with percentages
5. **Custom vegetation types**: Allow users to define custom vegetation types with fuel characteristics

## Related Files

- `/packages/shared/src/types.ts` - GeoContext interface definition
- `/packages/shared/src/constants.ts` - Vegetation types and helper functions
- `/apps/web/src/components/ScenarioInputPanel/VegetationSelector.tsx` - UI component
- `/apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx` - Integration logic
- `/packages/shared/src/prompts/promptGenerator.ts` - Prompt generation using effective vegetation type
- `/packages/shared/src/fireDangerCalculations.ts` - Fire behavior calculations

## Testing

Unit tests cover:
- `getEffectiveVegetationType()` with various scenarios (manual set, not set, null context, etc.)
- Fire behavior recalculation when vegetation changes
- Prompt generation using effective vegetation type

Manual testing checklist:
- [ ] Draw perimeter, verify auto-detected vegetation displays
- [ ] Select manual override, verify badge appears and calculations update
- [ ] Revert to auto-detected, verify badge disappears
- [ ] Draw new perimeter, verify manual override is cleared
- [ ] Change fire danger rating with manual override, verify calculations update correctly
- [ ] Apply preset with manual override, verify override persists
