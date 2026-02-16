import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import styles from './ResultsPanel.module.css';

interface ResultsPanelProps {
  children: React.ReactNode;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ children }) => {
  const { isResultsPanelOpen, toggleResultsPanel, scenarioState, setResultsPanelOpen } =
    useAppStore();

  useEffect(() => {
    // Open panel when generating (to show progress) or when complete (to show results)
    if (scenarioState === 'generating' || scenarioState === 'complete') {
      setResultsPanelOpen(true);
    }
  }, [scenarioState, setResultsPanelOpen]);

  return (
    <aside className={`${styles.panel} ${isResultsPanelOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        {isResultsPanelOpen && <h2 className={styles.title}>Generated Results</h2>}
        <button
          onClick={toggleResultsPanel}
          className={styles.toggleButton}
          aria-label={isResultsPanelOpen ? 'Close results panel' : 'Open results panel'}
          title={isResultsPanelOpen ? 'Close results' : 'Open results'}
        >
          {isResultsPanelOpen ? '→' : '←'}
        </button>
      </div>
      {isResultsPanelOpen && <div className={styles.content}>{children}</div>}
    </aside>
  );
};
