/**
 * authStore.js — Zustand store for user authentication.
 *
 * Provides `login` and `logout` actions and persists the
 * current user session in localStorage so the login survives
 * page reloads.
 *
 * There is a single hard-coded demo user; extend DEMO_USER
 * or add backend auth as needed.
 */
import { create } from 'zustand';

/** Hard-coded demo credentials shown on the login page. */
const DEMO_USER = { username: 'demo', password: 'demo123', name: 'Demo User' };

const useAuthStore = create((set) => ({
  /** Hydrate from localStorage so a refresh doesn't force re-login. */
  user: JSON.parse(localStorage.getItem('ivr-auth') || 'null'),

  /**
   * Attempts to log in with the given credentials.
   * @param {string} username
   * @param {string} password
   * @returns {boolean} true on success, false on mismatch
   */
  login: (username, password) => {
    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      const user = { username: DEMO_USER.username, name: DEMO_USER.name };
      localStorage.setItem('ivr-auth', JSON.stringify(user));
      set({ user });
      return true;
    }
    return false;
  },

  /** Clears the session from both state and localStorage. */
  logout: () => {
    localStorage.removeItem('ivr-auth');
    set({ user: null });
  },
}));

export default useAuthStore;
