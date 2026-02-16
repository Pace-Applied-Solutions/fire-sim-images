import React from 'react';
import { Layout } from '../components/Layout';
import { MapContainer } from '../components/Map';
import { ScenarioInputPanel } from '../components/ScenarioInputPanel';
import { GeneratedImages } from '../components/GeneratedImages';
import { useAppStore } from '../store/appStore';
import styles from './ScenarioPage.module.css';

export const ScenarioPage: React.FC = () => {
  const {
    generationResult,
    generationProgress,
    scenarioState,
    perimeter,
    scenarioInputs,
    geoContext,
  } = useAppStore();

  const renderResults = () => {
    if (generationResult) {
      return (
        <GeneratedImages
          result={generationResult}
          perimeter={perimeter || undefined}
          inputs={scenarioInputs || undefined}
          geoContext={geoContext || undefined}
        />
      );
    }

    return (
      <div className={styles.resultsContent}>
        <p className={styles.placeholder}>
          Generated images and videos will appear here after generation completes.
        </p>
      </div>
    );
  };

  return (
    <Layout sidebar={<ScenarioInputPanel />} main={
      <>
        <MapContainer />
        {scenarioState === 'generating' && generationProgress && (
          <div className={styles.progressOverlay}>
            <div className={styles.progressCard}>
              <div className={styles.spinner} />
              <p className={styles.progressText}>{generationProgress}</p>
            </div>
          </div>
        )}
      </>
    } results={renderResults()} />
  );
};
