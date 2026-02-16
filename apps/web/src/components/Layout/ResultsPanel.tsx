import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import styles from './ResultsPanel.module.css';

interface ResultsPanelProps {
  children: React.ReactNode;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ children }) => {
  const { isResultsPanelOpen, toggleResultsPanel, scenarioState, setResultsPanelOpen } =
    useAppStore();

  const { generationResult } = useAppStore();

  useEffect(() => {
    // Open panel when AI generation starts, producing results, or when complete
    if (scenarioState === 'complete') {
      setResultsPanelOpen(true);
    } else if (scenarioState === 'generating') {
      // Open as soon as generation starts so user sees progress/thinking
      setResultsPanelOpen(true);
    }
  }, [scenarioState, generationResult, setResultsPanelOpen]);

  return (
    <aside className={`${styles.panel} ${isResultsPanelOpen ? styles.open : styles.closed}`}>
      {isResultsPanelOpen ? (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>Generated Results</h2>
            <button
              onClick={toggleResultsPanel}
              className={styles.toggleButton}
              aria-label="Close results panel"
              title="Close results"
            >
              ✕
            </button>
          </div>
          <div className={styles.content}>{children}</div>
        </>
      ) : (
        <button
          onClick={toggleResultsPanel}
          className={styles.edgeTab}
          aria-label="Open results panel"
          title="Generated Results"
        >
          <span className={styles.edgeTabIcon}>🖼</span>
          <span className={styles.edgeTabLabel}>Results</span>
        </button>
      )}
    </aside>
  );
};
