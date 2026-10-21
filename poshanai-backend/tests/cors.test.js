import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import app from '../src/app.js';

test('allows the alternate loopback host for local frontend development', async () => {
  const response = await request(app)
    .options('/api/v1/lifestyle/recommendations')
    .set('Origin', 'http://127.0.0.1:5173')
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'authorization');

  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
});
