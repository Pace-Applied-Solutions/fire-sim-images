import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useLabStore } from '../../store/labStore';
import { generatePrompts } from '@fire-sim/shared';
import { PromptSection } from './PromptSection';
import { FinalPromptPreview } from './FinalPromptPreview';
import { GenerateButton } from './GenerateButton';
import type { PromptSectionKey } from '../../store/labStore';
import styles from './PromptEditor.module.css';

/**
 * Prompt Editor
 *
 * Main editor component with system instruction, all 12 prompt sections,
 * and final prompt preview.
 */
export const PromptEditor: React.FC = () => {
  const perimeter = useAppStore((s) => s.perimeter);
  const geoContext = useAppStore((s) => s.geoContext);
  const scenarioInputs = useAppStore((s) => s.scenarioInputs);

  const systemInstruction = useLabStore((s) => s.systemInstruction);
  const systemInstructionModified = useLabStore((s) => s.systemInstructionModified);
  const updateSystemInstruction = useLabStore((s) => s.updateSystemInstruction);
  const resetSystemInstruction = useLabStore((s) => s.resetSystemInstruction);
  const updateAutoText = useLabStore((s) => s.updateAutoText);
  const selectedViewpoint = useLabStore((s) => s.selectedViewpoint);

  // Auto-populate prompt sections when scenario data changes
  useEffect(() => {
    if (!perimeter || !geoContext || !scenarioInputs) return;

    try {
      const prompts = generatePrompts({
        perimeter,
        geoContext,
        scenarioInputs,
        viewpoint: selectedViewpoint,
      });

      // Update auto-text for each section
      const sectionMap: Record<PromptSectionKey, string> = {
        style: prompts.style,
        behaviorPrinciples: prompts.behaviorPrinciples,
        referenceImagery: prompts.referenceImagery,
        locality: prompts.locality,
        terrain: prompts.terrain,
        features: prompts.features,
        vegetation: prompts.vegetation,
        fireGeometry: prompts.fireGeometry,
        fireBehavior: prompts.fireBehavior,
        weather: prompts.weather,
        perspective: prompts.perspective,
        safety: prompts.safety,
      };

      Object.entries(sectionMap).forEach(([key, text]) => {
        updateAutoText(key as PromptSectionKey, text);
      });
    } catch (err) {
      console.error('Failed to generate prompts:', err);
    }
  }, [perimeter, geoContext, scenarioInputs, selectedViewpoint, updateAutoText]);

  const sectionOrder: PromptSectionKey[] = [
    'style',
    'behaviorPrinciples',
    'referenceImagery',
    'locality',
    'terrain',
    'features',
    'vegetation',
    'fireGeometry',
    'fireBehavior',
    'weather',
    'perspective',
    'safety',
  ];

  return (
    <div className={styles.editor}>
      <div className={styles.scrollContainer}>
        {/* System Instruction */}
        <div className={styles.systemSection}>
          <div className={styles.systemHeader}>
            <span className={styles.systemTitle}>System Instruction</span>
            {systemInstructionModified && (
              <>
                <span className={styles.modifiedBadge}>Modified</span>
                <button className={styles.resetButton} onClick={resetSystemInstruction}>
                  Reset
                </button>
              </>
            )}
          </div>
          <textarea
            className={styles.systemTextarea}
            value={systemInstruction}
            onChange={(e) => updateSystemInstruction(e.target.value)}
            rows={6}
          />
        </div>

        {/* Prompt Sections */}
        <div className={styles.sections}>
          <div className={styles.sectionsTitle}>Prompt Sections</div>
          {sectionOrder.map((key) => (
            <PromptSection key={key} sectionKey={key} />
          ))}
        </div>

        {/* Final Prompt Preview */}
        <FinalPromptPreview />

        {/* Generate Button */}
        <GenerateButton />
      </div>
    </div>
  );
};
