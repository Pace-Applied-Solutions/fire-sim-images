import React from 'react';
import { useLabStore } from '../../store/labStore';
import { ViewPoint } from '@fire-sim/shared';
import styles from './LabSettings.module.css';

/**
 * Lab Settings
 *
 * Controls for seed, image size, and viewpoint selection.
 */
export const LabSettings: React.FC = () => {
  const seed = useLabStore((s) => s.seed);
  const imageSize = useLabStore((s) => s.imageSize);
  const selectedViewpoint = useLabStore((s) => s.selectedViewpoint);
  const showVegetationLabels = useLabStore((s) => s.showVegetationLabels);
  const setSeed = useLabStore((s) => s.setSeed);
  const setImageSize = useLabStore((s) => s.setImageSize);
  const setSelectedViewpoint = useLabStore((s) => s.setSelectedViewpoint);
  const setShowVegetationLabels = useLabStore((s) => s.setShowVegetationLabels);

  const viewpoints: ViewPoint[] = [
    'aerial',
    'helicopter_north',
    'helicopter_south',
    'helicopter_east',
    'helicopter_west',
    'helicopter_above',
    'ground_north',
    'ground_south',
    'ground_east',
    'ground_west',
    'ground_above',
    'ridge',
  ];

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className={styles.settings}>
      <div className={styles.settingRow}>
        <label className={styles.label}>Seed</label>
        <div className={styles.seedControl}>
          <input
            type="number"
            value={seed ?? ''}
            onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
            placeholder="Random"
            className={styles.seedInput}
          />
          <button className={styles.randomButton} onClick={handleRandomizeSeed} title="Randomize">
            🎲
          </button>
        </div>
      </div>

      <div className={styles.settingRow}>
        <label className={styles.label}>Image Size</label>
        <select
          value={imageSize}
          onChange={(e) =>
            setImageSize(e.target.value as '1024x1024' | '1792x1024' | '1024x1792')
          }
          className={styles.select}
        >
          <option value="1024x1024">1024×1024 (Square)</option>
          <option value="1792x1024">1792×1024 (Landscape)</option>
          <option value="1024x1792">1024×1792 (Portrait)</option>
        </select>
      </div>

      <div className={styles.settingRow}>
        <label className={styles.label}>Viewpoint</label>
        <select
          value={selectedViewpoint}
          onChange={(e) => setSelectedViewpoint(e.target.value as ViewPoint)}
          className={styles.select}
        >
          {viewpoints.map((vp) => (
            <option key={vp} value={vp}>
              {formatViewpoint(vp)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.settingRow}>
        <label className={styles.label}>
          <input
            type="checkbox"
            checked={showVegetationLabels}
            onChange={(e) => setShowVegetationLabels(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxLabel}>Show Vegetation Labels</span>
        </label>
      </div>
    </div>
  );
};

function formatViewpoint(vp: ViewPoint): string {
  return vp
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
