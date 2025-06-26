import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    },
    // Keep chunks small for better caching
    chunkSizeWarningLimit: 50,
    // Generate source maps for debugging
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true,
    // Enable CORS for fetching from RPG repo
    cors: true
  },
  // Base URL for GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' ? '/cosmos-engine-vtt/' : '/',
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev startup
    include: []
  }
});