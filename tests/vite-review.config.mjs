import { defineConfig } from '../frontend/node_modules/vite/dist/node/index.js';
import react from '../frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import { fileURLToPath } from 'node:url';

// Local integration runner only: the normal app retains its existing dev proxy.
export default defineConfig({
  root: fileURLToPath(new URL('../frontend', import.meta.url)),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5175, strictPort: true, proxy: {
    '/api': { target: 'http://127.0.0.1:5139', changeOrigin: false }, '/hubs': { target: 'http://127.0.0.1:5139', changeOrigin: false, ws: true },
  } },
});
