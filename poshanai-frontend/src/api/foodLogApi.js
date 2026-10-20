import client, { payloadFrom } from './client.js';

export async function searchFoods(query, { signal } = {}) {
  const data = payloadFrom(await client.get('/foods/search', { params: { q: query, limit: 8 }, signal }));
  return data.foods;
}

export async function getTodayLog(date, { signal } = {}) {
  return payloadFrom(await client.get('/logs/today', { params: { date }, signal }));
}

export async function addFood({ ifctCode, quantity, measure, date }) {
  return payloadFrom(await client.post('/logs/add-food', { ifctCode, quantity, measure, date }));
}

const foodLogApi = { searchFoods, getTodayLog, addFood };
export default foodLogApi;
