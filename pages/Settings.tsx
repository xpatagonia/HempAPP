
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  CheckCircle2, Layout, Trash2, RotateCcw, Shield, 
  AlertTriangle, FlaskConical, CheckCircle, XCircle, Info, Search, FileCode, Flame, Eraser, Server, Activity, DownloadCloud, FileJson, Zap, HardDrive, Radiation, Satellite, Radio, Archive
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding } = useAppContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'system' | 'maintenance'>('system');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // @ts-ignore
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Local Dev';
  // @ts-ignore
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'V7.0.4';

  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-900/20 p-4 rounded-full"><Lock size={48} className="text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Denegado</h2>
              <p className="text-gray-500">Zona reservada para Master Administrador.</p>
          </div>
      );
  }

  const handleFullBackup = async () => {
      setIsBackingUp(true);
      try {
          const tables = [
              'users', 'projects', 'varieties', 'locations', 'plots', 
              'trial_records', 'field_logs', 'tasks', 'seed_batches', 
              'seed_movements', 'suppliers', 'clients', 'resources', 
              'storage_points', 'hydric_records'
          ];
          
          const backupData: any = {
              timestamp: new Date().toISOString(),
              appName: appName,
              version: appVersion,
              environment: 'production_snapshot',
              data: {}
          };

          for (const table of tables) {
              const { data, error } = await supabase.from(table).select('*');
              if (!error && data) {
                  backupData.data[table] = data;
              }
          }

          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `HempC_Nucleus_SNAPSHOT_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          alert("✅ SNAPSHOT CREADO. Guarde este archivo en un lugar seguro antes de reinstalar Vercel.");
      } catch (e) {
          alert("Error al generar copia de seguridad.");
          console.error(e);
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleFixSchema = () => {
      const sql = `
-- MASTER SCHEMA INIT V7.0.6
-- Ejecutar en Supabase SQL Editor para inicializar o reparar la estructura

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES & COLUMNS (Idempotent)

-- USERS
create table if not exists public.users (id text primary key);
alter table public.users add column if not exists name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists role text;
alter table public.users add column if not exists password text;
alter table public.users add column if not exists job_title text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists avatar text;
alter table public.users add column if not exists client_id text;
alter table public.users add column if not exists is_network_member boolean default false;

-- CLIENTS
create table if not exists public.clients (id text primary key);
alter table public.clients add column if not exists name text;
alter table public.clients add column if not exists type text;
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists contact_phone text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists total_hectares numeric;
alter table public.clients add column if not exists is_network_member boolean;
alter table public.clients add column if not exists membership_level text;
alter table public.clients add column if not exists contract_date text;
alter table public.clients add column if not exists cuit text;
alter table public.clients add column if not exists notes text;
alter table public.clients add column if not exists related_user_id text;
alter table public.clients add column if not exists coordinates jsonb;

-- SUPPLIERS
create table if not exists public.suppliers (id text primary key);
alter table public.suppliers add column if not exists name text;
alter table public.suppliers add column if not exists category text;
alter table public.suppliers add column if not exists legal_name text;
alter table public.suppliers add column if not exists cuit text;
alter table public.suppliers add column if not exists country text;
alter table public.suppliers add column if not exists province text;
alter table public.suppliers add column if not exists city text;
alter table public.suppliers add column if not exists address text;
alter table public.suppliers add column if not exists postal_code text;
alter table public.suppliers add column if not exists whatsapp text;
alter table public.suppliers add column if not exists email text;
alter table public.suppliers add column if not exists commercial_contact text;
alter table public.suppliers add column if not exists logistics_contact text;
alter table public.suppliers add column if not exists website text;
alter table public.suppliers add column if not exists notes text;
alter table public.suppliers add column if not exists is_official_partner boolean default false;
alter table public.suppliers add column if not exists coordinates jsonb;

-- STORAGE POINTS
create table if not exists public.storage_points (id text primary key);
alter table public.storage_points add column if not exists name text;
alter table public.storage_points add column if not exists node_code text;
alter table public.storage_points add column if not exists type text;
alter table public.storage_points add column if not exists address text;
alter table public.storage_points add column if not exists city text;
alter table public.storage_points add column if not exists province text;
alter table public.storage_points add column if not exists coordinates jsonb;
alter table public.storage_points add column if not exists responsible_user_id text;
alter table public.storage_points add column if not exists client_id text;
alter table public.storage_points add column if not exists surface_m2 numeric;
alter table public.storage_points add column if not exists conditions text;
alter table public.storage_points add column if not exists notes text;

-- VARIETIES
create table if not exists public.varieties (id text primary key);
alter table public.varieties add column if not exists supplier_id text;
alter table public.varieties add column if not exists name text;
alter table public.varieties add column if not exists usage text;
alter table public.varieties add column if not exists cycle_days numeric;
alter table public.varieties add column if not exists expected_thc numeric;
alter table public.varieties add column if not exists knowledge_base text;
alter table public.varieties add column if not exists notes text;

-- SEED BATCHES
create table if not exists public.seed_batches (id text primary key);
alter table public.seed_batches add column if not exists variety_id text;
alter table public.seed_batches add column if not exists supplier_id text;
alter table public.seed_batches add column if not exists batch_code text;
alter table public.seed_batches add column if not exists label_serial_number text;
alter table public.seed_batches add column if not exists category text;
alter table public.seed_batches add column if not exists analysis_date text;
alter table public.seed_batches add column if not exists purity numeric;
alter table public.seed_batches add column if not exists germination numeric;
alter table public.seed_batches add column if not exists gs1_code text;
alter table public.seed_batches add column if not exists certification_number text;
alter table public.seed_batches add column if not exists purchase_order text;
alter table public.seed_batches add column if not exists purchase_date text;
alter table public.seed_batches add column if not exists price_per_kg numeric;
alter table public.seed_batches add column if not exists initial_quantity numeric;
alter table public.seed_batches add column if not exists remaining_quantity numeric;
alter table public.seed_batches add column if not exists storage_conditions text;
alter table public.seed_batches add column if not exists storage_point_id text;
alter table public.seed_batches add column if not exists logistics_responsible text;
alter table public.seed_batches add column if not exists notes text;
alter table public.seed_batches add column if not exists is_active boolean;
alter table public.seed_batches add column if not exists created_at text;

-- SEED MOVEMENTS
create table if not exists public.seed_movements (id text primary key);
alter table public.seed_movements add column if not exists batch_id text;
alter table public.seed_movements add column if not exists client_id text;
alter table public.seed_movements add column if not exists target_location_id text;
alter table public.seed_movements add column if not exists quantity numeric;
alter table public.seed_movements add column if not exists date text;
alter table public.seed_movements add column if not exists dispatch_time text;
alter table public.seed_movements add column if not exists transport_guide_number text;
alter table public.seed_movements add column if not exists transport_type text;
alter table public.seed_movements add column if not exists driver_name text;
alter table public.seed_movements add column if not exists driver_dni text;
alter table public.seed_movements add column if not exists vehicle_plate text;
alter table public.seed_movements add column if not exists vehicle_model text;
alter table public.seed_movements add column if not exists transport_company text;
alter table public.seed_movements add column if not exists recipient_name text;
alter table public.seed_movements add column if not exists recipient_dni text;
alter table public.seed_movements add column if not exists route_itinerary text;
alter table public.seed_movements add column if not exists status text;
alter table public.seed_movements add column if not exists origin_storage_id text;
alter table public.seed_movements add column if not exists route_google_link text;
alter table public.seed_movements add column if not exists estimated_distance_km numeric;

-- LOCATIONS
create table if not exists public.locations (id text primary key);
alter table public.locations add column if not exists name text;
alter table public.locations add column if not exists province text;
alter table public.locations add column if not exists city text;
alter table public.locations add column if not exists address text;
alter table public.locations add column if not exists soil_type text;
alter table public.locations add column if not exists climate text;
alter table public.locations add column if not exists responsible_person text;
alter table public.locations add column if not exists coordinates jsonb;
alter table public.locations add column if not exists polygon jsonb;
alter table public.locations add column if not exists client_id text;
alter table public.locations add column if not exists owner_name text;
alter table public.locations add column if not exists owner_legal_name text;
alter table public.locations add column if not exists owner_cuit text;
alter table public.locations add column if not exists owner_contact text;
alter table public.locations add column if not exists owner_type text;
alter table public.locations add column if not exists capacity_ha numeric;
alter table public.locations add column if not exists irrigation_system text;
alter table public.locations add column if not exists responsible_ids text[];

-- PROJECTS
create table if not exists public.projects (id text primary key);
alter table public.projects add column if not exists name text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists start_date text;
alter table public.projects add column if not exists status text;
alter table public.projects add column if not exists director_id text;
alter table public.projects add column if not exists responsible_ids text[];

-- PLOTS
create table if not exists public.plots (id text primary key);
alter table public.plots add column if not exists location_id text;
alter table public.plots add column if not exists project_id text;
alter table public.plots add column if not exists variety_id text;
alter table public.plots add column if not exists seed_batch_id text;
alter table public.plots add column if not exists name text;
alter table public.plots add column if not exists type text;
alter table public.plots add column if not exists block text;
alter table public.plots add column if not exists replicate numeric;
alter table public.plots add column if not exists surface_area numeric;
alter table public.plots add column if not exists surface_unit text;
alter table public.plots add column if not exists density numeric;
alter table public.plots add column if not exists status text;
alter table public.plots add column if not exists sowing_date text;
alter table public.plots add column if not exists owner_name text;
alter table public.plots add column if not exists responsible_ids text[];
alter table public.plots add column if not exists row_distance numeric;
alter table public.plots add column if not exists perimeter numeric;
alter table public.plots add column if not exists observations text;
alter table public.plots add column if not exists coordinates jsonb;
alter table public.plots add column if not exists polygon jsonb;
alter table public.plots add column if not exists irrigation_type text;
alter table public.plots add column if not exists used_seed_value numeric;
alter table public.plots add column if not exists used_seed_unit text;
alter table public.plots add column if not exists color text default '#16a34a';

-- TRIAL RECORDS
create table if not exists public.trial_records (id text primary key);
alter table public.trial_records add column if not exists plot_id text;
alter table public.trial_records add column if not exists date text;
alter table public.trial_records add column if not exists time text;
alter table public.trial_records add column if not exists stage text;
alter table public.trial_records add column if not exists temperature numeric;
alter table public.trial_records add column if not exists humidity numeric;
alter table public.trial_records add column if not exists plant_height numeric;
alter table public.trial_records add column if not exists plants_per_meter numeric;
alter table public.trial_records add column if not exists uniformity numeric;
alter table public.trial_records add column if not exists vigor numeric;
alter table public.trial_records add column if not exists lodging numeric;
alter table public.trial_records add column if not exists bird_damage numeric;
alter table public.trial_records add column if not exists diseases_score numeric;
alter table public.trial_records add column if not exists pests_score numeric;
alter table public.trial_records add column if not exists harvest_plant_count numeric;
alter table public.trial_records add column if not exists seed_yield numeric;
alter table public.trial_records add column if not exists seed_quality_germination numeric;
alter table public.trial_records add column if not exists seed_quality_non_conformity numeric;
alter table public.trial_records add column if not exists stem_weight numeric;
alter table public.trial_records add column if not exists leaf_weight numeric;
alter table public.trial_records add column if not exists fresh_weight numeric;
alter table public.trial_records add column if not exists yield numeric;
alter table public.trial_records add column if not exists replicate numeric;
alter table public.trial_records add column if not exists emergence_date text;
alter table public.trial_records add column if not exists flowering_date text;
alter table public.trial_records add column if not exists harvest_date text;
alter table public.trial_records add column if not exists diseases text;
alter table public.trial_records add column if not exists pests text;
alter table public.trial_records add column if not exists created_by text;
alter table public.trial_records add column if not exists created_by_name text;
alter table public.trial_records add column if not exists light_hours numeric;
alter table public.trial_records add column if not exists lunar_phase text;

-- FIELD LOGS
create table if not exists public.field_logs (id text primary key);
alter table public.field_logs add column if not exists plot_id text;
alter table public.field_logs add column if not exists date text;
alter table public.field_logs add column if not exists time text;
alter table public.field_logs add column if not exists note text;
alter table public.field_logs add column if not exists photo_url text;

-- HYDRIC RECORDS
create table if not exists public.hydric_records (id text primary key);
alter table public.hydric_records add column if not exists location_id text;
alter table public.hydric_records add column if not exists plot_id text;
alter table public.hydric_records add column if not exists date text;
alter table public.hydric_records add column if not exists time text;
alter table public.hydric_records add column if not exists end_time text;
alter table public.hydric_records add column if not exists type text;
alter table public.hydric_records add column if not exists amount_mm numeric;
alter table public.hydric_records add column if not exists notes text;
alter table public.hydric_records add column if not exists created_by text;

-- TASKS
create table if not exists public.tasks (id text primary key);
alter table public.tasks add column if not exists title text;
alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists status text;
alter table public.tasks add column if not exists priority text;
alter table public.tasks add column if not exists assigned_to_ids text[];
alter table public.tasks add column if not exists due_date text;
alter table public.tasks add column if not exists plot_id text;
alter table public.tasks add column if not exists created_by text;

-- RESOURCES
create table if not exists public.resources (id text primary key);
alter table public.resources add column if not exists name text;
alter table public.resources add column if not exists type text;
alter table public.resources add column if not exists unit text;
alter table public.resources add column if not exists cost_per_unit numeric;
alter table public.resources add column if not exists stock numeric;
`;
      navigator.clipboard.writeText(sql);
      alert("Script SQL Maestro copiado al portapapeles. Ejecútalo en Supabase para sincronizar todas las tablas.");
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center mb-8">
        <SettingsIcon className="text-hemp-500 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">Panel de Control Master</h1>
            <p className="text-gray-500">Versión del Sistema: <span className="font-mono text-hemp-600">{appVersion}</span></p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-8 w-fit shadow-inner border dark:border-slate-800">
          <button onClick={() => setActiveTab('system')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'system' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Sistema & Datos</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'maintenance' ? 'bg-white dark:bg-amber-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Mantenimiento</button>
      </div>

      {activeTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              
              {/* SNAPSHOT CARD */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden text-white border border-slate-700">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-3 bg-blue-500/20 rounded-xl"><Archive size={24} className="text-blue-400"/></div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Snapshot de Seguridad</h3>
                          </div>
                          <p className="text-sm text-slate-400 font-medium max-w-md leading-relaxed">
                              Genera un archivo JSON completo con toda la base de datos actual. 
                              <br/><strong className="text-white">Obligatorio antes de realizar migraciones o borrar proyectos en Vercel.</strong>
                          </p>
                      </div>
                      <button 
                        onClick={handleFullBackup}
                        disabled={isBackingUp}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center transition-all disabled:opacity-50 hover:scale-105"
                      >
                          {isBackingUp ? <RefreshCw className="animate-spin mr-2" size={18}/> : <DownloadCloud className="mr-2" size={18}/>}
                          {isBackingUp ? 'Generando Archivo...' : 'Descargar Snapshot'}
                      </button>
                  </div>
                  <Database className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5 pointer-events-none"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                          <FileCode className="text-hemp-600" size={24}/>
                          <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">Esquema SQL Maestro</h4>
                      </div>
                      <p className="text-xs text-slate-500 mb-6">Si la app muestra errores de columnas faltantes, copia el script de reparación completo.</p>
                      <button onClick={handleFixSchema} className="w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition">
                          Copiar SQL Fix
                      </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Build Timestamp</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 p-2 rounded-lg">{buildTime}</p>
                  </div>
              </div>
          </div>
      )}
      
      {activeTab === 'maintenance' && (
          <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-[40px] border border-red-200 dark:border-red-900/30 text-center animate-in fade-in">
              <AlertTriangle size={48} className="mx-auto text-red-500 mb-4"/>
              <h3 className="text-xl font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-2">Zona de Peligro</h3>
              <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-6 max-w-md mx-auto">
                  Estas acciones afectan el almacenamiento local del navegador. No borran datos del servidor, pero pueden cerrar tu sesión.
              </p>
              <button 
                onClick={() => { if(window.confirm("¿Reiniciar caché local?")) { localStorage.clear(); window.location.reload(); } }}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition"
              >
                  Forzar Reinicio Local
              </button>
          </div>
      )}
    </div>
  );
}
