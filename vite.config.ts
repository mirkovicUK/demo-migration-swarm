import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: 'index.html',
    },
  },
  resolve: {
    extensions: ['.ts', '.js', '.jsx', '.tsx', '.json'],
  },
});