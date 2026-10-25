import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        /*
         * Las imágenes no van en el precache (son ~20 MB entre topo y
         * stickers), pero la primera vez que se ven quedan guardadas: al
         * volver a la pantalla salen al instante, sin el brinco de cargar.
         */
        runtimeCaching: [
          {
            urlPattern: /\/(assets|topo|madriguera|despensa)\/.*\.(?:webp|png|jpe?g|svg|gif)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'zaldo-imagenes',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Zaldo',
        short_name: 'Zaldo',
        description: 'Mis Cuentas',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        /*
         * Acceso directo desde el ícono de la app: al mantener presionado sale
         * "Nuevo gasto" y abre el home con el modal de captura ya arriba.
         */
        shortcuts: [
          {
            name: 'Nuevo gasto',
            short_name: 'Nuevo gasto',
            description: 'Registrar un movimiento al momento',
            url: '/home?nuevoMovimiento=1',
            icons: [
              {
                src: '/bgPattern.webp',
                sizes: '192x192',
                type: 'image/webp'
              }
            ]
          }
        ],
        icons: [
          {
            src: '/bgPattern.webp',
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: '/bgPattern.webp',
            sizes: '512x512',
            type: 'image/webp'
          },
          {
            src: '/bgPattern.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
