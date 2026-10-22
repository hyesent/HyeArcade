import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          capacitor: [
            '@capacitor/core',
            '@capacitor/app',
            '@capacitor/haptics',
            '@capacitor/preferences',
            '@capacitor/filesystem',
            '@capacitor/status-bar',
          ],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  assetsInclude: ['**/*.txt'],
});