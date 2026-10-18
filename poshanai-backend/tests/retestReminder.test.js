import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '../src/models/Notification.js';
import Report from '../src/models/Report.js';
import User from '../src/models/User.js';
import { runRetestReminderSweep } from '../src/services/retestReminderService.js';

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([Notification.deleteMany({}), Report.deleteMany({}), User.deleteMany({})]);
});

test('creates one doctor-discussion reminder for completed reports at least 90 days old', async () => {
  const now = new Date('2026-10-18T00:00:00.000Z');
  const user = await User.create({
    name: 'Reminder User',
    email: 'reminder@example.com',
    passwordHash: 'not-used-in-this-test',
    consent: { given: true, givenAt: now },
  });
  const oldReport = await Report.create({
    userId: user._id,
    fileUrl: 'uploads/reports/old.pdf',
    fileSizeBytes: 10,
    fileType: 'application/pdf',
    ocrStatus: 'completed',
    uploadedAt: new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000),
  });
  await Report.create({
    userId: user._id,
    fileUrl: 'uploads/reports/new.pdf',
    fileSizeBytes: 10,
    fileType: 'application/pdf',
    ocrStatus: 'completed',
    uploadedAt: new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000),
  });
  await Report.create({
    userId: user._id,
    fileUrl: 'uploads/reports/pending.pdf',
    fileSizeBytes: 10,
    fileType: 'application/pdf',
    ocrStatus: 'pending',
    uploadedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
  });

  assert.deepEqual(await runRetestReminderSweep({ now }), { remindersCreated: 1 });
  assert.deepEqual(await runRetestReminderSweep({ now }), { remindersCreated: 0 });

  const notifications = await Notification.find({ userId: user._id }).lean();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].reportId.toString(), oldReport._id.toString());
  assert.match(notifications[0].message, /discussing.*doctor/i);
  assert.equal(await Report.countDocuments({ retestReminderSentAt: { $ne: null } }), 1);
});

test('does not create reminders for inactive users', async () => {
  const now = new Date('2026-10-18T00:00:00.000Z');
  const user = await User.create({
    name: 'Inactive User',
    email: 'inactive-reminder@example.com',
    passwordHash: 'not-used-in-this-test',
    status: 'pending_deletion',
    consent: { given: true, givenAt: now },
  });
  await Report.create({
    userId: user._id,
    fileUrl: 'uploads/reports/inactive.pdf',
    fileSizeBytes: 10,
    fileType: 'application/pdf',
    ocrStatus: 'completed',
    uploadedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
  });

  assert.deepEqual(await runRetestReminderSweep({ now }), { remindersCreated: 0 });
  assert.equal(await Notification.countDocuments(), 0);
});
