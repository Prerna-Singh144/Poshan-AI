import client, { payloadFrom } from './client.js';

export async function getMealPlans() {
  const data = payloadFrom(await client.get('/mealplans'));
  return Array.isArray(data) ? data : (data?.mealPlans ?? data?.plans ?? []);
}

export async function getMealPlan(id) {
  return payloadFrom(await client.get(`/mealplans/${encodeURIComponent(id)}`));
}

export async function getMealPlanJobStatus(jobId) {
  return payloadFrom(await client.get(`/mealplans/jobs/${encodeURIComponent(jobId)}`));
}

export async function generateMealPlan(request) {
  return payloadFrom(await client.post('/mealplans/generate', request));
}

const mealPlanApi = { getMealPlans, getMealPlan, generateMealPlan };
export default mealPlanApi;
