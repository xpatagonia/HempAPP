
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN (CLOUD MODE)
// ------------------------------------------------------------------
// Credenciales incrustadas para acceso inmediato desde cualquier dispositivo.
// ------------------------------------------------------------------

const HARDCODED_URL = 'https://vkfgxbsomxzirdezwrxz.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmd4YnNvbXh6aXJkZXp3cnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njk3NjEsImV4cCI6MjA4MTI0NTc2MX0.TYRwDgGqKSEEwMk4vtQty3FZ65WFWu2yEWbSOP3W4_U'; 

// ------------------------------------------------------------------

const env = (import.meta as any).env || {};
// Prioridad: 1. Hardcoded (Cloud Mode) -> 2. Variables de Entorno (Vercel) -> 3. LocalStorage (Manual)
let SUPABASE_URL = HARDCODED_URL || env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = HARDCODED_KEY || env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

// Si NO hay credenciales fijas ni de entorno, buscamos en el navegador (Modo Manual antiguo)
if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

// Bandera para que el Login sepa que ya estamos listos
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
        // Intentamos una lectura simple (Limit 1) en lugar de HEAD para evitar problemas de CORS/Browsers
        const { data, error } = await supabase.from('users').select('id').limit(1);
        
        // Si no hay error, o el error es de tabla/permisos (significa que conectó), devolvemos true
        // PGRST116: Returns when data is empty but connection worked (Single)
        // 42P01: Relation does not exist (Conectó pero falta tabla)
        // 401: Unauthorized (Conectó pero RLS bloquea)
        if (!error) return true;
        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === '401') return true; 
        
        console.warn("Fallo de conexión Supabase:", error.message);
        return false;
    } catch (e) {
        console.error("Error crítico conexión:", e);
        return false;
    }
};
