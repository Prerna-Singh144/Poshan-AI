import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import DailyLog from '../src/models/DailyLog.js';
import Expert from '../src/models/Expert.js';
import ExpertAppointment from '../src/models/ExpertAppointment.js';
import SupplementLog from '../src/models/SupplementLog.js';
import User from '../src/models/User.js';
import { MICRONUTRIENTS } from '../src/config/constants.js';

let mongod;
let ipCounter = 145;

async function registerUser({ age = 30, gender = 'female' } = {}) {
  const ip = `10.0.4.${ipCounter++}`;
  const response = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', ip)
    .send({
      name: 'Nutrition Tester',
      email: `nutrition-${ipCounter}@example.com`,
      password: 'password123',
      age,
      gender,
      consent: true,
    });
  assert.equal(response.status, 201);
  return { token: response.body.data.accessToken, ip, userId: response.body.data.user.id };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Expert.init(), ExpertAppointment.init()]);
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    DailyLog.deleteMany({}),
    Expert.deleteMany({}),
    ExpertAppointment.deleteMany({}),
    SupplementLog.deleteMany({}),
    User.deleteMany({}),
  ]);
});

test('today log returns every micronutrient with profile-specific RDA comparison', async () => {
  const { token, ip } = await registerUser();
  const addedFood = await request(app)
    .post('/api/daily-logs/add-food')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send({ mealType: 'breakfast', ifctCode: 'A001', quantityGrams: 100 });
  assert.equal(addedFood.status, 201);
  const response = await request(app)
    .get('/api/daily-logs/today')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.micronutrients.rdaComparison.length, MICRONUTRIENTS.length);
  const vitaminA = response.body.data.micronutrients.rdaComparison.find(({ key }) => key === 'vitaminA');
  assert.equal(vitaminA.rda, 840);
  assert.equal(vitaminA.status, 'unknown');
  assert.equal(vitaminA.dataUnavailable, true);
  assert.equal(response.body.data.micronutrients.totals.iron, 9.33);
});

test('expert list supports filters and authenticated booking rejects an already booked slot', async () => {
  const { token, ip } = await registerUser();
  const scheduledAt = new Date(Date.now() + 86_400_000);
  const expert = await Expert.create({
    name: 'Example Dietitian',
    role: 'dietitian',
    experienceYears: 8,
    specialization: 'Sports nutrition',
    availability: [scheduledAt],
    rating: 4.8,
    fees: 1500,
  });

  const listing = await request(app)
    .get('/api/experts')
    .query({ role: 'dietitian', specialization: 'sports', minExperience: 5, minRating: 4, maxFees: 2000 })
    .set('X-Forwarded-For', ip);
  assert.equal(listing.status, 200);
  assert.equal(listing.body.data.count, 1);
  assert.equal(listing.body.data.experts[0].id, expert.id);

  const booking = await request(app)
    .post('/api/experts/book')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send({ expertId: expert.id, scheduledAt: scheduledAt.toISOString() });
  assert.equal(booking.status, 201);

  const duplicate = await request(app)
    .post('/api/experts/book')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', ip)
    .send({ expertId: expert.id, scheduledAt: scheduledAt.toISOString() });
  assert.equal(duplicate.status, 409);
  assert.equal(await ExpertAppointment.countDocuments(), 1);
});
