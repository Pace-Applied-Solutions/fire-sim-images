import React from 'react';
import { useLabStore } from '../../store/labStore';
import type { PromptSectionKey } from '../../store/labStore';
import styles from './PromptSection.module.css';

interface PromptSectionProps {
  sectionKey: PromptSectionKey;
}

/**
 * Prompt Section
 *
 * Single collapsible accordion section showing auto-generated text
 * and an editable textarea for user overrides.
 */
export const PromptSection: React.FC<PromptSectionProps> = ({ sectionKey }) => {
  const section = useLabStore((s) => s.promptSections[sectionKey]);
  const updateSectionText = useLabStore((s) => s.updateSectionText);
  const resetSection = useLabStore((s) => s.resetSection);
  const toggleSectionCollapsed = useLabStore((s) => s.toggleSectionCollapsed);

  const effectiveText = section.userText || section.autoText;
  const isModified = section.isModified;

  return (
    <div className={styles.section}>
      <div className={styles.header} onClick={() => toggleSectionCollapsed(sectionKey)}>
        <div className={styles.headerLeft}>
          <span className={styles.collapseIcon}>{section.isCollapsed ? '▶' : '▼'}</span>
          <span className={styles.label}>{section.label}</span>
          {isModified && <span className={styles.modifiedDot}>●</span>}
        </div>
        {isModified && (
          <button
            className={styles.resetButton}
            onClick={(e) => {
              e.stopPropagation();
              resetSection(sectionKey);
            }}
            title="Reset to auto-generated text"
          >
            Reset
          </button>
        )}
      </div>

      {!section.isCollapsed && (
        <div className={styles.body}>
          {section.autoText && (
            <div className={styles.autoText}>
              <div className={styles.autoLabel}>Auto-generated:</div>
              <div className={styles.autoContent}>{section.autoText}</div>
            </div>
          )}
          <textarea
            className={styles.textarea}
            value={effectiveText}
            onChange={(e) => updateSectionText(sectionKey, e.target.value)}
            placeholder={section.autoText || 'Enter custom text...'}
            rows={4}
          />
        </div>
      )}
    </div>
  );
};
