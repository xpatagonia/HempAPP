
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
      console.log(`--- SETTINGS MODULE V57 (RED DAWN) LOADED ---`);
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
              version: '1.0.57-RED',
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
          a.download = `Nucleus_Backup_V57_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          alert("✅ Snapshot V57 descargado correctamente.");
      } catch (e) {
          alert("Error al generar copia de seguridad.");
          console.error(e);
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleFixSchema = () => {
      const sql = `
-- FIX V57: RED DAWN (REPARACIÓN DEFINITIVA)
-- Si ves este texto en el editor SQL de Supabase, la actualización funcionó.

-- 1. ESTRUCTURA CRÍTICA (Columnas faltantes)
alter table public.plots add column if not exists color text default '#16a34a';
alter table public.plots add column if not exists used_seed_value numeric default 0;
alter table public.plots add column if not exists used_seed_unit text default 'kg';

alter table public.seed_batches add column if not exists supplier_id uuid; 
alter table public.seed_batches add column if not exists category text;
alter table public.seed_batches add column if not exists label_serial_number text;
alter table public.seed_batches add column if not exists storage_point_id uuid; 

alter table public.seed_movements add column if not exists origin_storage_id uuid;
alter table public.seed_movements add column if not exists client_id uuid;

alter table public.storage_points add column if not exists client_id uuid;
alter table public.storage_points add column if not exists node_code text;

-- 2. ASEGURAR DEPÓSITO POR DEFECTO (RECUPERACIÓN)
INSERT INTO public.storage_points (id, name, type, node_code, address, city)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Depósito General (Recuperado)', 'Propio', 'REC-001', 'Sede Central', 'General'
WHERE NOT EXISTS (SELECT 1 FROM public.storage_points);

-- 3. VINCULAR STOCK HUÉRFANO (Evita que el inventario desaparezca)
UPDATE public.seed_batches
SET storage_point_id = (SELECT id FROM public.storage_points LIMIT 1)
WHERE storage_point_id IS NULL;

-- 4. REFRESCAR API DE SUPABASE
NOTIFY pgrst, 'reload schema';
`;
      navigator.clipboard.writeText(sql);
      alert("✅ SCRIPT V57 (RED) COPIADO.\n\nEl texto 'V57: RED DAWN' confirma que tienes la última versión.\n\nInstrucciones:\n1. Ve a Supabase > SQL Editor.\n2. Pega el contenido.\n3. Ejecuta (RUN).");
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex items-center mb-8">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control Master</h1>
            <p className="text-gray-500">Configuración global y estado del servidor Nucleus V57.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-8 w-fit shadow-inner">
          <button onClick={() => setActiveTab('branding')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('system')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'system' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Sistema & BD</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'maintenance' ? 'bg-white dark:bg-amber-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Zona de Peligro</button>
      </div>

      {activeTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              
              {/* FIX DATABASE BUTTON - VERSION 57 (RED DAWN) */}
              <div 
                className="bg-gradient-to-r from-red-600 to-rose-600 p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer border border-red-500 ring-4 ring-red-200 dark:ring-red-900" 
                onClick={handleFixSchema}
              >
                  <div className="flex justify-between items-center relative z-10">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <Radio size={28} className="text-white animate-pulse"/>
                              <h3 className="text-xl font-black uppercase tracking-tighter italic">V57: RED DAWN PROTOCOL</h3>
                          </div>
                          <p className="text-xs text-white font-medium max-w-md">
                              <strong>ESTADO: SINCRONIZADO.</strong> Si ves este panel <span className="underline font-bold">ROJO INTENSO</span>, la actualización V57 se ha instalado correctamente en tu navegador.
                          </p>
                      </div>
                      <div className="bg-white/20 p-4 rounded-full border border-white/20">
                          <FileCode size={32}/>
                      </div>
                  </div>
                  <div className="mt-8 flex items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white text-red-700 px-6 py-3 rounded-full hover:bg-red-50 transition shadow-lg">
                          Copiar SQL V57 (FINAL)
                      </span>
                  </div>
                  <Activity className="absolute -bottom-10 -right-10 w-64 h-64 text-white opacity-20 pointer-events-none"/>
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
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Nucleus WebApp v1.0.57-RED</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Build Time</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400">{buildTime}</p>
                  </div>
              </div>
          </div>
      )}
      
      {activeTab === 'branding' && <div className="p-10 text-center text-gray-400 font-bold">Opciones de Identidad (Sin cambios en V57)</div>}
      {activeTab === 'maintenance' && <div className="p-10 text-center text-gray-400 font-bold">Zona de Peligro (Sin cambios en V57)</div>}
    </div>
  );
}
