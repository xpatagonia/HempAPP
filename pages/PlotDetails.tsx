
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download, Scale, Wind, Bird, CheckCircle2,
  RefreshCw
} from 'lucide-react';
import MapEditor from '../components/MapEditor';
import WeatherWidget from '../components/WeatherWidget';

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
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog, deleteLog } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  
  const history = getPlotHistory(id || '');
  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs, id]);
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const getDefaultRecordValues = () => ({ 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    stage: 'Vegetativo' as any, 
    plantHeight: 0,
    replicate: plot?.replicate || 1,
    plantsPerMeter: 0,
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
  
  // Bitácora Form con Hora
  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ 
      note: '', 
      date: new Date().toISOString().split('T')[0], 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      photoUrl: '' 
  });
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canEdit = isAdmin || (currentUser?.role === 'technician' && plot?.responsibleIds?.includes(currentUser.id));
  
  if (!plot) return <div className="p-10 text-center">Parcela no encontrada.</div>;

  const handleOpenNewRecord = () => {
      setEditingRecordId(null);
      setIsViewMode(false);
      setRecordForm(getDefaultRecordValues());
      setIsRecordModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const payload: any = { 
          ...recordForm, 
          plotId: plot.id, 
          createdBy: currentUser?.id, 
          createdByName: currentUser?.name 
      };
      
      try {
          let success = false;
          if (editingRecordId) {
              updateTrialRecord({ ...payload, id: editingRecordId });
              success = true;
          } else {
              success = await addTrialRecord({ ...payload, id: Date.now().toString() });
          }
          
          if (success) {
              setIsRecordModalOpen(false);
          } else {
              alert("Error al guardar el monitoreo. Revisa tu conexión o script de base de datos.");
          }
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteRecord = () => {
    if (editingRecordId && window.confirm("¿Estás seguro de eliminar este registro de monitoreo?")) {
        deleteTrialRecord(editingRecordId);
        setIsRecordModalOpen(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!logForm.note) return;
      setIsSaving(true);
      const payload = { ...logForm, id: Date.now().toString(), plotId: plot.id } as FieldLog;
      
      try {
          const success = await addLog(payload);
          if (success) {
              setIsLogModalOpen(false);
              setLogForm({ 
                  note: '', 
                  date: new Date().toISOString().split('T')[0], 
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                  photoUrl: '' 
              });
          } else {
              alert("No se pudo guardar la nota de campo. Verifica el tamaño de la imagen o script de base de datos.");
          }
      } finally {
          setIsSaving(false);
      }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) {
              alert("La imagen es demasiado grande. Máximo 2MB.");
              return;
          }
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogForm({ ...logForm, photoUrl: reader.result as string });
              setIsUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";
  const inputStyle = "w-full border border-gray-200 p-2.5 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm";

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 font-bold hover:text-gray-800 transition uppercase text-xs tracking-widest group">
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Listado Global
        </Link>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
              <div>
                  <div className="flex items-center space-x-2 mb-1">
                      <Tag size={12} className="text-hemp-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{plot.type}</span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 mb-2">{plot.name}</h1>
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
              <KPI label="Lote Semilla" value={seedBatch?.batchCode || 'VINCULANDO...'} icon={Tag} color="bg-amber-100" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border overflow-hidden h-fit sticky top-6">
                  <div className="px-6 py-5 bg-gray-50 border-b flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center">
                          <ShieldCheck size={18} className="mr-2 text-hemp-600"/> Trazabilidad Fiscal
                      </h3>
                  </div>
                  <div className="p-8 space-y-6">
                      {seedBatch ? (
                          <div className="space-y-6 animate-in slide-in-from-left-2">
                              <div className="bg-gradient-to-br from-hemp-50 to-white p-6 rounded-2xl border border-hemp-100 text-center shadow-inner">
                                  <p className="text-[10px] font-black text-hemp-600 uppercase mb-2 tracking-[0.2em]">Cód. Master de Lote</p>
                                  <p className="text-2xl font-black text-hemp-900 font-mono tracking-tighter">{seedBatch.batchCode}</p>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex justify-between border-b border-dashed pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px] tracking-widest">Categoría:</span><span className="text-gray-800">{seedBatch.category || 'C1'}</span></div>
                                  <div className="flex justify-between border-b border-dashed pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px] tracking-widest">N° Etiqueta:</span><span className="text-gray-800 font-mono">{seedBatch.labelSerialNumber || '-'}</span></div>
                                  <div className="flex justify-between border-b border-dashed pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px] tracking-widest">Certificación:</span><span className="text-blue-600 truncate max-w-[120px] font-mono">{seedBatch.certificationNumber || 'N/A'}</span></div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-12">
                              <AlertCircle size={40} className="mx-auto text-amber-500 mb-3"/>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sin lote vinculado</p>
                              <p className="text-xs text-gray-400 mt-2 px-4 leading-relaxed">Este lote no registra un ID de semilla master. Verifica el guardado de la tabla 'plots'.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
              <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-fit">
                  <button onClick={() => setActiveTab('records')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo Técnico</button>
                  <button onClick={() => setActiveTab('logs')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Multimedia</button>
              </div>

              {activeTab === 'records' ? (
                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] flex items-center">
                            <Activity size={16} className="mr-2 text-hemp-600"/> Historial de Monitoreo
                        </h2>
                        {canEdit && <button onClick={handleOpenNewRecord} className="bg-hemp-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-hemp-700 transition">Nuevo Registro</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-400 uppercase text-[9px] font-black tracking-widest">
                                <tr><th className="px-8 py-4">Fecha/Hora</th><th className="px-8 py-4">Etapa</th><th className="px-8 py-4 text-center">Altura</th><th className="px-8 py-4 text-center">Vigor</th><th className="px-8 py-4 text-right">Ver</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                {history.length === 0 ? ( <tr><td colSpan={5} className="p-12 text-center text-gray-300 italic font-medium">No se han registrado monitoreos técnicos aún.</td></tr> ) : history.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                        <td className="px-8 py-5 font-black text-gray-800">{r.date} <span className="block text-[10px] text-gray-400 font-normal">{r.time || '--:--'}</span></td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                r.stage === 'Vegetativo' ? 'bg-green-50 text-green-700 border-green-100' :
                                                r.stage === 'Floración' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-purple-50 text-purple-700 border-purple-100'
                                            }`}>{r.stage}</span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-gray-900 text-center">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td>
                                        <td className="px-8 py-5 font-black text-gray-900 text-center">{r.vigor ? `${r.vigor}%` : '-'}</td>
                                        <td className="px-8 py-5 text-right"><Eye size={18} className="text-gray-300 group-hover:text-hemp-600 ml-auto transition"/></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white rounded-3xl p-8 border shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] flex items-center">
                                <MessageSquare size={16} className="mr-2 text-blue-500"/> Notas de Campo Multimedia
                            </h2>
                            <button onClick={() => setIsLogModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition flex items-center">
                                <Camera size={16} className="mr-2"/> Agregar Nota con Foto
                            </button>
                        </div>
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">
                            {plotLogs.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">Aún no hay entradas en la bitácora multimedia.</div>
                            ) : plotLogs.map(log => (
                                <div key={log.id} className="relative flex items-start group">
                                    <div className="absolute left-0 w-10 h-10 bg-white border-4 border-blue-50 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                    </div>
                                    <div className="ml-14 flex-1 bg-gray-50/50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center">
                                                    <Calendar size={12} className="text-blue-500 mr-2"/>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date}</span>
                                                </div>
                                                <div className="flex items-center mt-0.5 opacity-60">
                                                    <Clock size={10} className="text-gray-400 mr-2"/>
                                                    <span className="text-[10px] font-bold text-gray-500">{log.time || '--:--'}</span>
                                                </div>
                                            </div>
                                            {isAdmin && <button onClick={() => window.confirm("¿Borrar nota?") && deleteLog(log.id)} className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium mb-5">{log.note}</p>
                                        {log.photoUrl && (
                                            <div className="relative group/photo rounded-2xl overflow-hidden border border-gray-200 max-w-sm cursor-zoom-in" onClick={() => setPreviewPhoto(log.photoUrl!)}>
                                                <img src={log.photoUrl} alt="Field Observation" className="w-full h-auto object-cover group-hover/photo:scale-105 transition-transform duration-700" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* PHOTO PREVIEW MODAL */}
      {previewPhoto && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPreviewPhoto(null)}>
              <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition"><X size={32}/></button>
              <img src={previewPhoto} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95" />
          </div>
      )}

      {/* RECORD MODAL */}
      {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                   <div className="px-8 py-6 border-b flex justify-between bg-gray-50 items-center sticky top-0 z-20">
                       <h2 className="font-black text-gray-800 uppercase text-xs tracking-widest">{isViewMode ? 'Ficha de Monitoreo' : (editingRecordId ? 'Editar Registro' : 'Nueva Medición Técnica de Ensayo')}</h2>
                       <button onClick={() => setIsRecordModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={24}/></button>
                   </div>
                   <div className="p-8">
                       <form onSubmit={handleSaveRecord} className="space-y-10">
                           <section>
                               <h3 className="text-xs font-black text-hemp-600 uppercase tracking-widest mb-4 flex items-center border-b pb-2">
                                   <Clock size={14} className="mr-2"/> Datos Generales y Tiempo
                               </h3>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div><label className={labelClass}>Fecha de Registro</label><input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                                   <div><label className={labelClass}>Hora de Registro</label><input type="time" required disabled={isViewMode} className={inputStyle} value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})}/></div>
                                   <div><label className={labelClass}>Etapa Fenológica</label>
                                   <select disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                               </div>
                           </section>

                           <section>
                               <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center border-b pb-2">
                                   <Sprout size={14} className="mr-2"/> Fenología y Población
                               </h3>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div><label className={labelClass}>Fecha Emergencia</label><input type="date" disabled={isViewMode} className={inputStyle} value={recordForm.emergenceDate} onChange={e => setRecordForm({...recordForm, emergenceDate: e.target.value})}/></div>
                                   <div><label className={labelClass}>Fecha Floración</label><input type="date" disabled={isViewMode} className={inputStyle} value={recordForm.floweringDate} onChange={e => setRecordForm({...recordForm, floweringDate: e.target.value})}/></div>
                                   <div><label className={labelClass}>Réplica (Rep)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.replicate} onChange={e => setRecordForm({...recordForm, replicate: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>N° plantas/metro lineal</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantsPerMeter} onChange={e => setRecordForm({...recordForm, plantsPerMeter: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Uniformidad (%)</label><input type="number" max="100" disabled={isViewMode} className={inputStyle} value={recordForm.uniformity} onChange={e => setRecordForm({...recordForm, uniformity: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Vigor General (%)</label><input type="number" max="100" disabled={isViewMode} className={inputStyle} value={recordForm.vigor} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Altura de Planta (cm)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                               </div>
                           </section>

                           <section>
                               <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center border-b pb-2">
                                   <Wind size={14} className="mr-2"/> Daños y Sanidad
                               </h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div className="grid grid-cols-2 gap-4">
                                       <div><label className={labelClass}>Vuelco (%)</label><input type="number" max="100" disabled={isViewMode} className={inputStyle} value={recordForm.lodging} onChange={e => setRecordForm({...recordForm, lodging: Number(e.target.value)})}/></div>
                                       <div><label className={labelClass}>Daño Aves (%)</label><div className="relative"><Bird size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"/><input type="number" max="100" disabled={isViewMode} className={`${inputStyle} pl-8`} value={recordForm.birdDamage} onChange={e => setRecordForm({...recordForm, birdDamage: Number(e.target.value)})}/></div></div>
                                   </div>
                                   <div className="grid grid-cols-1 gap-4">
                                       <div><label className={labelClass}>Enfermedades</label><input type="text" placeholder="Ej: Oidio..." disabled={isViewMode} className={inputStyle} value={recordForm.diseases} onChange={e => setRecordForm({...recordForm, diseases: e.target.value})}/></div>
                                       <div><label className={labelClass}>Plagas</label><input type="text" placeholder="Ej: Pulgón..." disabled={isViewMode} className={inputStyle} value={recordForm.pests} onChange={e => setRecordForm({...recordForm, pests: e.target.value})}/></div>
                                   </div>
                               </div>
                           </section>

                           <section className="bg-amber-50/50 p-6 rounded-[24px] border border-amber-100">
                               <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center border-b border-amber-200 pb-2">
                                   <Scale size={14} className="mr-2"/> Rendimiento y Biomasa
                               </h3>
                               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                   <div className="md:col-span-2"><label className={labelClass}>Fecha Cosecha</label><input type="date" disabled={isViewMode} className={inputStyle} value={recordForm.harvestDate} onChange={e => setRecordForm({...recordForm, harvestDate: e.target.value})}/></div>
                                   <div><label className={labelClass}>Rendimiento (kg/ha)</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.yield} onChange={e => setRecordForm({...recordForm, yield: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Peso Tallo (g)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.stemWeight} onChange={e => setRecordForm({...recordForm, stemWeight: Number(e.target.value)})}/></div>
                               </div>
                           </section>
                           
                           <div className="flex justify-between pt-8 border-t mt-8">
                               {isAdmin && editingRecordId && (
                                   <button type="button" onClick={handleDeleteRecord} className="px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-widest transition">Eliminar</button>
                               )}
                               <div className="flex space-x-3 ml-auto">
                                   <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-8 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl transition">Cerrar</button>
                                   {!isViewMode && (
                                       <button type="submit" disabled={isSaving} className="px-10 py-2.5 bg-hemp-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition flex items-center">
                                           {isSaving && <RefreshCw className="animate-spin mr-2" size={16}/>}
                                           Guardar Registro
                                       </button>
                                   )}
                               </div>
                           </div>
                       </form>
                   </div>
               </div>
           </div>
       )}

       {/* LOG MODAL ACTUALIZADO CON HORA */}
       {isLogModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                    <div className="px-8 py-6 bg-blue-600 text-white flex justify-between items-center">
                        <h2 className="font-black uppercase text-xs tracking-widest flex items-center"><Camera size={18} className="mr-2"/> Entrada de Bitácora</h2>
                        <button onClick={() => setIsLogModalOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleSaveLog} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Fecha</label>
                                <input type="date" required className={inputStyle} value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelClass}>Hora</label>
                                <input type="time" required className={inputStyle} value={logForm.time} onChange={e => setLogForm({...logForm, time: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Observación de Campo</label>
                            <textarea required className="w-full border border-gray-200 p-4 rounded-2xl bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] shadow-inner" placeholder="Escribe tus observaciones aquí..." value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})}></textarea>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Evidencia Fotográfica</label>
                            <div className="flex items-center gap-4">
                                <label className={`flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${logForm.photoUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-white'}`}>
                                    {isUploading ? <RefreshCw className="animate-spin text-blue-500"/> : (
                                        <>
                                            {logForm.photoUrl ? <CheckCircle2 className="text-green-500 mb-2" size={32}/> : <Camera className="text-gray-400 mb-2" size={32}/>}
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{logForm.photoUrl ? 'Imagen Lista' : 'Capturar o Subir'}</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                                </label>
                                {logForm.photoUrl && (
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg relative">
                                        <img src={logForm.photoUrl} className="w-full h-full object-cover" alt="preview"/>
                                        <button type="button" onClick={() => setLogForm({...logForm, photoUrl: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full shadow-lg"><X size={12}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button type="submit" disabled={isSaving || isUploading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition flex items-center justify-center">
                            {isSaving && <RefreshCw className="animate-spin mr-2" size={16}/>}
                            Confirmar Entrada
                        </button>
                    </form>
                </div>
           </div>
       )}
    </div>
  );
}
