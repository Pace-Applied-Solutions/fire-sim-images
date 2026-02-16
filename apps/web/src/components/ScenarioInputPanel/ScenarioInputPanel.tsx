import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import type { ScenarioInputs, FireDangerRating, ViewPoint, GenerationResult } from '@fire-sim/shared';
import area from '@turf/area';
import centroid from '@turf/centroid';
import bbox from '@turf/bbox';
import {
  getWeatherProfileForRating,
  validateWeatherParameters,
  formatRating,
  getFireBehaviour,
} from '@fire-sim/shared';
import { generationApi } from '../../services/generationApi';
import { useToastStore } from '../../store/toastStore';
import styles from './ScenarioInputPanel.module.css';

const PRESETS: Record<string, ScenarioInputs> = {
  grassfireModerate: {
    fireDangerRating: 'high',
    windSpeed: 30,
    windDirection: 'NW',
    temperature: 30,
    humidity: 20,
    timeOfDay: 'afternoon',
    intensity: 'moderate',
    fireStage: 'established',
    flameHeightM: 1.5,
    rateOfSpreadKmh: 6,
  },
  forestfireSevere: {
    fireDangerRating: 'extreme',
    windSpeed: 50,
    windDirection: 'NW',
    temperature: 40,
    humidity: 10,
    timeOfDay: 'afternoon',
    intensity: 'veryHigh',
    fireStage: 'established',
    flameHeightM: 10,
    rateOfSpreadKmh: 5,
  },
  nightOperation: {
    fireDangerRating: 'moderate',
    windSpeed: 15,
    windDirection: 'W',
    temperature: 25,
    humidity: 35,
    timeOfDay: 'night',
    intensity: 'moderate',
    fireStage: 'established',
    flameHeightM: 0.5,
    rateOfSpreadKmh: 0.5,
  },
  extremeDay: {
    fireDangerRating: 'extreme',
    windSpeed: 80,
    windDirection: 'NW',
    temperature: 45,
    humidity: 6,
    timeOfDay: 'midday',
    intensity: 'extreme',
    fireStage: 'major',
    flameHeightM: 15,
    rateOfSpreadKmh: 8,
  },
};

const DEFAULT_INPUTS: ScenarioInputs = {
  fireDangerRating: 'high',
  windSpeed: 25,
  windDirection: 'NW',
  temperature: 35,
  humidity: 15,
  timeOfDay: 'afternoon',
  intensity: 'high',
  fireStage: 'established',
  flameHeightM: 3,
  rateOfSpreadKmh: 1.5,
};

const RATING_CLASS_MAP: Record<FireDangerRating, string> = {
  noRating: styles.ratingNoRating,
  moderate: styles.ratingModerate,
  high: styles.ratingHigh,
  extreme: styles.ratingExtreme,
  catastrophic: styles.ratingCatastrophic,
};

const RATING_INTENSITY_MAP: Record<FireDangerRating, ScenarioInputs['intensity']> = {
  noRating: 'low',
  moderate: 'moderate',
  high: 'high',
  extreme: 'extreme',
  catastrophic: 'catastrophic',
};

interface ValidationErrors {
  windSpeed?: string;
  temperature?: string;
  humidity?: string;
}

export const ScenarioInputPanel: React.FC = () => {
  const {
    perimeter,
    geoContext,
    setGeoContext,
    setScenarioState,
    setScenarioInputs,
    setGenerationProgress,
    setGenerationResult,
    setMapScreenshots,
    setError,
    captureMapScreenshots,
  } = useAppStore();
  const { addToast } = useToastStore();
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const validateInputs = (newInputs: ScenarioInputs): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (newInputs.windSpeed < 0 || newInputs.windSpeed > 120) {
      newErrors.windSpeed = 'Wind speed must be between 0 and 120 km/h';
    }

    if (newInputs.temperature < 5 || newInputs.temperature > 50) {
      newErrors.temperature = 'Temperature must be between 5 and 50 °C';
    }

    if (newInputs.humidity < 5 || newInputs.humidity > 100) {
      newErrors.humidity = 'Humidity must be between 5 and 100%';
    }

    return newErrors;
  };

  const updateInput = <K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) => {
    const newInputs = { ...inputs, [key]: value };
    setInputs(newInputs);
    const newErrors = validateInputs(newInputs);
    setErrors(newErrors);

    // Check for weather warnings
    const weatherWarnings = validateWeatherParameters({
      temperature: newInputs.temperature,
      humidity: newInputs.humidity,
      windSpeed: newInputs.windSpeed,
    });
    setWarnings(weatherWarnings);

    // Persist to store if valid
    if (Object.keys(newErrors).length === 0) {
      setScenarioInputs(newInputs);
    }
  };

  const handleRatingChange = (rating: FireDangerRating) => {
    // Update rating and load typical weather profile
    const profile = getWeatherProfileForRating(rating);

    // Get fire behaviour based on rating and current vegetation type
    const vegType = geoContext?.vegetationType || 'Dry Sclerophyll Forest';
    const fireBehaviour = getFireBehaviour(rating, vegType);

    const newInputs: ScenarioInputs = {
      ...inputs,
      fireDangerRating: rating,
      intensity: RATING_INTENSITY_MAP[rating],
      temperature: profile.temperature,
      humidity: profile.humidity,
      windSpeed: profile.windSpeed,
      flameHeightM: Math.round(((fireBehaviour.flameHeight.min + fireBehaviour.flameHeight.max) / 2) * 10) / 10,
      rateOfSpreadKmh: Math.round(((fireBehaviour.rateOfSpread.min + fireBehaviour.rateOfSpread.max) / 2) * 10) / 10,
    };

    setInputs(newInputs);
    setErrors({});
    setWarnings([]);
    setScenarioInputs(newInputs);
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey && PRESETS[presetKey]) {
      const presetInputs = PRESETS[presetKey];
      const intensityFromRating = RATING_INTENSITY_MAP[presetInputs.fireDangerRating];
      setInputs({ ...presetInputs, intensity: intensityFromRating });
      setSelectedPreset(presetKey);
      setErrors({});
      setWarnings([]);
      setScenarioInputs({ ...presetInputs, intensity: intensityFromRating });
    }
  };

  // Initialize store with default inputs on mount
  useEffect(() => {
    setScenarioInputs(DEFAULT_INPUTS);
  }, [setScenarioInputs]);

  // Fetch geo context when perimeter changes
  useEffect(() => {
    const fetchGeoContext = async () => {
      if (perimeter && perimeter.geometry) {
        try {
          const context = await generationApi.getGeoContext(perimeter.geometry);
          setGeoContext(context);
        } catch (error) {
          console.error('Failed to fetch geo context:', error);
          addToast({ type: 'error', message: 'Failed to load geographic context' });
        }
      }
    };

    fetchGeoContext();
  }, [perimeter, setGeoContext, addToast]);

  // Update flame height and ROS when vegetation type changes (from geo context)
  useEffect(() => {
    if (geoContext?.vegetationType) {
      const fireBehaviour = getFireBehaviour(inputs.fireDangerRating, geoContext.vegetationType);
      const newFlameHeight = Math.round(((fireBehaviour.flameHeight.min + fireBehaviour.flameHeight.max) / 2) * 10) / 10;
      const newROS = Math.round(((fireBehaviour.rateOfSpread.min + fireBehaviour.rateOfSpread.max) / 2) * 10) / 10;

      const newInputs = { ...inputs, flameHeightM: newFlameHeight, rateOfSpreadKmh: newROS };
      setInputs(newInputs);
      setScenarioInputs(newInputs);
    }
    // Only re-run when vegetation type changes, not on every inputs change
  }, [geoContext?.vegetationType]);

  const handleGenerate = async () => {
    if (!perimeter || !geoContext) {
      addToast({ type: 'error', message: 'Draw a fire perimeter on the map first' });
      return;
    }

    try {
      setScenarioState('generating');
      setGenerationProgress('Starting generation...');
      setError(null);

      // Default viewpoints: capture cardinal directions at each perspective for consistency
      // This matches the perspective toggles in the UI (NESW for helicopter and ground, plus aerial)
      // Single perspective for initial testing — additional perspectives can be
      // enabled later or offered as user-selectable options
      const requestedViews: ViewPoint[] = [
        'aerial',
        'ground_north',
        'ground_east',
      ];

      // Capture map screenshots from each viewpoint for terrain reference
      let mapScreenshots: Record<string, string> | undefined;
      if (captureMapScreenshots) {
        setGenerationProgress('Capturing terrain views...');
        try {
          mapScreenshots = await captureMapScreenshots(requestedViews);
          const count = Object.keys(mapScreenshots).length;
          console.log(`Captured ${count} map screenshots for terrain reference`);
          // Store screenshots so the comparison view can access them
          if (count > 0) {
            setMapScreenshots(mapScreenshots);
            setGenerationProgress(`Captured ${count} terrain views. Starting AI generation...`);
          }
        } catch (error) {
          console.warn('Map screenshot capture failed, proceeding without:', error);
          // Non-fatal: continue generation without screenshots
        }
      }

      // Start generation
      const startResponse = await generationApi.startGeneration({
        perimeter,
        inputs,
        geoContext,
        requestedViews,
        mapScreenshots: mapScreenshots as Record<ViewPoint, string>,
      });

      addToast({ type: 'success', message: 'Generation started' });
      console.log('Generation started:', startResponse);

      // Set an initial generationResult immediately so the Results Panel
      // renders the in-progress state with a "model is thinking" indicator,
      // rather than showing the empty placeholder.
      setGenerationResult({
        id: startResponse.scenarioId,
        status: 'in_progress',
        images: [],
        createdAt: new Date().toISOString(),
      });

      // Poll for completion — update partial results progressively
      const result = await generationApi.pollForCompletion(startResponse.scenarioId, (status) => {
        const progressMsg = status.status === 'in_progress'
          ? `Generating images... ${status.completedImages}/${status.totalImages} complete`
          : status.status === 'pending'
            ? 'Waiting for generation to start...'
            : status.progress;
        setGenerationProgress(progressMsg);
        console.log('Generation progress:', status.progress, 'thinkingText:', status.thinkingText ? `${status.thinkingText.length} chars` : '(none)');

        // Always update generationResult during polling so the
        // Results Panel stays current with thinking text, images, and status
        setGenerationResult({
          id: startResponse.scenarioId,
          status: status.status as GenerationResult['status'],
          images: status.results?.images || [],
          createdAt: status.createdAt,
          thinkingText: status.thinkingText,
        });
      });

      // Handle final completion
      setGenerationResult(result);
      setScenarioState('complete');
      setGenerationProgress(null);

      if (result.status === 'completed') {
        addToast({
          type: 'success',
          message: `Generated ${result.images.length} images successfully`,
        });
      } else if (result.status === 'failed') {
        addToast({ type: 'error', message: result.error || 'Generation failed' });
        setError(result.error || 'Generation failed');
        setScenarioState('error');
      }
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setScenarioState('error');
      setGenerationProgress(null);
      addToast({ type: 'error', message: `Generation failed: ${errorMessage}` });
    }
  };

  const isValid = Object.keys(errors).length === 0;
  const canGenerate = isValid && perimeter !== null;

  // Compute perimeter metadata from the GeoJSON feature
  const perimeterMeta = useMemo(() => {
    if (!perimeter) return null;
    try {
      const areaM2 = area(perimeter);
      const center = centroid(perimeter);
      const bounds = bbox(perimeter);
      return {
        areaHectares: areaM2 / 10_000,
        centroid: center.geometry.coordinates as [number, number],
        bbox: bounds as [number, number, number, number],
      };
    } catch {
      return null;
    }
  }, [perimeter]);

  const getSummaryText = (): string => {
    const stageMap = {
      spotFire: 'Spot fire',
      developing: 'Developing fire',
      established: 'Established fire',
      major: 'Major fire',
    };

    const timeMap = {
      dawn: 'dawn',
      morning: 'morning',
      midday: 'midday',
      afternoon: 'afternoon',
      dusk: 'dusk',
      night: 'night',
    };

    return `${stageMap[inputs.fireStage]} on a ${inputs.temperature}°C ${timeMap[inputs.timeOfDay]} with ${inputs.windSpeed} km/h ${inputs.windDirection} winds and ${inputs.humidity}% humidity. Fire Danger: ${formatRating(inputs.fireDangerRating)}. Flames: ${inputs.flameHeightM ?? '?'}m, ROS: ${inputs.rateOfSpreadKmh ?? '?'} km/h.`;
  };

  return (
    <div className={styles.container}>
      {/* Presets Dropdown */}
      <div className={styles.presets}>
        <label htmlFor="preset-select" className={styles.label}>
          Scenario Presets
        </label>
        <select
          id="preset-select"
          value={selectedPreset}
          onChange={(e) => applyPreset(e.target.value)}
          className={styles.select}
        >
          <option value="">Custom scenario</option>
          <option value="grassfireModerate">Grass fire — moderate</option>
          <option value="forestfireSevere">Forest fire — severe</option>
          <option value="nightOperation">Night operation</option>
          <option value="extremeDay">Extreme day</option>
        </select>
      </div>

      {/* Fire Danger Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Fire Danger (AFDRS)</h3>
        </div>

        <div className={styles.sectionContent}>
          {/* Fire Danger Rating Selector */}
          <div className={styles.field}>
            <label className={styles.label}>Select fire danger rating</label>
            <select
              className={`${styles.ratingSelect} ${RATING_CLASS_MAP[inputs.fireDangerRating]}`}
              value={inputs.fireDangerRating}
              onChange={(e) => handleRatingChange(e.target.value as FireDangerRating)}
            >
              <option value="noRating">No Rating</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
              <option value="catastrophic">Catastrophic</option>
            </select>
          </div>

          <p className={styles.ratingHint}>
            Selecting a rating sets typical weather conditions. You can adjust individual weather
            parameters below.
          </p>
        </div>
      </section>

      {/* Weather Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Weather</h3>
        </div>

        <div className={styles.sectionContent}>
          {/* Wind Speed */}
          <div className={styles.field}>
            <label htmlFor="wind-speed" className={styles.label}>
              Wind speed (km/h)
            </label>
            <div className={styles.sliderGroup}>
              <input
                id="wind-speed"
                type="range"
                min="0"
                max="120"
                value={inputs.windSpeed}
                onChange={(e) => updateInput('windSpeed', Number(e.target.value))}
                className={styles.slider}
              />
              <input
                type="number"
                min="0"
                max="120"
                value={inputs.windSpeed}
                onChange={(e) => updateInput('windSpeed', Number(e.target.value))}
                className={styles.numberInput}
                aria-label="Wind speed number input"
              />
            </div>
            {errors.windSpeed && <span className={styles.error}>{errors.windSpeed}</span>}
          </div>

          {/* Wind Direction */}
          <div className={styles.field}>
            <label htmlFor="wind-direction" className={styles.label}>
              Wind direction
            </label>
            <select
              id="wind-direction"
              value={inputs.windDirection}
              onChange={(e) =>
                updateInput('windDirection', e.target.value as ScenarioInputs['windDirection'])
              }
              className={styles.select}
            >
              <option value="N">N (North)</option>
              <option value="NE">NE (North-East)</option>
              <option value="E">E (East)</option>
              <option value="SE">SE (South-East)</option>
              <option value="S">S (South)</option>
              <option value="SW">SW (South-West)</option>
              <option value="W">W (West)</option>
              <option value="NW">NW (North-West)</option>
            </select>
          </div>

          {/* Temperature */}
          <div className={styles.field}>
            <label htmlFor="temperature" className={styles.label}>
              Temperature (°C)
            </label>
            <div className={styles.sliderGroup}>
              <input
                id="temperature"
                type="range"
                min="5"
                max="50"
                value={inputs.temperature}
                onChange={(e) => updateInput('temperature', Number(e.target.value))}
                className={`${styles.slider} ${styles.sliderHeat}`}
              />
              <input
                type="number"
                min="5"
                max="50"
                value={inputs.temperature}
                onChange={(e) => updateInput('temperature', Number(e.target.value))}
                className={styles.numberInput}
                aria-label="Temperature number input"
              />
            </div>
            {errors.temperature && <span className={styles.error}>{errors.temperature}</span>}
          </div>

          {/* Humidity */}
          <div className={styles.field}>
            <label htmlFor="humidity" className={styles.label}>
              Relative humidity (%)
            </label>
            <div className={styles.sliderGroup}>
              <input
                id="humidity"
                type="range"
                min="5"
                max="100"
                value={inputs.humidity}
                onChange={(e) => updateInput('humidity', Number(e.target.value))}
                className={styles.slider}
              />
              <input
                type="number"
                min="5"
                max="100"
                value={inputs.humidity}
                onChange={(e) => updateInput('humidity', Number(e.target.value))}
                className={styles.numberInput}
                aria-label="Humidity number input"
              />
            </div>
            {errors.humidity && <span className={styles.error}>{errors.humidity}</span>}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className={styles.warning}>
              {warnings.map((warning, idx) => (
                <div key={idx}>⚠️ {warning}</div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Fire Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Fire Behaviour</h3>
        </div>

        <div className={styles.sectionContent}>
          {/* Fire Stage */}
          <div className={styles.field}>
            <label htmlFor="fire-stage" className={styles.label}>
              Fire stage
            </label>
            <select
              id="fire-stage"
              value={inputs.fireStage}
              onChange={(e) =>
                updateInput('fireStage', e.target.value as ScenarioInputs['fireStage'])
              }
              className={styles.select}
            >
              <option value="spotFire">Spot fire</option>
              <option value="developing">Developing</option>
              <option value="established">Established</option>
              <option value="major">Major</option>
            </select>
          </div>

          {/* Flame Height */}
          <div className={styles.field}>
            <label htmlFor="flame-height" className={styles.label}>
              Flame height (m)
            </label>
            <div className={styles.sliderGroup}>
              <input
                id="flame-height"
                type="range"
                min="0.1"
                max="40"
                step="0.1"
                value={inputs.flameHeightM ?? 1}
                onChange={(e) => updateInput('flameHeightM', Number(e.target.value))}
                className={styles.slider}
              />
              <input
                type="number"
                min="0.1"
                max="40"
                step="0.1"
                value={inputs.flameHeightM ?? 1}
                onChange={(e) => updateInput('flameHeightM', Number(e.target.value))}
                className={styles.numberInput}
                aria-label="Flame height number input"
              />
            </div>
            <span className={styles.fieldHint}>
              {(inputs.flameHeightM ?? 1) < 0.5 ? 'Smouldering / minimal flames' :
               (inputs.flameHeightM ?? 1) < 1.5 ? 'Low surface fire' :
               (inputs.flameHeightM ?? 1) < 3 ? 'Moderate surface fire' :
               (inputs.flameHeightM ?? 1) < 8 ? 'Active fire, some crown involvement' :
               (inputs.flameHeightM ?? 1) < 20 ? 'Very intense, crown fire likely' :
               'Extreme — full crown fire'}
            </span>
          </div>

          {/* Rate of Spread */}
          <div className={styles.field}>
            <label htmlFor="rate-of-spread" className={styles.label}>
              Rate of spread (km/h)
            </label>
            <div className={styles.sliderGroup}>
              <input
                id="rate-of-spread"
                type="range"
                min="0.1"
                max="60"
                step="0.1"
                value={inputs.rateOfSpreadKmh ?? 1}
                onChange={(e) => updateInput('rateOfSpreadKmh', Number(e.target.value))}
                className={styles.slider}
              />
              <input
                type="number"
                min="0.1"
                max="60"
                step="0.1"
                value={inputs.rateOfSpreadKmh ?? 1}
                onChange={(e) => updateInput('rateOfSpreadKmh', Number(e.target.value))}
                className={styles.numberInput}
                aria-label="Rate of spread number input"
              />
            </div>
            <span className={styles.fieldHint}>
              {(inputs.rateOfSpreadKmh ?? 1) < 1 ? 'Slow creep' :
               (inputs.rateOfSpreadKmh ?? 1) < 4 ? 'Walking pace' :
               (inputs.rateOfSpreadKmh ?? 1) < 10 ? 'Fast — outrunning on foot difficult' :
               (inputs.rateOfSpreadKmh ?? 1) < 25 ? 'Very fast — vehicle speed' :
               'Extreme — near-instantaneous spread'}
            </span>
          </div>
          <p className={styles.ratingHint}>
            Auto-calculated from fire danger rating and vegetation type. Adjust to fine-tune.
          </p>
        </div>
      </section>

      {/* Timing Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Timing</h3>
        </div>

        <div className={styles.sectionContent}>
          {/* Time of Day */}
          <div className={styles.field}>
            <label htmlFor="time-of-day" className={styles.label}>
              Time of day
            </label>
            <select
              id="time-of-day"
              value={inputs.timeOfDay}
              onChange={(e) =>
                updateInput('timeOfDay', e.target.value as ScenarioInputs['timeOfDay'])
              }
              className={styles.select}
            >
              <option value="dawn">Dawn</option>
              <option value="morning">Morning</option>
              <option value="midday">Midday</option>
              <option value="afternoon">Afternoon</option>
              <option value="dusk">Dusk</option>
              <option value="night">Night</option>
            </select>
          </div>
        </div>
      </section>

      {/* Fire Perimeter Info */}
      {perimeterMeta && (
        <div className={styles.perimeterCard}>
          <h4 className={styles.perimeterTitle}>
            <span className={styles.perimeterIcon}>🔥</span>
            Fire Perimeter
          </h4>
          <div className={styles.perimeterGrid}>
            <div className={styles.perimeterStat}>
              <span className={styles.perimeterLabel}>Area</span>
              <span className={styles.perimeterValue}>{perimeterMeta.areaHectares.toFixed(2)} ha</span>
            </div>
            <div className={styles.perimeterStat}>
              <span className={styles.perimeterLabel}>Centre</span>
              <span className={styles.perimeterValue}>
                {perimeterMeta.centroid[1].toFixed(4)}°, {perimeterMeta.centroid[0].toFixed(4)}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className={styles.summary}>
        <h4 className={styles.summaryTitle}>Summary</h4>
        <p className={styles.summaryText}>{getSummaryText()}</p>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={styles.generateButton}
        title={
          !perimeter
            ? 'Draw a fire perimeter on the map first'
            : !isValid
              ? 'Fix validation errors first'
              : 'Generate scenario'
        }
      >
        Generate Scenario
      </button>
    </div>
  );
};
