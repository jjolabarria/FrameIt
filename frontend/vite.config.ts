import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://localhost:7213',
      '/hubs': {
        target: 'https://localhost:7213',
        ws: true,
      },
    },
  },
})
