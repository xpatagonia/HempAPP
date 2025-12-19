
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, AlertTriangle, Lock, Settings as SettingsIcon, Sliders, Sparkles, ExternalLink, Trash2, ShieldCheck, PlayCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, Client, Supplier, Variety, Location, Project, Plot } from '../types';

export default function Settings() {
  const { currentUser, globalApiKey, refreshGlobalConfig, addClient, addSupplier, addVariety, addUser, addLocation, addProject, addPlot, addSeedBatch, addSeedMovement } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'general' | 'connections' | 'demo' | 'database'>('connections');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
      const storedUrl = localStorage.getItem('hemp_sb_url');
      const storedKey = localStorage.getItem('hemp_sb_key');
      if (storedUrl) setUrl(storedUrl);
      if (storedKey) setKey(storedKey);
      if (globalApiKey) setAiKey(globalApiKey);
      else setAiKey(localStorage.getItem('hemp_ai_key') || '');
  }, [globalApiKey]);

  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full"><Lock size={48} className="text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
              <p className="text-gray-500 max-w-md">La configuración del sistema es una zona sensible reservada únicamente para el Super Administrador.</p>
          </div>
      );
  }

  const handleSave = async () => {
      setStatus('checking');
      localStorage.setItem('hemp_sb_url', url.trim());
      localStorage.setItem('hemp_sb_key', key.trim());
      try {
          if (aiKey.trim()) {
              await supabase.from('system_settings').upsert({ id: 'global', gemini_api_key: aiKey.trim() });
              localStorage.removeItem('hemp_ai_key');
          }
      } catch (e) { localStorage.setItem('hemp_ai_key', aiKey.trim()); }
      await refreshGlobalConfig();
      setStatus('success');
      setTimeout(() => { setStatus('idle'); window.location.reload(); }, 1000);
  };

  const SQL_TRIAL_RECORDS = `-- SCRIPT DE ACTUALIZACIÓN: MONITOREO TÉCNICO DE ENSAYOS
-- Ejecuta esto en Supabase -> SQL Editor para habilitar los nuevos campos

ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "emergenceDate" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "replicate" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "plantsPerMeter" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "uniformity" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "floweringDate" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "lodging" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "birdDamage" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "diseases" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "pests" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "harvestDate" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "stemWeight" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "leafWeight" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "vigor" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "freshWeight" NUMERIC;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';`;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración Central</h1>
            <p className="text-gray-500">Parámetros del sistema y base de datos.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'connections' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Conexiones</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'database' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Base de Datos</button>
          <button onClick={() => setActiveTab('demo')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'demo' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Datos Demo</button>
      </div>

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                  <div className="flex items-start">
                      <AlertTriangle className="text-amber-600 mr-4 flex-shrink-0" size={24}/>
                      <div>
                          <h3 className="font-black text-amber-900 uppercase text-sm mb-1">Reparación de Tablas de Ensayo</h3>
                          <p className="text-xs text-amber-800 leading-relaxed">
                              Si la sección de <strong>Monitoreo Técnico</strong> no guarda los registros, es porque faltan columnas en tu base de datos de Supabase. Copia el siguiente código y ejecútalo en el <strong>SQL Editor</strong> de tu panel de Supabase.
                          </p>
                      </div>
                  </div>
                  <div className="mt-6 bg-black rounded-xl p-4 overflow-hidden relative group">
                      <pre className="text-[10px] font-mono text-green-400 overflow-x-auto h-48 custom-scrollbar">{SQL_TRIAL_RECORDS}</pre>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(SQL_TRIAL_RECORDS); alert("Script copiado!"); }}
                        className="absolute top-4 right-4 bg-hemp-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-hemp-700 transition shadow-lg"
                      >
                          <Copy size={12} className="inline mr-1"/> Copiar Script
                      </button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Database size={20} className="mr-2 text-gray-400" /> Base de Datos (Cloud)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={url} onChange={e => setUrl(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Anon API Key</label><input type="password" className="w-full border border-gray-300 rounded p-2 text-sm" value={key} onChange={e => setKey(e.target.value)} /></div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Sparkles size={20} className="mr-2 text-purple-500" /> Inteligencia Artificial</h2>
                <input type="password" placeholder="AIzaSy..." className="w-full border border-gray-300 rounded p-2 text-sm" value={aiKey} onChange={e => setAiKey(e.target.value)} />
            </div>
            <button onClick={handleSave} disabled={status === 'checking'} className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-lg ${status === 'checking' ? 'bg-gray-400' : status === 'success' ? 'bg-green-600' : 'bg-hemp-600 hover:bg-hemp-700'}`}>
                {status === 'checking' ? <><RefreshCw className="animate-spin mr-2"/> Guardando...</> : status === 'success' ? <><Save className="mr-2"/> ¡Guardado!</> : <><Save className="mr-2"/> Guardar Configuración</>}
            </button>
          </div>
      )}

      {activeTab === 'demo' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-in fade-in text-center">
              <PlayCircle size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">Generador de Datos Demo</h3>
              <p className="text-gray-500 mb-6">Puebla el sistema con ejemplos de ensayos industriales.</p>
              <button onClick={() => alert("Función habilitada en v3.0")} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black">Próximamente</button>
          </div>
      )}
    </div>
  );
}
