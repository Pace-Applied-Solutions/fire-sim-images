import { create } from 'zustand';
import type { ViewPoint } from '@fire-sim/shared';

/**
 * Prompt Lab Store
 * Ephemeral state for manual image generation experimentation.
 * Not persisted - closing the tab loses all session data.
 */

export type PromptSectionKey =
  | 'style'
  | 'behaviorPrinciples'
  | 'referenceImagery'
  | 'locality'
  | 'terrain'
  | 'features'
  | 'vegetation'
  | 'fireGeometry'
  | 'fireBehavior'
  | 'weather'
  | 'perspective'
  | 'safety';

export interface LabPromptSection {
  key: PromptSectionKey;
  label: string;
  autoText: string; // computed from scenario data
  userText: string; // user override (empty = use autoText)
  isModified: boolean;
  isCollapsed: boolean;
}

export interface LabReferenceImage {
  id: string; // uuid
  dataUrl: string; // base64 data URL
  label: string; // "Map Screenshot", "Vegetation Overlay", etc.
  type: 'map_screenshot' | 'vegetation_overlay' | 'uploaded' | 'generated_output';
  included: boolean; // whether to send with the generation request
  sourceViewpoint?: ViewPoint;
  capturedAt: string; // ISO timestamp
}

export interface LabGeneratedImage {
  id: string;
  dataUrl: string;
  prompt: string; // the exact prompt used
  systemInstruction: string;
  referenceImageIds: string[];
  thinkingText?: string;
  seed?: number;
  generatedAt: string;
  generationTimeMs: number;
  model: string;
}

interface LabStore {
  // ── Reference images ──
  referenceImages: LabReferenceImage[];
  addReferenceImage: (img: LabReferenceImage) => void;
  removeReferenceImage: (id: string) => void;
  toggleReferenceImage: (id: string) => void; // include/exclude
  reorderReferenceImages: (ids: string[]) => void;

  // ── Prompt sections ──
  promptSections: Record<PromptSectionKey, LabPromptSection>;
  updateSectionText: (key: PromptSectionKey, text: string) => void;
  resetSection: (key: PromptSectionKey) => void;
  resetAllSections: () => void;
  toggleSectionCollapsed: (key: PromptSectionKey) => void;
  updateAutoText: (key: PromptSectionKey, text: string) => void;

  // ── System instruction ──
  systemInstruction: string;
  systemInstructionModified: boolean;
  updateSystemInstruction: (text: string) => void;
  resetSystemInstruction: () => void;

  // ── Generation ──
  isGenerating: boolean;
  generationProgress: string;
  thinkingText: string;
  setGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: string) => void;
  setThinkingText: (text: string) => void;

  // ── Generated images (session collector) ──
  generatedImages: LabGeneratedImage[];
  addGeneratedImage: (img: LabGeneratedImage) => void;
  removeGeneratedImage: (id: string) => void;
  clearGeneratedImages: () => void;

  // ── Lab settings ──
  seed: number | null;
  imageSize: '1024x1024' | '1792x1024' | '1024x1792';
  selectedViewpoint: ViewPoint;
  setSeed: (seed: number | null) => void;
  setImageSize: (size: '1024x1024' | '1792x1024' | '1024x1792') => void;
  setSelectedViewpoint: (viewpoint: ViewPoint) => void;
}

// Default system instruction (Gemini multi-perspective consistency prompt)
const DEFAULT_SYSTEM_INSTRUCTION = `You are a specialist in generating photorealistic Australian bushfire training imagery.

Your task is to create a single coherent photorealistic photograph of an active bushfire scenario based on the provided terrain reference image and detailed fire scenario description.

Key principles:
1. Geographic accuracy: Match the exact terrain, vegetation, and features shown in the reference image
2. Fire behavior realism: Ensure flame heights, smoke patterns, and spread rates align with the described conditions
3. Atmospheric consistency: Lighting, weather, and visibility must be consistent with the scenario parameters
4. Training value: The image must be credible and useful for emergency services training

Generate a high-quality, photorealistic image that could be mistaken for an actual photograph taken during a bushfire event.`;

// Initialize prompt sections with default values
const createInitialSections = (): Record<PromptSectionKey, LabPromptSection> => ({
  style: {
    key: 'style',
    label: 'Style',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  behaviorPrinciples: {
    key: 'behaviorPrinciples',
    label: 'Behavior Principles',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  referenceImagery: {
    key: 'referenceImagery',
    label: 'Reference Imagery',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  locality: {
    key: 'locality',
    label: 'Locality',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  terrain: {
    key: 'terrain',
    label: 'Terrain',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  features: {
    key: 'features',
    label: 'Features',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  vegetation: {
    key: 'vegetation',
    label: 'Vegetation',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  fireGeometry: {
    key: 'fireGeometry',
    label: 'Fire Geometry',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  fireBehavior: {
    key: 'fireBehavior',
    label: 'Fire Behavior',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  weather: {
    key: 'weather',
    label: 'Weather',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  perspective: {
    key: 'perspective',
    label: 'Perspective',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
  safety: {
    key: 'safety',
    label: 'Safety',
    autoText: '',
    userText: '',
    isModified: false,
    isCollapsed: true,
  },
});

export const useLabStore = create<LabStore>((set) => ({
  // ── Reference images ──
  referenceImages: [],
  addReferenceImage: (img) =>
    set((state) => ({ referenceImages: [...state.referenceImages, img] })),
  removeReferenceImage: (id) =>
    set((state) => ({ referenceImages: state.referenceImages.filter((img) => img.id !== id) })),
  toggleReferenceImage: (id) =>
    set((state) => ({
      referenceImages: state.referenceImages.map((img) =>
        img.id === id ? { ...img, included: !img.included } : img
      ),
    })),
  reorderReferenceImages: (ids) =>
    set((state) => {
      const imageMap = new Map(state.referenceImages.map((img) => [img.id, img]));
      const reordered = ids.map((id) => imageMap.get(id)).filter(Boolean) as LabReferenceImage[];
      return { referenceImages: reordered };
    }),

  // ── Prompt sections ──
  promptSections: createInitialSections(),
  updateSectionText: (key, text) =>
    set((state) => ({
      promptSections: {
        ...state.promptSections,
        [key]: {
          ...state.promptSections[key],
          userText: text,
          isModified: text !== '',
        },
      },
    })),
  resetSection: (key) =>
    set((state) => ({
      promptSections: {
        ...state.promptSections,
        [key]: {
          ...state.promptSections[key],
          userText: '',
          isModified: false,
        },
      },
    })),
  resetAllSections: () =>
    set((state) => {
      const reset: Record<PromptSectionKey, LabPromptSection> = {} as Record<
        PromptSectionKey,
        LabPromptSection
      >;
      for (const key in state.promptSections) {
        const sectionKey = key as PromptSectionKey;
        reset[sectionKey] = {
          ...state.promptSections[sectionKey],
          userText: '',
          isModified: false,
        };
      }
      return { promptSections: reset };
    }),
  toggleSectionCollapsed: (key) =>
    set((state) => ({
      promptSections: {
        ...state.promptSections,
        [key]: {
          ...state.promptSections[key],
          isCollapsed: !state.promptSections[key].isCollapsed,
        },
      },
    })),
  updateAutoText: (key, text) =>
    set((state) => ({
      promptSections: {
        ...state.promptSections,
        [key]: {
          ...state.promptSections[key],
          autoText: text,
        },
      },
    })),

  // ── System instruction ──
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
  systemInstructionModified: false,
  updateSystemInstruction: (text) => set({ systemInstruction: text, systemInstructionModified: true }),
  resetSystemInstruction: () =>
    set({ systemInstruction: DEFAULT_SYSTEM_INSTRUCTION, systemInstructionModified: false }),

  // ── Generation ──
  isGenerating: false,
  generationProgress: '',
  thinkingText: '',
  setGenerating: (generating) => set({ isGenerating: generating }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  setThinkingText: (text) => set({ thinkingText: text }),

  // ── Generated images ──
  generatedImages: [],
  addGeneratedImage: (img) =>
    set((state) => ({ generatedImages: [img, ...state.generatedImages] })),
  removeGeneratedImage: (id) =>
    set((state) => ({ generatedImages: state.generatedImages.filter((img) => img.id !== id) })),
  clearGeneratedImages: () => set({ generatedImages: [] }),

  // ── Lab settings ──
  seed: null,
  imageSize: '1792x1024',
  selectedViewpoint: 'ground_north',
  setSeed: (seed) => set({ seed }),
  setImageSize: (size) => set({ imageSize: size }),
  setSelectedViewpoint: (viewpoint) => set({ selectedViewpoint: viewpoint }),
}));
