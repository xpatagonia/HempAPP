
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carga segura de variables de entorno
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.APP_VERSION': JSON.stringify('V700-PROD-FIX'),
      'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
    },
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            maps: ['leaflet', 'react-leaflet'],
            utils: ['xlsx', 'jspdf', 'lucide-react']
          }
        }
      }
    }
  };
});
