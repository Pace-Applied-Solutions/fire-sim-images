import React from 'react';
import styles from './MainArea.module.css';

interface MainAreaProps {
  children: React.ReactNode;
}

export const MainArea: React.FC<MainAreaProps> = ({ children }) => {
  return <main className={styles.main}>{children}</main>;
};
