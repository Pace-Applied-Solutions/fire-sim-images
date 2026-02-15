# Multi-Perspective Rendering & Consistency

This document describes the multi-perspective image generation system and the consistency mechanisms implemented to ensure generated images appear to show the same fire scene from different angles.

## Overview

The system generates 5-12 images per scenario, each representing the same fire from a different viewpoint (aerial, helicopter views, ground-level views). The challenge is ensuring these AI-generated images maintain visual consistency—same fire characteristics, weather conditions, and terrain appearance.

## Consistency Mechanisms

### 1. Anchor Image Strategy (Two-Pass Generation)

**Implementation:** `apps/api/src/services/generationOrchestrator.ts`

The generation pipeline uses a two-pass approach:

**Pass 1: Anchor Image**

- The aerial view (or first requested viewpoint) is generated first
- This becomes the "anchor" or reference image for the scenario
- Captured and stored in blob storage
- Marked with `isAnchor: true` in metadata

**Pass 2: Derived Views**

- All remaining viewpoints are generated using the anchor image as a reference
- The anchor image is passed to the AI model via `referenceImage` parameter
- Reference strength set to 0.5 (50% adherence to anchor while maintaining perspective)
- Each derived image is marked with `usedReferenceImage: true`

### 2. Map Screenshot References

**Implementation:** `apps/web/src/utils/mapScreenshots.ts`

Before generation, the system captures 3D map screenshots from each viewpoint:

- `calculateViewpointCamera()` computes exact camera position for each of 12 viewpoints
- `captureViewpointScreenshot()` captures a PNG screenshot from that angle
- `captureAllViewpointScreenshots()` batch-captures all requested views
- Screenshots are passed to AI model to ground generated imagery in real terrain

**Benefits:**

- AI model sees the actual terrain geometry, vegetation color, and elevation
- Generated fire overlays match the real landscape appearance
- Reduces terrain inconsistencies between views

### 3. Consistency Seed Management

**Implementation:** `packages/shared/src/types.ts`, `generationOrchestrator.ts`

All images in a scenario use the same random seed:

- Seed is auto-generated (0-1,000,000 range) if not provided by user
- Same seed is passed to AI model for all viewpoints
- Seed is stored in `GenerationResult` for reproducibility
- Each image metadata tracks which seed was used

**Benefits:**

- AI models with seed support produce more consistent outputs
- Enables exact reproduction of results
- Debugging and quality control

### 4. Visual Consistency Validation

**Implementation:** `apps/api/src/validation/consistencyValidator.ts`

After generation, the system validates consistency across 4 dimensions:

#### Smoke Direction Consistency (30% weight)

- Validates smoke direction aligns with wind parameter
- Checks if prompts correctly specify wind direction
- Threshold: 80% of images must mention wind direction

#### Fire Size Proportionality (20% weight)

- Checks if multiple viewpoint types are present
- Verifies anchor image exists
- Ensures different perspectives show fire at appropriate scales

#### Lighting Consistency (25% weight)

- Validates lighting matches time-of-day parameter
- Checks prompts mention correct lighting conditions
- Threshold: 80% of images must reference time of day

#### Color Palette Similarity (25% weight)

- Verifies all images use the same AI model
- Confirms same seed across all images
- Higher consistency with uniform generation settings

**Overall Score:**

- Weighted average of 4 checks (0-100 scale)
- Passing threshold: 70/100
- Validation report logged to Azure Functions console
- Warnings added to generation result if score is low

### 5. Image Post-Processing (Placeholder)

**Implementation:** `apps/api/src/services/imagePostProcessor.ts`

Ready for production enhancement with real image processing:

**Color Grading:**

- Normalize white balance across image set
- Adjust brightness, contrast, saturation uniformly
- Match color characteristics of anchor image

**Smoke Overlay:**

- Optionally composite semi-transparent smoke layer programmatically
- Ensures consistent atmospheric haze across views

**Metadata Watermark:**

- Add viewpoint name, scenario ID, timestamp to corner
- Toggleable via configuration
- Position: top-left, top-right, bottom-left, bottom-right

**Note:** Currently returns images unchanged (dev mode). Production implementation would use `sharp` library for actual image manipulation.

### 6. Comparison View Component

**Implementation:** `apps/web/src/components/ImageComparison/`

Interactive UI for comparing generated images:

**Grid View:**

- All images displayed in responsive grid
- Anchor image highlighted with yellow border and "Anchor" badge
- Reference usage indicated with 🔗 icon
- Consistency seed shown in header

**Side-by-Side View:**

- Select any two images for detailed comparison
- Dropdowns to choose left and right images
- Large side-by-side display with viewpoint labels

**Carousel View:**

- Swipe through all viewpoints sequentially
- Prev/Next navigation buttons
- Viewpoint name, metadata, and progress indicator overlay

**Responsive:**

- Mobile-friendly layouts
- Stacks views vertically on small screens
- Touch-friendly controls

### 7. Regeneration Controls

**Implementation:** `apps/web/src/components/GeneratedImages/GeneratedImages.tsx`

Each image card includes a regenerate button (🔄):

- Allows regenerating individual viewpoints without regenerating entire set
- **Note:** API endpoint for single-image regeneration not yet implemented
- Callback structure in place: `onRegenerateImage(viewpoint)`

**Planned Behavior:**

- Reuse same anchor image and prompt
- Allow optional seed variation
- Show regeneration progress inline
- Maintain history (future enhancement)

## Data Flow

```
1. User initiates generation
   ↓
2. System generates consistent seed (if not provided)
   ↓
3. Capture map screenshots for all requested viewpoints
   ↓
4. Generate prompts for all viewpoints
   ↓
5. Pass 1: Generate anchor image (aerial view)
   - Use seed
   - Include map screenshot
   ↓
6. Pass 2: Generate derived images (remaining viewpoints)
   - Use same seed
   - Include map screenshots
   - Pass anchor image as reference (50% strength)
   ↓
7. Upload all images to blob storage
   ↓
8. Run consistency validation
   - Check smoke direction, fire size, lighting, color palette
   - Generate validation report (0-100 score)
   - Log warnings if score < 70
   ↓
9. Store scenario metadata
   - Include validation results
   - Store seed for reproducibility
   ↓
10. Return results to frontend
    - Display in grid or comparison view
    - Show anchor badge and reference indicators
```

## Type Definitions

```typescript
// Request
interface GenerationRequest {
  seed?: number; // Optional consistent seed
  mapScreenshots?: Record<ViewPoint, string>; // Base64 PNG screenshots
  // ... other fields
}

// Result
interface GenerationResult {
  anchorImage?: GeneratedImage; // The reference image
  seed?: number; // Seed used for all images
  // ... other fields
}

// Image Metadata
interface ImageMetadata {
  seed?: number; // Seed used for this image
  isAnchor?: boolean; // True for anchor image
  usedReferenceImage?: boolean; // True if generated with reference
  // ... other fields
}

// Image Generation Options
interface ImageGenOptions {
  seed?: number;
  referenceImage?: string | Buffer; // Anchor image for consistency
  referenceStrength?: number; // 0-1, default 0.5
  mapScreenshot?: string | Buffer; // Map view for terrain reference
}
```

## Usage Example

```typescript
// Frontend: Capture map screenshots
const screenshots = await captureAllViewpointScreenshots(
  map,
  ['aerial', 'helicopter_north', 'ground_north'],
  [150.5, -33.8] // Centroid
);

// Backend: Generate with consistency
const request: GenerationRequest = {
  perimeter,
  inputs,
  geoContext,
  requestedViews: ['aerial', 'helicopter_north', 'ground_north'],
  seed: 742856, // Consistent seed
  mapScreenshots: screenshots,
};

const scenarioId = await orchestrator.startGeneration(request);

// Result includes:
// - anchorImage (aerial view)
// - seed (742856)
// - all images with usedReferenceImage: true
// - consistency validation report
```

## Future Enhancements

1. **Real Image Processing:**
   - Integrate `sharp` library for actual color grading
   - Implement smoke overlay compositing
   - Add watermark rendering

2. **Advanced Validation:**
   - Image similarity scoring (SSIM, perceptual hash)
   - Automated smoke direction detection using computer vision
   - Color histogram analysis for palette consistency

3. **Regeneration API:**
   - Single-viewpoint regeneration endpoint
   - Seed variation options
   - Keep history of regenerations

4. **User Controls:**
   - Manual seed input in UI
   - Regenerate all with new seed
   - Toggle watermarks on/off
   - Adjust reference strength

5. **Performance:**
   - Cache map screenshots for reuse
   - Parallel screenshot capture
   - Progressive image enhancement

## Testing

To test consistency features:

1. Generate a scenario with 5+ viewpoints
2. Check that all images have the same seed
3. Verify anchor image is marked in UI
4. View consistency validation report in API logs
5. Use comparison view to visually assess consistency
6. Try side-by-side comparison of different viewpoints

## References

- [Issue #9: Multi-Perspective Rendering & Consistency](https://github.com/richardthorek/fire-sim-images/issues/9)
- [View Perspectives Documentation](./view_perspectives.md)
- [Master Plan Section 9: Prompt and Image Output](../master_plan.md#9-delivery-phases-and-milestones)
