import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '2028 수능 플래너',
        short_name: '수능플래너',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
    }),
  ],
  build: {
    rollupOptions: {
      output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'], charts: ['recharts'] } },
    },
    chunkSizeWarningLimit: 700,
  },
  test: { environment: 'node' },
});
