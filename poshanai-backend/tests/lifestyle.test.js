import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import LifestyleProfile from '../src/models/LifestyleProfile.js';
import User from '../src/models/User.js';
import { testRules, validateTestRules } from '../src/services/testRules.js';

let mongod;
let ipCounter = 190;
const validOnboarding = {
  dietType: 'veg',
  mealsPerDay: 3,
  sleepHours: 7,
  sleepTime: 'regular',
  sunExposure: 'moderate',
  activityLevel: 'moderate',
  habits: ['none'],
  symptoms: ['none'],
  consent: true,
};

async function registerUser() {
  const ip = `10.0.3.${ipCounter++}`;
  const response = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', ip)
    .send({
      name: 'Lifestyle Tester',
      email: `lifestyle-${ipCounter}@example.com`,
      password: 'password123',
      consent: true,
    });
  return { token: response.body.data.accessToken, ip };
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
  await Promise.all([LifestyleProfile.deleteMany({}), User.deleteMany({})]);
});

test('requires a valid access token for lifestyle onboarding', async () => {
  const response = await request(app).post('/api/lifestyle/onboarding').send({ age: 30 });
  assert.equal(response.status, 401);
});

test('overwrites the authenticated user profile on repeat submissions without duplicates or data leaks', async () => {
  const { token, ip } = await registerUser();
  const first = await request(app)
    .post('/api/lifestyle/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send({ ...validOnboarding, age: 30, gender: 'female', weightKg: 62, heightCm: 165, region: 'North' });
  assert.equal(first.status, 200);

  const second = await request(app)
    .post('/api/lifestyle/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send({ ...validOnboarding, age: 31, dietType: 'vegan' });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.profile.id, first.body.data.profile.id);
  assert.deepEqual(second.body.data.profile.age, 31);
  assert.equal(second.body.data.profile.dietType, 'vegan');
  assert.equal(second.body.data.profile.consent, true);
  assert.equal(Object.hasOwn(second.body.data.profile, 'gender'), false);
  assert.equal(Object.hasOwn(second.body.data.profile, 'userId'), false);
  assert.equal(Object.hasOwn(second.body.data.profile, 'email'), false);
  assert.equal(Object.hasOwn(second.body.data.profile, 'passwordHash'), false);
  assert.equal(await LifestyleProfile.countDocuments(), 1);
});

test('rejects unknown questionnaire fields and invalid profile values', async () => {
  const { token, ip } = await registerUser();
  const response = await request(app)
    .post('/api/lifestyle/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send({ ...validOnboarding, age: 12, smoking: true });
  assert.equal(response.status, 400);
  assert.equal(await LifestyleProfile.countDocuments(), 0);
});

test('test rules are suggestions to discuss with a doctor and reject claim-like rule wording', () => {
  assert.match(testRules.disclaimer, /suggestions to discuss with a doctor/i);
  assert.deepEqual(testRules.rules, []);
  assert.throws(() => validateTestRules({
    version: 1,
    disclaimer: 'Suggestions to discuss with a doctor.',
    rules: [{ id: 'unsafe', suggestion: 'This test diagnoses a deficiency.' }],
  }), /doctor-discussion suggestion/);
  assert.throws(() => validateTestRules({
    version: 1,
    disclaimer: 'Suggestions to discuss with a doctor.',
    medicalClaim: 'This test diagnoses a deficiency.',
    rules: [],
  }), /unsupported top-level field/);
});
