import React, { useState } from 'react';
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
  const [scenarioConfigOpen, setScenarioConfigOpen] = useState(true);

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

          <div className={styles.scenarioConfigSection}>
            <button
              className={styles.sectionToggle}
              onClick={() => setScenarioConfigOpen(!scenarioConfigOpen)}
              aria-expanded={scenarioConfigOpen}
            >
              <span className={styles.sectionHeader}>Scenario Configuration</span>
              <span className={scenarioConfigOpen ? styles.chevronUp : styles.chevronDown}>
                ▼
              </span>
            </button>
            {scenarioConfigOpen && (
              <div className={styles.scenarioConfigContent}>
                <ScenarioInputPanel />
              </div>
            )}
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
          <LabSettings />
          <div className={styles.promptEditorContainer}>
            <PromptEditor />
          </div>
        </div>
      </div>
    </div>
  );
};
