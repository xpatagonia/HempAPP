import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // ESTO SOLUCIONA EL ERROR DE BUILD:
      // Le decimos a Vite que NO intente incluir esta librería en el bundle.
      external: ['@google/genai'],
      output: {
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