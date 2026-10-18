import client, { payloadFrom } from './client.js';

export async function getTodayLog({ signal } = {}) {
  return payloadFrom(await client.get('/logs/today', { signal }));
}

export async function searchIfctFoods(query, { signal } = {}) {
  return payloadFrom(await client.get('/logs/foods/search', { params: { q: query }, signal }));
}

export async function addFoodToLog(food) {
  return payloadFrom(await client.post('/logs/add-food', food));
}

export async function addSupplementToLog(supplement) {
  return payloadFrom(await client.post('/logs/add-supplement', supplement));
}

const dailyLogApi = { getTodayLog, searchIfctFoods, addFoodToLog, addSupplementToLog };
export default dailyLogApi;
