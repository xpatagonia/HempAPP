
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog } from '../types';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download, Scale, Wind, Bird, CheckCircle2,
  RefreshCw, Globe, Layers, Save
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
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog, deleteLog, updatePlot } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  
  const history = getPlotHistory(id || '');
  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs, id]);
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Plot Polygon Temporary State
  const [tempPolygon, setTempPolygon] = useState<{lat: number, lng: number}[]>(plot?.polygon || []);
  const [tempArea, setTempArea] = useState(plot?.surfaceArea || 0);
  const [tempCoords, setTempCoords] = useState(plot?.coordinates);

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
  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
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
      const payload: any = { ...recordForm, plotId: plot.id, createdBy: currentUser?.id, createdByName: currentUser?.name };
      try {
          if (editingRecordId) updateTrialRecord({ ...payload, id: editingRecordId });
          else await addTrialRecord({ ...payload, id: Date.now().toString() });
          setIsRecordModalOpen(false);
      } finally { setIsSaving(false); }
  };

  const handleDeleteRecord = () => {
    if (editingRecordId && window.confirm("¿Eliminar registro?")) {
        deleteTrialRecord(editingRecordId);
        setIsRecordModalOpen(false);
    }
  };

  const handleSaveMap = async () => {
      setIsSaving(true);
      try {
          updatePlot({
              ...plot,
              polygon: tempPolygon,
              surfaceArea: tempArea,
              coordinates: tempCoords
          });
          setIsMapModalOpen(false);
      } finally { setIsSaving(false); }
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
              setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
          }
      } finally { setIsSaving(false); }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.onloadend = () => { setLogForm({ ...logForm, photoUrl: reader.result as string }); setIsUploading(false); };
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
              <KPI label="Lote Semilla" value={seedBatch?.batchCode || 'N/A'} icon={Tag} color="bg-amber-100" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
              {/* TRACEABILITY CARD */}
              <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                  <div className="px-6 py-5 bg-gray-50 border-b flex items-center">
                      <ShieldCheck size={18} className="mr-2 text-hemp-600"/> 
                      <h3 className="text-xs font-black uppercase tracking-[0.2em]">Trazabilidad Fiscal</h3>
                  </div>
                  <div className="p-8 space-y-6">
                      {seedBatch ? (
                          <div className="space-y-4">
                              <div className="bg-gradient-to-br from-hemp-50 to-white p-4 rounded-2xl border border-hemp-100 text-center">
                                  <p className="text-[10px] font-black text-hemp-600 uppercase mb-1 tracking-widest">Lote Master</p>
                                  <p className="text-xl font-black text-hemp-900 font-mono">{seedBatch.batchCode}</p>
                              </div>
                              <div className="space-y-3 text-xs">
                                  <div className="flex justify-between border-b border-dashed pb-2 font-bold text-gray-500"><span>Categoría:</span><span className="text-gray-800">{seedBatch.category}</span></div>
                                  <div className="flex justify-between border-b border-dashed pb-2 font-bold text-gray-500"><span>Etiqueta:</span><span className="text-gray-800 font-mono">{seedBatch.labelSerialNumber || '-'}</span></div>
                                  <div className="flex justify-between pb-2 font-bold text-gray-500"><span>Certificación:</span><span className="text-blue-600 truncate">{seedBatch.certificationNumber || 'N/A'}</span></div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-6">
                              <AlertCircle size={32} className="mx-auto text-amber-500 mb-2 opacity-50"/>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">Sin lote master vinculado.<br/>Vincular en ajustes del lote.</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* EXPERIMENTAL DESIGN / MAP CARD */}
              <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                  <div className="px-6 py-5 bg-gray-50 border-b flex items-center justify-between">
                      <div className="flex items-center">
                          <Globe size={18} className="mr-2 text-blue-600"/> 
                          <h3 className="text-xs font-black uppercase tracking-[0.2em]">Diseño de Unidad</h3>
                      </div>
                      {canEdit && <button onClick={() => setIsMapModalOpen(true)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition"><Maximize2 size={16}/></button>}
                  </div>
                  <div className="h-56 relative group">
                      {plot.polygon && plot.polygon.length > 2 ? (
                          <MapEditor 
                            initialCenter={plot.coordinates} 
                            initialPolygon={plot.polygon} 
                            readOnly={true} 
                            height="100%" 
                          />
                      ) : (
                          <div className="h-full bg-slate-50 flex flex-col items-center justify-center text-gray-400 border-b">
                              <Map size={32} className="mb-2 opacity-30"/>
                              <p className="text-[10px] font-black uppercase tracking-widest">Sin delimitación GPS</p>
                              {canEdit && (
                                  <button onClick={() => setIsMapModalOpen(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Delimitar Polígono</button>
                              )}
                          </div>
                      )}
                  </div>
                  <div className="p-6 bg-white grid grid-cols-2 gap-4">
                      <div className="text-center border-r">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Superficie Real</p>
                          <p className="text-sm font-black text-gray-800">{plot.surfaceArea} {plot.surfaceUnit}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Área en M²</p>
                          <p className="text-sm font-black text-gray-800">
                              {plot.surfaceUnit === 'ha' ? (plot.surfaceArea || 0) * 10000 : plot.surfaceArea} m²
                          </p>
                      </div>
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
                            <tbody className="divide-y divide-gray-100">
                                {history.length === 0 ? ( <tr><td colSpan={5} className="p-12 text-center text-gray-300 italic font-medium">No hay monitoreos registrados.</td></tr> ) : history.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                        <td className="px-8 py-5 font-black text-gray-800">{r.date} <span className="block text-[10px] text-gray-400 font-normal">{r.time || '--:--'}</span></td>
                                        <td className="px-8 py-5"><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border bg-green-50 text-green-700 border-green-100">{r.stage}</span></td>
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
                            <button onClick={() => setIsLogModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition flex items-center"><Camera size={16} className="mr-2"/> Agregar Nota con Foto</button>
                        </div>
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">
                            {plotLogs.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">No hay entradas en la bitácora.</div>
                            ) : plotLogs.map(log => (
                                <div key={log.id} className="relative flex items-start group">
                                    <div className="absolute left-0 w-10 h-10 bg-white border-4 border-blue-50 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                    </div>
                                    <div className="ml-14 flex-1 bg-gray-50/50 rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center"><Calendar size={12} className="text-blue-500 mr-2"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date}</span></div>
                                                <div className="flex items-center mt-0.5 opacity-60"><Clock size={10} className="text-gray-400 mr-2"/><span className="text-[10px] font-bold text-gray-500">{log.time || '--:--'}</span></div>
                                            </div>
                                            {isAdmin && <button onClick={() => window.confirm("¿Borrar?") && deleteLog(log.id)} className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium mb-5">{log.note}</p>
                                        {log.photoUrl && <div className="relative rounded-2xl overflow-hidden border border-gray-200 max-w-sm cursor-zoom-in" onClick={() => setPreviewPhoto(log.photoUrl!)}><img src={log.photoUrl} className="w-full h-auto object-cover" /></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* MAP MODAL - PARCELA / UNIT EDITOR */}
      {isMapModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50">
                      <div className="flex items-center">
                          <Globe size={24} className="text-blue-600 mr-3"/>
                          <div>
                              <h2 className="font-black text-gray-800 uppercase text-sm tracking-widest">Delimitación de Unidad Experimental</h2>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Establecimiento: {location?.name}</p>
                          </div>
                      </div>
                      <button onClick={() => setIsMapModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={24}/></button>
                  </div>
                  <div className="flex-1 relative">
                      <MapEditor 
                        initialCenter={plot.coordinates || location?.coordinates}
                        initialPolygon={plot.polygon || []}
                        referencePolygon={location?.polygon || []}
                        onPolygonChange={(poly, area, center, perimeter) => {
                            setTempPolygon(poly);
                            setTempArea(Number(area.toFixed(4)));
                            setTempCoords(center);
                        }}
                        height="100%"
                      />
                  </div>
                  <div className="px-8 py-6 border-t bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex gap-8">
                          <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Superficie Calculada</p>
                              <p className="text-xl font-black text-blue-600">{tempArea} ha</p>
                          </div>
                          <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Área Equivalente</p>
                              <p className="text-xl font-black text-hemp-600">{(tempArea * 10000).toFixed(0)} m²</p>
                          </div>
                      </div>
                      <div className="flex space-x-3">
                          <button onClick={() => setIsMapModalOpen(false)} className="px-8 py-3 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-200 rounded-2xl transition">Descartar</button>
                          <button onClick={handleSaveMap} disabled={tempPolygon.length < 3 || isSaving} className="px-10 py-3 bg-hemp-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition flex items-center">
                              {isSaving ? <RefreshCw className="animate-spin mr-2" size={16}/> : <Save className="mr-2" size={16}/>}
                              Guardar Geometría
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* RECORD MODAL */}
      {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                   <div className="px-8 py-6 border-b flex justify-between bg-gray-50 items-center sticky top-0 z-20">
                       <h2 className="font-black text-gray-800 uppercase text-xs tracking-widest">{isViewMode ? 'Ficha de Monitoreo' : (editingRecordId ? 'Editar Registro' : 'Nueva Medición')}</h2>
                       <button onClick={() => setIsRecordModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={24}/></button>
                   </div>
                   <div className="p-8">
                       <form onSubmit={handleSaveRecord} className="space-y-10">
                           <section>
                               <h3 className="text-xs font-black text-hemp-600 uppercase tracking-widest mb-4 flex items-center border-b pb-2"><Clock size={14} className="mr-2"/> Datos Generales</h3>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div><label className={labelClass}>Fecha</label><input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                                   <div><label className={labelClass}>Hora</label><input type="time" required disabled={isViewMode} className={inputStyle} value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})}/></div>
                                   <div><label className={labelClass}>Etapa</label><select disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                               </div>
                           </section>
                           <section>
                               <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center border-b pb-2"><Sprout size={14} className="mr-2"/> Fenología</h3>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div><label className={labelClass}>Réplica</label><input type="number" disabled={isViewMode} className={inputStyle} value={recordForm.replicate} onChange={e => setRecordForm({...recordForm, replicate: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Plantas/m</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantsPerMeter} onChange={e => setRecordForm({...recordForm, plantsPerMeter: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Vigor %</label><input type="number" max="100" disabled={isViewMode} className={inputStyle} value={recordForm.vigor} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})}/></div>
                                   <div><label className={labelClass}>Altura cm</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                               </div>
                           </section>
                           <div className="flex justify-between pt-8 border-t">
                               {isAdmin && editingRecordId && <button type="button" onClick={handleDeleteRecord} className="px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-widest transition">Eliminar</button>}
                               <div className="flex space-x-3 ml-auto">
                                   <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-8 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl transition">Cerrar</button>
                                   {!isViewMode && <button type="submit" disabled={isSaving} className="px-10 py-2.5 bg-hemp-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition flex items-center">{isSaving && <RefreshCw className="animate-spin mr-2" size={16}/>} Guardar</button>}
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
                    <div className="px-8 py-6 bg-blue-600 text-white flex justify-between items-center"><h2 className="font-black uppercase text-xs tracking-widest flex items-center"><Camera size={18} className="mr-2"/> Nota de Campo</h2><button onClick={() => setIsLogModalOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition"><X size={24}/></button></div>
                    <form onSubmit={handleSaveLog} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Fecha</label><input type="date" required className={inputStyle} value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} /></div>
                            <div><label className={labelClass}>Hora</label><input type="time" required className={inputStyle} value={logForm.time} onChange={e => setLogForm({...logForm, time: e.target.value})} /></div>
                        </div>
                        <div><label className="text-[10px] font-black uppercase mb-2 block text-gray-400 tracking-widest">Observación</label><textarea required className="w-full border border-gray-200 p-4 rounded-2xl bg-gray-50 font-medium min-h-[120px]" value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})}></textarea></div>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">{isUploading ? <RefreshCw className="animate-spin text-blue-500"/> : <><Camera className="text-gray-400 mb-2" size={32}/><span className="text-[10px] font-black text-gray-500 uppercase">Subir Foto</span></>}<input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/></label>
                            {logForm.photoUrl && <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-lg relative"><img src={logForm.photoUrl} className="w-full h-full object-cover" /><button type="button" onClick={() => setLogForm({...logForm, photoUrl: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><X size={12}/></button></div>}
                        </div>
                        <button type="submit" disabled={isSaving || isUploading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 flex items-center justify-center">{isSaving && <RefreshCw className="animate-spin mr-2" size={16}/>} Confirmar Entrada</button>
                    </form>
                </div>
           </div>
       )}
    </div>
  );
}
