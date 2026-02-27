# Image Lightbox / Popup Preview

## Overview

All generated and reference images in the application open in an in-page popup (modal/lightbox) when clicked. This provides a fast, non-navigating preview experience for all image locations.

## Implementation

### Components

#### `ImageLightbox` (sidebar / results panel)
**File:** `apps/web/src/components/GeneratedImages/ImageLightbox.tsx`

Full-featured lightbox used in the main results sidebar (`GeneratedImages`). Supports:
- Multi-image navigation (previous/next)
- Zoom in/out (up to 3×) and pan
- Mouse wheel zoom
- Keyboard shortcuts: ESC to close, arrow keys to navigate, +/- to zoom, 0 to reset
- Download button
- Image info bar (viewpoint name, dimensions, model)
- Auto-focuses close button on open for keyboard accessibility

#### `ImageZoomModal` (Prompt Lab)
**File:** `apps/web/src/components/PromptLab/ImageZoomModal.tsx`

Simpler single-image lightbox used in the Prompt Lab for both generated images and reference images. Supports:
- ESC key to close
- Click outside the modal to close
- Close button (auto-focused on open for keyboard accessibility)
- Responsive: max 90vw × 90vh, padding adjusts on mobile

### Image Locations & Their Popup Behavior

| Location | Component | Popup Used |
|---|---|---|
| Results sidebar — generated images | `GeneratedImages` (completed state) | `ImageLightbox` |
| Results sidebar — anchor image | `GeneratedImages` (completed state) | `ImageLightbox` (fixed in this update) |
| Results sidebar — in-progress images | `GeneratedImages` (in_progress state) | `ImageLightbox` |
| Prompt Lab — generated images | `GeneratedImagesCollector` | `ImageZoomModal` |
| Prompt Lab — reference images | `ReferenceImageTray` | `ImageZoomModal` |

### Fix Applied (2026-02-27)

The anchor image in the **completed state** of `GeneratedImages.tsx` was missing its click-to-lightbox handler. The `imageWrapper` div lacked `onClick`, `role="button"`, `tabIndex`, `onKeyDown`, and the hover overlay. This has been fixed to match the behaviour of all other image cards.

## Keyboard Accessibility

### `ImageLightbox`
- Close button receives `autoFocus` when lightbox opens
- ESC — close
- ← / → — navigate between images
- +/= — zoom in
- -/_ — zoom out
- 0 — reset zoom

### `ImageZoomModal`
- Close button receives `autoFocus` when modal opens
- ESC — close
- Click outside the modal — close

## Responsiveness

- `ImageLightbox` fills the full viewport (fixed overlay) and constrains image to 90% of the available area
- `ImageZoomModal` constrains to 90vw × 90vh with reduced padding on mobile (≤640px)
- Both overlays use `backdrop-filter: blur(4px)` for depth effect

## Tests

- `apps/web/src/components/GeneratedImages/__tests__/ImageLightbox.test.tsx` — 9 tests covering render, close button, overlay click, ESC key, keyboard navigation, and counter
- `apps/web/src/components/PromptLab/__tests__/ImageZoomModal.test.tsx` — 6 tests covering render, label, close button, overlay click, ESC key, and non-propagation of inner clicks
