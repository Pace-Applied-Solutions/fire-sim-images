import React from 'react';
import { Layout } from '../components/Layout';
import { MapContainer } from '../components/Map';
import { ScenarioInputPanel } from '../components/ScenarioInputPanel';
import styles from './ScenarioPage.module.css';

export const ScenarioPage: React.FC = () => {
  return (
    <Layout
      sidebar={<ScenarioInputPanel />}
      main={<MapContainer />}
      results={
        <div className={styles.resultsContent}>
          <p className={styles.placeholder}>
            Generated images and videos will appear here in Issue 10.
          </p>
        </div>
      }
    />
  );
};
