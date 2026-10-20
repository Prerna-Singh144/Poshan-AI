import client, { payloadFrom } from './client.js';

export async function getExperts({ signal } = {}) {
  const payload = payloadFrom(await client.get('/experts', { signal }));
  return payload.experts ?? [];
}

export async function bookExpert({ expertId, scheduledAt }) {
  return payloadFrom(await client.post('/experts/book', { expertId, scheduledAt }));
}

export default { getExperts, bookExpert };
