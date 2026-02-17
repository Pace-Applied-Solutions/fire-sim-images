import { describe, it, expect } from 'vitest';
import { getEffectiveVegetationType, DEFAULT_VEGETATION_TYPE } from '../constants.js';

describe('getEffectiveVegetationType', () => {
  it('should return manual vegetation type when set', () => {
    const geoContext = {
      vegetationType: 'Wet Sclerophyll Forest',
      manualVegetationType: 'Grassland',
      isVegetationManuallySet: true,
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Grassland');
  });

  it('should return auto-detected vegetation type when manual is not set', () => {
    const geoContext = {
      vegetationType: 'Dry Sclerophyll Forest',
      isVegetationManuallySet: false,
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Dry Sclerophyll Forest');
  });

  it('should return auto-detected vegetation type when manual override is undefined', () => {
    const geoContext = {
      vegetationType: 'Heath',
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Heath');
  });

  it('should return default fallback when geoContext is null', () => {
    const result = getEffectiveVegetationType(null);
    expect(result).toBe(DEFAULT_VEGETATION_TYPE);
  });

  it('should return default fallback when geoContext is undefined', () => {
    const result = getEffectiveVegetationType(undefined);
    expect(result).toBe(DEFAULT_VEGETATION_TYPE);
  });

  it('should prioritize manual override even if empty string', () => {
    const geoContext = {
      vegetationType: 'Rainforest',
      manualVegetationType: '',
    };

    // Empty string is falsy, so should fall back to auto-detected
    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Rainforest');
  });

  it('should handle manual override when auto-detected is empty', () => {
    const geoContext = {
      vegetationType: '',
      manualVegetationType: 'Plantation Forest',
      isVegetationManuallySet: true,
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Plantation Forest');
  });
});
