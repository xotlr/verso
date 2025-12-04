'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
  undefined
);

const COOKIE_NAME = 'verso-theme';
const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' ? '.verso.ac' : undefined;

function setThemeCookie(theme: Theme) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const domainPart = COOKIE_DOMAIN ? `; domain=${COOKIE_DOMAIN}` : '';
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; expires=${expires.toUTCString()}${domainPart}; SameSite=Lax`;
}

function getThemeCookie(): Theme | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const value = match ? match[1] : null;
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return null;
}

function getInitialTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme;

  // Priority: cookie (cross-subdomain) > localStorage > default
  const cookieTheme = getThemeCookie();
  if (cookieTheme) return cookieTheme;

  const localTheme = localStorage.getItem(storageKey) as Theme | null;
  if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
    // Sync localStorage to cookie for cross-subdomain access
    setThemeCookie(localTheme);
    return localTheme;
  }

  return defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'verso-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => getInitialTheme(storageKey, defaultTheme));

  React.useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        setThemeCookie(newTheme);
        setTheme(newTheme);
      },
    }),
    [theme, storageKey]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};