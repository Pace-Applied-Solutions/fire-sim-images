import React from 'react';
import { Layout } from '../components/Layout';
import styles from './SettingsPage.module.css';

export const SettingsPage: React.FC = () => {
  return (
    <Layout
      main={
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Settings</h1>
            <p className={styles.description}>
              Configuration and admin controls will be available here.
            </p>
            <div className={styles.placeholder}>
              <span className={styles.icon}>⚙️</span>
              <p>Settings functionality coming soon</p>
            </div>
          </div>
        </div>
      }
    />
  );
};
