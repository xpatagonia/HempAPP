import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------
// CONFIGURACIÓN CENTRAL DE CONEXIÓN A SUPABASE (HYBRID MODE)
// Enlaza por defecto a la base de datos de producción oficial de HempC / Nucleus
// Permite sobreescritura mediante variables de entorno (Vite/Vercel) o LocalStorage.
// ------------------------------------------------------------------

const DEFAULT_URL = "https://vkfgxbsomxzirdezwrxz.supabase.co";
const DEFAULT_KEY_B64 = "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5aclptZDRZbk52YlhoNmFYSmtaWHAzY25oNklpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTmpVMk5qazNOakVzSW1WNGNDSTZNakE0TVRJME5UYzJNWDAuVFlSd0RnR3FLU0VFd01rNHZ0UXR5M0ZaNjVXRld1MnlFV2JTT1AzVzRfVQ==";

const getDecodedDefaultKey = (): string => {
  try {
    if (typeof atob !== "undefined") {
      return atob(DEFAULT_KEY_B64);
    }
  } catch (e) {}
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmd4YnNvbXh6aXJkZXp3cnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njk3NjEsImV4cCI6MjA4MTI0NTc2MX0.TYRwDgGqKSEEwMk4vtQty3FZ65WFWu2yEWbSOP3W4_U";
};

const DEFAULT_KEY = getDecodedDefaultKey();

const env = (import.meta as any).env || {};

export const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return DEFAULT_URL;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed}.supabase.co`;
};

export const getStoredCredentials = () => {
  let url = env.VITE_SUPABASE_URL || DEFAULT_URL;
  let key = env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

  if (typeof window !== "undefined") {
    const storedUrl = localStorage.getItem("hemp_sb_url");
    const storedKey = localStorage.getItem("hemp_sb_key");
    if (storedUrl && storedKey && !storedUrl.includes("placeholder")) {
      url = storedUrl.trim();
      key = storedKey.trim();
    }
  }

  const isConfigured = Boolean(url && key && !url.includes("placeholder"));
  url = isConfigured ? normalizeSupabaseUrl(url) : DEFAULT_URL;
  key = isConfigured ? key : DEFAULT_KEY;

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
    supabase = createClient(DEFAULT_URL, DEFAULT_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
};

export const checkConnection = async (): Promise<boolean> => {
  const current = getStoredCredentials();
  if (!current.isConfigured) return false;
  try {
    const { data, error } = await supabase.from("users").select("id").limit(1);
    if (!error && data !== null) return true;
    if (error && ["42P01", "PGRST116", "401"].includes(error.code)) return true; 
    return false;
  } catch (e) {
    return false;
  }
};
