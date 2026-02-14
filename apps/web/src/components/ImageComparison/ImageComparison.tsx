/**
 * Component for comparing generated images across multiple viewpoints.
 * Supports grid, side-by-side, and carousel viewing modes.
 */

import React, { useState } from 'react';
import type { GeneratedImage } from '@fire-sim/shared';
import styles from './ImageComparison.module.css';

interface ImageComparisonProps {
  images: GeneratedImage[];
  anchorImage?: GeneratedImage;
  seed?: number;
}

type ViewMode = 'grid' | 'sideBySide' | 'carousel';

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  images,
  anchorImage,
  seed,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedImages, setSelectedImages] = useState<[number, number]>([0, 1]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No images to compare</p>
        </div>
      </div>
    );
  }

  const handleImageSelect = (index: number) => {
    // Only handle selection in side-by-side mode
    if (viewMode !== 'sideBySide') {
      return;
    }

    // Prevent deselecting currently selected images
    if (selectedImages[0] === index || selectedImages[1] === index) {
      return;
    }

    // Replace second selected image
    setSelectedImages([selectedImages[0], index]);
  };

  const nextCarouselImage = () => {
    setCarouselIndex((prev) => (prev + 1) % images.length);
  };

  const prevCarouselImage = () => {
    setCarouselIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Image Comparison</h3>
          {seed !== undefined && (
            <span className={styles.seed} title="Consistency seed used for all images">
              Seed: {seed}
            </span>
          )}
        </div>
        <div className={styles.viewModeSelector}>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <span className={styles.icon}>⊞</span> Grid
          </button>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'sideBySide' ? styles.active : ''}`}
            onClick={() => setViewMode('sideBySide')}
            title="Side-by-side comparison"
          >
            <span className={styles.icon}>⊟</span> Compare
          </button>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'carousel' ? styles.active : ''}`}
            onClick={() => setViewMode('carousel')}
            title="Carousel view"
          >
            <span className={styles.icon}>◄►</span> Carousel
          </button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className={styles.gridView}>
          {anchorImage && (
            <div className={`${styles.imageCard} ${styles.anchorCard}`}>
              <div className={styles.imageWrapper}>
                <img
                  src={anchorImage.url}
                  alt={`${anchorImage.viewPoint} view`}
                  className={styles.image}
                  loading="lazy"
                />
                <div className={styles.anchorBadge}>Anchor</div>
              </div>
              <div className={styles.imageInfo}>
                <h4 className={styles.viewpoint}>{formatViewpoint(anchorImage.viewPoint)}</h4>
                <p className={styles.metadata}>
                  {anchorImage.metadata.width} × {anchorImage.metadata.height}
                </p>
              </div>
            </div>
          )}
          {images.map((image, index) => (
            <div
              key={image.viewPoint}
              className={styles.imageCard}
              onClick={() => handleImageSelect(index)}
            >
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
                  {image.metadata.width} × {image.metadata.height}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'sideBySide' && (
        <div className={styles.sideBySideView}>
          <div className={styles.imageSelector}>
            <label>Select images to compare:</label>
            <select
              value={selectedImages[0]}
              onChange={(e) => setSelectedImages([parseInt(e.target.value), selectedImages[1]])}
            >
              {images.map((image, index) => (
                <option key={image.viewPoint} value={index}>
                  {formatViewpoint(image.viewPoint)}
                </option>
              ))}
            </select>
            <span className={styles.vs}>vs</span>
            <select
              value={selectedImages[1]}
              onChange={(e) => setSelectedImages([selectedImages[0], parseInt(e.target.value)])}
            >
              {images.map((image, index) => (
                <option key={image.viewPoint} value={index}>
                  {formatViewpoint(image.viewPoint)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.comparisonContainer}>
            <div className={styles.comparisonImage}>
              <img
                src={images[selectedImages[0]].url}
                alt={`${images[selectedImages[0]].viewPoint} view`}
                className={styles.image}
              />
              <div className={styles.comparisonLabel}>
                {formatViewpoint(images[selectedImages[0]].viewPoint)}
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.comparisonImage}>
              <img
                src={images[selectedImages[1]].url}
                alt={`${images[selectedImages[1]].viewPoint} view`}
                className={styles.image}
              />
              <div className={styles.comparisonLabel}>
                {formatViewpoint(images[selectedImages[1]].viewPoint)}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'carousel' && (
        <div className={styles.carouselView}>
          <button className={styles.carouselButton} onClick={prevCarouselImage} title="Previous">
            ‹
          </button>
          <div className={styles.carouselImage}>
            <img
              src={images[carouselIndex].url}
              alt={`${images[carouselIndex].viewPoint} view`}
              className={styles.image}
            />
            <div className={styles.carouselInfo}>
              <h3 className={styles.carouselViewpoint}>
                {formatViewpoint(images[carouselIndex].viewPoint)}
              </h3>
              <p className={styles.carouselMetadata}>
                {images[carouselIndex].metadata.width} × {images[carouselIndex].metadata.height}
                {images[carouselIndex].metadata.usedReferenceImage && (
                  <span className={styles.referenceIndicator}> • Uses anchor reference</span>
                )}
              </p>
              <p className={styles.carouselProgress}>
                {carouselIndex + 1} / {images.length}
              </p>
            </div>
          </div>
          <button className={styles.carouselButton} onClick={nextCarouselImage} title="Next">
            ›
          </button>
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
