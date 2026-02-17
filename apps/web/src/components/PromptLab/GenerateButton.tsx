import React from 'react';
import { useLabStore } from '../../store/labStore';
import type { LabReferenceImage, PromptSectionKey } from '../../store/labStore';
import { labApi } from '../../services/labApi';
import styles from './GenerateButton.module.css';

/**
 * Generate Button
 *
 * Triggers single-image generation.
 * Shows progress and thinking text during generation.
 */
export const GenerateButton: React.FC = () => {
  const isGenerating = useLabStore((s) => s.isGenerating);
  const generationProgress = useLabStore((s) => s.generationProgress);
  const thinkingText = useLabStore((s) => s.thinkingText);
  const referenceImages = useLabStore((s) => s.referenceImages);
  const promptSections = useLabStore((s) => s.promptSections);
  const systemInstruction = useLabStore((s) => s.systemInstruction);
  const seed = useLabStore((s) => s.seed);
  const imageSize = useLabStore((s) => s.imageSize);
  const setGenerating = useLabStore((s) => s.setGenerating);
  const setGenerationProgress = useLabStore((s) => s.setGenerationProgress);
  const setThinkingText = useLabStore((s) => s.setThinkingText);
  const addGeneratedImage = useLabStore((s) => s.addGeneratedImage);

  const includedImages = referenceImages.filter((img) => img.included);
  const canGenerate = includedImages.length > 0 && !isGenerating;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationProgress('Preparing request...');
    setThinkingText('');

    const startTime = Date.now();

    try {
      // Build the full prompt from sections
      const sectionOrder: PromptSectionKey[] = [
        'style',
        'behaviorPrinciples',
        'referenceImagery',
        'locality',
        'terrain',
        'features',
        'vegetation',
        'fireGeometry',
        'fireBehavior',
        'weather',
        'perspective',
        'safety',
      ];

      const promptParts: string[] = [];
      for (const key of sectionOrder) {
        const section = promptSections[key];
        const text = section.isModified && section.userText ? section.userText : section.autoText;
        if (text.trim()) {
          promptParts.push(text.trim());
        }
      }

      const fullPrompt = promptParts.join('\n\n');

      // Prepare reference images
      const refImages = includedImages.map((img) => ({
        dataUrl: img.dataUrl,
        type: img.type,
      }));

      setGenerationProgress('Generating image...');

      // Call the lab API
      const result = await labApi.generateImage(
        {
          prompt: fullPrompt,
          systemInstruction,
          referenceImages: refImages,
          size: imageSize,
          seed: seed ?? undefined,
        },
        {
          onThinking: (text) => {
            setThinkingText(text);
          },
          onProgress: (message) => {
            setGenerationProgress(message);
          },
        }
      );

      // Add to generated images
      const generationTime = Date.now() - startTime;
      addGeneratedImage({
        id: crypto.randomUUID(),
        dataUrl: result.dataUrl,
        prompt: fullPrompt,
        systemInstruction,
        referenceImageIds: includedImages.map((img) => img.id),
        thinkingText: result.thinkingText,
        seed: seed ?? undefined,
        generatedAt: new Date().toISOString(),
        generationTimeMs: generationTime,
        model: result.metadata.model,
      });

      setGenerationProgress('Complete!');
      setThinkingText(result.thinkingText || '');
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationProgress('');
      setThinkingText('');
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        onClick={handleGenerate}
        disabled={!canGenerate}
        title={
          !canGenerate && !isGenerating
            ? 'Add at least one reference image to generate'
            : undefined
        }
      >
        {isGenerating ? '⏳ Generating...' : '🧪 Generate Single Image'}
      </button>

      {generationProgress && (
        <div className={styles.progress}>
          <div className={styles.progressText}>{generationProgress}</div>
        </div>
      )}

      {thinkingText && (
        <div className={styles.thinking}>
          <div className={styles.thinkingLabel}>Thinking:</div>
          <div className={styles.thinkingText}>{thinkingText}</div>
        </div>
      )}
    </div>
  );
};
