import { createClient } from '@supabase/supabase-js';

// 1. Intentamos leer variables de entorno (Vite / Vercel)
const env = (import.meta as any).env || {};
let SUPABASE_URL = env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

// 2. Si no hay variables de entorno, buscamos en el almacenamiento local del navegador
// Esto permite configurar la app desde la pantalla de "Settings" sin tocar código
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('placeholder')) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl;
        SUPABASE_ANON_KEY = storedKey;
        console.log("🟢 Conectando usando credenciales configuradas manualmente.");
    } else {
        console.warn('⚠️ Sin conexión real: Faltan credenciales de Supabase.');
    }
}

// Inicializamos el cliente. Si fallan las credenciales, funcionará en modo desconectado/error controlado.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key'
);

// Helper para verificar conexión real
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('users').select('count').single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 es "no rows", que es OK.
        return true;
    } catch (e) {
        return false;
    }
};