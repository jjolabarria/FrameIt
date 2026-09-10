import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Keep the browser origin so the API's join URLs and QR codes open the frontend.
      '/api': { target: 'http://localhost:5130', changeOrigin: false },
      '/hubs': {
        target: 'http://localhost:5130',
        ws: true,
        changeOrigin: false,
      },
    },
  },
})
