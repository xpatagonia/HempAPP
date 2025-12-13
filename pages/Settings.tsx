
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, AlertTriangle, Lock, Settings as SettingsIcon, Sliders } from 'lucide-react';

export default function Settings() {
  const { currentUser } = useAppContext();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'connections'>('connections');

  // Supabase State
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  useEffect(() => {
      // Cargar configuración existente
      const storedUrl = localStorage.getItem('hemp_sb_url');
      const storedKey = localStorage.getItem('hemp_sb_key');
      if (storedUrl) setUrl(storedUrl);
      if (storedKey) setKey(storedKey);
  }, []);

  // PERMISSION GUARD: Solo Super Admin puede ver esto
  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full">
                  <Lock size={48} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
              <p className="text-gray-500 max-w-md">
                  La configuración del sistema es una zona sensible reservada únicamente para el Super Administrador.
              </p>
          </div>
      );
  }

  const handleSave = async () => {
      setStatus('checking');
      
      // Save Supabase Config
      localStorage.setItem('hemp_sb_url', url.trim());
      localStorage.setItem('hemp_sb_key', key.trim());

      // Force reload to apply changes
      setTimeout(() => {
          window.location.reload();
      }, 1000);
  };

  const copySQL = () => {
      navigator.clipboard.writeText(SQL_SCRIPT);
      alert("SQL copiado al portapapeles. Pégalo en el SQL Editor de Supabase.");
  };

  const SQL_SCRIPT = `
-- TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- ... (Resto de las tablas)
-- Nota: Asegúrate de actualizar la tabla 'plots' si no existe el campo 'type' o 'surfaceUnit'
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Ensayo';
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS "surfaceUnit" TEXT DEFAULT 'm2';
  `;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración Central</h1>
            <p className="text-gray-500">Parámetros del sistema y conexiones externas.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'general' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
              General / Negocio
          </button>
          <button 
            onClick={() => setActiveTab('connections')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'connections' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
              Conexiones & Sistema
          </button>
      </div>

      {activeTab === 'general' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-full inline-block">
                  <Sliders size={32} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Parametrización del Negocio</h3>
              <p className="text-gray-500 max-w-lg mx-auto">
                  Aquí podrás configurar valores por defecto para nuevas parcelas, unidades de medida preferidas y listas desplegables personalizadas.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-left max-w-md mx-auto">
                  <p className="font-bold mb-2">Características Actuales:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Soporte para <strong>Acres (ac)</strong>, Hectáreas (ha) y Metros (m²).</li>
                      <li>Distinción entre <strong>Ensayos (I+D)</strong> y <strong>Producción</strong>.</li>
                      <li>Nomenclatura automática de lotes.</li>
                  </ul>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                <AlertTriangle className="text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <strong>Importante:</strong> Esta configuración técnica guarda tus claves localmente en este navegador para facilitar el desarrollo.
                </div>
            </div>

            {/* 1. Supabase Connection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Database size={20} className="mr-2 text-gray-400" />
                    Base de Datos (Supabase)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
                        <input 
                            type="text" 
                            placeholder="https://xyz.supabase.co" 
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-hemp-500 outline-none font-mono text-sm"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Anon API Key</label>
                        <input 
                            type="password" 
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-hemp-500 outline-none font-mono text-sm"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={status === 'checking'}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-lg ${
                    status === 'checking' ? 'bg-gray-400' : 'bg-hemp-600 hover:bg-hemp-700'
                }`}
            >
                {status === 'checking' ? (
                    <><RefreshCw className="animate-spin mr-2"/> Guardando cambios...</>
                ) : (
                    <><Save className="mr-2"/> Guardar Configuración Técnica</>
                )}
            </button>

            {/* 3. SQL Setup (Optional) */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-bold text-gray-600">Script SQL de Inicialización</h2>
                    <button onClick={copySQL} className="text-xs bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded border flex items-center transition">
                        <Copy size={12} className="mr-1" /> Copiar SQL
                    </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                    Útil solo si estás creando el proyecto Supabase desde cero o actualizando tablas.
                </p>
            </div>
        </div>
      )}
    </div>
  );
}
