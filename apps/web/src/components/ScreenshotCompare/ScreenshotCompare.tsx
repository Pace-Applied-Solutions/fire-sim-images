/**
 * Side-by-side comparison of map screenshots and generated images,
 * with the prompt displayed below each pair.
 */

import React, { useState } from 'react';
import type { GeneratedImage } from '@fire-sim/shared';
import styles from './ScreenshotCompare.module.css';

interface ScreenshotCompareProps {
  images: GeneratedImage[];
  mapScreenshots: Record<string, string>;
  onClose: () => void;
}

export const ScreenshotCompare: React.FC<ScreenshotCompareProps> = ({
  images,
  mapScreenshots,
  onClose,
}) => {
  // Only include images that have a matching screenshot
  const paired = images.filter((img) => mapScreenshots[img.viewPoint]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (paired.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <h3 className={styles.title}>Screenshot vs Generated</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <p className={styles.empty}>No matching map screenshots found for comparison.</p>
      </div>
    );
  }

  const current = paired[activeIndex];
  const screenshotUrl = mapScreenshots[current.viewPoint];

  return (
    <div className={styles.container}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <h3 className={styles.title}>Screenshot vs Generated</h3>
        <button className={styles.closeButton} onClick={onClose} title="Back to grid">
          ✕
        </button>
      </div>

      {/* Viewpoint tabs */}
      <div className={styles.tabs}>
        {paired.map((img, idx) => (
          <button
            key={img.viewPoint}
            className={`${styles.tab} ${idx === activeIndex ? styles.tabActive : ''}`}
            onClick={() => setActiveIndex(idx)}
          >
            {formatViewpoint(img.viewPoint)}
          </button>
        ))}
      </div>

      {/* Side-by-side images */}
      <div className={styles.comparison}>
        <div className={styles.pane}>
          <div className={styles.paneLabel}>Map Screenshot</div>
          <img
            src={screenshotUrl}
            alt={`Map screenshot — ${current.viewPoint}`}
            className={styles.paneImage}
          />
        </div>
        <div className={styles.divider} />
        <div className={styles.pane}>
          <div className={styles.paneLabel}>AI Generated</div>
          <img
            src={current.url}
            alt={`Generated — ${current.viewPoint}`}
            className={styles.paneImage}
          />
        </div>
      </div>

      {/* Prompt used */}
      <details className={styles.promptSection} open>
        <summary className={styles.promptSummary}>Prompt</summary>
        <pre className={styles.promptText}>{current.metadata.prompt}</pre>
      </details>

      {/* Navigation */}
      {paired.length > 1 && (
        <div className={styles.nav}>
          <button
            className={styles.navButton}
            onClick={() => setActiveIndex((activeIndex - 1 + paired.length) % paired.length)}
          >
            ← Previous
          </button>
          <span className={styles.navCounter}>
            {activeIndex + 1} / {paired.length}
          </span>
          <button
            className={styles.navButton}
            onClick={() => setActiveIndex((activeIndex + 1) % paired.length)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

function formatViewpoint(viewpoint: string): string {
  return viewpoint
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
