import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE SUPABASE
// Ve a Project Settings -> API en supabase.com
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'; 
const SUPABASE_ANON_KEY = 'tu-clave-anon-publica';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
