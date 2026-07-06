import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev mode proxy /api → backend at localhost:5000
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Do NOT rewrite — keep /api prefix so Express routes match
      },
    },
  },
  build: {
    // Silence the chunk size warning — Recharts is intentionally large
    chunkSizeWarningLimit: 1000,
  },
});
