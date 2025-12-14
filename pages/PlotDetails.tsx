
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Resource, Task } from '../types';
import { ArrowLeft, Activity, Scale, AlertTriangle, Camera, FileText, Calendar, MapPin, Globe, Plus, Edit2, Trash2, Download, Droplets, Wind, QrCode, Printer, CheckSquare, Sun, Eye, Loader2, Ruler, Bug, SprayCan, Tractor, FlaskConical, Tag, Clock, UserCheck, DollarSign, Package, Archive } from 'lucide-react';
import * as XLSX from 'xlsx';
import MapEditor from '../components/MapEditor';

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, logs, addLog, currentUser, tasks, seedBatches, resources, addTask, updateTask, deleteTask } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  const history = getPlotHistory(id!);
  
  // Filter active tasks
  const plotTasks = tasks.filter(t => t.plotId === id);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'records' | 'logs' | 'planning' | 'qr'>('records');

  // Weather State
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Modal State for Trial Record
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false); // New: Read-only mode

  // Plan/Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<Task>>({
      title: '', status: 'Pendiente', priority: 'Media', dueDate: new Date().toISOString().split('T')[0],
      resourceId: '', resourceQuantity: 0
  });

  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().substring(0, 5), // Default to current time HH:MM
      stage: 'Vegetativo',
      plantHeight: 0, vigor: 3, uniformity: 3
  });
  const [showHarvestSection, setShowHarvestSection] = useState(false);
  const [showAppSection, setShowAppSection] = useState(false);

  // Log States
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLogImage, setNewLogImage] = useState<string | undefined>(undefined);
  
  const isAssigned = plot?.responsibleIds?.includes(currentUser?.id || '');
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || ((currentUser?.role === 'technician' || currentUser?.role === 'client') && isAssigned);
  const plotLogs = logs.filter(l => l.plotId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const displayCoordinates = plot?.coordinates || location?.coordinates;
  const isSpecificCoordinates = !!plot?.coordinates;

  useEffect(() => {
    if (displayCoordinates) {
        setWeatherLoading(true);
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${displayCoordinates.lat}&longitude=${displayCoordinates.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
            .then(res => res.json())
            .then(data => { setWeather(data.current); setWeatherLoading(false); })
            .catch(err => { console.error(err); setWeatherLoading(false); });
    }
  }, [displayCoordinates]);

  if (!plot) return <div>Parcela no encontrada</div>;

  // --- RECORD MANAGEMENT ---
  const handleOpenRecordModal = (existing?: TrialRecord, viewOnly: boolean = false) => {
      setIsViewMode(viewOnly);
      if (existing) {
          setEditingRecordId(existing.id);
          setRecordForm(existing);
          setShowHarvestSection(existing.stage === 'Cosecha' || !!existing.yield || !!existing.freshWeight);
          setShowAppSection(!!existing.applicationType || !!existing.applicationProduct);
      } else {
          setEditingRecordId(null);
          setRecordForm({
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().substring(0, 5),
              stage: 'Vegetativo',
              plantHeight: 0, vigor: 3, uniformity: 3
          });
          setShowHarvestSection(false); setShowAppSection(false);
      }
      setIsRecordModalOpen(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
      e.preventDefault();
      if (isViewMode) return; 
      const payload: any = {
          ...recordForm,
          plotId: plot.id,
          stage: showHarvestSection ? 'Cosecha' : recordForm.stage,
          createdBy: editingRecordId ? recordForm.createdBy : currentUser?.id,
          createdByName: editingRecordId ? recordForm.createdByName : currentUser?.name
      };
      if (editingRecordId) updateTrialRecord({ ...payload, id: editingRecordId });
      else addTrialRecord({ ...payload, id: Date.now().toString() });
      setIsRecordModalOpen(false);
  };

  const handleDeleteRecord = (recordId: string, e: React.MouseEvent) => { e.stopPropagation(); if (window.confirm("¿Eliminar?")) deleteTrialRecord(recordId); };

  // --- PLAN & TASK MANAGEMENT ---
  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      if(!taskForm.title) return;
      
      // Calculate Cost
      let cost = 0;
      if (taskForm.resourceId && taskForm.resourceQuantity) {
          const res = resources.find(r => r.id === taskForm.resourceId);
          if (res) cost = res.costPerUnit * taskForm.resourceQuantity;
      }

      const payload = { ...taskForm, resourceCost: cost, plotId: plot.id, assignedToIds: currentUser ? [currentUser.id] : [] };
      if(taskForm.id) updateTask(payload as Task);
      else addTask({ ...payload as Task, id: Date.now().toString(), createdBy: currentUser?.id || 'sys' });
      
      setIsTaskModalOpen(false);
      setTaskForm({ title: '', status: 'Pendiente', priority: 'Media', dueDate: new Date().toISOString().split('T')[0] });
  };

  const calculateTotalCost = () => {
      return plotTasks.reduce((sum, t) => sum + (t.resourceCost || 0), 0);
  };

  // --- LOG MANAGEMENT ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setNewLogImage(reader.result as string); reader.readAsDataURL(file); }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newLogNote) return;
    addLog({ id: Date.now().toString(), plotId: plot.id, date: newLogDate, note: newLogNote, photoUrl: newLogImage });
    setNewLogNote(''); setNewLogImage(undefined);
  };

  const getStageStyle = (stage: string) => {
    switch(stage) {
      case 'Vegetativo': return 'bg-green-100 text-green-800 border-green-200';
      case 'Floración': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Cosecha': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getInputClass = (isSmall = false) => {
      const base = "w-full border rounded text-gray-900 focus:ring-2 focus:ring-hemp-500 outline-none";
      return `${base} ${isSmall ? "p-2 text-sm" : "p-2"} ${isViewMode ? "bg-gray-100" : "bg-white"}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft size={16} className="mr-1" /> Volver a la Planilla
        </Link>
        {!canEdit && <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-semibold">Solo Lectura</span>}
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="p-5 lg:col-span-2 space-y-4">
             <div className="flex justify-between items-start">
                 <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">{plot.name}</h1>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center ${plot.type === 'Producción' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {plot.type}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">{variety?.name} • {location?.name}</p>
                 </div>
                 
                 {/* WEATHER */}
                 <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 min-w-[200px]">
                    {weatherLoading ? <Loader2 className="animate-spin text-blue-400 mx-auto"/> : weather ? (
                        <div className="flex space-x-4">
                            <div className="text-center px-2 border-r border-blue-200"><Sun size={18} className="text-blue-600 mx-auto"/><span className="text-sm font-bold">{weather.temperature_2m}°C</span></div>
                            <div className="text-center px-2"><Droplets size={18} className="text-blue-600 mx-auto"/><span className="text-sm font-bold">{weather.relative_humidity_2m}%</span></div>
                        </div>
                    ) : <span className="text-xs text-gray-400 block text-center">Clima no disponible</span>}
                 </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div><span className="text-xs text-gray-500 font-bold uppercase">Bloque</span><p className="text-gray-800 font-mono">{plot.block}</p></div>
                <div><span className="text-xs text-gray-500 font-bold uppercase">Siembra</span><p className="text-gray-800">{plot.sowingDate}</p></div>
                <div><span className="text-xs text-gray-500 font-bold uppercase">Superficie</span><p className="text-gray-800">{plot.surfaceArea} {plot.surfaceUnit}</p></div>
                <div><span className="text-xs text-gray-500 font-bold uppercase">Semilla</span><p className="text-gray-800 text-xs">{seedBatch?.batchCode || 'N/A'}</p></div>
            </div>
          </div>
          <div className="h-64 lg:h-auto border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50">
              {displayCoordinates ? <MapEditor initialPolygon={plot.polygon} initialCenter={displayCoordinates} readOnly={true} height="100%"/> : <div className="h-full flex items-center justify-center text-gray-400 text-xs">Sin mapa</div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('records')} className={`${activeTab === 'records' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500'} py-4 px-1 border-b-2 font-medium text-sm`}>Registros Técnicos</button>
              <button onClick={() => setActiveTab('logs')} className={`${activeTab === 'logs' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500'} py-4 px-1 border-b-2 font-medium text-sm`}>Bitácora</button>
              <button onClick={() => setActiveTab('planning')} className={`${activeTab === 'planning' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500'} py-4 px-1 border-b-2 font-medium text-sm flex items-center`}><Archive size={16} className="mr-1"/> Plan Agrícola</button>
              <button onClick={() => setActiveTab('qr')} className={`${activeTab === 'qr' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500'} py-4 px-1 border-b-2 font-medium text-sm`}>QR</button>
          </nav>
      </div>

      {/* --- CONTENT TABS --- */}
      
      {activeTab === 'records' && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-gray-900 flex items-center"><Activity className="text-hemp-600 mr-2" size={20} /> Historial</h2>
                {canEdit && <button onClick={() => handleOpenRecordModal()} className="bg-hemp-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center"><Plus size={16} className="mr-1"/> Nuevo</button>}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Etapa</th><th className="px-4 py-3 text-left">Altura</th><th className="px-4 py-3 text-left">Obs</th><th className="px-4 py-3 text-right"></th></tr></thead>
                    <tbody>
                        {history.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenRecordModal(r, true)}>
                                <td className="px-4 py-3 font-bold">{r.date}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs border ${getStageStyle(r.stage)}`}>{r.stage}</span></td>
                                <td className="px-4 py-3">{r.plantHeight} cm</td>
                                <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{r.pests || '-'}</td>
                                <td className="px-4 py-3 text-right"><Eye size={16} className="text-gray-400 inline"/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'planning' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div>
                      <h3 className="text-purple-800 font-bold text-lg">Costo Estimado Plan</h3>
                      <p className="text-purple-600 text-sm">Basado en insumos asignados</p>
                  </div>
                  <div className="text-3xl font-bold text-purple-900">${calculateTotalCost().toLocaleString()}</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="font-bold text-gray-900">Tareas y Recursos</h2>
                      {canEdit && <button onClick={() => { setTaskForm({title: '', status: 'Pendiente', priority: 'Media', dueDate: new Date().toISOString().split('T')[0]}); setIsTaskModalOpen(true); }} className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center"><Plus size={16} className="mr-1"/> Agregar Actividad</button>}
                  </div>
                  <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                          <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Actividad</th><th className="px-4 py-3 text-left">Recurso</th><th className="px-4 py-3 text-right">Cant.</th><th className="px-4 py-3 text-right">Costo Est.</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-right"></th></tr></thead>
                          <tbody>
                              {plotTasks.map(t => {
                                  const res = resources.find(r => r.id === t.resourceId);
                                  return (
                                      <tr key={t.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 font-bold text-gray-800">{t.title}</td>
                                          <td className="px-4 py-3 text-gray-600">{res ? <span className="flex items-center"><Package size={12} className="mr-1"/>{res.name}</span> : '-'}</td>
                                          <td className="px-4 py-3 text-right">{t.resourceQuantity ? `${t.resourceQuantity} ${res?.unit}` : '-'}</td>
                                          <td className="px-4 py-3 text-right font-mono text-gray-800">{t.resourceCost ? `$${t.resourceCost}` : '-'}</td>
                                          <td className="px-4 py-3 text-center">
                                              <span className={`px-2 py-0.5 rounded text-xs border ${t.status === 'Completada' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-yellow-100 border-yellow-200 text-yellow-800'}`}>
                                                  {t.status}
                                              </span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                              {canEdit && <button onClick={() => deleteTask(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* 2. LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 p-6">
            {canEdit && (
                <form onSubmit={handleAddLog} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nueva Nota</label>
                        <input type="text" className={getInputClass(true)} value={newLogNote} onChange={e => setNewLogNote(e.target.value)} />
                    </div>
                    <label className="bg-white border p-2 rounded cursor-pointer hover:bg-gray-100"><Camera size={20} className="text-gray-500"/><input type="file" className="hidden" onChange={handleImageUpload}/></label>
                    <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded text-sm font-bold">Agregar</button>
                </form>
            )}
            <div className="space-y-4">
                {plotLogs.map(log => (
                    <div key={log.id} className="flex gap-4">
                        <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-amber-400 mt-2"></div><div className="w-0.5 flex-1 bg-gray-100 my-1"></div></div>
                        <div className="pb-4">
                            <span className="text-xs font-bold text-gray-500 block">{log.date}</span>
                            <p className="text-sm text-gray-800 bg-white p-2 border rounded shadow-sm inline-block">{log.note}</p>
                            {log.photoUrl && <img src={log.photoUrl} className="mt-2 h-24 rounded border" alt="Log"/>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 3. QR TAB */}
      {activeTab === 'qr' && (
          <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 p-8 flex flex-col items-center text-center">
              <div className="bg-white p-4 border-2 border-gray-900 rounded-xl shadow-lg mb-4">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} alt="QR" className="w-48 h-48"/>
              </div>
              <button onClick={() => window.print()} className="bg-gray-800 text-white px-6 py-2 rounded font-bold flex items-center"><Printer size={18} className="mr-2"/> Imprimir</button>
          </div>
      )}

       {/* RECORD MODAL */}
       {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
                   <h2 className="text-xl font-bold mb-4">{isViewMode ? 'Detalle' : 'Registro Técnico'}</h2>
                   <form onSubmit={handleSaveRecord} className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs font-bold">Fecha</label><input type="date" disabled={isViewMode} className={getInputClass(true)} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                           <div><label className="text-xs font-bold">Etapa</label><select disabled={isViewMode} className={getInputClass(true)} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Cosecha">Cosecha</option></select></div>
                           <div><label className="text-xs font-bold">Altura (cm)</label><input disabled={isViewMode} type="number" className={getInputClass(true)} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                           <div><label className="text-xs font-bold">Vigor (1-5)</label><input disabled={isViewMode} type="number" className={getInputClass(true)} value={recordForm.vigor} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})}/></div>
                       </div>
                       
                       <div className="border-t pt-4">
                           <label className="flex items-center space-x-2 mb-2 cursor-pointer"><input type="checkbox" disabled={isViewMode} checked={showAppSection} onChange={e => setShowAppSection(e.target.checked)}/><span className="font-bold text-sm">Registrar Aplicación</span></label>
                           {showAppSection && (
                               <div className="grid grid-cols-2 gap-4 bg-indigo-50 p-3 rounded">
                                   <input disabled={isViewMode} type="text" placeholder="Producto" className={getInputClass(true)} value={recordForm.applicationProduct || ''} onChange={e => setRecordForm({...recordForm, applicationProduct: e.target.value})}/>
                                   <input disabled={isViewMode} type="text" placeholder="Dosis" className={getInputClass(true)} value={recordForm.applicationDose || ''} onChange={e => setRecordForm({...recordForm, applicationDose: e.target.value})}/>
                               </div>
                           )}
                       </div>

                       <div className="flex justify-end space-x-2 pt-4">
                           <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded text-sm">Cerrar</button>
                           {!isViewMode && <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded text-sm font-bold">Guardar</button>}
                       </div>
                   </form>
               </div>
           </div>
       )}

       {/* TASK MODAL */}
       {isTaskModalOpen && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                   <h2 className="text-xl font-bold mb-4">Nueva Actividad / Tarea</h2>
                   <form onSubmit={handleSaveTask} className="space-y-4">
                       <div><label className="text-xs font-bold">Actividad</label><input type="text" className={getInputClass(true)} value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Ej: Fertilización NPK"/></div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs font-bold">Fecha Límite</label><input type="date" className={getInputClass(true)} value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}/></div>
                           <div><label className="text-xs font-bold">Estado</label><select className={getInputClass(true)} value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as any})}><option value="Pendiente">Pendiente</option><option value="En Progreso">En Progreso</option><option value="Completada">Completada</option></select></div>
                       </div>
                       
                       <div className="bg-purple-50 p-3 rounded border border-purple-100">
                           <h3 className="text-xs font-bold text-purple-800 mb-2 uppercase">Asignar Recurso (Costo)</h3>
                           <div className="space-y-2">
                               <select className={getInputClass(true)} value={taskForm.resourceId || ''} onChange={e => setTaskForm({...taskForm, resourceId: e.target.value})}>
                                   <option value="">-- Sin Recurso --</option>
                                   {resources.map(r => <option key={r.id} value={r.id}>{r.name} (${r.costPerUnit}/{r.unit})</option>)}
                               </select>
                               {taskForm.resourceId && (
                                   <input type="number" placeholder="Cantidad a usar" className={getInputClass(true)} value={taskForm.resourceQuantity || ''} onChange={e => setTaskForm({...taskForm, resourceQuantity: Number(e.target.value)})}/>
                               )}
                           </div>
                       </div>

                       <div className="flex justify-end space-x-2 pt-4">
                           <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded text-sm">Cancelar</button>
                           <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded text-sm font-bold">Guardar</button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
}
