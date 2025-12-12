import { createClient } from '@supabase/supabase-js';

// 1. Intentamos leer variables de entorno (Vite / Vercel)
const env = (import.meta as any).env || {};
let SUPABASE_URL = env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

// 2. Lógica de Fallback (LocalStorage)
// Si las variables de entorno faltan o son placeholders, buscamos en el navegador.
const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str.includes('tu-proyecto');

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        // .trim() es vital para evitar errores por espacios al copiar/pegar
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
        console.log("🟢 Conectando usando credenciales del navegador.");
    } else {
        console.warn('⚠️ Sin conexión real: Faltan credenciales de Supabase.');
    }
}

// Inicializamos el cliente con opciones de persistencia mejoradas
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
      auth: {
          persistSession: true, // Mantiene la sesión activa
          autoRefreshToken: true,
      }
  }
);

// Helper para verificar conexión real
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('users').select('count').single();
        // PGRST116 significa que la tabla existe pero no devolvió filas (o devolvió count), lo cual es Éxito de conexión.
        if (error && error.code !== 'PGRST116') throw error; 
        return true;
    } catch (e) {
        console.error("Fallo de conexión:", e);
        return false;
    }
};