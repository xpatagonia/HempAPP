// Fix: Removed problematic reference to vite/client to resolve build error. 
// Standard Vite environment types for ImportMeta are manually declared below.

declare const __APP_VERSION__: string;
declare const __API_KEY__: string;
declare const __BUILD_TIME__: string;

// Fix: Declaring process.env to support the hard requirement of process.env.API_KEY
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string;
  };
};

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
