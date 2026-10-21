import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, beforeEach } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Report from '../src/models/Report.js';
import MealPlan from '../src/models/MealPlan.js';
import { env } from '../src/config/env.js';

let mongod;
let ipCounter = 1;

function nextIp() {
  return `10.0.4.${ipCounter++}`;
}

async function createAuthenticatedUser(name, email, password = 'password123') {
  const ip = nextIp();
  const res = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', ip)
    .send({ name, email, password, consent: true });
  return { token: res.body.data.accessToken, user: res.body.data.user, ip };
}

function createSampleMeals() {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    mealType: 'breakfast',
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

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await MealPlan.deleteMany({});
  await Report.deleteMany({});
  await User.deleteMany({});
});

describe('Security & Threat Mitigation Suite', () => {
  describe('Cross-Tenant Access Control (IDOR Prevention)', () => {
    it('blocks cross-tenant report access, deletion, and meal plan generation', async () => {
      const user1 = await createAuthenticatedUser('Tenant 1', 'tenant1@example.com');
      const user2 = await createAuthenticatedUser('Tenant 2', 'tenant2@example.com');

      // Tenant 1 creates a report
      const report1 = await Report.create({
        userId: user1.user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 2048,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'confirmed',
        extractedValues: [
          { nutrient: 'Iron', value: 35, unit: 'ug/dL', flag: 'low' },
        ],
      });

      // Tenant 1 creates a meal plan
      const mealPlan1 = await MealPlan.create({
        userId: user1.user.id,
        reportId: report1._id,
        targetDeficiencies: ['Iron'],
        planDurationDays: 7,
        meals: createSampleMeals(),
        disclaimer: 'Personalized awareness disclaimer.',
        status: 'draft',
      });

      // Tenant 2 attempts to read Tenant 1's report -> 404 (not 403, preventing ID existence probing)
      const getReportRes = await request(app)
        .get(`/api/reports/${report1._id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .set('X-Forwarded-For', user2.ip);

      assert.equal(getReportRes.status, 404);
      assert.equal(getReportRes.body.error.code, 'REPORT_NOT_FOUND');

      // Tenant 2 attempts to delete Tenant 1's report -> 404
      const deleteReportRes = await request(app)
        .delete(`/api/reports/${report1._id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .set('X-Forwarded-For', user2.ip);

      assert.equal(deleteReportRes.status, 404);
      assert.equal(deleteReportRes.body.error.code, 'REPORT_NOT_FOUND');

      // Verify report still intact in DB
      const intactReport = await Report.findById(report1._id);
      assert.ok(intactReport);

      // Tenant 2 attempts to read Tenant 1's meal plan -> 404
      const getPlanRes = await request(app)
        .get(`/api/mealplans/${mealPlan1._id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .set('X-Forwarded-For', user2.ip);

      assert.equal(getPlanRes.status, 404);
      assert.equal(getPlanRes.body.error.code, 'MEAL_PLAN_NOT_FOUND');

      // Tenant 2 attempts to mutate status of Tenant 1's meal plan -> 404
      const patchPlanRes = await request(app)
        .patch(`/api/mealplans/${mealPlan1._id}/status`)
        .set('Authorization', `Bearer ${user2.token}`)
        .set('X-Forwarded-For', user2.ip)
        .send({ status: 'completed' });

      assert.equal(patchPlanRes.status, 404);
      assert.equal(patchPlanRes.body.error.code, 'MEAL_PLAN_NOT_FOUND');

      // Verify status untouched
      const intactPlan = await MealPlan.findById(mealPlan1._id);
      assert.equal(intactPlan.status, 'draft');

      // Tenant 2 attempts to generate a meal plan using Tenant 1's reportId -> 404
      const generateRes = await request(app)
        .post('/api/mealplans/generate')
        .set('Authorization', `Bearer ${user2.token}`)
        .set('X-Forwarded-For', user2.ip)
        .send({ reportId: report1._id.toString() });

      assert.equal(generateRes.status, 404);
      assert.equal(generateRes.body.error.code, 'REPORT_NOT_FOUND');
    });
  });

  describe('JWT Algorithm Pinning (HS256)', () => {
    it('rejects tokens signed with algorithm "none" (algorithm confusion)', async () => {
      const { user, ip } = await createAuthenticatedUser('Token User', 'tokenuser@example.com');

      // Header: {"alg":"none","typ":"JWT"}, Payload: valid access claims
      const noneToken = jwt.sign(
        { sub: user.id, role: 'user', type: 'access' },
        '',
        { algorithm: 'none' },
      );

      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${noneToken}`)
        .set('X-Forwarded-For', ip);

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('rejects tokens signed with mismatched algorithm HS384', async () => {
      const { user, ip } = await createAuthenticatedUser('HS384 User', 'hs384@example.com');

      const hs384Token = jwt.sign(
        { sub: user.id, role: 'user', type: 'access' },
        env.jwtAccessSecret,
        { algorithm: 'HS384' },
      );

      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${hs384Token}`)
        .set('X-Forwarded-For', ip);

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('accepts tokens signed strictly with HS256', async () => {
      const { token, ip } = await createAuthenticatedUser('Valid JWT', 'valid_jwt@example.com');

      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  describe('Rate Limiting in Test Environment', () => {
    it('does not throttle API requests during tests', async () => {
      let lastResponse;
      for (let i = 0; i <= 100; i += 1) {
        lastResponse = await request(app)
          .get('/api/foods')
          .query({ q: 'egg' })
          .set('X-Forwarded-For', '198.51.100.43');
      }

      assert.equal(lastResponse.status, 200);
    });

    it('does not throttle auth requests during tests', async () => {
      const attackIp = '198.51.100.42';
      const victimEmail = 'target_user@example.com';

      for (let i = 0; i < 5; i++) {
        const attempt = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', attackIp)
          .send({ email: victimEmail, password: 'wrongpassword' });
        assert.equal(attempt.status, 401);
      }

      const sixthAttempt = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', attackIp)
        .send({ email: victimEmail, password: 'wrongpassword' });

      assert.equal(sixthAttempt.status, 401);
      assert.equal(sixthAttempt.body.error.code, 'INVALID_CREDENTIALS');
    });
  });

  describe('MongoDB Operator Injection Stripping', () => {
    it('strips $ operator injection from request body', async () => {
      const ip = nextIp();

      // Attacker attempts NoSQL injection with { email: { $gt: "" } }
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({
          email: { $gt: '' },
          password: 'password123',
        });

      // mongoSanitize removes '$gt', leaving { email: {} }
      // which fails Joi validation (email must be a string) -> 400 VALIDATION_ERROR
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('strips $ne operator from query and body parameters', async () => {
      const { token, ip } = await createAuthenticatedUser('Sanitize User', 'sanitize@example.com');

      const res = await request(app)
        .post('/api/mealplans/generate')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({
          reportId: { $ne: null },
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('enforces requireRole check rejecting unauthorized roles with 403 FORBIDDEN', async () => {
      const { requireRole } = await import('../src/middleware/authMiddleware.js');
      const middleware = requireRole('admin');

      // Test with user lacking 'admin' role
      let nextError = null;
      const req = { user: { id: '123', role: 'user' } };
      middleware(req, {}, (err) => { nextError = err; });

      assert.ok(nextError);
      assert.equal(nextError.statusCode, 403);
      assert.equal(nextError.code, 'FORBIDDEN');

      // Test with user having 'admin' role
      let allowed = false;
      const adminReq = { user: { id: '123', role: 'admin' } };
      middleware(adminReq, {}, (err) => { if (!err) allowed = true; });

      assert.equal(allowed, true);

      // Test without req.user
      let unauthError = null;
      middleware({}, {}, (err) => { unauthError = err; });
      assert.ok(unauthError);
      assert.equal(unauthError.statusCode, 401);
    });
  });

  describe('Health Check Endpoint', () => {
    it('reports health status and database connectivity', async () => {
      const res = await request(app).get('/health');
      assert.ok([200, 503].includes(res.status));
      assert.ok(res.body.checks);
      assert.equal(res.body.checks.mongo, true);
    });
  });
});
