/**
 * ThemeContext — Dark/Light mode.
 *
 * Default behaviour is to FOLLOW the operating system ('prefers-color-scheme'),
 * live. A choice is only remembered if the user actually flips the toggle
 * (tracked by `finance_theme_explicit`); until then, changing the OS theme
 * changes the app. Theming is only meaningful on the login page and the
 * dashboard — the marketing page pins its own look (see PrelandingPage).
 *
 * Usage:
 *   const { theme, toggleTheme } = useTheme();  // 'dark' | 'light'
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const systemTheme = () =>
  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const readInitial = () => {
  try {
    if (localStorage.getItem('finance_theme_explicit') === '1') {
      const saved = localStorage.getItem('finance_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
  } catch { /* ignore */ }
  return systemTheme();
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readInitial);
  const [explicit, setExplicit] = useState(() => {
    try { return localStorage.getItem('finance_theme_explicit') === '1'; } catch { return false; }
  });

  // Reflect on <html> so [data-theme="dark"] works.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('finance_theme', theme);
      localStorage.setItem('finance_theme_explicit', explicit ? '1' : '0');
    } catch { /* ignore */ }
  }, [theme, explicit]);

  // Follow the OS while the user hasn't made an explicit choice.
  useEffect(() => {
    if (explicit) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(mq.matches ? 'dark' : 'light');
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [explicit]);

  const toggleTheme = () => {
    setExplicit(true);
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
