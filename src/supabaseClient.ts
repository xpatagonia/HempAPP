import { createClient } from '@supabase/supabase-js';

// Usamos import.meta.env para leer las variables de entorno en Vite
// Accedemos a env de forma segura
const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('🔴 ADVERTENCIA: Faltan variables de entorno (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). La base de datos no conectará correctamente.');
}

// Inicializamos el cliente con valores fallback para evitar que la app se rompa al inicio (White Screen)
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key'
);