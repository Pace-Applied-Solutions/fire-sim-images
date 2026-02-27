# Modify Image Feature

**Added:** 2026-02-27  
**PR:** `add-modify-image-function`

---

## Overview

Users can now submit a natural language edit request against any previously generated image to produce a modified version. The modification is performed by sending the full prior session context to the Gemini API — the original reference images, the original prompt, the previously generated image, and then the edit request — so the model understands exactly what was created and what needs to change.

---

## User Flow

### Prompt Lab

1. Generate an image using the standard Generate button.
2. In the **Generated Images** grid, click the **✏ (pencil)** button on any image card.
3. An inline panel expands below the card with a textarea.
4. Type a natural language edit request (e.g. _"make the sky red and remove the car"_).
5. Press **✏ Apply** (or **Ctrl+Enter**).
6. A new image is added to the session grid with a **"✏ Modified"** badge, below the original. The `parentId` field links it to the source image.

### Scenario Workspace

1. After generation completes, each image card in the results panel shows a **✏ Modify** button alongside Download and View Prompt.
2. Clicking **✏ Modify** expands an inline panel with a textarea.
3. Submit the edit request (or press **Ctrl+Enter**).
4. The panel fetches the image from its Azure Blob SAS URL, converts it to base64, and calls `POST /api/lab/modify`.
5. On completion, the modified image is shown as a preview within the card. The user can **↓ Download**, **Modify Again**, or **Close** the panel.

---

## Architecture

### Session Context (Multi-Turn Conversation)

The Gemini API's `streamGenerateContent` endpoint accepts a `contents` array with multiple turns. The modify flow builds a 3-turn conversation:

| Turn | Role | Content |
|------|------|---------|
| 1 | `user` | Original reference images (map screenshot, aerial view, vegetation overlay) + original prompt text |
| 2 | `model` | Previously generated image + a brief descriptor ("Generated bushfire image as requested.") |
| 3 | `user` | Natural language edit request |

This gives the model full visual and textual context from the original generation session, matching the behavior of a chat-style re-prompt.

### API Endpoint

```
POST /api/lab/modify
Content-Type: application/json
Accept: text/event-stream   (for SSE streaming, recommended)
        application/json    (fallback)
```

**Request body:**
```typescript
{
  originalPrompt: string;        // exact prompt used in the original generation
  imageDataUrl: string;          // previously generated image as base64 data URL
  editRequest: string;           // natural language modification request
  systemInstruction?: string;    // optional — pass the same one used originally
  referenceImages?: Array<{      // optional — original reference images for spatial context
    dataUrl: string;
    type: 'map_screenshot' | 'aerial_overview' | 'vegetation_overlay' | 'uploaded' | 'generated_output';
  }>;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}
```

**SSE Response events** (same format as `lab/generate`):
- `thinking` — `{ text: string }` — incremental model reasoning
- `result` — `{ dataUrl, thinkingText, metadata }` — final modified image
- `error` — `{ error: string }` — on failure
- `done` — `{}` — stream complete

### Files

| File | Change |
|------|--------|
| `apps/api/src/functions/labModify.ts` | New Azure Function (`POST /api/lab/modify`) |
| `apps/api/src/services/geminiImageProvider.ts` | New `modifyImage()` method (multi-turn context) |
| `apps/api/src/index.ts` | Registered `labModify` import |
| `apps/web/src/services/labApi.ts` | Added `LabModifyRequest` interface + `modifyImage()` method |
| `apps/web/src/store/labStore.ts` | Added `modifyingImageId`, `isModifying`, `modifyProgress` state; `parentId`/`editRequest` on `LabGeneratedImage` |
| `apps/web/src/components/PromptLab/GeneratedImagesCollector.tsx` | Inline modify panel + ✏ button per card |
| `apps/web/src/components/PromptLab/GeneratedImagesCollector.module.css` | Modify panel styles |
| `apps/web/src/components/GeneratedImages/GeneratedImages.tsx` | `ModifyPanel` component + ✏ Modify button per scenario image card |
| `apps/web/src/components/GeneratedImages/GeneratedImages.module.css` | Modify panel styles |

---

## State Management

### labStore additions

```typescript
// Tracks which image in the Prompt Lab is open for modification
modifyingImageId: string | null;

// Whether a modification is in progress (disables other modify buttons)
isModifying: boolean;

// Progress message shown during modification
modifyProgress: string;
```

### LabGeneratedImage new fields

```typescript
// ID of the source image if this was produced by a modification
parentId?: string;

// The natural language edit request that produced this image
editRequest?: string;
```

---

## Accessibility

- Edit textarea has an explicit `<label>` linked via `htmlFor`/`id`.
- Modify toggle button uses `aria-expanded` to communicate open/closed state.
- Modify panel has `role="region"` with `aria-label="Modify image"`.
- Keyboard shortcut: **Ctrl+Enter** (or **⌘+Enter** on macOS) submits the modification.
- Modify button is disabled (not just hidden) while another modification is in progress.

---

## Known Limitations

- The scenario workspace (GeneratedImages) fetches the image from the SAS URL **client-side**. This means the user's browser must be able to reach the Azure Blob SAS URL. If the URL has expired (SAS tokens are 24-hour), the fetch will fail with a 403.
- Reference images are only re-sent if they are still present in `labStore.referenceImages` with matching IDs. If the user has cleared reference images since the original generation, the modify API will still work but without spatial grounding (the Gemini context will only include the generated image and text prompt).
- Only one modification panel can be open at a time in the Prompt Lab (global `modifyingImageId`). This is intentional to prevent accidental simultaneous requests.
