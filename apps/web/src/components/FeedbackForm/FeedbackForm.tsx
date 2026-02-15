import React, { useState } from 'react';
import type { ImageFeedback } from '@fire-sim/shared';
import styles from './FeedbackForm.module.css';

interface FeedbackFormProps {
  scenarioId: string;
  imageUrl: string;
  viewpoint: string;
  onSubmit: (feedback: Partial<ImageFeedback>) => Promise<void>;
  onCancel: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  scenarioId,
  imageUrl,
  viewpoint,
  onSubmit,
  onCancel,
}) => {
  const [ratings, setRatings] = useState({
    realism: 0,
    accuracy: 0,
    usefulness: 0,
  });
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingChange = (category: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate ratings
    if (ratings.realism === 0 || ratings.accuracy === 0 || ratings.usefulness === 0) {
      setError('Please provide all ratings before submitting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        scenarioId,
        imageUrl,
        viewpoint: viewpoint as any,
        ratings,
        comments: comments || undefined,
        trainerId: 'current-user', // Will be replaced with actual user ID
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.feedbackForm}>
      <h3 className={styles.title}>Rate this image</h3>
      <p className={styles.subtitle}>Help us improve by rating this generated image</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.ratingSection}>
          <label className={styles.ratingLabel}>
            <span className={styles.ratingName}>Realism</span>
            <span className={styles.ratingDescription}>Does it look like a real photo?</span>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.star} ${star <= ratings.realism ? styles.selected : ''}`}
                  onClick={() => handleRatingChange('realism', star)}
                  aria-label={`Rate realism ${star} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className={styles.ratingSection}>
          <label className={styles.ratingLabel}>
            <span className={styles.ratingName}>Accuracy</span>
            <span className={styles.ratingDescription}>
              Does it match the location and conditions?
            </span>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.star} ${star <= ratings.accuracy ? styles.selected : ''}`}
                  onClick={() => handleRatingChange('accuracy', star)}
                  aria-label={`Rate accuracy ${star} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className={styles.ratingSection}>
          <label className={styles.ratingLabel}>
            <span className={styles.ratingName}>Usefulness</span>
            <span className={styles.ratingDescription}>Would you use this in training?</span>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.star} ${star <= ratings.usefulness ? styles.selected : ''}`}
                  onClick={() => handleRatingChange('usefulness', star)}
                  aria-label={`Rate usefulness ${star} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className={styles.commentsSection}>
          <label className={styles.commentsLabel}>
            <span className={styles.labelText}>Comments (optional)</span>
            <textarea
              className={styles.commentsTextarea}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="What works well? What could be improved?"
              rows={4}
              maxLength={1000}
            />
          </label>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};
