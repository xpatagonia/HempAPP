
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar
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
                <div><h3 className="text-lg font-bold text-gray-800">Ciclo de Cultivo</h3><p className="text-sm text-gray-500">Progreso biológico.</p></div>
                <div className="text-right"><span className="text-2xl font-black text-hemp-600">{Math.round(progress)}%</span></div>
            </div>
            <div className="h-4 bg-gray-100 rounded-full w-full relative mb-8 mt-4 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-hemp-400 to-hemp-600" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <div><strong>Siembra:</strong> {new Date(sowingDate).toLocaleDateString()}</div>
                <div className="text-right"><strong>Cosecha Est:</strong> {new Date(end).toLocaleDateString()} ({daysLeft}d restantes)</div>
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
  const plotLogs = logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  
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
        <Link to="/plots" className="flex items-center text-gray-500 font-bold hover:text-gray-800 transition uppercase text-xs tracking-widest"><ArrowLeft size={16} className="mr-2" /> Listado Global</Link>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border p-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
              <div>
                  <h1 className="text-4xl font-black text-gray-900 mb-2">{plot.name}</h1>
                  <div className="flex flex-wrap gap-4">
                    <p className="text-gray-500 flex items-center text-sm font-bold"><MapPin size={16} className="mr-1 text-blue-500"/> {location?.name}</p>
                    <p className="text-gray-500 flex items-center text-sm font-bold"><Sprout size={16} className="mr-1 text-hemp-600"/> {variety?.name}</p>
                  </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border tracking-widest ${plot.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}>
                  {plot.status}
              </div>
          </div>
          <CycleGraph sowingDate={plot.sowingDate} cycleDays={variety?.cycleDays || 120} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPI label="Días Ciclo" value={Math.floor((Date.now() - new Date(plot.sowingDate).getTime()) / 86400000)} icon={Clock} color="bg-blue-100" />
              <KPI label="Superficie" value={`${plot.surfaceArea} ${plot.surfaceUnit}`} icon={Map} color="bg-purple-100" />
              <KPI label="Densidad" value={plot.density} subtext="pl/m²" icon={Sprout} color="bg-emerald-100" />
              <KPI label="Lote Semilla" value={seedBatch?.batchCode || 'GEN'} icon={Tag} color="bg-amber-100" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TRAZABILIDAD DE ORIGEN */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border overflow-hidden h-full">
                  <div className="px-6 py-5 bg-gray-50 border-b flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center">
                          <ShieldCheck size={18} className="mr-2 text-hemp-600"/> Trazabilidad
                      </h3>
                      <Info size={16} className="text-gray-400"/>
                  </div>
                  <div className="p-8 space-y-6">
                      {seedBatch ? (
                          <div className="space-y-6">
                              <div className="bg-hemp-50/50 p-6 rounded-2xl border border-hemp-100 text-center">
                                  <p className="text-[10px] font-black text-hemp-600 uppercase mb-2 tracking-widest">Cód. Master</p>
                                  <p className="text-2xl font-black text-hemp-900 font-mono tracking-tighter">{seedBatch.batchCode}</p>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex justify-between border-b pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px]">Categoría:</span><span className="text-gray-800">{seedBatch.category || 'C1'}</span></div>
                                  <div className="flex justify-between border-b pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px]">N° Etiqueta:</span><span className="text-gray-800">{seedBatch.labelSerialNumber || '-'}</span></div>
                                  <div className="flex justify-between border-b pb-3 text-sm font-bold"><span className="text-gray-400 uppercase text-[10px]">Certificado:</span><span className="text-blue-600 truncate max-w-[120px]">{seedBatch.certificationNumber || 'N/A'}</span></div>
                                  <div className="flex justify-between text-sm font-bold"><span className="text-gray-400 uppercase text-[10px]">PG / PUREZA:</span><span className="text-gray-800">{seedBatch.germination}% / {seedBatch.purity}%</span></div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-12">
                              <AlertCircle size={40} className="mx-auto text-gray-300 mb-3 opacity-50"/>
                              <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Sin lote vinculado</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* REGISTROS Y BITÁCORA */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-fit">
                  <button onClick={() => setActiveTab('records')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-lg shadow-hemp-900/20' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo</button>
                  <button onClick={() => setActiveTab('logs')} className={`px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora</button>
              </div>

              {activeTab === 'records' ? (
                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                    <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em]">Historial Técnico</h2>
                        {canEdit && <button onClick={() => { setEditingRecordId(null); setIsViewMode(false); setIsRecordModalOpen(true); }} className="bg-hemp-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-hemp-700 transition">Nuevo Registro</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-400 uppercase text-[9px] font-black tracking-widest">
                                <tr><th className="px-8 py-4">Fecha</th><th className="px-8 py-4">Etapa</th><th className="px-8 py-4">Altura</th><th className="px-8 py-4 text-right">Detalle</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.length === 0 ? ( <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic font-medium">Sin registros cargados.</td></tr> ) : history.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                        <td className="px-8 py-5 font-black text-gray-800">{r.date} <span className="block text-[10px] text-gray-400 font-normal">{r.time || '--:--'}</span></td>
                                        <td className="px-8 py-5"><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-green-50 text-green-700 border border-green-100">{r.stage}</span></td>
                                        <td className="px-8 py-5 font-black text-gray-900">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td>
                                        <td className="px-8 py-5 text-right"><Eye size={18} className="text-gray-300 group-hover:text-hemp-600 ml-auto transition"/></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl p-6 border shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] flex items-center">
                                <MessageSquare size={16} className="mr-2 text-blue-500"/> Notas y Bitácora
                            </h2>
                            <button onClick={() => setIsLogModalOpen(true)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition flex items-center">
                                <Plus size={16} className="mr-1"/> Agregar Nota
                            </button>
                        </div>
                        <div className="space-y-4">
                            {plotLogs.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 italic">No hay notas registradas para este lote.</div>
                            ) : plotLogs.map(log => (
                                <div key={log.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center">
                                            <div className="bg-blue-100 p-2 rounded-lg mr-3 text-blue-600"><ClipboardList size={14}/></div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium mb-4">{log.note}</p>
                                    {log.photoUrl && (
                                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 max-w-sm">
                                            <img src={log.photoUrl} alt="Field Observation" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <button className="bg-white p-2 rounded-full shadow-lg"><Eye size={16} className="text-gray-700"/></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* RECORD MODAL */}
      {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                   <div className="px-8 py-6 border-b flex justify-between bg-gray-50 items-center">
                       <h2 className="font-black text-gray-800 uppercase text-xs tracking-widest">{isViewMode ? 'Inspección Detallada' : (editingRecordId ? 'Editar Registro' : 'Nuevo Registro')}</h2>
                       <button onClick={() => setIsRecordModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={24}/></button>
                   </div>
                   <div className="p-8">
                       <form onSubmit={handleSaveRecord} className="space-y-6">
                           <div className="grid grid-cols-2 gap-6">
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Fecha</label><input type="date" disabled={isViewMode} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Etapa</label>
                               <select disabled={isViewMode} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                               <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Altura (cm)</label><input disabled={isViewMode} type="number" className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-hemp-500" value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                           </div>
                           
                           <div className="flex justify-between pt-8 border-t mt-8">
                               {isAdmin && editingRecordId && (
                                   <button type="button" onClick={handleDeleteRecord} className="px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-widest transition">Eliminar</button>
                               )}
                               <div className="flex space-x-3 ml-auto">
                                   <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-8 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl transition">Cerrar</button>
                                   {!isViewMode && (
                                       <button type="submit" className="px-10 py-2.5 bg-hemp-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition">Guardar Cambios</button>
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
                        <h2 className="font-black uppercase text-xs tracking-widest flex items-center"><Camera size={18} className="mr-2"/> Nota de Campo</h2>
                        <button onClick={() => setIsLogModalOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleSaveLog} className="p-8 space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Observación</label>
                            <textarea required className="w-full border border-gray-200 p-4 rounded-2xl bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]" placeholder="¿Qué observaste hoy?" value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})}></textarea>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Registro Fotográfico</label>
                            <div className="flex items-center gap-4">
                                <label className={`flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${logForm.photoUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-blue-400 bg-gray-50'}`}>
                                    {isUploading ? <Clock className="animate-spin text-blue-500"/> : (
                                        <>
                                            {logForm.photoUrl ? <ImageIcon className="text-green-500 mb-2"/> : <Camera className="text-gray-400 mb-2"/>}
                                            <span className="text-[10px] font-black text-gray-500 uppercase">{logForm.photoUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                                </label>
                                {logForm.photoUrl && (
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border">
                                        <img src={logForm.photoUrl} className="w-full h-full object-cover"/>
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
