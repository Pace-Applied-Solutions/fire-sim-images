/**
 * Component to display generated images from the generation results.
 */

import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { GenerationResult, ScenarioInputs, GeoContext, FirePerimeter } from '@fire-sim/shared';
import { ImageLightbox } from './ImageLightbox';
import { ScenarioSummaryCard } from './ScenarioSummaryCard';
import { ImageComparison } from '../ImageComparison';
import styles from './GeneratedImages.module.css';

interface GeneratedImagesProps {
  result: GenerationResult;
  perimeter?: FirePerimeter;
  inputs?: ScenarioInputs;
  geoContext?: GeoContext;
  promptVersion?: string;
  totalImages?: number;
  onRegenerateImage?: (viewpoint: string) => void;
}

export const GeneratedImages: React.FC<GeneratedImagesProps> = ({
  result,
  perimeter,
  inputs,
  geoContext,
  promptVersion,
  totalImages = 9,
  onRegenerateImage,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Download all images as ZIP
  const handleDownloadAll = useCallback(async () => {
    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();

      // Download all images and add to zip
      const downloadPromises = result.images.map(async (image) => {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const filename = `${image.viewPoint}.png`;
        zip.file(filename, blob);
      });

      await Promise.all(downloadPromises);

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download ZIP
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      link.download = `scenario_${result.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to create ZIP', error);
      alert('Failed to download all images. Please try again.');
    } finally {
      setIsDownloadingZip(false);
    }
  }, [result]);

  // Open lightbox
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  if (result.status === 'pending' || result.status === 'in_progress') {
    const remainingCount = Math.max(0, totalImages - result.images.length);
    return (
      <div className={styles.container}>
        {/* Scenario Summary Card */}
        {perimeter && inputs && geoContext && (
          <ScenarioSummaryCard
            perimeter={perimeter}
            inputs={inputs}
            geoContext={geoContext}
            imageCount={result.images.length}
            timestamp={result.createdAt}
            promptVersion={promptVersion}
          />
        )}

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>Generating Images</h3>
            <p className={styles.count}>
              {result.images.length}/{totalImages} complete
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          {result.images.map((image, index) => (
            <div key={image.viewPoint} className={styles.imageCard}>
              <div
                className={styles.imageWrapper}
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(index);
                  }
                }}
              >
                <img
                  src={image.url}
                  alt={`${image.viewPoint} view`}
                  className={styles.image}
                />
                <div className={styles.imageOverlay}>
                  <span className={styles.viewIcon}>🔍</span>
                </div>
              </div>
              <div className={styles.imageInfo}>
                <h4 className={styles.viewpoint}>{formatViewpoint(image.viewPoint)}</h4>
                <p className={styles.metadata}>
                  {image.metadata.width} × {image.metadata.height} • {image.metadata.model}
                </p>
              </div>
            </div>
          ))}
          {/* Placeholder cards for images still generating */}
          {Array.from({ length: remainingCount }).map((_, i) => (
            <div key={`placeholder-${i}`} className={`${styles.imageCard} ${styles.placeholderCard}`}>
              <div className={styles.placeholderWrapper}>
                <div className={styles.spinner} />
                <p className={styles.placeholderText}>Generating...</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <ImageLightbox
            images={result.images}
            initialIndex={lightboxIndex}
            onClose={closeLightbox}
          />
        )}
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
          <button className={styles.backButton} onClick={() => setShowComparison(false)}>
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
      {/* Scenario Summary Card */}
      {perimeter && inputs && geoContext && (
        <ScenarioSummaryCard
          perimeter={perimeter}
          inputs={inputs}
          geoContext={geoContext}
          imageCount={result.images.length}
          timestamp={result.createdAt}
          promptVersion={promptVersion}
        />
      )}

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
        <div className={styles.headerActions}>
          <button className={styles.compareButton} onClick={() => setShowComparison(true)}>
            Compare Views
          </button>
          <button
            className={styles.downloadAllButton}
            onClick={handleDownloadAll}
            disabled={isDownloadingZip}
          >
            {isDownloadingZip ? 'Creating ZIP...' : 'Download All'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {result.anchorImage && (
          <div className={`${styles.imageCard} ${styles.anchorCard}`}>
            <div className={styles.imageWrapper}>
              <img
                src={result.anchorImage.url}
                alt={`${result.anchorImage.viewPoint} view (anchor)`}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.anchorBadge}>⚓ Anchor</div>
            </div>
            <div className={styles.imageInfo}>
              <h4 className={styles.viewpoint}>{formatViewpoint(result.anchorImage.viewPoint)}</h4>
              <p className={styles.metadata}>
                {result.anchorImage.metadata.width} × {result.anchorImage.metadata.height} •{' '}
                {result.anchorImage.metadata.model}
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
        {result.images.map((image, index) => (
          <div key={image.viewPoint} className={styles.imageCard}>
            <div
              className={styles.imageWrapper}
              onClick={() => openLightbox(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(index);
                }
              }}
            >
              <img
                src={image.url}
                alt={`${image.viewPoint} view`}
                className={styles.image}
              />
              <div className={styles.imageOverlay}>
                <span className={styles.viewIcon}>🔍</span>
              </div>
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
                  Regenerate
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

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={result.images}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
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
