import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { describe, it, before, after, beforeEach, mock } from 'node:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const queueActual = await import('../src/jobs/queue.js');
mock.module('../src/jobs/queue.js', {
  namedExports: {
    ...queueActual,
    enqueueReportOcr: async () => {},
  },
});

const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/User.js');
const { default: Report } = await import('../src/models/Report.js');

let mongod;
let ipCounter = 100;

function nextIp() {
  return `10.0.2.${ipCounter++}`;
}

async function createAuthenticatedUser(name, email) {
  const ip = nextIp();
  const res = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-For', ip)
    .send({ name, email, password: 'password123', consent: true });
  return { token: res.body.data.accessToken, user: res.body.data.user, ip };
}

const validPdfBuffer = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources <<>> >>\nendobj\n' +
  'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n'
);
const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60]);

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Report.deleteMany({});
  await User.deleteMany({});
});

describe('Report API (/api/reports)', () => {
  describe('POST /api/reports/upload', () => {
    it('uploads a valid PDF file and queues/processes report', async () => {
      const { token, ip } = await createAuthenticatedUser('User A', 'usera@example.com');

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .attach('file', validPdfBuffer, 'blood_report.pdf');

      assert.ok([201, 202].includes(res.status), `Expected 201 or 202, got ${res.status}`);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.report.id);
      assert.equal(res.body.data.report.fileType, 'application/pdf');

      const saved = await Report.findById(res.body.data.report.id);
      assert.ok(saved);
      assert.equal(saved.fileType, 'application/pdf');
    });

    it('uploads a valid image file (PNG)', async () => {
      const { token, ip } = await createAuthenticatedUser('User B', 'userb@example.com');

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .attach('file', validPngBuffer, 'lab_result.png');

      assert.ok([201, 202].includes(res.status));
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.report.fileType, 'image/png');
    });

    it('rejects unsupported file type (e.g. text/plain)', async () => {
      const { token, ip } = await createAuthenticatedUser('User C', 'userc@example.com');

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .attach('file', Buffer.from('hello plain text'), 'notes.txt');

      assert.equal(res.status, 415);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNSUPPORTED_FILE_TYPE');
    });

    it('rejects magic-byte spoofing (.pdf extension with non-pdf body)', async () => {
      const { token, ip } = await createAuthenticatedUser('User D', 'userd@example.com');

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .attach('file', Buffer.from('Not a real PDF file!'), 'spoofed.pdf');

      assert.equal(res.status, 415);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INVALID_FILE_CONTENT');
    });

    it('rejects oversized uploads exceeding 10MB', async () => {
      const { token, ip } = await createAuthenticatedUser('User E', 'usere@example.com');

      const oversized = Buffer.alloc(10 * 1024 * 1024 + 1024);
      validPdfBuffer.copy(oversized, 0, 0, validPdfBuffer.length);

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .attach('file', oversized, 'huge.pdf');

      assert.equal(res.status, 413);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FILE_TOO_LARGE');
    });

    it('rejects upload when account upload quota is exceeded', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Quota Max', 'quota@example.com');

      await User.updateOne(
        { _id: user.id },
        { $set: { uploadCount: 50, uploadSizeBytes: 1024, uploadQuotaInitialized: true } },
      );

      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .attach('file', validPdfBuffer, 'blood_report.pdf');

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'REPORT_QUOTA_EXCEEDED');
    });
  });

  describe('GET /api/reports and GET /api/reports/:id', () => {
    it('paginates report list and isolates reports per user', async () => {
      const userA = await createAuthenticatedUser('Owner', 'owner@example.com');
      const userB = await createAuthenticatedUser('Stranger', 'stranger@example.com');

      // Create 3 reports for user A
      for (let i = 0; i < 3; i++) {
        await Report.create({
          userId: userA.user.id,
          fileUrl: `uploads/reports/${randomUUID()}.pdf`,
          fileSizeBytes: 1024,
          fileType: 'application/pdf',
          ocrStatus: 'completed',
          extractedValues: [],
        });
      }

      // Create 1 report for user B
      await Report.create({
        userId: userB.user.id,
        fileUrl: 'uploads/reports/stranger.pdf',
        fileSizeBytes: 1024,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        extractedValues: [],
      });

      // User A requests page 1 with limit 2
      const resA = await request(app)
        .get('/api/reports?page=1&limit=2')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('X-Forwarded-For', userA.ip);

      assert.equal(resA.status, 200);
      assert.equal(resA.body.success, true);
      assert.equal(resA.body.data.length, 2);
      assert.equal(resA.body.pagination.total, 3);
      assert.equal(resA.body.pagination.totalPages, 2);

      // User B only sees their 1 report
      const resB = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${userB.token}`)
        .set('X-Forwarded-For', userB.ip);

      assert.equal(resB.status, 200);
      assert.equal(resB.body.data.length, 1);
      assert.equal(resB.body.pagination.total, 1);
    });

    it('allows owner to access report by id, returns 404 for another user', async () => {
      const userA = await createAuthenticatedUser('Owner', 'owner2@example.com');
      const userB = await createAuthenticatedUser('Stranger', 'stranger2@example.com');

      const report = await Report.create({
        userId: userA.user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 2048,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        rawOcrText: 'Vitamin D 25 ng/mL',
        extractedValues: [
          { nutrient: 'Vitamin D', value: 25, unit: 'ng/mL', flag: 'normal' },
        ],
      });

      // Owner accesses
      const resOwner = await request(app)
        .get(`/api/reports/${report._id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .set('X-Forwarded-For', userA.ip);

      assert.equal(resOwner.status, 200);
      assert.equal(resOwner.body.data.report.id, report._id.toString());
      assert.equal(resOwner.body.data.report.extractedValues.length, 1);

      // Stranger accesses -> 404 REPORT_NOT_FOUND (preventing IDOR existence disclosure)
      const resStranger = await request(app)
        .get(`/api/reports/${report._id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .set('X-Forwarded-For', userB.ip);

      assert.equal(resStranger.status, 404);
      assert.equal(resStranger.body.error.code, 'REPORT_NOT_FOUND');
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('deletes report record and releases upload quota', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Deleter', 'deleter@example.com');

      // Set user quota
      await User.updateOne(
        { _id: user.id },
        { $set: { uploadCount: 1, uploadSizeBytes: 5000, uploadQuotaInitialized: true } },
      );

      const report = await Report.create({
        userId: user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 5000,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
      });

      const res = await request(app)
        .delete(`/api/reports/${report._id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.deleted, true);

      // Verify removed from DB
      const inDb = await Report.findById(report._id);
      assert.equal(inDb, null);

      // Verify quota decremented
      const updatedUser = await User.findById(user.id);
      assert.equal(updatedUser.uploadCount, 0);
      assert.equal(updatedUser.uploadSizeBytes, 0);
    });
  });

  describe('PATCH /api/reports/:id/review', () => {
    it('allows owner to confirm report values', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Reviewer', 'rev@example.com');

      const report = await Report.create({
        userId: user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 1024,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'pending',
        extractedValues: [{ nutrient: 'Iron', value: 45, unit: 'ug/dL', flag: 'low' }],
      });

      const res = await request(app)
        .patch(`/api/reports/${report._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({ reviewStatus: 'confirmed' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.report.reviewStatus, 'confirmed');

      const inDb = await Report.findById(report._id);
      assert.equal(inDb.reviewStatus, 'confirmed');
    });

    it('allows owner to submit corrected report values', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Corrector', 'cor@example.com');

      const report = await Report.create({
        userId: user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 1024,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'pending',
        extractedValues: [{ nutrient: 'Iron', value: 45, unit: 'ug/dL', flag: 'low' }],
      });

      const res = await request(app)
        .patch(`/api/reports/${report._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({
          reviewStatus: 'corrected',
          extractedValues: [
            {
              nutrient: 'Iron',
              value: 65,
              unit: 'ug/dL',
              referenceRange: '50 - 170',
            },
          ],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.report.reviewStatus, 'corrected');
      assert.equal(res.body.data.report.extractedValues[0].value, 65);
    });

    it('rejects reviewing an already-reviewed report with 409', async () => {
      const { token, user, ip } = await createAuthenticatedUser('Double Reviewer', 'drev@example.com');

      const report = await Report.create({
        userId: user.id,
        fileUrl: `uploads/reports/${randomUUID()}.pdf`,
        fileSizeBytes: 1024,
        fileType: 'application/pdf',
        ocrStatus: 'completed',
        reviewStatus: 'confirmed',
        extractedValues: [],
      });

      const res = await request(app)
        .patch(`/api/reports/${report._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip)
        .send({ reviewStatus: 'confirmed' });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'REPORT_ALREADY_REVIEWED');
    });
  });
});
