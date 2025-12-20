
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Esto permite que el código cliente acceda a process.env.API_KEY 
    // extrayéndolo del entorno de construcción (Vercel/Local)
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    chunkSizeWarningLimit: 3000, 
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    }
  }
});
