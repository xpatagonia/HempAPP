// Fix: Removed problematic reference to vite/client to resolve build error. 
// Standard Vite environment types for ImportMeta are manually declared below.

declare const __APP_VERSION__: string;
declare const __API_KEY__: string;
declare const __BUILD_TIME__: string;

// Fix: Removed conflicting manual declaration of 'process'.
// It is already declared in the environment (likely via @types/node).

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

// Fix: Declare react-router-dom module to resolve missing exported members errors
declare module 'react-router-dom';

declare module '*.png' {
  const value: string;
  export default value;
}
