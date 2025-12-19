
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download
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
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog } = useAppContext();
  
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
  
  // Record Form
  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().substring(0, 5), stage: 'Vegetativo', plantHeight: 0 });
  
  // Log Form
  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ note: '', date: new Date().toISOString().split('T')[0], photoUrl: '' });
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canEdit = isAdmin || (currentUser?.role === 'technician' && plot?.responsibleIds?.includes(currentUser.id));
  
  if (!plot) return <div className="p-10 text-center">Parcela no encontrada.</div>;

  const handleSaveRecord = (e: React.FormEvent) => {
      e.preventDefault();
      const payload: any = { ...recordForm, plotId: plot.id, createdBy: currentUser?.id, createdByName: currentUser?.name };
      if (editingRecordId) updateTrialRecord({ ...payload, id: editingRecordId });
      else addTrialRecord({ ...payload, id: Date.now().toString() });
      setIsRecordModalOpen(false);
  };

  const handleSaveLog = (e: React.FormEvent) => {
      e.preventDefault();
      if (!logForm.note) return;
      const payload = { ...logForm, id: Date.now().toString(), plotId: plot.id } as FieldLog;
      addLog(payload);
      setIsLogModalOpen(false);
      setLogForm({ note: '', date: new Date().toISOString().split('T')[0], photoUrl: '' });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogForm({ ...logForm, photoUrl: reader.result as string });
              setIsUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteRecord = () => {
      if (editingRecordId && window.confirm("¿Estás seguro de eliminar este registro técnico? Esta acción no se puede deshacer.")) {
          deleteTrialRecord(editingRecordId);
          setIsRecordModalOpen(false);
      }
  };

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
              <KPI label="Lote Semilla" value={seedBatch?.batchCode || 'GEN-001'} icon={Tag} color="bg-amber-100" />
          </div>
          {/* Subtle leaf watermark */}
          <div className="absolute -top-10 -right-10 text-hemp-50 opacity-40 pointer-events-none transform rotate-45">
              <Sprout size={180} />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TRAZABILIDAD DE ORIGEN */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border overflow-hidden h-fit sticky top-6">
                  <div className="px-6 py-5 bg-gray-50 border-b flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center">
                          <ShieldCheck size={18} className="mr-2 text-hemp-600"/> Trazabilidad Fiscal
                      </h3>
                      <button className="text-gray-300 hover:text-gray-500 transition"><Info size={16}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      {seedBatch ? (
                          <div className="space-y-6">
                              <div className="bg-gradient-to-br from-hemp-50 to-white p-6 rounded-2xl border border-hemp-100 text-center shadow-inner">
                                  <p className="text-[10px] font-black text-hemp-600 uppercase mb-2 tracking-[0.2em]">Cód. Master de Lote</p>
                                  <p className="text-2xl font-black text-hemp-900 font-mono tracking-tighter">{seedBatch.batchCode}</p>
                                  <div className="mt-2 flex justify-center space-x-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-hemp-400"></div>
                                      <div className="w-1.5 h-1.5 rounded-full bg-hemp-200"></div>
                                      <div className="w-1.5 h-1.5 rounded-full bg-hemp-100"></div>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex justify-between border-b border-dashed pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px] tracking-widest">Categoría:</span><span className="text-gray-800">{seedBatch.category || 'C1'}</span></div>
                                  <div className="flex justify-between border-b border-dashed pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px] tracking-widest">N° Etiqueta:</span><span className="text-gray-800 font-mono">{seedBatch.labelSerialNumber || '-'}</span></div>
                                  <div className="flex justify-between border-b border-dashed pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px] tracking-widest">Certificación:</span><span className="text-blue-600 truncate max-w-[120px] font-mono">{seedBatch.certificationNumber || 'N/A'}</span></div>
                                  <div className="flex justify-between text-sm font-bold pt-1"><span className="text-gray-400 uppercase text-[10px] tracking-widest">PG / PUREZA:</span><span className="text-gray-800">{seedBatch.germination}% / {seedBatch.purity}%</span></div>
                              </div>
                              <div className="pt-4">
                                  <button className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center hover:bg-gray-200 transition">
                                      <Maximize2 size={12} className="mr-2"/> Descargar Certificado
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-12">
                              <AlertCircle size={40} className="mx-auto text-gray-200 mb-3"/>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sin lote vinculado</p>
                              <p className="text-xs text-gray-400 mt-1">Vincule un lote central para trazabilidad.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* REGISTROS Y BITÁCORA */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-fit">
                  <button onClick={() => setActiveTab('records')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo Técnico</button>
                  <button onClick={() => setActiveTab('logs')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Multimedia</button>
              </div>

              {activeTab === 'records' ? (
                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] flex items-center">
                            <Activity size={16} className="mr-2 text-hemp-600"/> Historial de Mediciones
                        </h2>
                        {canEdit && <button onClick={() => { setEditingRecordId(null); setIsViewMode(false); setIsRecordModalOpen(true); }} className="bg-hemp-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-hemp-700 transition">Nuevo Registro</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-400 uppercase text-[9px] font-black tracking-widest">
                                <tr><th className="px-8 py-4">Fecha</th><th className="px-8 py-4">Etapa</th><th className="px-8 py-4 text-center">Altura</th><th className="px-8 py-4 text-right">Ver</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.length === 0 ? ( <tr><td colSpan={4} className="p-12 text-center text-gray-300 italic font-medium">No se han registrado mediciones técnicas aún.</td></tr> ) : history.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                        <td className="px-8 py-5 font-black text-gray-800">{r.date} <span className="block text-[10px] text-gray-400 font-normal">{r.time || '--:--'}</span></td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                r.stage === 'Vegetativo' ? 'bg-green-50 text-green-700 border-green-100' :
                                                r.stage === 'Floración' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-purple-50 text-purple-700 border-purple-100'
                                            }`}>{r.stage}</span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-gray-900 text-center">{r.plantHeight ? <div className="flex items-center justify-center"><Ruler size={12} className="mr-1 text-gray-300"/> {r.plantHeight} cm</div> : '-'}</td>
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
                            <div>
                                <h2 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] flex items-center">
                                    <MessageSquare size={16} className="mr-2 text-blue-500"/> Notas de Campo
                                </h2>
                                <p className="text-xs text-gray-400 font-bold mt-1 uppercase">Cronología multimedia de observaciones.</p>
                            </div>
                            <button onClick={() => setIsLogModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition flex items-center">
                                <Camera size={16} className="mr-2"/> Agregar Nota
                            </button>
                        </div>
                        
                        {/* Timeline Wrapper */}
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">
                            {plotLogs.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">Aún no hay entradas en la bitácora.</div>
                            ) : plotLogs.map(log => (
                                <div key={log.id} className="relative flex items-start group">
                                    <div className="absolute left-0 w-10 h-10 bg-white border-4 border-blue-50 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                    </div>
                                    <div className="ml-14 flex-1 bg-gray-50/50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center">
                                                <Calendar size={12} className="text-blue-500 mr-2"/>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date}</span>
                                            </div>
                                            {isAdmin && <button className="text-gray-300 hover:text-red-500 transition"><Trash2 size={14}/></button>}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium mb-5">{log.note}</p>
                                        {log.photoUrl && (
                                            <div className="relative group/photo rounded-2xl overflow-hidden border border-gray-200 max-w-sm cursor-zoom-in" onClick={() => setPreviewPhoto(log.photoUrl!)}>
                                                <img src={log.photoUrl} alt="Field Observation" className="w-full h-auto object-cover group-hover/photo:scale-105 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/photo:opacity-100">
                                                    <div className="bg-white/90 p-3 rounded-full shadow-2xl backdrop-blur-sm">
                                                        <Maximize2 size={20} className="text-blue-600"/>
                                                    </div>
                                                </div>
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
              <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition">
                  <X size={32}/>
              </button>
              <img src={previewPhoto} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95" />
          </div>
      )}

      {/* RECORD MODAL */}
      {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                   <div className="px-8 py-6 border-b flex justify-between bg-gray-50 items-center">
                       <h2 className="font-black text-gray-800 uppercase text-xs tracking-widest">{isViewMode ? 'Detalle de Inspección' : (editingRecordId ? 'Editar Registro' : 'Nueva Medición Técnica')}</h2>
                       <button onClick={() => setIsRecordModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={24}/></button>
                   </div>
                   <div className="p-8">
                       <form onSubmit={handleSaveRecord} className="space-y-6">
                           <div className="grid grid-cols-2 gap-6">
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Fecha del Monitoreo</label><input type="date" disabled={isViewMode} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Etapa Fenológica</label>
                               <select disabled={isViewMode} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Altura Promedio (cm)</label><input disabled={isViewMode} type="number" className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Vigor (%)</label><input disabled={isViewMode} type="number" max="100" className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.vigor || 100} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})}/></div>
                           </div>
                           
                           <div className="flex justify-between pt-8 border-t mt-8">
                               {isAdmin && editingRecordId && (
                                   <button type="button" onClick={handleDeleteRecord} className="px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-widest transition">Eliminar Registro</button>
                               )}
                               <div className="flex space-x-3 ml-auto">
                                   <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-8 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl transition">Cerrar</button>
                                   {!isViewMode && (
                                       <button type="submit" className="px-10 py-2.5 bg-hemp-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition">Confirmar Registro</button>
                                   )}
                               </div>
                           </div>
                       </form>
                   </div>
               </div>
           </div>
       )}

       {/* LOG MODAL */}
       {isLogModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                    <div className="px-8 py-6 bg-blue-600 text-white flex justify-between items-center">
                        <h2 className="font-black uppercase text-xs tracking-widest flex items-center"><Camera size={18} className="mr-2"/> Entrada de Bitácora</h2>
                        <button onClick={() => setIsLogModalOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleSaveLog} className="p-8 space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Observación de Campo</label>
                            <textarea required className="w-full border border-gray-200 p-4 rounded-2xl bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] shadow-inner" placeholder="Describa plagas, anomalías o progresos..." value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})}></textarea>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Registro Fotográfico</label>
                            <div className="flex items-center gap-4">
                                <label className={`flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${logForm.photoUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-white'}`}>
                                    {isUploading ? <Clock className="animate-spin text-blue-500"/> : (
                                        <>
                                            {logForm.photoUrl ? <ImageIcon className="text-green-500 mb-2" size={32}/> : <Camera className="text-gray-400 mb-2" size={32}/>}
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{logForm.photoUrl ? 'Foto Cargada' : 'Subir Imagen'}</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                                </label>
                                {logForm.photoUrl && (
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg relative">
                                        <img src={logForm.photoUrl} className="w-full h-full object-cover"/>
                                        <button type="button" onClick={() => setLogForm({...logForm, photoUrl: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full shadow-lg"><X size={12}/></button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={isUploading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition disabled:opacity-50">Registrar en Bitácora</button>
                    </form>
                </div>
           </div>
       )}
    </div>
  );
}
