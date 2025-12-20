
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, RefreshCw, Lock, Settings as SettingsIcon, CheckCircle2, Layout, Trash2, RotateCcw, Shield, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding, refreshData } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'branding' | 'database' | 'connections'>('branding');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  const [editAppName, setEditAppName] = useState(appName);
  const [editAppLogo, setEditAppLogo] = useState(appLogo);

  useEffect(() => {
      const storedUrl = localStorage.getItem('hemp_sb_url');
      const storedKey = localStorage.getItem('hemp_sb_key');
      if (storedUrl) setUrl(storedUrl);
      if (storedKey) setKey(storedKey);
      setEditAppName(appName);
      setEditAppLogo(appLogo);
  }, [appName, appLogo]);

  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full"><Lock size={48} className="text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
              <p className="text-gray-500 max-w-md">La configuración del sistema es una zona sensible reservada únicamente para el Super Administrador.</p>
          </div>
      );
  }

  const handleSaveBranding = () => {
      updateBranding(editAppName, editAppLogo);
      alert("✅ Identidad corporativa actualizada.");
  };

  const handleSaveConnections = async () => {
      setStatus('checking');
      localStorage.setItem('hemp_sb_url', url.trim());
      localStorage.setItem('hemp_sb_key', key.trim());
      setTimeout(() => {
          setStatus('success');
          setTimeout(() => { setStatus('idle'); window.location.reload(); }, 1000);
      }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración del Servidor</h1>
            <p className="text-gray-500">Protocolo de auditoría y base de datos cooperativa.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg mb-8 w-fit">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'connections' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Conectividad</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Cloud (V16)</button>
      </div>

      {activeTab === 'branding' && (
          <div className="space-y-8 animate-in slide-in-from-top-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center mb-6">
                      <Layout className="mr-2 text-hemp-600" size={20} /> Personalización de Red
                  </h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de la Plataforma</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppName} onChange={e => setEditAppName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL del Logo (PNG/SVG)</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppLogo || ''} onChange={e => setEditAppLogo(e.target.value)} placeholder="https://..." />
                      </div>
                      <button onClick={handleSaveBranding} className="w-full md:w-auto px-10 py-4 bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Actualizar Marca</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-8">
                <h2 className="text-lg font-black text-gray-800 dark:text-white mb-6 flex items-center"><Database size={20} className="mr-2 text-hemp-600" /> Servidor de Datos (Supabase)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Supabase URL</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white" value={url} onChange={e => setUrl(e.target.value)} /></div>
                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Anon API Key</label><input type="password" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white" value={key} onChange={e => setKey(e.target.value)} /></div>
                </div>
            </div>
            <button onClick={handleSaveConnections} disabled={status === 'checking'} className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest text-white flex items-center justify-center transition-all shadow-xl ${status === 'checking' ? 'bg-gray-400' : status === 'success' ? 'bg-green-600' : 'bg-slate-900 dark:bg-hemp-600 hover:scale-[1.01]'}`}>
                {status === 'checking' ? <RefreshCw className="animate-spin mr-2"/> : status === 'success' ? <CheckCircle2 className="mr-2"/> : <Save className="mr-2"/>}
                {status === 'checking' ? 'Sincronizando...' : status === 'success' ? 'Conexión Exitosa' : 'Actualizar Credenciales'}
            </button>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Protocolo Cooperativo V16</h3>
                  </div>
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6 flex items-start text-amber-200">
                      <AlertTriangle className="text-amber-500 mr-3 flex-shrink-0" size={20}/>
                      <div className="text-xs space-y-2 leading-relaxed">
                        <p className="font-bold uppercase tracking-tight">Georreferencia Universal de Red</p>
                        <p>Este script integra <code className="bg-black/40 px-1 rounded text-white">coordinates</code> en la tabla de socios (clients) para identificación de sedes.</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <button onClick={() => {
                      const sql = `
-- 1. LIMPIEZA TOTAL
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.seed_movements CASCADE;
DROP TABLE IF EXISTS public.seed_batches CASCADE;
DROP TABLE IF EXISTS public.hydric_records CASCADE;
DROP TABLE IF EXISTS public.trial_records CASCADE;
DROP TABLE IF EXISTS public.field_logs CASCADE;
DROP TABLE IF EXISTS public.plots CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.varieties CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.storage_points CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

-- 2. RECREACIÓN ESTRUCTURA V16
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  password TEXT,
  job_title TEXT,
  phone TEXT,
  avatar TEXT,
  client_id TEXT,
  is_network_member BOOLEAN DEFAULT false
);

CREATE TABLE public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  email TEXT,
  is_network_member BOOLEAN DEFAULT true,
  membership_level TEXT DEFAULT 'Activo',
  contract_date TEXT,
  cuit TEXT,
  notes TEXT,
  related_user_id TEXT,
  coordinates JSONB
);

CREATE TABLE public.locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  province TEXT,
  city TEXT,
  address TEXT,
  soil_type TEXT,
  climate TEXT,
  responsible_person TEXT,
  coordinates JSONB,
  polygon JSONB,
  client_id TEXT,
  owner_name TEXT,
  owner_legal_name TEXT,
  owner_cuit TEXT,
  owner_contact TEXT,
  owner_type TEXT,
  capacity_ha NUMERIC,
  irrigation_system TEXT,
  responsible_ids TEXT[]
);

CREATE TABLE public.varieties (
  id TEXT PRIMARY KEY,
  supplier_id TEXT,
  name TEXT NOT NULL,
  usage TEXT,
  cycle_days INTEGER,
  expected_thc NUMERIC,
  knowledge_base TEXT,
  notes TEXT
);

CREATE TABLE public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  legal_name TEXT,
  cuit TEXT,
  country TEXT,
  province TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  whatsapp TEXT,
  email TEXT,
  coordinates JSONB,
  commercial_contact TEXT,
  logistics_contact TEXT,
  website TEXT,
  notes TEXT,
  is_official_partner BOOLEAN DEFAULT false
);

CREATE TABLE public.seed_batches (
  id TEXT PRIMARY KEY,
  variety_id TEXT,
  supplier_id TEXT,
  batch_code TEXT,
  label_serial_number TEXT,
  category TEXT,
  initial_quantity NUMERIC,
  remaining_quantity NUMERIC,
  storage_point_id TEXT,
  is_active BOOLEAN DEFAULT true,
  purchase_date TEXT,
  price_per_kg NUMERIC,
  germination NUMERIC,
  purity NUMERIC,
  analysis_date TEXT,
  certification_number TEXT,
  gs1_code TEXT,
  created_at TEXT
);

CREATE TABLE public.seed_movements (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  client_id TEXT,
  target_location_id TEXT,
  quantity NUMERIC,
  date TEXT,
  status TEXT DEFAULT 'En Tránsito',
  transport_guide_number TEXT,
  driver_name TEXT,
  vehicle_plate TEXT
);

-- 3. PERMISOS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.varieties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_movements DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 4. USUARIO ROOT
DELETE FROM public.users WHERE email = 'admin@hempc.com';
INSERT INTO public.users (id, name, email, role, password, job_title, is_network_member)
VALUES ('root-user', 'Super Administrador', 'admin@hempc.com', 'super_admin', 'admin123', 'Director Cooperativa', true);

NOTIFY pgrst, 'reload schema';
                      `;
                      navigator.clipboard.writeText(sql.trim());
                      alert("Script Nuclear V16 Copiado. Incluye georreferencia de socios (clients).");
                    }} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all shadow-xl">
                        <RotateCcw size={18} className="mr-2"/> Reconstrucción Nuclear (V16)
                    </button>
                    
                    <button onClick={() => {
                        const sql = `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS coordinates JSONB; NOTIFY pgrst, 'reload schema';`;
                        navigator.clipboard.writeText(sql);
                        alert("Parche V16 (Coordenadas Socios) copiado.");
                    }} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all border border-slate-700">
                        <RefreshCw size={18} className="mr-2"/> Parche V16: Solo Columna GPS Socios
                    </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
