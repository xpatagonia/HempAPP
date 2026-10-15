import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: "0.0.0.0",
      strictPort: true,
      cors: true
    },
    preview: {
      port: 3000,
      host: "0.0.0.0",
      strictPort: true,
      cors: true
    },
    define: {
      "__APP_VERSION__": JSON.stringify("V7.10.2-STABLE"),
      "__BUILD_TIME__": JSON.stringify(new Date().toISOString())
    },
    build: {
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]"
        }
      }
    }
  };
});
