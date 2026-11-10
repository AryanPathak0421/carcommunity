import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5005'

/** The proxied request is server-to-server: strip the browser Origin so the API's CORS list is not involved. */
function dropOrigin(proxy) {
  proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
  proxy.on('proxyReqWs', (proxyReq) => proxyReq.removeHeader('origin'))
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    // Listen on every interface so phones/other PCs on the same Wi-Fi can open http://<this-pc-ip>:5180
    host: true,
    // The browser only ever talks to this origin; API + sockets are forwarded to the backend.
    // (So the app works from any device without "localhost" or CORS problems.)
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true, configure: dropOrigin },
      '/socket.io': { target: BACKEND_URL, changeOrigin: true, ws: true, configure: dropOrigin },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && warning.id?.includes('lottie-web')) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lottie-web')) {
              return 'vendor-lottie';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
