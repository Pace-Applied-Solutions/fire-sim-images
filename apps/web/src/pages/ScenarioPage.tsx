import React from 'react';
import { Layout } from '../components/Layout';
import { MapContainer } from '../components/Map';
import { ScenarioInputPanel } from '../components/ScenarioInputPanel';
import { GeneratedImages } from '../components/GeneratedImages';
import { useAppStore } from '../store/appStore';
import styles from './ScenarioPage.module.css';

export const ScenarioPage: React.FC = () => {
  const { generationResult, generationProgress, scenarioState } = useAppStore();

  const renderResults = () => {
    if (scenarioState === 'generating' && generationProgress) {
      return (
        <div className={styles.generatingState}>
          <div className={styles.spinner} />
          <p className={styles.progressText}>{generationProgress}</p>
        </div>
      );
    }

    if (generationResult) {
      return <GeneratedImages result={generationResult} />;
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
    <Layout
      sidebar={<ScenarioInputPanel />}
      main={<MapContainer />}
      results={renderResults()}
    />
  );
};
