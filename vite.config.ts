
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  // V57 Timestamp
  const buildTime = new Date().toISOString();
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (process as any).env.API_KEY),
      'process.env.BUILD_TIME': JSON.stringify(buildTime),
      'process.env.APP_VERSION': JSON.stringify('V57-RED')
    },
    build: {
      // Cambiamos el limite para alterar el hash del chunk
      chunkSizeWarningLimit: 2500, 
      rollupOptions: {
        output: {
          // Forzar nuevos nombres de archivo
          entryFileNames: `assets/[name].v57.[hash].js`,
          chunkFileNames: `assets/[name].v57.[hash].js`,
          assetFileNames: `assets/[name].v57.[hash].[ext]`
        }
      }
    }
  };
});
