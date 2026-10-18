import client, { payloadFrom } from './client.js';

export async function submitOnboarding(profile) {
  return payloadFrom(await client.post('/lifestyle/onboarding', profile));
}

export async function getRecommendations({ signal } = {}) {
  return payloadFrom(await client.get('/lifestyle/recommendations', { signal }));
}

export async function explainTest({ testName, reason, language }, { signal } = {}) {
  return payloadFrom(
    await client.post('/lifestyle/explain-test', { testName, reason, language }, { signal }),
  );
}

const lifestyleApi = { submitOnboarding, getRecommendations, explainTest };
export default lifestyleApi;
