import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

// Resolve all @daw/* packages to their source files directly
const packagesDir = path.resolve(__dirname, '../../packages');
const dawAliases: Record<string, string> = {};
for (const pkg of fs.readdirSync(packagesDir)) {
  const srcIndex = path.join(packagesDir, pkg, 'src', 'index.ts');
  if (fs.existsSync(srcIndex)) {
    dawAliases[`@daw/${pkg}`] = srcIndex;
  }
}

export default defineConfig({
  base: '/kimidaw/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,mp3}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
      },
      manifest: {
        name: 'In-Browser DAW',
        short_name: 'WebDAW',
        description: 'Professional-grade digital audio workstation in your browser',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/kimidaw/',
        start_url: '/kimidaw/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: dawAliases,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco': ['monaco-editor'],
          'react-vendor': ['react', 'react-dom'],
          'daw-engine': [
            '@daw/engine-core',
            '@daw/engine-scheduler',
            '@daw/dsp-runtime'
          ],
          'daw-ui': [
            '@daw/ui-shell',
            '@daw/ui-arrange',
            '@daw/ui-pianoroll',
            '@daw/ui-mixer'
          ]
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@daw/dsp-runtime']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    fs: {
      allow: ['..']
    }
  }
});
