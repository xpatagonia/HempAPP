import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), "");

  // Soporta tanto variables con prefijo VITE_ como variables estándar sin prefijo (SUPABASE_URL, etc.)
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "";

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
      "__APP_VERSION__": JSON.stringify("V7.12.2-STABLE"),
      "__BUILD_TIME__": JSON.stringify(new Date().toISOString()),
      ...(supabaseUrl ? { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl) } : {}),
      ...(supabaseAnonKey ? { "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey) } : {}),
      ...(geminiKey ? { "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(geminiKey) } : {}),
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
