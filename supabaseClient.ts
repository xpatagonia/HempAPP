
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN
// ------------------------------------------------------------------
// Para que la app funcione en todos los dispositivos sin configurar nada manualmente:
// 1. Pega tu Project URL dentro de las comillas de HARDCODED_URL.
// 2. Pega tu Anon API Key dentro de las comillas de HARDCODED_KEY.
// ------------------------------------------------------------------

const HARDCODED_URL = ''; 
const HARDCODED_KEY = ''; 

// ------------------------------------------------------------------

const env = (import.meta as any).env || {};
let SUPABASE_URL = HARDCODED_URL || env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = HARDCODED_KEY || env.VITE_SUPABASE_ANON_KEY;

// Si no hay hardcode ni variables de entorno, buscamos en LocalStorage (Modo Manual)
const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

// Exportamos bandera para saber si la app ya tiene configuración "de fábrica"
export const hasPreconfiguredConnection = !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
      auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
      }
  }
);

export const checkConnection = async () => {
    // Si no hay credenciales válidas, retornamos false inmediatamente
    if (isPlaceholder(SUPABASE_URL) || SUPABASE_URL.includes('placeholder')) return false;
    
    try {
        // Intentamos una lectura ligera (HEAD request) a la tabla users
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        
        // Si no hay error, o el error es de tabla/permisos (significa que conectó), devolvemos true
        if (!error) return true;
        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '401') return true; 
        
        console.warn("Fallo de conexión Supabase:", error.message);
        return false;
    } catch (e) {
        return false;
    }
};
