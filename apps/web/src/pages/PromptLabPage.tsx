import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useLabStore } from '../store/labStore';
import { Header } from '../components/Layout/Header';
import { ReferenceImageTray } from '../components/PromptLab/ReferenceImageTray';
import { GeneratedImagesCollector } from '../components/PromptLab/GeneratedImagesCollector';
import { PromptEditor } from '../components/PromptLab/PromptEditor';
import { LabSettings } from '../components/PromptLab/LabSettings';
import styles from './PromptLabPage.module.css';

/**
 * Prompt Lab Page
 *
 * Experimental workbench for manual control over image generation inputs.
 * Allows manual camera positioning, prompt editing, and iterative experimentation.
 */
export const PromptLabPage: React.FC = () => {
  const perimeter = useAppStore((s) => s.perimeter);
  const geoContext = useAppStore((s) => s.geoContext);
  const scenarioInputs = useAppStore((s) => s.scenarioInputs);

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={styles.mapSection}>
            <div className={styles.mapPlaceholder}>
              Map Canvas (TODO)
            </div>
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
