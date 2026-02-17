import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useLabStore } from '../../store/labStore';
import type { LabReferenceImage } from '../../store/labStore';
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

  /**
   * Capture a clean map screenshot (no UI chrome).
   * This is a simplified version - we'll enhance it to hide UI overlays.
   */
  const handleMapCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      // For now, we'll use a simple canvas capture
      // TODO: Implement full clean capture sequence with UI hiding
      const mapCanvas = document.querySelector('.mapboxgl-canvas') as HTMLCanvasElement;
      if (!mapCanvas) {
        console.error('Map canvas not found');
        return;
      }

      // Capture the canvas
      const dataUrl = mapCanvas.toDataURL('image/jpeg', 0.85);

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
   * Uses the existing captureVegetationScreenshot function.
   */
  const handleVegetationCapture = useCallback(async () => {
    if (!captureVegetationScreenshot) {
      console.error('Vegetation capture function not available');
      return;
    }

    setIsCapturing(true);
    try {
      // This function is registered by MapContainer
      // It will handle the capture automatically
      // For the lab, we need to adapt it
      console.log('Vegetation capture - integration pending');
      // TODO: Wire to actual vegetation capture
    } catch (err) {
      console.error('Failed to capture vegetation screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [captureVegetationScreenshot]);

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
