/**
 * Modal component for displaying AI generation prompts.
 * Shows the full prompt text used to generate a specific image.
 */

import React, { useEffect } from 'react';
import styles from './PromptModal.module.css';

interface PromptModalProps {
  prompt: string;
  viewpoint: string;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ prompt, viewpoint, onClose }) => {
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Handle click outside modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Generation Prompt: {formatViewpoint(viewpoint)}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={styles.content}>
          <pre className={styles.promptText}>{prompt}</pre>
        </div>
      </div>
    </div>
  );
};

/**
 * Format viewpoint name for display.
 */
function formatViewpoint(viewpoint: string): string {
  return viewpoint
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
