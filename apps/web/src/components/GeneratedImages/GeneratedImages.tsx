/**
 * Component to display generated images from the generation results.
 */

import React, { useState } from 'react';
import type { GenerationResult } from '@fire-sim/shared';
import { ImageComparison } from '../ImageComparison';
import styles from './GeneratedImages.module.css';

interface GeneratedImagesProps {
  result: GenerationResult;
  onRegenerateImage?: (viewpoint: string) => void;
}

export const GeneratedImages: React.FC<GeneratedImagesProps> = ({ 
  result,
  onRegenerateImage,
}) => {
  const [showComparison, setShowComparison] = useState(false);

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

  // Show comparison view if requested
  if (showComparison) {
    return (
      <div className={styles.container}>
        <div className={styles.comparisonHeader}>
          <button
            className={styles.backButton}
            onClick={() => setShowComparison(false)}
          >
            ← Back to Grid
          </button>
        </div>
        <ImageComparison
          images={result.images}
          anchorImage={result.anchorImage}
          seed={result.seed}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Generated Images</h3>
          <p className={styles.count}>
            {result.images.length} {result.images.length === 1 ? 'image' : 'images'}
          </p>
          {result.seed !== undefined && (
            <span className={styles.seed} title="Consistency seed used for all images">
              Seed: {result.seed}
            </span>
          )}
        </div>
        <button
          className={styles.compareButton}
          onClick={() => setShowComparison(true)}
        >
          Compare Views
        </button>
      </div>

      <div className={styles.grid}>
        {result.anchorImage && (
          <div className={`${styles.imageCard} ${styles.anchorCard}`}>
            <div className={styles.imageWrapper}>
              <img
                src={result.anchorImage.url}
                alt={`${result.anchorImage.viewPoint} view`}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.anchorBadge}>Anchor</div>
            </div>
            <div className={styles.imageInfo}>
              <h4 className={styles.viewpoint}>{formatViewpoint(result.anchorImage.viewPoint)}</h4>
              <p className={styles.metadata}>
                {result.anchorImage.metadata.width} × {result.anchorImage.metadata.height} • {result.anchorImage.metadata.model}
              </p>
            </div>
            <div className={styles.actions}>
              <a
                href={result.anchorImage.url}
                download={`${result.anchorImage.viewPoint}.png`}
                className={styles.downloadButton}
                title="Download image"
              >
                Download
              </a>
            </div>
          </div>
        )}
        {result.images.map((image) => (
          <div key={image.viewPoint} className={styles.imageCard}>
            <div className={styles.imageWrapper}>
              <img
                src={image.url}
                alt={`${image.viewPoint} view`}
                className={styles.image}
                loading="lazy"
              />
              {image.metadata.usedReferenceImage && (
                <div className={styles.referenceBadge} title="Generated using anchor reference">
                  🔗
                </div>
              )}
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
              {onRegenerateImage && (
                <button
                  className={styles.regenerateButton}
                  onClick={() => onRegenerateImage(image.viewPoint)}
                  title="Regenerate this view"
                >
                  🔄
                </button>
              )}
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
