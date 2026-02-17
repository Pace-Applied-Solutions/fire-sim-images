# Design: Prompt Lab (Experimental Image Generation)

> **Status:** Proposed  
> **Master plan section:** Phase 5 — Validation and hardening  
> **Goal:** A dedicated UI mode for manually controlling every input to the image generation model, enabling rapid experimentation with prompt composition, reference images, and camera captures.

---

## 1. Problem Statement

The current generation flow is fully automated: the UI captures 5 fixed viewpoint screenshots, builds prompts from structured data, and submits them all at once via the orchestrator. This makes it impossible to:

- **Isolate which inputs** drive quality vs. poor results (map screenshot quality, vegetation overlay, prompt sections, system instruction, reference images).
- **Manually compose the camera view** before capturing — the automated capture cycles through viewpoints programmatically.
- **Edit the prompt text** before submission — sections are assembled server-side with no user visibility or override.
- **Iterate on a single image** — the batch-of-5 approach wastes API calls and time when experimenting.
- **Use a previously generated image as a reference** for the next generation.

The Prompt Lab provides a workbench where every generation input is visible and editable, images are generated one at a time, and outputs can be collected as reference material for subsequent prompts.

---

## 2. User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. User navigates to /lab (or toggles "Prompt Lab" mode)              │
│  2. Normal scenario setup: draw perimeter, set fire inputs, geo loads  │
│  3. User manually positions the map camera (pan, tilt, zoom, rotate)   │
│  4. User clicks 📷 CAPTURE button → clean map screenshot taken         │
│     (all UI chrome hidden; only terrain + fire shape polygon visible)  │
│  5. Captured screenshot appears in the "Reference Images" tray         │
│  6. User can capture multiple screenshots or upload external images    │
│  7. Prompt sections auto-populate from scenario data (read-only view)  │
│  8. User reviews and can EDIT every prompt section in a text editor    │
│  9. System instruction is shown and editable                           │
│ 10. User selects which reference images to include in this generation  │
│ 11. User clicks GENERATE → single image generated                     │
│ 12. Result appears in "Generated Images" collector tray                │
│ 13. User can drag a generated image into the reference tray            │
│     to use it as input for the next generation                         │
│ 14. Repeat 3-13, experimenting with different combinations             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layout Design

```
┌─────────────────────────────── Header ──────────────────────────────────┐
│  🔥 Fire Sim  │ Scenario │ Gallery │ Prompt Lab │ Settings │  [API ●]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │                                 │  │  PROMPT EDITOR               │  │
│  │         MAP CANVAS              │  │  ┌──────────────────────┐    │  │
│  │   (full 3D map, draw tools,     │  │  │ System Instruction   │▼   │  │
│  │    manual camera control)       │  │  │ [editable textarea]  │    │  │
│  │                                 │  │  └──────────────────────┘    │  │
│  │                                 │  │  ┌──────────────────────┐    │  │
│  │                                 │  │  │ § Style              │▼   │  │
│  │         [📷 Capture]            │  │  │ [editable textarea]  │    │  │
│  │                                 │  │  └──────────────────────┘    │  │
│  │                                 │  │  ┌──────────────────────┐    │  │
│  └─────────────────────────────────┘  │  │ § Behavior Princ.    │▼   │  │
│                                       │  │ [editable textarea]  │    │  │
│  ┌─────────────────────────────────┐  │  └──────────────────────┘    │  │
│  │  REFERENCE IMAGES TRAY          │  │  § Ref Imagery [edit]  ▼    │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐       │  │  § Locality    [edit]  ▼    │  │
│  │  │cap 1│ │cap 2│ │gen→ │ [+]   │  │  § Terrain     [edit]  ▼    │  │
│  │  │ ☑   │ │ ☑   │ │ref  │       │  │  § Features    [edit]  ▼    │  │
│  │  └─────┘ └─────┘ └─────┘       │  │  § Vegetation  [edit]  ▼    │  │
│  │  Drag generated images here     │  │  § Fire Geom   [edit]  ▼    │  │
│  └─────────────────────────────────┘  │  § Fire Behav   [edit]  ▼    │  │
│                                       │  § Weather      [edit]  ▼    │  │
│  ┌─────────────────────────────────┐  │  § Perspective  [edit]  ▼    │  │
│  │  GENERATED IMAGES COLLECTOR     │  │  § Safety       [edit]  ▼    │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐       │  │                              │  │
│  │  │img 1│ │img 2│ │img 3│       │  │  ┌──────────────────────┐    │  │
│  │  │     │ │     │ │     │       │  │  │ FINAL PROMPT PREVIEW │    │  │
│  │  └─────┘ └─────┘ └─────┘       │  │  │ (read-only, compiled)│    │  │
│  │  Click to expand · drag to ref  │  │  └──────────────────────┘    │  │
│  └─────────────────────────────────┘  │                              │  │
│                                       │  [🧪 Generate Single Image]  │  │
│                                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Left column (≈55%):** Map canvas + Reference Images tray + Generated Images collector  
**Right column (≈45%):** Prompt editor with collapsible sections + Generate button

---

## 4. Component Breakdown

### 4.1 Route & Page

| Item | Detail |
|------|--------|
| Route | `/lab` |
| Page component | `PromptLabPage.tsx` in `apps/web/src/pages/` |
| Nav entry | Add "Prompt Lab" link to Header nav (between Gallery and Settings) |

### 4.2 New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PromptLabPage` | `pages/PromptLabPage.tsx` | Top-level page, manages lab state, two-column layout |
| `LabMapCanvas` | `components/PromptLab/LabMapCanvas.tsx` | Wraps existing `MapContainer` with capture overlay button. Registers a "clean capture" function that hides all UI chrome, captures canvas, restores UI. |
| `CaptureButton` | `components/PromptLab/CaptureButton.tsx` | Floating 📷 button on the map. On click: hide all overlays (sidebar, header, draw controls, buttons, vegetation tooltip) → capture canvas as data URL → restore → add to reference tray. |
| `ReferenceImageTray` | `components/PromptLab/ReferenceImageTray.tsx` | Horizontal scrollable strip of thumbnail images. Each has a checkbox (include/exclude from generation). Supports: captured screenshots, uploaded files (drag-and-drop or file picker), generated images dragged from collector. Drag-to-reorder sets primary reference image (first = map screenshot, others = additional references). Delete button per image. Labels: "Map Screenshot", "Vegetation Overlay", "Reference Image", "Previous Output". |
| `PromptEditor` | `components/PromptLab/PromptEditor.tsx` | Scrollable panel with collapsible accordion sections. Each section shows: section name, auto-generated text (greyed, read-only preview), editable textarea (user override). A "Reset to auto" button per section reverts to computed value. Top section: System Instruction (the Gemini system prompt). Bottom section: Final Compiled Prompt (read-only, shows the full concatenated prompt that will be sent). Character/word count. |
| `PromptSection` | `components/PromptLab/PromptSection.tsx` | Single collapsible section: header with name + reset button, auto-generated preview, editable textarea. Tracks `isModified` state. |
| `GeneratedImagesCollector` | `components/PromptLab/GeneratedImagesCollector.tsx` | Grid/strip of generated outputs from this lab session. Each image shows: thumbnail, viewpoint label, timestamp, thinking text preview. Actions: expand/lightbox, download, "Use as Reference" (copies to reference tray), "View Prompt" (shows the exact prompt used), delete. |
| `GenerateButton` | `components/PromptLab/GenerateButton.tsx` | Triggers single-image generation. Shows progress/thinking text inline. Disabled when no reference images selected or prompt empty. |
| `FinalPromptPreview` | `components/PromptLab/FinalPromptPreview.tsx` | Read-only textarea showing the fully assembled prompt (all sections concatenated). Copy-to-clipboard button. Highlights modified sections in a different color. |

### 4.3 Shared / Reused Components

| Existing Component | Reuse |
|--------------------|-------|
| `MapContainer` | Core map — reused with modifications (capture mode, no auto-viewpoint cycling) |
| `ScenarioInputPanel` | Embed in a collapsible drawer or modal for setting fire inputs. Not in the main layout — accessible via a "Configure Scenario" button. |
| `ImageLightbox` | Reuse for full-screen image viewing from the collector |
| `PromptModal` | Partially reuse the display logic for showing per-image prompts |

---

## 5. State Management

### 5.1 New Zustand Store: `useLabStore`

```typescript
interface LabStore {
  // ── Reference images ──
  referenceImages: LabReferenceImage[];
  addReferenceImage: (img: LabReferenceImage) => void;
  removeReferenceImage: (id: string) => void;
  toggleReferenceImage: (id: string) => void;  // include/exclude
  reorderReferenceImages: (ids: string[]) => void;

  // ── Prompt sections ──
  promptSections: Record<PromptSectionKey, LabPromptSection>;
  updateSectionText: (key: PromptSectionKey, text: string) => void;
  resetSection: (key: PromptSectionKey) => void;
  resetAllSections: () => void;

  // ── System instruction ──
  systemInstruction: string;
  systemInstructionModified: boolean;
  updateSystemInstruction: (text: string) => void;
  resetSystemInstruction: () => void;

  // ── Generation ──
  isGenerating: boolean;
  generationProgress: string;
  thinkingText: string;

  // ── Generated images (session collector) ──
  generatedImages: LabGeneratedImage[];
  addGeneratedImage: (img: LabGeneratedImage) => void;
  removeGeneratedImage: (id: string) => void;
  clearGeneratedImages: () => void;

  // ── Lab settings ──
  seed: number | null;
  imageSize: '1024x1024' | '1792x1024' | '1024x1792';
  setSeed: (seed: number | null) => void;
  setImageSize: (size: string) => void;
}

type PromptSectionKey =
  | 'style' | 'behaviorPrinciples' | 'referenceImagery' | 'locality'
  | 'terrain' | 'features' | 'vegetation' | 'fireGeometry'
  | 'fireBehavior' | 'weather' | 'perspective' | 'safety';

interface LabPromptSection {
  key: PromptSectionKey;
  label: string;
  autoText: string;       // computed from scenario data
  userText: string;        // user override (empty = use autoText)
  isModified: boolean;
  isCollapsed: boolean;
}

interface LabReferenceImage {
  id: string;              // uuid
  dataUrl: string;         // base64 data URL
  label: string;           // "Map Screenshot", "Vegetation Overlay", etc.
  type: 'map_screenshot' | 'vegetation_overlay' | 'uploaded' | 'generated_output';
  included: boolean;       // whether to send with the generation request
  sourceViewpoint?: string;
  capturedAt: string;      // ISO timestamp
}

interface LabGeneratedImage {
  id: string;
  dataUrl: string;
  prompt: string;          // the exact prompt used
  systemInstruction: string;
  referenceImageIds: string[];
  thinkingText?: string;
  seed?: number;
  generatedAt: string;
  generationTimeMs: number;
  model: string;
}
```

### 5.2 Integration with Existing `appStore`

The lab page reads from `appStore` for:
- `perimeter` — fire perimeter polygon (required for prompt generation)
- `geoContext` — geo-enrichment data
- `scenarioInputs` — fire behavior inputs
- `vegetationLegendItems` — NVIS legend data

The lab does **not** write to `appStore`'s generation state — it manages its own isolated state via `labStore`.

---

## 6. API Design

### 6.1 New Endpoint: `POST /api/lab/generate`

A lightweight, synchronous (or near-synchronous) single-image generation endpoint that bypasses the orchestrator's multi-view pipeline.

**Request:**

```typescript
interface LabGenerateRequest {
  prompt: string;            // the full assembled prompt text
  systemInstruction?: string; // custom system instruction (optional)
  referenceImages?: Array<{
    data: string;            // base64 encoded image data
    mimeType: string;        // 'image/jpeg' | 'image/png'
    role: 'map_screenshot' | 'vegetation_overlay' | 'reference';
  }>;
  vegetationLegendItems?: Array<{ name: string; color: string }>;
  vegetationPromptText?: string;
  seed?: number;
  imageSize?: '1024x1024' | '1792x1024' | '1024x1792';
}
```

**Response (HTTP 200):**

```typescript
interface LabGenerateResponse {
  imageData: string;          // base64 encoded PNG
  thinkingText?: string;      // model reasoning (Gemini 3 Pro)
  modelTextResponse?: string; // any text the model returned
  model: string;
  generationTimeMs: number;
  seed?: number;
}
```

**Key differences from `POST /api/generate`:**
- Accepts the **full prompt as a string** (no server-side prompt assembly)
- Sends **arbitrary reference images** (not tied to viewpoints)
- Returns a **single image inline** (no blob storage, no orchestration)
- No polling — returns when the image is ready (with streaming for thinking text via SSE)
- No consistency validation pass
- No scenario persistence (this is ephemeral experimentation)

### 6.2 SSE Streaming Variant

For thinking-text streaming, the endpoint can use SSE:

```
POST /api/lab/generate  (Accept: text/event-stream)

→ event: thinking
  data: {"text": "I'm analyzing the terrain..."}

→ event: thinking
  data: {"text": "The fire should show eucalyptus crowning..."}

→ event: result
  data: {"imageData": "base64...", "model": "gemini-3-pro", ...}
```

This gives the user real-time feedback on model reasoning.

---

## 7. Map Capture (Clean Screenshot)

The capture button must produce a "clean" screenshot — terrain + fire polygon only, no UI chrome.

**Capture sequence:**

1. **Hide all UI overlays:**
   - Mapbox Draw control toolbar
   - Viewpoint selector buttons
   - Vegetation tooltip
   - NVIS legend panel
   - Any floating UI (zoom controls, compass)
   - Map attribution (temporarily)
2. **Wait one frame** for DOM to settle
3. **Call `map.getCanvas().toDataURL('image/jpeg', 0.85)`**
4. **Restore all UI overlays**
5. **Add captured image to `labStore.referenceImages`** with type `map_screenshot`

The user controls the camera position before capture — there is no automated viewpoint cycling. They manually pan, tilt, zoom, and rotate to compose the view they want.

**Separate vegetation capture:** A "Capture Vegetation Overlay" button does the same but with the NVIS WMS layer at full opacity (reuses existing `captureVegetationScreenshot()` logic from `mapCapture.ts`).

---

## 8. Prompt Assembly (Client-Side)

The prompt is assembled **client-side** in the lab so the user has full visibility and control. The shared `promptTemplates.ts` and `promptGenerator.ts` are already in `@fire-sim/shared` (browser-compatible).

**Flow:**
1. When scenario data changes (perimeter, inputs, geoContext), auto-compute each prompt section using the template functions from `@fire-sim/shared`
2. Populate `labStore.promptSections[key].autoText` for each section
3. The `PromptEditor` shows each section; user can override any section's text
4. `FinalPromptPreview` concatenates all sections (using `userText` if modified, else `autoText`) separated by `\n\n`
5. The concatenated string is what gets sent to `/api/lab/generate` as `prompt`

The system instruction defaults to the Gemini 3 Pro system instruction from `geminiImageProvider.ts` and is shown separately in the editor.

---

## 9. Generated Image Lifecycle

```
                    ┌──────────────┐
                    │  Generated   │
                    │   Image      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        [Expand/      [Download]   [Use as
         Lightbox]                  Reference]
                                       │
                                       ▼
                              ┌────────────────┐
                              │ Reference Tray │
                              │ (type:          │
                              │  generated_     │
                              │  output)        │
                              └────────────────┘
                                       │
                                       ▼
                              Included in next
                              generation request
```

This enables iterative refinement: generate an image, see what worked, use it as a reference for the next attempt with modified prompt sections.

---

## 10. Settings and Controls

Located above the Generate button or in a collapsible settings row:

| Control | Type | Default | Purpose |
|---------|------|---------|---------|
| Seed | Number input + 🎲 random | null (random) | Reproducibility |
| Image Size | Dropdown | 1792×1024 | Aspect ratio control |
| Model | Read-only display | (from config) | Show which model is active |
| Viewpoint | Dropdown (all 12) | ground_north | Populates the perspective prompt section |

---

## 11. File Structure

```
apps/web/src/
├── pages/
│   └── PromptLabPage.tsx                  # New page
├── components/
│   └── PromptLab/
│       ├── LabMapCanvas.tsx               # Map wrapper with capture
│       ├── CaptureButton.tsx              # 📷 floating button
│       ├── ReferenceImageTray.tsx          # Image strip with checkboxes
│       ├── PromptEditor.tsx               # Accordion of prompt sections
│       ├── PromptSection.tsx              # Single collapsible section
│       ├── FinalPromptPreview.tsx          # Compiled prompt view
│       ├── GeneratedImagesCollector.tsx    # Output image collection
│       ├── GenerateButton.tsx             # Trigger + progress
│       └── LabSettings.tsx                # Seed, size, model controls
├── store/
│   └── labStore.ts                        # Zustand store for lab state
├── services/
│   └── labApi.ts                          # API client for /api/lab/generate

apps/api/src/
├── functions/
│   └── labGenerate.ts                     # POST /api/lab/generate endpoint
```

---

## 12. Implementation Phases

### Phase A: Core Layout & Capture (frontend only)
1. Create `/lab` route and `PromptLabPage` with two-column layout
2. Add "Prompt Lab" nav link to Header
3. Build `LabMapCanvas` with floating capture button
4. Build `ReferenceImageTray` with add/remove/toggle/reorder
5. Wire scenario input panel as a collapsible drawer

### Phase B: Prompt Editor (frontend, uses shared package)
1. Build `PromptSection` and `PromptEditor` components
2. Hydrate auto-text from `@fire-sim/shared` prompt generator
3. Build `FinalPromptPreview` with concatenation logic
4. Show system instruction as editable top section
5. Add viewpoint dropdown that updates perspective section

### Phase C: API Endpoint & Generation
1. Create `POST /api/lab/generate` function
2. Wire `GeminiImageProvider` directly (skip orchestrator)
3. Support inline base64 response or SSE streaming
4. Build `GenerateButton` with progress/thinking display
5. Build `labApi.ts` client service

### Phase D: Image Collector & Reference Loop
1. Build `GeneratedImagesCollector` with lightbox/download/prompt-view
2. Implement "Use as Reference" action (copy to reference tray)
3. Add `LabSettings` (seed, size, viewpoint dropdown)
4. Wire end-to-end: capture → edit prompt → generate → collect → reuse

---

## 13. Acceptance Criteria

- [ ] `/lab` route loads a two-column layout with map and prompt editor
- [ ] User can manually position the map camera and capture a clean screenshot (no UI chrome)
- [ ] Multiple screenshots can be captured and managed in the reference tray
- [ ] All 12 prompt sections are visible with auto-generated text from scenario data
- [ ] Each prompt section can be individually edited and reset
- [ ] System instruction is visible and editable
- [ ] Final compiled prompt is shown in real-time as sections are edited
- [ ] Single image generation works via `/api/lab/generate`
- [ ] Thinking text streams to the UI during generation
- [ ] Generated images appear in the collector tray
- [ ] Generated images can be promoted to reference images for subsequent generations
- [ ] External images can be uploaded to the reference tray
- [ ] Seed control allows reproducible generations
- [ ] Viewpoint dropdown updates the perspective prompt section
- [ ] No changes to the existing scenario generation flow (this is additive)

---

## 14. Non-Goals (First Version)

- No persistence of lab sessions (ephemeral; close tab = gone)
- No A/B comparison tooling (just manual visual comparison)
- No automated prompt quality scoring
- No batch generation from the lab
- No video generation from the lab
