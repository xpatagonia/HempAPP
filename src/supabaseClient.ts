
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN
// ------------------------------------------------------------------

// NOTA DE SEGURIDAD IMPORTANTE:
// Se han eliminado las credenciales hardcoded (PROD_URL, PROD_KEY).
// GitHub bloquea los push si detecta claves reales en el código.
// La aplicación ahora confía exclusivamente en las variables de entorno (.env)
// o en la configuración manual vía LocalStorage.

const env = (import.meta as any).env || {};

// 1. Intentamos leer las variables de entorno estándar de Vite
let SUPABASE_URL = env.VITE_SUPABASE_URL || '';
let SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

// 2. Fallback: Permitir anulación manual desde LocalStorage si las variables de entorno fallan
// Esto es útil para despliegues rápidos o depuración sin recompilar .env
if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
        console.log("🔌 Usando credenciales de Supabase desde LocalStorage.");
    }
}

// Validación para evitar crash si no hay keys, usando valores dummy seguros
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
        // Intentamos una operación ligera para verificar conectividad
        const { error } = await supabase.from('users').select('id').limit(1);
        // Códigos exitosos (incluso si la tabla está vacía o hay RLS): 42P01, PGRST116, 401
        if (!error || ['42P01', 'PGRST116', '401'].includes(error.code)) return true; 
        return false;
    } catch (e) {
        return false;
    }
};
