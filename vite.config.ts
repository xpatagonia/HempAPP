
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carga todas las variables de entorno sin importar el prefijo VITE_
  // Fixed: Cast process to any to avoid 'cwd' does not exist on type 'Process' error
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Mapeo directo y robusto de la variable process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (process as any).env.API_KEY)
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
  };
});
