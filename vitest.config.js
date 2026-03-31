/**
 * Vitest configuration for the IVR Flow Builder test suite.
 *
 * Uses jsdom to simulate a browser environment so React components
 * and stores that reference `localStorage` or DOM APIs work correctly.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
  },
});
