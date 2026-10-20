import client, { payloadFrom, setAccessToken } from './client.js';

let refreshRequest = null;

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

export async function refresh() {
  if (!refreshRequest) {
    refreshRequest = client
      .post('/auth/refresh', null, { _skipAuthRefresh: true })
      .then(readSession)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

const authApi = { login, register, logout, refresh };
export default authApi;
