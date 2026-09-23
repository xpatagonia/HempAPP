
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // FIX: Usamos (process as any) para evitar errores de tipado si @types/node falla
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // V7.0.6 - STABLE BUILD FIX
      '__APP_VERSION__': JSON.stringify('V7.0.6-STABLE'),
      '__API_KEY__': JSON.stringify(env.API_KEY || ''),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      // CRITICAL FIX: Inyectar variable de entorno para que el SDK de Google funcione en navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`
        }
      }
    }
  };
});
