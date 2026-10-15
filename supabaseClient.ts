import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN A SUPABASE (HYBRID MODE)
// En repositorios públicos las credenciales se leen desde variables
// de entorno privadas (Vercel) o desde la configuración local del usuario.
// ------------------------------------------------------------------

const env = (import.meta as any).env || {};

const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

export const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return FALLBACK_URL;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed}.supabase.co`;
};

export const getStoredCredentials = () => {
  let url = env.VITE_SUPABASE_URL || "";
  let key = env.VITE_SUPABASE_ANON_KEY || "";

  if (typeof window !== "undefined") {
    const storedUrl = localStorage.getItem("hemp_sb_url");
    const storedKey = localStorage.getItem("hemp_sb_key");
    if (storedUrl && storedKey && !storedUrl.includes("placeholder")) {
      url = storedUrl.trim();
      key = storedKey.trim();
    }
  }

  const isConfigured = Boolean(url && key && !url.includes("placeholder"));
  url = isConfigured ? normalizeSupabaseUrl(url) : FALLBACK_URL;
  key = isConfigured ? key : FALLBACK_KEY;

  return {
    url,
    key,
    isConfigured
  };
};

const creds = getStoredCredentials();

export let supabase = createClient(
  creds.url, 
  creds.key,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const saveSupabaseCredentials = (url: string, key: string): void => {
  if (typeof window !== "undefined") {
    const cleanUrl = normalizeSupabaseUrl(url);
    localStorage.setItem("hemp_sb_url", cleanUrl);
    localStorage.setItem("hemp_sb_key", key.trim());
    supabase = createClient(cleanUrl, key.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
};

export const clearSupabaseCredentials = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("hemp_sb_url");
    localStorage.removeItem("hemp_sb_key");
  }
};

export const checkConnection = async (): Promise<boolean> => {
  const current = getStoredCredentials();
  if (!current.isConfigured) return false;
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (!error || ["42P01", "PGRST116", "401"].includes(error.code)) return true; 
    return false;
  } catch (e) {
    return false;
  }
};
