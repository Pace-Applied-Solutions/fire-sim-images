import React, { useState } from 'react';
import { useLabStore } from '../../store/labStore';
import type { LabGeneratedImage, LabReferenceImage } from '../../store/labStore';
import { labApi } from '../../services/labApi';
import { ImageZoomModal } from './ImageZoomModal';
import styles from './GeneratedImagesCollector.module.css';

/**
 * Generated Images Collector
 *
 * Grid of images generated in this lab session.
 * Supports expand, download, view prompt, use as reference, and natural language modification.
 */
export const GeneratedImagesCollector: React.FC = () => {
  const generatedImages = useLabStore((s) => s.generatedImages);
  const removeGeneratedImage = useLabStore((s) => s.removeGeneratedImage);
  const addReferenceImage = useLabStore((s) => s.addReferenceImage);
  const addGeneratedImage = useLabStore((s) => s.addGeneratedImage);
  const referenceImages = useLabStore((s) => s.referenceImages);
  const systemInstruction = useLabStore((s) => s.systemInstruction);
  const imageSize = useLabStore((s) => s.imageSize);
  const modifyingImageId = useLabStore((s) => s.modifyingImageId);
  const isModifying = useLabStore((s) => s.isModifying);
  const modifyProgress = useLabStore((s) => s.modifyProgress);
  const setModifyingImageId = useLabStore((s) => s.setModifyingImageId);
  const setModifying = useLabStore((s) => s.setModifying);
  const setModifyProgress = useLabStore((s) => s.setModifyProgress);

  const [zoomedImageId, setZoomedImageId] = useState<string | null>(null);
  // Per-card edit request text (keyed by image id)
  const [editRequests, setEditRequests] = useState<Record<string, string>>({});

  const handleUseAsReference = (image: LabGeneratedImage) => {
    const refImage: LabReferenceImage = {
      id: crypto.randomUUID(),
      dataUrl: image.dataUrl,
      label: `Generated ${new Date(image.generatedAt).toLocaleTimeString()}`,
      type: 'generated_output',
      included: true,
      capturedAt: image.generatedAt,
    };
    addReferenceImage(refImage);
  };

  const handleDownload = (image: LabGeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = `fire-sim-lab-${new Date(image.generatedAt).getTime()}.png`;
    link.click();
  };

  const handleToggleModify = (imageId: string) => {
    setModifyingImageId(modifyingImageId === imageId ? null : imageId);
  };

  const handleModify = async (image: LabGeneratedImage) => {
    const editRequest = (editRequests[image.id] || '').trim();
    if (!editRequest) return;

    setModifying(true);
    setModifyProgress('Preparing modification...');

    const startTime = Date.now();

    try {
      // Collect the reference images that were originally used
      const originalRefImages = referenceImages
        .filter((r) => image.referenceImageIds.includes(r.id))
        .map((r) => ({ dataUrl: r.dataUrl, type: r.type }));

      setModifyProgress('Applying modification...');

      const result = await labApi.modifyImage(
        {
          originalPrompt: image.prompt,
          imageDataUrl: image.dataUrl,
          editRequest,
          systemInstruction,
          referenceImages: originalRefImages.length > 0 ? originalRefImages : undefined,
          size: imageSize,
        },
        {
          onThinking: () => {
            // Thinking text is informational; progress indicator is sufficient here
          },
          onProgress: (message) => setModifyProgress(message),
        }
      );

      const generationTime = Date.now() - startTime;
      addGeneratedImage({
        id: crypto.randomUUID(),
        dataUrl: result.dataUrl,
        prompt: image.prompt,
        systemInstruction,
        referenceImageIds: image.referenceImageIds,
        thinkingText: result.thinkingText,
        generatedAt: new Date().toISOString(),
        generationTimeMs: generationTime,
        model: result.metadata.model,
        parentId: image.id,
        editRequest,
      });

      // Clear the edit request and close the panel
      setEditRequests((prev) => ({ ...prev, [image.id]: '' }));
      setModifyingImageId(null);
      setModifyProgress('');
    } catch (error) {
      console.error('[GeneratedImagesCollector] Modification failed:', error);
      setModifyProgress('');
      alert(`Modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setModifying(false);
    }
  };

  if (generatedImages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🎨</div>
        <div className={styles.emptyText}>No images generated yet</div>
        <div className={styles.emptyHint}>Use the Generate button to create your first image</div>
      </div>
    );
  }

  return (
    <div className={styles.collector}>
      {generatedImages.map((image) => {
        const isEditOpen = modifyingImageId === image.id;

        return (
          <div key={image.id} className={styles.imageCard}>
            <div className={styles.imageWrapper} onClick={() => setZoomedImageId(image.id)}>
              <img src={image.dataUrl} alt="Generated" className={styles.thumbnail} />
              <div className={styles.overlay}>
                <div className={styles.zoomHint}>Click to zoom</div>
              </div>
              {image.editRequest && (
                <div
                  className={styles.modifiedBadge}
                  title={`Edit: ${image.editRequest}`}
                  aria-label={`Modified image — edit: ${image.editRequest}`}
                >
                  ✏ Modified
                </div>
              )}
            </div>
            <div className={styles.imageInfo}>
              <div className={styles.timestamp}>
                {new Date(image.generatedAt).toLocaleTimeString()}
              </div>
              <div className={styles.metadata}>
                <span className={styles.metaItem}>{image.generationTimeMs}ms</span>
                <span className={styles.metaItem}>{image.model}</span>
              </div>
              {image.thinkingText && (
                <div className={styles.thinking} title={image.thinkingText}>
                  {truncateText(image.thinkingText, 50)}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.actionButton}
                  onClick={() => handleUseAsReference(image)}
                  title="Use as reference"
                >
                  ↻
                </button>
                <button
                  className={`${styles.actionButton} ${isEditOpen ? styles.actionButtonActive : ''}`}
                  onClick={() => handleToggleModify(image.id)}
                  title="Modify image"
                  aria-expanded={isEditOpen}
                  aria-controls={`modify-panel-${image.id}`}
                  disabled={isModifying && !isEditOpen}
                >
                  ✏
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => handleDownload(image)}
                  title="Download"
                >
                  ↓
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => removeGeneratedImage(image.id)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Inline modification panel */}
            {isEditOpen && (
              <div
                id={`modify-panel-${image.id}`}
                className={styles.modifyPanel}
                role="region"
                aria-label="Modify image"
              >
                <label className={styles.modifyLabel} htmlFor={`edit-input-${image.id}`}>
                  Describe your change:
                </label>
                <textarea
                  id={`edit-input-${image.id}`}
                  className={styles.modifyInput}
                  value={editRequests[image.id] || ''}
                  onChange={(e) =>
                    setEditRequests((prev) => ({ ...prev, [image.id]: e.target.value }))
                  }
                  placeholder='e.g. "make the sky red and add more smoke"'
                  rows={2}
                  disabled={isModifying}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void handleModify(image);
                    }
                  }}
                />
                <div className={styles.modifyActions}>
                  {isModifying && modifyProgress && (
                    <span className={styles.modifyProgress}>{modifyProgress}</span>
                  )}
                  <button
                    className={styles.modifySubmit}
                    onClick={() => void handleModify(image)}
                    disabled={isModifying || !(editRequests[image.id] || '').trim()}
                    title="Apply modification (Ctrl+Enter)"
                  >
                    {isModifying ? '⏳ Modifying…' : '✏ Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {zoomedImageId && (
        <ImageZoomModal
          imageUrl={generatedImages.find((img) => img.id === zoomedImageId)?.dataUrl || ''}
          label={`Generated ${new Date(generatedImages.find((img) => img.id === zoomedImageId)?.generatedAt || '').toLocaleTimeString()}`}
          onClose={() => setZoomedImageId(null)}
        />
      )}
    </div>
  );
};

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

