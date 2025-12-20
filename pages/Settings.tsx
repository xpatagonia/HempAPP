
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, Lock, Settings as SettingsIcon, ShieldCheck, PlayCircle, CheckCircle2, Layout, Image as ImageIcon, Trash2, RotateCcw, Cpu, Globe, Shield, Server, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding, isEmergencyMode } = useAppContext();
  
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

  const handleResetBranding = () => {
      if (window.confirm("¿Restaurar marca original?")) {
          updateBranding('HempC', null);
          setEditAppName('HempC');
          setEditAppLogo(null);
      }
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
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración Maestra</h1>
            <p className="text-gray-500">Gestión de identidad y estructura de datos cloud.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg mb-8 w-fit">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'connections' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Conectividad</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Cloud (Reparación)</button>
      </div>

      {activeTab === 'branding' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center mb-6">
                      <Layout className="mr-2 text-hemp-600" size={20} /> Personalización Visual
                  </h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre del Sistema</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppName} onChange={e => setEditAppName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Logo URL</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppLogo || ''} onChange={e => setEditAppLogo(e.target.value)} placeholder="https://..." />
                      </div>
                      <button onClick={handleSaveBranding} className="w-full md:w-auto px-10 py-4 bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Guardar Cambios</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-8">
                <h2 className="text-lg font-black text-gray-800 dark:text-white mb-6 flex items-center"><Database size={20} className="mr-2 text-hemp-600" /> Servidor de Datos (Supabase)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Supabase Project URL</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white" value={url} onChange={e => setUrl(e.target.value)} /></div>
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
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Script de Reconstrucción Total</h3>
                  </div>
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6 flex items-start">
                      <AlertTriangle className="text-amber-500 mr-3 flex-shrink-0" size={20}/>
                      <p className="text-xs text-amber-200 leading-relaxed font-medium">Este script solucionará el error de la columna <code className="bg-black/40 px-1 rounded text-white">client_id</code>. Copia el código y ejecútalo en el <strong>SQL Editor</strong> de Supabase.</p>
                  </div>
                  <pre className="bg-black/50 p-6 rounded-2xl text-[10px] text-green-400 overflow-x-auto border border-white/5 font-mono h-80 custom-scrollbar">
{`-- 1. ASEGURAR QUE LA TABLA users TIENE LA COLUMNA client_id
-- Si la tabla existe, agregamos la columna si falta
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS client_id TEXT;

-- 2. ASEGURAR TABLAS BASE (SI NO EXISTEN)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  email TEXT,
  is_network_member BOOLEAN DEFAULT false,
  cuit TEXT,
  notes TEXT,
  related_user_id TEXT
);

CREATE TABLE IF NOT EXISTS public.locations (
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

-- 3. ACTUALIZAR CACHÉ DE ESQUEMA (DISABLE/ENABLE RLS)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;

-- 4. OTORGAR PERMISOS PÚBLICOS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`}
                  </pre>
                  <button onClick={() => {
                      const sql = `ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS client_id TEXT; ALTER TABLE public.users DISABLE ROW LEVEL SECURITY; ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;`;
                      navigator.clipboard.writeText(sql);
                      alert("SQL de reparación rápida copiado.");
                  }} className="mt-4 text-[10px] font-black text-hemp-400 uppercase tracking-widest flex items-center hover:text-white transition">
                      <Copy size={12} className="mr-1"/> Copiar Fix Rápido
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
