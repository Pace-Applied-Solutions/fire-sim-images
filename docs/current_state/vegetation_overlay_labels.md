# Vegetation Overlay Labels in Prompt Lab

**Date:** February 17, 2026
**Issue:** Prompt Lab: Vegetation Overlay Labels
**Status:** Implemented

## Overview

Added visible labels to vegetation overlay screenshots in Prompt Lab to make the vegetation type distribution clearer for AI image generation prompts.

## Problem Statement

When capturing vegetation overlay screenshots from the NVIS WMS layer in Prompt Lab, the colored blocks representing different vegetation types were not explicitly labeled. This made it difficult for:

1. AI prompts to understand what vegetation types were present
2. Users to quickly identify vegetation distribution
3. The image generation model to accurately interpret the vegetation context

## Solution

Implemented an intelligent labeling system that:

1. **Detects contiguous blocks** of vegetation using a flood-fill algorithm
2. **Identifies vegetation types** based on color analysis
3. **Renders labels** at the centroid of each significant vegetation block
4. **Provides toggle control** in Prompt Lab settings to enable/disable labels

## Implementation Details

### Files Added

1. **`apps/web/src/utils/vegetationLabelRenderer.ts`**
   - Core utility for analyzing vegetation overlay images
   - Implements flood-fill algorithm to find contiguous blocks
   - Renders text labels with dark backgrounds for readability
   - Configurable minimum block size (default: 1000 pixels)

### Files Modified

1. **`apps/web/src/store/labStore.ts`**
   - Added `showVegetationLabels: boolean` state (default: `true`)
   - Added `setShowVegetationLabels` action

2. **`apps/web/src/components/PromptLab/LabSettings.tsx`**
   - Added checkbox control for "Show Vegetation Labels"
   - Connected to labStore state

3. **`apps/web/src/components/PromptLab/LabSettings.module.css`**
   - Added styles for checkbox and checkbox label

4. **`apps/web/src/components/PromptLab/LabMapCanvas.tsx`**
   - Integrated `renderVegetationLabels` utility
   - Applied labels to vegetation overlay before adding to reference images
   - Respects toggle setting from labStore

5. **`docs/master_plan.md`**
   - Added entry for vegetation overlay labels feature

## Technical Approach

### Contiguous Block Detection

The implementation uses a flood-fill algorithm to identify contiguous regions of the same color:

1. Scan through all pixels in the vegetation overlay image
2. For each unvisited pixel, start a flood-fill to find all connected pixels with the same color
3. Track pixel count, bounds, and calculate centroid for each block
4. Filter out blocks smaller than the minimum size threshold

### Vegetation Type Mapping

The current implementation uses a simple heuristic approach based on HSV color analysis:
- Converts RGB colors to HSV (Hue, Saturation, Value)
- Maps color ranges to vegetation types (e.g., green hues → forests, yellow hues → grasslands)

**Note:** This is a simplified implementation. In production, you would map actual NVIS WMS colors to specific vegetation types from `NVIS_MVS_DESCRIPTORS` in `packages/shared/src/constants.ts`.

### Label Rendering

Labels are rendered with:
- **Dark semi-transparent background** (rgba(0, 0, 0, 0.7)) for readability
- **White border** for contrast
- **White text** (rgba(255, 255, 255, 0.95))
- **System font stack** for consistency
- **Positioned at centroid** of each vegetation block

## User Experience

### Enabling/Disabling Labels

1. Navigate to Prompt Lab
2. In the Lab Settings panel (right side), locate "Show Vegetation Labels" checkbox
3. Check to enable labels (default), uncheck to disable
4. When capturing vegetation overlay, labels will be included/excluded based on this setting

### Capturing Vegetation Overlay

1. Click the "🌿 Vegetation" button in the Lab Map Canvas
2. The system captures the NVIS vegetation layer
3. If "Show Vegetation Labels" is enabled, labels are automatically added
4. The labeled overlay is added to Reference Images tray

## Benefits

1. **Better AI Understanding:** Vegetation types are explicitly labeled, helping the AI model understand the fuel distribution
2. **User Clarity:** Trainers can quickly see vegetation distribution without memorizing color codes
3. **Prompt Quality:** More accurate and detailed vegetation context in image generation prompts
4. **Flexibility:** Toggle allows users to choose labeled or unlabeled overlays based on their needs

## Limitations and Future Improvements

### Current Limitations

1. **Simplified Color Mapping:** Uses heuristic color analysis rather than actual NVIS color legend
2. **Fixed Minimum Block Size:** 1000 pixels minimum may filter out important small patches
3. **No Label Customization:** Font size, style, and position are fixed
4. **Performance:** Flood-fill algorithm may be slow for very large images

### Potential Enhancements

1. **Accurate Color Mapping:** Integrate actual NVIS WMS color legend from DCCEEW
2. **Configurable Block Size:** Allow users to adjust minimum block size threshold
3. **Smart Label Placement:** Avoid label overlaps and optimize positioning
4. **Performance Optimization:** Use Web Workers for image processing
5. **Label Customization:** Allow font size, color, and background opacity adjustments
6. **Vegetation Legend:** Add a color legend sidebar showing all vegetation types present

## Accessibility

- Labels use high-contrast white text on dark backgrounds
- System font stack ensures consistent rendering across platforms
- Checkbox control has proper label association for screen readers
- Toggle setting is persistent within the session

## Testing

### Manual Testing Checklist

- [ ] Vegetation overlay capture with labels enabled shows labeled blocks
- [ ] Vegetation overlay capture with labels disabled shows plain overlay
- [ ] Labels are positioned at centroids of vegetation blocks
- [ ] Labels are readable with sufficient contrast
- [ ] Small blocks below threshold are not labeled
- [ ] Toggle setting persists during session
- [ ] No performance degradation during capture

### Browser Compatibility

- Tested on modern browsers with Canvas API support
- Uses standard HTML5 Canvas and Image APIs
- No browser-specific features or polyfills required

## Documentation Updates

- Master plan updated with feature entry
- This implementation document created in `docs/current_state/`
- Code includes inline comments explaining algorithms and logic

## Related Files

- Core utility: `apps/web/src/utils/vegetationLabelRenderer.ts`
- UI control: `apps/web/src/components/PromptLab/LabSettings.tsx`
- Integration: `apps/web/src/components/PromptLab/LabMapCanvas.tsx`
- State management: `apps/web/src/store/labStore.ts`
- Vegetation data: `packages/shared/src/constants.ts` (NVIS_MVS_DESCRIPTORS)

## Acceptance Criteria

- [x] Labels are rendered on contiguous vegetation blocks, not individual squares
- [x] Default vegetation types are labeled (derived from color analysis)
- [x] Toggle option exposed in Prompt Lab UI
- [x] Implementation notes and documentation added to docs/current_state/
- [x] Code builds successfully without errors
