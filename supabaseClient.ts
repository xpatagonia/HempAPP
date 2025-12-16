
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
    // Si las URLs son placeholders, fallamos inmediatamente
    if (isPlaceholder(SUPABASE_URL) || SUPABASE_URL.includes('placeholder')) return false;
    
    try {
        // Intentamos una lectura ligera
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        
        // Si no hay error, o el error es de tabla (42P01) o permisos (401), asumimos que HAY conexión con el servidor
        // Solo fallamos si es error de red
        if (!error) return true;
        if (error.code === 'PGRST116' || error.code === '42P01') return true; 
        
        console.warn("Fallo de conexión Supabase:", error.message);
        return false;
    } catch (e) {
        return false;
    }
};
