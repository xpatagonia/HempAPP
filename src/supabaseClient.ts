import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CLIENTE SUPABASE - CONFIGURACIÓN VERCEL
// ------------------------------------------------------------------

// 1. Intentamos leer las variables de entorno inyectadas por Vercel (Vite)
const env = (import.meta as any).env || {};
let SUPABASE_URL = env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

// 2. Si no hay variables de entorno (ej: desarrollo local sin .env), buscamos en LocalStorage
// Esto permite configurar la app desde la pantalla de Login -> Configuración sin tocar código.
const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
        console.log("🔌 Usando credenciales de Supabase desde configuración local.");
    }
}

// 3. Inicialización del cliente
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

// Helper para verificar estado de conexión
export const checkConnection = async () => {
    if (isPlaceholder(SUPABASE_URL)) return false;
    try {
        // Intentamos una lectura muy liviana (HEAD request)
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        // Si no hay error de red, asumimos conectado
        if (!error || (error && error.code !== 'NetworkError' && error.code !== '500')) return true;
        
        return false;
    } catch (e) {
        return false;
    }
};