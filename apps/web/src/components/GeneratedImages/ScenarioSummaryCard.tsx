/**
 * Scenario Summary Card component
 * Displays summary information about a generated scenario.
 */

import React from 'react';
import type { ScenarioInputs, GeoContext, FirePerimeter } from '@fire-sim/shared';
import styles from './ScenarioSummaryCard.module.css';

interface ScenarioSummaryCardProps {
  perimeter: FirePerimeter;
  inputs: ScenarioInputs;
  geoContext: GeoContext;
  imageCount: number;
  timestamp: string;
  promptVersion?: string;
}

export const ScenarioSummaryCard: React.FC<ScenarioSummaryCardProps> = ({
  perimeter,
  inputs,
  geoContext,
  imageCount,
  timestamp,
  promptVersion,
}) => {
  // Calculate centroid
  const coordinates = perimeter.geometry.coordinates[0];
  const centroid = calculateCentroid(coordinates);

  // Calculate area in hectares
  const areaHectares = calculateArea(perimeter);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Scenario Summary</h3>

      <div className={styles.grid}>
        {/* Location */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Location</h4>
          <div className={styles.field}>
            <span className={styles.label}>Centroid:</span>
            <span className={styles.value}>
              {centroid[1].toFixed(4)}°S, {centroid[0].toFixed(4)}°E
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Area:</span>
            <span className={styles.value}>{areaHectares.toFixed(1)} ha</span>
          </div>
        </div>

        {/* Conditions */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Conditions</h4>
          <div className={styles.field}>
            <span className={styles.label}>Temperature:</span>
            <span className={styles.value}>{inputs.temperature}°C</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Wind:</span>
            <span className={styles.value}>
              {inputs.windSpeed} km/h {inputs.windDirection}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Humidity:</span>
            <span className={styles.value}>{inputs.humidity}%</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Intensity:</span>
            <span className={styles.value}>
              {formatIntensity(inputs.intensity)}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Fire Danger:</span>
            <span className={styles.value}>
              {formatFireDanger(inputs.fireDangerRating)}
            </span>
          </div>
        </div>

        {/* Vegetation */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Vegetation</h4>
          <div className={styles.field}>
            <span className={styles.label}>Type:</span>
            <span className={styles.value}>{geoContext.vegetationType}</span>
          </div>
          {geoContext.vegetationSubtype && (
            <div className={styles.field}>
              <span className={styles.label}>Subtype:</span>
              <span className={styles.value}>{geoContext.vegetationSubtype}</span>
            </div>
          )}
          {geoContext.dominantSpecies && geoContext.dominantSpecies.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Species:</span>
              <span className={styles.value}>
                {geoContext.dominantSpecies.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Generation Info */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Generation</h4>
          <div className={styles.field}>
            <span className={styles.label}>Generated:</span>
            <span className={styles.value}>
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Images:</span>
            <span className={styles.value}>{imageCount}</span>
          </div>
          {promptVersion && (
            <div className={styles.field}>
              <span className={styles.label}>Prompt Version:</span>
              <span className={styles.value}>{promptVersion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(coordinates: number[][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  const count = coordinates.length;

  for (const [lng, lat] of coordinates) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / count, sumLat / count];
}

/**
 * Calculate approximate area in hectares using shoelace formula
 */
function calculateArea(perimeter: FirePerimeter): number {
  const coords = perimeter.geometry.coordinates[0];
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  // Convert to hectares (approximate, assumes flat earth)
  // 1 degree ≈ 111 km at equator, so 1 deg² ≈ 12321 km² = 1,232,100 ha
  const areaInDegrees = Math.abs(area) / 2;
  const areaInHectares = areaInDegrees * 1232100;

  return areaInHectares;
}

/**
 * Format intensity for display
 */
function formatIntensity(intensity: string): string {
  return intensity.charAt(0).toUpperCase() + intensity.slice(1).replace(/([A-Z])/g, ' $1');
}

/**
 * Format fire danger rating for display
 */
function formatFireDanger(rating: string): string {
  return rating.charAt(0).toUpperCase() + rating.slice(1);
}
