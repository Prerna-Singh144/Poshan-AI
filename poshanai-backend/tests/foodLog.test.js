import assert from 'node:assert/strict';
import test, { before, beforeEach, mock } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  getFoodByCode, hasCalorieData, scaleNutrients, searchFoods, sumNutrients,
} from '../src/services/foodCatalog.service.js';

// ---------- catalog service ----------
test('food search: word-prefix matching, ranking, and no mid-word noise', () => {
  const rice = searchFoods('rice', 5).map((food) => food.foodName);
  assert.ok(rice.length > 0 && rice.every((name) => /rice/i.test(name)));
  assert.equal(searchFoods('Dal', 3)[0].foodName, 'Lentil dal');
  assert.deepEqual(searchFoods('oil', 5), []); // would otherwise match "boiled"
  assert.deepEqual(searchFoods('   ', 5), []);
  assert.deepEqual(searchFoods('zzzzqqq', 5), []);
  assert.deepEqual(searchFoods('(.*', 5), []); // regex characters are escaped
  const food = searchFoods('paneer', 1)[0];
  assert.deepEqual(Object.keys(food.nutrients), ['calories', 'protein', 'carbs', 'fat']);
});

test('food search never returns foods without calorie data', () => {
  assert.ok(searchFoods('oil', 20).every(hasCalorieData));
  assert.equal(hasCalorieData(getFoodByCode('A001')), true);
});

test('IFCT search includes configured serving units', () => {
  assert.deepEqual(getFoodByCode('M001').servingUnits, {
    small: 40, medium: 45, large: 50, defaultUnit: 'large',
  });
  assert.deepEqual(getFoodByCode('A015').servingUnits, {
    bowl: 150, cup: 200, defaultUnit: 'cup',
  });
  assert.equal(searchFoods('banana', 1)[0].servingUnits.defaultUnit, 'medium');
});

test('scaleNutrients scales per-100 g values to the portion and rounds to 1 decimal', () => {
  assert.deepEqual(
    scaleNutrients({ calories: 356.12, protein: 14.59, carbs: 59.98, fat: 5.74 }, 150),
    { calories: 534.2, protein: 21.9, carbs: 90, fat: 8.6 },
  );
  assert.deepEqual(sumNutrients([{ calories: 100.04, protein: 1, carbs: 2, fat: 3 }, { calories: 50.01 }]),
    { calories: 150.1, protein: 1, carbs: 2, fat: 3 });
});

// ---------- HTTP routes (Mongo-free: the FoodLog model is replaced by an in-memory fake) ----------
let rows = [];
class FakeFoodLog {
  constructor(data) { this.data = data; }
  toObject() { return { _id: this.data._id, createdAt: new Date(this.data.seq), ...this.data }; }
  static async countDocuments({ userId, date }) {
    return rows.filter((r) => r.userId === String(userId) && r.date === date).length;
  }
  static async create(data) {
    const row = new FakeFoodLog({ ...data, userId: String(data.userId), _id: `log-${rows.length + 1}`, seq: rows.length + 1 });
    rows.push(row.data);
    return row;
  }
  static find({ userId, date }) {
    const found = rows.filter((r) => r.userId === String(userId) && r.date === date).map((r) => new FakeFoodLog(r));
    return { sort: async () => found };
  }
}

let app;
let tokenA;
let tokenB;
const today = new Date().toISOString().slice(0, 10);
const shiftDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const mint = (env, id) => jwt.sign({ sub: id, role: 'user', type: 'access' }, env.jwtAccessSecret, { algorithm: 'HS256', expiresIn: '5m' });

before(async () => {
  mock.module('../src/models/FoodLog.js', { defaultExport: FakeFoodLog });
  const { env } = await import('../src/config/env.js');
  tokenA = mint(env, 'aaaaaaaaaaaaaaaaaaaaaaaa');
  tokenB = mint(env, 'bbbbbbbbbbbbbbbbbbbbbbbb');
  app = (await import('../src/app.js?food-log')).default;
});
beforeEach(() => { rows = []; });

const add = (token, body) => request(app).post('/api/logs/add-food').set('Authorization', `Bearer ${token}`).send(body);
const day = (token, date = today) => request(app).get('/api/logs/today').query({ date }).set('Authorization', `Bearer ${token}`);
const search = (token, q) => request(app).get('/api/foods/search').query({ q }).set('Authorization', `Bearer ${token}`);

test('food catalogue is public while user food logs require authentication', async () => {
  assert.equal((await request(app).get('/api/foods?q=egg')).status, 200);
  assert.equal((await request(app).get('/api/foods/search?q=rice')).status, 200);
  assert.equal((await request(app).post('/api/logs/add-food').send({})).status, 401);
  assert.equal((await request(app).get(`/api/logs/today?date=${today}`)).status, 401);
});

test('GET /api/foods?q=egg returns serving units and keeps the search alias', async () => {
  const res = await request(app).get('/api/foods').query({ q: 'egg' });
  assert.equal(res.status, 200);
  const egg = res.body.data.find((food) => food.ifctCode === 'M001');
  assert.deepEqual(egg.servingUnits, { small: 40, medium: 45, large: 50, defaultUnit: 'large' });
  assert.equal((await request(app).get('/api/foods/search').query({ q: 'rice' })).status, 200);
  assert.equal((await request(app).get('/api/foods')).status, 400);
});

test('GET /api/foods/search returns IFCT foods and validates the query', async () => {
  const res = await search(tokenA, 'rice');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every((f) => f.ifctCode && f.calories > 0 && f.nutrients.calories > 0));
  assert.equal((await search(tokenA, 'r')).status, 400);
  assert.equal((await request(app).get('/api/foods/search').set('Authorization', `Bearer ${tokenA}`)).status, 400);
});

test('POST /api/logs/add-food computes nutrition server-side and returns running totals', async () => {
  const res = await add(tokenA, { ifctCode: 'A001', grams: 150, date: today });
  assert.equal(res.status, 201);
  assert.deepEqual(
    (({ calories, protein, carbs, fat }) => ({ calories, protein, carbs, fat }))(res.body.data.entry),
    { calories: 534.2, protein: 21.9, carbs: 90, fat: 8.6 },
  );
  assert.equal(res.body.data.entry.foodName, 'Amaranth seed, black');
  await add(tokenA, { ifctCode: 'A001', grams: 50, date: today });
  const list = await day(tokenA);
  assert.equal(list.body.data.entries.length, 2);
  assert.equal(list.body.data.totals.calories, 712.3);
});

test('add-food converts serving quantity to grams and calculates IFCT macros for the final portion', async () => {
  const res = await add(tokenA, { ifctCode: 'M001', quantity: 2, measure: 'large', date: today });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.entry.grams, 100);
  assert.equal(rows[0].grams, 100);
  assert.equal(res.body.data.entry.quantity, 2);
  assert.equal(res.body.data.entry.measure, 'large');
  assert.equal(res.body.data.entry.calories, 134.8);
  assert.equal(res.body.data.entry.protein, 13.3);
  assert.equal(res.body.data.entry.carbs, 0);
  assert.equal(res.body.data.entry.fat, 9.2);
  assert.equal((await add(tokenA, { ifctCode: 'M001', quantity: 2, measure: 'giant', date: today })).status, 400);
  assert.equal((await add(tokenA, { ifctCode: 'A001', quantity: 2, measure: 'large', date: today })).status, 400);
});

test('add-food rejects client-supplied nutrition/userId, bad grams, bad dates and unknown foods', async () => {
  const ok = { ifctCode: 'A001', grams: 100, date: today };
  assert.equal((await add(tokenA, { ifctCode: 'A001', date: today })).status, 400);
  assert.equal((await add(tokenA, { ...ok, calories: 1 })).status, 400);
  assert.equal((await add(tokenA, { ...ok, userId: 'bbbbbbbbbbbbbbbbbbbbbbbb' })).status, 400);
  for (const grams of [0, -5, 2001, 'abc']) assert.equal((await add(tokenA, { ...ok, grams })).status, 400, `grams ${grams}`);
  for (const date of ['2026-02-31', 'yesterday', shiftDays(5), shiftDays(-5)]) assert.equal((await add(tokenA, { ...ok, date })).status, 400, `date ${date}`);
  assert.equal((await add(tokenA, { ...ok, ifctCode: 'ZZZ999' })).body.error.code, 'FOOD_NOT_FOUND');
  assert.equal(rows.length, 0);
});

test('add-food rejects foods whose IFCT record has no calorie data', async () => {
  const oil = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/ifct_2017.json', import.meta.url))).find((f) => !f.nutrients.calories);
  const res = await add(tokenA, { ifctCode: oil.ifctCode, grams: 10, date: today });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'FOOD_DATA_INCOMPLETE');
});

test('ownership: users only see their own entries', async () => {
  await add(tokenA, { ifctCode: 'A001', grams: 100, date: today });
  assert.equal((await day(tokenB)).body.data.entries.length, 0);
  await add(tokenB, { ifctCode: 'A001', grams: 20, date: today });
  assert.equal((await day(tokenA)).body.data.entries.length, 1);
  assert.equal((await day(tokenB)).body.data.entries[0].grams, 20);
});

test('daily log is capped at 100 entries', async () => {
  for (let i = 0; i < 100; i += 1) rows.push({ userId: 'aaaaaaaaaaaaaaaaaaaaaaaa', date: today, seq: i, _id: `x${i}` });
  const res = await add(tokenA, { ifctCode: 'A001', grams: 10, date: today });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'DAILY_LOG_LIMIT');
});
