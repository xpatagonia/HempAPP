import { createClient } from '@supabase/supabase-js';

// Usamos import.meta.env para leer las variables de entorno en Vite
const env = (import.meta as any).env;
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('🔴 ERROR CRÍTICO: Faltan variables de entorno (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). La base de datos no funcionará.');
}

// Inicializamos el cliente. Si faltan las variables, usamos valores dummy para permitir
// que la UI cargue y muestre la pantalla de Login, en lugar de una pantalla blanca.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key'
);