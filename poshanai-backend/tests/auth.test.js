import assert from 'node:assert/strict';
import { describe, it, before, after, beforeEach } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
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
  assert.match(cookie, /;\s*SameSite=Strict(?:;|$)/i);
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
      assert.equal(user.refreshTokens.length, 1);

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

describe('Two-factor authentication API (/api/auth/2fa)', () => {
  async function registerAndEnableTwoFactor(email) {
    const ip = nextIp();
    const registration = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', ip)
      .send({ name: 'Two Factor User', email, password: 'password123', consent: true });
    assert.equal(registration.status, 201);

    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('X-Forwarded-For', ip)
      .set('Authorization', `Bearer ${registration.body.data.accessToken}`)
      .send({});
    assert.equal(setup.status, 200);
    assert.match(setup.body.data.qrCode, /^data:image\/png;base64,/);
    assert.equal(typeof setup.body.data.secret, 'string');

    const setupCode = speakeasy.totp({
      secret: setup.body.data.secret,
      encoding: 'base32',
      time: Math.floor(Date.now() / 30_000) * 30 - 30,
    });
    const enabled = await request(app)
      .post('/api/auth/2fa/verify-setup')
      .set('X-Forwarded-For', ip)
      .set('Authorization', `Bearer ${registration.body.data.accessToken}`)
      .send({ secret: setup.body.data.secret, code: setupCode, ignored: 'stripped' });
    assert.equal(enabled.status, 200, JSON.stringify(enabled.body));
    assert.equal(enabled.body.data.twoFactorEnabled, true);
    assert.equal(enabled.body.data.backupCodes.length, 10);
    assert.ok(enabled.body.data.backupCodes.every((code) => /^[A-F0-9]{10}$/.test(code)));
    return { ip, token: registration.body.data.accessToken, secret: setup.body.data.secret, backupCodes: enabled.body.data.backupCodes };
  }

  it('encrypts the TOTP secret, requires a short-lived challenge, and rejects its replay', async () => {
    const { ip, token, secret } = await registerAndEnableTwoFactor('totp@example.com');
    const stored = await User.collection.findOne({ email: 'totp@example.com' });
    assert.equal(stored.twoFactorSecret, undefined);
    assert.ok(stored._ct, 'mongoose-encryption stores encrypted data in ciphertext');
    assert.ok(stored.twoFactorBackupCodes.every((hash) => /^\$2[aby]\$12\$/.test(hash)));
    const decrypted = await User.findById(stored._id).select('+twoFactorSecret +twoFactorBackupCodes');
    assert.equal(decrypted.twoFactorSecret, secret);

    const profileUpdate = await request(app)
      .patch('/api/users/me')
      .set('X-Forwarded-For', ip)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Two Factor User' });
    assert.equal(profileUpdate.status, 200);
    assert.equal(profileUpdate.body.data.twoFactorEnabled, true);
    assert.equal(profileUpdate.body.data.twoFactorSecret, undefined);
    const afterProfileUpdate = await User.findById(stored._id).select('+twoFactorSecret');
    assert.equal(afterProfileUpdate.twoFactorSecret, secret);

    const login = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'totp@example.com', password: 'password123' });
    assert.equal(login.status, 200);
    assert.equal(login.body.requiresTwoFactor, true);
    assert.equal(login.body.accessToken, undefined);
    const pending = jwt.decode(login.body.tempToken);
    assert.equal(pending.scope, '2fa_pending');
    assert.equal(pending.type, '2fa_temp');
    assert.equal(Number.isInteger(pending.tokenVersion), true);
    assert.ok(pending.exp - pending.iat <= 300);

    const stepSkip = await request(app)
      .get('/api/users/me')
      .set('X-Forwarded-For', ip)
      .set('Authorization', `Bearer ${login.body.tempToken}`);
    assert.equal(stepSkip.status, 401);
    assert.equal(stepSkip.body.error.message, '2FA Verification Required');

    const code = speakeasy.totp({ secret, encoding: 'base32' });
    const verified = await request(app)
      .post('/api/auth/2fa/verify-login')
      .set('X-Forwarded-For', ip)
      .send({ tempToken: login.body.tempToken, code });
    assert.equal(verified.status, 200);
    assert.ok(verified.body.data.accessToken);
    const access = jwt.decode(verified.body.data.accessToken);
    assert.equal(access.scope, 'full_access');
    assert.equal(access.type, 'access');
    assert.ok(access.tokenVersion > pending.tokenVersion);
    assertRefreshCookie(verified);

    const replay = await request(app)
      .post('/api/auth/2fa/verify-login')
      .set('X-Forwarded-For', ip)
      .send({ tempToken: login.body.tempToken, code });
    assert.equal(replay.status, 401);
    assert.equal(replay.body.error.code, 'TWO_FACTOR_CHALLENGE_INVALID');
  });

  it('allows each backup code once and removes it after login', async () => {
    const { ip, backupCodes } = await registerAndEnableTwoFactor('backup@example.com');
    const login = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'backup@example.com', password: 'password123' });
    const verified = await request(app)
      .post('/api/auth/2fa/verify-login')
      .set('X-Forwarded-For', ip)
      .send({ tempToken: login.body.tempToken, code: backupCodes[0] });
    assert.equal(verified.status, 200);

    const user = await User.findOne({ email: 'backup@example.com' }).select('+twoFactorBackupCodes');
    assert.equal(user.twoFactorBackupCodes.length, 9);

    const secondLogin = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'backup@example.com', password: 'password123' });
    const reused = await request(app)
      .post('/api/auth/2fa/verify-login')
      .set('X-Forwarded-For', ip)
      .send({ tempToken: secondLogin.body.tempToken, code: backupCodes[0] });
    assert.equal(reused.status, 400);
    assert.equal(reused.body.error.code, 'INVALID_OTP');
  });

  it('requires a fresh TOTP and password to disable two-factor authentication', async () => {
    const { ip, token, secret } = await registerAndEnableTwoFactor('disable@example.com');
    const code = speakeasy.totp({ secret, encoding: 'base32' });
    const disabled = await request(app)
      .post('/api/auth/2fa/disable')
      .set('X-Forwarded-For', ip)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123', code });
    assert.equal(disabled.status, 200);
    assert.equal(disabled.body.data.user.twoFactorEnabled, false);

    const user = await User.findOne({ email: 'disable@example.com' }).select('+twoFactorSecret +twoFactorBackupCodes');
    assert.equal(user.twoFactorSecret, undefined);
    assert.equal(user.twoFactorBackupCodes.length, 0);
  });

  it('rejects unauthenticated setup and invalid verification input', async () => {
    const setup = await request(app).post('/api/auth/2fa/setup').send({});
    assert.equal(setup.status, 401);
    const invalid = await request(app).post('/api/auth/2fa/verify-login').send({ tempToken: 'invalid', code: 'abc' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  });

  it('invalidates the temporary token after three wrong codes and rate limits the fourth attempt', async () => {
    await registerAndEnableTwoFactor('lockout@example.com');
    const ip = nextIp();
    const login = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'lockout@example.com', password: 'password123' });
    assert.equal(login.status, 200);
    const tempToken = login.body.tempToken;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const failed = await request(app)
        .post('/api/auth/2fa/verify-login')
        .set('X-Forwarded-For', ip)
        .send({ tempToken, code: '000000' });
      assert.equal(failed.status, 400, JSON.stringify(failed.body));
      assert.equal(failed.body.error.code, 'INVALID_OTP');
    }

    const limited = await request(app)
      .post('/api/auth/2fa/verify-login')
      .set('X-Forwarded-For', ip)
      .send({ tempToken, code: '000000' });
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, 'TWO_FACTOR_RATE_LIMITED');

    const stored = await User.findOne({ email: 'lockout@example.com' }).select('+twoFactorLockUntil +twoFactorChallengeHash');
    assert.ok(stored.twoFactorLockUntil instanceof Date);
    assert.equal(stored.twoFactorChallengeHash, undefined);
  });

  it('enforces the account attempt limit even when requests come from different IPs', async () => {
    await registerAndEnableTwoFactor('account-limit@example.com');
    const login = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({ email: 'account-limit@example.com', password: 'password123' });
    const tempToken = login.body.tempToken;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const failed = await request(app)
        .post('/api/auth/2fa/verify-login')
        .set('X-Forwarded-For', nextIp())
        .send({ tempToken, code: '000000' });
      assert.equal(failed.status, 400);
    }

    const limited = await request(app)
      .post('/api/auth/2fa/verify-login')
      .set('X-Forwarded-For', nextIp())
      .send({ tempToken, code: '000000' });
    assert.equal(limited.status, 429);
  });

  it('requires TOTP after passwordless Email OTP login for accounts with TOTP enabled', async () => {
    await registerAndEnableTwoFactor('email-totp@example.com');
    const emailCode = await request(app)
      .post('/api/v1/auth/otp/request')
      .set('X-Forwarded-For', nextIp())
      .send({ email: 'email-totp@example.com', purpose: 'login' });
    assert.equal(emailCode.status, 200);

    const verifiedEmail = await request(app)
      .post('/api/v1/auth/otp/verify')
      .set('X-Forwarded-For', nextIp())
      .send({ email: 'email-totp@example.com', purpose: 'login', otp: emailCode.body.data.dev_otp });
    assert.equal(verifiedEmail.status, 200);
    assert.equal(verifiedEmail.body.requiresTwoFactor, true);
    assert.equal(verifiedEmail.body.accessToken, undefined);
    assert.equal(jwt.decode(verifiedEmail.body.tempToken).scope, '2fa_pending');

    const bypass = await request(app)
      .get('/api/users/me')
      .set('X-Forwarded-For', nextIp())
      .set('Authorization', `Bearer ${verifiedEmail.body.tempToken}`);
    assert.equal(bypass.status, 401);
    assert.equal(bypass.body.error.message, '2FA Verification Required');
  });
});
