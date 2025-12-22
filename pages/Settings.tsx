
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
          <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-md text-sm font-black transition uppercase tracking-tighter ${activeTab === 'database' ? 'bg-white dark:bg-hemp-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>SQL Nucleus V32</button>
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
                      <h3 className="font-black text-white uppercase text-sm tracking-widest">Protocolo Nuclear V32 (Hard Reset)</h3>
                  </div>
                  
                  <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6 text-amber-200 text-xs leading-relaxed">
                      <p className="font-black mb-2 flex items-center"><RefreshCw className="mr-2" size={14}/> REPARACIÓN RÁPIDA (Sin borrar datos)</p>
                      Copia este script para añadir <strong>owner_name</strong> y columnas faltantes sin afectar tus registros actuales.
                  </div>

                  <button onClick={() => {
                      const sql = `
-- PROTOCOLO V32: REPARACIÓN DE COLUMNAS Y RESET DE CACHÉ
CREATE TABLE IF NOT EXISTS public.users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, password TEXT, job_title TEXT, phone TEXT, avatar TEXT, client_id TEXT, is_network_member BOOLEAN DEFAULT false);
CREATE TABLE IF NOT EXISTS public.clients (id TEXT PRIMARY KEY, name TEXT, type TEXT, contact_name TEXT, contact_phone TEXT, email TEXT, is_network_member BOOLEAN DEFAULT true, membership_level TEXT DEFAULT 'Activo', contract_date TEXT, cuit TEXT, notes TEXT, related_user_id TEXT, coordinates JSONB, address TEXT, total_hectares NUMERIC DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.locations (id TEXT PRIMARY KEY, name TEXT, province TEXT, city TEXT, address TEXT, coordinates JSONB, polygon JSONB, client_id TEXT, capacity_ha NUMERIC, soil_type TEXT, climate TEXT, responsible_person TEXT, owner_name TEXT, owner_legal_name TEXT, owner_cuit TEXT, owner_contact TEXT, owner_type TEXT, irrigation_system TEXT, responsible_ids TEXT[]);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='locations' AND COLUMN_NAME='owner_name') THEN ALTER TABLE public.locations ADD COLUMN owner_name TEXT; END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='locations' AND COLUMN_NAME='responsible_ids') THEN ALTER TABLE public.locations ADD COLUMN responsible_ids TEXT[]; END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='locations' AND COLUMN_NAME='polygon') THEN ALTER TABLE public.locations ADD COLUMN polygon JSONB; END IF;
END $$;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
                      `;
                      navigator.clipboard.writeText(sql.trim());
                      alert("Script de REPARACIÓN V32 Copiado.");
                  }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all mb-8">
                      <RefreshCw size={18} className="mr-2"/> Copiar Script Reparador V32
                  </button>

                  <div className="border-t border-slate-800 pt-8 mt-4">
                      <div className="bg-red-900/40 border border-red-500/30 p-4 rounded-2xl mb-6 text-red-200 text-xs leading-relaxed">
                        <p className="font-black mb-2 flex items-center uppercase"><Flame className="mr-2 text-red-500" size={16}/> OPCIÓN AGRESIVA: RECREAR TODO (FORCE CASCADE)</p>
                        Este comando usa <strong>CASCADE</strong> para ignorar errores de dependencia y borrar todas las tablas a la fuerza. <br/>
                        <strong>ADVERTENCIA:</strong> Los datos actuales se perderán totalmente.
                      </div>

                      <button onClick={() => {
                        const sql = `
-- PROTOCOLO V32: RECREACIÓN TOTAL (BORRADO CON CASCADE)
DROP TABLE IF EXISTS public.field_logs CASCADE;
DROP TABLE IF EXISTS public.trial_records CASCADE;
DROP TABLE IF EXISTS public.hydric_records CASCADE;
DROP TABLE IF EXISTS public.seed_movements CASCADE;
DROP TABLE IF EXISTS public.seed_batches CASCADE;
DROP TABLE IF EXISTS public.plots CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.varieties CASCADE;

-- Recreación Limpia y Perfecta
CREATE TABLE public.users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, password TEXT, job_title TEXT, phone TEXT, avatar TEXT, client_id TEXT, is_network_member BOOLEAN DEFAULT false);
CREATE TABLE public.clients (id TEXT PRIMARY KEY, name TEXT, type TEXT, contact_name TEXT, contact_phone TEXT, email TEXT, is_network_member BOOLEAN DEFAULT true, membership_level TEXT DEFAULT 'Activo', contract_date TEXT, cuit TEXT, notes TEXT, related_user_id TEXT, coordinates JSONB, address TEXT, total_hectares NUMERIC DEFAULT 0);
CREATE TABLE public.suppliers (id TEXT PRIMARY KEY, name TEXT, category TEXT, cuit TEXT, country TEXT, province TEXT, city TEXT, address TEXT, email TEXT, coordinates JSONB, legal_name TEXT, postal_code TEXT, whatsapp TEXT, commercial_contact TEXT, website TEXT, is_official_partner BOOLEAN DEFAULT false);
CREATE TABLE public.varieties (id TEXT PRIMARY KEY, supplier_id TEXT, name TEXT, usage TEXT, cycle_days INTEGER, expected_thc NUMERIC, knowledge_base TEXT, notes TEXT);
CREATE TABLE public.locations (id TEXT PRIMARY KEY, name TEXT, province TEXT, city TEXT, address TEXT, coordinates JSONB, polygon JSONB, client_id TEXT, capacity_ha NUMERIC, soil_type TEXT, climate TEXT, responsible_person TEXT, owner_name TEXT, owner_legal_name TEXT, owner_cuit TEXT, owner_contact TEXT, owner_type TEXT, irrigation_system TEXT, responsible_ids TEXT[]);
CREATE TABLE public.projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, start_date TEXT, status TEXT, director_id TEXT, responsible_ids TEXT[]);
CREATE TABLE public.plots (id TEXT PRIMARY KEY, location_id TEXT, project_id TEXT, variety_id TEXT, seed_batch_id TEXT, name TEXT, type TEXT, status TEXT DEFAULT 'Activa', sowing_date TEXT, block TEXT, replicate INTEGER, surface_area NUMERIC, surface_unit TEXT, density NUMERIC, owner_name TEXT, responsible_ids TEXT[], row_distance NUMERIC, perimeter NUMERIC, coordinates JSONB, polygon JSONB, irrigation_type TEXT, observations TEXT);
CREATE TABLE public.seed_batches (id TEXT PRIMARY KEY, variety_id TEXT, supplier_id TEXT, batch_code TEXT, label_serial_number TEXT, category TEXT, analysis_date TEXT, purity NUMERIC, germination NUMERIC, gs1_code TEXT, certification_number TEXT, purchase_order TEXT, purchase_date TEXT, price_per_kg NUMERIC, initial_quantity NUMERIC, remaining_quantity NUMERIC, storage_conditions TEXT, storage_point_id TEXT, logistics_responsible TEXT, notes TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE public.seed_movements (id TEXT PRIMARY KEY, batch_id TEXT, client_id TEXT, target_location_id TEXT, quantity NUMERIC, date TEXT, dispatch_time TEXT, transport_guide_number TEXT, transport_type TEXT, driver_name TEXT, vehicle_plate TEXT, vehicle_model TEXT, transport_company TEXT, route_itinerary TEXT, status TEXT, origin_storage_id TEXT, route_google_link TEXT, estimated_distance_km NUMERIC);
CREATE TABLE public.trial_records (id TEXT PRIMARY KEY, plot_id TEXT, date TEXT, time TEXT, stage TEXT, temperature NUMERIC, humidity NUMERIC, plant_height NUMERIC, yield NUMERIC, replicate INTEGER, created_by TEXT, created_by_name TEXT);
CREATE TABLE public.field_logs (id TEXT PRIMARY KEY, plot_id TEXT, date TEXT, time TEXT, note TEXT, photo_url TEXT);
CREATE TABLE public.hydric_records (id TEXT PRIMARY KEY, location_id TEXT, plot_id TEXT, date TEXT, time TEXT, type TEXT, amount_mm NUMERIC, notes TEXT, created_by TEXT);
CREATE TABLE IF NOT EXISTS public.tasks (id TEXT PRIMARY KEY, title TEXT, description TEXT, status TEXT, priority TEXT, assigned_to_ids TEXT[], due_date TEXT, plot_id TEXT, created_by TEXT);
CREATE TABLE IF NOT EXISTS public.storage_points (id TEXT PRIMARY KEY, name TEXT, node_code TEXT, type TEXT, address TEXT, city TEXT, province TEXT, coordinates JSONB, responsible_user_id TEXT, client_id TEXT, surface_m2 NUMERIC, conditions TEXT, notes TEXT);

-- Desactivar RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.varieties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydric_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_points DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
                        `;
                        navigator.clipboard.writeText(sql.trim());
                        alert("☢️ SCRIPT NUCLEAR V32 (CASCADE) COPIADO. Pegue en Supabase y ejecute para limpiar todo.");
                      }} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center transition-all">
                        <Flame size={18} className="mr-2"/> Copiar Script BORRADO TOTAL V32
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
