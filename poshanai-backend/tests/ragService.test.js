import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMealPlanPrompt,
  getMedicalDisclaimer,
  retrieveFoodsForDeficiencies,
} from '../src/rag/ragService.js';
import { hasSevereB12Deficiency } from '../src/rag/promptBuilder.js';

test('provides IFCT records with serving size and preserves unreported vitamin B12 as null', () => {
  const foods = retrieveFoodsForDeficiencies([], { dietType: 'nonveg' });
  assert.ok(foods.length >= 20 && foods.length <= 30);
  assert.ok(foods.every((food) => food.servingSize === 100));
  assert.ok(foods.every((food) => food.nutrients.vitaminB12 === null));
  assert.ok(foods.some((food) => food.ifctCode && food.foodName));
});

test('filters IFCT records by vegetarian diet, allergy, and Uttarakhand region', () => {
  const foods = retrieveFoodsForDeficiencies(
    [{ nutrient: 'Iron', severity: 'reported_low' }],
    { dietType: 'veg', allergies: ['legumes'], region: 'Uttarakhand' },
  );
  assert.ok(foods.length >= 20 && foods.length <= 30);
  assert.ok(foods.every((food) => food.category !== 'Grain Legumes' && food.ifctCode !== 'B023'));
});

test('builds a prompt from validated preferences and includes the required disclaimer provider', () => {
  const foods = retrieveFoodsForDeficiencies([], { dietType: 'veg' });
  const prompt = buildMealPlanPrompt({ dietType: 'veg' }, [], foods);
  assert.match(prompt, /Return only strict JSON/);
  assert.match(prompt, /"age":null/);
  assert.match(prompt, /"weight":null/);
  assert.match(prompt, /Allowed IFCT foods/);
  assert.match(prompt, /"ifctCode"/);
  assert.match(prompt, /"foodName"/);
  assert.match(prompt, /Generate meals covering each day from 1 through 7/);
  assert.match(prompt, /nutrientTargets/);
  assert.match(getMedicalDisclaimer(), /does not diagnose, treat, or replace advice/);
});

test('targets confirmed Iron and severe Vitamin B12 deficiencies without inventing IFCT values', () => {
  const deficiencies = [
    { nutrient: 'Iron', value: 8, unit: 'µg/dL', normalizedValue: 8, normalizedUnit: 'µg/dL', flag: 'low' },
    { nutrient: 'Vitamin B12', value: 120, unit: 'pg/mL', normalizedValue: 120, normalizedUnit: 'pg/mL', flag: 'low' },
  ];
  const foods = retrieveFoodsForDeficiencies(deficiencies, { dietType: 'veg' });
  const prompt = buildMealPlanPrompt({ dietType: 'veg' }, deficiencies, foods);

  assert.equal(hasSevereB12Deficiency(deficiencies), true);
  assert.match(prompt, /The user is deficient in Iron \(LOW, 8 µg\/dL\); Vitamin B12 \(LOW, 120 pg\/mL\)/);
  assert.match(prompt, /specifically target these deficiencies/);
  assert.match(prompt, /For every meal, explicitly name which nutrient it targets/);
  assert.match(prompt, /below 150 pg\/mL/);
  assert.match(prompt, /clinician-supervised vitamin B12 supplement/);
  assert.match(prompt, /"nutrientTargets": \[/);
  assert.ok(foods.every((food) => food.nutrients.vitaminB12 === null));
});

test('returns vegetarian foods high in Vitamin D or Iron for Vitamin D + Iron deficiency', () => {
  const foods = retrieveFoodsForDeficiencies(
    [{ nutrient: 'Vitamin D' }, { nutrient: 'Iron' }],
    { dietType: 'veg' },
  );

  // Verify returns top 20-30 foods
  assert.ok(foods.length >= 20 && foods.length <= 30);

  // Verify returned foods are all vegetarian
  const nonVegCategories = [
    'Egg and Egg Products',
    'Poultry',
    'Animal Meat',
    'Marine Fish',
    'Marine Shellfish',
    'Marine Mollusks',
    'Fresh Water Fish and Shellfish',
  ];
  for (const food of foods) {
    assert.ok(
      !nonVegCategories.includes(food.category),
      `Expected ${food.foodName} (${food.category}) to be vegetarian`,
    );
  }

  // Verify they're high in Vitamin D or Iron
  for (const food of foods) {
    const isHighVitD = food.nutrients.vitaminD > 0;
    const isHighIron = food.nutrients.iron >= 1.5;
    assert.ok(
      isHighVitD || isHighIron,
      `Expected ${food.foodName} to be rich in Vitamin D or Iron (VitD=${food.nutrients.vitaminD}, Iron=${food.nutrients.iron})`,
    );
  }
});
