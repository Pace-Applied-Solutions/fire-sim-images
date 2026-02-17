/**
 * Modal component for zooming and viewing images at full size.
 * Displays a single image in a lightbox overlay with click-to-close functionality.
 */

import React, { useEffect } from 'react';
import styles from './ImageZoomModal.module.css';

interface ImageZoomModalProps {
  imageUrl: string;
  label?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, label, onClose }) => {
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

  // Handle click outside modal (on overlay)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <img src={imageUrl} alt={label || 'Zoomed image'} className={styles.image} />
        {label && <div className={styles.label}>{label}</div>}
      </div>
    </div>
  );
};
