
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  CheckCircle2, Layout, Trash2, RotateCcw, Shield, 
  AlertTriangle, FlaskConical, CheckCircle, XCircle, Info, Search, FileCode, Flame, Eraser
} from 'lucide-react';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding, refreshData } = useAppContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'database' | 'maintenance'>('branding');
  const [editAppName, setEditAppName] = useState(appName);
  const [editAppLogo, setEditAppLogo] = useState(appLogo);

  useEffect(() => {
      setEditAppName(appName);
      setEditAppLogo(appLogo);
  }, [appName, appLogo]);

  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full"><Lock size={48} className="text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Denegado</h2>
              <p className="text-gray-500">Zona reservada para Master Administrador.</p>
          </div>
      );
  }

  const handleSaveBranding = () => {
      updateBranding(editAppName, editAppLogo);
      alert("✅ Identidad corporativa actualizada.");
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración del Servidor</h1>
            <p className="text-gray-500">Mantenimiento de base de datos y esquemas PostgREST.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg mb-8 w-fit">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Nucleus</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'maintenance' ? 'bg-white dark:bg-amber-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Mantenimiento</button>
      </div>

      {activeTab === 'branding' && (
          <div className="space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de la Plataforma</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppName} onChange={e => setEditAppName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL del Logo</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600" value={editAppLogo || ''} onChange={e => setEditAppLogo(e.target.value)} />
                      </div>
                      <button onClick={handleSaveBranding} className="px-10 py-4 bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Actualizar Marca</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'maintenance' && (
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-amber-200 dark:border-amber-900/30 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600">
                          <Eraser size={24}/>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Limpieza de <span className="text-amber-600">Transacciones e Inventario</span></h3>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                      Este proceso elimina todos los datos operativos dinámicos para comenzar una nueva campaña o corregir errores masivos de carga.
                  </p>

                  <button 
                      onClick={() => {
                        const sql = `-- PROTOCOLO DE LIMPIEZA
DELETE FROM public.field_logs;
DELETE FROM public.trial_records;
DELETE FROM public.seed_movements;
DELETE FROM public.seed_batches;
DELETE FROM public.hydric_records;
DELETE FROM public.tasks;
NOTIFY pgrst, 'reload schema';`;
                        navigator.clipboard.writeText(sql);
                        alert("☢️ SCRIPT DE LIMPIEZA COPIADO.");
                      }}
                      className="w-full bg-slate-900 dark:bg-amber-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black dark:hover:bg-amber-700 transition-all flex items-center justify-center"
                  >
                      <Eraser size={20} className="mr-2"/> Copiar Script de Limpieza
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'database' && (
          <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Protocolo Nuclear V40 (HempIT France Full)</h3>
                  </div>
                  
                  <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl mb-6 text-emerald-200 text-xs leading-relaxed">
                      <p className="font-black mb-2 flex items-center uppercase"><RefreshCw className="mr-2" size={14}/> ACTUALIZACIÓN DE ESQUEMA REQUERIDA</p>
                      Este script añade soporte para las escalas 1-9 (Vigor, Encamado, Sanidad) y métricas de cosecha (Peso tallo, Calidad de semilla) exigidas por HempIT France.
                  </div>

                  <button onClick={() => {
                      const sql = `-- PROTOCOLO V40: INTEGRACIÓN TÉCNICA HEMPTIT FRANCE & ASTRO
ALTER TABLE IF EXISTS public.trial_records 
ADD COLUMN IF NOT EXISTS light_hours NUMERIC DEFAULT 12,
ADD COLUMN IF NOT EXISTS lunar_phase TEXT,
ADD COLUMN IF NOT EXISTS uniformity INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS vigor INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS lodging INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS bird_damage INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS diseases_score INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS pests_score INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS harvest_plant_count NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS seed_yield NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS seed_quality_germination NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS seed_quality_non_conformity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stem_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS flowering_date DATE;

NOTIFY pgrst, 'reload schema';`;
                      navigator.clipboard.writeText(sql.trim());
                      alert("Script V40 Copiado. Péguelo en el SQL Editor de Supabase y presione RUN.");
                  }} className="w-full bg-hemp-600 hover:bg-hemp-700 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all mb-8">
                      <RefreshCw size={18} className="mr-2"/> Copiar Script V40 (HempIT Protocol)
                  </button>
                  
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Columnas nuevas a crear:</p>
                      <pre className="text-[9px] text-emerald-400 font-mono overflow-x-auto">
{`vigor, lodging, bird_damage, diseases_score, 
pests_score, stem_weight, seed_yield, 
seed_quality_germination, flowering_date...`}
                      </pre>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
