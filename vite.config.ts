import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        manifest: {
          name: 'HorizonFI',
          short_name: 'HorizonFI',
          description: 'A progressive web application for offline-first financial planning.',
          theme_color: '#ffffff'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    envPrefix: ['VITE_FIREBASE_'], // Strictly restrict to only explicitly allowed prefixes
    build: {
      sourcemap: false, // Prevent sourcemaps from leaking code logic in production
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
