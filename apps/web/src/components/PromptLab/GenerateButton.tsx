import React from 'react';
import { useLabStore } from '../../store/labStore';
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

  const includedImages = referenceImages.filter((img) => img.included);
  const canGenerate = includedImages.length > 0 && !isGenerating;

  const handleGenerate = async () => {
    // TODO: Wire to labApi
    console.log('Generate clicked - API integration pending');
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
