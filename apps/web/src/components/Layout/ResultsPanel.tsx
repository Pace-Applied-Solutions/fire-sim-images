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
    // Open panel when thinking text arrives, images are generated, or generation completes
    if (scenarioState === 'complete') {
      setResultsPanelOpen(true);
    } else if (scenarioState === 'generating') {
      // Only open when Gemini thinking stream has started OR images are available
      // This prevents opening before the model begins processing
      if (generationResult?.thinkingText || (generationResult?.images && generationResult.images.length > 0)) {
        setResultsPanelOpen(true);
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
