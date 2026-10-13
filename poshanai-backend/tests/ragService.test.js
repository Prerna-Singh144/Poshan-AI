import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMealPlanPrompt,
  getMedicalDisclaimer,
  retrieveFoodsForDeficiencies,
} from '../src/rag/ragService.js';

test('provides IFCT records with serving size and preserves unreported vitamin B12 as null', () => {
  const foods = retrieveFoodsForDeficiencies([], { dietType: 'nonveg' });
  assert.equal(foods.length, 15);
  assert.ok(foods.every((food) => food.servingSize === 100));
  assert.ok(foods.every((food) => food.nutrients.vitaminB12 === null));
  assert.ok(foods.some((food) => food.ifctCode === 'A015' && food.foodName === 'Rice, raw, milled'));
});

test('filters IFCT records by vegetarian diet, allergy, and Uttarakhand region', () => {
  const foods = retrieveFoodsForDeficiencies(
    [{ nutrient: 'Iron', severity: 'reported_low' }],
    { dietType: 'veg', allergies: ['legumes'], region: 'Uttarakhand' },
  );
  assert.ok(foods.length > 0);
  assert.ok(foods.every((food) => ['B023', 'C003', 'D009', 'D065', 'E009', 'F007', 'F011', 'J001'].includes(food.ifctCode)));
  assert.ok(foods.every((food) => food.ifctCode !== 'B023'));
});

test('builds a prompt from validated preferences and includes the required disclaimer provider', () => {
  const foods = retrieveFoodsForDeficiencies([], { dietType: 'veg' });
  const prompt = buildMealPlanPrompt({ dietType: 'veg' }, [], foods);
  assert.match(prompt, /Return only a JSON object/);
  assert.match(prompt, /Vitamin B12 is unavailable/);
  assert.match(getMedicalDisclaimer(), /does not diagnose, treat, or replace advice/);
});
