/**
 * authStore.test.js
 *
 * Unit tests for the authentication Zustand store.
 * Tests login (with hashing), brute-force lockout, logout, session expiry,
 * password validation, and user management.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from '../store/authStore';

/** Reset auth state before each test. */
beforeEach(() => {
  localStorage.removeItem('ivr-auth');
  localStorage.removeItem('ivr-users');
  localStorage.removeItem('ivr-lockout');
  const defaultUsers = [
    { username: 'demo', passwordHash: 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', name: 'Demo User', role: 'admin' },
  ];
  localStorage.setItem('ivr-users', JSON.stringify(defaultUsers));
  useAuthStore.setState({ user: null, users: defaultUsers });
});

/* ────────────────────────────────────────────── */
/*  Login                                         */
/* ────────────────────────────────────────────── */
describe('login', () => {
  it('succeeds with the demo credentials', async () => {
    const result = await useAuthStore.getState().login('demo', 'demo123');
    expect(result.success).toBe(true);
    const user = useAuthStore.getState().user;
    expect(user).not.toBeNull();
    expect(user.username).toBe('demo');
    expect(user.name).toBe('Demo User');
    expect(user.role).toBe('admin');
  });

  it('sets session expiry on success', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    const user = useAuthStore.getState().user;
    expect(user.expiresAt).toBeGreaterThan(Date.now());
  });

  it('persists user to localStorage on success', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    const stored = JSON.parse(localStorage.getItem('ivr-auth'));
    expect(stored).not.toBeNull();
    expect(stored.username).toBe('demo');
    expect(stored.expiresAt).toBeGreaterThan(Date.now());
  });

  it('fails with wrong username', async () => {
    const result = await useAuthStore.getState().login('wrong', 'demo123');
    expect(result.success).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fails with wrong password', async () => {
    const result = await useAuthStore.getState().login('demo', 'wrong');
    expect(result.success).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fails with empty credentials', async () => {
    const result = await useAuthStore.getState().login('', '');
    expect(result.success).toBe(false);
  });

  it('shows remaining attempts on failure', async () => {
    const result = await useAuthStore.getState().login('demo', 'bad');
    expect(result.error).toMatch(/attempts left/i);
  });
});

/* ────────────────────────────────────────────── */
/*  Brute-force lockout                           */
/* ────────────────────────────────────────────── */
describe('brute-force protection', () => {
  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await useAuthStore.getState().login('demo', 'badpass');
    }
    const result = await useAuthStore.getState().login('demo', 'demo123');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too many attempts/i);
    expect(result.lockedFor).toBeGreaterThan(0);
  });
});

/* ────────────────────────────────────────────── */
/*  Logout                                        */
/* ────────────────────────────────────────────── */
describe('logout', () => {
  it('clears user state', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    expect(useAuthStore.getState().user).not.toBeNull();
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('removes auth from localStorage', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    useAuthStore.getState().logout();
    expect(localStorage.getItem('ivr-auth')).toBeNull();
  });
});

/* ────────────────────────────────────────────── */
/*  User Management                               */
/* ────────────────────────────────────────────── */
describe('user management', () => {
  it('addUser creates a new user with hashed password', async () => {
    const res = await useAuthStore.getState().addUser('alice', 'secret99', 'Alice', 'user');
    expect(res.success).toBe(true);
    const users = useAuthStore.getState().users;
    const alice = users.find((u) => u.username === 'alice');
    expect(alice).toBeDefined();
    expect(alice.passwordHash).toBeDefined();
    expect(alice.passwordHash).not.toBe('secret99');
  });

  it('addUser rejects short passwords', async () => {
    const res = await useAuthStore.getState().addUser('bob', '12', 'Bob', 'user');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/at least/i);
  });

  it('addUser rejects short usernames', async () => {
    const res = await useAuthStore.getState().addUser('ab', 'validpass', 'AB', 'user');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/at least 3/i);
  });

  it('addUser rejects invalid username characters', async () => {
    const res = await useAuthStore.getState().addUser('user name!', 'validpass', 'Bad', 'user');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/letters, numbers/i);
  });

  it('addUser rejects duplicate username', async () => {
    await useAuthStore.getState().addUser('charlie', 'password1', 'Charlie', 'user');
    const res = await useAuthStore.getState().addUser('charlie', 'password2', 'Charlie2', 'user');
    expect(res.success).toBe(false);
  });

  it('deleteUser removes a user', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    await useAuthStore.getState().addUser('temp', 'temppass', 'Temp', 'user');
    const res = useAuthStore.getState().deleteUser('temp');
    expect(res.success).toBe(true);
    expect(useAuthStore.getState().users.some((u) => u.username === 'temp')).toBe(false);
  });

  it('deleteUser prevents self-deletion', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    const res = useAuthStore.getState().deleteUser('demo');
    expect(res.success).toBe(false);
  });

  it('new user can log in after creation', async () => {
    await useAuthStore.getState().addUser('newuser', 'mypass123', 'New User', 'user');
    useAuthStore.getState().logout();
    localStorage.removeItem('ivr-lockout');
    const result = await useAuthStore.getState().login('newuser', 'mypass123');
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user.username).toBe('newuser');
    expect(useAuthStore.getState().user.role).toBe('user');
  });
});

/* ────────────────────────────────────────────── */
/*  Persistence                                   */
/* ────────────────────────────────────────────── */
describe('persistence', () => {
  it('session stored in localStorage has expiresAt field', async () => {
    await useAuthStore.getState().login('demo', 'demo123');
    const stored = JSON.parse(localStorage.getItem('ivr-auth'));
    expect(stored.expiresAt).toBeDefined();
    expect(typeof stored.expiresAt).toBe('number');
  });

  it('password hashes are stored, not plaintext', async () => {
    await useAuthStore.getState().addUser('hashtest', 'mypassword', 'Hash Test', 'user');
    const raw = JSON.parse(localStorage.getItem('ivr-users'));
    const user = raw.find((u) => u.username === 'hashtest');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe('mypassword');
    expect(user.passwordHash.length).toBe(64); // SHA-256 hex
    expect(user.password).toBeUndefined();
  });
});
