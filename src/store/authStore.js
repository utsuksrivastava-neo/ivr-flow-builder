import { create } from 'zustand';

const DEMO_USER = { username: 'demo', password: 'demo123', name: 'Demo User' };

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('ivr-auth') || 'null'),

  login: (username, password) => {
    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      const user = { username: DEMO_USER.username, name: DEMO_USER.name };
      localStorage.setItem('ivr-auth', JSON.stringify(user));
      set({ user });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('ivr-auth');
    set({ user: null });
  },
}));

export default useAuthStore;
