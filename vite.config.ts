
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
      'process.env.APP_VERSION': JSON.stringify('V200-BLACKOUT')
    },
    build: {
      chunkSizeWarningLimit: 3000, 
      rollupOptions: {
        output: {
          // CAMBIO NUCLEAR V200: Hash único
          entryFileNames: `assets/[name]-V200-[hash].js`,
          chunkFileNames: `assets/[name]-V200-[hash].js`,
          assetFileNames: `assets/[name]-V200-[hash].[ext]`
        }
      }
    }
  };
});
