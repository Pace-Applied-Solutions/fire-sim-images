import React from 'react';
import { useAppStore } from '../../store/appStore';
import styles from './MobileTabBar.module.css';

export const MobileTabBar: React.FC = () => {
  const { isSidebarOpen, isResultsPanelOpen, setSidebarOpen, setResultsPanelOpen } = useAppStore();

  const handleInputsClick = () => {
    setSidebarOpen(true);
    setResultsPanelOpen(false);
  };

  const handleMapClick = () => {
    setSidebarOpen(false);
    setResultsPanelOpen(false);
  };

  const handleResultsClick = () => {
    setSidebarOpen(false);
    setResultsPanelOpen(true);
  };

  const activeTab = isSidebarOpen ? 'inputs' : isResultsPanelOpen ? 'results' : 'map';

  return (
    <div className={styles.tabBar}>
      <button
        className={`${styles.tab} ${activeTab === 'inputs' ? styles.active : ''}`}
        onClick={handleInputsClick}
        aria-label="Show scenario inputs"
        aria-pressed={activeTab === 'inputs'}
      >
        <span className={styles.icon}>⚙️</span>
        <span className={styles.label}>Inputs</span>
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'map' ? styles.active : ''}`}
        onClick={handleMapClick}
        aria-label="Show map"
        aria-pressed={activeTab === 'map'}
      >
        <span className={styles.icon}>🗺️</span>
        <span className={styles.label}>Map</span>
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'results' ? styles.active : ''}`}
        onClick={handleResultsClick}
        aria-label="Show generated results"
        aria-pressed={activeTab === 'results'}
      >
        <span className={styles.icon}>🖼️</span>
        <span className={styles.label}>Results</span>
      </button>
    </div>
  );
};
