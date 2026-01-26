
// Fix: Change 'vite' to 'vite/client' to correctly reference Vite's client-side types
/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __API_KEY__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  BASE_URL: string
  MODE: string
  DEV: boolean
  PROD: boolean
  SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
