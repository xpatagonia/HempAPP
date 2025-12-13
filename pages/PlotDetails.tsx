import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord } from '../types';
import { ArrowLeft, Activity, Scale, AlertTriangle, Camera, FileText, Calendar, MapPin, Globe, Plus, Edit2, Trash2, Download, Droplets, Wind, QrCode, Printer, CheckSquare, Sun, Eye, Loader2, Ruler, Bug, SprayCan, Tractor, FlaskConical, Tag, Clock, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import MapEditor from '../components/MapEditor';

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, logs, addLog, currentUser, tasks, seedBatches } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  
  // Seed Batch Info
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);

  // Historical Records
  const history = getPlotHistory(id!);
  const plotTasks = tasks.filter(t => t.plotId === id && t.status !== 'Completada');

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'records' | 'logs' | 'qr'>('records');

  // Weather State
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Modal State for Trial Record
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false); // New: Read-only mode

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
  
  // PERMISSIONS CHECK
  const isAssigned = plot?.responsibleIds?.includes(currentUser?.id || '');
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || (currentUser?.role === 'technician' && isAssigned);

  // Filter logs for this plot
  const plotLogs = logs.filter(l => l.plotId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Coordinate Logic: Prefer Plot specific, then Location, then null
  const displayCoordinates = plot?.coordinates || location?.coordinates;
  const isSpecificCoordinates = !!plot?.coordinates;

  // FETCH WEATHER
  useEffect(() => {
    if (displayCoordinates) {
        setWeatherLoading(true);
        // Using Open-Meteo API (No Key Required, Free)
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${displayCoordinates.lat}&longitude=${displayCoordinates.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
            .then(res => res.json())
            .then(data => {
                setWeather(data.current);
                setWeatherLoading(false);
            })
            .catch(err => {
                console.error("Weather fetch error", err);
                setWeatherLoading(false);
            });
    } else {
        setWeather(null);
    }
  }, [displayCoordinates]);

  if (!plot) return <div>Parcela no encontrada</div>;

  // --- RECORD MANAGEMENT ---

  const handleOpenRecordModal = (existing?: TrialRecord, viewOnly: boolean = false) => {
      setIsViewMode(viewOnly);
      if (existing) {
          setEditingRecordId(existing.id);
          setRecordForm(existing);
          // Auto show sections if data exists
          setShowHarvestSection(existing.stage === 'Cosecha' || !!existing.yield || !!existing.stemWeight || !!existing.freshWeight);
          setShowAppSection(!!existing.applicationType || !!existing.applicationProduct);
      } else {
          setEditingRecordId(null);
          setRecordForm({
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().substring(0, 5),
              stage: 'Vegetativo',
              plantHeight: 0, vigor: 3, uniformity: 3,
              stemDiameter: 0, nodesCount: 0
          });
          setShowHarvestSection(false);
          setShowAppSection(false);
      }
      setIsRecordModalOpen(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
      e.preventDefault();
      if (isViewMode) return; // Guard
      
      const payload: any = {
          ...recordForm,
          plotId: plot.id,
          stage: showHarvestSection ? 'Cosecha' : recordForm.stage,
          createdBy: editingRecordId ? recordForm.createdBy : currentUser?.id, // Keep original creator if editing
          createdByName: editingRecordId ? recordForm.createdByName : currentUser?.name // Keep original name
      };

      if (!showAppSection) {
          payload.applicationType = null;
          payload.applicationProduct = null;
          payload.applicationDose = null;
      }

      if (editingRecordId) {
          updateTrialRecord({ ...payload, id: editingRecordId });
      } else {
          addTrialRecord({ ...payload, id: Date.now().toString() });
      }
      setIsRecordModalOpen(false);
  };

  const handleDeleteRecord = (recordId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("¿Estás seguro de eliminar este registro técnico?")) {
          deleteTrialRecord(recordId);
      }
  };

  const handleExportHistory = () => {
    const data = history.map(h => ({
        Fecha: h.date,
        Hora: h.time || '-',
        Responsable: h.createdByName || '-',
        Etapa: h.stage,
        'Altura (cm)': h.plantHeight || '-',
        'Aplicación': h.applicationProduct ? `${h.applicationType}: ${h.applicationProduct} (${h.applicationDose})` : '-',
        Vigor: h.vigor || '-',
        Plagas: h.pests || '-',
        Enfermedades: h.diseases || '-',
        'Peso Fresco Total': h.freshWeight || '-',
        'Rendimiento Calc': h.yield || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Historial_${plot.name}`);
    XLSX.writeFile(wb, `Historial_${plot.name}.xlsx`);
  };

  // --- LOG MANAGEMENT ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLogImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newLogNote) return;

    addLog({
      id: Date.now().toString(),
      plotId: plot.id,
      date: newLogDate,
      note: newLogNote,
      photoUrl: newLogImage
    });

    setNewLogNote('');
    setNewLogImage(undefined);
  };

  const getStageStyle = (stage: string) => {
    switch(stage) {
      case 'Emergencia': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Vegetativo': return 'bg-green-100 text-green-800 border-green-200';
      case 'Floración': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Maduración': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cosecha': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Dynamic input styling based on view mode
  const getInputClass = (isSmall = false) => {
      const base = "w-full border rounded text-gray-900 focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";
      const size = isSmall ? "p-2 text-sm h-10" : "p-2";
      const state = isViewMode ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed" : "bg-white border-gray-300";
      return `${base} ${size} ${state}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft size={16} className="mr-1" /> Volver a la Planilla
        </Link>
        {!canEdit && (
            <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                <AlertTriangle size={12} className="mr-1" /> Modo Solo Lectura
            </span>
        )}
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Main Info */}
          <div className="p-5 lg:col-span-2 space-y-4">
             <div className="flex justify-between items-start">
                 <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">{plot.name}</h1>
                        {plot.type === 'Producción' ? (
                            <span className="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center">
                                <Tractor size={12} className="mr-1"/> Producción
                            </span>
                        ) : (
                             <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center">
                                <FlaskConical size={12} className="mr-1"/> Ensayo
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">{variety?.name} • {location?.name}</p>
                 </div>
                 
                 {/* WEATHER WIDGET */}
                 <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 min-w-[200px]">
                    {weatherLoading ? (
                        <div className="flex items-center justify-center py-2 text-blue-400">
                            <Loader2 className="animate-spin mr-2" size={18} /> <span className="text-xs">Cargando clima...</span>
                        </div>
                    ) : weather ? (
                        <div className="flex space-x-4">
                            <div className="text-center px-2 border-r border-blue-200">
                                <div className="flex items-center justify-center text-blue-600 mb-1"><Sun size={18}/></div>
                                <span className="block text-sm font-bold text-gray-800">{weather.temperature_2m}°C</span>
                            </div>
                            <div className="text-center px-2 border-r border-blue-200">
                                <div className="flex items-center justify-center text-blue-600 mb-1"><Droplets size={18}/></div>
                                <span className="block text-sm font-bold text-gray-800">{weather.relative_humidity_2m}%</span>
                            </div>
                            <div className="text-center px-2">
                                <div className="flex items-center justify-center text-blue-600 mb-1"><Wind size={18}/></div>
                                <span className="block text-sm font-bold text-gray-800">{weather.wind_speed_10m} km/h</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-2 text-blue-400 text-xs">
                           {displayCoordinates ? 'No disponible' : 'Sin Coordenadas'}
                        </div>
                    )}
                 </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Bloque / Rep</span>
                    <p className="text-lg font-mono text-gray-800">{plot.block} / {plot.replicate}</p>
                </div>
                <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Fecha Siembra</span>
                    <p className="text-gray-800">{plot.sowingDate}</p>
                </div>
                <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Superficie</span>
                    <p className="text-gray-800 font-medium">
                        {plot.surfaceArea ? `${plot.surfaceArea} ${plot.surfaceUnit}` : '-'}
                    </p>
                </div>
                 <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Origen Genética</span>
                    <p className="text-gray-800 font-medium flex items-center">
                        {seedBatch ? (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 text-xs font-mono">
                                LOTE: {seedBatch.batchCode}
                            </span>
                        ) : (
                            <span className="text-gray-400 italic text-xs">Sin traza</span>
                        )}
                    </p>
                    {seedBatch && (
                        <span className="text-[10px] text-gray-500">{seedBatch.supplierName}</span>
                    )}
                </div>
                 <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Coordenadas</span>
                     {displayCoordinates ? (
                        <p className="text-gray-800 text-sm flex items-center mt-1">
                            <MapPin size={14} className={`mr-1 ${isSpecificCoordinates ? 'text-blue-600' : 'text-gray-400'}`} />
                            {displayCoordinates.lat.toFixed(5)}, {displayCoordinates.lng.toFixed(5)}
                        </p>
                     ) : (
                         <p className="text-gray-400 text-sm italic">Sin datos</p>
                     )}
                </div>
            </div>

            {plotTasks.length > 0 && (
                <div className="mt-4 bg-orange-50 border border-orange-100 p-3 rounded-lg">
                    <h4 className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center">
                        <CheckSquare size={12} className="mr-1"/> Tareas Pendientes ({plotTasks.length})
                    </h4>
                    <ul className="text-sm space-y-1">
                        {plotTasks.map(t => (
                            <li key={t.id} className="flex items-center text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>
                                {t.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          {/* Interactive Map */}
          <div className="h-64 lg:h-auto border-t lg:border-t-0 lg:border-l border-gray-200">
              {displayCoordinates || (plot.polygon && plot.polygon.length > 0) ? (
                 <MapEditor 
                    initialPolygon={plot.polygon}
                    initialCenter={displayCoordinates}
                    readOnly={true}
                    height="100%"
                 />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 flex-col bg-gray-50">
                  <Globe size={32} className="mb-2 opacity-50" />
                  <span className="text-sm">Sin mapa disponible</span>
                  <span className="text-xs text-gray-400">(Faltan coordenadas)</span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('records')} className={`${activeTab === 'records' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}>
                  Registros Técnicos
              </button>
              <button onClick={() => setActiveTab('logs')} className={`${activeTab === 'logs' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0`}>
                  Bitácora y Fotos
              </button>
              <button onClick={() => setActiveTab('qr')} className={`${activeTab === 'qr' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}>
                  <QrCode size={16} className="mr-1"/> Identificación QR
              </button>
          </nav>
      </div>

      {/* --- CONTENT TABS --- */}
      
      {/* 1. RECORDS TAB */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center">
                    <Activity className="text-hemp-600 mr-2" size={20} />
                    <h2 className="font-bold text-gray-900">Historial</h2>
                </div>
                <div className="flex space-x-2">
                    <button onClick={handleExportHistory} className="text-gray-600 hover:text-hemp-600 px-3 py-1 rounded border border-gray-300 hover:bg-white transition flex items-center text-sm">
                        <Download size={14} className="mr-1" /> Excel
                    </button>
                    {canEdit && (
                        <button onClick={() => handleOpenRecordModal()} className="bg-hemp-600 text-white px-3 py-1 rounded hover:bg-hemp-700 transition flex items-center text-sm font-medium shadow-sm">
                            <Plus size={16} className="mr-1" /> Nuevo Registro
                        </button>
                    )}
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha/Hora</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Responsable</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Etapa</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Altura</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Aplicaciones</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Observaciones</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">No hay registros cargados aún.</td>
                            </tr>
                        ) : (
                            history.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => handleOpenRecordModal(r, true)}>
                                    <td className="px-4 py-3 text-gray-900 font-medium">
                                        <div className="flex flex-col">
                                            <span>{r.date}</span>
                                            {r.time && <span className="text-xs text-gray-400 flex items-center"><Clock size={10} className="mr-1"/> {r.time}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {r.createdByName ? (
                                            <span className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                                <UserCheck size={10} className="mr-1 text-gray-500"/> {r.createdByName}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${getStageStyle(r.stage)}`}>
                                            {r.stage}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {r.applicationProduct ? (
                                            <span className="flex items-center text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full text-xs border border-indigo-100 w-fit">
                                                <SprayCan size={10} className="mr-1" /> {r.applicationType}: {r.applicationProduct}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                        {[r.pests, r.diseases].filter(Boolean).join(', ') || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right flex justify-end space-x-2">
                                        {/* VIEW DETAIL (READ ONLY) BUTTON - Always Visible */}
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleOpenRecordModal(r, true); }} 
                                          className="text-blue-500 hover:bg-blue-50 p-1 rounded transition-colors" 
                                          title="Ver Detalle Completo"
                                        >
                                            <Eye size={16} />
                                        </button>

                                        {canEdit && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenRecordModal(r, false); }} className="text-gray-500 hover:text-hemp-600 hover:bg-gray-100 p-1 rounded transition-colors" title="Editar">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={(e) => handleDeleteRecord(r.id, e)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors" title="Eliminar">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* 2. LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 overflow-hidden">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center">
                <FileText className="text-amber-600 mr-2" size={20} />
                <h2 className="font-bold text-amber-900">Bitácora de Campo (Fotos y Notas)</h2>
            </div>
         
            <div className="p-6">
                {/* Log Input Form */}
                {canEdit && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Nuevo Registro de Bitácora</h3>
                        <form onSubmit={handleAddLog}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                                    <Calendar size={12} className="mr-1" />
                                    Fecha
                                    </label>
                                    <input 
                                    type="date" 
                                    required 
                                    className={`${getInputClass(true)} cursor-pointer`} 
                                    value={newLogDate} 
                                    onChange={e => setNewLogDate(e.target.value)} 
                                    onClick={(e) => {
                                        try { e.currentTarget.showPicker(); } catch (error) {}
                                    }}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Observación</label>
                                    <input type="text" required placeholder="Ej: Aparición de primeras flores..." className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={newLogNote} onChange={e => setNewLogNote(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-white border border-gray-300 py-2 px-3 rounded text-sm hover:bg-gray-100 transition text-gray-600 shadow-sm">
                                        <Camera size={16} />
                                        <span>{newLogImage ? 'Cambiar Foto' : 'Adjuntar Foto'}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition shadow-sm">
                                    Agregar a Bitácora
                                </button>
                            </div>
                            {newLogImage && (
                                <div className="mt-3">
                                    <span className="text-xs text-gray-500 block mb-1">Vista Previa:</span>
                                    <img src={newLogImage} alt="Preview" className="h-24 w-auto rounded border" />
                                </div>
                            )}
                        </form>
                    </div>
                )}

                {/* Logs Timeline */}
                <div className="space-y-6">
                    {plotLogs.length === 0 ? (
                        <p className="text-gray-400 text-center py-4 italic">No hay registros de bitácora aún.</p>
                    ) : (
                        plotLogs.map(log => (
                            <div key={log.id} className="flex space-x-4 group">
                                <div className="flex flex-col items-center">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-2"></div>
                                    <div className="w-0.5 flex-1 bg-gray-100 my-1 group-last:hidden"></div>
                                </div>
                                <div className="pb-6 flex-1">
                                    <div className="flex items-baseline space-x-2 mb-1">
                                        <span className="text-sm font-bold text-gray-800 flex items-center">
                                            <Calendar size={14} className="mr-1 text-gray-400"/>
                                            {log.date}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 text-sm bg-white p-3 border border-gray-200 rounded-lg shadow-sm inline-block min-w-[50%]">
                                        {log.note}
                                    </p>
                                    {log.photoUrl && (
                                        <div className="mt-2">
                                            <img src={log.photoUrl} alt="Log evidence" className="h-32 w-auto rounded-lg shadow-sm border hover:scale-105 transition-transform cursor-pointer" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 3. QR CODE TAB */}
      {activeTab === 'qr' && (
          <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 p-8 flex flex-col items-center justify-center text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Etiqueta de Campo</h2>
              <p className="text-gray-500 text-sm mb-6 max-w-md">Escanea este código para acceder directamente a la ficha de carga de datos de esta parcela.</p>
              
              <div className="bg-white p-4 border-2 border-gray-900 rounded-xl shadow-lg mb-6">
                  {/* Using QR Server API for easy generation without extra libraries */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} 
                    alt="QR Parcela" 
                    className="w-48 h-48"
                  />
                  <div className="mt-2 font-mono text-lg font-bold text-gray-900">{plot.name}</div>
              </div>

              <button onClick={() => window.print()} className="flex items-center space-x-2 bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition shadow-lg">
                  <Printer size={20} />
                  <span>Imprimir Etiqueta</span>
              </button>
          </div>
      )}

       {/* --- MODAL FOR TRIAL RECORD (FORM & VIEW) --- */}
       {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                   <div className="p-6">
                       <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 flex justify-between items-center">
                           {isViewMode ? 'Detalle de Registro' : (editingRecordId ? 'Editar Registro' : 'Nuevo Registro Técnico')}
                           {isViewMode && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded border">Solo Lectura</span>}
                       </h2>
                       
                       <form onSubmit={handleSaveRecord} className="space-y-6">
                           
                           {/* Common Data */}
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                               <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                     <Calendar size={14} className="mr-1 text-hemp-600"/>
                                     Fecha
                                   </label>
                                   <input 
                                     type="date" 
                                     required 
                                     disabled={isViewMode}
                                     className={`${getInputClass()} cursor-pointer`} 
                                     value={recordForm.date} 
                                     onChange={e => setRecordForm({...recordForm, date: e.target.value})} 
                                     onClick={(e) => { !isViewMode && e.currentTarget.showPicker() }}
                                    />
                               </div>
                               <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                     <Clock size={14} className="mr-1 text-hemp-600"/>
                                     Hora
                                   </label>
                                   <input 
                                     type="time" 
                                     required 
                                     disabled={isViewMode}
                                     className={`${getInputClass()} cursor-pointer`} 
                                     value={recordForm.time} 
                                     onChange={e => setRecordForm({...recordForm, time: e.target.value})} 
                                    />
                               </div>
                               <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1">Etapa Fenológica</label>
                                   <select disabled={isViewMode} className={getInputClass()} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}>
                                       <option value="Emergencia">Emergencia</option>
                                       <option value="Vegetativo">Vegetativo</option>
                                       <option value="Floración">Floración</option>
                                       <option value="Maduración">Maduración</option>
                                       <option value="Cosecha">Cosecha</option>
                                   </select>
                               </div>
                               <div className="flex items-end">
                                    <label className={`flex items-center space-x-2 bg-gray-100 p-2 rounded w-full border ${showHarvestSection ? 'border-green-300 bg-green-50' : 'border-gray-200'} ${!isViewMode && 'cursor-pointer'}`}>
                                        <input disabled={isViewMode} type="checkbox" className="h-4 w-4 text-hemp-600 rounded" checked={showHarvestSection} onChange={e => setShowHarvestSection(e.target.checked)} />
                                        <span className="text-sm font-medium text-gray-700">Incluir Datos Cosecha</span>
                                    </label>
                               </div>
                           </div>
                           
                           {/* Toggle Application Section */}
                           <div className="flex items-center">
                                <label className={`flex items-center space-x-2 bg-indigo-50 p-2 rounded w-full md:w-auto border ${showAppSection ? 'border-indigo-300' : 'border-indigo-100'} ${!isViewMode && 'cursor-pointer'}`}>
                                    <input disabled={isViewMode} type="checkbox" className="h-4 w-4 text-indigo-600 rounded" checked={showAppSection} onChange={e => setShowAppSection(e.target.checked)} />
                                    <span className="text-sm font-bold text-indigo-800 flex items-center">
                                        <SprayCan size={14} className="mr-2"/>
                                        Registrar Aplicación (Insumos)
                                    </span>
                                </label>
                           </div>

                           {/* Section 0: Applications (Conditional) */}
                           {showAppSection && (
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center">
                                        <SprayCan size={16} className="mr-1"/> Detalle de Aplicación
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Insumo</label>
                                            <select disabled={isViewMode} className={getInputClass(true)} value={recordForm.applicationType || ''} onChange={e => setRecordForm({...recordForm, applicationType: e.target.value as any})}>
                                                <option value="">Seleccionar...</option>
                                                <option value="Fertilizante">Fertilizante</option>
                                                <option value="Insecticida">Insecticida</option>
                                                <option value="Fungicida">Fungicida</option>
                                                <option value="Herbicida">Herbicida</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Producto Comercial</label>
                                            <input disabled={isViewMode} type="text" placeholder="Ej: Urea, Abamectina..." className={getInputClass(true)} value={recordForm.applicationProduct || ''} onChange={e => setRecordForm({...recordForm, applicationProduct: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Dosis Aplicada</label>
                                            <input disabled={isViewMode} type="text" placeholder="Ej: 5 l/ha, 200 cc/100l" className={getInputClass(true)} value={recordForm.applicationDose || ''} onChange={e => setRecordForm({...recordForm, applicationDose: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                           )}

                           {/* Section 1: Biometry & Development */}
                           <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                               <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center"><Ruler size={16} className="mr-1"/> Biometría y Desarrollo</h3>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">Altura Planta (cm)</label>
                                       <input disabled={isViewMode} type="number" className={getInputClass(true)} value={recordForm.plantHeight || ''} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">Diámetro Tallo (mm)</label>
                                       <input disabled={isViewMode} type="number" step="0.1" className={getInputClass(true)} value={recordForm.stemDiameter || ''} onChange={e => setRecordForm({...recordForm, stemDiameter: Number(e.target.value)})} />
                                   </div>
                                    <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">Vigor (1-5)</label>
                                       <input disabled={isViewMode} type="number" max="5" min="1" className={getInputClass(true)} value={recordForm.vigor || ''} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">Uniformidad (1-5)</label>
                                       <input disabled={isViewMode} type="number" max="5" min="1" className={getInputClass(true)} value={recordForm.uniformity || ''} onChange={e => setRecordForm({...recordForm, uniformity: Number(e.target.value)})} />
                                   </div>
                               </div>

                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                   <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">Estado Floración</label>
                                        <select disabled={isViewMode} className={getInputClass(true)} value={recordForm.floweringState || ''} onChange={e => setRecordForm({...recordForm, floweringState: e.target.value as any})}>
                                            <option value="">-</option>
                                            <option value="Pre-flor">Pre-flor</option>
                                            <option value="Floración">Floración</option>
                                            <option value="Senescencia">Senescencia</option>
                                        </select>
                                   </div>
                                    <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">Tricomas (Madurez)</label>
                                        <select disabled={isViewMode} className={getInputClass(true)} value={recordForm.trichomeColor || ''} onChange={e => setRecordForm({...recordForm, trichomeColor: e.target.value as any})}>
                                            <option value="">-</option>
                                            <option value="Transparente">Transparente</option>
                                            <option value="Lechoso">Lechoso</option>
                                            <option value="Mixto">Mixto</option>
                                            <option value="Ambar">Ambar</option>
                                        </select>
                                   </div>
                                    <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">N° Nudos Promedio</label>
                                       <input disabled={isViewMode} type="number" className={getInputClass(true)} value={recordForm.nodesCount || ''} onChange={e => setRecordForm({...recordForm, nodesCount: Number(e.target.value)})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-medium text-gray-500 mb-1">N° Plantas/m (Actual)</label>
                                       <input disabled={isViewMode} type="number" className={getInputClass(true)} value={recordForm.plantsPerMeterInit || ''} onChange={e => setRecordForm({...recordForm, plantsPerMeterInit: Number(e.target.value)})} />
                                   </div>
                               </div>
                           </div>

                           {/* Section 2: Health */}
                           <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center"><Bug size={16} className="mr-1"/> Sanidad Vegetal</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Plagas Detectadas</label>
                                        <input disabled={isViewMode} type="text" placeholder="Ej: Arañuela, Pulgón..." className={getInputClass(true)} value={recordForm.pests || ''} onChange={e => setRecordForm({...recordForm, pests: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Enfermedades / Hongos</label>
                                        <input disabled={isViewMode} type="text" placeholder="Ej: Fusarium, Oidio..." className={getInputClass(true)} value={recordForm.diseases || ''} onChange={e => setRecordForm({...recordForm, diseases: e.target.value})} />
                                    </div>
                               </div>
                           </div>

                           {/* Section 3: Harvest (Conditional) */}
                           {showHarvestSection && (
                               <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                   <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center"><Scale size={16} className="mr-1"/> Datos de Cosecha y Rendimiento</h3>
                                   
                                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                       <div>
                                           <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                                             <Calendar size={12} className="mr-1"/> Fecha Cosecha
                                           </label>
                                           <input 
                                              type="date" 
                                              disabled={isViewMode}
                                              className={`${getInputClass(true)} cursor-pointer`} 
                                              value={recordForm.harvestDate || ''} 
                                              onChange={e => setRecordForm({...recordForm, harvestDate: e.target.value})}
                                              onClick={(e) => { !isViewMode && e.currentTarget.showPicker() }}
                                            />
                                       </div>
                                       <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Tamaño Muestra (m²)</label>
                                            <input disabled={isViewMode} type="number" step="0.1" className={getInputClass(true)} value={recordForm.sampleSize || ''} onChange={e => setRecordForm({...recordForm, sampleSize: Number(e.target.value)})} />
                                       </div>
                                       <div className="bg-white p-2 rounded border border-green-200">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Peso Fresco Total (kg)</label>
                                            <input disabled={isViewMode} type="number" step="0.01" className={getInputClass(true)} value={recordForm.freshWeight || ''} onChange={e => setRecordForm({...recordForm, freshWeight: Number(e.target.value)})} />
                                       </div>
                                       <div className="bg-white p-2 rounded border border-green-200">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Peso Seco Total (kg)</label>
                                            <input disabled={isViewMode} type="number" step="0.01" className={getInputClass(true)} value={recordForm.dryWeight || ''} onChange={e => setRecordForm({...recordForm, dryWeight: Number(e.target.value)})} />
                                       </div>
                                   </div>

                                   <div className="grid grid-cols-3 gap-4 border-t border-green-200 pt-4">
                                        <div>
                                           <label className="block text-xs font-medium text-gray-500 mb-1">Peso Flor (g/pl)</label>
                                           <input disabled={isViewMode} type="number" step="0.1" className={getInputClass(true)} value={recordForm.flowerWeight || ''} onChange={e => setRecordForm({...recordForm, flowerWeight: Number(e.target.value)})} />
                                       </div>
                                       <div>
                                           <label className="block text-xs font-medium text-gray-500 mb-1">Peso Tallo (g/pl)</label>
                                           <input disabled={isViewMode} type="number" step="0.1" className={getInputClass(true)} value={recordForm.stemWeight || ''} onChange={e => setRecordForm({...recordForm, stemWeight: Number(e.target.value)})} />
                                       </div>
                                       <div>
                                           <label className="block text-xs font-medium text-gray-500 mb-1">Peso Hoja (g/pl)</label>
                                           <input disabled={isViewMode} type="number" step="0.1" className={getInputClass(true)} value={recordForm.leafWeight || ''} onChange={e => setRecordForm({...recordForm, leafWeight: Number(e.target.value)})} />
                                       </div>
                                   </div>
                                   
                                   <div className="mt-4 pt-3 border-t border-green-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500">Rendimiento Estimado (Calculado si hay Muestra y P.Fresco):</span>
                                            <span className="text-lg font-bold text-green-700">
                                                {recordForm.freshWeight && recordForm.sampleSize 
                                                    ? `${((recordForm.freshWeight / recordForm.sampleSize) * 10000).toFixed(0)} kg/ha` 
                                                    : recordForm.yield 
                                                        ? `${recordForm.yield} kg/ha (Manual)` 
                                                        : '-'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 italic">
                                            Si se ingresa P. Fresco y Tamaño Muestra, el cálculo es automático. Sino, ingresar manual abajo.
                                        </div>
                                        {!recordForm.sampleSize && (
                                            <div className="mt-2">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Rendimiento Manual (kg/ha)</label>
                                                <input disabled={isViewMode} type="number" className={getInputClass(true)} value={recordForm.yield || ''} onChange={e => setRecordForm({...recordForm, yield: Number(e.target.value)})} />
                                            </div>
                                        )}
                                   </div>
                               </div>
                           )}

                           <div className="flex justify-end space-x-3 pt-4 border-t">
                               <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                   {isViewMode ? 'Cerrar' : 'Cancelar'}
                               </button>
                               {!isViewMode && (
                                   <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-medium">
                                       {editingRecordId ? 'Guardar Cambios' : 'Firmar y Registrar'}
                                   </button>
                               )}
                           </div>
                       </form>
                   </div>
               </div>
           </div>
       )}

    </div>
  );
}