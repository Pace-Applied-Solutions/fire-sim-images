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
 */
export const LabMapCanvas: React.FC<LabMapCanvasProps> = ({ children }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const addReferenceImage = useLabStore((s) => s.addReferenceImage);
  const captureVegetationScreenshot = useAppStore((s) => s.captureVegetationScreenshot);
  const showVegetationLabels = useLabStore((s) => s.showVegetationLabels);

  /**
   * Capture a clean map screenshot (no UI chrome).
   * Hides all UI overlays before capturing.
   */
  const handleMapCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const mapCanvas = document.querySelector('.mapboxgl-canvas') as HTMLCanvasElement;
      if (!mapCanvas) {
        console.error('Map canvas not found');
        return;
      }

      // Find and hide UI overlays
      const overlaySelectors = [
        '.mapboxgl-ctrl-top-right',
        '.mapboxgl-ctrl-top-left',
        '.mapboxgl-ctrl-bottom-right',
        '.mapboxgl-ctrl-bottom-left',
        '.mapboxgl-control-container',
      ];

      const hiddenElements: HTMLElement[] = [];
      overlaySelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el instanceof HTMLElement && el.style.display !== 'none') {
            hiddenElements.push(el);
            el.style.display = 'none';
          }
        });
      });

      // Small delay to ensure render completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the canvas
      const dataUrl = mapCanvas.toDataURL('image/jpeg', 0.85);

      // Restore hidden elements
      hiddenElements.forEach((el) => {
        el.style.display = '';
      });

      // Add to reference images
      const image: LabReferenceImage = {
        id: crypto.randomUUID(),
        dataUrl,
        label: `Map Screenshot ${new Date().toLocaleTimeString()}`,
        type: 'map_screenshot',
        included: true,
        capturedAt: new Date().toISOString(),
      };
      addReferenceImage(image);
    } catch (err) {
      console.error('Failed to capture map screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [addReferenceImage]);

  /**
   * Capture vegetation overlay screenshot.
   * Uses the existing captureVegetationScreenshot function and optionally adds labels.
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
    } catch (err) {
      console.error('Failed to capture vegetation screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [captureVegetationScreenshot, addReferenceImage, showVegetationLabels]);

  return (
    <div className={styles.container}>
      {children}
      <div className={styles.captureButtons}>
        <button
          className={styles.captureButton}
          onClick={handleMapCapture}
          disabled={isCapturing}
          title="Capture map screenshot"
        >
          {isCapturing ? '⏳' : '📷'} Capture
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
