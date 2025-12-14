
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CLIENTE SUPABASE
// ------------------------------------------------------------------

// NOTA: Si borraste tu proyecto y creaste uno nuevo, las credenciales anteriores ya no sirven.
// He dejado estas variables vacías para que la App entre en "Modo Configuración"
// y puedas ingresar las nuevas claves desde la pantalla de Login sin tocar código.

const HARDCODED_URL = ''; // Dejar vacío para obligar configuración manual o .env
const HARDCODED_KEY = ''; // Dejar vacío para obligar configuración manual o .env

// ------------------------------------------------------------------

// 1. Prioridad: Credenciales Hardcodeadas (Si se rellenan arriba)
// 2. Prioridad: Variables de Entorno (Vite/Vercel)
const env = (import.meta as any).env || {};
let SUPABASE_URL = HARDCODED_URL || env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = HARDCODED_KEY || env.VITE_SUPABASE_ANON_KEY;

// 3. Prioridad: LocalStorage (Configuración ingresada por el usuario en la UI)
const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
    }
}

// Inicialización del cliente
// Si no hay claves, usamos valores dummy para que la app no explote al iniciar, 
// pero fallará la conexión (activando el Modo Emergencia).
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
        
        // Si el error es 404 (tabla no existe) o éxito, hay conexión.
        // Si el error es NetworkError o 500, no hay conexión.
        if (error && (error.code === 'PGRST116' || error.code === '42P01')) return true; 
        if (!error || (error && error.code !== 'NetworkError' && error.code !== '500')) return true;
        
        return false;
    } catch (e) {
        return false;
    }
};
