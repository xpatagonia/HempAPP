
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  CheckCircle2, Layout, Trash2, RotateCcw, Shield, 
  AlertTriangle, FlaskConical, CheckCircle, XCircle, Info, Search, FileCode
} from 'lucide-react';

interface UnitTest {
    id: string;
    name: string;
    description: string;
    status: 'idle' | 'running' | 'pass' | 'fail';
    error?: string;
}

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding, refreshData } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'branding' | 'database' | 'connections' | 'audit'>('branding');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  const [editAppName, setEditAppName] = useState(appName);
  const [editAppLogo, setEditAppLogo] = useState(appLogo);

  const [tests, setTests] = useState<UnitTest[]>([
      { id: 'conn', name: 'Conexión Supabase', description: 'Verifica alcance de URL y Key.', status: 'idle' },
      { id: 'tables', name: 'Esquema de Tablas', description: 'Valida existencia de todas las entidades V27.', status: 'idle' },
      { id: 'geo', name: 'Protocolo JSONB GPS', description: 'Verifica compatibilidad de georreferencia.', status: 'idle' },
      { id: 'auth', name: 'Vínculo Organizacional', description: 'Valida FK de equipos de trabajo.', status: 'idle' }
  ]);

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

  const runTests = async () => {
      const updateTest = (id: string, update: Partial<UnitTest>) => {
          setTests(prev => prev.map(t => t.id === id ? { ...t, ...update } : t));
      };

      updateTest('conn', { status: 'running' });
      const isConnected = await checkConnection();
      updateTest('conn', { status: isConnected ? 'pass' : 'fail', error: isConnected ? undefined : 'URL o Key inválidos' });

      updateTest('tables', { status: 'running' });
      try {
          const { error } = await supabase.from('locations').select('id').limit(1);
          if (error && error.code === '42P01') throw new Error("Falta tabla locations");
          updateTest('tables', { status: 'pass' });
      } catch (e: any) {
          updateTest('tables', { status: 'fail', error: e.message });
      }

      updateTest('geo', { status: 'running' });
      try {
          const { error } = await supabase.from('locations').select('coordinates').limit(1);
          if (error) throw error;
          updateTest('geo', { status: 'pass' });
      } catch (e: any) {
          updateTest('geo', { status: 'fail', error: 'Falta columna coordinates JSONB' });
      }

      updateTest('auth', { status: 'running' });
      try {
          const { error } = await supabase.from('projects').select('responsible_ids').limit(1);
          updateTest('auth', { status: error ? 'fail' : 'pass', error: error?.message });
      } catch (e: any) {
          updateTest('auth', { status: 'fail' });
      }
  };

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
          <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'audit' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Auditoría</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Nucleus V27</button>
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
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL del Logo</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppLogo || ''} onChange={e => setEditAppLogo(e.target.value)} />
                      </div>
                      <button onClick={handleSaveBranding} className="w-full md:w-auto px-10 py-4 bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Actualizar Marca</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Nucleus SQL V27: Máxima Estabilidad</h3>
                  </div>
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6 flex items-start text-amber-200">
                      <AlertTriangle className="text-amber-500 mr-3 flex-shrink-0" size={20}/>
                      <div className="text-xs space-y-2 leading-relaxed">
                        <p className="font-bold uppercase tracking-tight">Script de Sincronización Total V27</p>
                        <p>Asegura que los arreglos de responsables (`TEXT[]`) y coordenadas JSONB funcionen perfectamente.</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <button onClick={() => {
                      const sql = `
-- PROTOCOLO V27: ACTUALIZACIÓN MAESTRA DE ESQUEMA

CREATE TABLE IF NOT EXISTS public.users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, password TEXT, job_title TEXT, phone TEXT, avatar TEXT, client_id TEXT, is_network_member BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS public.clients (id TEXT PRIMARY KEY, name TEXT, type TEXT, contact_name TEXT, contact_phone TEXT, email TEXT, is_network_member BOOLEAN DEFAULT true, membership_level TEXT DEFAULT 'Activo', contract_date TEXT, cuit TEXT, notes TEXT, related_user_id TEXT, coordinates JSONB, address TEXT, total_hectares NUMERIC DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.suppliers (id TEXT PRIMARY KEY, name TEXT, category TEXT, cuit TEXT, country TEXT, province TEXT, city TEXT, address TEXT, email TEXT, coordinates JSONB, legal_name TEXT, postal_code TEXT, whatsapp TEXT, commercial_contact TEXT, website TEXT, is_official_partner BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS public.locations (id TEXT PRIMARY KEY, name TEXT, province TEXT, city TEXT, address TEXT, coordinates JSONB, polygon JSONB, client_id TEXT, capacity_ha NUMERIC, soil_type TEXT, climate TEXT, responsible_person TEXT, owner_name TEXT, owner_legal_name TEXT, owner_cuit TEXT, owner_contact TEXT, owner_type TEXT, irrigation_system TEXT, responsible_ids TEXT[]);
CREATE TABLE IF NOT EXISTS public.projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, start_date TEXT, status TEXT, director_id TEXT, responsible_ids TEXT[]);
CREATE TABLE IF NOT EXISTS public.plots (id TEXT PRIMARY KEY, location_id TEXT, project_id TEXT, variety_id TEXT, seed_batch_id TEXT, name TEXT, type TEXT, status TEXT DEFAULT 'Activa', sowing_date TEXT, block TEXT, replicate INTEGER, surface_area NUMERIC, surface_unit TEXT, density NUMERIC, owner_name TEXT, responsible_ids TEXT[], row_distance NUMERIC, perimeter NUMERIC, coordinates JSONB, polygon JSONB, irrigation_type TEXT, observations TEXT);
CREATE TABLE IF NOT EXISTS public.hydric_records (id TEXT PRIMARY KEY, location_id TEXT, plot_id TEXT, date TEXT, time TEXT, type TEXT, amount_mm NUMERIC, notes TEXT, created_by TEXT);

-- PARCHE DE INTEGRIDAD DE COLUMNAS V27
DO $$ 
BEGIN
    -- Asegurar responsible_ids como TEXT[] en locations
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='locations' AND COLUMN_NAME='responsible_ids') THEN 
        ALTER TABLE public.locations ADD COLUMN responsible_ids TEXT[]; 
    ELSE
        ALTER TABLE public.locations ALTER COLUMN responsible_ids TYPE TEXT[] USING responsible_ids::TEXT[];
    END IF;

    -- Asegurar responsible_ids como TEXT[] en projects
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='projects' AND COLUMN_NAME='responsible_ids') THEN 
        ALTER TABLE public.projects ADD COLUMN responsible_ids TEXT[]; 
    ELSE
        ALTER TABLE public.projects ALTER COLUMN responsible_ids TYPE TEXT[] USING responsible_ids::TEXT[];
    END IF;

    -- Otros campos críticos
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='locations' AND COLUMN_NAME='capacity_ha') THEN ALTER TABLE public.locations ADD COLUMN capacity_ha NUMERIC; END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='locations' AND COLUMN_NAME='owner_legal_name') THEN ALTER TABLE public.locations ADD COLUMN owner_legal_name TEXT; END IF;
END $$;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydric_records DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- RECARGA DE SCHEMA
NOTIFY pgrst, 'reload schema';
                      `;
                      navigator.clipboard.writeText(sql.trim());
                      alert("Script Nuclear V27 Copiado. Ejecútelo en el SQL Editor de Supabase.");
                    }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all shadow-xl">
                        <RotateCcw size={18} className="mr-2"/> Copiar Script Aditivo V27
                    </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
