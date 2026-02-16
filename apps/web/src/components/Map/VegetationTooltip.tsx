/**
 * Vegetation identification tooltip displayed when the user clicks on the map
 * with the NVIS vegetation overlay active.
 *
 * Shows the MVS (Major Vegetation Subgroup) name and fire behaviour characteristics
 * from the NVIS national dataset.
 */
import { useMemo } from 'react';
import { getNvisDescriptor } from '@fire-sim/shared';
import styles from './VegetationTooltip.module.css';

interface VegetationIdentifyResult {
  subgroup: string;
  group?: string;
  lngLat: [number, number];
  point: { x: number; y: number };
}

interface VegetationTooltipProps {
  result: VegetationIdentifyResult;
  loading: boolean;
  onClose: () => void;
}

/**
 * Extract fire behaviour bullet points from the NVIS descriptor string.
 */
function extractFireCharacteristics(descriptor: string): string[] {
  const characteristics: string[] = [];

  // Fuel load / type
  if (/high.*fuel|extreme.*fuel|very high.*fuel/i.test(descriptor)) {
    characteristics.push('High fuel loads');
  } else if (/moderate.*fuel/i.test(descriptor)) {
    characteristics.push('Moderate fuel loads');
  } else if (/low.*fuel|minimal.*fuel/i.test(descriptor)) {
    characteristics.push('Low fuel loads');
  }

  // Fire intensity
  if (/extreme.*intensity|very high.*intensity/i.test(descriptor)) {
    characteristics.push('Extreme fire intensity potential');
  } else if (/high.*intensity/i.test(descriptor)) {
    characteristics.push('High fire intensity potential');
  } else if (/moderate.*intensity/i.test(descriptor)) {
    characteristics.push('Moderate fire intensity');
  }

  // Crown fire
  if (/crown fire/i.test(descriptor)) {
    characteristics.push('Crown fire risk');
  }

  // Spread rate
  if (/rapid.*spread|extreme.*spread|fast/i.test(descriptor)) {
    characteristics.push('Rapid fire spread potential');
  }

  // Surface fire
  if (/surface fire/i.test(descriptor)) {
    characteristics.push('Surface fire dominant');
  }

  // Not fire-prone
  if (/not fire-prone|very low.*risk|rarely burns/i.test(descriptor)) {
    characteristics.push('Low fire risk');
  }

  // Spotting
  if (/spot/i.test(descriptor)) {
    characteristics.push('Spotting potential');
  }

  // If we couldn't extract any specifics, use a generic note
  if (characteristics.length === 0) {
    characteristics.push('Fire behaviour varies with conditions');
  }

  return characteristics;
}

/**
 * Derive a simplified fuel type category from the subgroup name.
 */
function deriveFuelType(subgroup: string): string {
  const lower = subgroup.toLowerCase();
  if (lower.includes('forest')) return 'Forest';
  if (lower.includes('woodland')) return 'Woodland';
  if (lower.includes('grassland') || lower.includes('grass')) return 'Grassland';
  if (lower.includes('heath')) return 'Heath';
  if (lower.includes('rainforest')) return 'Rainforest';
  if (lower.includes('shrubland') || lower.includes('scrub') || lower.includes('mallee'))
    return 'Shrubland';
  if (lower.includes('wetland') || lower.includes('mangrove') || lower.includes('swamp'))
    return 'Wetland';
  if (lower.includes('cleared') || lower.includes('urban')) return 'Cleared/Urban';
  if (lower.includes('alpine')) return 'Alpine';
  return 'Mixed';
}

export const VegetationTooltip = ({ result, loading, onClose }: VegetationTooltipProps) => {
  const descriptor = useMemo(() => getNvisDescriptor(result.subgroup), [result.subgroup]);
  const fireCharacteristics = useMemo(() => extractFireCharacteristics(descriptor), [descriptor]);
  const fuelType = useMemo(() => deriveFuelType(result.subgroup), [result.subgroup]);
  const locationLabel = useMemo(() => {
    const [lng, lat] = result.lngLat;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }, [result.lngLat]);

  return (
    <div className={`${styles.tooltip} ${styles.tooltipFixed}`} role="dialog" aria-label="Vegetation information">
      <div className={styles.header}>
        <span className={styles.headerIcon}>📍</span>
        <span className={styles.headerTitle}>Vegetation Info</span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close vegetation tooltip"
        >
          ×
        </button>
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.loading}>Identifying…</div>
        ) : (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Subgroup</div>
              <div className={styles.value}>{result.subgroup}</div>
            </div>

            {result.group && (
              <div className={styles.section}>
                <div className={styles.label}>Group</div>
                <div className={styles.value}>{result.group}</div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.label}>Location</div>
              <div className={styles.value}>{locationLabel}</div>
            </div>

            <div className={styles.section}>
              <div className={styles.label}>Fire Characteristics</div>
              <ul className={styles.bulletList}>
                {fireCharacteristics.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div className={styles.fuelType}>
              <span className={styles.fuelLabel}>Fuel Type:</span> {fuelType}
            </div>
          </>
        )}
      </div>

      <div className={styles.source}>Source: NVIS (DCCEEW) — CC-BY 4.0</div>
    </div>
  );
};
