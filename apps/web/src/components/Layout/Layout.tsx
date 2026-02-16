import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainArea } from './MainArea';
import { ResultsPanel } from './ResultsPanel';
import { MobileTabBar } from './MobileTabBar';
import styles from './Layout.module.css';

interface LayoutProps {
  sidebar?: React.ReactNode;
  main: React.ReactNode;
  results?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, main, results }) => {
  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.body}>
        {sidebar && <Sidebar>{sidebar}</Sidebar>}
        <MainArea>{main}</MainArea>
        {results && <ResultsPanel>{results}</ResultsPanel>}
      </div>
      <MobileTabBar />
    </div>
  );
};
