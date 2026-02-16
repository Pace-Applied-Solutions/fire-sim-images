import React from 'react';
import { useAppStore } from '../../store/appStore';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const { isSidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed}`}>
        {isSidebarOpen ? (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Scenario Inputs</h2>
              <button
                onClick={toggleSidebar}
                className={styles.toggleButton}
                aria-label="Close sidebar"
                title="Close sidebar"
              >
                ✕
              </button>
            </div>
            <div className={styles.content}>{children}</div>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            className={styles.edgeTab}
            aria-label="Open sidebar"
            title="Scenario Inputs"
          >
            <span className={styles.edgeTabIcon}>☰</span>
            <span className={styles.edgeTabLabel}>Inputs</span>
          </button>
        )}
      </aside>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div className={styles.backdrop} onClick={toggleSidebar} aria-hidden="true" />
      )}
    </>
  );
};
