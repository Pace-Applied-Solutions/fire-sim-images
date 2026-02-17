import React from 'react';
import { useLabStore } from '../../store/labStore';
import type { LabGeneratedImage, LabReferenceImage } from '../../store/labStore';
import styles from './GeneratedImagesCollector.module.css';

/**
 * Generated Images Collector
 *
 * Grid of images generated in this lab session.
 * Supports expand, download, view prompt, and use as reference.
 */
export const GeneratedImagesCollector: React.FC = () => {
  const generatedImages = useLabStore((s) => s.generatedImages);
  const removeGeneratedImage = useLabStore((s) => s.removeGeneratedImage);
  const addReferenceImage = useLabStore((s) => s.addReferenceImage);

  const handleUseAsReference = (image: LabGeneratedImage) => {
    const refImage: LabReferenceImage = {
      id: crypto.randomUUID(),
      dataUrl: image.dataUrl,
      label: `Generated ${new Date(image.generatedAt).toLocaleTimeString()}`,
      type: 'generated_output',
      included: true,
      capturedAt: image.generatedAt,
    };
    addReferenceImage(refImage);
  };

  const handleDownload = (image: LabGeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = `fire-sim-lab-${new Date(image.generatedAt).getTime()}.png`;
    link.click();
  };

  if (generatedImages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🎨</div>
        <div className={styles.emptyText}>No images generated yet</div>
        <div className={styles.emptyHint}>Use the Generate button to create your first image</div>
      </div>
    );
  }

  return (
    <div className={styles.collector}>
      {generatedImages.map((image) => (
        <div key={image.id} className={styles.imageCard}>
          <div className={styles.imageWrapper}>
            <img src={image.dataUrl} alt="Generated" className={styles.thumbnail} />
            <div className={styles.overlay}>
              <button
                className={styles.actionButton}
                onClick={() => handleUseAsReference(image)}
                title="Use as reference"
              >
                ↻
              </button>
              <button
                className={styles.actionButton}
                onClick={() => handleDownload(image)}
                title="Download"
              >
                ↓
              </button>
              <button
                className={styles.actionButton}
                onClick={() => removeGeneratedImage(image.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
          <div className={styles.imageInfo}>
            <div className={styles.timestamp}>
              {new Date(image.generatedAt).toLocaleTimeString()}
            </div>
            <div className={styles.metadata}>
              <span className={styles.metaItem}>{image.generationTimeMs}ms</span>
              <span className={styles.metaItem}>{image.model}</span>
            </div>
            {image.thinkingText && (
              <div className={styles.thinking} title={image.thinkingText}>
                {truncateText(image.thinkingText, 50)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
