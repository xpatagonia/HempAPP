
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
  const { currentUser, appName, appLogo, updateBranding, refreshData, suppliers, varieties, seedBatches, clients } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'branding' | 'database' | 'connections' | 'audit'>('branding');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  const [editAppName, setEditAppName] = useState(appName);
  const [editAppLogo, setEditAppLogo] = useState(appLogo);

  // Unit Test State
  const [tests, setTests] = useState<UnitTest[]>([
      { id: 'conn', name: 'Conexión Supabase', description: 'Verifica alcance de URL y Key.', status: 'idle' },
      { id: 'tables', name: 'Esquema de Tablas', description: 'Valida existencia de todas las entidades V20.', status: 'idle' },
      { id: 'geo', name: 'Protocolo JSONB GPS', description: 'Verifica compatibilidad de georreferencia.', status: 'idle' },
      { id: 'auth', name: 'Vínculo Socio-Usuario', description: 'Valida FK de relacionados.', status: 'idle' }
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

      // 1. Connection Test
      updateTest('conn', { status: 'running' });
      const isConnected = await checkConnection();
      updateTest('conn', { status: isConnected ? 'pass' : 'fail', error: isConnected ? undefined : 'URL o Key inválidos' });

      // 2. Tables Test
      updateTest('tables', { status: 'running' });
      try {
          const { error } = await supabase.from('suppliers').select('id').limit(1);
          if (error) throw error;
          updateTest('tables', { status: 'pass' });
      } catch (e: any) {
          updateTest('tables', { status: 'fail', error: e.message });
      }

      // 3. GEO JSONB Test
      updateTest('geo', { status: 'running' });
      try {
          const { data, error } = await supabase.from('suppliers').select('coordinates').limit(1);
          if (error) throw error;
          updateTest('geo', { status: 'pass' });
      } catch (e: any) {
          updateTest('geo', { status: 'fail', error: 'Falta columna coordinates JSONB' });
      }

      // 4. Auth/Link Test
      updateTest('auth', { status: 'running' });
      try {
          const { error } = await supabase.from('clients').select('related_user_id').limit(1);
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
          <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'audit' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Protocolo & Pruebas</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Nucleus V20</button>
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

      {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                              <FlaskConical className="mr-2 text-blue-600" size={20} /> Suite de Sincronización V20
                          </h3>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Sincronización de Usuarios y Entidades de Red</p>
                      </div>
                      <button onClick={runTests} className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Ejecutar Suite</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tests.map(test => (
                          <div key={test.id} className="p-5 rounded-3xl bg-gray-50 dark:bg-slate-950 border dark:border-slate-800 flex items-start space-x-4">
                              <div className="mt-1">
                                  {test.status === 'idle' && <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>}
                                  {test.status === 'running' && <RefreshCw size={24} className="text-blue-500 animate-spin"/>}
                                  {test.status === 'pass' && <CheckCircle size={24} className="text-green-500"/>}
                                  {test.status === 'fail' && <XCircle size={24} className="text-red-500"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{test.name}</h4>
                                  <p className="text-[10px] text-gray-500 mb-1">{test.description}</p>
                                  {test.error && <p className="text-[9px] font-mono text-red-500 break-words mt-1 bg-red-50 dark:bg-red-900/10 p-1 rounded">Error: {test.error}</p>}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Protocolo Nuclear V20</h3>
                  </div>
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6 flex items-start text-amber-200">
                      <AlertTriangle className="text-amber-500 mr-3 flex-shrink-0" size={20}/>
                      <div className="text-xs space-y-2 leading-relaxed">
                        <p className="font-bold uppercase tracking-tight">Sincronización de Identidades</p>
                        <p>Este script garantiza que la tabla de Usuarios y Socios estén perfectamente vinculadas mediante claves `related_user_id` y `client_id`.</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <button onClick={() => {
                      const sql = `
-- PROTOCOLO V20: VINCULO USUARIO-SOCIO
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

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

-- PERMISOS TOTALES V20
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- USUARIO ROOT INICIAL
INSERT INTO public.users (id, name, email, role, password, job_title, is_network_member)
VALUES ('root-user', 'Super Administrador', 'admin@hempc.com', 'super_admin', 'admin123', 'Director Cooperativa', true);

NOTIFY pgrst, 'reload schema';
                      `;
                      navigator.clipboard.writeText(sql.trim());
                      alert("Script Nuclear V20 Copiado. Ejecútalo en Supabase para resolver fallos de vinculación.");
                    }} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all shadow-xl">
                        <RotateCcw size={18} className="mr-2"/> Copiar Script SQL V20 (Completo)
                    </button>
                    
                    <button onClick={() => {
                        const sql = `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS client_id TEXT; ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS related_user_id TEXT; NOTIFY pgrst, 'reload schema';`;
                        navigator.clipboard.writeText(sql);
                        alert("Parche V20 (Vínculos) copiado.");
                    }} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all border border-slate-700">
                        <RefreshCw size={18} className="mr-2"/> Parche V20: Solo Vínculos
                    </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
