
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download, Scale, Wind, Bird, CheckCircle2,
  RefreshCw, Globe, Layers, Save, Thermometer, Droplets, Waves, QrCode, Printer, Loader2
} from 'lucide-react';
import MapEditor from '../components/MapEditor';
import WeatherWidget from '../components/WeatherWidget';
import HydricBalance from '../components/HydricBalance';

const KPI = ({ label, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-start space-x-4 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
            {Icon ? <Icon size={24} /> : <Activity size={24} />}
        </div>
        <div className="flex-1 z-10">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl font-black text-gray-800 leading-none">{value}</p>
            {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 relative overflow-hidden">
            <div className="flex justify-between items-end mb-2 relative z-10">
                <div><h3 className="text-lg font-bold text-gray-800">Ciclo de Cultivo</h3><p className="text-sm text-gray-500 font-medium">Progreso biológico estimado.</p></div>
                <div className="text-right"><span className="text-2xl font-black text-hemp-600">{Math.round(progress)}%</span></div>
            </div>
            <div className="h-4 bg-gray-100 rounded-full w-full relative mb-8 mt-4 overflow-hidden shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-hemp-400 to-hemp-600 shadow-lg" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-tighter">
                <div>Siembra: {new Date(sowingDate).toLocaleDateString()}</div>
                <div className="text-right text-amber-600">Cosecha Est: {new Date(end).toLocaleDateString()} ({daysLeft}d restantes)</div>
            </div>
        </div>
    );
};

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog, deleteLog, updatePlot } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  
  const history = getPlotHistory(id || '');
  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs, id]);
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs' | 'water'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  
  const [tempPolygon, setTempPolygon] = useState<{lat: number, lng: number}[]>(plot?.polygon || []);
  const [tempArea, setTempArea] = useState(plot?.surfaceArea || 0);
  const [tempCoords, setTempCoords] = useState(plot?.coordinates);

  const getDefaultRecordValues = () => ({ 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    stage: 'Vegetativo' as any, 
    temperature: 0,
    humidity: 0,
    plantHeight: 0,
    plantsPerMeter: 0,
    replicate: plot?.replicate || 1,
    uniformity: 100,
    vigor: 100,
    lodging: 0,
    birdDamage: 0,
    yield: 0,
    stemWeight: 0,
    leafWeight: 0,
    freshWeight: 0,
    emergenceDate: '',
    floweringDate: '',
    harvestDate: '',
    diseases: '',
    pests: ''
  });

  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>(getDefaultRecordValues());
  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canEdit = isAdmin || (currentUser?.role === 'technician' && plot?.responsibleIds?.includes(currentUser.id));
  
  if (!plot) return <div className="p-10 text-center">Parcela no encontrada.</div>;

  const captureLiveWeather = async () => {
      const coords = plot.coordinates || location?.coordinates;
      if (!coords) return;
      setIsWeatherLoading(true);
      try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m`);
          const data = await res.json();
          if (data.current) {
              setRecordForm(prev => ({
                  ...prev,
                  temperature: Math.round(data.current.temperature_2m),
                  humidity: Math.round(data.current.relative_humidity_2m)
              }));
          }
      } catch (e) { console.error(e); } finally { setIsWeatherLoading(false); }
  };

  const handleOpenNewRecord = () => {
      setEditingRecordId(null);
      setIsViewMode(false);
      setRecordForm(getDefaultRecordValues());
      setIsRecordModalOpen(true);
      captureLiveWeather();
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const payload: any = { 
        ...recordForm, 
        plotId: plot.id, 
        createdBy: currentUser?.id, 
        createdByName: currentUser?.name,
        // Aseguramos conversión a números para evitar fallos de Supabase
        temperature: Number(recordForm.temperature || 0),
        humidity: Number(recordForm.humidity || 0),
        plantHeight: Number(recordForm.plantHeight || 0),
        plantsPerMeter: Number(recordForm.plantsPerMeter || 0),
        uniformity: Number(recordForm.uniformity || 100),
        vigor: Number(recordForm.vigor || 100),
        lodging: Number(recordForm.lodging || 0),
        birdDamage: Number(recordForm.birdDamage || 0),
        yield: Number(recordForm.yield || 0),
        stemWeight: Number(recordForm.stemWeight || 0),
        leafWeight: Number(recordForm.leafWeight || 0),
        freshWeight: Number(recordForm.freshWeight || 0),
      };
      
      try {
          let success = false;
          if (editingRecordId) success = await updateTrialRecord({ ...payload, id: editingRecordId });
          else success = await addTrialRecord({ ...payload, id: Date.now().toString() });
          
          if (success) setIsRecordModalOpen(false);
      } finally { setIsSaving(false); }
  };

  const handleDeleteRecord = () => {
    if (editingRecordId && window.confirm("¿Eliminar registro técnico?")) {
        deleteTrialRecord(editingRecordId);
        setIsRecordModalOpen(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!logForm.note || isSaving) return;
      setIsSaving(true);
      const payload = { 
        id: Date.now().toString(),
        plotId: plot.id,
        date: logForm.date || new Date().toISOString().split('T')[0],
        time: logForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        note: logForm.note.trim(),
        photoUrl: logForm.photoUrl || ''
      } as FieldLog;
      
      try {
          const success = await addLog(payload);
          if (success) {
              setIsLogModalOpen(false);
              setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
          }
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

  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";
  const inputStyle = "w-full border border-gray-200 dark:border-slate-700 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm dark:text-white";

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 font-bold hover:text-gray-800 transition uppercase text-xs tracking-widest group">
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Listado Global
        </Link>
        <button onClick={() => setIsQrModalOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-slate-500 hover:text-hemp-600 shadow-sm transition-all flex items-center gap-2 px-4 text-xs font-black uppercase tracking-widest">
            <QrCode size={18}/> Etiqueta QR
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
              <div>
                  <div className="flex items-center space-x-2 mb-1">
                      <Tag size={12} className="text-hemp-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{plot.type}</span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">{plot.name}</h1>
                  <div className="flex flex-wrap gap-4">
                    <p className="text-gray-500 flex items-center text-sm font-bold"><MapPin size={16} className="mr-1 text-blue-500 opacity-60"/> {location?.name}</p>
                    <p className="text-gray-500 flex items-center text-sm font-bold"><Sprout size={16} className="mr-1 text-hemp-600 opacity-60"/> {variety?.name}</p>
                  </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border tracking-widest flex items-center shadow-sm ${plot.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {plot.status === 'Activa' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>}
                  {plot.status}
              </div>
          </div>
          <CycleGraph sowingDate={plot.sowingDate} cycleDays={variety?.cycleDays || 120} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPI label="Días Ciclo" value={Math.floor((Date.now() - new Date(plot.sowingDate).getTime()) / 86400000)} icon={Clock} color="bg-blue-100" />
              <KPI label="Superficie" value={`${plot.surfaceArea} ${plot.surfaceUnit}`} icon={Map} color="bg-purple-100" />
              <KPI label="Densidad" value={plot.density} subtext="pl/m²" icon={Sprout} color="bg-emerald-100" />
              <KPI label="Riego" value={plot.irrigationType || location?.irrigationSystem || 'Secano'} icon={Droplets} color="bg-blue-100" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border dark:border-slate-800 overflow-hidden">
                  <div className="px-6 py-5 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800 flex items-center"><ShieldCheck size={18} className="mr-2 text-hemp-600"/><h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">Trazabilidad Fiscal</h3></div>
                  <div className="p-8 space-y-6">
                      {seedBatch ? (
                          <div className="space-y-4">
                              <div className="bg-gradient-to-br from-hemp-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 rounded-2xl border border-hemp-100 dark:border-slate-700 text-center"><p className="text-[10px] font-black text-hemp-600 uppercase mb-1 tracking-widest">Lote Master</p><p className="text-xl font-black text-hemp-900 dark:text-hemp-400 font-mono">{seedBatch.batchCode}</p></div>
                              <div className="space-y-3 text-xs"><div className="flex justify-between border-b border-dashed dark:border-slate-800 pb-2 font-bold text-gray-500"><span>Categoría:</span><span className="text-gray-800 dark:text-white">{seedBatch.category}</span></div><div className="flex justify-between border-b border-dashed dark:border-slate-800 pb-2 font-bold text-gray-500"><span>Etiqueta:</span><span className="text-gray-800 dark:text-white font-mono">{seedBatch.labelSerialNumber || '-'}</span></div><div className="flex justify-between pb-2 font-bold text-gray-500"><span>Certificación:</span><span className="text-blue-600 truncate">{seedBatch.certificationNumber || 'N/A'}</span></div></div>
                          </div>
                      ) : (
                          <div className="text-center py-6"><AlertCircle size={32} className="mx-auto text-amber-500 mb-2 opacity-50"/><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">Sin lote master vinculado.</p></div>
                      )}
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border dark:border-slate-800 overflow-hidden">
                  <div className="px-6 py-5 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800 flex items-center justify-between"><div className="flex items-center"><Globe size={18} className="mr-2 text-blue-600"/><h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white">Ubicación GPS</h3></div></div>
                  <div className="h-56 relative group bg-slate-100">
                      {plot.polygon && plot.polygon.length > 2 ? <MapEditor initialCenter={plot.coordinates} initialPolygon={plot.polygon} readOnly={true} height="100%" /> : <div className="h-full flex items-center justify-center text-gray-400"><Map size={32} className="opacity-30"/></div>}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
              <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border dark:border-slate-800 shadow-sm w-fit overflow-x-auto">
                  <button onClick={() => setActiveTab('records')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo Técnico</button>
                  <button onClick={() => setActiveTab('logs')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Multimedia</button>
              </div>

              {activeTab === 'records' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border dark:border-slate-800 overflow-hidden animate-in fade-in">
                    <div className="px-8 py-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50"><h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.2em] flex items-center"><Activity size={16} className="mr-2 text-hemp-600"/> Historial de Monitoreo</h2>{canEdit && <button onClick={handleOpenNewRecord} className="bg-hemp-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-hemp-700 transition">Nuevo Registro</button>}</div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest"><tr><th className="px-8 py-4">Fecha/Hora</th><th className="px-8 py-4">Etapa</th><th className="px-8 py-4 text-center">Altura</th><th className="px-8 py-4 text-right">Ver</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">{history.length === 0 ? ( <tr><td colSpan={5} className="p-12 text-center text-gray-300 italic font-medium">No hay monitoreos registrados.</td></tr> ) : history.map(r => ( <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer group" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}><td className="px-8 py-5 font-black text-gray-800 dark:text-white">{r.date} <span className="block text-[10px] text-gray-400 font-normal">{r.time || '--:--'}</span></td><td className="px-8 py-5"><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30">{r.stage}</span></td><td className="px-8 py-5 font-black text-gray-900 dark:text-white text-center">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td><td className="px-8 py-5 text-right"><Eye size={18} className="text-gray-300 group-hover:text-hemp-600 ml-auto transition"/></td></tr> ))}</tbody>
                        </table>
                    </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-8"><h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.2em] flex items-center"><MessageSquare size={16} className="mr-2 text-blue-500"/> Notas de Campo Multimedia</h2><button onClick={() => setIsLogModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition flex items-center"><Camera size={16} className="mr-2"/> Agregar Nota</button></div>
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">{plotLogs.length === 0 ? <div className="text-center py-12 text-gray-400 italic bg-gray-50 dark:bg-slate-950 rounded-2xl border border-dashed dark:border-slate-800">No hay entradas en la bitácora.</div> : plotLogs.map(log => ( <div key={log.id} className="relative flex items-start group"><div className="absolute left-0 w-10 h-10 bg-white dark:bg-slate-800 border-4 border-blue-50 dark:border-slate-700 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div></div><div className="ml-14 flex-1 bg-gray-50/50 dark:bg-slate-950/50 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 hover:border-blue-200 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm"><div className="flex justify-between items-start mb-4"><div className="flex flex-col"><div className="flex items-center"><Calendar size={12} className="text-blue-500 mr-2"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date}</span></div><div className="flex items-center mt-0.5 opacity-60"><Clock size={10} className="text-gray-400 mr-2"/><span className="text-[10px] font-bold text-gray-500">{log.time || '--:--'}</span></div></div>{isAdmin && <button onClick={() => window.confirm("¿Borrar?") && deleteLog(log.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>}</div><p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium mb-5">{log.note}</p>{log.photoUrl && <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 max-w-sm cursor-zoom-in" onClick={() => setPreviewPhoto(log.photoUrl!)}><img src={log.photoUrl} className="w-full h-auto object-cover" /></div>}</div></div> ))}</div>
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* RECORD MODAL (TECHNICAL MONITORING) */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Activity size={24}/></div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Monitoreo <span className="text-hemp-600">Fenológico</span></h2>
                </div>
                <div className="flex gap-2">
                    {editingRecordId && !isViewMode && <button onClick={handleDeleteRecord} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={24}/></button>}
                    <button onClick={() => setIsRecordModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={28}/></button>
                </div>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <h4 className={labelClass}>Temporalidad y Etapa</h4>
                        <div>
                            <label className="text-[9px] font-bold text-gray-400 ml-1">Fecha de Visita</label>
                            <input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-gray-400 ml-1">Hora de Registro</label>
                            <input type="time" required disabled={isViewMode} className={inputStyle} value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})} />
                        </div>
                        <select required disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}>
                            <option value="Vegetativo">Estado Vegetativo</option>
                            <option value="Floración">Inicio Floración</option>
                            <option value="Maduración">Llenado / Maduración</option>
                            <option value="Cosecha">Cosecha / Final</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800">
                        <div className="col-span-full mb-2"><h4 className={labelClass}>Biometría y Parámetros</h4></div>
                        <div><label className="text-[9px] font-bold text-gray-400 ml-1">Altura (cm)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 ml-1">Plantas/m lin.</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantsPerMeter} onChange={e => setRecordForm({...recordForm, plantsPerMeter: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 ml-1">Vigor (1-100)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.vigor} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 ml-1">Uniformidad (%)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.uniformity} onChange={e => setRecordForm({...recordForm, uniformity: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 ml-1">Vuelco / Acame (%)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.lodging} onChange={e => setRecordForm({...recordForm, lodging: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-gray-400 ml-1">Daño Aves (%)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.birdDamage} onChange={e => setRecordForm({...recordForm, birdDamage: Number(e.target.value)})} /></div>
                    </div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center"><Scale size={14} className="mr-2"/> Componentes de Rendimiento (Muestreo)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><label className="text-[9px] font-bold text-emerald-600 ml-1">Peso Verde (g)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.freshWeight} onChange={e => setRecordForm({...recordForm, freshWeight: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-emerald-600 ml-1">Peso Tallo (g)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.stemWeight} onChange={e => setRecordForm({...recordForm, stemWeight: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-emerald-600 ml-1">Peso Hoja (g)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.leafWeight} onChange={e => setRecordForm({...recordForm, leafWeight: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] font-bold text-emerald-600 ml-1">Rinde Est. (kg/ha)</label><input type="number" step="1" disabled={isViewMode} className={inputStyle} value={recordForm.yield} onChange={e => setRecordForm({...recordForm, yield: Number(e.target.value)})} /></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Sanidad: Plagas detectadas</label><input type="text" disabled={isViewMode} className={inputStyle} value={recordForm.pests} onChange={e => setRecordForm({...recordForm, pests: e.target.value})} placeholder="Ej: Arañuela roja, Orugas..." /></div>
                    <div><label className={labelClass}>Sanidad: Enfermedades</label><input type="text" disabled={isViewMode} className={inputStyle} value={recordForm.diseases} onChange={e => setRecordForm({...recordForm, diseases: e.target.value})} placeholder="Ej: Botrytis, Fusarium..." /></div>
                </div>

                <div className="flex justify-end pt-8 border-t dark:border-slate-800">
                    {!isViewMode ? (
                        <>
                            <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-[1.02] transition-all">
                                {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Guardar Registro
                            </button>
                        </>
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
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isUploading ? 'Subiendo...' : 'Capturar o Subir Foto'}</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                    )}
                </div>

                <button type="submit" disabled={isSaving || isUploading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} Publicar en Bitácora
                </button>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW */}
      {previewPhoto && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10" onClick={() => setPreviewPhoto(null)}>
              <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X size={32}/></button>
              <img src={previewPhoto} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-in zoom-in-90" />
          </div>
      )}
    </div>
  );
}
