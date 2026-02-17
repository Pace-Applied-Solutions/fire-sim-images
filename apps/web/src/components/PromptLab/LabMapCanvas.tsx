import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useLabStore } from '../../store/labStore';
import type { LabReferenceImage } from '../../store/labStore';
import { renderVegetationLabels } from '../../utils/vegetationLabelRenderer';
import styles from './LabMapCanvas.module.css';

interface LabMapCanvasProps {
  children?: React.ReactNode;
}

/**
 * Lab Map Canvas
 *
 * Wraps the MapContainer with floating capture buttons.
 * Provides clean screenshot capture (hides UI overlays).
 * Supports the 3-screenshot strategy: perspective + aerial + vegetation.
 */
export const LabMapCanvas: React.FC<LabMapCanvasProps> = ({ children }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const addReferenceImage = useLabStore((s) => s.addReferenceImage);
  const clearReferenceImages = useLabStore((s) => s.clearReferenceImages);
  const captureCurrentView = useAppStore((s) => s.captureCurrentView);
  const captureAerialOverview = useAppStore((s) => s.captureAerialOverview);
  const captureVegetationScreenshot = useAppStore((s) => s.captureVegetationScreenshot);
  const toggleVegetationOverlay = useAppStore((s) => s.toggleVegetationOverlay);
  const showVegetationLabels = useLabStore((s) => s.showVegetationLabels);
  const perimeter = useAppStore((s) => s.perimeter);

  /**
   * Capture a clean map screenshot of the user's current perspective.
   * Uses the registered captureCurrentView function from appStore.
   */
  const handleMapCapture = useCallback(async () => {
    if (!captureCurrentView) {
      console.error('Current view capture function not available');
      return;
    }

    setIsCapturing(true);
    try {
      const dataUrl = await captureCurrentView();
      if (!dataUrl) {
        console.error('Perspective capture returned no data');
        return;
      }

      const image: LabReferenceImage = {
        id: crypto.randomUUID(),
        dataUrl,
        label: `Perspective View ${new Date().toLocaleTimeString()}`,
        type: 'map_screenshot',
        included: true,
        capturedAt: new Date().toISOString(),
      };
      addReferenceImage(image);
    } catch (err) {
      console.error('Failed to capture perspective screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [captureCurrentView, addReferenceImage]);

  /**
   * Capture an aerial overview screenshot (top-down, centered on fire perimeter).
   */
  const handleAerialCapture = useCallback(async () => {
    if (!captureAerialOverview) {
      console.error('Aerial overview capture function not available');
      return;
    }

    setIsCapturing(true);
    try {
      const dataUrl = await captureAerialOverview();
      if (!dataUrl) {
        console.error('Aerial overview capture returned no data');
        return;
      }

      const image: LabReferenceImage = {
        id: crypto.randomUUID(),
        dataUrl,
        label: `Aerial Overview ${new Date().toLocaleTimeString()}`,
        type: 'aerial_overview',
        included: true,
        capturedAt: new Date().toISOString(),
      };
      addReferenceImage(image);
    } catch (err) {
      console.error('Failed to capture aerial overview:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [captureAerialOverview, addReferenceImage]);

  /**
   * Capture vegetation overlay screenshot.
   * Uses the existing captureVegetationScreenshot function and optionally adds labels.
   * Ensures vegetation layer is properly toggled off after capture.
   */
  const handleVegetationCapture = useCallback(async () => {
    if (!captureVegetationScreenshot) {
      console.error('Vegetation capture function not available');
      return;
    }

    setIsCapturing(true);
    try {
      // Call the registered vegetation capture function
      const dataUrl = await captureVegetationScreenshot();

      if (!dataUrl) {
        console.error('Vegetation capture returned no data');
        return;
      }

      // Optionally add labels based on toggle setting
      const labeledDataUrl = await renderVegetationLabels(dataUrl, showVegetationLabels);

      // Add to reference images
      const image: LabReferenceImage = {
        id: crypto.randomUUID(),
        dataUrl: labeledDataUrl,
        label: `Vegetation Overlay ${new Date().toLocaleTimeString()}`,
        type: 'vegetation_overlay',
        included: true,
        capturedAt: new Date().toISOString(),
      };
      addReferenceImage(image);

      // Ensure vegetation layer is turned off after capture
      // Call toggle function if layer is still visible
      // The toggle will read actual layer visibility and toggle it
      if (toggleVegetationOverlay) {
        setTimeout(() => {
          const mapCanvas = document.querySelector('.mapboxgl-canvas') as HTMLCanvasElement;
          if (mapCanvas && (mapCanvas as any).__mapboxgl_map?.getLayer?.('nvis-vegetation-layer')) {
            const mapInstance = (mapCanvas as any).__mapboxgl_map;
            const currentVisibility = mapInstance.getLayoutProperty('nvis-vegetation-layer', 'visibility') === 'visible';
            // Only toggle if layer is still visible (safety check)
            if (currentVisibility) {
              toggleVegetationOverlay();
            }
          }
        }, 500);
      }
    } catch (err) {
      console.error('Failed to capture vegetation screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [captureVegetationScreenshot, addReferenceImage, showVegetationLabels]);

  /**
   * Auto-capture all 3 reference images in sequence:
   *   1. Perspective view (user's current camera angle)
   *   2. Aerial overview (top-down, centered on fire perimeter)
   *   3. Vegetation overlay (NVIS classification map)
   * Clears existing reference images before capturing.
   */
  const handleCaptureAll = useCallback(async () => {
    if (!captureCurrentView) {
      console.error('Current view capture function not available');
      return;
    }

    setIsCapturing(true);
    try {
      // Clear existing reference images so we get a clean set
      clearReferenceImages();

      // 1. Perspective view
      const perspectiveDataUrl = await captureCurrentView();
      if (perspectiveDataUrl) {
        addReferenceImage({
          id: crypto.randomUUID(),
          dataUrl: perspectiveDataUrl,
          label: 'Perspective View',
          type: 'map_screenshot',
          included: true,
          capturedAt: new Date().toISOString(),
        });
      }

      // 2. Aerial overview (only if perimeter exists)
      if (captureAerialOverview && perimeter) {
        const aerialDataUrl = await captureAerialOverview();
        if (aerialDataUrl) {
          addReferenceImage({
            id: crypto.randomUUID(),
            dataUrl: aerialDataUrl,
            label: 'Aerial Overview',
            type: 'aerial_overview',
            included: true,
            capturedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Vegetation overlay
      if (captureVegetationScreenshot) {
        const vegDataUrl = await captureVegetationScreenshot();
        if (vegDataUrl) {
          const labeledDataUrl = await renderVegetationLabels(vegDataUrl, showVegetationLabels);
          addReferenceImage({
            id: crypto.randomUUID(),
            dataUrl: labeledDataUrl,
            label: 'Vegetation Overlay',
            type: 'vegetation_overlay',
            included: true,
            capturedAt: new Date().toISOString(),
          });

          // Ensure vegetation layer is turned off after capture
          if (toggleVegetationOverlay) {
            setTimeout(() => {
              const mapCanvas = document.querySelector('.mapboxgl-canvas') as HTMLCanvasElement;
              if (mapCanvas && (mapCanvas as any).__mapboxgl_map?.getLayer?.('nvis-vegetation-layer')) {
                const mapInstance = (mapCanvas as any).__mapboxgl_map;
                const currentVisibility = mapInstance.getLayoutProperty('nvis-vegetation-layer', 'visibility') === 'visible';
                if (currentVisibility) {
                  toggleVegetationOverlay();
                }
              }
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-capture reference images:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [captureCurrentView, captureAerialOverview, captureVegetationScreenshot, perimeter, addReferenceImage, clearReferenceImages, showVegetationLabels, toggleVegetationOverlay]);

  return (
    <div className={styles.container}>
      {children}
      <div className={styles.captureButtons}>
        <button
          className={`${styles.captureButton} ${styles.captureAllButton}`}
          onClick={handleCaptureAll}
          disabled={isCapturing}
          title="Auto-capture all 3 reference images (perspective + aerial + vegetation)"
        >
          {isCapturing ? '⏳' : '📸'} Capture All
        </button>
        <button
          className={styles.captureButton}
          onClick={handleMapCapture}
          disabled={isCapturing}
          title="Capture perspective view"
        >
          {isCapturing ? '⏳' : '📷'} Perspective
        </button>
        <button
          className={styles.captureButton}
          onClick={handleAerialCapture}
          disabled={isCapturing || !perimeter}
          title="Capture aerial overview (requires drawn perimeter)"
        >
          {isCapturing ? '⏳' : '🛰'} Aerial
        </button>
        <button
          className={styles.captureButton}
          onClick={handleVegetationCapture}
          disabled={isCapturing}
          title="Capture vegetation overlay"
        >
          {isCapturing ? '⏳' : '🌿'} Vegetation
        </button>
      </div>
    </div>
  );
};
