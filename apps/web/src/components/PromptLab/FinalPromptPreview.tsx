import React, { useMemo } from 'react';
import { useLabStore } from '../../store/labStore';
import type { PromptSectionKey } from '../../store/labStore';
import styles from './FinalPromptPreview.module.css';

/**
 * Final Prompt Preview
 *
 * Read-only view of the fully compiled prompt (all sections concatenated).
 * Shows word/character count and supports copy-to-clipboard.
 */
export const FinalPromptPreview: React.FC = () => {
  const promptSections = useLabStore((s) => s.promptSections);

  const finalPrompt = useMemo(() => {
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

    const parts = sectionOrder
      .map((key) => {
        const section = promptSections[key];
        const text = section.userText || section.autoText;
        return text.trim();
      })
      .filter(Boolean);

    return parts.join('\n\n');
  }, [promptSections]);

  const wordCount = useMemo(() => {
    return finalPrompt.split(/\s+/).filter(Boolean).length;
  }, [finalPrompt]);

  const charCount = finalPrompt.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={styles.preview}>
      <div className={styles.header}>
        <div className={styles.title}>Final Prompt</div>
        <div className={styles.stats}>
          <span className={styles.stat}>{wordCount} words</span>
          <span className={styles.stat}>{charCount} chars</span>
          <button className={styles.copyButton} onClick={handleCopy} title="Copy to clipboard">
            📋 Copy
          </button>
        </div>
      </div>
      <textarea
        className={styles.textarea}
        value={finalPrompt}
        readOnly
        placeholder="Configure scenario and prompt sections will appear here..."
        rows={8}
      />
    </div>
  );
};
