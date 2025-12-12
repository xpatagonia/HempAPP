import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // 1. Externalizar la librería para que Vite no la empaquete
      external: ['@google/genai'],
      output: {
        // 2. REGLA CLAVE: Reemplazar el import "@google/genai" por esta URL en el archivo final
        paths: {
          '@google/genai': 'https://esm.sh/@google/genai@0.2.1'
        },
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          utils: ['xlsx', 'jspdf', 'jspdf-autotable', '@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  }
});