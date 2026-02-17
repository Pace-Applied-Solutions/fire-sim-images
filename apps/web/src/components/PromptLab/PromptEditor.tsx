import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useLabStore } from '../../store/labStore';
import { DEFAULT_PROMPT_TEMPLATE, generatePrompts } from '@fire-sim/shared';
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
      // Generate prompts using the default template
      const request = {
        perimeter,
        geoContext,
        inputs: scenarioInputs,
        requestedViews: [selectedViewpoint],
      };

      const promptSet = generatePrompts(request);

      // Find the prompt for the selected viewpoint
      const prompt = promptSet.prompts.find((p) => p.viewpoint === selectedViewpoint);
      if (!prompt) {
        console.error('No prompt found for viewpoint:', selectedViewpoint);
        return;
      }

      // Parse the generated prompt text to extract sections
      // The prompt is structured with double newlines between sections
      const fullPrompt = prompt.promptText;
      const template = DEFAULT_PROMPT_TEMPLATE;

      // Update auto-text for static sections
      updateAutoText('style', template.sections.style);
      updateAutoText('behaviorPrinciples', template.sections.behaviorPrinciples);
      updateAutoText('safety', template.sections.safety);

      // For dynamic sections, parse them from the generated prompt
      // We'll extract each section by matching against known patterns
      // This is a simplified approach - the sections are in order in the template
      const sections = fullPrompt.split('\n\n').filter((s) => s.trim());

      // Map sections to their keys based on order in template
      // The order is: style, behaviorPrinciples, referenceImagery, locality, terrain,
      // features, vegetation, fireGeometry, fireBehavior, weather, perspective, safety

      if (sections.length >= 12) {
        updateAutoText('referenceImagery', sections[2]);
        updateAutoText('locality', sections[3]);
        updateAutoText('terrain', sections[4]);
        updateAutoText('features', sections[5]);
        updateAutoText('vegetation', sections[6]);
        updateAutoText('fireGeometry', sections[7]);
        updateAutoText('fireBehavior', sections[8]);
        updateAutoText('weather', sections[9]);
        updateAutoText('perspective', sections[10]);
      } else {
        // Fallback: generate sections individually
        // This won't be as accurate but ensures we have content
        console.warn('Unexpected prompt structure, using fallback section parsing');
        updateAutoText('referenceImagery', 'Reference imagery section (auto-generated)');
        updateAutoText('locality', geoContext.locality || 'Location data pending');
        updateAutoText('terrain', geoContext.slope ? `Terrain with ${geoContext.slope.mean.toFixed(1)}° average slope` : 'Terrain data');
        updateAutoText('features', 'Features in the area');
        updateAutoText('vegetation', geoContext.vegetationType || 'Vegetation data pending');
        updateAutoText('fireGeometry', 'Fire geometry from perimeter');
        updateAutoText('fireBehavior', `Intensity: ${scenarioInputs.intensity}, Stage: ${scenarioInputs.fireStage}`);
        updateAutoText('weather', `${scenarioInputs.temperature}°C, ${scenarioInputs.humidity}% humidity, Wind: ${scenarioInputs.windSpeed} km/h ${scenarioInputs.windDirection}`);
        updateAutoText('perspective', `Viewpoint: ${selectedViewpoint}`);
      }
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
