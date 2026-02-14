#!/usr/bin/env node
/**
 * Quick validation of fire danger calculations
 */

import {
  calculateFireDangerIndex,
  getFDIRating,
  formatRating,
} from './dist/fireDangerCalculations.js';

console.log('=== Fire Danger Index Validation ===\n');

// Test scenarios with expected approximate FDI ranges
const tests = [
  { name: 'Mild day', params: { temperature: 22, humidity: 50, windSpeed: 12, droughtFactor: 3.0 }, expectedRating: 'moderate' },
  { name: 'High danger', params: { temperature: 32, humidity: 25, windSpeed: 30, droughtFactor: 5.0 }, expectedRating: 'high' },
  { name: 'Very high danger', params: { temperature: 38, humidity: 18, windSpeed: 45, droughtFactor: 6.0 }, expectedRating: 'veryHigh' },
  { name: 'Extreme', params: { temperature: 43, humidity: 8, windSpeed: 80, droughtFactor: 8.0 }, expectedRating: 'catastrophic' },
];

let passed = 0;
let failed = 0;

tests.forEach((test) => {
  const fdi = calculateFireDangerIndex(test.params);
  const rating = getFDIRating(fdi);
  const pass = rating === test.expectedRating;

  console.log(`${pass ? '✓' : '✗'} ${test.name}:`);
  console.log(`  Weather: ${test.params.temperature}°C, ${test.params.humidity}% RH, ${test.params.windSpeed} km/h, DF=${test.params.droughtFactor}`);
  console.log(`  FDI: ${fdi.toFixed(1)}, Rating: ${formatRating(rating)}`);
  console.log(`  Expected: ${formatRating(test.expectedRating)}, Got: ${formatRating(rating)}`);
  console.log();

  if (pass) passed++;
  else failed++;
});

console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
