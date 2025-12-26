
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog, HydricRecord, SeedBatch } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download, Scale, Wind, Bird, CheckCircle2,
  RefreshCw, Globe, Layers, Save, Thermometer, Droplets, Waves, QrCode, Printer, Loader2, Zap, Sparkles, Link as LinkIcon, Sun,
  TrendingUp, ArrowUpRight, Beaker, FileUp
} from 'lucide-react';
import MapEditor from '../components/MapEditor';
import WeatherWidget from '../components/WeatherWidget';
import HydricBalance from '../components/HydricBalance';

const KPI = ({ label, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-[32px] shadow-sm flex items-start space-x-4 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
            {Icon ? <Icon size={24} /> : <Activity size={24} />}
        </div>
        <div className="flex-1 z-10">
            <p className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-gray-800 dark:text-white leading-none">{value}</p>
            {subtext && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-bold">{subtext}</p>}
        </div>
        <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full ${color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
    </div>
);

const CycleGraph = ({ sowingDate, cycleDays }: { sowingDate: string, cycleDays: number }) => {
    if (!sowingDate || !cycleDays) return null;
    const start = new Date(sowingDate).getTime();
    const end = start + (cycleDays * 24 * 60 * 60 * 1000);
    const now = new Date().getTime();
    let progress = now > start ? ((now - start) / (end - start)) * 100 : 0;
    if (progress > 100) progress = 100;
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-gray-200 dark:border-slate-800 mb-8 relative overflow-hidden">
            <div className="flex justify-between items-end mb-4 relative z-10">
                <div><h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Ciclo Biológico</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Evolución fisiológica del ensayo</p></div>
                <div className="text-right"><span className="text-3xl font-black text-hemp-600">{Math.round(progress)}%</span></div>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-slate-950 rounded-full w-full relative mb-6 mt-4 overflow-hidden shadow-inner border dark:border-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-hemp-400 to-hemp-600 shadow-lg" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest">
                <div>Siembra: {new Date(sowingDate).toLocaleDateString()}</div>
                <div className="text-right text-amber-600">Cosecha Est: {new Date(end).toLocaleDateString()} ({daysLeft}d restantes)</div>
            </div>
        </div>
    );
};

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog, deleteLog, hydricRecords, updatePlot } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  
  const history = getPlotHistory(id || '');
  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs, id]);
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs' | 'water'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoRain, setAutoRain] = useState(0);

  // --- PERMISOS ---
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isOwner = currentUser?.role === 'client' && location?.clientId === currentUser?.clientId;
  const isAssignedTech = currentUser?.role === 'technician' && plot?.responsibleIds?.includes(currentUser.id);
  
  // Condición extendida: Todos los perfiles autorizados (Admin, Tech, Socio) pueden usar la bitácora
  const canWriteLog = !!currentUser; 
  const canEditTechnical = isAdmin || isOwner || isAssignedTech;

  const agronomyStats = useMemo(() => {
      if (history.length === 0) return { avgGrowth: 0, totalGdd: 0, currentPhase: 'Emergencia' };
      const TBASE = 10;
      let totalGdd = 0;
      history.forEach(r => { if (r.temperature && r.temperature > TBASE) totalGdd += (r.temperature - TBASE); });
      let lastGrowth = 0;
      if (history.length >= 2) {
          const newest = history[0];
          const previous = history[1];
          const diffCm = (newest.plantHeight || 0) - (previous.plantHeight || 0);
          const diffDays = Math.max(1, (new Date(newest.date).getTime() - new Date(previous.date).getTime()) / 86400000);
          lastGrowth = diffCm / diffDays;
      }
      return { avgGrowth: lastGrowth.toFixed(2), totalGdd: Math.round(totalGdd), currentPhase: history[0].stage };
  }, [history]);

  const chartData = useMemo(() => {
      return [...history].reverse().map(r => ({
          fecha: r.date,
          altura: r.plantHeight || 0,
          temp: r.temperature || 0,
          hum: r.humidity || 0
      }));
  }, [history]);

  useEffect(() => {
    const fetchPlotAutoRain = async () => {
        if (!plot?.sowingDate || !location?.coordinates) return;
        try {
            const startStr = plot.sowingDate;
            const end = new Date();
            end.setDate(end.getDate() - 1);
            const endStr = end.toISOString().split('T')[0];
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&daily=precipitation_sum&start_date=${startStr}&end_date=${endStr}&timezone=auto`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.daily?.precipitation_sum) {
                const sum = data.daily.precipitation_sum.reduce((a: number, b: number) => a + (b || 0), 0);
                setAutoRain(Number(sum.toFixed(1)));
            }
        } catch (e) { console.error("Error rain fetch:", e); }
    };
    fetchPlotAutoRain();
  }, [plot, location]);

  const waterMetrics = useMemo(() => {
    const manualOfPlot = hydricRecords.filter(h => h.plotId === id || (!h.plotId && h.locationId === plot?.locationId));
    const totalManual = manualOfPlot.reduce((s, r) => s + r.amountMm, 0);
    const totalMm = autoRain + totalManual; 
    return { totalMm, satellite: autoRain, manual: totalManual };
  }, [hydricRecords, id, plot, autoRain]);

  // Form States
  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({ 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    stage: 'Vegetativo' as any, temperature: 0, humidity: 0, plantHeight: 0, plantsPerMeter: 0, lightHours: 18 
  });

  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
  const [selectedBatchId, setSelectedBatchId] = useState(plot?.seedBatchId || '');

  if (!plot) return <div className="p-10 text-center">Parcela no encontrada.</div>;

  const handleSaveRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const payload: any = { 
        ...recordForm, plotId: plot.id, createdBy: currentUser?.id, createdByName: currentUser?.name
      };
      try {
          if (editingRecordId) await updateTrialRecord({ ...payload, id: editingRecordId });
          else await addTrialRecord({ ...payload, id: crypto.randomUUID() });
          setIsRecordModalOpen(false);
      } finally { setIsSaving(false); }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogForm(prev => ({ ...prev, photoUrl: reader.result as string }));
              setIsUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if ((!logForm.note && !logForm.photoUrl) || isSaving) return;
      setIsSaving(true);
      const payload = { 
        id: crypto.randomUUID(), plotId: plot.id, date: logForm.date || new Date().toISOString().split('T')[0], time: logForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        note: `[REGISTRO: ${currentUser?.name}] ${logForm.note || ''}`.trim(), photoUrl: logForm.photoUrl || ''
      } as FieldLog;
      try {
          const success = await addLog(payload);
          if (success) {
              setIsLogModalOpen(false);
              setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
          }
      } finally { setIsSaving(false); }
  };

  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";
  const inputStyle = "w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm dark:text-white";

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-400 font-black hover:text-gray-800 transition uppercase text-[10px] tracking-widest group">
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Listado Global
        </Link>
        <button onClick={() => setIsQrModalOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl text-slate-500 hover:text-hemp-600 shadow-sm transition-all flex items-center gap-2 px-6 text-xs font-black uppercase tracking-widest">
            <QrCode size={18}/> Etiqueta QR
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 p-10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
              <div>
                  <div className="flex items-center space-x-2 mb-2">
                      <Tag size={12} className="text-hemp-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{plot.type}</span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 italic uppercase tracking-tighter leading-none">{plot.name}</h1>
                  <div className="flex flex-wrap gap-6">
                    <p className="text-gray-500 flex items-center text-sm font-bold"><MapPin size={18} className="mr-2 text-blue-500 opacity-60"/> {location?.name}</p>
                    <p className="text-gray-500 flex items-center text-sm font-bold"><Sprout size={18} className="mr-2 text-hemp-600 opacity-60"/> {variety?.name}</p>
                  </div>
              </div>
              <div className={`px-6 py-2 rounded-2xl text-xs font-black uppercase border tracking-widest flex items-center shadow-sm ${plot.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {plot.status === 'Activa' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>}
                  {plot.status}
              </div>
          </div>
          <CycleGraph sowingDate={plot.sowingDate} cycleDays={variety?.cycleDays || 120} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <KPI label="Huella Hídrica" value={`${waterMetrics.totalMm.toFixed(1)} mm`} icon={Waves} color="bg-blue-100" />
              <KPI label="Acumulación Térmica" value={`${agronomyStats.totalGdd} GDD`} icon={Thermometer} color="bg-orange-100" />
              <KPI label="Crecimiento Act." value={`${agronomyStats.avgGrowth} cm/d`} icon={TrendingUp} color="bg-emerald-100" subtext={`Fase: ${agronomyStats.currentPhase}`} />
              <KPI label="Días Ciclo" value={Math.floor((Date.now() - new Date(plot.sowingDate).getTime()) / 86400000)} icon={Clock} color="bg-blue-100" />
          </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border dark:border-slate-800 shadow-sm w-fit overflow-x-auto">
          <button onClick={() => setActiveTab('records')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo Fenológico</button>
          <button onClick={() => setActiveTab('logs')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-slate-800 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Multimedia</button>
          <button onClick={() => setActiveTab('water')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'water' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Pluviómetro & Huella</button>
      </div>

      <div className="grid grid-cols-1 gap-8">
          {activeTab === 'records' && (
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden animate-in fade-in">
                <div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                    <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.3em] flex items-center"><Activity size={18} className="mr-3 text-hemp-600"/> Registro Técnico</h2>
                    {canEditTechnical && <button onClick={() => { setIsRecordModalOpen(true); setIsViewMode(false); setEditingRecordId(null); setRecordForm({ date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), stage: 'Vegetativo' }); }} className="bg-hemp-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition">Nuevo Monitoreo</button>}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50/50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest"><tr><th className="px-10 py-5">Fecha</th><th className="px-10 py-5">Etapa</th><th className="px-10 py-5 text-center">Altura</th><th className="px-10 py-5 text-center">Clima</th><th className="px-10 py-5 text-right">Detalle</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold uppercase text-[11px]">{history.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                <td className="px-10 py-6 font-black text-gray-800 dark:text-white tracking-tighter">{r.date}</td>
                                <td className="px-10 py-6"><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30">{r.stage}</span></td>
                                <td className="px-10 py-6 text-center font-black text-gray-900 dark:text-white">{r.plantHeight} cm</td>
                                <td className="px-10 py-6 text-center text-[10px] text-slate-500">{r.temperature}°C / {r.humidity}% HR</td>
                                <td className="px-10 py-6 text-right"><Eye size={18} className="text-gray-300 ml-auto transition"/></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border dark:border-slate-800 shadow-sm animate-in fade-in">
                <div className="flex justify-between items-center mb-10">
                    <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.4em] flex items-center">
                        <MessageSquare size={18} className="mr-3 text-blue-500"/> Bitácora Digital Multimedia
                    </h2>
                    {canWriteLog && (
                        <button onClick={() => { setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' }); setIsLogModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition flex items-center">
                            <Camera size={16} className="mr-2"/> Captura de Lote
                        </button>
                    )}
                </div>
                <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">
                    {plotLogs.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 italic bg-gray-50 dark:bg-slate-950 rounded-[32px] border border-dashed dark:border-slate-800">No hay entradas en la bitácora.</div>
                    ) : plotLogs.map(log => (
                        <div key={log.id} className="relative flex items-start group">
                            <div className="absolute left-0 w-10 h-10 bg-white dark:bg-slate-800 border-4 border-blue-50 dark:border-slate-700 rounded-full flex items-center justify-center z-10 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div></div>
                            <div className="ml-16 flex-1 bg-gray-50/50 dark:bg-slate-950/50 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 hover:border-blue-200 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <div className="flex items-center"><Calendar size={12} className="text-blue-500 mr-2"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date} - {log.time} hs</span></div>
                                    </div>
                                    {isAdmin && <button onClick={() => window.confirm("¿Borrar?") && deleteLog(log.id)} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-bold mb-6">{log.note}</p>
                                {log.photoUrl && <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700 max-w-sm cursor-zoom-in" onClick={() => setPreviewPhoto(log.photoUrl!)}><img src={log.photoUrl} className="w-full h-auto" /></div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {activeTab === 'water' && <HydricBalance locationId={plot.locationId} plotId={plot.id} startDate={plot.sowingDate} />}
      </div>

      {/* MODAL BITÁCORA */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-2xl w-full p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Camera size={24}/></div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Nueva <span className="text-blue-600">Observación</span></h2>
                </div>
                <button onClick={() => setIsLogModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={28}/></button>
            </div>
            <form onSubmit={handleSaveLog} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Fecha</label><input type="date" required className={inputStyle} value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} /></div>
                    <div><label className={labelClass}>Hora</label><input type="time" required className={inputStyle} value={logForm.time} onChange={e => setLogForm({...logForm, time: e.target.value})} /></div>
                </div>
                <div>
                    <label className={labelClass}>Nota de Campo</label>
                    <textarea required className={`${inputStyle} h-32 resize-none`} value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})} placeholder="Describa el estado visual, plagas detectadas, etc..."></textarea>
                </div>
                <div className="space-y-3">
                    <label className={labelClass}>Imagen del Lote</label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-6 bg-gray-50 dark:bg-slate-950 hover:border-blue-400 transition-all group relative overflow-hidden min-h-[160px]">
                        {logForm.photoUrl ? (
                            <div className="absolute inset-0 group">
                                <img src={logForm.photoUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <button type="button" onClick={() => setLogForm({...logForm, photoUrl: ''})} className="bg-red-500 text-white p-3 rounded-full shadow-lg"><X size={20}/></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Camera size={32} className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Abrir Cámara o Galería</p>
                                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} />
                            </>
                        )}
                        {isUploading && <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>}
                    </div>
                </div>
                <button type="submit" disabled={isSaving || isUploading} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Registrar en Bitácora
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MONITORING */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Activity size={24}/></div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Monitoreo <span className="text-hemp-600">Fenológico</span></h2>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={28}/></button>
            </div>
            <form onSubmit={handleSaveRecord} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div><label className={labelClass}>Fecha</label><input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})} /></div>
                        <div><label className={labelClass}>Hora</label><input type="time" required disabled={isViewMode} className={inputStyle} value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})} /></div>
                        <div><label className={labelClass}>Etapa Fenológica</label><select required disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Altura (cm)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Temp. Ambiente (°C)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.temperature} onChange={e => setRecordForm({...recordForm, temperature: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Humedad (%)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.humidity} onChange={e => setRecordForm({...recordForm, humidity: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Fotoperiodo (horas)</label><input type="number" step="0.5" disabled={isViewMode} className={inputStyle} value={recordForm.lightHours} onChange={e => setRecordForm({...recordForm, lightHours: Number(e.target.value)})} /></div>
                    </div>
                </div>
                {!isViewMode && <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">{isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Guardar Monitoreo</button>}
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW */}
      {previewPhoto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
              <img src={previewPhoto} className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain animate-in zoom-in-90" />
          </div>
      )}
    </div>
  );
}
