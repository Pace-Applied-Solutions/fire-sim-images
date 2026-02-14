/**
 * Manual test script for fire danger calculations
 * Run with: node --loader ts-node/esm test-fdi-calculations.mts
 */

import {
  calculateFireDangerIndex,
  getFDIRating,
  getWeatherProfileForRating,
  getWeatherForFDI,
  validateWeatherParameters,
  formatRating,
  type FireDangerRating,
} from '../src/fireDangerCalculations.js';

console.log('=== Fire Danger Index Calculation Tests ===\n');

// Test 1: Calculate FDI for different scenarios
console.log('Test 1: FDI Calculation for Various Scenarios');
console.log('----------------------------------------------');

const scenarios = [
  { name: 'Moderate day', temp: 25, humidity: 40, wind: 15, df: 5.0 },
  { name: 'High fire danger', temp: 32, humidity: 25, wind: 30, df: 6.0 },
  { name: 'Very high fire danger', temp: 38, humidity: 18, wind: 45, df: 7.0 },
  { name: 'Extreme conditions', temp: 43, humidity: 8, wind: 80, df: 8.0 },
  { name: 'Catastrophic', temp: 46, humidity: 5, wind: 100, df: 10.0 },
];

scenarios.forEach((scenario) => {
  const fdi = calculateFireDangerIndex({
    temperature: scenario.temp,
    humidity: scenario.humidity,
    windSpeed: scenario.wind,
    droughtFactor: scenario.df,
  });
  const rating = getFDIRating(fdi);
  console.log(`  ${scenario.name}:`);
  console.log(`    Input: ${scenario.temp}°C, ${scenario.humidity}% RH, ${scenario.wind} km/h wind, DF=${scenario.df}`);
  console.log(`    Output: FDI = ${fdi.toFixed(1)}, Rating = ${formatRating(rating)}`);
  console.log();
});

// Test 2: Rating to weather profile
console.log('\nTest 2: Rating to Weather Profile Conversion');
console.log('----------------------------------------------');

const ratings: FireDangerRating[] = ['moderate', 'high', 'veryHigh', 'severe', 'extreme', 'catastrophic'];

ratings.forEach((rating) => {
  const profile = getWeatherProfileForRating(rating);
  const fdi = calculateFireDangerIndex(profile);
  console.log(`  ${formatRating(rating)}:`);
  console.log(`    Weather: ${profile.temperature}°C, ${profile.humidity}% RH, ${profile.windSpeed} km/h, DF=${profile.droughtFactor}`);
  console.log(`    Calculated FDI: ${fdi.toFixed(1)}`);
});

// Test 3: FDI to weather profile
console.log('\nTest 3: FDI to Weather Profile Conversion');
console.log('----------------------------------------------');

const testFDIs = [10, 20, 35, 60, 85, 110];

testFDIs.forEach((targetFDI) => {
  const profile = getWeatherForFDI(targetFDI);
  const actualFDI = calculateFireDangerIndex(profile);
  const rating = getFDIRating(targetFDI);
  console.log(`  Target FDI ${targetFDI}:`);
  console.log(`    Rating: ${formatRating(rating)}`);
  console.log(`    Generated weather: ${profile.temperature}°C, ${profile.humidity}% RH, ${profile.windSpeed} km/h`);
  console.log(`    Actual FDI from weather: ${actualFDI.toFixed(1)} (diff: ${Math.abs(actualFDI - targetFDI).toFixed(1)})`);
  console.log();
});

// Test 4: Weather validation warnings
console.log('\nTest 4: Weather Parameter Validation');
console.log('----------------------------------------------');

const validationTests = [
  { name: 'Normal conditions', temp: 30, humidity: 30, wind: 25, df: 5.0 },
  { name: 'Low temp + low humidity', temp: 12, humidity: 15, wind: 20, df: 5.0 },
  { name: 'High temp + high humidity', temp: 42, humidity: 55, wind: 20, df: 5.0 },
  { name: 'Very high wind', temp: 35, humidity: 20, wind: 95, df: 5.0 },
  { name: 'Catastrophic with calm winds', temp: 45, humidity: 5, wind: 10, df: 10.0 },
];

validationTests.forEach((test) => {
  const warnings = validateWeatherParameters({
    temperature: test.temp,
    humidity: test.humidity,
    windSpeed: test.wind,
    droughtFactor: test.df,
  });
  const fdi = calculateFireDangerIndex({
    temperature: test.temp,
    humidity: test.humidity,
    windSpeed: test.wind,
    droughtFactor: test.df,
  });
  console.log(`  ${test.name}:`);
  console.log(`    Parameters: ${test.temp}°C, ${test.humidity}% RH, ${test.wind} km/h`);
  console.log(`    FDI: ${fdi.toFixed(1)} (${formatRating(getFDIRating(fdi))})`);
  if (warnings.length > 0) {
    console.log(`    ⚠️  Warnings: ${warnings.join('; ')}`);
  } else {
    console.log(`    ✓ No warnings`);
  }
  console.log();
});

console.log('=== All Tests Complete ===');
