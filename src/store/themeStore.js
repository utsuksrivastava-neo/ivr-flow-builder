/**
 * themeStore.js — Zustand store for light/dark theme preference.
 * Persisted to localStorage under "ivr-theme". Defaults to "light".
 */
import { create } from 'zustand';

const THEME_KEY = 'ivr-theme';

function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* ignore */ }
  return 'light';
}

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
}

const initial = readTheme();
applyTheme(initial);

const useThemeStore = create((set, get) => ({
  mode: initial,

  toggleTheme: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ mode: next });
  },

  setTheme: (mode) => {
    applyTheme(mode);
    set({ mode });
  },
}));

export default useThemeStore;
