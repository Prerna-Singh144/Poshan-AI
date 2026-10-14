import { create } from 'axios';

const client = create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshPromise = null;
const tokenListeners = new Set();

export function setAccessToken(token) {
  accessToken = token || null;
  tokenListeners.forEach((listener) => listener(accessToken));
}

export function getAccessToken() {
  return accessToken;
}

export function subscribeAccessToken(listener) {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

function payloadFrom(response) {
  return response.data?.data ?? response.data;
}

function tokenFrom(response) {
  const payload = payloadFrom(response);
  return payload?.accessToken ?? payload?.access_token ?? payload?.token ?? null;
}

function isAuthEndpoint(url = '') {
  return /\/auth\/(login|register|logout|refresh)(?:[/?#]|$)/i.test(url);
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export function normalizeApiError(error) {
  const responseData = error.response?.data;
  const source = responseData?.error ?? responseData ?? {};
  const normalized = {
    status: error.response?.status ?? 0,
    code:
      source?.code ??
      (error.response?.status ? `HTTP_${error.response.status}` : (error.code ?? 'NETWORK_ERROR')),
    message:
      (source?.code === 'OCR_QUEUE_UNAVAILABLE'
        ? 'Service temporarily unavailable, please retry.'
        : null) ??
      source?.message ??
      (typeof responseData?.error === 'string' ? responseData.error : null) ??
      error.message ??
      'Request failed.',
    details: source?.details ?? source?.errors ?? null,
  };
  error.apiError = normalized;
  error.message = normalized.message;
  if (error.response) error.response.data = { error: normalized };
  return error;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = client
      .post('/auth/refresh', null, { _skipAuthRefresh: true })
      .then((response) => {
        const nextToken = tokenFrom(response);
        if (!nextToken) throw new Error('Refresh response did not include an access token.');
        setAccessToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      config &&
      !config._retry &&
      !config._skipAuthRefresh &&
      !isAuthEndpoint(config.url)
    ) {
      config._retry = true;
      try {
        const nextToken = await refreshAccessToken();
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${nextToken}`;
        return client(config);
      } catch {
        setAccessToken(null);
        redirectToLogin();
      }
    }

    if (status === 401 && config?._retry) {
      setAccessToken(null);
      redirectToLogin();
    }
    if (status === 403) redirectToLogin();
    return Promise.reject(normalizeApiError(error));
  },
);

export { payloadFrom };
export default client;
