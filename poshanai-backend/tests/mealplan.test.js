import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Report from '../src/models/Report.js';
import MealPlan from '../src/models/MealPlan.js';
import { retrieveFoodsForDeficiencies } from '../src/rag/ragService.js';

let mongod;
let ipCounter = 200;
let lastAiPrompt = '';

function nextIp() {
  return `10.0.3.${ipCounter++}`;
}

async function createAuthenticatedUser(name, email) {
  const ip = nextIp();
  const res = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', ip)
    .send({ name, email, password: 'password123', consent: true });
  return { token: res.body.data.accessToken, user: res.body.data.user, ip };
}

function mockAiCompletion() {
  const foods = retrieveFoodsForDeficiencies([{ nutrient: 'Iron' }], { dietType: 'veg' });
  const chosenCode = foods[0]?.ifctCode || 'G033';

  return {
    meals: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      mealType: 'breakfast',
      nutrientTargets: ['Iron'],
      items: [{
        ifctCode: chosenCode,
        foodName: foods.find((food) => food.ifctCode === chosenCode)?.foodName,
        quantityGrams: 100,
      }],
    })),
    disclaimer: 'This is nutrition information to discuss with a qualified professional.',
  };
}

function createSampleMeals() {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    mealType: 'breakfast',
    nutrientTargets: ['Iron'],
    items: [
      {
        foodName: 'Turmeric powder',
        ifctCode: 'G033',
        quantityGrams: 100,
        nutrients: {
          calories: 50,
          protein: 2,
          carbs: 10,
          fat: 1,
          iron: 15,
          calcium: 20,
          vitaminD: 0,
          vitaminB12: null,
        },
      },
    ],
  }));
}

async function createSampleMealPlan(userId, overrides = {}) {
  return MealPlan.create({
    userId,
    reportId: new mongoose.Types.ObjectId(),
    targetDeficiencies: ['Iron'],
    planDurationDays: 7,
    meals: createSampleMeals(),
    disclaimer: 'This meal plan is for nutritional awareness only.',
    status: 'draft',
    ...overrides,
  });
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Mock global fetch for OmniRoute AI completions
  mock.method(globalThis, 'fetch', async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    lastAiPrompt = requestBody.messages.find(({ role }) => role === 'user')?.content ?? '';
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiCompletion()),
            },
          },
        ],
      }),
    };
  });
});

after(async () => {
  mock.reset();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await MealPlan.deleteMany({});
  await Report.deleteMany({});
  await User.deleteMany({});
});

describe('Meal Plan API (/api/mealplans)', () => {
  describe('POST /api/mealplans/generate', () => {
    it('generates a 7-day meal plan for a valid, confirmed report', async () => {
      const { token, user, ip } = await createAuthenticatedUser('User A', 'user_a@example.com');

      const report = await Report.create({
        userId: user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 2048,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'confirmed',
        extractedValues: [
          {
            nutrient: 'Iron',
            value: 42,
            unit: 'ug/dL',
            flag: 'low',
            normalizedValue: 42,
            normalizedUnit: 'ug/dL',
          },
        ],
      });

      const res = await request(app)
        .post('/api/mealplans/generate')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({
          reportId: report._id.toString(),
          preferences: { dietType: 'veg' },
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data._id);
      assert.equal(res.body.data.status, 'draft');
      assert.equal(res.body.data.planDurationDays, 7);
      assert.equal(res.body.data.meals.length, 7);
      assert.ok(res.body.data.disclaimer);

      const inDb = await MealPlan.findById(res.body.data._id);
      assert.ok(inDb);
      assert.equal(inDb.userId.toString(), user.id);
      assert.deepEqual(inDb.meals[0].nutrientTargets, ['Iron']);
    });

    it('generates Iron-targeted meals and severe B12 clinician guidance from a low Iron and B12 report', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Deficiency User', 'deficiency@example.com');
      const report = await Report.create({
        userId: user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 2048,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'confirmed',
        extractedValues: [
          { nutrient: 'Iron', value: 8, unit: 'µg/dL', flag: 'low', normalizedValue: 8, normalizedUnit: 'µg/dL' },
          { nutrient: 'Vitamin B12', value: 120, unit: 'pg/mL', flag: 'low', normalizedValue: 120, normalizedUnit: 'pg/mL' },
        ],
      });

      const res = await request(app)
        .post('/api/mealplans/generate')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({ reportId: report._id.toString(), preferences: { dietType: 'veg' } });

      assert.equal(res.status, 201);
      assert.deepEqual(res.body.data.targetDeficiencies, ['Iron', 'Vitamin B12']);
      assert.ok(res.body.data.meals.every((meal) => meal.nutrientTargets.includes('Iron')));
      assert.match(res.body.data.supplementGuidance, /clinician-supervised vitamin B12 supplement/i);
      assert.match(res.body.data.disclaimer, /does not diagnose, treat, or replace advice/i);
      assert.match(lastAiPrompt, /The user is deficient in Iron \(LOW, 8 µg\/dL\); Vitamin B12 \(LOW, 120 pg\/mL\)/);
      assert.match(lastAiPrompt, /SEVERE VITAMIN B12 DEFICIENCY/);
      assert.match(lastAiPrompt, /nutrientTargets/);
    });

    it('rejects request when reportId is missing', async () => {
      const { token, ip } = await createAuthenticatedUser('User B', 'user_b@example.com');

      const res = await request(app)
        .post('/api/mealplans/generate')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('rejects generation when report belongs to another user (not owned)', async () => {
      const userA = await createAuthenticatedUser('User A2', 'user_a2@example.com');
      const userB = await createAuthenticatedUser('User B2', 'user_b2@example.com');

      const reportB = await Report.create({
        userId: userB.user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 2048,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'confirmed',
        extractedValues: [
          {
            nutrient: 'Iron',
            value: 35,
            unit: 'ug/dL',
            flag: 'low',
          },
        ],
      });

      // User A attempts to generate a plan from User B's report
      const res = await request(app)
        .post('/api/mealplans/generate')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('X-Forwarded-For', userA.ip)
        .send({
          reportId: reportB._id.toString(),
        });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'REPORT_NOT_FOUND');
    });
  });

  describe('GET /api/mealplans', () => {
    it('lists only the authenticated user meal plans with pagination', async () => {
      const userA = await createAuthenticatedUser('Owner', 'owner_mp@example.com');
      const userB = await createAuthenticatedUser('Stranger', 'stranger_mp@example.com');

      // Create dummy plans for User A
      for (let i = 0; i < 2; i++) {
        await createSampleMealPlan(userA.user.id, { targetDeficiencies: ['Iron'] });
      }

      // Create dummy plan for User B
      await createSampleMealPlan(userB.user.id, { targetDeficiencies: ['Vitamin D'] });

      // User A list
      const resA = await request(app)
        .get('/api/mealplans')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('X-Forwarded-For', userA.ip);

      assert.equal(resA.status, 200);
      assert.equal(resA.body.data.mealPlans.length, 2);
      assert.equal(resA.body.data.pagination.total, 2);

      // User B list
      const resB = await request(app)
        .get('/api/mealplans')
        .set('Authorization', `Bearer ${userB.token}`)
        .set('X-Forwarded-For', userB.ip);

      assert.equal(resB.status, 200);
      assert.equal(resB.body.data.mealPlans.length, 1);
      assert.equal(resB.body.data.pagination.total, 1);
    });
  });

  describe('GET /api/mealplans/:id', () => {
    it('enforces ownership check on retrieval', async () => {
      const userA = await createAuthenticatedUser('Owner 2', 'owner_mp2@example.com');
      const userB = await createAuthenticatedUser('Stranger 2', 'stranger_mp2@example.com');

      const planA = await createSampleMealPlan(userA.user.id);

      // Owner accesses plan
      const resOwner = await request(app)
        .get(`/api/mealplans/${planA._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .set('X-Forwarded-For', userA.ip);

      assert.equal(resOwner.status, 200);
      assert.equal(resOwner.body.data._id, planA._id.toString());

      // Stranger accesses plan -> 404
      const resStranger = await request(app)
        .get(`/api/mealplans/${planA._id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .set('X-Forwarded-For', userB.ip);

      assert.equal(resStranger.status, 404);
      assert.equal(resStranger.body.error.code, 'MEAL_PLAN_NOT_FOUND');
    });
  });

  describe('PATCH /api/mealplans/:id/status', () => {
    it('allows valid status transition to active and completed', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Status User', 'status_user@example.com');

      const plan = await createSampleMealPlan(user.id);

      // Transition to active
      const resActive = await request(app)
        .patch(`/api/mealplans/${plan._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({ status: 'active' });

      assert.equal(resActive.status, 200);
      assert.equal(resActive.body.data.status, 'active');

      const updatedActive = await MealPlan.findById(plan._id);
      assert.equal(updatedActive.status, 'active');

      // Transition to completed
      const resCompleted = await request(app)
        .patch(`/api/mealplans/${plan._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({ status: 'completed' });

      assert.equal(resCompleted.status, 200);
      assert.equal(resCompleted.body.data.status, 'completed');

      const updatedCompleted = await MealPlan.findById(plan._id);
      assert.equal(updatedCompleted.status, 'completed');
    });

    it('rejects invalid status transitions with 400 VALIDATION_ERROR', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Invalid Status User', 'inv_status@example.com');

      const plan = await createSampleMealPlan(user.id);

      const res = await request(app)
        .patch(`/api/mealplans/${plan._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({ status: 'archived_pending' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });
});
