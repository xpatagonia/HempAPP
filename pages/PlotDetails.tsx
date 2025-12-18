
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2
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
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  const history = getPlotHistory(id || '');
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().substring(0, 5), stage: 'Vegetativo', plantHeight: 0 });
  
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

  const handleDeleteRecord = () => {
      if (editingRecordId && window.confirm("¿Estás seguro de eliminar este registro técnico? Esta acción no se puede deshacer.")) {
          deleteTrialRecord(editingRecordId);
          setIsRecordModalOpen(false);
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 font-medium hover:text-gray-800 transition"><ArrowLeft size={18} className="mr-1" /> Volver</Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex justify-between items-start mb-6">
              <div>
                  <h1 className="text-3xl font-black text-gray-900 mb-1">{plot.name}</h1>
                  <p className="text-gray-500 flex items-center text-sm"><MapPin size={14} className="mr-1"/> {location?.name} • <span className="font-bold text-hemp-700 ml-1">{variety?.name}</span></p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${plot.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}>
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
          {/* BLOQUE DE TRAZABILIDAD DE ORIGEN */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-full">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center">
                          <ShieldCheck size={18} className="mr-2 text-hemp-600"/> Trazabilidad Origen
                      </h3>
                      <Info size={16} className="text-gray-400"/>
                  </div>
                  <div className="p-6 space-y-4">
                      {seedBatch ? (
                          <div className="space-y-4">
                              <div className="bg-hemp-50/50 p-4 rounded-xl border border-hemp-100 text-center">
                                  <p className="text-[10px] font-black text-hemp-600 uppercase mb-1">Cód. Identificación Master</p>
                                  <p className="text-xl font-black text-hemp-900 font-mono tracking-tighter">{seedBatch.batchCode}</p>
                              </div>
                              <div className="space-y-3">
                                  <div className="flex justify-between border-b pb-2 text-sm"><span className="text-gray-500">Categoría:</span><span className="font-bold text-gray-800">{seedBatch.category || 'C1'}</span></div>
                                  <div className="flex justify-between border-b pb-2 text-sm"><span className="text-gray-500">N° Serie Etiqueta:</span><span className="font-bold text-gray-800">{seedBatch.labelSerialNumber || '-'}</span></div>
                                  <div className="flex justify-between border-b pb-2 text-sm"><span className="text-gray-500">Certificación:</span><span className="font-bold text-blue-600 truncate max-w-[120px]">{seedBatch.certificationNumber || 'N/A'}</span></div>
                                  <div className="flex justify-between border-b pb-2 text-sm"><span className="text-gray-500">Fecha Análisis:</span><span className="font-bold text-gray-800">{seedBatch.analysisDate || '-'}</span></div>
                                  <div className="flex justify-between text-sm"><span className="text-gray-500">Calidad:</span><span className="font-bold text-gray-800">{seedBatch.germination}% PG / {seedBatch.purity}% Pur.</span></div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-8">
                              <AlertCircle size={32} className="mx-auto text-gray-300 mb-2"/>
                              <p className="text-xs text-gray-400 font-bold uppercase">Sin lote específico vinculado</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* REGISTROS Y MONITOREO */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex gap-2 border-b">
                  <button onClick={() => setActiveTab('records')} className={`px-4 py-2 font-bold text-sm border-b-2 ${activeTab === 'records' ? 'border-hemp-600 text-hemp-700' : 'border-transparent text-gray-500'}`}>Monitoreo Técnico</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                        <h2 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Historial de Campo</h2>
                        {canEdit && <button onClick={() => { setEditingRecordId(null); setIsViewMode(false); setIsRecordModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">Nuevo Registro</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black">
                                <tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">Hora</th><th className="px-6 py-3">Etapa</th><th className="px-6 py-3">Altura</th><th className="px-6 py-3 text-right">Detalle</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.length === 0 ? ( <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Sin registros técnicos.</td></tr> ) : history.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                        <td className="px-6 py-4 font-bold">{r.date}</td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{r.time || '--:--'}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded text-[10px] border font-black uppercase bg-green-50 text-green-700">{r.stage}</span></td>
                                        <td className="px-6 py-4 font-bold">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td>
                                        <td className="px-6 py-4 text-right"><Eye size={16} className="text-gray-300 ml-auto"/></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
              </div>
          </div>
      </div>

      {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b flex justify-between bg-gray-50 items-center">
                       <h2 className="font-bold text-gray-800">{isViewMode ? 'Detalle de Inspección' : (editingRecordId ? 'Editar Registro' : 'Nuevo Registro de Monitoreo')}</h2>
                       <button onClick={() => setIsRecordModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
                   </div>
                   <div className="p-6">
                       <form onSubmit={handleSaveRecord} className="space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                               <div><label className="text-xs font-bold uppercase mb-1 block text-gray-500">Fecha</label><input type="date" disabled={isViewMode} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none" value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                               <div><label className="text-xs font-bold uppercase mb-1 block text-gray-500">Hora</label><input type="time" disabled={isViewMode} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none" value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})}/></div>
                               <div><label className="text-xs font-bold uppercase mb-1 block text-gray-500">Etapa</label>
                               <select disabled={isViewMode} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none" value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                               <div><label className="text-xs font-bold uppercase mb-1 block text-gray-500">Altura (cm)</label><input disabled={isViewMode} type="number" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none" value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                           </div>
                           
                           <div className="flex justify-between pt-4 border-t mt-6">
                               {isAdmin && editingRecordId && (
                                   <button 
                                       type="button" 
                                       onClick={handleDeleteRecord}
                                       className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold transition flex items-center border border-transparent hover:border-red-100"
                                   >
                                       <Trash2 size={18} className="mr-2" /> Eliminar Registro
                                   </button>
                               )}
                               
                               <div className="flex space-x-2 ml-auto">
                                   <button 
                                       type="button" 
                                       onClick={() => setIsRecordModalOpen(false)}
                                       className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition"
                                   >
                                       Cerrar
                                   </button>
                                   
                                   {isViewMode ? (
                                       canEdit && (
                                           <button 
                                               type="button" 
                                               onClick={() => setIsViewMode(false)}
                                               className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center"
                                           >
                                               <Edit2 size={18} className="mr-2" /> Editar
                                           </button>
                                       )
                                   ) : (
                                       <button 
                                           type="submit" 
                                           className="px-6 py-2 bg-hemp-600 text-white rounded-lg font-bold shadow-md hover:bg-hemp-700 transition"
                                       >
                                           Guardar Cambios
                                       </button>
                                   )}
                               </div>
                           </div>
                       </form>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}
