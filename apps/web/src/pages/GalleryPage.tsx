import React from 'react';
import { Layout } from '../components/Layout';
import styles from './GalleryPage.module.css';

export const GalleryPage: React.FC = () => {
  return (
    <Layout
      main={
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Gallery</h1>
            <p className={styles.description}>
              Past scenarios and generated outputs will be displayed here.
            </p>
            <div className={styles.placeholder}>
              <span className={styles.icon}>🖼️</span>
              <p>Gallery functionality coming soon</p>
            </div>
          </div>
        </div>
      }
    />
  );
};
