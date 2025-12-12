import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURACIÓN GLOBAL (PARA QUE FUNCIONE EN TODOS LOS DISPOSITIVOS)
// ------------------------------------------------------------------
// Para evitar el mensaje "Sin Conexión Cloud" en otros PCs, pega tus claves aquí.
// Al ponerlas aquí, cualquier dispositivo que abra la app se conectará automáticamente.
const HARDCODED_URL = 'https://llvtobsqerfmpobsruys.supabase.co'; // <-- PEGA TU URL DE SUPABASE AQUÍ (ej: https://xyz.supabase.co)
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdnRvYnNxZXJmbXBvYnNydXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzIzMzEsImV4cCI6MjA4MTA0ODMzMX0.86c7PzALVTIrC2GgaeBoxu-P6vOS0pAk3x1yZI5fZKc'; // <-- PEGA TU ANON KEY AQUÍ (ej: eyJhbGciOiJIUzI1NiIsInR...)
// ------------------------------------------------------------------

// 1. Prioridad: Credenciales Hardcodeadas (Para producción rápida)
// 2. Prioridad: Variables de Entorno (Vite/Vercel)
const env = (import.meta as any).env || {};
let SUPABASE_URL = HARDCODED_URL || env.VITE_SUPABASE_URL;
let SUPABASE_ANON_KEY = HARDCODED_KEY || env.VITE_SUPABASE_ANON_KEY;

// 3. Prioridad: LocalStorage (Fallback para desarrollo local)
const isPlaceholder = (str: string) => !str || str.includes('placeholder') || str === '';

if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl && storedKey) {
        SUPABASE_URL = storedUrl.trim();
        SUPABASE_ANON_KEY = storedKey.trim();
        // Solo mostramos log en consola
    }
}

// Inicialización del cliente
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
        
        // Si no hay error de red, asumimos conectado (aunque devuelva error de permiso/tabla vacía)
        if (error && error.code === 'PGRST116') return true; // Código de éxito en .single() vacío, aquí por seguridad
        if (!error || (error && error.code !== 'NetworkError' && error.code !== '500')) return true;
        
        return false;
    } catch (e) {
        return false;
    }
};