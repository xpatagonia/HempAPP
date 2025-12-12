import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Dejamos que Vite maneje los chunks automáticamente para evitar errores de resolución
        manualChunks: undefined
      }
    }
  }
});