import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ScenarioCard } from '../components/Gallery';
import { useAppStore } from '../store/appStore';
import type { ScenarioSummary, ScenarioMetadata } from '@fire-sim/shared';
import styles from './GalleryPage.module.css';

export const GalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { setPerimeter, setScenarioInputs, setGeoContext, setGenerationResult, setScenarioState } =
    useAppStore();

  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'location'>('date');

  // Fetch scenarios from API
  const fetchScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scenarios');
      if (!response.ok) {
        throw new Error('Failed to fetch scenarios');
      }

      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Handle scenario selection - reload into main view
  const handleScenarioClick = useCallback(
    async (scenario: ScenarioSummary) => {
      try {
        // Fetch full scenario metadata
        const response = await fetch(`/api/scenarios/${scenario.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch scenario details');
        }

        const metadata: ScenarioMetadata = await response.json();

        // Populate app state with scenario data
        setPerimeter(metadata.perimeter);
        setScenarioInputs(metadata.inputs);
        setGeoContext(metadata.geoContext);
        setGenerationResult(metadata.result);
        setScenarioState('complete');

        // Navigate to main scenario page
        navigate('/');
      } catch (err) {
        alert('Failed to load scenario: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    },
    [
      navigate,
      setPerimeter,
      setScenarioInputs,
      setGeoContext,
      setGenerationResult,
      setScenarioState,
    ]
  );

  // Handle scenario deletion
  const handleScenarioDelete = useCallback(
    async (scenarioId: string) => {
      try {
        const response = await fetch(`/api/scenarios/${scenarioId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete scenario');
        }

        // Refresh the list
        fetchScenarios();
      } catch (err) {
        alert(
          'Failed to delete scenario: ' + (err instanceof Error ? err.message : 'Unknown error')
        );
      }
    },
    [fetchScenarios]
  );

  // Sort scenarios
  const sortedScenarios = [...scenarios].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      // Sort by location (latitude)
      return a.location.centroid[1] - b.location.centroid[1];
    }
  });

  return (
    <Layout
      main={
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Scenario Gallery</h1>
              <p className={styles.description}>View and manage past generated scenarios</p>
            </div>

            <div className={styles.controls}>
              <label className={styles.sortLabel}>
                Sort by:
                <select
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'location')}
                >
                  <option value="date">Most Recent</option>
                  <option value="location">Location</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.content}>
            {isLoading && (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading scenarios...</p>
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <p>{error}</p>
                <button onClick={fetchScenarios} className={styles.retryButton}>
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && scenarios.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🖼️</span>
                <h2>No scenarios yet</h2>
                <p>
                  Generated scenarios will appear here. Create your first scenario to get started.
                </p>
              </div>
            )}

            {!isLoading && !error && scenarios.length > 0 && (
              <div className={styles.grid}>
                {sortedScenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    onClick={handleScenarioClick}
                    onDelete={handleScenarioDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};
