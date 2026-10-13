
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // FIX: Usamos (process as any) para evitar errores de tipado si @types/node falla
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Filtrar clave de Gemini: evitar que claves de Supabase (sb_publishable...) se pasen al SDK de Google
  const defaultGeminiKey = 'AQ.Ab8RN6LAEMU1tHqdCrzf4gCMrQeU3id02FXu5aAZy0vR9ouiQA';
  const rawKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || defaultGeminiKey;
  const geminiKey = rawKey && !rawKey.startsWith('sb_') ? rawKey : defaultGeminiKey;

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      cors: true
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      cors: true
    },
    define: {
      '__APP_VERSION__': JSON.stringify('V7.10.1-STABLE'),
      '__API_KEY__': JSON.stringify(geminiKey),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      'process.env.API_KEY': JSON.stringify(geminiKey)
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
