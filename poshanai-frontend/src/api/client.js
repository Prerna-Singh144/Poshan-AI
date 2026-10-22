import { create } from 'axios';

try {
  ['token', 'poshanai.accessToken', 'user', 'poshanai.user'].forEach((key) => localStorage.removeItem(key));
} catch {
  // Browser storage can be disabled; all authentication state is memory-only.
}

const client = create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
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

export function getApiError(error) {
  return error.apiError?.message ?? normalizeApiError(error).message;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = client
      .post('/auth/refresh', undefined, { _skipAuthRefresh: true })
      .then((response) => {
        const payload = payloadFrom(response);
        const session = {
          accessToken: tokenFrom(response),
          user: payload?.user ?? null,
        };
        if (!session.accessToken) throw new Error('Refresh response did not include an access token.');
        setAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.request.use((config) => {
  const token = accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
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
        const session = await refreshAccessToken();
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${session.accessToken}`;
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
    return Promise.reject(normalizeApiError(error));
  },
);

export { payloadFrom };
export default client;
