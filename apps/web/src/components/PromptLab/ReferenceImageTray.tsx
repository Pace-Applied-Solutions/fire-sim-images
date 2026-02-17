import React, { useRef, useState } from 'react';
import { useLabStore } from '../../store/labStore';
import type { LabReferenceImage } from '../../store/labStore';
import styles from './ReferenceImageTray.module.css';

/**
 * Reference Image Tray
 *
 * Horizontal scrollable strip of reference images.
 * Supports capture, upload, drag-to-reorder, and include/exclude.
 */
export const ReferenceImageTray: React.FC = () => {
  const referenceImages = useLabStore((s) => s.referenceImages);
  const addReferenceImage = useLabStore((s) => s.addReferenceImage);
  const removeReferenceImage = useLabStore((s) => s.removeReferenceImage);
  const toggleReferenceImage = useLabStore((s) => s.toggleReferenceImage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const image: LabReferenceImage = {
          id: crypto.randomUUID(),
          dataUrl,
          label: file.name,
          type: 'uploaded',
          included: true,
          capturedAt: new Date().toISOString(),
        };
        addReferenceImage(image);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  return (
    <div
      className={`${styles.tray} ${isDraggingOver ? styles.dragOver : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {referenceImages.map((image) => (
        <div key={image.id} className={styles.imageCard}>
          <div className={styles.imageWrapper}>
            <img src={image.dataUrl} alt={image.label} className={styles.thumbnail} />
            <div className={styles.overlay}>
              <button
                className={styles.deleteButton}
                onClick={() => removeReferenceImage(image.id)}
                title="Remove image"
              >
                ×
              </button>
            </div>
          </div>
          <div className={styles.imageInfo}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={image.included}
                onChange={() => toggleReferenceImage(image.id)}
                className={styles.checkbox}
              />
              <span className={styles.label}>{image.label}</span>
            </label>
            <div className={styles.imageType}>{getTypeLabel(image.type)}</div>
          </div>
        </div>
      ))}

      <div className={styles.addCard} onClick={() => fileInputRef.current?.click()}>
        <div className={styles.addIcon}>+</div>
        <div className={styles.addText}>Add Image</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className={styles.hiddenInput}
      />
    </div>
  );
};

function getTypeLabel(type: LabReferenceImage['type']): string {
  switch (type) {
    case 'map_screenshot':
      return 'Map Screenshot';
    case 'vegetation_overlay':
      return 'Vegetation Overlay';
    case 'uploaded':
      return 'Uploaded';
    case 'generated_output':
      return 'Previous Output';
  }
}
