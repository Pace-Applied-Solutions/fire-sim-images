/**
 * Full-screen image lightbox component for viewing generated images.
 * Supports navigation, zoom, pan, and download.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { GeneratedImage } from '@fire-sim/shared';
import styles from './ImageLightbox.module.css';

interface ImageLightboxProps {
  images: GeneratedImage[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [images.length]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    },
    [zoomIn, zoomOut]
  );

  // Download handler
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = `${currentImage.viewPoint}_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose} title="Close (Esc)">
          ✕
        </button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              className={`${styles.navButton} ${styles.navButtonPrev}`}
              onClick={goToPrevious}
              title="Previous (←)"
            >
              ‹
            </button>
            <button
              className={`${styles.navButton} ${styles.navButtonNext}`}
              onClick={goToNext}
              title="Next (→)"
            >
              ›
            </button>
          </>
        )}

        {/* Zoom controls */}
        <div className={styles.zoomControls}>
          <button onClick={zoomOut} disabled={zoom <= 1} title="Zoom out (-)">
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} disabled={zoom >= 3} title="Zoom in (+)">
            +
          </button>
          <button onClick={resetZoom} disabled={zoom === 1} title="Reset (0)">
            Reset
          </button>
        </div>

        {/* Image container */}
        <div
          className={styles.imageContainer}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <img
            src={currentImage.url}
            alt={`${currentImage.viewPoint} view`}
            className={styles.image}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            }}
            draggable={false}
          />
        </div>

        {/* Image info */}
        <div className={styles.infoBar}>
          <div className={styles.imageInfo}>
            <h3>{formatViewpoint(currentImage.viewPoint)}</h3>
            <p>
              {currentImage.metadata.width} × {currentImage.metadata.height} •{' '}
              {currentImage.metadata.model}
            </p>
          </div>
          <div className={styles.actions}>
            <span className={styles.counter}>
              {currentIndex + 1} / {images.length}
            </span>
            <button className={styles.downloadButton} onClick={handleDownload}>
              Download
            </button>
          </div>
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
