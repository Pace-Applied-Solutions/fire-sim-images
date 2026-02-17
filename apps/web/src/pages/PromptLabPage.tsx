import React from 'react';
import { Header } from '../components/Layout/Header';
import { MapContainer } from '../components/Map/MapContainer';
import { LabMapCanvas } from '../components/PromptLab/LabMapCanvas';
import { ReferenceImageTray } from '../components/PromptLab/ReferenceImageTray';
import { GeneratedImagesCollector } from '../components/PromptLab/GeneratedImagesCollector';
import { PromptEditor } from '../components/PromptLab/PromptEditor';
import { LabSettings } from '../components/PromptLab/LabSettings';
import { ScenarioInputPanel } from '../components/ScenarioInputPanel';
import styles from './PromptLabPage.module.css';

/**
 * Prompt Lab Page
 *
 * Experimental workbench for manual control over image generation inputs.
 * Allows manual camera positioning, prompt editing, and iterative experimentation.
 */
export const PromptLabPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={styles.mapSection}>
            <LabMapCanvas>
              <MapContainer />
            </LabMapCanvas>
          </div>

          <div className={styles.referenceSection}>
            <div className={styles.sectionHeader}>Reference Images</div>
            <ReferenceImageTray />
          </div>
          <div className={styles.generatedSection}>
            <div className={styles.sectionHeader}>Generated Images</div>
            <GeneratedImagesCollector />
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.scenarioConfigHeader}>
            <span className={styles.scenarioConfigTitle}>Scenario Configuration</span>
            <span className={styles.scenarioConfigSubtitle}>Matches main scenario controls</span>
          </div>
          <ScenarioInputPanel />
          <LabSettings />
          <div className={styles.promptEditorContainer}>
            <PromptEditor />
          </div>
        </div>
      </div>
    </div>
  );
};
