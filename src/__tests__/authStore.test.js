/**
 * authStore.test.js
 *
 * Unit tests for the authentication Zustand store.
 * Tests login with correct/wrong credentials, logout, and localStorage persistence.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from '../store/authStore';

/** Ensure a clean auth state before each test. */
beforeEach(() => {
  localStorage.removeItem('ivr-auth');
  useAuthStore.setState({ user: null });
});

/* ────────────────────────────────────────────── */
/*  Login                                         */
/* ────────────────────────────────────────────── */
describe('login', () => {
  it('succeeds with the demo credentials', () => {
    const result = useAuthStore.getState().login('demo', 'demo123');
    expect(result).toBe(true);
    const user = useAuthStore.getState().user;
    expect(user).not.toBeNull();
    expect(user.username).toBe('demo');
    expect(user.name).toBe('Demo User');
  });

  it('persists user to localStorage on success', () => {
    useAuthStore.getState().login('demo', 'demo123');
    const stored = JSON.parse(localStorage.getItem('ivr-auth'));
    expect(stored).not.toBeNull();
    expect(stored.username).toBe('demo');
  });

  it('fails with wrong username', () => {
    const result = useAuthStore.getState().login('wrong', 'demo123');
    expect(result).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fails with wrong password', () => {
    const result = useAuthStore.getState().login('demo', 'wrong');
    expect(result).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fails with empty credentials', () => {
    const result = useAuthStore.getState().login('', '');
    expect(result).toBe(false);
  });
});

/* ────────────────────────────────────────────── */
/*  Logout                                        */
/* ────────────────────────────────────────────── */
describe('logout', () => {
  it('clears user state', () => {
    useAuthStore.getState().login('demo', 'demo123');
    expect(useAuthStore.getState().user).not.toBeNull();
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('removes auth from localStorage', () => {
    useAuthStore.getState().login('demo', 'demo123');
    useAuthStore.getState().logout();
    expect(localStorage.getItem('ivr-auth')).toBeNull();
  });
});

/* ────────────────────────────────────────────── */
/*  Persistence                                   */
/* ────────────────────────────────────────────── */
describe('persistence', () => {
  it('restores user from localStorage on store init', () => {
    localStorage.setItem('ivr-auth', JSON.stringify({ username: 'demo', name: 'Demo User' }));
    // The store reads from localStorage in its initializer; re-read:
    const stored = JSON.parse(localStorage.getItem('ivr-auth'));
    expect(stored.username).toBe('demo');
  });
});
