import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHealthCheck } from '../../hooks/useHealthCheck';
import styles from './Header.module.css';

/**
 * Map individual service health status to color.
 * - green: healthy service
 * - yellow: degraded service
 * - red: unhealthy service
 * - grey: unknown/checking status
 */
const SERVICE_STATUS_COLORS: Record<string, string> = {
  healthy: 'var(--color-status-ready)', // Green
  degraded: 'var(--color-status-loading)', // Yellow/Amber
  unhealthy: 'var(--color-status-error)', // Red
};

export const Header: React.FC = () => {
  const { status: healthStatus, checks } = useHealthCheck();
  const [showServiceDetails, setShowServiceDetails] = useState(false);

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
          onMouseEnter={() => setShowServiceDetails(true)}
          onMouseLeave={() => setShowServiceDetails(false)}
          title={healthStatus === 'healthy' ? 'All services healthy' : 'Click to see details'}
        >
          {/* Service dots */}
          <div className={styles.serviceDots}>
            {checks && checks.length > 0 ? (
              checks.map((check) => (
                <div
                  key={check.service}
                  className={styles.serviceDot}
                  style={{
                    backgroundColor: SERVICE_STATUS_COLORS[check.status] || 'var(--color-status-idle)',
                  }}
                  title={`${check.service}: ${check.status}`}
                  aria-label={`${check.service} status: ${check.status}`}
                />
              ))
            ) : (
              <div
                className={styles.serviceDot}
                style={{ backgroundColor: 'var(--color-status-idle)' }}
                title="Checking..."
              />
            )}
          </div>

          {/* Detailed popup on hover */}
          {showServiceDetails && checks && checks.length > 0 && (
            <div className={styles.healthDetailsPopup}>
              <div className={styles.healthDetailsHeader}>
                API Status: <strong>{healthStatus.toUpperCase()}</strong>
              </div>
              <div className={styles.healthServicesList}>
                {checks.map((check) => (
                  <div key={check.service} className={styles.healthServiceItem}>
                    <div
                      className={styles.healthServiceDot}
                      style={{
                        backgroundColor: SERVICE_STATUS_COLORS[check.status] || 'var(--color-status-idle)',
                      }}
                    />
                    <div className={styles.healthServiceInfo}>
                      <div className={styles.healthServiceName}>{check.service}</div>
                      <div className={styles.healthServiceStatus}>
                        {check.status}
                        {check.message && ` — ${check.message}`}
                      </div>
                      {check.latencyMs !== undefined && (
                        <div className={styles.healthServiceLatency}>
                          {check.latencyMs}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
