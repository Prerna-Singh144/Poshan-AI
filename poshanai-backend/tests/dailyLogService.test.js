import assert from 'node:assert/strict';
import test from 'node:test';
import { compareMicronutrientsToRda, sumMicronutrients } from '../src/services/dailyLogService.js';
import { MICRONUTRIENTS } from '../src/config/constants.js';

test('marks nutrients missing from IFCT as unavailable in daily-log RDA progress', () => {
  const totals = sumMicronutrients([{ micronutrients: {
    vitaminA: null,
    vitaminC: null,
    vitaminD: 120,
    vitaminE: null,
    vitaminK: null,
    vitaminB1: null,
    vitaminB2: null,
    vitaminB3: null,
    vitaminB6: null,
    vitaminB9: null,
    vitaminB12: null,
    iron: 4,
    calcium: 100,
    zinc: null,
    magnesium: null,
    potassium: null,
  } }]);
  const progress = compareMicronutrientsToRda(totals, { age: 30, gender: 'female' });

  assert.equal(progress.length, MICRONUTRIENTS.length);
  assert.equal(progress.find(({ key }) => key === 'iron').dataUnavailable, false);
  assert.equal(progress.find(({ key }) => key === 'vitaminD').dataUnavailable, false);
  assert.equal(progress.find(({ key }) => key === 'vitaminB12').dataUnavailable, true);
  assert.equal(progress.find(({ key }) => key === 'vitaminA').progressPercent, null);
});

test('reports IFCT gaps as unavailable even before a food is logged', () => {
  const progress = compareMicronutrientsToRda(sumMicronutrients(), { age: 30, gender: 'female' });
  assert.equal(progress.find(({ key }) => key === 'vitaminB12').dataUnavailable, true);
  assert.equal(progress.find(({ key }) => key === 'vitaminA').consumed, null);
  assert.equal(progress.find(({ key }) => key === 'iron').dataUnavailable, false);
});
