import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Eliminamos 'external' para que Vite empaquete todas las librerías desde node_modules
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          utils: ['xlsx', 'jspdf', 'jspdf-autotable', '@supabase/supabase-js', '@emailjs/browser'],
          icons: ['lucide-react']
        }
      }
    }
  }
});