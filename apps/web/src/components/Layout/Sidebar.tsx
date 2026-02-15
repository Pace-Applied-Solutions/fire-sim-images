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
        <div className={styles.header}>
          <h2 className={styles.title}>Scenario Inputs</h2>
          <button
            onClick={toggleSidebar}
            className={styles.toggleButton}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? '←' : '→'}
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </aside>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div className={styles.backdrop} onClick={toggleSidebar} aria-hidden="true" />
      )}
    </>
  );
};
