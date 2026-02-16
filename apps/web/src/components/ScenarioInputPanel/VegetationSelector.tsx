import React from 'react';
import { VEGETATION_TYPES } from '@fire-sim/shared';
import type { GeoContext } from '@fire-sim/shared';
import styles from './VegetationSelector.module.css';

interface VegetationSelectorProps {
  geoContext: GeoContext | null;
  onVegetationChange: (vegetationType: string | null) => void;
}

export const VegetationSelector: React.FC<VegetationSelectorProps> = ({
  geoContext,
  onVegetationChange,
}) => {
  const autoDetected = geoContext?.vegetationType;
  const manuallySet = geoContext?.manualVegetationType;
  const isManual = geoContext?.isVegetationManuallySet ?? false;
  const currentValue = manuallySet || autoDetected || '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      // User selected "Auto-detected" - clear manual override
      onVegetationChange(null);
    } else {
      // User selected a specific vegetation type
      onVegetationChange(value);
    }
  };

  const confidenceLabel =
    geoContext?.confidence === 'high'
      ? 'High confidence'
      : geoContext?.confidence === 'medium'
        ? 'Medium confidence'
        : geoContext?.confidence === 'low'
          ? 'Low confidence'
          : '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label htmlFor="vegetation-type" className={styles.label}>
          Vegetation Type
        </label>
        {isManual && <span className={styles.manualBadge}>Manual Override</span>}
      </div>

      <select
        id="vegetation-type"
        value={currentValue}
        onChange={handleChange}
        className={`${styles.select} ${isManual ? styles.selectManual : ''}`}
      >
        {!isManual && autoDetected && (
          <option value="">Auto-detected: {autoDetected}</option>
        )}
        {VEGETATION_TYPES.map((vegType) => (
          <option key={vegType} value={vegType}>
            {vegType}
          </option>
        ))}
      </select>

      <div className={styles.info}>
        {!isManual && autoDetected && (
          <span className={styles.autoInfo}>
            Auto-detected from {geoContext?.dataSource || 'NVIS'} ({confidenceLabel})
          </span>
        )}
        {isManual && (
          <span className={styles.manualInfo}>
            Using manual selection (was: {autoDetected || 'unknown'})
          </span>
        )}
      </div>

      <p className={styles.hint}>
        Select a vegetation type to override automatic detection. This affects fire behavior
        calculations (flame height and rate of spread).
      </p>
    </div>
  );
};
