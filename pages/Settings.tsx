
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  CheckCircle2, Layout, Trash2, RotateCcw, Shield, 
  AlertTriangle, FlaskConical, CheckCircle, XCircle, Info, Search, FileCode, Flame, Eraser, Server, Activity, DownloadCloud, FileJson
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding } = useAppContext();
  // CAMBIO: Tab por defecto 'system' para asegurar que el usuario vea el botón de actualización
  const [activeTab, setActiveTab] = useState<'branding' | 'system' | 'maintenance'>('system');
  const [editAppName, setEditAppName] = useState(appName);
  const [editAppLogo, setEditAppLogo] = useState(appLogo);
  const [isBackingUp, setIsBackingUp] = useState(false);

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
              version: '1.0.0-PROD',
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
          a.download = `Nucleus_Backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          alert("✅ Snapshot de datos descargado correctamente.");
      } catch (e) {
          alert("Error al generar copia de seguridad.");
          console.error(e);
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleFixSchema = () => {
      const sql = `
-- FIX V44: REPARACIÓN INTEGRAL DE STOCK E INSUMOS
-- Ejecutar en SQL Editor de Supabase para habilitar nuevas funciones

-- 1. Campos de Parcelas (Plots) - Consumo de Semilla
alter table public.plots add column if not exists color text default '#16a34a';
alter table public.plots add column if not exists used_seed_value numeric default 0;
alter table public.plots add column if not exists used_seed_unit text default 'kg';

-- 2. Campos de Lotes de Semilla (Seed Batches) - Ubicación y Origen
alter table public.seed_batches add column if not exists supplier_id uuid; 
alter table public.seed_batches add column if not exists category text;
alter table public.seed_batches add column if not exists label_serial_number text;
alter table public.seed_batches add column if not exists storage_point_id uuid; -- CRÍTICO: Indica dónde está el stock

-- 3. Campos de Movimientos (Seed Movements)
alter table public.seed_movements add column if not exists origin_storage_id uuid;
alter table public.seed_movements add column if not exists client_id uuid;

-- 4. Campos de Depósitos (Storage Points)
alter table public.storage_points add column if not exists client_id uuid;
alter table public.storage_points add column if not exists node_code text;

-- 5. Actualizar caché de API
NOTIFY pgrst, 'reload schema';
`;
      navigator.clipboard.writeText(sql);
      alert("✅ SCRIPT V44 COPIADO.\n\nInstrucciones:\n1. Ve al Editor SQL de Supabase.\n2. Pega el código (Ctrl+V).\n3. Ejecuta 'Run'.\n\nSi no haces esto, los datos de stock y consumo NO SE GUARDARÁN.");
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex items-center mb-8">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control Master</h1>
            <p className="text-gray-500">Configuración global y estado del servidor Nucleus.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-8 w-fit shadow-inner">
          <button onClick={() => setActiveTab('branding')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Identidad</button>
          <button onClick={() => setActiveTab('system')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'system' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Sistema & BD</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'maintenance' ? 'bg-white dark:bg-amber-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Zona de Peligro</button>
      </div>

      {activeTab === 'branding' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6">Personalización de Marca</h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de la Plataforma</label>
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600 transition-all" value={editAppName} onChange={e => setEditAppName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL del Logo (PNG/SVG)</label>
                          <div className="flex gap-4">
                              <input type="text" className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-hemp-600 transition-all" value={editAppLogo || ''} onChange={e => setEditAppLogo(e.target.value)} placeholder="https://..." />
                              {editAppLogo && <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-2 flex items-center justify-center"><img src={editAppLogo} className="max-w-full max-h-full object-contain"/></div>}
                          </div>
                      </div>
                      <div className="pt-4">
                          <button onClick={handleSaveBranding} className="w-full md:w-auto px-10 py-4 bg-slate-900 dark:bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center">
                              <Save size={18} className="mr-2"/> Guardar Cambios
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'maintenance' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[40px] border border-amber-200 dark:border-amber-900/30 shadow-sm relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-6 relative z-10">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600">
                          <Eraser size={24}/>
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-amber-900 dark:text-amber-200 uppercase tracking-tighter italic">Reinicio de Campaña</h3>
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Eliminación de datos transaccionales</p>
                      </div>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300/80 mb-8 leading-relaxed max-w-2xl relative z-10 font-medium">
                      Esta acción genera un script SQL para limpiar registros de parcelas, monitoreos, stock y movimientos. 
                      <strong className="block mt-2">NO elimina usuarios, campos, ni configuraciones maestras.</strong>
                  </p>
                  <button onClick={() => { const sql = `-- PROTOCOLO DE LIMPIEZA DE CAMPAÑA\nDELETE FROM public.field_logs;\nDELETE FROM public.trial_records;\nDELETE FROM public.seed_movements;\nDELETE FROM public.seed_batches;\nDELETE FROM public.hydric_records;\nDELETE FROM public.tasks;\n-- Opcional: Reiniciar Parcelas\n-- DELETE FROM public.plots;\nNOTIFY pgrst, 'reload schema';`; navigator.clipboard.writeText(sql); alert("☢️ SCRIPT DE LIMPIEZA COPIADO AL PORTAPAPELES.\nEjecútelo en el Editor SQL de Supabase con precaución."); }} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center relative z-10">
                      <Eraser size={20} className="mr-2"/> Copiar Script de Limpieza
                  </button>
                  <Flame className="absolute -bottom-10 -right-10 text-amber-500 opacity-10 w-64 h-64 pointer-events-none"/>
              </div>
          </div>
      )}

      {activeTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              
              {/* FIX DATABASE BUTTON */}
              <div className="bg-blue-600 p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer border border-blue-500" onClick={handleFixSchema}>
                  <div className="flex justify-between items-center relative z-10">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <Database size={24} className="text-white"/>
                              <h3 className="text-xl font-black uppercase tracking-tighter italic">Actualizar Esquema SQL (V44 - REPARACIÓN)</h3>
                          </div>
                          <p className="text-xs text-blue-100 font-medium max-w-md">
                              Soluciona error "Sin datos en Stock". Repara columnas 'storage_point_id' y 'used_seed_value' necesarias para el inventario.
                          </p>
                      </div>
                      <div className="bg-white/20 p-3 rounded-full animate-pulse">
                          <FileCode size={24}/>
                      </div>
                  </div>
                  <div className="mt-6 flex items-center text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-4 py-2 rounded-full border border-white/20">
                      Clic para copiar Script de Reparación
                  </div>
              </div>

              {/* BACKUP SECTION */}
              <div className="bg-slate-900 dark:bg-hemp-600 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                          <Database size={24} className="text-hemp-400 dark:text-white"/>
                          <h3 className="text-xl font-black uppercase tracking-tighter italic">Copia de Seguridad</h3>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-white/80 font-medium max-w-md leading-relaxed">
                          Genera un archivo JSON ("Snapshot") con toda la información actual de la base de datos (Parcelas, Usuarios, Monitoreos, etc.) para resguardo local.
                      </p>
                  </div>
                  <button 
                    onClick={handleFullBackup}
                    disabled={isBackingUp}
                    className="relative z-10 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                      {isBackingUp ? <RefreshCw className="animate-spin mr-2" size={18}/> : <DownloadCloud className="mr-2" size={18}/>}
                      {isBackingUp ? 'Generando...' : 'Descargar Snapshot'}
                  </button>
                  <FileJson className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5 pointer-events-none"/>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-8 rounded-[40px] shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-4">
                          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600"><Server size={24}/></div>
                          <div>
                              <h3 className="font-black text-emerald-900 dark:text-emerald-300 uppercase text-lg tracking-tighter">Estado Operativo</h3>
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Producción Estable</p>
                          </div>
                      </div>
                      <div className="px-4 py-2 bg-emerald-200 dark:bg-emerald-900/50 rounded-full text-emerald-800 dark:text-emerald-200 text-xs font-black uppercase tracking-widest flex items-center">
                          <Activity size={14} className="mr-2 animate-pulse"/> Online
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/60 dark:bg-slate-900/50 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex items-center space-x-3">
                          <CheckCircle2 size={20} className="text-emerald-500"/>
                          <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Esquema de Base de Datos</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sincronizado (V47)</p>
                          </div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-900/50 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex items-center space-x-3">
                          <CheckCircle2 size={20} className="text-emerald-500"/>
                          <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Motor de Inteligencia</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Gemini 3 Flash Activo</p>
                          </div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-900/50 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex items-center space-x-3">
                          <CheckCircle2 size={20} className="text-emerald-500"/>
                          <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Almacenamiento Multimedia</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Optimizado (Compresión v2)</p>
                          </div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-900/50 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex items-center space-x-3">
                          <CheckCircle2 size={20} className="text-emerald-500"/>
                          <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Protocolos de Seguridad</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">RLS Habilitado</p>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                      <Database size={20} className="text-slate-400"/>
                      <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Versión del Cliente</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Nucleus WebApp v1.0.0-PROD</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Build</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400">stable-release-2025</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
