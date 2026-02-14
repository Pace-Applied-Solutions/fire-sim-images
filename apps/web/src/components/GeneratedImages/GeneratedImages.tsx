/**
 * Component to display generated images from the generation results.
 */

import React from 'react';
import type { GenerationResult } from '@fire-sim/shared';
import styles from './GeneratedImages.module.css';

interface GeneratedImagesProps {
  result: GenerationResult;
}

export const GeneratedImages: React.FC<GeneratedImagesProps> = ({ result }) => {
  if (result.status === 'pending' || result.status === 'in_progress') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Generating images...</p>
        </div>
      </div>
    );
  }

  if (result.status === 'failed') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Generation Failed</h3>
          <p>{result.error || 'An unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  if (result.images.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No images were generated</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Generated Images</h3>
        <p className={styles.count}>
          {result.images.length} {result.images.length === 1 ? 'image' : 'images'}
        </p>
      </div>

      <div className={styles.grid}>
        {result.images.map((image) => (
          <div key={image.viewPoint} className={styles.imageCard}>
            <div className={styles.imageWrapper}>
              <img
                src={image.url}
                alt={`${image.viewPoint} view`}
                className={styles.image}
                loading="lazy"
              />
            </div>
            <div className={styles.imageInfo}>
              <h4 className={styles.viewpoint}>{formatViewpoint(image.viewPoint)}</h4>
              <p className={styles.metadata}>
                {image.metadata.width} × {image.metadata.height} • {image.metadata.model}
              </p>
            </div>
            <div className={styles.actions}>
              <a
                href={image.url}
                download={`${image.viewPoint}.png`}
                className={styles.downloadButton}
                title="Download image"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>

      {result.completedAt && (
        <div className={styles.footer}>
          <p className={styles.timestamp}>
            Completed at {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
      )}
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
