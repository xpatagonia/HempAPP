
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CLIENTE SUPABASE
// ------------------------------------------------------------------

const HARDCODED_URL = ''; 
const HARDCODED_KEY = ''; 

// ------------------------------------------------------------------

const env = (import.meta as any).env || {};
let SUPABASE_URL = HARDCODED_URL || env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = HARDCODED_KEY || env.VITE_SUPABASE_ANON_KEY;

// Buscar en LocalStorage si no hay env vars
const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

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
    // Si las URLs son placeholders o están vacías, no hay conexión posible
    if (isPlaceholder(SUPABASE_URL) || SUPABASE_URL.includes('placeholder')) return false;
    
    try {
        // Intentamos una lectura ligera (HEAD request) a la tabla users
        // Usamos count: exact y head: true para minimizar transferencia de datos
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        
        // Análisis de errores para determinar estado real
        if (!error) return true; // Éxito total
        
        // PGRST116: Returns when data is empty but connection worked (often with .single())
        // 42P01: Relation does not exist (Conectó a la DB pero falta la tabla -> ESTÁ ONLINE)
        // 401: Unauthorized (Conectó pero la key es mala o RLS bloquea -> ESTÁ ONLINE PERO SIN PERMISOS)
        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '401') return true; 
        
        console.warn("Fallo de conexión Supabase:", error.message);
        return false;
    } catch (e) {
        return false;
    }
};
