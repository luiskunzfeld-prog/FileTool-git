import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Filetool',
        short_name: 'Filetool',
        description: 'Dateien direkt im Browser konvertieren und bearbeiten – ohne Upload.',
        theme_color: '#1C1410',
        background_color: '#1C1410',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App-Shell offline-fähig; große Konverter-Libraries (ffmpeg.wasm etc.)
        // werden pro Feature separat gecacht, sobald sie in späteren Phasen dazukommen.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            // ffmpeg-Kern (~25 MB) kommt vom CDN statt aus dem eigenen Build —
            // nach dem ersten Laden dauerhaft cachen, damit er auch offline nutzbar bleibt.
            urlPattern: ({ url }) => url.origin === 'https://unpkg.com' && url.pathname.includes('@ffmpeg/core'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-core-cache',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
