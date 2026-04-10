import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/hebcal': {
        target: 'http://hebcal-service:3001',
        rewrite: (p) => p.replace(/^\/api\/hebcal/, ''),
      },
      '/api/sefaria': {
        target: 'http://sefaria-service:3002',
        rewrite: (p) => p.replace(/^\/api\/sefaria/, ''),
      },
    },
  },
});
