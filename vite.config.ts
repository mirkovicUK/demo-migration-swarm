import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  root: './src',
  publicDir: './public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
