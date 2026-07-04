import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});