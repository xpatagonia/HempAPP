import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Aumentamos el limite de advertencia
    rollupOptions: {
      output: {
        // Dividimos las librerías grandes en archivos separados para optimizar carga
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          utils: ['xlsx', 'jspdf', 'jspdf-autotable', '@supabase/supabase-js', '@google/genai'],
          icons: ['lucide-react']
        }
      }
    }
  }
});