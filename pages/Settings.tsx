
import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  Trash2, RotateCcw, Shield, Image as ImageIcon,
  AlertTriangle, CheckCircle, XCircle, Info, FileCode, Server, DownloadCloud, Archive, Upload, Palette, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding } = useAppContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'system' | 'maintenance'>('branding');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [tempName, setTempName] = useState(appName);
  const [tempLogo, setTempLogo] = useState(appLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @ts-ignore
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Local Dev';
  // @ts-ignore
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'V7.0.6';

  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-900/20 p-4 rounded-full"><Lock size={48} className="text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Denegado</h2>
              <p className="text-gray-500">Zona reservada para Master Administrador.</p>
          </div>
      );
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (!file.type.includes('png')) {
            alert("Por favor, sube un archivo PNG.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            setTempLogo(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
        await updateBranding(tempName, tempLogo);
        alert("✅ Identidad visual actualizada correctamente en la red.");
    } finally {
        setIsSavingBranding(false);
    }
  };

  const handleFullBackup = async () => {
      setIsBackingUp(true);
      try {
          const tables = [
              'users', 'projects', 'varieties', 'locations', 'plots', 
              'trial_records', 'field_logs', 'tasks', 'seed_batches', 
              'seed_movements', 'suppliers', 'clients', 'resources', 
              'storage_points', 'hydric_records', 'platform_settings'
          ];
          const backupData: any = { timestamp: new Date().toISOString(), appName, version: appVersion, data: {} };
          for (const table of tables) {
              const { data, error } = await supabase.from(table).select('*');
              if (!error && data) backupData.data[table] = data;
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
          alert("✅ SNAPSHOT CREADO.");
      } catch (e) {
          alert("Error al generar copia de seguridad.");
      } finally {
          setIsBackingUp(false);
      }
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
          <button onClick={() => setActiveTab('branding')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'branding' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Branding</button>
          <button onClick={() => setActiveTab('system')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'system' ? 'bg-white dark:bg-hemp-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Sistema</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-widest ${activeTab === 'maintenance' ? 'bg-white dark:bg-amber-600 shadow-md text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Mantenimiento</button>
      </div>

      {activeTab === 'branding' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6 flex items-center">
                      <Palette size={20} className="mr-2 text-hemp-600"/> Personalización Visual
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de la Plataforma</label>
                              <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 p-3 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-hemp-500"
                                value={tempName}
                                onChange={e => setTempName(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Logo Industrial (PNG)</label>
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-hemp-500 transition-colors group"
                              >
                                  <input ref={fileInputRef} type="file" accept="image/png" className="hidden" onChange={handleLogoUpload} />
                                  <Upload size={32} className="text-slate-300 group-hover:text-hemp-500 mb-2 transition-colors"/>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click para subir PNG</span>
                              </div>
                          </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 flex flex-col items-center justify-center border dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Vista Previa</p>
                          <div className="w-32 h-32 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl shadow-inner border dark:border-slate-800 p-4">
                              {tempLogo ? <img src={tempLogo} alt="Preview" className="max-w-full max-h-full object-contain" /> : <ImageIcon size={48} className="text-slate-200" />}
                          </div>
                          <p className="mt-4 font-black text-slate-800 dark:text-white uppercase tracking-tighter text-lg">{tempName}</p>
                      </div>
                  </div>
                  <div className="mt-8 pt-6 border-t dark:border-slate-800 flex justify-end">
                      <button onClick={handleSaveBranding} disabled={isSavingBranding} className="bg-hemp-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-hemp-700 transition flex items-center disabled:opacity-50">
                          {isSavingBranding ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>}
                          Aplicar Identidad
                      </button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden text-white border border-slate-700">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-3 bg-blue-500/20 rounded-xl"><Archive size={24} className="text-blue-400"/></div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Snapshot de Seguridad</h3>
                          </div>
                          <p className="text-sm text-slate-400 font-medium max-w-md leading-relaxed">Genera un archivo JSON completo con toda la base de datos actual.</p>
                      </div>
                      <button onClick={handleFullBackup} disabled={isBackingUp} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center transition-all disabled:opacity-50">
                          {isBackingUp ? <RefreshCw className="animate-spin mr-2" size={18}/> : <DownloadCloud className="mr-2" size={18}/>}
                          Descargar Snapshot
                      </button>
                  </div>
                  <Database className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5 pointer-events-none"/>
              </div>
          </div>
      )}
      
      {activeTab === 'maintenance' && (
          <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-[40px] border border-red-200 dark:border-red-900/30 text-center animate-in fade-in">
              <AlertTriangle size={48} className="mx-auto text-red-500 mb-4"/>
              <h3 className="text-xl font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-2">Zona de Peligro</h3>
              <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-6 max-w-md mx-auto">Estas acciones afectan el almacenamiento local. No borran datos del servidor.</p>
              <button onClick={() => { if(window.confirm("¿Reiniciar caché local?")) { localStorage.clear(); window.location.reload(); } }} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition">Forzar Reinicio Local</button>
          </div>
      )}
    </div>
  );
}
