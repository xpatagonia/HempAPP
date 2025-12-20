
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, Lock, Settings as SettingsIcon, ShieldCheck, PlayCircle, CheckCircle2, Layout, Image as ImageIcon, Trash2, RotateCcw, Cpu, Globe, Shield, Server } from 'lucide-react';

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
      alert("✅ Identidad corporativa actualizada correctamente.");
  };

  const handleResetBranding = () => {
      if (window.confirm("¿Desea restaurar la marca predeterminada (HempC)?")) {
          updateBranding('HempC', null);
          setEditAppName('HempC');
          setEditAppLogo(null);
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setEditAppLogo(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleSaveConnections = async () => {
      setStatus('checking');
      localStorage.setItem('hemp_sb_url', url.trim());
      localStorage.setItem('hemp_sb_key', key.trim());
      
      setTimeout(() => {
          setStatus('success');
          setTimeout(() => { setStatus('idle'); window.location.reload(); }, 1500);
      }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración de Sistema</h1>
            <p className="text-gray-500">Gestión de identidad, datos y seguridad neural.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg mb-8 w-fit">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'connections' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Conectividad</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Cloud</button>
      </div>

      {activeTab === 'branding' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                        <Layout className="mr-2 text-hemp-600" size={20} /> Personalización de Marca
                    </h3>
                    <button onClick={handleResetBranding} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 flex items-center transition">
                        <RotateCcw size={14} className="mr-1"/> Restaurar Original
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de la Terminal</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600"
                            value={editAppName}
                            onChange={e => setEditAppName(e.target.value)}
                          />
                      </div>

                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Logotipo Corporativo</label>
                          <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                              <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner overflow-hidden">
                                  {editAppLogo ? <img src={editAppLogo} className="w-full h-full object-contain p-2" /> : <ImageIcon size={32} className="text-slate-300" />}
                              </div>
                              <div className="flex-1">
                                  <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                                      El logo reemplazará el icono predeterminado.
                                  </p>
                                  <div className="flex gap-2">
                                      <label className="bg-hemp-600 hover:bg-hemp-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer flex items-center">
                                          Subir Archivo <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                      </label>
                                      {editAppLogo && (
                                          <button onClick={() => setEditAppLogo(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition">
                                              <Trash2 size={18}/>
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 border-t dark:border-slate-800">
                          <button onClick={handleSaveBranding} className="w-full md:w-auto px-10 py-4 bg-slate-900 dark:bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                              Guardar Identidad
                          </button>
                      </div>
                  </div>
              </div>

              <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-white/20 p-2 rounded-xl"><Server size={24}/></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Estado de Sincronización</h3>
                      </div>
                      <p className="text-blue-100 text-sm font-medium leading-relaxed mb-6">
                        {isEmergencyMode 
                          ? '⚠️ Actualmente el sistema está en MODO LOCAL. Los cambios no se guardarán en Supabase hasta que se corrija el esquema.' 
                          : '✅ El sistema está conectado correctamente a la base de datos cloud.'}
                      </p>
                      <div className="flex items-center space-x-4">
                          <div className={`px-4 py-2 rounded-xl border flex items-center ${isEmergencyMode ? 'bg-red-500/20 border-red-500/40' : 'bg-white/10 border-white/20'}`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${isEmergencyMode ? 'bg-red-400 animate-pulse' : 'bg-green-400 animate-pulse'}`}></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-50">
                                {isEmergencyMode ? 'Falla de Esquema' : 'Link de Datos Activo'}
                              </span>
                          </div>
                      </div>
                  </div>
                  <Globe className="absolute -right-20 -bottom-20 text-white opacity-5 w-64 h-64" />
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
                {status === 'checking' ? 'Sincronizando...' : status === 'success' ? 'Conexión Exitosa' : 'Actualizar Credenciales del Servidor'}
            </button>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Script de Reparación Crítica (Fallo client_id)</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed italic">Atención: El error "client_id not found" se soluciona ejecutando este bloque en el SQL Editor de Supabase.</p>
                  <pre className="bg-black/50 p-6 rounded-2xl text-[10px] text-green-400 overflow-x-auto border border-white/5 font-mono h-80 custom-scrollbar">
{`-- 1. SOLUCIÓN AL ERROR DE COLUMNA FALTANTE
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS client_id TEXT;

-- 2. ASEGURAR ESTRUCTURA DE CLIENTES (ENTIDADES)
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

-- 3. REGLAS DE ACCESO PÚBLICO (MODO PROTOTIPO)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE trial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE hydric_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE varieties DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE seed_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE seed_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- 4. PERMISOS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`}
                  </pre>
                  <button onClick={() => {
                      const sql = `ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS client_id TEXT; ALTER TABLE public.users DISABLE ROW LEVEL SECURITY; ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;`;
                      navigator.clipboard.writeText(sql);
                      alert("SQL copiado. Pégalo en el SQL Editor de Supabase y dale a 'RUN'.");
                  }} className="mt-4 text-[10px] font-black text-hemp-400 uppercase tracking-widest flex items-center hover:text-white transition">
                      <Copy size={12} className="mr-1"/> Copiar Fix de Emergencia
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
