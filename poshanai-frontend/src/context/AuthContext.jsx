import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '../api/authApi.js';
import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  subscribeAccessToken,
} from '../api/client.js';
import { clearAllCache } from '../utils/memoryCache.js';

export const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'user';
const LEGACY_USER_STORAGE_KEY = 'poshanai.user';

function hasRefreshCookie() {
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith('refreshTokenPresent='));
}

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY) ?? localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

function isStored(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function getRefreshDelay(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return null;
    return Math.max(payload.exp * 1000 - Date.now() - 60_000, 0);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setToken] = useState(getAccessToken);
  const [user, setUser] = useState(readStoredUser);
  const [isLoading, setIsLoading] = useState(
    () => hasRefreshCookie() && (!getAccessToken() || !readStoredUser()),
  );
  const refreshTimer = useRef(null);
  const sessionVersion = useRef(0);
  const setSession = useCallback(({ accessToken: nextToken, user: nextUser }) => {
    if (!nextToken) clearAllCache();
    setAccessToken(nextToken);
    setToken(nextToken || null);
    setUser(nextToken ? nextUser : null);
    try {
      if (nextToken && nextUser) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      else localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[auth] Browser storage unavailable; user state will not persist.');
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const requestVersion = sessionVersion.current;
    try {
      const session = await refreshAccessToken();
      if (!session.accessToken)
        throw new Error('Refresh response did not include an access token.');
      if (requestVersion === sessionVersion.current) setSession(session);
      return session;
    } catch (error) {
      if (requestVersion === sessionVersion.current) setSession({ accessToken: null, user: null });
      throw error;
    }
  }, [setSession]);

  const login = useCallback(
    async (credentials) => {
      const requestVersion = ++sessionVersion.current;
      try {
        const session = await apiLogin(credentials);
        if (!session.accessToken) throw new Error('Login response did not include an access token.');
        if (requestVersion !== sessionVersion.current) return null;
        clearAllCache();
        setSession(session);
        if (import.meta.env.DEV) {
          console.info('[auth] login session persistence', {
            origin: window.location.origin,
            tokenSaved: isStored('token'),
            userSaved: isStored(USER_STORAGE_KEY),
          });
        }
        setIsLoading(false);
        return session.user;
      } catch (error) {
        if (requestVersion === sessionVersion.current) setIsLoading(false);
        throw error;
      }
    },
    [setSession],
  );

  const register = useCallback(
    async (details) => {
      const requestVersion = ++sessionVersion.current;
      try {
        const session = await apiRegister(details);
        if (requestVersion !== sessionVersion.current) {
          return { user: null, isAuthenticated: Boolean(accessToken) };
        }
        if (session.accessToken) {
          clearAllCache();
          setSession(session);
        }
        setIsLoading(false);
        return { user: session.user, isAuthenticated: Boolean(session.accessToken) };
      } catch (error) {
        if (requestVersion === sessionVersion.current) setIsLoading(false);
        throw error;
      }
    },
    [accessToken, setSession],
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    setIsLoading(false);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    try {
      await apiLogout();
    } finally {
      setSession({ accessToken: null, user: null });
    }
  }, [setSession]);

  const markOnboardingCompleted = useCallback(() => {
    if (!user) return;
    const updatedUser = { ...user, onboardingCompleted: true };
    setUser(updatedUser);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[auth] Browser storage unavailable; onboarding status will not persist locally.');
      }
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = subscribeAccessToken((token) => {
      setToken(token);
      if (!token) {
        setUser(null);
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
        } catch {
          // Ignore unavailable browser storage.
        }
        clearAllCache();
      }
    });
    let active = true;
    const requestVersion = sessionVersion.current;
    if (hasRefreshCookie()) {
      refreshAccessToken()
        .then((session) => {
          if (active && requestVersion === sessionVersion.current && session.accessToken) setSession(session);
        })
        .catch(() => {
          if (active && requestVersion === sessionVersion.current && !getAccessToken()) {
            setSession({ accessToken: null, user: null });
          }
        })
        .finally(() => {
          if (active && requestVersion === sessionVersion.current) setIsLoading(false);
        });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSession]);

  useEffect(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (!accessToken) return undefined;
    const delay = getRefreshDelay(accessToken);
    if (delay === null) return undefined;
    refreshTimer.current = setTimeout(() => {
      refresh().catch(() => {});
    }, delay);
    return () => clearTimeout(refreshTimer.current);
  }, [accessToken, refresh]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      isLoading,
      login,
      register,
      logout,
      refresh,
      markOnboardingCompleted,
    }),
    [user, accessToken, isLoading, login, register, logout, refresh, markOnboardingCompleted],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
