
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN (CLOUD MODE)
// ------------------------------------------------------------------

const HARDCODED_URL = 'https://vkfgxbsomxzirdezwrxz.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmd4YnNvbXh6aXJkZXp3cnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njk3NjEsImV4cCI6MjA4MTI0NTc2MX0.TYRwDgGqKSEEwMk4vtQty3FZ65WFWu2yEWbSOP3W4_U'; 

// ------------------------------------------------------------------

const env = (import.meta as any).env || {};
let SUPABASE_URL = HARDCODED_URL || env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = HARDCODED_KEY || env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

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
    if (isPlaceholder(SUPABASE_URL) || SUPABASE_URL.includes('placeholder')) return false;
    try {
        // Solo verificamos si el endpoint de Supabase responde. No fallamos si faltan tablas.
        const { error } = await supabase.from('users').select('id').limit(1);
        
        // Si el error es 42P01 (tabla no existe) o 401 (no autorizado), significa que hay conexión pero falta setup.
        // Solo devolvemos falso si es un error de red o de URL inválida.
        if (!error) return true;
        if (error.code === '42P01' || error.code === 'PGRST116' || error.code === '401') return true; 
        
        return false;
    } catch (e) {
        return false;
    }
};
