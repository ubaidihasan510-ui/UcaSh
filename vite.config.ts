import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env for browser compatibility
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});