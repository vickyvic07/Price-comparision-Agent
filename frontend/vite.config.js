import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    // Dev only: proxy /api → local backend so you don't need VITE_API_BASE_URL locally
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Raise the chunk-size warning threshold (Recharts is intentionally large)
    chunkSizeWarningLimit: 1000,
  },
});
