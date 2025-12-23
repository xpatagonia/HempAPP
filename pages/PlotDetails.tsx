
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog, HydricRecord, SeedBatch } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download, Scale, Wind, Bird, CheckCircle2,
  RefreshCw, Globe, Layers, Save, Thermometer, Droplets, Waves, QrCode, Printer, Loader2, Zap, Sparkles, Link as LinkIcon
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
  const canEdit = isAdmin || isOwner || isAssignedTech;

  // --- HUELLA HÍDRICA LOGIC ---
  useEffect(() => {
    const fetchPlotAutoRain = async () => {
        if (!plot?.sowingDate || !location?.coordinates) return;
        try {
            const startStr = plot.sowingDate;
            const end = new Date();
            end.setDate(end.getDate() - 1);
            const endStr = end.toISOString().split('T')[0];
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&start_date=${startStr}&end_date=${endStr}&daily=precipitation_sum&timezone=auto`;
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
    const areaHa = plot?.surfaceArea || 1;
    const totalLiters = totalMm * 10000 * areaHa;
    const latestYield = history.length > 0 ? history[0].yield : 0;
    const totalProductionKg = (latestYield || 800) * areaHa;
    return { totalMm, footprint: totalProductionKg > 0 ? Math.round(totalLiters / totalProductionKg) : 0, satellite: autoRain, manual: totalManual };
  }, [hydricRecords, id, plot, history, autoRain]);

  // Form States
  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({ 
    date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    stage: 'Vegetativo' as any, temperature: 0, humidity: 0, plantHeight: 0, plantsPerMeter: 0, replicate: 1, uniformity: 100, vigor: 100, lodging: 0, birdDamage: 0, yield: 0, stemWeight: 0, leafWeight: 0, freshWeight: 0
  });

  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
  const [selectedBatchId, setSelectedBatchId] = useState(plot?.seedBatchId || '');

  if (!plot) return <div className="p-10 text-center">Parcela no encontrada.</div>;

  const handleSaveRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const payload: any = { 
        ...recordForm, plotId: plot.id, createdBy: currentUser?.id, createdByName: currentUser?.name,
        temperature: Number(recordForm.temperature || 0), humidity: Number(recordForm.humidity || 0), plantHeight: Number(recordForm.plantHeight || 0), plantsPerMeter: Number(recordForm.plantsPerMeter || 0), uniformity: Number(recordForm.uniformity || 100), vigor: Number(recordForm.vigor || 100), lodging: Number(recordForm.lodging || 0), birdDamage: Number(recordForm.birdDamage || 0), yield: Number(recordForm.yield || 0), stemWeight: Number(recordForm.stemWeight || 0), leafWeight: Number(recordForm.leafWeight || 0), freshWeight: Number(recordForm.freshWeight || 0),
      };
      try {
          let success = false;
          if (editingRecordId) success = await updateTrialRecord({ ...payload, id: editingRecordId });
          else success = await addTrialRecord({ ...payload, id: Date.now().toString() });
          if (success) setIsRecordModalOpen(false);
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
        id: Date.now().toString(), plotId: plot.id, date: logForm.date || new Date().toISOString().split('T')[0], time: logForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        note: (logForm.note || '').trim(), photoUrl: logForm.photoUrl || ''
      } as FieldLog;
      try {
          const success = await addLog(payload);
          if (success) {
              setIsLogModalOpen(false);
              setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
          }
      } finally { setIsSaving(false); }
  };

  const handleUpdateBatchLink = async () => {
      if (isSaving) return;
      setIsSaving(true);
      const success = await updatePlot({ ...plot, seedBatchId: selectedBatchId });
      if (success) setIsBatchModalOpen(false);
      setIsSaving(false);
  };

  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";
  const inputStyle = "w-full border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm dark:text-white";

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
              <KPI label="Huella Hídrica" value={waterMetrics.footprint > 0 ? `${waterMetrics.footprint} L/kg` : 'CALCULANDO'} icon={Waves} color="bg-blue-100" subtext={`${waterMetrics.totalMm.toFixed(1)} mm acumulados`} />
              <KPI label="Superficie" value={`${plot.surfaceArea} ${plot.surfaceUnit}`} icon={Map} color="bg-purple-100" />
              <KPI label="Densidad" value={plot.density} subtext="pl/m²" icon={Sprout} color="bg-emerald-100" />
              <KPI label="Días Ciclo" value={Math.floor((Date.now() - new Date(plot.sowingDate).getTime()) / 86400000)} icon={Clock} color="bg-blue-100" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden relative">
                  <div className="px-8 py-6 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center"><ShieldCheck size={18} className="mr-2 text-hemp-600"/><h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">Certificación Lote</h3></div>
                      {canEdit && <button onClick={() => { setSelectedBatchId(plot.seedBatchId || ''); setIsBatchModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 transition"><Edit2 size={16}/></button>}
                  </div>
                  <div className="p-8 space-y-6">
                      {seedBatch ? (
                          <div className="space-y-4">
                              <div className="bg-gradient-to-br from-hemp-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl border border-hemp-100 dark:border-slate-700 text-center shadow-inner relative group">
                                  <p className="text-[10px] font-black text-hemp-600 uppercase mb-2 tracking-widest">Lote Maestro</p>
                                  <p className="text-2xl font-black text-hemp-900 dark:text-hemp-400 font-mono tracking-tighter">{seedBatch.batchCode}</p>
                              </div>
                              <div className="space-y-4 text-xs">
                                <div className="flex justify-between border-b border-dashed dark:border-slate-800 pb-3 font-bold text-gray-500 uppercase tracking-widest"><span>PG Declarado:</span><span className="text-gray-800 dark:text-white">{seedBatch.germination}%</span></div>
                                <div className="flex justify-between border-b border-dashed dark:border-slate-800 pb-3 font-bold text-gray-500 uppercase tracking-widest"><span>Etiqueta:</span><span className="text-gray-800 dark:text-white font-mono">{seedBatch.labelSerialNumber || '-'}</span></div>
                                <div className="flex justify-between font-bold text-gray-500 uppercase tracking-widest"><span>Variedad:</span><span className="text-hemp-600 italic">{variety?.name}</span></div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-10">
                              <AlertCircle size={32} className="mx-auto text-amber-500 mb-4 opacity-50"/>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">Sin lote master vinculado.</p>
                              {canEdit && <button onClick={() => setIsBatchModalOpen(true)} className="mt-4 text-[10px] font-black uppercase text-hemp-600 hover:underline">Vincular Ahora →</button>}
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                  <div className="px-8 py-6 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800 flex items-center justify-between"><div className="flex items-center"><Globe size={18} className="mr-2 text-blue-600"/><h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">GPS Parcela</h3></div></div>
                  <div className="h-64 relative group bg-slate-100">
                      {plot.polygon && plot.polygon.length > 2 ? <MapEditor initialCenter={plot.coordinates} initialPolygon={plot.polygon} readOnly={true} height="100%" /> : <div className="h-full flex items-center justify-center text-gray-400 italic text-[10px] uppercase font-black tracking-widest"><Map size={32} className="opacity-30 mr-2"/> Sin polígono</div>}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
              <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border dark:border-slate-800 shadow-sm w-fit overflow-x-auto">
                  <button onClick={() => setActiveTab('records')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo Fenológico</button>
                  <button onClick={() => setActiveTab('water')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'water' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Pluviómetro & Huella</button>
                  <button onClick={() => setActiveTab('logs')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-slate-800 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Multimedia</button>
              </div>

              {activeTab === 'records' && (
                <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden animate-in fade-in">
                    <div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50"><h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.3em] flex items-center"><Activity size={18} className="mr-3 text-hemp-600"/> Historial de Medición</h2>{canEdit && <button onClick={() => { setIsRecordModalOpen(true); setIsViewMode(false); setEditingRecordId(null); setRecordForm({ date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), stage: 'Vegetativo' }); }} className="bg-hemp-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition">Nuevo Registro</button>}</div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest"><tr><th className="px-10 py-5">Fecha/Hora</th><th className="px-10 py-5">Etapa</th><th className="px-10 py-5 text-center">Altura</th><th className="px-10 py-5 text-right">Detalle</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold uppercase text-[11px]">{history.length === 0 ? ( <tr><td colSpan={5} className="p-12 text-center text-gray-300 italic font-medium">No hay monitoreos registrados.</td></tr> ) : history.map(r => ( <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer group" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}><td className="px-10 py-6 font-black text-gray-800 dark:text-white tracking-tighter">{r.date} <span className="block text-[9px] text-slate-400 font-bold tracking-widest">{r.time || '--:--'} hs</span></td><td className="px-10 py-6"><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30">{r.stage}</span></td><td className="px-10 py-6 font-black text-gray-900 dark:text-white text-center">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td><td className="px-10 py-6 text-right"><Eye size={18} className="text-gray-300 group-hover:text-hemp-600 ml-auto transition"/></td></tr> ))}</tbody>
                        </table>
                    </div>
                </div>
              )}

              {activeTab === 'water' && (
                <div className="animate-in fade-in space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border dark:border-slate-800 shadow-sm relative overflow-hidden">
                         <div className="flex items-center space-x-3 mb-8 relative z-10">
                             <Sparkles className="text-blue-500" size={24}/>
                             <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Balance de <span className="text-blue-600">Huella Hídrica</span></h3>
                         </div>
                         <HydricBalance locationId={plot.locationId} plotId={plot.id} startDate={plot.sowingDate} />
                    </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-10"><h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.4em] flex items-center"><MessageSquare size={18} className="mr-3 text-blue-500"/> Bitácora Digital Multimedia</h2><button onClick={() => { setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' }); setIsLogModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition flex items-center"><Camera size={16} className="mr-2"/> Captura de Lote</button></div>
                        <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">{plotLogs.length === 0 ? <div className="text-center py-20 text-gray-400 italic bg-gray-50 dark:bg-slate-950 rounded-[32px] border border-dashed dark:border-slate-800">Sin entradas en la línea de tiempo.</div> : plotLogs.map(log => ( <div key={log.id} className="relative flex items-start group"><div className="absolute left-0 w-10 h-10 bg-white dark:bg-slate-800 border-4 border-blue-50 dark:border-slate-700 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div></div><div className="ml-16 flex-1 bg-gray-50/50 dark:bg-slate-950/50 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 hover:border-blue-200 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"><div className="flex justify-between items-start mb-6"><div className="flex flex-col"><div className="flex items-center"><Calendar size={12} className="text-blue-500 mr-2"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date}</span></div><div className="flex items-center mt-1 opacity-60"><Clock size={10} className="text-gray-400 mr-2"/><span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{log.time || '--:--'} hs</span></div></div>{isAdmin && <button onClick={() => window.confirm("¿Borrar?") && deleteLog(log.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-xl transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}</div><p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-bold mb-6">{log.note}</p>{log.photoUrl && <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700 max-w-sm cursor-zoom-in shadow-lg" onClick={() => setPreviewPhoto(log.photoUrl!)}><img src={log.photoUrl} className="w-full h-auto object-cover" /></div>}</div></div> ))}</div>
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* MODAL EDITAR LOTE MAESTRO */}
      {isBatchModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 border border-white/10">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-black dark:text-white uppercase italic tracking-tighter">Vincular <span className="text-hemp-600">Lote Maestro</span></h2>
                      <button onClick={() => setIsBatchModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X size={28}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800">
                          <label className={labelClass}>Lote de Semilla Certificado</label>
                          <select className={inputStyle} value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                              <option value="">-- Autoproducción / Sin lote --</option>
                              {seedBatches.filter(b => b.varietyId === plot.varietyId).map(b => (
                                  <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity} kg disp.)</option>
                              ))}
                          </select>
                          <p className="text-[9px] text-slate-400 mt-3 italic font-bold uppercase tracking-widest">* Solo se muestran lotes de variedad {variety?.name}</p>
                      </div>
                      <button onClick={handleUpdateBatchLink} disabled={isSaving} className="w-full bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                          {isSaving ? <Loader2 className="animate-spin mr-2"/> : <LinkIcon className="mr-2" size={16}/>}
                          Actualizar Trazabilidad
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL RECORD (TECHNICAL MONITORING) */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
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
                        <h4 className={labelClass}>Temporalidad y Etapa</h4>
                        <input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})} />
                        <input type="time" required disabled={isViewMode} className={inputStyle} value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})} />
                        <select required disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}>
                            <option value="Vegetativo">Estado Vegetativo</option>
                            <option value="Floración">Inicio Floración</option>
                            <option value="Maduración">Llenado / Maduración</option>
                            <option value="Cosecha">Cosecha / Final</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800">
                        <div><label className={labelClass}>Altura (cm)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Vigor (1-100)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.vigor} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Rinde Est. (kg/ha)</label><input type="number" step="1" disabled={isViewMode} className={`${inputStyle} border-blue-200 bg-blue-50 dark:bg-blue-900/10`} value={recordForm.yield} onChange={e => setRecordForm({...recordForm, yield: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Uniformidad (%)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.uniformity} onChange={e => setRecordForm({...recordForm, uniformity: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Vuelco / Acame (%)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.lodging} onChange={e => setRecordForm({...recordForm, lodging: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Daño Aves (%)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.birdDamage} onChange={e => setRecordForm({...recordForm, birdDamage: Number(e.target.value)})} /></div>
                    </div>
                </div>
                <div className="flex justify-end pt-8 border-t dark:border-slate-800">
                    {!isViewMode ? (
                        <button type="submit" disabled={isSaving} className="bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-[1.02] transition-all">
                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Guardar Auditoría
                        </button>
                    ) : (
                        <button type="button" onClick={() => setIsViewMode(false)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-[1.02] transition-all"><Edit2 className="mr-2" size={16}/> Habilitar Edición</button>
                    )}
                </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG MODAL (MULTIMEDIA LOG) */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-lg w-full p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">Nota <span className="text-blue-600">Multimedia</span></h2>
                <button onClick={() => !isSaving && setIsLogModalOpen(false)} className="p-2 text-slate-400"><X size={28}/></button>
            </div>
            <form onSubmit={handleSaveLog} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Fecha</label><input type="date" className={inputStyle} value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} /></div>
                    <div><label className={labelClass}>Hora</label><input type="time" className={inputStyle} value={logForm.time} onChange={e => setLogForm({...logForm, time: e.target.value})} /></div>
                </div>
                <div><label className={labelClass}>Descripción de la Observación *</label><textarea required className={`${inputStyle} h-32`} value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})} placeholder="Detalle lo observado en el lote..."></textarea></div>
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-dashed dark:border-slate-800 text-center relative group">
                    {logForm.photoUrl ? (
                        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white max-h-48">
                            <img src={logForm.photoUrl} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setLogForm({...logForm, photoUrl: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md"><X size={16}/></button>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center py-6">
                            {isUploading ? <Loader2 className="animate-spin text-blue-500 mb-2" size={32}/> : <Camera size={40} className="text-slate-300 group-hover:text-blue-500 transition-colors mb-2"/>}
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isUploading ? 'Procesando...' : 'Capturar o Subir Foto'}</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                    )}
                </div>
                <button type="submit" disabled={isSaving || isUploading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Publicar en Bitácora
                </button>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW */}
      {previewPhoto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
              <img src={previewPhoto} className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain animate-in zoom-in-90" />
          </div>
      )}
    </div>
  );
}
