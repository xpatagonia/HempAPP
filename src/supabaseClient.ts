import { createClient } from '@supabase/supabase-js';

// Usamos import.meta.env para leer las variables de entorno en Vite
// Fix: Cast import.meta to any to avoid "Property 'env' does not exist on type 'ImportMeta'" error
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan las variables de entorno de Supabase. Revisa tu archivo .env o la configuración de Vercel.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);