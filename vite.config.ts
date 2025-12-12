import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // 1. Externalizamos la librería para que Vite no intente empaquetarla
      external: ['@google/genai'],
      output: {
        // 2. Le decimos a Rollup explícitamente qué URL usar para esta importación externa
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