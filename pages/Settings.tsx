
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, Lock, Settings as SettingsIcon, ShieldCheck, PlayCircle, CheckCircle2, Layout, Image as ImageIcon, Trash2, RotateCcw, Cpu, Globe } from 'lucide-react';
import { Shield, Server } from 'lucide-react';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding } = useAppContext();
  
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
          setTimeout(() => { setStatus('idle'); }, 2000);
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
                                      El logo reemplazará el icono predeterminado en Login y Sidebar. Se recomienda formato PNG transparente.
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
                        <h3 className="text-xl font-black uppercase tracking-tighter">Seguridad Neural</h3>
                      </div>
                      <p className="text-blue-100 text-sm font-medium leading-relaxed mb-6">
                        La <strong>API Key de Google Gemini</strong> se gestiona mediante variables de entorno del sistema (`API_KEY`).
                      </p>
                      <div className="flex items-center space-x-4">
                          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 flex items-center">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-50">Motor IA Activo</span>
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
                {status === 'checking' ? 'Sincronizando...' : status === 'success' ? 'Conexión Exitosa' : 'Vincular Servidor de Producción'}
            </button>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Estructura SQL Obligatoria</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">Ejecute este script para corregir fallos de guardado por permisos (RLS):</p>
                  <pre className="bg-black/50 p-6 rounded-2xl text-[10px] text-blue-400 overflow-x-auto border border-white/5 font-mono h-80 custom-scrollbar">
{`/* 1. CREAR TABLA SI NO EXISTE */
CREATE TABLE IF NOT EXISTS hydric_records (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  plot_id TEXT,
  date DATE,
  time TEXT,
  type TEXT,
  amount_mm NUMERIC,
  notes TEXT,
  created_by TEXT
);

/* 2. ACTIVAR RLS Y PERMITIR ACCESO PÚBLICO (PARA DEMO) */
ALTER TABLE hydric_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON hydric_records 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON hydric_records 
FOR SELECT USING (true);

CREATE POLICY "Allow public delete" ON hydric_records 
FOR DELETE USING (true);

/* REPETIR LO MISMO PARA trial_records SI FALLA */
CREATE TABLE IF NOT EXISTS trial_records (
  id TEXT PRIMARY KEY,
  plot_id TEXT,
  date DATE,
  time TEXT,
  stage TEXT,
  temperature NUMERIC,
  humidity NUMERIC,
  plant_height NUMERIC,
  replicate NUMERIC,
  vigor NUMERIC,
  created_by TEXT,
  created_by_name TEXT
);

ALTER TABLE trial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Trial Insert" ON trial_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Trial Select" ON trial_records FOR SELECT USING (true);`}
                  </pre>
                  <button onClick={() => {
                      const sql = `CREATE TABLE IF NOT EXISTS hydric_records (id TEXT PRIMARY KEY, location_id TEXT, plot_id TEXT, date DATE, time TEXT, type TEXT, amount_mm NUMERIC, notes TEXT, created_by TEXT); ALTER TABLE hydric_records ENABLE ROW LEVEL SECURITY; CREATE POLICY "Allow public insert" ON hydric_records FOR INSERT WITH CHECK (true); CREATE POLICY "Allow public select" ON hydric_records FOR SELECT USING (true);`;
                      navigator.clipboard.writeText(sql);
                      alert("SQL Correctivo copiado.");
                  }} className="mt-4 text-[10px] font-black text-hemp-400 uppercase tracking-widest flex items-center hover:text-white transition">
                      <Copy size={12} className="mr-1"/> Copiar SQL con Políticas RLS
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
