import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, AlertTriangle, Lock, Settings as SettingsIcon, Sliders, Sparkles, ExternalLink, Trash2, ShieldCheck } from 'lucide-react';
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
-- ==========================================
-- SCRIPT DE MIGRACIÓN Y FORTALECIMIENTO v2.7.1
-- Ejecutar en Supabase > SQL Editor
-- ==========================================

-- 1. TABLAS CORE FALTANTES
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    gemini_api_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
INSERT INTO public.system_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

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

-- 2. ACTUALIZACIÓN DE COLUMNAS (MIGRACIONES)
DO $$
BEGIN
    -- Suppliers: Nuevos campos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'city') THEN
        ALTER TABLE public.suppliers ADD COLUMN "city" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "province" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "address" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "commercialContact" TEXT;
        ALTER TABLE public.suppliers ADD COLUMN "logisticsContact" TEXT;
    END IF;

    -- Locations: Nuevos campos de Cliente (v2.7.1)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'ownerLegalName') THEN
        ALTER TABLE public.locations ADD COLUMN "ownerLegalName" TEXT;
        ALTER TABLE public.locations ADD COLUMN "ownerCuit" TEXT;
        ALTER TABLE public.locations ADD COLUMN "ownerContact" TEXT;
    END IF;

    -- Projects: Director
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'directorId') THEN
        ALTER TABLE public.projects ADD COLUMN "directorId" TEXT;
    END IF;

    -- Users: Perfil y Avatar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar') THEN
        ALTER TABLE public.users ADD COLUMN "avatar" TEXT;
        ALTER TABLE public.users ADD COLUMN "jobTitle" TEXT;
        ALTER TABLE public.users ADD COLUMN "phone" TEXT;
    END IF;

    -- Plots: Campos productivos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plots' AND column_name = 'type') THEN
        ALTER TABLE public.plots ADD COLUMN "type" TEXT DEFAULT 'Ensayo';
        ALTER TABLE public.plots ADD COLUMN "surfaceUnit" TEXT DEFAULT 'm2';
        ALTER TABLE public.plots ADD COLUMN "seedBatchId" TEXT;
        ALTER TABLE public.plots ADD COLUMN "polygon" JSONB; -- Para guardar el polígono del mapa
    END IF;

    -- Varieties: Link Proveedor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'varieties' AND column_name = 'supplierId') THEN
        ALTER TABLE public.varieties ADD COLUMN "supplierId" TEXT;
    END IF;
    
    -- Seed Batches & Movements: Logística Completa
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

-- 3. INTEGRIDAD REFERENCIAL (FOREIGN KEYS)
DO $$
BEGIN
    -- Link Parcelas -> Proyectos
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_plots_project') THEN
        BEGIN
            ALTER TABLE public.plots ADD CONSTRAINT fk_plots_project FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'No se pudo crear FK plots_project'; END;
    END IF;

    -- Link Parcelas -> Locaciones
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_plots_location') THEN
        BEGIN
            ALTER TABLE public.plots ADD CONSTRAINT fk_plots_location FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'No se pudo crear FK plots_location'; END;
    END IF;

    -- Link Variedades -> Proveedores (NUEVO v2.7)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_varieties_supplier') THEN
        BEGIN
            ALTER TABLE public.varieties ADD CONSTRAINT fk_varieties_supplier FOREIGN KEY ("supplierId") REFERENCES public.suppliers(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'No se pudo crear FK varieties_supplier'; END;
    END IF;

    -- Link Registros -> Parcelas
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_records_plot') THEN
        BEGIN
            ALTER TABLE public.trial_records ADD CONSTRAINT fk_records_plot FOREIGN KEY ("plotId") REFERENCES public.plots(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'No se pudo crear FK records_plot'; END;
    END IF;
END $$;

-- 4. ÍNDICES DE RENDIMIENTO (VELOCIDAD)
CREATE INDEX IF NOT EXISTS idx_plots_project ON public.plots("projectId");
CREATE INDEX IF NOT EXISTS idx_plots_variety ON public.plots("varietyId");
CREATE INDEX IF NOT EXISTS idx_records_plot ON public.trial_records("plotId");
CREATE INDEX IF NOT EXISTS idx_logs_plot ON public.field_logs("plotId");
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
                  El sistema está configurado para operaciones de Cáñamo Industrial y Cannabis Medicinal.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-left max-w-md mx-auto">
                  <p className="font-bold mb-2">Características Activadas (v2.6):</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Unidades: <strong>Acres (ac)</strong>, Hectáreas (ha), m².</li>
                      <li>Módulos: <strong>I+D (Ensayos)</strong> y <strong>Producción Masiva</strong>.</li>
                      <li>Trazabilidad: <strong>Lotes de Semilla</strong> y Logística.</li>
                      <li>Inteligencia: <strong>Asistente IA</strong> conectado.</li>
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
                    <strong>Importante:</strong> Las configuraciones guardadas aquí afectan la conexión con la base de datos y la inteligencia artificial.
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
                <p className="text-xs text-gray-400 mt-2">
                    Actualmente conectado a: <strong>{url || 'Desconocido'}</strong>
                </p>
            </div>

            {/* 2. AI Connection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Sparkles size={20} className="mr-2 text-purple-500" />
                    Inteligencia Artificial (Google Gemini)
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
                    <p className="text-xs text-green-600 mt-1 font-medium">Esta llave se guardará globalmente para toda la organización.</p>
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

            {/* 3. SQL Setup (Fortalecimiento) */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 flex items-center">
                            <ShieldCheck className="text-hemp-600 mr-2" size={18}/> Mantenimiento de Base de Datos
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Ejecuta este script en Supabase para crear las tablas nuevas, activar integridad referencial (Foreign Keys) y optimizar velocidad (Índices).
                        </p>
                    </div>
                    <button onClick={copySQL} className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded border border-slate-300 shadow-sm flex items-center transition font-bold">
                        <Copy size={14} className="mr-2" /> Copiar Script SQL
                    </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-xs font-mono text-blue-300 overflow-x-auto mb-2 whitespace-pre h-64 custom-scrollbar shadow-inner">
                    {SQL_SCRIPT}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}