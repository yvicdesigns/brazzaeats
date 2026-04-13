import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // Fichiers à précacher lors du build
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Stratégie réseau-puis-cache pour les appels API Supabase
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
          {
            // Images hébergées dans Supabase Storage
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },

      // Manifest PWA inline (remplace public/manifest.json)
      manifest: {
        name: 'Zandofood',
        short_name: 'Zandofood',
        description: 'Commandez vos plats préférés au Congo',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#E85D26',
        orientation: 'portrait-primary',
        lang: 'fr',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['food', 'shopping', 'lifestyle'],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['lucide-react', 'react-hot-toast', 'framer-motion'],
          'vendor-forms':    ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-misc':     ['zustand', 'date-fns'],
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
    allowedHosts: 'all',
  },
})
