import { describe, it, expect } from 'vitest';
import { getEffectiveVegetationType } from '../constants.js';
import type { GeoContext } from '../types.js';

describe('getEffectiveVegetationType', () => {
  it('should return manual vegetation type when set', () => {
    const geoContext: Partial<GeoContext> = {
      vegetationType: 'Wet Sclerophyll Forest',
      manualVegetationType: 'Grassland',
      isVegetationManuallySet: true,
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Grassland');
  });

  it('should return auto-detected vegetation type when manual is not set', () => {
    const geoContext: Partial<GeoContext> = {
      vegetationType: 'Dry Sclerophyll Forest',
      isVegetationManuallySet: false,
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Dry Sclerophyll Forest');
  });

  it('should return auto-detected vegetation type when manual override is undefined', () => {
    const geoContext: Partial<GeoContext> = {
      vegetationType: 'Heath',
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Heath');
  });

  it('should return default fallback when geoContext is null', () => {
    const result = getEffectiveVegetationType(null);
    expect(result).toBe('Dry Sclerophyll Forest');
  });

  it('should return default fallback when geoContext is undefined', () => {
    const result = getEffectiveVegetationType(undefined);
    expect(result).toBe('Dry Sclerophyll Forest');
  });

  it('should prioritize manual override even if empty string', () => {
    const geoContext: Partial<GeoContext> = {
      vegetationType: 'Rainforest',
      manualVegetationType: '',
    };

    // Empty string is falsy, so should fall back to auto-detected
    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Rainforest');
  });

  it('should handle manual override when auto-detected is empty', () => {
    const geoContext: Partial<GeoContext> = {
      vegetationType: '',
      manualVegetationType: 'Plantation Forest',
      isVegetationManuallySet: true,
    };

    const result = getEffectiveVegetationType(geoContext);
    expect(result).toBe('Plantation Forest');
  });
});
