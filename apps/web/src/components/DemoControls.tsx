import React from 'react';
import { useAppStore } from '../store/appStore';
import { useToastStore } from '../store/toastStore';
import styles from './DemoControls.module.css';

export const DemoControls: React.FC = () => {
  const { scenarioState, setScenarioState } = useAppStore();
  const { addToast } = useToastStore();

  const handleStateChange = (newState: typeof scenarioState) => {
    setScenarioState(newState);
    addToast({
      type: 'info',
      message: `Scenario state changed to: ${newState}`,
    });
  };

  const testToast = (type: 'info' | 'success' | 'warning' | 'error') => {
    const messages = {
      info: 'This is an info notification',
      success: 'Generation complete!',
      warning: 'High fire danger detected',
      error: 'API error - retrying...',
    };
    addToast({ type, message: messages[type] });
  };

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h3 className={styles.heading}>Test State Changes</h3>
        <div className={styles.buttonGrid}>
          <button onClick={() => handleStateChange('idle')} className={styles.button}>
            Idle
          </button>
          <button onClick={() => handleStateChange('drawing')} className={styles.button}>
            Drawing
          </button>
          <button onClick={() => handleStateChange('configuring')} className={styles.button}>
            Configuring
          </button>
          <button onClick={() => handleStateChange('generating')} className={styles.button}>
            Generating
          </button>
          <button onClick={() => handleStateChange('complete')} className={styles.button}>
            Complete
          </button>
          <button onClick={() => handleStateChange('error')} className={styles.button}>
            Error
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Test Notifications</h3>
        <div className={styles.buttonGrid}>
          <button onClick={() => testToast('info')} className={styles.button}>
            Info Toast
          </button>
          <button onClick={() => testToast('success')} className={styles.button}>
            Success Toast
          </button>
          <button onClick={() => testToast('warning')} className={styles.button}>
            Warning Toast
          </button>
          <button onClick={() => testToast('error')} className={styles.button}>
            Error Toast
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.note}>
          <strong>Note:</strong> This is a demo interface. Actual scenario controls will be
          implemented in Issue 5.
        </p>
      </section>
    </div>
  );
};
