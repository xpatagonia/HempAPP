import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { checkConnection } from '../supabaseClient';
import { Save, CheckCircle, XCircle, Database, Copy, RefreshCw, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';

export default function Settings() {
  const { currentUser } = useAppContext();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
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
                  La configuración de la base de datos es una zona sensible reservada únicamente para el Super Administrador.
              </p>
          </div>
      );
  }

  const handleSave = async () => {
      setStatus('checking');
      // Save temporarily
      localStorage.setItem('hemp_sb_url', url);
      localStorage.setItem('hemp_sb_key', key);
      
      // Force reload to apply changes in supabaseClient.ts singleton
      // In a real app we might use a context for the client, but reload is safest here
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

-- TABLA DE PROYECTOS
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "startDate" TEXT,
    status TEXT DEFAULT 'Planificación',
    "responsibleIds" JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE VARIEDADES
CREATE TABLE IF NOT EXISTS public.varieties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    usage TEXT,
    genetics TEXT,
    "cycleDays" NUMERIC,
    "expectedThc" NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE LOCACIONES
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
    "ownerName" TEXT,
    "ownerType" TEXT,
    "responsibleIds" JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE PARCELAS
CREATE TABLE IF NOT EXISTS public.plots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "projectId" TEXT REFERENCES public.projects(id),
    "locationId" TEXT REFERENCES public.locations(id),
    "varietyId" TEXT REFERENCES public.varieties(id),
    block TEXT,
    replicate NUMERIC,
    "ownerName" TEXT,
    "responsibleIds" JSONB DEFAULT '[]'::jsonb,
    "sowingDate" TEXT,
    "surfaceArea" NUMERIC,
    "surfaceUnit" TEXT,
    "rowDistance" NUMERIC,
    density NUMERIC,
    status TEXT DEFAULT 'Activa',
    observations TEXT,
    "irrigationType" TEXT,
    coordinates JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE REGISTROS TÉCNICOS (Bitácora de datos duros)
CREATE TABLE IF NOT EXISTS public.trial_records (
    id TEXT PRIMARY KEY,
    "plotId" TEXT REFERENCES public.plots(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    stage TEXT,
    "emergenceDate" TEXT,
    "plantsPerMeterInit" NUMERIC,
    uniformity NUMERIC,
    vigor NUMERIC,
    "floweringDate" TEXT,
    "plantHeight" NUMERIC,
    lodging NUMERIC,
    "birdDamage" TEXT,
    diseases TEXT,
    pests TEXT,
    "harvestDate" TEXT,
    "harvestHeight" NUMERIC,
    "plantsPerMeterFinal" NUMERIC,
    yield NUMERIC,
    "stemWeight" NUMERIC,
    "leafWeight" NUMERIC,
    "applicationType" TEXT,
    "applicationProduct" TEXT,
    "applicationDose" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE BITÁCORA (Fotos y notas libres)
CREATE TABLE IF NOT EXISTS public.field_logs (
    id TEXT PRIMARY KEY,
    "plotId" TEXT REFERENCES public.plots(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    note TEXT,
    "photoUrl" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE TAREAS
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    "plotId" TEXT,
    "projectId" TEXT,
    title TEXT NOT NULL,
    description TEXT,
    "dueDate" TEXT,
    status TEXT DEFAULT 'Pendiente',
    priority TEXT DEFAULT 'Media',
    "assignedToIds" JSONB DEFAULT '[]'::jsonb,
    "createdBy" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
  `;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <Database className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración de Base de Datos</h1>
            <p className="text-gray-500">Conecta HempAPP a tu propia nube Supabase.</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertTriangle className="text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
              <strong>Importante:</strong> Esta configuración guarda tus claves en el navegador actual. 
              Para un despliegue en producción real (Vercel, Netlify), debes configurar estas mismas claves en las 
              <strong> Variables de Entorno</strong> de tu proveedor de hosting (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Connection Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <ShieldAlert size={20} className="mr-2 text-gray-400" />
                  Credenciales de Conexión
              </h2>
              <div className="space-y-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key (anon / public)</label>
                      <input 
                        type="password" 
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-hemp-500 outline-none font-mono text-sm"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                      />
                  </div>
                  
                  <button 
                    onClick={handleSave}
                    disabled={status === 'checking'}
                    className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center transition-all ${
                        status === 'checking' ? 'bg-gray-400' : 'bg-hemp-600 hover:bg-hemp-700'
                    }`}
                  >
                      {status === 'checking' ? (
                          <><RefreshCw className="animate-spin mr-2"/> Reiniciando...</>
                      ) : (
                          <><Save className="mr-2"/> Guardar y Reconectar</>
                      )}
                  </button>
              </div>
          </div>

          {/* 2. SQL Setup */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Inicializar Tablas</h2>
                  <button onClick={copySQL} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded flex items-center transition">
                      <Copy size={14} className="mr-1" /> Copiar SQL
                  </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                  Si tu base de datos está vacía, copia este código y ejecútalo en el <strong>SQL Editor</strong> de tu panel de Supabase.
              </p>
              
              <div className="flex-1 bg-slate-900 rounded-lg p-4 overflow-auto max-h-[400px]">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                      {SQL_SCRIPT}
                  </pre>
              </div>
          </div>

      </div>
    </div>
  );
}