import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN (HYBRID MODE)
// ------------------------------------------------------------------

// Prioridad: 1. Process/Vite Env -> 2. Hardcoded (Fallback) -> 3. LocalStorage (Manual Override)

const PROD_URL = 'https://vkfgxbsomxzirdezwrxz.supabase.co'; 
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmd4YnNvbXh6aXJkZXp3cnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njk3NjEsImV4cCI6MjA4MTI0NTc2MX0.TYRwDgGqKSEEwMk4vtQty3FZ65WFWu2yEWbSOP3W4_U'; 

const env = (import.meta as any).env || {};
let SUPABASE_URL = env.VITE_SUPABASE_URL || PROD_URL;
let SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || PROD_KEY;

const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

// Permitir anulación manual desde UI si las credenciales fallan
if (isPlaceholder(SUPABASE_URL)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY,
  {
      auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
      }
  }
);

export const checkConnection = async () => {
    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) return false;
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        // Códigos exitosos aunque falten datos o permisos: 42P01 (no existe tabla), 401 (auth), PGRST116 (vacío)
        if (!error || ['42P01', 'PGRST116', '401'].includes(error.code)) return true; 
        return false;
    } catch (e) {
        return false;
    }
};
