import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '613 Jewish Suite',
        short_name: '613',
        description: 'Self-hosted Orthodox Jewish Torah learning and Luach tools',
        theme_color: '#0f2744',
        background_color: '#f4f1eb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache entire app shell (JS, CSS, HTML, fonts, icons)
        globPatterns: ['**/*.{js,css,html,svg,woff2,ico,png}'],
        runtimeCaching: [
          // Sefaria text chapters – CacheFirst: once read, always available offline
          {
            urlPattern: /\/api\/sefaria\/texts\/.+\/\d+(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sefaria-chapters',
              expiration: { maxEntries: 1000, maxAgeSeconds: 90 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Books list – StaleWhileRevalidate: fast from cache, updated in background
          {
            urlPattern: /\/api\/sefaria\/texts\/books(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'sefaria-meta',
              expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Notes & bookmarks – NetworkFirst: try server, fall back to cache when offline
          {
            urlPattern: /\/api\/sefaria\/notes/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sefaria-notes',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // hebcal-service removed – all calendar/zmanim computation runs in the browser
      '/api/sefaria': {
        target: 'http://sefaria-service:3002',
        rewrite: (p) => p.replace(/^\/api\/sefaria/, ''),
      },
    },
  },
});
