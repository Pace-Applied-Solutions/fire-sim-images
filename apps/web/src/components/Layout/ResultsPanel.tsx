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

  // Track if panel has been opened for current generation to prevent re-opening
  const hasOpenedRef = React.useRef(false);

  // Reset flag when scenario state changes to idle, drawing, or when a new generation starts
  useEffect(() => {
    if (scenarioState === 'idle' || scenarioState === 'drawing' || scenarioState === 'generating') {
      hasOpenedRef.current = false;
    }
  }, [scenarioState]);

  useEffect(() => {
    // Only open panel once per generation cycle to prevent refresh on every thinking update
    if (hasOpenedRef.current) return;

    // Open panel when thinking text arrives, images are generated, or generation completes
    if (scenarioState === 'complete') {
      setResultsPanelOpen(true);
      hasOpenedRef.current = true;
    } else if (scenarioState === 'generating') {
      // Open as soon as a generation result exists so the thinking panel is visible immediately
      if (generationResult) {
        setResultsPanelOpen(true);
        hasOpenedRef.current = true;
      }
    }
  }, [scenarioState, generationResult, setResultsPanelOpen]);

  const handleHeaderClick = () => {
    if (window.innerWidth <= 768) {
      toggleResultsPanel();
    }
  };

  return (
    <aside className={`${styles.panel} ${isResultsPanelOpen ? styles.open : styles.closed}`}>
      {isResultsPanelOpen ? (
        <>
          <div className={styles.header} onClick={handleHeaderClick}>
            <h2 className={styles.title}>Generated Results</h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleResultsPanel();
              }}
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
