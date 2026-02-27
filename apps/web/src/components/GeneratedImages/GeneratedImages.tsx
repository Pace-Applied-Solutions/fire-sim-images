/**
 * Component to display generated images from the generation results.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import type { GenerationResult, ScenarioInputs, GeoContext, FirePerimeter } from '@fire-sim/shared';
import { labApi } from '../../services/labApi';
import { ImageLightbox } from './ImageLightbox';
import { ScenarioSummaryCard } from './ScenarioSummaryCard';
import { ScreenshotCompare } from '../ScreenshotCompare';
import { PromptModal } from './PromptModal';
import styles from './GeneratedImages.module.css';

/**
 * Renders model thinking text in a chat-like scrollable panel.
 * Only auto-scrolls within the panel itself if the user hasn't manually scrolled up.
 * Does NOT scroll the outer results panel.
 */
const ThinkingPanel: React.FC<{ text: string; isStreaming?: boolean }> = ({
  text,
  isStreaming,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const userHasScrolledRef = useRef(false);
  const lastTextLengthRef = useRef(0);

  // Track when user manually scrolls within the thinking panel body
  useEffect(() => {
    const bodyEl = bodyRef.current;
    if (!bodyEl) return;

    const handleScroll = () => {
      const isAtBottom = bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 50;
      userHasScrolledRef.current = !isAtBottom;
    };

    bodyEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => bodyEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Only auto-scroll the thinking panel body when new content arrives AND user hasn't scrolled away.
  // Uses scrollTop instead of scrollIntoView to avoid scrolling the outer results panel.
  useEffect(() => {
    if (text.length > lastTextLengthRef.current && !userHasScrolledRef.current) {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
    }
    lastTextLengthRef.current = text.length;
  }, [text]);

  return (
    <div className={styles.thinkingPanel}>
      <div className={styles.thinkingHeader}>
        <span className={styles.thinkingIcon}>💭</span>
        <span className={styles.thinkingLabel}>Model Reasoning</span>
        {isStreaming && <span className={styles.thinkingDot} />}
      </div>
      <div className={styles.thinkingBody} ref={bodyRef}>
        <div className={styles.thinkingBubble}>{text}</div>
      </div>
    </div>
  );
};

interface GeneratedImagesProps {
  result: GenerationResult;
  perimeter?: FirePerimeter;
  inputs?: ScenarioInputs;
  geoContext?: GeoContext;
  promptVersion?: string;
  totalImages?: number;
  mapScreenshots?: Record<string, string> | null;
  onRegenerateImage?: (viewpoint: string) => void;
}

/**
 * Inline panel for natural language image modification.
 * Fetches the image from its SAS URL, converts to base64, then calls the modify API.
 */
const ModifyPanel: React.FC<{
  imageUrl: string;
  imagePrompt: string;
  imageId: string;
  onClose: () => void;
}> = ({ imageUrl, imagePrompt, imageId, onClose }) => {
  const [editRequest, setEditRequest] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [progress, setProgress] = useState('');
  const [modifiedDataUrl, setModifiedDataUrl] = useState<string | null>(null);

  const handleModify = async () => {
    const trimmed = editRequest.trim();
    if (!trimmed) return;

    setIsModifying(true);
    setModifiedDataUrl(null);
    setProgress('Fetching image…');

    try {
      // Fetch the image from the SAS URL and convert to base64 data URL
      const response = await fetch(imageUrl);
      if (!response.ok)
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      const blob = await response.blob();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });

      setProgress('Applying modification…');

      const result = await labApi.modifyImage(
        {
          originalPrompt: imagePrompt,
          imageDataUrl,
          editRequest: trimmed,
        },
        { onProgress: (msg) => setProgress(msg) }
      );

      setModifiedDataUrl(result.dataUrl);
      setProgress('');
    } catch (err) {
      console.error('[ModifyPanel] Modification failed:', err);
      setProgress('');
      alert(`Modification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsModifying(false);
    }
  };

  const handleDownloadModified = () => {
    if (!modifiedDataUrl) return;
    const link = document.createElement('a');
    link.href = modifiedDataUrl;
    link.download = `modified-${imageId}.png`;
    link.click();
  };

  return (
    <div className={styles.modifyPanel} role="region" aria-label="Modify image">
      {modifiedDataUrl ? (
        <>
          <img
            src={modifiedDataUrl}
            alt="Modified result"
            className={styles.modifyPreview}
          />
          <div className={styles.modifyActions}>
            <button className={styles.modifyDownload} onClick={handleDownloadModified}>
              ↓ Download
            </button>
            <button
              className={styles.modifyReset}
              onClick={() => {
                setModifiedDataUrl(null);
                setEditRequest('');
              }}
            >
              Modify Again
            </button>
            <button className={styles.modifyClose} onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <label className={styles.modifyLabel} htmlFor={`modify-input-${imageId}`}>
            Describe your change:
          </label>
          <textarea
            id={`modify-input-${imageId}`}
            className={styles.modifyInput}
            value={editRequest}
            onChange={(e) => setEditRequest(e.target.value)}
            placeholder='e.g. "make the sky red and add more smoke"'
            rows={2}
            disabled={isModifying}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleModify();
              }
            }}
          />
          <div className={styles.modifyActions}>
            {isModifying && progress && (
              <span className={styles.modifyProgress}>{progress}</span>
            )}
            <button
              className={styles.modifySubmit}
              onClick={() => void handleModify()}
              disabled={isModifying || !editRequest.trim()}
              title="Apply modification (Ctrl+Enter)"
            >
              {isModifying ? '⏳ Modifying…' : '✏ Apply'}
            </button>
            <button className={styles.modifyClose} onClick={onClose} disabled={isModifying}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const GeneratedImages: React.FC<GeneratedImagesProps> = ({
  result,
  perimeter,
  inputs,
  geoContext,
  promptVersion,
  totalImages = 9,
  mapScreenshots,
  onRegenerateImage,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [showScreenshotCompare, setShowScreenshotCompare] = useState(false);
  const [promptModalData, setPromptModalData] = useState<{
    prompt: string;
    viewpoint: string;
  } | null>(null);
  const [modifyPanelViewpoint, setModifyPanelViewpoint] = useState<string | null>(null);

  const hasScreenshots = mapScreenshots && Object.keys(mapScreenshots).length > 0;

  // Download all images as ZIP
  const handleDownloadAll = useCallback(async () => {
    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();

      // Download all images and add to zip
      const downloadPromises = result.images.map(async (image) => {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const filename = `${image.viewPoint}.png`;
        zip.file(filename, blob);
      });

      await Promise.all(downloadPromises);

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download ZIP
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      link.download = `scenario_${result.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to create ZIP', error);
      alert('Failed to download all images. Please try again.');
    } finally {
      setIsDownloadingZip(false);
    }
  }, [result]);

  // Open lightbox
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Show prompt modal
  const showPromptModal = useCallback((prompt: string, viewpoint: string) => {
    setPromptModalData({ prompt, viewpoint });
  }, []);

  // Close prompt modal
  const closePromptModal = useCallback(() => {
    setPromptModalData(null);
  }, []);

  if (result.status === 'pending' || result.status === 'in_progress') {
    const remainingCount = Math.max(0, totalImages - result.images.length);
    return (
      <div className={styles.container}>
        {/* Scenario Summary Card */}
        {perimeter && inputs && geoContext && (
          <ScenarioSummaryCard
            perimeter={perimeter}
            inputs={inputs}
            geoContext={geoContext}
            imageCount={result.images.length}
            timestamp={result.createdAt}
            promptVersion={promptVersion}
          />
        )}

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.title}>Generating Images</h3>
            <p className={styles.count}>
              {result.images.length}/{totalImages} complete
            </p>
          </div>
        </div>

        {/* Show model thinking text while generating, or a waiting indicator */}
        {result.thinkingText ? (
          <ThinkingPanel text={result.thinkingText} isStreaming />
        ) : (
          <div className={styles.thinkingPanel}>
            <div className={styles.thinkingHeader}>
              <span className={styles.thinkingIcon}>💭</span>
              <span className={styles.thinkingLabel}>Model Reasoning</span>
              <span className={styles.thinkingDot} />
            </div>
            <div className={styles.thinkingBody}>
              <div className={styles.thinkingBubble}>
                <div className={styles.waitingIndicator}>
                  <div className={styles.thinkingSpinner} />
                  <span>
                    Model is thinking… this can take 30–90 seconds for complex fire scenarios.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.grid}>
          {/* Show anchor image with badge if available */}
          {result.anchorImage && (
            <div key={result.anchorImage.viewPoint} className={`${styles.imageCard} ${styles.anchorCard}`}>
              <div
                className={styles.imageWrapper}
                onClick={() => openLightbox(0)} // Anchor is always at index 0 in result.images
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(0);
                  }
                }}
              >
                <img src={result.anchorImage.url} alt={`${result.anchorImage.viewPoint} view (anchor)`} className={styles.image} />
                <div className={styles.imageOverlay}>
                  <span className={styles.viewIcon}>🔍</span>
                </div>
                <div className={styles.anchorBadge}>⚓ Anchor</div>
              </div>
              <div className={styles.imageInfo}>
                <h4 className={styles.viewpoint}>{formatViewpoint(result.anchorImage.viewPoint)}</h4>
                <p className={styles.metadata}>
                  {result.anchorImage.metadata.width} × {result.anchorImage.metadata.height} • {result.anchorImage.metadata.model}
                </p>
              </div>
            </div>
          )}
          {/* Show remaining images, filtering out anchor if present */}
          {result.images
            .filter((image) => !result.anchorImage || image.viewPoint !== result.anchorImage.viewPoint)
            .map((image, index) => (
            <div key={image.viewPoint} className={styles.imageCard}>
              <div
                className={styles.imageWrapper}
                // Map filtered array index back to position in result.images
                // Anchor is at index 0, so non-anchor images start at index 1
                onClick={() => openLightbox(index + (result.anchorImage ? 1 : 0))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(index + (result.anchorImage ? 1 : 0));
                  }
                }}
              >
                <img src={image.url} alt={`${image.viewPoint} view`} className={styles.image} />
                <div className={styles.imageOverlay}>
                  <span className={styles.viewIcon}>🔍</span>
                </div>
              </div>
              <div className={styles.imageInfo}>
                <h4 className={styles.viewpoint}>{formatViewpoint(image.viewPoint)}</h4>
                <p className={styles.metadata}>
                  {image.metadata.width} × {image.metadata.height} • {image.metadata.model}
                </p>
              </div>
            </div>
          ))}
          {/* Placeholder cards for images still generating */}
          {Array.from({ length: remainingCount }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className={`${styles.imageCard} ${styles.placeholderCard}`}
            >
              <div className={styles.placeholderWrapper}>
                <div className={styles.spinner} />
                <p className={styles.placeholderText}>Generating...</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <ImageLightbox
            images={result.images}
            initialIndex={lightboxIndex}
            onClose={closeLightbox}
          />
        )}
      </div>
    );
  }

  if (result.status === 'failed') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Generation Failed</h3>
          <p>{result.error || 'An unknown error occurred'}</p>
        </div>
        {/* Show thinking text even on failure — helps debug what the model was doing */}
        {result.thinkingText && <ThinkingPanel text={result.thinkingText} />}
      </div>
    );
  }

  if (result.images.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No images were generated</p>
        </div>
      </div>
    );
  }

  // Show screenshot vs generated comparison
  if (showScreenshotCompare && hasScreenshots) {
    return (
      <ScreenshotCompare
        images={result.images}
        mapScreenshots={mapScreenshots}
        onClose={() => setShowScreenshotCompare(false)}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Scenario Summary Card */}
      {perimeter && inputs && geoContext && (
        <ScenarioSummaryCard
          perimeter={perimeter}
          inputs={inputs}
          geoContext={geoContext}
          imageCount={result.images.length}
          timestamp={result.createdAt}
          promptVersion={promptVersion}
        />
      )}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Generated Images</h3>
          <p className={styles.count}>
            {result.images.length} {result.images.length === 1 ? 'image' : 'images'}
          </p>
          {result.seed !== undefined && (
            <span className={styles.seed} title="Consistency seed used for all images">
              Seed: {result.seed}
            </span>
          )}
        </div>
        <div className={styles.headerActions}>
          {hasScreenshots && (
            <button className={styles.compareButton} onClick={() => setShowScreenshotCompare(true)}>
              Compare with Map
            </button>
          )}
          <button
            className={styles.downloadAllButton}
            onClick={handleDownloadAll}
            disabled={isDownloadingZip}
          >
            {isDownloadingZip ? 'Creating ZIP...' : 'Download All'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {result.anchorImage && (
          <div className={`${styles.imageCard} ${styles.anchorCard}`}>
            <div
              className={styles.imageWrapper}
              onClick={() => openLightbox(result.images.findIndex(img => img.viewPoint === result.anchorImage!.viewPoint))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(result.images.findIndex(img => img.viewPoint === result.anchorImage!.viewPoint));
                }
              }}
            >
              <img
                src={result.anchorImage.url}
                alt={`${result.anchorImage.viewPoint} view (anchor)`}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.imageOverlay}>
                <span className={styles.viewIcon}>🔍</span>
              </div>
              <div className={styles.anchorBadge}>⚓ Anchor</div>
            </div>
            <div className={styles.imageInfo}>
              <h4 className={styles.viewpoint}>{formatViewpoint(result.anchorImage.viewPoint)}</h4>
              <p className={styles.metadata}>
                {result.anchorImage.metadata.width} × {result.anchorImage.metadata.height} •{' '}
                {result.anchorImage.metadata.model}
              </p>
            </div>
            <div className={styles.actions}>
              <a
                href={result.anchorImage.url}
                download={`${result.anchorImage.viewPoint}.png`}
                className={styles.downloadButton}
                title="Download image"
              >
                Download
              </a>
              <button
                className={styles.promptButton}
                onClick={() =>
                  showPromptModal(
                    result.anchorImage!.metadata.prompt,
                    result.anchorImage!.viewPoint
                  )
                }
                title="View generation prompt"
              >
                View Prompt
              </button>
              <button
                className={styles.modifyButton}
                onClick={() =>
                  setModifyPanelViewpoint(
                    modifyPanelViewpoint === result.anchorImage!.viewPoint
                      ? null
                      : result.anchorImage!.viewPoint
                  )
                }
                title="Modify this image"
                aria-expanded={modifyPanelViewpoint === result.anchorImage!.viewPoint}
              >
                ✏ Modify
              </button>
            </div>
            {modifyPanelViewpoint === result.anchorImage!.viewPoint && (
              <ModifyPanel
                imageUrl={result.anchorImage!.url}
                imagePrompt={result.anchorImage!.metadata.prompt}
                imageId={result.anchorImage!.viewPoint}
                onClose={() => setModifyPanelViewpoint(null)}
              />
            )}
          </div>
        )}
        {result.images
          .filter(
            (image) => !result.anchorImage || image.viewPoint !== result.anchorImage.viewPoint
          )
          .map((image, index) => (
            <div key={image.viewPoint} className={styles.imageCard}>
              <div
                className={styles.imageWrapper}
                onClick={() => openLightbox(index + (result.anchorImage ? 1 : 0))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(index + (result.anchorImage ? 1 : 0));
                  }
                }}
              >
                <img src={image.url} alt={`${image.viewPoint} view`} className={styles.image} />
                <div className={styles.imageOverlay}>
                  <span className={styles.viewIcon}>🔍</span>
                </div>
              </div>
              <div className={styles.imageInfo}>
                <h4 className={styles.viewpoint}>{formatViewpoint(image.viewPoint)}</h4>
                <p className={styles.metadata}>
                  {image.metadata.width} × {image.metadata.height} • {image.metadata.model}
                </p>
              </div>
              <div className={styles.actions}>
                <a
                  href={image.url}
                  download={`${image.viewPoint}.png`}
                  className={styles.downloadButton}
                  title="Download image"
                >
                  Download
                </a>
                <button
                  className={styles.promptButton}
                  onClick={() => showPromptModal(image.metadata.prompt, image.viewPoint)}
                  title="View generation prompt"
                >
                  View Prompt
                </button>
                <button
                  className={styles.modifyButton}
                  onClick={() =>
                    setModifyPanelViewpoint(
                      modifyPanelViewpoint === image.viewPoint ? null : image.viewPoint
                    )
                  }
                  title="Modify this image"
                  aria-expanded={modifyPanelViewpoint === image.viewPoint}
                >
                  ✏ Modify
                </button>
                {onRegenerateImage && (
                  <button
                    className={styles.regenerateButton}
                    onClick={() => onRegenerateImage(image.viewPoint)}
                    title="Regenerate this view"
                  >
                    Regenerate
                  </button>
                )}
              </div>
              {modifyPanelViewpoint === image.viewPoint && (
                <ModifyPanel
                  imageUrl={image.url}
                  imagePrompt={image.metadata.prompt}
                  imageId={image.viewPoint}
                  onClose={() => setModifyPanelViewpoint(null)}
                />
              )}
            </div>
          ))}
      </div>

      {result.completedAt && (
        <div className={styles.footer}>
          <p className={styles.timestamp}>
            Completed at {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={result.images}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}

      {/* Prompt Modal */}
      {promptModalData && (
        <PromptModal
          prompt={promptModalData.prompt}
          viewpoint={promptModalData.viewpoint}
          onClose={closePromptModal}
        />
      )}
    </div>
  );
};

/**
 * Format viewpoint name for display.
 */
function formatViewpoint(viewpoint: string): string {
  return viewpoint
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
