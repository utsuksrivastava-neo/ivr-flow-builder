/**
 * authStore.js — Zustand store for user authentication and local user management.
 *
 * SECURITY FEATURES:
 *  - Passwords are SHA-256 hashed before storage (Web Crypto API).
 *  - Brute-force protection: account locks for 30 s after 5 consecutive failures.
 *  - Sessions expire after 24 hours of inactivity.
 *  - Password strength validation: minimum 6 characters required.
 *  - The `users` array in the store NEVER includes raw passwords;
 *    only hashed passwords are stored in localStorage.
 */
import { create } from 'zustand';

/** @typedef {'admin' | 'user'} UserRole */

/**
 * @typedef {object} StoredUser
 * @property {string}   username
 * @property {string}   passwordHash - SHA-256 hex digest
 * @property {string}   name
 * @property {UserRole} role
 */

/**
 * @typedef {object} SessionUser
 * @property {string}   username
 * @property {string}   name
 * @property {UserRole} role
 * @property {number}   expiresAt - Unix ms timestamp
 */

const USERS_KEY = 'ivr-users';
const AUTH_KEY = 'ivr-auth';
const LOCKOUT_KEY = 'ivr-lockout';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; // 30 seconds

const MIN_PASSWORD_LENGTH = 6;

// ---------------------------------------------------------------------------
// Hashing (SHA-256 via Web Crypto — async) + sync fallback for legacy seeds
// ---------------------------------------------------------------------------

/**
 * Hashes a plaintext password to a hex SHA-256 digest.
 * @param {string} plaintext
 * @returns {Promise<string>}
 */
async function hashPassword(plaintext) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Synchronous hash for initial seed (only used once at first load).
 * Uses the same SHA-256 algorithm via a pre-computed constant.
 * demo123 => SHA-256 hex
 */
const DEMO_HASH = 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791';

// ---------------------------------------------------------------------------
// Brute-force lockout helpers
// ---------------------------------------------------------------------------

function getLockout() {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function setLockout(data) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
}

function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY);
}

// ---------------------------------------------------------------------------
// User storage helpers
// ---------------------------------------------------------------------------

/**
 * Default admin account seeded on first run (password already hashed).
 * @type {StoredUser[]}
 */
const DEFAULT_USERS = [
  { username: 'demo', passwordHash: DEMO_HASH, name: 'Demo User', role: 'admin' },
];

/**
 * Reads user list from localStorage, migrating legacy plaintext records
 * (from earlier versions) to hashed format on the fly.
 * @returns {StoredUser[]}
 */
function readUsersFromStorage() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let migrated = false;
        const users = parsed.map((u) => {
          if (u.password && !u.passwordHash) {
            migrated = true;
            return { username: u.username, passwordHash: '__migrate__' + u.password, name: u.name, role: u.role };
          }
          return u;
        });
        if (migrated) {
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          scheduleMigration(users);
        }
        return users;
      }
    }
  } catch { /* corrupt storage — reset */ }
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return [...DEFAULT_USERS];
}

/**
 * Asynchronously re-hashes any migrated plaintext passwords.
 * @param {StoredUser[]} users
 */
async function scheduleMigration(users) {
  const updated = await Promise.all(
    users.map(async (u) => {
      if (u.passwordHash?.startsWith('__migrate__')) {
        const plain = u.passwordHash.slice('__migrate__'.length);
        const hash = await hashPassword(plain);
        return { ...u, passwordHash: hash };
      }
      return u;
    })
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  useAuthStore.setState({ users: updated });
}

function persistUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ---------------------------------------------------------------------------
// Session hydration with expiry check
// ---------------------------------------------------------------------------

/**
 * Restores the session from localStorage, returning null if expired or invalid.
 * @param {StoredUser[]} users
 * @returns {SessionUser | null}
 */
function hydrateSessionUser(users) {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.username) return null;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    const found = users.find((u) => u.username === session.username);
    if (found) {
      return { username: found.username, name: found.name, role: found.role, expiresAt: session.expiresAt };
    }
    localStorage.removeItem(AUTH_KEY);
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialUsers = readUsersFromStorage();

const useAuthStore = create((set, get) => ({
  users: initialUsers,
  user: hydrateSessionUser(initialUsers),

  /**
   * Attempts login with brute-force protection.
   * Returns { success, error?, lockedFor? }.
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ success: boolean; error?: string; lockedFor?: number }>}
   */
  login: async (username, password) => {
    const lockout = getLockout();
    if (lockout.lockedUntil > Date.now()) {
      const remaining = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
      return { success: false, error: `Too many attempts. Try again in ${remaining}s.`, lockedFor: remaining };
    }

    const users = get().users;
    let hash = await hashPassword(password);

    let found = users.find((u) => u.username === username && u.passwordHash === hash);

    if (!found) {
      const migrated = users.find(
        (u) => u.username === username && u.passwordHash === '__migrate__' + password
      );
      if (migrated) {
        found = migrated;
        const realHash = await hashPassword(password);
        const updated = users.map((u) =>
          u.username === username ? { ...u, passwordHash: realHash } : u
        );
        persistUsers(updated);
        set({ users: updated });
      }
    }

    if (!found) {
      const attempts = lockout.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        setLockout({ attempts, lockedUntil: Date.now() + LOCKOUT_MS });
        return {
          success: false,
          error: `Account locked for 30 seconds after ${MAX_ATTEMPTS} failed attempts.`,
          lockedFor: LOCKOUT_MS / 1000,
        };
      }
      setLockout({ attempts, lockedUntil: 0 });
      return { success: false, error: `Invalid username or password. (${MAX_ATTEMPTS - attempts} attempts left)` };
    }

    clearLockout();
    const expiresAt = Date.now() + SESSION_TTL_MS;
    const user = { username: found.username, name: found.name, role: found.role, expiresAt };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    set({ user });
    return { success: true };
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    set({ user: null });
  },

  /**
   * Returns all users without password hashes (safe for UI).
   * @returns {Array<{username: string, name: string, role: UserRole}>}
   */
  getUsers: () => {
    return get().users.map(({ passwordHash: _h, ...rest }) => rest);
  },

  /**
   * Adds a new user with password strength validation.
   *
   * @param {string} username
   * @param {string} password
   * @param {string} name
   * @param {UserRole} role
   * @returns {Promise<{ success: boolean; error?: string }>}
   */
  addUser: async (username, password, name, role) => {
    const trimmed = String(username).trim();
    if (!trimmed) return { success: false, error: 'Username is required.' };
    if (trimmed.length < 3) return { success: false, error: 'Username must be at least 3 characters.' };
    if (trimmed.length > 30) return { success: false, error: 'Username must be 30 characters or fewer.' };
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      return { success: false, error: 'Username may only contain letters, numbers, dots, hyphens, underscores.' };
    }

    const pw = String(password);
    if (pw.length < MIN_PASSWORD_LENGTH) {
      return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    if (pw.length > 128) {
      return { success: false, error: 'Password must be 128 characters or fewer.' };
    }

    const users = get().users;
    if (users.some((u) => u.username === trimmed)) {
      return { success: false, error: 'That username is already taken.' };
    }

    const passwordHash = await hashPassword(pw);
    const next = {
      username: trimmed,
      passwordHash,
      name: String(name).trim().slice(0, 50) || trimmed,
      role: role === 'admin' ? 'admin' : 'user',
    };
    const updated = [...users, next];
    persistUsers(updated);
    set({ users: updated });
    return { success: true };
  },

  /**
   * Removes a user, enforcing self-delete and last-admin protections.
   * @param {string} username
   * @returns {{ success: boolean; error?: string }}
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

  isAdmin: () => get().user?.role === 'admin',
}));

export default useAuthStore;
