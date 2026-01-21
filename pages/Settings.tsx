
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  CheckCircle2, Layout, Trash2, RotateCcw, Shield, 
  AlertTriangle, FlaskConical, CheckCircle, XCircle, Info, Search, FileCode, Flame, Eraser, Server, Activity, DownloadCloud, FileJson, Zap, HardDrive, Radiation, Satellite, Radio
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding } = useAppContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'system' | 'maintenance'>('system');
  const [editAppName, setEditAppName] = useState(appName);
  const [editAppLogo, setEditAppLogo] = useState(appLogo);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // @ts-ignore
  const buildTime = process.env.BUILD_TIME || 'Unknown';

  useEffect(() => {
      console.log(`--- SETTINGS MODULE V300 (CRIMSON) LOADED ---`);
      setEditAppName(appName);
      setEditAppLogo(appLogo);
  }, [appName, appLogo]);

  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-900/20 p-4 rounded-full"><Lock size={48} className="text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Denegado</h2>
              <p className="text-gray-500">Zona reservada para Master Administrador.</p>
          </div>
      );
  }

  const handleSaveBranding = () => {
      updateBranding(editAppName, editAppLogo);
      alert("✅ Identidad corporativa actualizada.");
  };

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
              version: '3.0.0-CRIMSON',
              data: {}
          };

          for (const table of tables) {
              const { data, error } = await supabase.from(table).select('*');
              if (!error) {
                  backupData.data[table] = data;
              }
          }

          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Nucleus_Backup_V300_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          alert("✅ Snapshot V300 descargado correctamente.");
      } catch (e) {
          alert("Error al generar copia de seguridad.");
          console.error(e);
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleFixSchema = () => {
      const sql = `
-- FIX V300: CRIMSON GUARD (FINAL SQL MIGRATION)
-- Este script es seguro para ejecutar múltiples veces (Idempotente)

-- 1. Actualización de Tablas Principales
DO $$ 
BEGIN 
    -- Plots / Parcelas
    ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS color text DEFAULT '#16a34a';
    ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS used_seed_value numeric DEFAULT 0;
    ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS used_seed_unit text DEFAULT 'kg';

    -- Seed Batches / Lotes
    ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS supplier_id uuid; 
    ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS category text;
    ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS label_serial_number text;
    ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS storage_point_id uuid; 

    -- Movimientos
    ALTER TABLE public.seed_movements ADD COLUMN IF NOT EXISTS origin_storage_id uuid;
    ALTER TABLE public.seed_movements ADD COLUMN IF NOT EXISTS client_id uuid;

    -- Puntos de Almacenamiento
    ALTER TABLE public.storage_points ADD COLUMN IF NOT EXISTS client_id uuid;
    ALTER TABLE public.storage_points ADD COLUMN IF NOT EXISTS node_code text;
    ALTER TABLE public.storage_points ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
    ALTER TABLE public.storage_points ADD COLUMN IF NOT EXISTS surface_m2 numeric;
    ALTER TABLE public.storage_points ADD COLUMN IF NOT EXISTS coordinates jsonb;

    -- Clientes
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS coordinates jsonb;
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS related_user_id uuid;
END $$;

-- 2. Asegurar Existencia de Depósito Default (Recuperación de Stock Huérfano)
INSERT INTO public.storage_points (id, name, type, node_code, address, city)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Depósito General (Recuperado)', 'Propio', 'REC-001', 'Sede Central', 'General'
WHERE NOT EXISTS (SELECT 1 FROM public.storage_points);

-- 3. Vincular Stock Huérfano
UPDATE public.seed_batches
SET storage_point_id = (SELECT id FROM public.storage_points LIMIT 1)
WHERE storage_point_id IS NULL;

-- 4. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
`;
      navigator.clipboard.writeText(sql);
      alert("🔴 SCRIPT V300 (CRIMSON) COPIADO AL PORTAPAPELES.\n\nEste script arreglará la base de datos V42/Vxx.\n\nInstrucciones:\n1. Ve a Supabase > SQL Editor.\n2. Pega el contenido.\n3. Ejecuta (RUN).");
  };

  const handleHardReset = () => {
      if(window.confirm("ATENCIÓN: Esto borrará la memoria local del navegador y recargará la aplicación. Usar solo si hay problemas de visualización.")) {
          localStorage.clear();
          sessionStorage.clear();
          if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                      registration.unregister();
                  }
              });
          }
          // Force reload with unique timestamp to bust Cloudflare cache
          window.location.href = window.location.origin + '?t=' + Date.now();
      }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex items-center mb-8">
        <SettingsIcon className="text-hemp-500 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control Master</h1>
            <p className="text-gray-500">Configuración global y estado del servidor Nucleus V300.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-8 w-fit shadow-inner border dark:border-slate-800">
          <button onClick={() => setActiveTab('branding')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('system')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'system' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Sistema & BD</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'maintenance' ? 'bg-white dark:bg-amber-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Zona de Peligro</button>
      </div>

      {activeTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              
              {/* FIX DATABASE BUTTON - VERSION 300 (CRIMSON) */}
              <div 
                className="bg-[#2a0a0a] border border-red-600 p-8 rounded-[40px] shadow-2xl text-red-500 relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer ring-4 ring-red-900/30" 
                onClick={handleFixSchema}
              >
                  <div className="flex justify-between items-center relative z-10">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <Radio size={28} className="text-red-500 animate-pulse"/>
                              <h3 className="text-2xl font-black uppercase tracking-tighter italic text-red-500">V300: CRIMSON SQL</h3>
                          </div>
                          <p className="text-xs text-red-300 font-medium max-w-md">
                              <strong>ESTADO: CRÍTICO.</strong> Si ves este panel <span className="underline font-bold text-red-500">ROJO SANGRE</span>, has roto la caché de Cloudflare. Pulsa para copiar el SQL Maestro.
                          </p>
                      </div>
                      <div className="bg-red-900/30 p-4 rounded-full border border-red-500/30">
                          <FileCode size={32}/>
                      </div>
                  </div>
                  <div className="mt-8 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-500 transition shadow-lg shadow-red-900/50">
                          Copiar SQL V300 (FIX)
                      </span>
                  </div>
                  <Activity className="absolute -bottom-10 -right-10 w-64 h-64 text-red-900 opacity-20 pointer-events-none"/>
              </div>

              {/* Botón de Pánico */}
              <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[32px] border border-red-200 dark:border-red-900/30 flex items-center justify-between">
                  <div>
                      <h4 className="text-red-700 dark:text-red-400 font-black uppercase text-xs tracking-widest mb-1">Botón de Pánico (Local)</h4>
                      <p className="text-[10px] text-red-600/70 dark:text-red-400/70 font-medium">Si la app sigue mostrando datos viejos, pulsa aquí.</p>
                  </div>
                  <button onClick={handleHardReset} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-red-700">Hard Reset</button>
              </div>

              {/* BACKUP SECTION */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                          <Database size={24} className="text-slate-700 dark:text-white"/>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Copia de Seguridad</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                          Genera un archivo JSON ("Snapshot") con toda la información actual de la base de datos (Parcelas, Usuarios, Monitoreos, etc.) para resguardo local.
                      </p>
                  </div>
                  <button 
                    onClick={handleFullBackup}
                    disabled={isBackingUp}
                    className="relative z-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                      {isBackingUp ? <RefreshCw className="animate-spin mr-2" size={18}/> : <DownloadCloud className="mr-2" size={18}/>}
                      {isBackingUp ? 'Generando...' : 'Descargar Snapshot'}
                  </button>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                      <Database size={20} className="text-slate-400"/>
                      <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Versión del Cliente</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Nucleus WebApp v3.0.0-CRIMSON</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Build Time</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400">{buildTime}</p>
                  </div>
              </div>
          </div>
      )}
      
      {activeTab === 'branding' && <div className="p-10 text-center text-gray-400 font-bold">Opciones de Identidad (Sin cambios en V300)</div>}
      {activeTab === 'maintenance' && <div className="p-10 text-center text-gray-400 font-bold">Zona de Peligro (Sin cambios en V300)</div>}
    </div>
  );
}
