import React from 'react';
import { Link } from 'react-router-dom';
import { useHealthCheck, type HealthStatus } from '../../hooks/useHealthCheck';
import styles from './Header.module.css';

/**
 * Map health status to color for the status indicator.
 * Shows API health with three states:
 * - green (healthy): API fully operational
 * - yellow (degraded): API working but some services have issues
 * - red (unhealthy): API unavailable or critical issues
 */
const HEALTH_COLORS: Record<HealthStatus, string> = {
  healthy: 'var(--color-status-ready)', // Green
  degraded: 'var(--color-status-loading)', // Yellow/Amber
  unhealthy: 'var(--color-status-error)', // Red
  checking: 'var(--color-status-idle)', // Grey while checking
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: 'API Healthy',
  degraded: 'API Degraded',
  unhealthy: 'API Down',
  checking: 'Checking...',
};

export const Header: React.FC = () => {
  const { status: healthStatus, message: healthMessage } = useHealthCheck();

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
        <div
          className={styles.statusIndicator}
          title={healthMessage ? `${HEALTH_LABELS[healthStatus]}: ${healthMessage}` : HEALTH_LABELS[healthStatus]}
        >
          <div
            className={styles.statusDot}
            style={{ backgroundColor: HEALTH_COLORS[healthStatus] }}
            aria-hidden="true"
          />
          <span className={styles.statusText}>{HEALTH_LABELS[healthStatus]}</span>
        </div>
      </div>
    </header>
  );
};
