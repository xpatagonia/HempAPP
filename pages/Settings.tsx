
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, AlertTriangle, Lock, Settings as SettingsIcon, Sliders, Sparkles, ExternalLink, Trash2, ShieldCheck, PlayCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser, globalApiKey, refreshGlobalConfig } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'connections' | 'demo' | 'database'>('database');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

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
      setTimeout(() => { setStatus('idle'); }, 2000);
  };

  const SQL_REPAIR_ALL = `-- SCRIPT DE REPARACIÓN INTEGRAL HEMP-APP v3.2
-- 1. REPARAR TABLA DE PARCELAS (Para Trazabilidad Fiscal)
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS "seedBatchId" TEXT;

-- 2. REPARAR TABLA DE BITÁCORA (Para Fotos)
ALTER TABLE public.field_logs ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE public.field_logs ADD COLUMN IF NOT EXISTS "note" TEXT;

-- 3. REPARAR TABLA DE MONITOREO (Estructura Completa de Ensayo)
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "time" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "emergenceDate" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "replicate" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "plantsPerMeter" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "uniformity" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "vigor" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "floweringDate" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "lodging" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "birdDamage" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "diseases" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "pests" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "harvestDate" TEXT;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "yield" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "stemWeight" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "leafWeight" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "freshWeight" NUMERIC;
ALTER TABLE public.trial_records ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

-- Forzar recarga de esquema para que el API reconozca los cambios
NOTIFY pgrst, 'reload schema';`;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración de Sistema</h1>
            <p className="text-gray-500">Mantenimiento de base de datos y llaves de servicio.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'database' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Reparar Base de Datos</button>
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'connections' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Conexiones</button>
          <button onClick={() => setActiveTab('demo')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'demo' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Datos Demo</button>
      </div>

      {activeTab === 'database' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl">
                  <div className="flex items-start">
                      <ShieldCheck className="text-blue-600 mr-4 flex-shrink-0" size={32}/>
                      <div>
                          <h3 className="font-black text-blue-900 uppercase text-sm mb-1">Script de Sincronización Total (v3.2)</h3>
                          <p className="text-xs text-blue-800 leading-relaxed">
                              Este script habilita la <strong>Trazabilidad Fiscal</strong>, el guardado de <strong>Fotos</strong> y todos los campos del <strong>Monitoreo Técnico</strong>. Copia y ejecuta este código en el SQL Editor de Supabase para corregir los errores de guardado.
                          </p>
                      </div>
                  </div>
                  <div className="mt-6 bg-slate-900 rounded-xl p-5 overflow-hidden relative group border border-slate-700 shadow-inner">
                      <pre className="text-[11px] font-mono text-blue-300 overflow-x-auto h-64 custom-scrollbar leading-relaxed">{SQL_REPAIR_ALL}</pre>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(SQL_REPAIR_ALL); alert("✅ Script de reparación copiado. Pégalo en Supabase -> SQL Editor."); }}
                        className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg flex items-center"
                      >
                          <Copy size={14} className="mr-2"/> Copiar Script de Reparación
                      </button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Database size={20} className="mr-2 text-gray-400" /> Servidor de Datos (Supabase)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={url} onChange={e => setUrl(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Anon API Key</label><input type="password" className="w-full border border-gray-300 rounded p-2 text-sm" value={key} onChange={e => setKey(e.target.value)} /></div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Sparkles size={20} className="mr-2 text-purple-500" /> Inteligencia Artificial (Gemini)</h2>
                <input type="password" placeholder="AIzaSy..." className="w-full border border-gray-300 rounded p-2 text-sm" value={aiKey} onChange={e => setAiKey(e.target.value)} />
            </div>
            <button onClick={handleSave} disabled={status === 'checking'} className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-lg ${status === 'checking' ? 'bg-gray-400' : status === 'success' ? 'bg-green-600' : 'bg-hemp-600 hover:bg-hemp-700'}`}>
                {status === 'checking' ? <RefreshCw className="animate-spin mr-2"/> : status === 'success' ? <CheckCircle2 className="mr-2"/> : <Save className="mr-2"/>}
                {status === 'checking' ? 'Guardando...' : status === 'success' ? '¡Configuración Guardada!' : 'Guardar y Vincular Dispositivo'}
            </button>
          </div>
      )}

      {activeTab === 'demo' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <PlayCircle size={64} className="text-purple-600 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-gray-800">Generador de Ensayos Demo</h3>
              <p className="text-gray-500 mb-6">Puebla el sistema con datos de prueba para entrenamiento.</p>
              <button disabled className="bg-gray-200 text-gray-400 px-8 py-3 rounded-xl font-black cursor-not-allowed">Próximamente en v3.5</button>
          </div>
      )}
    </div>
  );
}
