
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
      alert("SQL copiado al portapapeles. Pégalo en el SQL Editor de Supabase y dale RUN.");
  };

  const clearLocalCache = () => {
      if(confirm("¿Seguro que quieres borrar la caché local? Esto obligará a la app a descargar todos los datos nuevamente de la nube.")) {
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
-- =========================================================
-- SCRIPT GÉNESIS: ESTRUCTURA COMPLETA V2.7
-- Actualizado con Gestión de Clientes y Roles de Productor
-- =========================================================

-- 1. TABLA: USERS (Actualizada con clientId)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'technician',
    "jobTitle" TEXT,
    phone TEXT,
    avatar TEXT,
    "clientId" TEXT, -- Vínculo a tabla clients
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Usuario Admin por defecto
INSERT INTO public.users (id, name, email, password, role, "jobTitle")
VALUES ('admin-01', 'Admin Principal', 'admin@demo.com', 'admin', 'super_admin', 'Director')
ON CONFLICT (id) DO NOTHING;

-- 2. TABLA: PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "startDate" TEXT,
    status TEXT DEFAULT 'Planificación',
    "directorId" TEXT,
    "responsibleIds" JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- 3. TABLA: LOCATIONS
CREATE TABLE IF NOT EXISTS public.locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    province TEXT,
    city TEXT,
    address TEXT,
    coordinates JSONB,
    "soilType" TEXT,
    climate TEXT,
    "responsiblePerson" TEXT,
    "clientId" TEXT,
    "ownerName" TEXT,
    "ownerLegalName" TEXT,
    "ownerCuit" TEXT,
    "ownerType" TEXT,
    "ownerContact" TEXT,
    "capacityHa" NUMERIC,
    "irrigationSystem" TEXT,
    "responsibleIds" JSONB DEFAULT '[]',
    cuie TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;

-- 4. TABLA: SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "legalName" TEXT,
    cuit TEXT,
    country TEXT,
    province TEXT,
    city TEXT,
    address TEXT,
    "commercialContact" TEXT,
    "logisticsContact" TEXT,
    website TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- 5. TABLA: CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    cuit TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    email TEXT,
    "isNetworkMember" BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- 6. TABLA: VARIETIES
CREATE TABLE IF NOT EXISTS public.varieties (
    id TEXT PRIMARY KEY,
    "supplierId" TEXT,
    name TEXT NOT NULL,
    usage TEXT,
    "cycleDays" NUMERIC,
    "expectedThc" NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.varieties DISABLE ROW LEVEL SECURITY;

-- 7. TABLA: SEED_BATCHES
CREATE TABLE IF NOT EXISTS public.seed_batches (
    id TEXT PRIMARY KEY,
    "varietyId" TEXT,
    "supplierName" TEXT,
    "supplierLegalName" TEXT,
    "supplierCuit" TEXT,
    "supplierRenspa" TEXT,
    "supplierAddress" TEXT,
    "originCountry" TEXT,
    "batchCode" TEXT,
    "gs1Code" TEXT,
    "certificationNumber" TEXT,
    "purchaseDate" TEXT,
    "initialQuantity" NUMERIC,
    "remainingQuantity" NUMERIC,
    "storageConditions" TEXT,
    "storageAddress" TEXT,
    "logisticsResponsible" TEXT,
    notes TEXT,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.seed_batches DISABLE ROW LEVEL SECURITY;

-- 8. TABLA: SEED_MOVEMENTS
CREATE TABLE IF NOT EXISTS public.seed_movements (
    id TEXT PRIMARY KEY,
    "batchId" TEXT,
    "targetLocationId" TEXT,
    quantity NUMERIC,
    date TEXT,
    "dispatchTime" TEXT,
    "transportGuideNumber" TEXT,
    "transportType" TEXT,
    "driverName" TEXT,
    "vehiclePlate" TEXT,
    "vehicleModel" TEXT,
    "transportCompany" TEXT,
    "routeItinerary" TEXT,
    status TEXT,
    "receivedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.seed_movements DISABLE ROW LEVEL SECURITY;

-- 9. TABLA: PLOTS
CREATE TABLE IF NOT EXISTS public.plots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    "projectId" TEXT,
    "locationId" TEXT,
    "varietyId" TEXT,
    "seedBatchId" TEXT,
    block TEXT,
    replicate NUMERIC,
    "ownerName" TEXT,
    "responsibleIds" JSONB DEFAULT '[]',
    "sowingDate" TEXT,
    "surfaceArea" NUMERIC,
    "surfaceUnit" TEXT,
    "rowDistance" NUMERIC,
    density NUMERIC,
    status TEXT,
    observations TEXT,
    "irrigationType" TEXT,
    coordinates JSONB,
    polygon JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.plots DISABLE ROW LEVEL SECURITY;

-- 10. TABLA: TRIAL_RECORDS
CREATE TABLE IF NOT EXISTS public.trial_records (
    id TEXT PRIMARY KEY,
    "plotId" TEXT,
    date TEXT,
    time TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,
    stage TEXT,
    "emergenceDate" TEXT,
    "plantsPerMeterInit" NUMERIC,
    uniformity NUMERIC,
    vigor NUMERIC,
    "floweringDate" TEXT,
    "plantHeight" NUMERIC,
    "stemDiameter" NUMERIC,
    "nodesCount" NUMERIC,
    "floweringState" TEXT,
    "trichomeColor" TEXT,
    lodging NUMERIC,
    "birdDamage" TEXT,
    diseases TEXT,
    pests TEXT,
    "applicationType" TEXT,
    "applicationProduct" TEXT,
    "applicationDose" TEXT,
    "harvestDate" TEXT,
    "harvestHeight" NUMERIC,
    "plantsPerMeterFinal" NUMERIC,
    "sampleSize" NUMERIC,
    "freshWeight" NUMERIC,
    "dryWeight" NUMERIC,
    yield NUMERIC,
    "stemWeight" NUMERIC,
    "leafWeight" NUMERIC,
    "flowerWeight" NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.trial_records DISABLE ROW LEVEL SECURITY;

-- 11. TABLA: FIELD_LOGS
CREATE TABLE IF NOT EXISTS public.field_logs (
    id TEXT PRIMARY KEY,
    "plotId" TEXT,
    date TEXT,
    note TEXT,
    "photoUrl" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.field_logs DISABLE ROW LEVEL SECURITY;

-- 12. TABLA: TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    "plotId" TEXT,
    "projectId" TEXT,
    title TEXT,
    description TEXT,
    "dueDate" TEXT,
    status TEXT,
    priority TEXT,
    "assignedToIds" JSONB DEFAULT '[]',
    "createdBy" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- 13. TABLA: SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    gemini_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- FINALIZAR: Forzar recarga del esquema
NOTIFY pgrst, 'reload schema';

SELECT 'BASE DE DATOS ACTUALIZADA CON ÉXITO' as status;
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
                  <p className="font-bold mb-2">Características Activadas (v2.7):</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Unidades: <strong>Acres (ac)</strong>, Hectáreas (ha), m².</li>
                      <li>Gestión Avanzada: <strong>Categorización Productores</strong> (Pequeño, Mediano, Grande).</li>
                      <li>Trazabilidad: <strong>Lotes de Semilla</strong> y Logística.</li>
                      <li>Inteligencia: <strong>Asistente IA</strong> conectado.</li>
                  </ul>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            
            {/* Warning Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                <ShieldCheck className="text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                    <strong>Estado de Conexión:</strong> Si acabas de crear un nuevo proyecto en Supabase, asegúrate de ingresar la URL y KEY abajo.
                </div>
            </div>

            {/* CACHE TOOL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center">
                        <Database size={16} className="mr-2 text-gray-400" />
                        Almacenamiento Local (Caché)
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Si ves datos antiguos o errores de sincronización.</p>
                </div>
                <button onClick={clearLocalCache} className="text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center transition">
                    <Trash2 size={14} className="mr-2"/> Limpiar y Recargar
                </button>
            </div>

            {/* 1. Supabase Connection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75 grayscale hover:grayscale-0 transition">
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
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-hemp-500 outline-none font-mono text-sm bg-gray-50"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            disabled
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Anon API Key</label>
                        <input 
                            type="password" 
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-hemp-500 outline-none font-mono text-sm bg-gray-50"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            disabled
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Las credenciales están gestionadas internamente por el sistema (Hardcoded/Env).
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
                            <ShieldCheck className="text-hemp-600 mr-2" size={18}/> Inicialización de Base de Datos
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Este script crea <strong>todas</strong> las tablas necesarias. Úsalo en un proyecto nuevo.
                        </p>
                    </div>
                    <button onClick={copySQL} className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded border border-slate-300 shadow-sm flex items-center transition font-bold">
                        <Copy size={14} className="mr-2" /> Copiar SQL Completo
                    </button>
                </div>
                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded mb-2 border border-blue-200">
                    <strong>¡Atención!</strong> Si usas este script en una base de datos existente, no borrará los datos, pero añadirá las columnas que falten.
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
