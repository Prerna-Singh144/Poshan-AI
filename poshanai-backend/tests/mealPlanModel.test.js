import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import test from 'node:test';
import MealPlan from '../src/models/MealPlan.js';

function mealPlanDocument() {
  return new MealPlan({
    userId: new mongoose.Types.ObjectId(),
    reportId: new mongoose.Types.ObjectId(),
    title: 'Nutrition awareness plan',
    meals: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      mealType: 'lunch',
      items: [{
        foodName: 'Spinach',
        ifctCode: 'C033',
        quantityGrams: 100,
        nutrients: {
          calories: 24,
          protein: 2.14,
          carbs: 2.05,
          fat: 0.64,
          iron: 2.95,
          calcium: 82.29,
          vitaminD: 0.26,
          vitaminB12: null,
        },
      }],
    })),
    preferences: { dietType: 'veg', allergies: [], activityLevel: 'moderate' },
    disclaimer: 'PoshanAI provides nutrition awareness and suggestions.',
  });
}

test('defines indexed ownership references, requested meal fields, and status', () => {
  const indexedFields = MealPlan.schema.indexes().map(([fields]) => fields);
  assert.ok(indexedFields.some((fields) => fields.userId === 1));
  assert.ok(indexedFields.some((fields) => fields.reportId === 1));
  for (const field of ['userId', 'reportId', 'title', 'meals', 'preferences', 'disclaimer', 'status']) {
    assert.ok(MealPlan.schema.path(field), `expected MealPlan schema to define ${field}`);
  }
});

test('validates a seven-day plan and keeps unavailable vitamin B12 nullable', () => {
  const plan = mealPlanDocument();
  assert.equal(plan.validateSync(), undefined);
  assert.equal(plan.meals[0].items[0].nutrients.vitaminB12, null);
  assert.equal(plan.status, 'active');
});

test('rejects a plan that does not cover all seven days', () => {
  const plan = mealPlanDocument();
  plan.meals = plan.meals.slice(0, 6);
  assert.ok(plan.validateSync());
});
