import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import type { ScenarioInputs, FireDangerRating } from '@fire-sim/shared';
import {
  getWeatherProfileForRating,
  validateWeatherParameters,
  formatRating,
  getRatingDescription,
} from '@fire-sim/shared';
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
};

interface ValidationErrors {
  windSpeed?: string;
  temperature?: string;
  humidity?: string;
}

export const ScenarioInputPanel: React.FC = () => {
  const { perimeter, setScenarioState, setScenarioInputs } = useAppStore();
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [sectionsOpen, setSectionsOpen] = useState({
    fireDanger: true,
    weather: true,
    fire: true,
    timing: true,
  });

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

  const updateInput = <K extends keyof ScenarioInputs>(
    key: K,
    value: ScenarioInputs[K]
  ) => {
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

    const newInputs: ScenarioInputs = {
      ...inputs,
      fireDangerRating: rating,
      temperature: profile.temperature,
      humidity: profile.humidity,
      windSpeed: profile.windSpeed,
    };

    setInputs(newInputs);
    setErrors({});
    setWarnings([]);
    setScenarioInputs(newInputs);
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey && PRESETS[presetKey]) {
      const presetInputs = PRESETS[presetKey];
      setInputs(presetInputs);
      setSelectedPreset(presetKey);
      setErrors({});
      setWarnings([]);
      setScenarioInputs(presetInputs);
    }
  };

  // Initialize store with default inputs on mount
  useEffect(() => {
    setScenarioInputs(DEFAULT_INPUTS);
  }, [setScenarioInputs]);

  const handleGenerate = () => {
    console.log('Generate scenario:', {
      perimeter,
      inputs,
    });
    setScenarioState('generating');
    // API call will be wired in Issue 8
  };

  const isValid = Object.keys(errors).length === 0;
  const canGenerate = isValid && perimeter !== null;

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getSummaryText = (): string => {
    const intensityMap = {
      low: 'Low',
      moderate: 'Moderate',
      high: 'High',
      veryHigh: 'Very High',
      extreme: 'Extreme',
    };

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

    return `${stageMap[inputs.fireStage]} on a ${inputs.temperature}°C ${timeMap[inputs.timeOfDay]} with ${inputs.windSpeed} km/h ${inputs.windDirection} winds and ${inputs.humidity}% humidity. Fire Danger: ${formatRating(inputs.fireDangerRating)}. Intensity: ${intensityMap[inputs.intensity]}.`;
  };

  const getRatingClassName = (rating: FireDangerRating): string => {
    const classMap: Record<FireDangerRating, string> = {
      noRating: styles.ratingNoRating,
      moderate: styles.ratingModerate,
      high: styles.ratingHigh,
      extreme: styles.ratingExtreme,
      catastrophic: styles.ratingCatastrophic,
    };
    return `${styles.fdiRating} ${classMap[rating]}`;
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
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('fireDanger')}
          aria-expanded={sectionsOpen.fireDanger}
        >
          <h3 className={styles.sectionTitle}>Fire Danger Rating (AFDRS)</h3>
          <span className={styles.chevron}>{sectionsOpen.fireDanger ? '▼' : '▶'}</span>
        </button>

        {sectionsOpen.fireDanger && (
          <div className={styles.sectionContent}>
            {/* Fire Danger Rating Selector */}
            <div className={styles.field}>
              <label className={styles.label}>Select fire danger rating</label>
              <div className={styles.ratingSegmentedControl}>
                {(['noRating', 'moderate', 'high', 'extreme', 'catastrophic'] as const).map(
                  (rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange(rating)}
                      className={`${styles.ratingSegment} ${
                        inputs.fireDangerRating === rating ? styles.ratingSegmentActive : ''
                      }`}
                      style={{
                        backgroundColor: inputs.fireDangerRating === rating ? getRatingClassName(rating).split(' ')[1] : undefined,
                        color: inputs.fireDangerRating === rating ? 'white' : undefined,
                      }}
                      aria-pressed={inputs.fireDangerRating === rating}
                    >
                      {formatRating(rating)}
                    </button>
                  )
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                {getRatingDescription(inputs.fireDangerRating)}
              </p>
            </div>

            {/* Current Rating Display */}
            <div className={styles.fdiDisplay}>
              <span className={styles.fdiLabel}>Current rating:</span>
              <span className={getRatingClassName(inputs.fireDangerRating)}>
                {formatRating(inputs.fireDangerRating)}
              </span>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem', fontStyle: 'italic' }}>
              Selecting a rating sets typical weather conditions. You can adjust individual weather parameters below.
            </p>
          </div>
        )}
      </section>

      {/* Weather Section */}
      <section className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('weather')}
          aria-expanded={sectionsOpen.weather}
        >
          <h3 className={styles.sectionTitle}>Weather</h3>
          <span className={styles.chevron}>{sectionsOpen.weather ? '▼' : '▶'}</span>
        </button>

        {sectionsOpen.weather && (
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
                  updateInput(
                    'windDirection',
                    e.target.value as ScenarioInputs['windDirection']
                  )
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
        )}
      </section>

      {/* Fire Section */}
      <section className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('fire')}
          aria-expanded={sectionsOpen.fire}
        >
          <h3 className={styles.sectionTitle}>Fire</h3>
          <span className={styles.chevron}>{sectionsOpen.fire ? '▼' : '▶'}</span>
        </button>

        {sectionsOpen.fire && (
          <div className={styles.sectionContent}>
            {/* Fire Intensity */}
            <div className={styles.field}>
              <label className={styles.label}>Fire intensity</label>
              <div className={styles.segmentedControl}>
                {(['low', 'moderate', 'high', 'veryHigh', 'extreme'] as const).map(
                  (intensity) => (
                    <button
                      key={intensity}
                      onClick={() => updateInput('intensity', intensity)}
                      className={`${styles.segment} ${
                        inputs.intensity === intensity ? styles.segmentActive : ''
                      }`}
                      aria-pressed={inputs.intensity === intensity}
                    >
                      {intensity === 'veryHigh' ? 'Very High' : intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

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
          </div>
        )}
      </section>

      {/* Timing Section */}
      <section className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('timing')}
          aria-expanded={sectionsOpen.timing}
        >
          <h3 className={styles.sectionTitle}>Timing</h3>
          <span className={styles.chevron}>{sectionsOpen.timing ? '▼' : '▶'}</span>
        </button>

        {sectionsOpen.timing && (
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
        )}
      </section>

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
