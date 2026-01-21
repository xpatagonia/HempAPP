
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const buildTime = new Date().toISOString();
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (process as any).env.API_KEY),
      'process.env.BUILD_TIME': JSON.stringify(buildTime),
      'process.env.APP_VERSION': JSON.stringify('V300-CRIMSON')
    },
    build: {
      chunkSizeWarningLimit: 3000, 
      rollupOptions: {
        output: {
          // CAMBIO RADICAL V300: Prefijo CRIMSON para obligar a Cloudflare a buscar archivos nuevos
          entryFileNames: `assets/CRIMSON-[name]-[hash].js`,
          chunkFileNames: `assets/CRIMSON-[name]-[hash].js`,
          assetFileNames: `assets/CRIMSON-[name]-[hash].[ext]`
        }
      }
    }
  };
});
