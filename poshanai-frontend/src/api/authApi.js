import client, { payloadFrom, setAccessToken } from './client.js';

function readSession(response) {
  const payload = payloadFrom(response);
  const token = payload?.accessToken ?? payload?.access_token ?? payload?.token ?? null;
  return { accessToken: token, user: payload?.user ?? null };
}

export async function login(credentials) {
  return readSession(await client.post('/auth/login', credentials));
}

export async function register(details) {
  return readSession(await client.post('/auth/register', details));
}

export async function logout() {
  try {
    await client.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

const authApi = { login, register, logout };
export default authApi;
