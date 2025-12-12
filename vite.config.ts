import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000, // Aumentado para evitar advertencias irrelevantes
    rollupOptions: {
      output: {
        // Eliminamos la configuración manual agresiva que causaba conflictos con emailjs
        // Vite manejará automáticamente la división de código (Code Splitting)
        manualChunks: undefined
      }
    }
  }
});