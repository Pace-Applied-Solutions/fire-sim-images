import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore, type ScenarioState } from '../../store/appStore';
import styles from './Header.module.css';

const STATE_LABELS: Record<ScenarioState, string> = {
  idle: 'Ready',
  drawing: 'Drawing perimeter...',
  configuring: 'Configuring scenario...',
  generating: 'Generating images...',
  complete: 'Generation complete',
  error: 'Error',
};

const STATE_COLORS: Record<ScenarioState, string> = {
  idle: 'var(--color-status-idle)',
  drawing: 'var(--color-status-loading)',
  configuring: 'var(--color-status-loading)',
  generating: 'var(--color-status-generating)',
  complete: 'var(--color-status-ready)',
  error: 'var(--color-status-error)',
};

export const Header: React.FC = () => {
  const scenarioState = useAppStore((state) => state.scenarioState);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandIcon}>🔥</span>
          <span className={styles.brandText}>Fire Sim</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            Scenario
          </Link>
          <Link to="/gallery" className={styles.navLink}>
            Gallery
          </Link>
          <Link to="/settings" className={styles.navLink}>
            Settings
          </Link>
        </nav>
      </div>
      <div className={styles.right}>
        <div className={styles.statusIndicator}>
          <div
            className={styles.statusDot}
            style={{ backgroundColor: STATE_COLORS[scenarioState] }}
            aria-hidden="true"
          />
          <span className={styles.statusText}>{STATE_LABELS[scenarioState]}</span>
        </div>
      </div>
    </header>
  );
};
