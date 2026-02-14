import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import styles from './ResultsPanel.module.css';

interface ResultsPanelProps {
  children: React.ReactNode;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ children }) => {
  const {
    isResultsPanelOpen,
    toggleResultsPanel,
    scenarioState,
    setResultsPanelOpen,
  } = useAppStore();

  useEffect(() => {
    setResultsPanelOpen(scenarioState === 'complete');
  }, [scenarioState, setResultsPanelOpen]);

  return (
    <aside className={`${styles.panel} ${isResultsPanelOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Generated Results</h2>
        <button
          onClick={toggleResultsPanel}
          className={styles.toggleButton}
          aria-label={isResultsPanelOpen ? 'Close results panel' : 'Open results panel'}
        >
          {isResultsPanelOpen ? '→' : '←'}
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </aside>
  );
};
