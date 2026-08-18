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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // App-Shell offline-fähig; große Konverter-Libraries (ffmpeg.wasm, pdf.js-Worker)
        // werden separat gecacht (siehe Runtime-Caching in src/sw.js), statt das
        // initiale Precaching unnötig aufzublähen.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
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
        share_target: {
          action: './share-target/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'file',
                accept: [
                  'image/*', 'audio/*', 'video/*',
                  '.pdf', '.docx', '.md', '.markdown', '.txt',
                  '.csv', '.xlsx', '.xls', '.json',
                ],
              },
            ],
          },
        },
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
