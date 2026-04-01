import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ivr-flow-builder/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-reactflow': ['reactflow', 'dagre'],
          'vendor-design': ['@exotel-npm-dev/signal-design-system'],
          'vendor-export': ['exceljs', 'docx', 'file-saver'],
        },
      },
    },
  },
});
