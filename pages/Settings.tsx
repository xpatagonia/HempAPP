import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Save, Database, RefreshCw, Lock, Settings as SettingsIcon, 
  Trash2, RotateCcw, Shield, Image as ImageIcon,
  AlertTriangle, CheckCircle, XCircle, Info, FileCode, Server, DownloadCloud, Archive, Upload, Palette, Loader2,
  Cloud, CloudRain, Copy, Check, ExternalLink, ArrowRight, Layers, Sprout, Tractor, Users, BookOpen, Mail, Cpu, Send
} from 'lucide-react';
import { supabase, getStoredCredentials, saveSupabaseCredentials, checkConnection } from '../supabaseClient';
import {
  checkEmailServiceStatus,
  sendTestNotificationEmail
} from '../src/services/emailNotificationService';
import { wakeUpRenderEngine } from '../src/services/telemetryStreamService';
import {
  DEMO_USERS_LIST as HISTORICAL_USERS,
  DEMO_CLIENTS as HISTORICAL_CLIENTS,
  DEMO_LOCATIONS as HISTORICAL_LOCATIONS,
  DEMO_PLOTS as HISTORICAL_PLOTS,
  DEMO_PROJECTS as HISTORICAL_PROJECTS,
  DEMO_VARIETIES as HISTORICAL_VARIETIES,
  DEMO_TRIALS as HISTORICAL_TRIALS,
  DEMO_HYDRIC as HISTORICAL_HYDRIC,
  DEMO_TASKS as HISTORICAL_TASKS,
  DEMO_STORAGE_POINTS as HISTORICAL_STORAGE,
  DEMO_SUPPLIERS as HISTORICAL_SUPPLIERS,
  DEMO_SEED_BATCHES as HISTORICAL_SEED_BATCHES,
  DEMO_SEED_MOVEMENTS as HISTORICAL_SEED_MOVEMENTS,
  DEMO_RESOURCES as HISTORICAL_RESOURCES
} from '../src/data/historicalCampaignSeed';

export default function Settings() {
  const { currentUser, appName, appLogo, updateBranding, refreshData, isDbConnected } = useAppContext();
  const [activeTab, setActiveTab] = useState<'branding' | 'system' | 'maintenance'>('branding');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [tempName, setTempName] = useState(appName);
  const [tempLogo, setTempLogo] = useState(appLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Configuration State
  const initialCreds = getStoredCredentials();
  const [sbUrl, setSbUrl] = useState(initialCreds.url.includes('placeholder') ? '' : initialCreds.url);
  const [sbKey, setSbKey] = useState(initialCreds.key.includes('placeholder') ? '' : initialCreds.key);
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [sbStatusMsg, setSbStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Hybrid Architecture (Vercel + Resend.com + Supabase & Render Python IoT/AI) State
  const [testEmailTarget, setTestEmailTarget] = useState(currentUser?.email || 'xpatagonia.com@gmail.com');
  const [hybridStatus, setHybridStatus] = useState<{
    engineOnline: boolean;
    resendConfigured: boolean;
    supabaseConfigured: boolean;
    provider: string;
    host: string;
    engineUrl: string;
  } | null>(null);
  const [isTestingHybrid, setIsTestingHybrid] = useState(false);
  const [hybridMsg, setHybridMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    wakeUpRenderEngine();
    checkEmailServiceStatus().then(st => {
      setHybridStatus({
        engineOnline: st.engineOnline,
        resendConfigured: st.resendConfigured,
        supabaseConfigured: st.supabaseConfigured,
        provider: st.provider,
        host: st.host,
        engineUrl: st.engineUrl
      });
    });
  }, []);

  // Historical Sync State
  const [isSyncingHistorical, setIsSyncingHistorical] = useState(false);
  const [syncReport, setSyncReport] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // @ts-ignore
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Local Dev';
  // @ts-ignore
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'V7.24.0-STABLE';

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

  const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => toSnakeCase(v));
    if (obj !== null && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = toSnakeCase(obj[key]);
        return result;
      }, {} as any);
    }
    return obj;
  };

  const handleSaveSupabaseConfig = async () => {
    setIsTestingSb(true);
    setSbStatusMsg(null);
    try {
      if (!sbUrl.trim() || !sbKey.trim()) {
        setSbStatusMsg({ type: 'error', text: 'Por favor complete tanto la URL como la clave anónima de Supabase.' });
        return;
      }
      saveSupabaseCredentials(sbUrl.trim(), sbKey.trim());
      const connected = await checkConnection();
      if (connected) {
        setSbStatusMsg({ type: 'success', text: '✅ Conexión con Supabase verificada exitosamente.' });
        await refreshData();
      } else {
        setSbStatusMsg({ type: 'error', text: '❌ No se pudo conectar a Supabase. Verifique las credenciales ingresadas.' });
      }
    } catch (e: any) {
      setSbStatusMsg({ type: 'error', text: `Error de conexión: ${e.message || 'Fallo desconocido'}` });
    } finally {
      setIsTestingSb(false);
    }
  };

  const handleSyncHistoricalToSupabase = async () => {
    setIsSyncingHistorical(true);
    setSyncReport(null);
    try {
      const connected = await checkConnection();
      if (!connected) {
        setSyncReport({
          success: false,
          message: 'No hay conexión activa con Supabase. Primero configure y verifique la URL y Anon Key arriba.'
        });
        return;
      }

      const tablesToSync: { name: string; label: string; data: any[] }[] = [
        { name: 'platform_settings', label: 'Ajustes de Plataforma', data: [{ id: 'default', app_name: appName, app_logo: appLogo }] },
        { name: 'users', label: 'Usuarios y Administradores', data: HISTORICAL_USERS },
        { name: 'clients', label: 'Socios de Red (Consorcios / Productores)', data: HISTORICAL_CLIENTS },
        { name: 'locations', label: 'Campos y Sitios Productivos', data: HISTORICAL_LOCATIONS },
        { name: 'projects', label: 'Campañas y Programas Agronómicos', data: HISTORICAL_PROJECTS },
        { name: 'varieties', label: 'Catálogo Genético INASE', data: HISTORICAL_VARIETIES },
        { name: 'plots', label: 'Parcelas de Ensayo y Lotes de Campo', data: HISTORICAL_PLOTS },
        { name: 'trial_records', label: 'Ensayos de Campo y Monitoreo Fenológico', data: HISTORICAL_TRIALS },
        { name: 'hydric_records', label: 'Balance Hídrico y Registros Pluviométricos', data: HISTORICAL_HYDRIC },
        { name: 'tasks', label: 'Labores Agrícolas y Órdenes de Trabajo', data: HISTORICAL_TASKS },
        { name: 'storage_points', label: 'Centros de Acopio y Silos', data: HISTORICAL_STORAGE },
        { name: 'suppliers', label: 'Proveedores Homologados', data: HISTORICAL_SUPPLIERS },
        { name: 'seed_batches', label: 'Lotes de Semilla y Cosecha', data: HISTORICAL_SEED_BATCHES },
        { name: 'seed_movements', label: 'Movimientos y Remitos de Lotes', data: HISTORICAL_SEED_MOVEMENTS },
        { name: 'resources', label: 'Insumos y Recursos de Campo', data: HISTORICAL_RESOURCES }
      ];

      let totalRecords = 0;
      const details: string[] = [];

      for (const t of tablesToSync) {
        if (t.data && t.data.length > 0) {
          const snakeData = toSnakeCase(t.data);
          const { error } = await supabase.from(t.name).upsert(snakeData);
          if (error) {
            console.warn(`Aviso al sincronizar tabla ${t.name}:`, error);
          } else {
            totalRecords += t.data.length;
            details.push(`${t.label}: ${t.data.length} registros`);
          }
        }
      }

      setSyncReport({
        success: true,
        message: `¡Sincronización histórica completada! Se almacenaron ${totalRecords} registros en Supabase (Ensayos de campo, socios, campos, parcelas y labores de la campaña anterior y actual).`,
        details
      });
    } catch (err: any) {
      setSyncReport({
        success: false,
        message: `Error durante la sincronización: ${err.message || 'Fallo de conexión'}`
      });
    } finally {
      setIsSyncingHistorical(false);
    }
  };

  const handleDownloadSql = async () => {
    try {
      const response = await fetch('/supabase_schema_and_seed.sql');
      let sqlText = '';
      if (response.ok) {
        sqlText = await response.text();
      }
      const blob = new Blob([sqlText], { type: 'text/sql' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'supabase_schema_and_seed.sql';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('Error al descargar el archivo SQL.');
    }
  };

  const handleCopySql = async () => {
    try {
      const response = await fetch('/supabase_schema_and_seed.sql');
      if (response.ok) {
        const sqlText = await response.text();
        await navigator.clipboard.writeText(sqlText);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3000);
      }
    } catch (e) {
      alert('Error al copiar el script.');
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
          <div className="space-y-8 animate-in slide-in-from-bottom-2">
              {/* CARD 1: CONEXIÓN CLOUD A SUPABASE */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                              <Cloud className="text-emerald-600" size={24} /> Conexión Supabase (PostgreSQL Cloud)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                              Almacenamiento persistente multi-dispositivo y base de datos relacional para ensayos y trazabilidad.
                          </p>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                              !sbUrl.includes('placeholder') && sbUrl
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                          }`}>
                              <span className={`w-2 h-2 rounded-full ${!sbUrl.includes('placeholder') && sbUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                              {!sbUrl.includes('placeholder') && sbUrl ? 'Conexión Configurada' : 'Modo Autónomo Local'}
                          </span>
                      </div>
                  </div>

                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 mb-6 text-xs text-emerald-900 dark:text-emerald-200">
                      <p className="font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Info size={14} className="text-emerald-600 dark:text-emerald-400" />
                          ¿Cómo conectar tu base de datos de Supabase?
                      </p>
                      <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-relaxed">
                          <li>Ingresa a tu consola en <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-emerald-700">supabase.com/dashboard</a> y entra a tu proyecto.</li>
                          <li>Ve a <strong>Settings (⚙️) &rarr; Data API</strong> (o pestaña <strong>API</strong>).</li>
                          <li>Copia la <strong>Project URL</strong> (ej: <code>https://xyzcompany.supabase.co</code>) y la <strong>anon public key</strong> (comienza con <code>eyJhbGci...</code>).</li>
                          <li>Pégalas en los campos de abajo y presiona <strong>Guardar &amp; Verificar Conexión</strong>.</li>
                          <li>Una vez conectada, presiona <strong>Sincronizar Ensayos &amp; Socios a Supabase</strong> para subir todas las tablas con un clic.</li>
                      </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Project URL</label>
                          <input
                              type="text"
                              placeholder="https://xyzcompany.supabase.co"
                              className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 p-3.5 rounded-xl text-xs font-mono font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                              value={sbUrl}
                              onChange={e => setSbUrl(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Anon Public Key</label>
                          <input
                              type="password"
                              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                              className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 p-3.5 rounded-xl text-xs font-mono font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                              value={sbKey}
                              onChange={e => setSbKey(e.target.value)}
                          />
                      </div>
                  </div>

                  {sbStatusMsg && (
                      <div className={`p-4 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2 ${
                          sbStatusMsg.type === 'success'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                          {sbStatusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                          <span>{sbStatusMsg.text}</span>
                      </div>
                  )}

                  <div className="flex justify-end">
                      <button
                          onClick={handleSaveSupabaseConfig}
                          disabled={isTestingSb}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-md disabled:opacity-50"
                      >
                          {isTestingSb ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Guardar & Verificar Conexión
                      </button>
                  </div>
              </div>

              {/* CARD 1B: ARQUITECTURA HÍBRIDA (VERCEL + RESEND.COM + SUPABASE | RENDER PYTHON PARA IOT/IA) */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                              <Cpu className="text-cyan-600" size={24} /> Arquitectura Híbrida: Vercel + Resend.com + Supabase &amp; Render Python (IoT/IA)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                              Despacho oficial en <strong>Vercel Serverless (/api/notifications/email) + Resend.com</strong> y persistencia relacional en <strong>Supabase</strong>, con <strong>Render Python</strong> dedicado exclusivamente a IoT, sensores LoRaWAN y cálculo ecofisiológico/IA.
                          </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                              hybridStatus?.resendConfigured
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}>
                              <Mail size={12} />
                              {hybridStatus?.resendConfigured ? 'Vercel + Resend.com Activo' : 'Verificar RESEND_API_KEY en Vercel'}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                              hybridStatus?.engineOnline
                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}>
                              <span className={`w-2 h-2 rounded-full ${hybridStatus?.engineOnline ? 'bg-cyan-500 animate-pulse' : 'bg-amber-500'}`}></span>
                              {hybridStatus?.engineOnline ? 'Render Python IoT/IA Online' : 'Render IoT Standby'}
                          </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 p-4 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">1. Vercel + Resend.com</span>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">notificaciones@hempc.com.ar</p>
                          <p className="text-[10px] text-slate-500 mt-1">Serverless HTTPS:443 • Clave protegida en Vercel</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 p-4 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">2. Supabase Cloud DB</span>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">vkfgxbsomxzirdezwrxz</p>
                          <p className="text-[10px] text-slate-500 mt-1">15 Tablas Relacionales • CRUD en Tiempo Real</p>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Destinatario de Prueba Oficial</label>
                          <input
                              type="email"
                              placeholder="correo@ejemplo.com"
                              className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 p-3.5 rounded-xl text-xs font-mono font-bold dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                              value={testEmailTarget}
                              onChange={e => setTestEmailTarget(e.target.value)}
                          />
                      </div>
                  </div>

                  {hybridMsg && (
                      <div className={`p-4 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2 ${
                          hybridMsg.type === 'success'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                          {hybridMsg.type === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
                          <span>{hybridMsg.text}</span>
                      </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Endpoint activo en Vercel: <code className="font-mono font-bold text-emerald-600 dark:text-emerald-400">/api/notifications/email</code> • Motor IoT/IA: <code className="font-mono">hempapp.onrender.com</code>
                      </p>
                      <button
                          onClick={async () => {
                              setIsTestingHybrid(true);
                              setHybridMsg(null);
                              try {
                                  const res = await sendTestNotificationEmail(testEmailTarget || 'xpatagonia.com@gmail.com', currentUser?.name || 'Master Admin');
                                  const st = await checkEmailServiceStatus();
                                  setHybridStatus({
                                      engineOnline: st.engineOnline,
                                      resendConfigured: st.resendConfigured,
                                      supabaseConfigured: st.supabaseConfigured,
                                      provider: st.provider,
                                      host: st.host,
                                      engineUrl: st.engineUrl
                                  });
                                  setHybridMsg({
                                      type: res.deliveredVia === 'vercel_resend' || res.deliveredVia === 'resend_https' ? 'success' : 'info',
                                      text: `${res.message} (Vía: ${res.deliveredVia.toUpperCase()})`
                                  });
                              } catch (err: any) {
                                  setHybridMsg({ type: 'error', text: err.message || 'Error al probar el despacho en Vercel + Resend' });
                              } finally {
                                  setIsTestingHybrid(false);
                              }
                          }}
                          disabled={isTestingHybrid}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                      >
                          {isTestingHybrid ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          Probar Envío Oficial (Vercel + Resend.com)
                      </button>
                  </div>
              </div>

              {/* CARD 2: POBLAR Y SINCRONIZAR ENSAYOS DE CAMPAÑA ANTERIOR Y ACTUAL */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="mb-6">
                      <div className="flex items-center gap-2 mb-1">
                          <Sprout className="text-hemp-600" size={24} />
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                              Almacenar Ensayos de Campo & Socios en Supabase
                          </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          Sube e impacta directamente en las tablas de tu proyecto Supabase la base de datos de los ensayos de campo, 
                          socios productores (Pergamino, Córdoba, IDEVI Patagonia), campos y sitios con sus parcelas y monitoreo fenológico.
                      </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                          <p className="text-2xl font-black text-hemp-600">{HISTORICAL_LOCATIONS.length}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Establecimientos</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                          <p className="text-2xl font-black text-emerald-600">{HISTORICAL_PLOTS.length}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parcelas Ensayo</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                          <p className="text-2xl font-black text-blue-600">{HISTORICAL_CLIENTS.length}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Socios de Red</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                          <p className="text-2xl font-black text-purple-600">{HISTORICAL_PROJECTS.length}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campañas</p>
                      </div>
                  </div>

                  {syncReport && (
                      <div className={`p-5 rounded-2xl text-xs mb-6 ${
                          syncReport.success
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                          <p className="font-bold flex items-center gap-2 mb-2">
                              {syncReport.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                              {syncReport.message}
                          </p>
                          {syncReport.details && syncReport.details.length > 0 && (
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 text-[11px] opacity-90 pl-6 list-disc">
                                  {syncReport.details.map((d, i) => (
                                      <li key={i}>{d}</li>
                                  ))}
                              </ul>
                          )}
                      </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                      <button
                          onClick={handleSyncHistoricalToSupabase}
                          disabled={isSyncingHistorical}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                      >
                          {isSyncingHistorical ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                          Sincronizar Ensayos & Socios a Supabase
                      </button>

                      <button
                          onClick={handleDownloadSql}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 cursor-pointer"
                      >
                          <DownloadCloud size={16} /> Descargar SQL Completo
                      </button>

                      <button
                          onClick={handleCopySql}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 cursor-pointer"
                      >
                          {copiedSql ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          {copiedSql ? '¡SQL Copiado!' : 'Copiar SQL para Supabase Editor'}
                      </button>
                  </div>
              </div>

              {/* CARD 3: SNAPSHOT COMPLETO JSON */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden text-white border border-slate-700">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-3 bg-blue-500/20 rounded-xl"><Archive size={24} className="text-blue-400"/></div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter italic">Snapshot de Seguridad JSON</h3>
                          </div>
                          <p className="text-sm text-slate-400 font-medium max-w-md leading-relaxed">
                              Exporta toda la base de datos de la plataforma en un archivo JSON local como respaldo de seguridad.
                          </p>
                      </div>
                      <button onClick={handleFullBackup} disabled={isBackingUp} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center transition-all disabled:opacity-50 cursor-pointer">
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
