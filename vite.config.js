import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  envPrefix: ['VITE_', 'HTS_', 'BACKEND_URL'],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://cf-production-1fbb.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
