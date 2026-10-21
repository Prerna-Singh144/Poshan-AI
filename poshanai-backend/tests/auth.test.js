import assert from 'node:assert/strict';
import test, { describe, it, before, after, beforeEach } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { env } from '../src/config/env.js';

let mongod;
let ipCounter = 10;

function nextIp() {
  return `10.0.1.${((ipCounter++ - 1) % 250) + 1}`;
}

function assertRefreshCookie(res) {
  const cookies = res.headers['set-cookie'] ?? [];
  const cookie = cookies.find((value) => value.startsWith(`${env.refreshCookieName}=`));
  assert.ok(cookie, 'refresh cookie should be present');
  assert.match(cookie, /;\s*Path=\//i);
  assert.match(cookie, /;\s*HttpOnly(?:;|$)/i);
  assert.match(cookie, /;\s*SameSite=Lax(?:;|$)/i);
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
  await User.deleteMany({});
});

describe('Authentication API (/api/auth)', () => {
  describe('POST /api/auth/register', () => {
    it('registers a user with valid credentials and sets refresh cookie', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Alice Smith', email: 'alice@example.com', password: 'password123', consent: true });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.equal(res.body.data.user.email, 'alice@example.com');
      assert.equal(res.body.data.user.name, 'Alice Smith');
      assert.equal(res.body.data.user.onboardingCompleted, false);

      assertRefreshCookie(res);
    });

    it('rejects duplicate email registration with 409 EMAIL_IN_USE', async () => {
      const ip = nextIp();
      await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Alice', email: 'alice@example.com', password: 'password123', consent: true });

      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Alice Duplicate', email: 'alice@example.com', password: 'password123', consent: true });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'EMAIL_IN_USE');
    });

    it('rejects weak password with 400 VALIDATION_ERROR', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Bob', email: 'bob@example.com', password: 'short', consent: true });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('rejects missing required fields with 400 VALIDATION_ERROR', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ email: 'noname@example.com' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('rejects registration without consent with 400', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'No Consent', email: 'noconsent@example.com', password: 'password123' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.message, 'You must accept the privacy policy');
    });

    it('rejects registration with consent: false with 400', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'False Consent', email: 'falseconsent@example.com', password: 'password123', consent: false });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.message, 'You must accept the privacy policy');
    });

    it('registers with consent: true and stores consent data in database', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Consent User', email: 'consent@example.com', password: 'password123', consent: true });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.consent.given, true);
      assert.equal(res.body.data.user.consent.version, '1.0');

      const userInDb = await User.findOne({ email: 'consent@example.com' });
      assert.ok(userInDb);
      assert.equal(userInDb.consent.given, true);
      assert.ok(userInDb.consent.givenAt instanceof Date);
      assert.equal(userInDb.consent.version, '1.0');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const ip = nextIp();
      await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Charlie', email: 'charlie@example.com', password: 'password123', consent: true });

      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'charlie@example.com', password: 'password123' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.equal(res.body.data.user.email, 'charlie@example.com');
      assertRefreshCookie(res);
    });

    it('rejects wrong password with 401 INVALID_CREDENTIALS', async () => {
      const ip = nextIp();
      await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Charlie', email: 'charlie@example.com', password: 'password123', consent: true });

      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'charlie@example.com', password: 'wrongpassword' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    });

    it('rejects unknown email with 401 INVALID_CREDENTIALS', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'ghost@example.com', password: 'password123' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    });

    it('does not rate limit login attempts in the test environment', async () => {
      const ip = nextIp();
      const targetEmail = 'ratelimit@example.com';
      // Rate limiting is disabled during tests to avoid cross-suite state leakage.
      for (let i = 0; i < 5; i++) {
        const attempt = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', ip)
          .send({ email: targetEmail, password: 'wrong' });
        assert.equal(attempt.status, 401);
      }

      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: targetEmail, password: 'wrong' });

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('refreshes token with valid refresh cookie', async () => {
      const ip = nextIp();
      const regRes = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Diana', email: 'diana@example.com', password: 'password123', consent: true });

      assert.equal(regRes.status, 201);
      const cookieHeader = regRes.headers['set-cookie'];
      assert.ok(cookieHeader);
      const refreshCookie = cookieHeader.find((c) => c.startsWith(`${env.refreshCookieName}=`));
      assert.ok(refreshCookie);

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('X-Forwarded-For', ip)
        .set('Cookie', [refreshCookie]);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);

      const newCookies = res.headers['set-cookie'];
      assert.ok(newCookies);
      assert.ok(newCookies.some((c) => c.startsWith(`${env.refreshCookieName}=`)));
    });

    it('rejects expired refresh token with 401 REFRESH_TOKEN_INVALID', async () => {
      const ip = nextIp();
      const expiredToken = jwt.sign(
        { type: 'refresh', jti: 'expired-jti' },
        env.jwtRefreshSecret,
        { subject: new mongoose.Types.ObjectId().toString(), expiresIn: '-10s' },
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('X-Forwarded-For', ip)
        .set('Cookie', [`${env.refreshCookieName}=${expiredToken}`]);

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'REFRESH_TOKEN_INVALID');
    });

    it('detects reused refresh token and revokes user sessions', async () => {
      const ip = nextIp();
      const regRes = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Eve', email: 'eve@example.com', password: 'password123', consent: true });

      assert.equal(regRes.status, 201);
      const cookieHeader = regRes.headers['set-cookie'];
      assert.ok(cookieHeader);
      const initialCookie = cookieHeader.find((c) => c.startsWith(`${env.refreshCookieName}=`));
      assert.ok(initialCookie);

      // First refresh succeeds and rotates token
      const refresh1 = await request(app)
        .post('/api/auth/refresh')
        .set('X-Forwarded-For', ip)
        .set('Cookie', [initialCookie]);
      assert.equal(refresh1.status, 200);

      // Replay the first cookie -> reuse detected
      const replay = await request(app)
        .post('/api/auth/refresh')
        .set('X-Forwarded-For', ip)
        .set('Cookie', [initialCookie]);

      assert.equal(replay.status, 401);
      assert.equal(replay.body.error.code, 'REFRESH_TOKEN_REVOKED');

      // Verify all sessions were invalidated in DB
      const user = await User.findOne({ email: 'eve@example.com' }).select('+refreshTokens');
      assert.equal(user.refreshTokens.length, 0);
    });
  });

  describe('POST /api/auth/logout and /api/auth/logout-all', () => {
    it('logs out and clears refresh cookie', async () => {
      const ip = nextIp();
      const regRes = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Frank', email: 'frank@example.com', password: 'password123', consent: true });

      assert.equal(regRes.status, 201);
      const cookieHeader = regRes.headers['set-cookie'];
      assert.ok(cookieHeader);
      const refreshCookie = cookieHeader.find((c) => c.startsWith(`${env.refreshCookieName}=`));
      assert.ok(refreshCookie);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('X-Forwarded-For', ip)
        .set('Cookie', [refreshCookie]);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.message, 'Logged out.');

      // Check cookie was cleared
      const logoutCookies = res.headers['set-cookie'];
      assert.ok(logoutCookies.some((c) => c.includes(`${env.refreshCookieName}=;`)));
    });

    it('succeeds gracefully when logging out with invalid or missing cookie', async () => {
      const ip = nextIp();
      const res = await request(app)
        .post('/api/auth/logout')
        .set('X-Forwarded-For', ip);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.message, 'Logged out.');
    });

    it('logout-all revokes all sessions across devices', async () => {
      const ip = nextIp();
      const regRes = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ name: 'Grace', email: 'grace@example.com', password: 'password123', consent: true });

      assert.equal(regRes.status, 201);
      const token = regRes.body.data.accessToken;

      // Simulate a second device login
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'grace@example.com', password: 'password123' });

      let user = await User.findOne({ email: 'grace@example.com' }).select('+refreshTokens');
      assert.equal(user.refreshTokens.length, 2);

      const res = await request(app)
        .post('/api/auth/logout-all')
        .set('X-Forwarded-For', ip)
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.message, 'Logged out of all devices.');

      user = await User.findOne({ email: 'grace@example.com' }).select('+refreshTokens');
      assert.equal(user.refreshTokens.length, 0);
    });
  });
});
