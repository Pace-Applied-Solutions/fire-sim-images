import React from 'react';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className={styles.container} role="alert">
      <div className={styles.icon}>⚠</div>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className={styles.retryButton}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
