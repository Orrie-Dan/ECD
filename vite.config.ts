import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

/**
 * Minimal PWA shell (Sprint 4.8.7).
 * Caches HTML/JS/CSS/static assets so the SPA boots offline.
 * Does NOT cache authenticated API responses — LocalStore + SyncEngine remain authoritative.
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Apply new service workers eagerly so hosted deploys surface quickly.
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['ncda-logo.png', 'icons.svg'],
      manifest: {
        name: "Sisitemu y'Imbonezamikurire y'Abana Bato",
        short_name: 'ECD',
        description: "Ubuyobozi bw'Iterambere ry'Abana Bato — ECD Rwanda",
        theme_color: '#0B6E4F',
        background_color: '#F7F9F8',
        display: 'standalone',
        start_url: '/',
        lang: 'rw',
        icons: [
          {
            src: '/ncda-logo.png',
            sizes: '542x197',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/ncda-logo.png',
            sizes: '542x197',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache app shell only. Never network-first API caching.
        // Main bundle is ~2.2 MB; default 2 MiB would skip it and break offline boot.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/dashboards\//],
        runtimeCaching: [
          {
            // Google fonts (optional offline typography) — cache-first, not API.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ecd-google-fonts-stylesheets',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ecd-google-fonts-webfonts',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
