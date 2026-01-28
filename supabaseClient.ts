import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN (HYBRID MODE)
// ------------------------------------------------------------------

// NOTA DE SEGURIDAD:
// Se han eliminado las credenciales hardcoded para permitir el push a repositorios públicos/privados.
// GitHub bloquea commits que contienen JWTs reales.
// La aplicación leerá las claves desde:
// 1. Variables de entorno (Vite)
// 2. LocalStorage (Configuración manual en UI)

const env = (import.meta as any).env || {};
let SUPABASE_URL = env.VITE_SUPABASE_URL || '';
let SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

// Permitir anulación manual desde UI si las credenciales de entorno fallan
if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

// Valores por defecto seguros (no son claves reales) para evitar crash inicial
const finalUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const finalKey = SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(
  finalUrl, 
  finalKey,
  {
      auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
      }
  }
);

export const checkConnection = async () => {
    if (isPlaceholder(finalUrl) || isPlaceholder(finalKey)) return false;
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        // Códigos exitosos aunque falten datos o permisos: 42P01 (no existe tabla), 401 (auth), PGRST116 (vacío)
        if (!error || ['42P01', 'PGRST116', '401'].includes(error.code)) return true; 
        return false;
    } catch (e) {
        return false;
    }
};
