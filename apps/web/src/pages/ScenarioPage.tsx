import React from 'react';
import { Layout } from '../components/Layout';
import { DemoControls } from '../components/DemoControls';
import styles from './ScenarioPage.module.css';

export const ScenarioPage: React.FC = () => {
  return (
    <Layout
      sidebar={
        <div className={styles.sidebarContent}>
          <DemoControls />
        </div>
      }
      main={
        <div className={styles.mapPlaceholder}>
          <div className={styles.mapContent}>
            <span className={styles.mapIcon}>🗺️</span>
            <h2 className={styles.mapTitle}>Map Component</h2>
            <p className={styles.mapDescription}>
              3D map with drawing tools will be integrated here in Issue 4.
            </p>
          </div>
        </div>
      }
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
