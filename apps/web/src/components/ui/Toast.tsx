import React from 'react';
import { useToastStore } from '../../store/toastStore';
import styles from './Toast.module.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`} role="alert">
          <div className={styles.content}>
            <span className={styles.message}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className={styles.closeButton}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
