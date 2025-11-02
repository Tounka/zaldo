import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // auto-actualiza el service worker
      manifest: {
        name: 'Zaldo',
        short_name: 'Zaldo',
        description: 'Mis Cuentas',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: './media/img/bgPattern.webp',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './media/img/bgPattern.webp',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: './media/img/bgPattern.webp',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
