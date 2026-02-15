/**
 * Scenario Card component for the gallery
 * Displays a summary card for a past scenario.
 */

import React from 'react';
import type { ScenarioSummary } from '@fire-sim/shared';
import styles from './ScenarioCard.module.css';

interface ScenarioCardProps {
  scenario: ScenarioSummary;
  onClick: (scenario: ScenarioSummary) => void;
  onDelete: (scenarioId: string) => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onClick, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) {
      onDelete(scenario.id);
    }
  };

  return (
    <div className={styles.card} onClick={() => onClick(scenario)}>
      <div className={styles.thumbnail}>
        <img src={scenario.thumbnailUrl} alt={`Scenario ${scenario.id}`} />
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.date}>
            {new Date(scenario.timestamp).toLocaleDateString('en-AU', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <button className={styles.deleteButton} onClick={handleDelete} title="Delete scenario">
            🗑️
          </button>
        </div>

        <div className={styles.location}>
          <span className={styles.locationIcon}>📍</span>
          {scenario.location.placeName || (
            <>
              {scenario.location.centroid[1].toFixed(3)}°S,{' '}
              {scenario.location.centroid[0].toFixed(3)}°E
            </>
          )}
        </div>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Vegetation:</span>
            <span className={styles.detailValue}>{scenario.vegetation}</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Fire Danger:</span>
            <span className={`${styles.detailValue} ${styles.dangerBadge}`}>
              {formatFireDanger(scenario.conditions.fireDangerRating)}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Conditions:</span>
            <span className={styles.detailValue}>
              {scenario.conditions.temperature}°C • {scenario.conditions.windSpeed} km/h{' '}
              {scenario.conditions.windDirection} • {scenario.conditions.humidity}%
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Images:</span>
            <span className={styles.detailValue}>{scenario.imageCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Format fire danger rating for display
 */
function formatFireDanger(rating: string): string {
  return rating
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
