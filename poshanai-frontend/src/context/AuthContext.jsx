import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
  register as apiRegister,
} from '../api/authApi.js';
import { setAccessToken, subscribeAccessToken } from '../api/client.js';
import { clearAllCache } from '../utils/memoryCache.js';

export const AuthContext = createContext(null);

function hasRefreshCookie() {
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith('refreshTokenPresent='));
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
  const [accessToken, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => hasRefreshCookie());
  const refreshTimer = useRef(null);
  const setSession = useCallback(({ accessToken: nextToken, user: nextUser }) => {
    if (!nextToken) clearAllCache();
    setAccessToken(nextToken);
    setToken(nextToken || null);
    setUser(nextToken ? nextUser : null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await apiRefresh();
      if (!session.accessToken)
        throw new Error('Refresh response did not include an access token.');
      setSession(session);
      return session;
    } catch (error) {
      setSession({ accessToken: null, user: null });
      throw error;
    }
  }, [setSession]);

  const login = useCallback(
    async (credentials) => {
      const session = await apiLogin(credentials);
      if (!session.accessToken) throw new Error('Login response did not include an access token.');
      clearAllCache();
      setSession(session);
      return session.user;
    },
    [setSession],
  );

  const register = useCallback(
    async (details) => {
      const session = await apiRegister(details);
      if (session.accessToken) {
        clearAllCache();
        setSession(session);
      }
      return { user: session.user, isAuthenticated: Boolean(session.accessToken) };
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    try {
      await apiLogout();
    } finally {
      setSession({ accessToken: null, user: null });
    }
  }, [setSession]);

  useEffect(() => {
    const unsubscribe = subscribeAccessToken((token) => {
      setToken(token);
      if (!token) clearAllCache();
    });
    let active = true;
    if (hasRefreshCookie()) {
      apiRefresh()
        .then((session) => {
          if (active && session.accessToken) setSession(session);
        })
        .catch(() => {
          if (active) setSession({ accessToken: null, user: null });
        })
        .finally(() => {
          if (active) setIsLoading(false);
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
    }),
    [user, accessToken, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
