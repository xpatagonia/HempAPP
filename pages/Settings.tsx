import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, AlertTriangle, Lock, Settings as SettingsIcon, Sliders, Sparkles, ExternalLink, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser, globalApiKey, refreshGlobalConfig } = useAppContext();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'connections'>('connections');

  // Supabase State
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  
  // AI State
  const [aiKey, setAiKey] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  useEffect(() => {
      // Cargar configuración existente local y global
      const storedUrl = localStorage.getItem('hemp_sb_url');
      const storedKey = localStorage.getItem('hemp_sb_key');
      
      if (storedUrl) setUrl(storedUrl);
      if (storedKey) setKey(storedKey);
      
      // La API Key de IA preferimos mostrar la global si existe, sino la local
      if (globalApiKey) {
          setAiKey(globalApiKey);
      } else {
          setAiKey(localStorage.getItem('hemp_ai_key') || '');
      }
  }, [globalApiKey]);

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
      
      // 1. Guardar Config Supabase Localmente (Por dispositivo, ya que es la conexión misma)
      localStorage.setItem('hemp_sb_url', url.trim());
      localStorage.setItem('hemp_sb_key', key.trim());

      // 2. Guardar Config AI en Base de Datos (GLOBAL para todos los usuarios)
      try {
          if (aiKey.trim()) {
              // Intentar guardar en DB
              const { error } = await supabase.from('system_settings').upsert({
                  id: 'global',
                  gemini_api_key: aiKey.trim()
              });

              if (error) {
                  console.error("Error guardando config global:", error);
                  // Fallback: Guardar local si falla DB (ej: tabla no existe aún)
                  localStorage.setItem('hemp_ai_key', aiKey.trim());
                  alert("⚠️ No se pudo guardar globalmente (probablemente falta crear la tabla 'system_settings'). Se guardó solo en este dispositivo. Por favor corre el script SQL de abajo.");
              } else {
                  // Limpiar local para priorizar global
                  localStorage.removeItem('hemp_ai_key');
              }
          }
      } catch (e) {
          console.error(e);
      }

      await refreshGlobalConfig();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
      
      // Recargar si cambiaron credenciales de base de datos
      if (url !== localStorage.getItem('hemp_sb_url') || key !== localStorage.getItem('hemp_sb_key')) {
         setTimeout(() => window.location.reload(), 1000);
      }
  };

  const copySQL = () => {
      navigator.clipboard.writeText(SQL_SCRIPT);
      alert("SQL copiado al portapapeles. Pégalo en el SQL Editor de Supabase.");
  };

  const clearLocalCache = () => {
      if(confirm("¿Seguro que quieres borrar la caché local? Esto obligará a la app a descargar todos los datos nuevamente.")) {
          // Clear all keys starting with ht_local_
          Object.keys(localStorage).forEach(key => {
              if (key.startsWith('ht_local_')) {
                  localStorage.removeItem(key);
              }
          });
          window.location.reload();
      }
  };

  const SQL_SCRIPT = `
-- 1. CONFIGURACIÓN GLOBAL (IA)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    gemini_api_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
INSERT INTO public.system_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

-- 2. TABLA PROVEEDORES (NUEVO)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "legalName" TEXT,
    cuit TEXT,
    country TEXT,
    website TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. ACTUALIZAR TABLAS EXISTENTES CON NUEVOS CAMPOS
DO $$
BEGIN
    -- Suppliers: Nuevos campos de contacto (Hotfix v2.5)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'city') THEN
        ALTER TABLE public.suppliers ADD COLUMN "city" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "province" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "address" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "commercialContact" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "logisticsContact" TEXT;
    END IF;

    -- Plots: Tipo, Unidad, Vinculo Lote Semilla
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plots' AND column_name = 'type') THEN
        ALTER TABLE public.plots ADD COLUMN "type" TEXT DEFAULT 'Ensayo';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plots' AND column_name = 'surfaceUnit') THEN
        ALTER TABLE public.plots ADD COLUMN "surfaceUnit" TEXT DEFAULT 'm2';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plots' AND column_name = 'seedBatchId') THEN
        ALTER TABLE public.plots ADD COLUMN "seedBatchId" TEXT;
    END IF;

    -- Varieties: Vinculo Proveedor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'varieties' AND column_name = 'supplierId') THEN
        ALTER TABLE public.varieties ADD COLUMN "supplierId" TEXT;
    END IF;
    
    -- Seed Batches: Compliance Data Completo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seed_batches' AND column_name = 'supplierName') THEN
        ALTER TABLE public.seed_batches ADD COLUMN "supplierName" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "supplierLegalName" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "supplierCuit" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "supplierRenspa" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "supplierAddress" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "originCountry" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "gs1Code" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "certificationNumber" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "storageConditions" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "storageAddress" TEXT;
        ALTER TABLE public.seed_batches ADD COLUMN "logisticsResponsible" TEXT;
    END IF;

    -- Seed Movements: Datos Transporte y Ruta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seed_movements' AND column_name = 'transportGuideNumber') THEN
        ALTER TABLE public.seed_movements ADD COLUMN "transportGuideNumber" TEXT;
        ALTER TABLE public.seed_movements ADD COLUMN "transportType" TEXT;
        ALTER TABLE public.seed_movements ADD COLUMN "vehiclePlate" TEXT;
        ALTER TABLE public.seed_movements ADD COLUMN "vehicleModel" TEXT;
        ALTER TABLE public.seed_movements ADD COLUMN "driverName" TEXT;
        ALTER TABLE public.seed_movements ADD COLUMN "routeItinerary" TEXT;
        ALTER TABLE public.seed_movements ADD COLUMN "dispatchTime" TEXT;
    END IF;
END $$;
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
                    <strong>Importante:</strong> Como Super Admin, las claves que guardes aquí se almacenarán en la base de datos para que el resto del equipo pueda usar las funciones de IA sin configurar nada.
                </div>
            </div>

            {/* CACHE TOOL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                        <Database size={16} className="mr-2 text-gray-400" />
                        Almacenamiento Local (Caché)
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Si no ves los cambios recientes, intenta limpiar la caché.</p>
                </div>
                <button onClick={clearLocalCache} className="text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center transition">
                    <Trash2 size={14} className="mr-2"/> Forzar Recarga
                </button>
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
                <p className="text-xs text-gray-400 mt-2">Esta configuración es local por dispositivo (necesaria para conectar).</p>
            </div>

            {/* 2. AI Connection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Sparkles size={20} className="mr-2 text-purple-500" />
                    Inteligencia Artificial (Google Gemini) - GLOBAL
                </h2>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Google Gemini API Key</label>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center">
                            Conseguir Key <ExternalLink size={10} className="ml-1"/>
                        </a>
                    </div>
                    <input 
                        type="password" 
                        placeholder="AIzaSy..." 
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                        value={aiKey}
                        onChange={e => setAiKey(e.target.value)}
                    />
                    <p className="text-xs text-green-600 mt-1 font-medium">Al guardar, esta llave se compartirá con todos los usuarios de la organización.</p>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={status === 'checking'}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-lg ${
                    status === 'checking' ? 'bg-gray-400' : 
                    status === 'success' ? 'bg-green-600' : 'bg-hemp-600 hover:bg-hemp-700'
                }`}
            >
                {status === 'checking' ? (
                    <><RefreshCw className="animate-spin mr-2"/> Guardando...</>
                ) : status === 'success' ? (
                    <><Save className="mr-2"/> ¡Guardado con Éxito!</>
                ) : (
                    <><Save className="mr-2"/> Guardar Configuración Técnica</>
                )}
            </button>

            {/* 3. SQL Setup (Updated) */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-bold text-gray-600">Script SQL de Actualización</h2>
                    <button onClick={copySQL} className="text-xs bg-white hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded border flex items-center transition">
                        <Copy size={12} className="mr-1" /> Copiar SQL
                    </button>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded text-xs font-mono text-gray-600 overflow-x-auto mb-2 whitespace-pre h-48 custom-scrollbar">
                    {SQL_SCRIPT}
                </div>
                <p className="text-xs text-gray-500">
                    <AlertTriangle size={12} className="inline mr-1 text-amber-500"/>
                    Ejecuta esto en Supabase para crear las tablas nuevas (Proveedores) y las columnas de logística necesarias.
                </p>
            </div>
        </div>
      )}
    </div>
  );
}