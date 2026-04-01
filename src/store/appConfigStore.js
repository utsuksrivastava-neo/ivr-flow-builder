/**
 * Application configuration (admin-editable). Merged with schema defaults; persisted in localStorage.
 */
import { create } from 'zustand';
import { DEFAULT_APP_CONFIG, mergeAppConfig } from '../config/appConfigSchema';

const STORAGE_KEY = 'ivr-app-config';

function loadPartial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function persist(partial) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(partial));
}

/**
 * @returns {typeof DEFAULT_APP_CONFIG}
 */
function buildMerged(partial) {
  return mergeAppConfig(partial);
}

const initialPartial = loadPartial();

const useAppConfigStore = create((set, get) => ({
  /** User overrides only (not full merged object) */
  partial: initialPartial,

  mergedConfig: buildMerged(initialPartial),

  setPartial: (key, value) => {
    const next = { ...get().partial, [key]: value };
    persist(next);
    set({ partial: next, mergedConfig: buildMerged(next) });
  },

  setMany: (updates) => {
    const next = { ...get().partial, ...updates };
    persist(next);
    set({ partial: next, mergedConfig: buildMerged(next) });
  },

  resetToDefaults: () => {
    persist({});
    set({ partial: {}, mergedConfig: buildMerged({}) });
  },
}));

/**
 * For non-React modules (flowStore, mockApi).
 * @returns {typeof DEFAULT_APP_CONFIG}
 */
export function getMergedAppConfig() {
  return useAppConfigStore.getState().mergedConfig;
}

export default useAppConfigStore;
