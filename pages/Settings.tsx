
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  CheckCircle2, Layout, Trash2, RotateCcw, Shield, 
  AlertTriangle, FlaskConical, CheckCircle, XCircle, Info, Search, FileCode, Flame
} from 'lucide-react';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding, refreshData } = useAppContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'database'>('branding');
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
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Nucleus V34</button>
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

      {activeTab === 'database' && (
          <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6">
                      <Shield className="text-hemp-500" size={24}/>
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Protocolo Nuclear V34 (Corrección de Transporte)</h3>
                  </div>
                  
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6 text-amber-200 text-xs leading-relaxed">
                      <p className="font-black mb-2 flex items-center uppercase"><RefreshCw className="mr-2" size={14}/> REPARACIÓN DE COLUMNAS (SOLUCIÓN AL ERROR)</p>
                      Ejecuta este script para añadir <strong>driver_dni</strong>, <strong>recipient_name</strong>, y las métricas de despacho que están fallando en los remitos.
                  </div>

                  <button onClick={() => {
                      const sql = `
-- PROTOCOLO V34: REPARACIÓN DE LOGÍSTICA Y DESPACHO
ALTER TABLE IF EXISTS public.seed_movements ADD COLUMN IF NOT EXISTS driver_dni TEXT;
ALTER TABLE IF EXISTS public.seed_movements ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE IF EXISTS public.seed_movements ADD COLUMN IF NOT EXISTS recipient_dni TEXT;
ALTER TABLE IF EXISTS public.seed_movements ADD COLUMN IF NOT EXISTS transport_company TEXT;

-- Trazabilidad de Lote (Etiquetas Fiscales)
ALTER TABLE IF EXISTS public.seed_batches ADD COLUMN IF NOT EXISTS label_serial_number TEXT;
ALTER TABLE IF EXISTS public.seed_batches ADD COLUMN IF NOT EXISTS certification_number TEXT;
ALTER TABLE IF EXISTS public.seed_batches ADD COLUMN IF NOT EXISTS gs1_code TEXT;
ALTER TABLE IF EXISTS public.seed_batches ADD COLUMN IF NOT EXISTS purity NUMERIC DEFAULT 99;
ALTER TABLE IF EXISTS public.seed_batches ADD COLUMN IF NOT EXISTS germination NUMERIC DEFAULT 90;
ALTER TABLE IF EXISTS public.seed_batches ADD COLUMN IF NOT EXISTS analysis_date TEXT;

-- Métricas Fenológicas
ALTER TABLE IF EXISTS public.trial_records ADD COLUMN IF NOT EXISTS bird_damage NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.trial_records ADD COLUMN IF NOT EXISTS lodging NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.trial_records ADD COLUMN IF NOT EXISTS uniformity NUMERIC DEFAULT 100;
ALTER TABLE IF EXISTS public.trial_records ADD COLUMN IF NOT EXISTS vigor NUMERIC DEFAULT 100;

NOTIFY pgrst, 'reload schema';
                      `;
                      navigator.clipboard.writeText(sql.trim());
                      alert("Script de REPARACIÓN V34 Copiado. Péguelo en el SQL Editor de Supabase y presione RUN.");
                  }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all mb-8">
                      <RefreshCw size={18} className="mr-2"/> Copiar Script Reparador V34
                  </button>

                  <div className="border-t border-slate-800 pt-8 mt-4">
                      <div className="bg-red-900/40 border border-red-500/30 p-4 rounded-2xl mb-6 text-red-200 text-xs leading-relaxed">
                        <p className="font-black mb-2 flex items-center uppercase"><Flame className="mr-2 text-red-500" size={16}/> RESET TOTAL (LIMPIEZA Y RECREACIÓN)</p>
                        Usa esta opción si el error persiste. Borrará todos los datos para aplicar el nuevo esquema.
                      </div>

                      <button onClick={() => {
                        const sql = `
-- PROTOCOLO V34: RECREACIÓN TOTAL LOGÍSTICA
DROP TABLE IF EXISTS public.seed_movements CASCADE;
DROP TABLE IF EXISTS public.seed_batches CASCADE;

-- Tablas de Logística Actualizadas
CREATE TABLE public.seed_batches (
    id TEXT PRIMARY KEY, 
    variety_id TEXT, 
    supplier_id TEXT, 
    batch_code TEXT, 
    label_serial_number TEXT, 
    category TEXT, 
    analysis_date TEXT, 
    purity NUMERIC DEFAULT 99, 
    germination NUMERIC DEFAULT 90, 
    gs1_code TEXT, 
    certification_number TEXT, 
    purchase_order TEXT, 
    purchase_date TEXT, 
    price_per_kg NUMERIC, 
    initial_quantity NUMERIC, 
    remaining_quantity NUMERIC, 
    storage_conditions TEXT, 
    storage_point_id TEXT, 
    logistics_responsible TEXT, 
    notes TEXT, 
    is_active BOOLEAN DEFAULT true, 
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.seed_movements (
    id TEXT PRIMARY KEY, 
    batch_id TEXT, 
    client_id TEXT, 
    target_location_id TEXT, 
    quantity NUMERIC, 
    date TEXT, 
    dispatch_time TEXT, 
    transport_guide_number TEXT, 
    transport_type TEXT, 
    driver_name TEXT, 
    driver_dni TEXT,
    vehicle_plate TEXT, 
    vehicle_model TEXT, 
    transport_company TEXT, 
    recipient_name TEXT,
    recipient_dni TEXT,
    route_itinerary TEXT, 
    status TEXT, 
    origin_storage_id TEXT, 
    route_google_link TEXT, 
    estimated_distance_km NUMERIC
);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
                        `;
                        navigator.clipboard.writeText(sql.trim());
                        alert("☢️ SCRIPT RESET V34 COPIADO. Pegue en Supabase.");
                      }} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all">
                        <Flame size={18} className="mr-2"/> Copiar Script BORRADO TOTAL V34
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
