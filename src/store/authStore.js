/**
 * authStore.js — Zustand store for user authentication and local user management.
 *
 * Users are persisted under the `ivr-users` localStorage key. The active session
 * is stored under `ivr-auth` (without passwords). On first load, a default admin
 * account is created if no users exist.
 */
import { create } from 'zustand';

/** @typedef {'admin' | 'user'} UserRole */

/**
 * @typedef {object} StoredUser
 * @property {string} username
 * @property {string} password
 * @property {string} name
 * @property {UserRole} role
 */

/**
 * @typedef {object} SessionUser
 * @property {string} username
 * @property {string} name
 * @property {UserRole} role
 */

const USERS_KEY = 'ivr-users';
const AUTH_KEY = 'ivr-auth';

/**
 * Default accounts used when no `ivr-users` entry exists yet.
 * @type {StoredUser[]}
 */
const DEFAULT_USERS = [{ username: 'demo', password: 'demo123', name: 'Demo User', role: 'admin' }];

/**
 * Reads the user list from localStorage, seeding defaults on first run.
 *
 * @returns {StoredUser[]}
 */
function readUsersFromStorage() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return [...DEFAULT_USERS];
}

/**
 * Persists the full user list (including password hashes for local demo use).
 *
 * @param {StoredUser[]} users
 */
function persistUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Builds the session object from storage, validating against the current user list.
 *
 * @param {StoredUser[]} users
 * @returns {SessionUser | null}
 */
function hydrateSessionUser(users) {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.username) return null;
    const found = users.find((u) => u.username === session.username);
    if (found) {
      return { username: found.username, name: found.name, role: found.role };
    }
    localStorage.removeItem(AUTH_KEY);
    return null;
  } catch {
    return null;
  }
}

const initialUsers = readUsersFromStorage();

const useAuthStore = create((set, get) => ({
  /** Full user records (passwords kept in memory + localStorage for demo auth). */
  users: initialUsers,

  /** Current session (no password); `null` when logged out. */
  user: hydrateSessionUser(initialUsers),

  /**
   * Attempts to log in against the persisted users list.
   *
   * @param {string} username
   * @param {string} password
   * @returns {boolean} True when credentials match a stored user
   */
  login: (username, password) => {
    const users = get().users;
    const found = users.find((u) => u.username === username && u.password === password);
    if (!found) return false;
    /** @type {SessionUser} */
    const user = { username: found.username, name: found.name, role: found.role };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    set({ user });
    return true;
  },

  /**
   * Clears the session from state and localStorage.
   */
  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    set({ user: null });
  },

  /**
   * Returns all users without password fields (safe for UI lists).
   *
   * @returns {Array<{username: string, name: string, role: UserRole}>}
   */
  getUsers: () => {
    return get().users.map(({ password: _p, ...rest }) => rest);
  },

  /**
   * Adds a new user if the username is not already taken.
   *
   * @param {string} username
   * @param {string} password
   * @param {string} name
   * @param {UserRole} role
   * @returns {{ success: true } | { success: false; error: string }}
   */
  addUser: (username, password, name, role) => {
    const trimmed = String(username).trim();
    if (!trimmed) return { success: false, error: 'Username is required.' };
    const users = get().users;
    if (users.some((u) => u.username === trimmed)) {
      return { success: false, error: 'That username is already taken.' };
    }
    /** @type {StoredUser} */
    const next = {
      username: trimmed,
      password: String(password),
      name: String(name).trim() || trimmed,
      role: role === 'admin' ? 'admin' : 'user',
    };
    const updated = [...users, next];
    persistUsers(updated);
    set({ users: updated });
    return { success: true };
  },

  /**
   * Removes a user by username, enforcing self-delete and last-admin rules.
   *
   * @param {string} username
   * @returns {{ success: true } | { success: false; error: string }}
   */
  deleteUser: (username) => {
    const current = get().user;
    if (!current) return { success: false, error: 'Not logged in.' };
    if (current.username === username) {
      return { success: false, error: 'You cannot delete your own account.' };
    }
    const users = get().users;
    const target = users.find((u) => u.username === username);
    if (!target) return { success: false, error: 'User not found.' };
    const admins = users.filter((u) => u.role === 'admin');
    if (target.role === 'admin' && admins.length <= 1) {
      return { success: false, error: 'Cannot remove the last administrator.' };
    }
    const updated = users.filter((u) => u.username !== username);
    persistUsers(updated);
    set({ users: updated });
    return { success: true };
  },

  /**
   * Whether the active session belongs to an administrator.
   *
   * @returns {boolean}
   */
  isAdmin: () => get().user?.role === 'admin',
}));

export default useAuthStore;
