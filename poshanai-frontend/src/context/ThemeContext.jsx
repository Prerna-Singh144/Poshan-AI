import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'poshanai-theme';
const ThemeContext = createContext(null);

function readSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readSavedTheme);
  const isDark = theme === 'dark';

  useEffect(() => {
    const applyTheme = (nextTheme) => {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      document.documentElement.style.colorScheme = nextTheme;
    };

    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still applies for this tab when browser storage is unavailable.
    }

    const syncTheme = (event) => {
      if (event.key === THEME_STORAGE_KEY) setTheme(readSavedTheme());
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider.');
  return context;
}
