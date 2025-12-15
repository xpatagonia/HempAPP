
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Task, Plot } from '../types';
import { ArrowLeft, Activity, Calendar, MapPin, Globe, Plus, Trash2, Droplets, Wind, QrCode, Printer, CheckSquare, Sun, Eye, Loader2, Tractor, FlaskConical, Tag, Clock, DollarSign, Package, Archive, Sprout, X, Map, Camera, FileText, ChevronRight, TrendingUp, Settings, Save, FileUp, Ruler, Edit2 } from 'lucide-react';
import MapEditor from '../components/MapEditor';

// Helper: Robust KML Parser
const parseKML = (kmlText: string): { lat: number, lng: number }[] | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const allCoords = Array.from(xmlDoc.getElementsByTagName("coordinates"));
        
        if (allCoords.length === 0) return null;

        // Sort desc by length to find polygon first
        allCoords.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
        
        const targetNode = allCoords[0];
        const text = targetNode.textContent || "";
        const rawPoints = text.replace(/\s+/g, ' ').trim().split(' ');
        
        const latLngs = rawPoints.map(point => {
            const parts = point.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { lat, lng };
                }
            }
            return null;
        }).filter((p): p is { lat: number, lng: number } => p !== null);

        return latLngs.length >= 3 ? latLngs : null;
    } catch (e) {
        console.error("Error parsing KML", e);
        return null;
    }
};

// Helper component for KPI Cards (Redesigned)
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
        {/* Decorative circle */}
        <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full ${color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
    </div>
);

// Cycle Progress Component
const CycleGraph = ({ sowingDate, cycleDays }: { sowingDate: string, cycleDays: number }) => {
    if (!sowingDate || !cycleDays) return null;

    const start = new Date(sowingDate).getTime();
    const end = start + (cycleDays * 24 * 60 * 60 * 1000);
    const now = new Date().getTime();
    
    let progress = 0;
    if (now > start) {
        progress = ((now - start) / (end - start)) * 100;
    }
    if (progress > 100) progress = 100;
    if (progress < 0) progress = 0;

    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    const isFinished = daysLeft <= 0;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 relative overflow-hidden">
            <div className="flex justify-between items-end mb-2 relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Clock size={20} className="mr-2 text-hemp-600"/> Ciclo de Cultivo
                    </h3>
                    <p className="text-sm text-gray-500">Progreso biológico estimado según genética.</p>
                </div>
                <div className="text-right">
                    <span className={`text-2xl font-black ${isFinished ? 'text-green-600' : 'text-hemp-600'}`}>
                        {Math.round(progress)}%
                    </span>
                    <p className="text-xs text-gray-400 font-bold uppercase">Completado</p>
                </div>
            </div>

            {/* Timeline Bar */}
            <div className="h-4 bg-gray-100 rounded-full w-full relative mb-8 mt-4 overflow-hidden border border-gray-200">
                {/* Progress Fill */}
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isFinished ? 'bg-green-500' : 'bg-gradient-to-r from-hemp-400 to-hemp-600'}`} 
                    style={{ width: `${progress}%` }}
                >
                    {/* Stripes effect */}
                    <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InN0cmlwZXMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMODAgMEgwTDQwIDQwVjB6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNzdHJpcGVzKSIvPjwvc3ZnPg==')]"></div>
                </div>
                
                {/* Marker: Today */}
                {!isFinished && (
                    <div 
                        className="absolute top-0 w-1 h-full bg-black/20 backdrop-blur-sm z-20 border-l border-white/50" 
                        style={{ left: `${progress}%` }}
                    >
                        <div className="absolute -top-1 -translate-x-1/2 left-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">HOY</div>
                    </div>
                )}
            </div>

            {/* Milestones */}
            <div className="flex justify-between text-xs text-gray-500 font-medium relative z-10">
                <div className="text-left">
                    <div className="font-bold text-gray-800">Siembra</div>
                    <div>{new Date(sowingDate).toLocaleDateString()}</div>
                </div>
                
                {/* Approximate Flowering (usually 50-60% for many hemps, purely visual approx) */}
                <div className="text-center absolute left-1/2 -translate-x-1/2 hidden sm:block opacity-50">
                    <div className="font-bold">Floración (Est.)</div>
                    <div>~ Día {Math.round(cycleDays * 0.55)}</div>
                </div>

                <div className="text-right">
                    <div className="font-bold text-gray-800">Cosecha Estimada</div>
                    <div className={`${isFinished ? 'text-green-600 font-bold' : ''}`}>
                        {new Date(end).toLocaleDateString()} 
                        {!isFinished && <span className="block text-[10px] text-gray-400">({daysLeft} días restantes)</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, logs, addLog, currentUser, tasks, seedBatches, resources, addTask, updateTask, deleteTask, updatePlot, deletePlot } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  const history = getPlotHistory(id || '');
  
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

  // EDIT PLOT MODAL STATE
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'general' | 'geo'>('general');
  const [configForm, setConfigForm] = useState<Partial<Plot>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  // SMART MAP CENTER LOGIC (Safe Access)
  const displayCoordinates = 
      (plot?.coordinates && plot.coordinates.lat !== 0) ? plot.coordinates :
      (plot?.polygon && plot.polygon.length > 0) ? plot.polygon[0] :
      (location?.coordinates && location.coordinates.lat !== 0) ? location.coordinates : 
      undefined;
  
  // Stats
  const daysSinceSowing = Math.floor((new Date().getTime() - new Date(plot?.sowingDate || '').getTime()) / (1000 * 60 * 60 * 24));
  
  useEffect(() => {
    if (displayCoordinates && displayCoordinates.lat && displayCoordinates.lng) {
        setWeatherLoading(true);
        // Using Open-Meteo API
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${displayCoordinates.lat}&longitude=${displayCoordinates.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
            .then(res => res.json())
            .then(data => { setWeather(data.current); setWeatherLoading(false); })
            .catch(err => { console.error(err); setWeatherLoading(false); });
    }
  }, [displayCoordinates]);

  if (!plot) return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Globe size={48} className="mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-800">Parcela no encontrada</h2>
          <Link to="/plots" className="text-hemp-600 hover:underline mt-2">Volver al listado</Link>
      </div>
  );

  // --- PLOT CONFIG / EDIT HANDLERS ---
  const handleOpenConfig = () => {
      setConfigForm({ ...plot });
      setIsConfigOpen(true);
  };

  const handleKMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const poly = parseKML(text);
          
          if (poly && poly.length > 2) {
              // Calculate Area & Centroid
              const R = 6371000;
              const toRad = (x: number) => x * Math.PI / 180;
              let area = 0;
              let perimeter = 0;
              const lats = poly.map(p => p.lat);
              const lngs = poly.map(p => p.lng);
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

              for (let i = 0; i < poly.length; i++) {
                  const j = (i + 1) % poly.length;
                  const p1 = poly[i];
                  const p2 = poly[j];
                  area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
                  const dLat = toRad(p2.lat - p1.lat);
                  const dLon = toRad(p2.lng - p1.lng);
                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  perimeter += R * c;
              }
              area = Math.abs(area * R * R / 2) / 10000;

              setConfigForm(prev => ({
                  ...prev,
                  polygon: poly,
                  surfaceArea: Number(area.toFixed(2)),
                  surfaceUnit: 'ha',
                  perimeter: Math.round(perimeter),
                  coordinates: { lat: centerLat, lng: centerLng }
              }));
              alert("✅ KML Importado y procesado correctamente.");
          } else {
              alert("⚠️ No se encontró un polígono válido en el KML.");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => {
      setConfigForm(prev => ({
          ...prev,
          polygon: newPoly,
          surfaceArea: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.surfaceArea,
          perimeter: Math.round(perimeterM),
          coordinates: center
      }));
  };

  const handleSaveConfig = () => {
      if (configForm.id) {
          updatePlot(configForm as Plot);
          setIsConfigOpen(false);
      }
  };

  const handleDeletePlot = async () => {
      if(window.confirm("¡PELIGRO! ¿Eliminar este lote y todos sus registros? Esta acción es irreversible.")) {
          await deletePlot(plot.id);
          navigate('/plots');
      }
  };

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
      const base = "w-full border rounded text-gray-900 focus:ring-2 focus:ring-hemp-500 outline-none transition-colors";
      return `${base} ${isSmall ? "p-2 text-sm" : "p-2"} ${isViewMode ? "bg-gray-100 border-gray-200" : "bg-white border-gray-300"}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 hover:text-gray-800 transition font-medium">
            <ArrowLeft size={18} className="mr-1" /> Volver a la Planilla
        </Link>
        {!canEdit && <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-semibold">Solo Lectura</span>}
        {canEdit && (
            <button 
                onClick={handleOpenConfig} 
                className="flex items-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition"
            >
                <Settings size={16} className="mr-2 text-gray-500"/> Configurar Lote
            </button>
        )}
      </div>

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Status Bar */}
          <div className={`h-2 w-full ${plot.status === 'Activa' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          
          <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                      <div className="flex items-center space-x-3 mb-1">
                          <h1 className="text-3xl font-bold text-gray-900">{plot.name}</h1>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center ${plot.type === 'Producción' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {plot.type === 'Producción' ? <Tractor size={12} className="mr-1"/> : <FlaskConical size={12} className="mr-1"/>}
                              {plot.type}
                          </span>
                      </div>
                      <p className="text-gray-500 flex items-center text-sm">
                          <MapPin size={14} className="mr-1 text-gray-400"/> {location?.name}
                          <span className="mx-2">•</span>
                          <span className="font-semibold text-gray-700">{variety?.name}</span>
                      </p>
                  </div>
                  
                  {/* Weather Widget */}
                  {displayCoordinates && (
                      <div className="mt-4 md:mt-0 flex items-center bg-blue-50/50 rounded-xl px-4 py-2 border border-blue-100">
                          {weatherLoading ? <Loader2 className="animate-spin text-blue-400"/> : weather ? (
                              <>
                                  <div className="flex flex-col items-center mr-4">
                                      <Sun className="text-orange-500 mb-1" size={20}/>
                                      <span className="text-lg font-bold text-gray-800 leading-none">{weather.temperature_2m}°</span>
                                  </div>
                                  <div className="h-8 w-px bg-blue-200 mr-4"></div>
                                  <div className="flex flex-col text-xs text-gray-600 space-y-1">
                                      <div className="flex items-center"><Droplets size={12} className="mr-1 text-blue-500"/> Hum: {weather.relative_humidity_2m}%</div>
                                      <div className="flex items-center"><Wind size={12} className="mr-1 text-gray-500"/> Viento: {weather.wind_speed_10m} km/h</div>
                                  </div>
                              </>
                          ) : <span className="text-xs text-gray-400">Clima no disponible</span>}
                      </div>
                  )}
              </div>

              {/* Cycle Graph */}
              <CycleGraph sowingDate={plot.sowingDate} cycleDays={variety?.cycleDays || 120} />

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: KPIs Grid */}
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 auto-rows-min">
                      <KPI 
                        label="Días Ciclo" 
                        value={`${daysSinceSowing}`} 
                        subtext="días desde siembra"
                        icon={Clock} 
                        color="bg-blue-100 text-blue-600" 
                      />
                      <KPI 
                        label="Fecha Siembra" 
                        value={new Date(plot.sowingDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})} 
                        subtext={new Date(plot.sowingDate).getFullYear()}
                        icon={Calendar} 
                        color="bg-green-100 text-green-600" 
                      />
                      <KPI 
                        label="Superficie" 
                        value={`${plot.surfaceArea}`} 
                        subtext={plot.surfaceUnit}
                        icon={Map} 
                        color="bg-purple-100 text-purple-600" 
                      />
                      <KPI 
                        label="Densidad" 
                        value={`${plot.density}`} 
                        subtext="plantas/m²"
                        icon={Sprout} 
                        color="bg-emerald-100 text-emerald-600" 
                      />
                      <KPI 
                        label="Origen Semilla" 
                        value={seedBatch?.batchCode || 'N/A'} 
                        subtext={seedBatch?.supplierName}
                        icon={Tag} 
                        color="bg-amber-100 text-amber-600" 
                      />
                      <KPI 
                        label="Estado Actual" 
                        value={history.length > 0 ? history[0].stage : 'Inicial'} 
                        subtext="Último monitoreo"
                        icon={Activity} 
                        color="bg-rose-100 text-rose-600" 
                      />
                  </div>

                  {/* Right: Map Preview (Enlarged) */}
                  <div className="h-80 lg:h-full min-h-[350px] rounded-xl overflow-hidden border border-gray-200 relative bg-gray-50 shadow-inner">
                      {displayCoordinates ? (
                          <MapEditor 
                            initialPolygon={plot.polygon || []} 
                            initialCenter={displayCoordinates} 
                            readOnly={true} 
                            height="100%"
                          />
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                              <Globe size={32} className="mb-2 opacity-50"/>
                              Sin ubicación
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
          {[
              { id: 'records', label: 'Registros Técnicos', icon: Activity },
              { id: 'logs', label: 'Bitácora & Fotos', icon: Camera },
              { id: 'planning', label: 'Plan Agrícola', icon: Archive },
              { id: 'qr', label: 'Ficha QR', icon: QrCode },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-full text-sm font-bold flex items-center transition ${
                      activeTab === tab.id 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                  }`}
              >
                  <tab.icon size={16} className="mr-2" />
                  {tab.label}
              </button>
          ))}
      </div>

      {/* --- CONTENT TABS --- */}
      
      {activeTab === 'records' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="font-bold text-gray-900">Historial de Monitoreo</h2>
                {canEdit && <button onClick={() => handleOpenRecordModal()} className="bg-hemp-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-hemp-700 transition shadow-sm"><Plus size={16} className="mr-2"/> Nuevo Registro</button>}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-3 text-left">Fecha</th>
                            <th className="px-6 py-3 text-left">Etapa</th>
                            <th className="px-6 py-3 text-left">Altura</th>
                            <th className="px-6 py-3 text-left">Observaciones / Plagas</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No hay registros aún.</td></tr>
                        ) : history.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => handleOpenRecordModal(r, true)}>
                                <td className="px-6 py-4 font-medium text-gray-900">{r.date}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs border font-bold ${getStageStyle(r.stage)}`}>{r.stage}</span></td>
                                <td className="px-6 py-4 font-mono text-gray-600">{r.plantHeight ? `${r.plantHeight} cm` : '-'}</td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{r.pests || r.diseases || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600"><Eye size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'planning' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-white p-6 rounded-2xl border border-purple-100">
                  <div>
                      <h3 className="text-purple-900 font-bold text-lg mb-1">Costo Estimado de Producción</h3>
                      <p className="text-purple-600 text-sm">Basado en insumos y labores asignadas.</p>
                  </div>
                  <div className="text-4xl font-black text-purple-900 flex items-start">
                      <span className="text-lg mt-1 mr-1 text-purple-400">$</span>
                      {calculateTotalCost().toLocaleString()}
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h2 className="font-bold text-gray-900">Tareas y Recursos</h2>
                      {canEdit && <button onClick={() => { setTaskForm({title: '', status: 'Pendiente', priority: 'Media', dueDate: new Date().toISOString().split('T')[0]}); setIsTaskModalOpen(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-purple-700 transition shadow-sm"><Plus size={16} className="mr-2"/> Agregar Actividad</button>}
                  </div>
                  <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                              <tr>
                                  <th className="px-6 py-3 text-left">Actividad</th>
                                  <th className="px-6 py-3 text-left">Recurso Asignado</th>
                                  <th className="px-6 py-3 text-right">Cantidad</th>
                                  <th className="px-6 py-3 text-right">Costo</th>
                                  <th className="px-6 py-3 text-center">Estado</th>
                                  <th className="px-6 py-3 text-right"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {plotTasks.length === 0 ? (
                                  <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">No hay tareas planificadas.</td></tr>
                              ) : plotTasks.map(t => {
                                  const res = resources.find(r => r.id === t.resourceId);
                                  return (
                                      <tr key={t.id} className="hover:bg-gray-50 transition">
                                          <td className="px-6 py-4 font-bold text-gray-800">{t.title}</td>
                                          <td className="px-6 py-4 text-gray-600">
                                              {res ? (
                                                  <span className="flex items-center bg-purple-50 text-purple-700 px-2 py-1 rounded w-fit border border-purple-100 text-xs font-bold">
                                                      <Package size={12} className="mr-1"/> {res.name}
                                                  </span>
                                              ) : <span className="text-gray-400 italic">-</span>}
                                          </td>
                                          <td className="px-6 py-4 text-right">{t.resourceQuantity ? `${t.resourceQuantity} ${res?.unit}` : '-'}</td>
                                          <td className="px-6 py-4 text-right font-mono text-gray-800">{t.resourceCost ? `$${t.resourceCost}` : '-'}</td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${t.status === 'Completada' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-amber-100 border-amber-200 text-amber-800'}`}>
                                                  {t.status}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {canEdit && <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition"><Trash2 size={16}/></button>}
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2">
            {canEdit && (
                <form onSubmit={handleAddLog} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-8 flex flex-col sm:flex-row gap-3 items-end shadow-inner">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nueva Nota de Campo</label>
                        <input type="text" className={getInputClass()} value={newLogNote} onChange={e => setNewLogNote(e.target.value)} placeholder="Ej: Observo leve amarillamiento en hojas bajas..." />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <label className="bg-white border border-gray-300 p-2.5 rounded-lg cursor-pointer hover:bg-gray-100 text-gray-600 transition flex items-center justify-center flex-1 sm:flex-none">
                            <Camera size={20} className="mr-2 sm:mr-0"/><span className="sm:hidden text-sm font-bold">Foto</span>
                            <input type="file" className="hidden" onChange={handleImageUpload}/>
                        </label>
                        <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex-1 sm:flex-none">
                            Agregar Nota
                        </button>
                    </div>
                </form>
            )}
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {plotLogs.length === 0 && <p className="text-center text-gray-400 italic py-10">No hay notes en la bitácora.</p>}
                {plotLogs.map(log => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-amber-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            <FileText size={16}/>
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                                <span className="font-bold text-gray-900 text-sm">{log.date}</span>
                            </div>
                            <p className="text-gray-600 text-sm">{log.note}</p>
                            {log.photoUrl && (
                                <img src={log.photoUrl} className="mt-3 rounded-lg border border-gray-200 w-full object-cover max-h-48" alt="Log"/>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 3. QR TAB */}
      {activeTab === 'qr' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center animate-in fade-in zoom-in">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Identificación de Parcela</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-md">Escanea este código para acceder rápidamente a la ficha técnica de la parcela desde el campo.</p>
              
              <div className="bg-white p-6 border-4 border-gray-900 rounded-3xl shadow-xl mb-8">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} alt="QR" className="w-48 h-48"/>
              </div>
              <button onClick={() => window.print()} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center shadow-lg transition transform hover:scale-105">
                  <Printer size={20} className="mr-2"/> Imprimir Ficha
              </button>
          </div>
      )}

       {/* RECORD MODAL */}
       {isRecordModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 flex flex-col animate-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                       <h2 className="text-lg font-bold text-gray-800">{isViewMode ? 'Detalle de Registro' : 'Nuevo Registro Técnico'}</h2>
                       <button onClick={() => setIsRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"><X size={20}/></button>
                   </div>
                   
                   <div className="p-6">
                       <form onSubmit={handleSaveRecord} className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha</label><input type="date" disabled={isViewMode} className={getInputClass()} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})}/></div>
                               <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Etapa Fenológica</label><select disabled={isViewMode} className={getInputClass()} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                               <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Altura Planta (cm)</label><input disabled={isViewMode} type="number" className={getInputClass()} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})}/></div>
                               <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Vigor (1-5)</label><input disabled={isViewMode} type="number" className={getInputClass()} value={recordForm.vigor} onChange={e => setRecordForm({...recordForm, vigor: Number(e.target.value)})}/></div>
                           </div>
                           
                           <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                               <label className="flex items-center space-x-3 mb-4 cursor-pointer">
                                   <input type="checkbox" disabled={isViewMode} checked={showAppSection} onChange={e => setShowAppSection(e.target.checked)} className="w-5 h-5 rounded text-hemp-600 focus:ring-hemp-500"/>
                                   <span className="font-bold text-gray-800">Registrar Aplicación (Fitosanitario/Fertilizante)</span>
                               </label>
                               {showAppSection && (
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                       <input disabled={isViewMode} type="text" placeholder="Nombre del Producto" className={getInputClass()} value={recordForm.applicationProduct || ''} onChange={e => setRecordForm({...recordForm, applicationProduct: e.target.value})}/>
                                       <input disabled={isViewMode} type="text" placeholder="Dosis Aplicada" className={getInputClass()} value={recordForm.applicationDose || ''} onChange={e => setRecordForm({...recordForm, applicationDose: e.target.value})}/>
                                   </div>
                               )}
                           </div>

                           {!isViewMode && (
                               <div className="flex justify-end pt-4 border-t border-gray-100">
                                   <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium mr-3 transition">Cancelar</button>
                                   <button type="submit" className="px-6 py-2 bg-hemp-600 text-white rounded-lg shadow-md hover:bg-hemp-700 transition font-bold">Guardar Registro</button>
                               </div>
                           )}
                       </form>
                   </div>
               </div>
           </div>
       )}

       {/* CONFIG / EDIT MODAL */}
       {isConfigOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0 flex flex-col animate-in zoom-in-95 duration-200">
                   <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                       <h2 className="text-xl font-bold text-gray-800 flex items-center"><Edit2 size={20} className="mr-2 text-gray-500"/> Configuración del Lote</h2>
                       <button onClick={() => setIsConfigOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"><X size={20}/></button>
                   </div>
                   
                   <div className="flex border-b border-gray-200">
                       <button onClick={() => setConfigTab('general')} className={`flex-1 py-3 font-bold text-sm ${configTab === 'general' ? 'border-b-2 border-hemp-600 text-hemp-700' : 'text-gray-500 hover:text-gray-700'}`}>Datos Generales</button>
                       <button onClick={() => setConfigTab('geo')} className={`flex-1 py-3 font-bold text-sm ${configTab === 'geo' ? 'border-b-2 border-hemp-600 text-hemp-700' : 'text-gray-500 hover:text-gray-700'}`}>Geometría y Mapa</button>
                   </div>

                   <div className="p-6">
                       {configTab === 'general' && (
                           <div className="space-y-4 animate-in fade-in">
                               <div>
                                   <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Lote</label>
                                   <input type="text" className={getInputClass()} value={configForm.name} onChange={e => setConfigForm({...configForm, name: e.target.value})} />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Siembra</label>
                                       <input type="date" className={getInputClass()} value={configForm.sowingDate} onChange={e => setConfigForm({...configForm, sowingDate: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-sm font-bold text-gray-700 mb-1">Variedad</label>
                                       <select className={getInputClass()} value={configForm.varietyId} onChange={e => setConfigForm({...configForm, varietyId: e.target.value})}>
                                           {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                       </select>
                                   </div>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                                       <select className={getInputClass()} value={configForm.status} onChange={e => setConfigForm({...configForm, status: e.target.value as any})}>
                                           <option value="Activa">Activa</option>
                                           <option value="Cosechada">Cosechada</option>
                                           <option value="Cancelada">Cancelada</option>
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                                       <select className={getInputClass()} value={configForm.type} onChange={e => setConfigForm({...configForm, type: e.target.value as any})}>
                                           <option value="Ensayo">Ensayo I+D</option>
                                           <option value="Producción">Producción</option>
                                       </select>
                                   </div>
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                                   <textarea className={getInputClass()} rows={3} value={configForm.observations || ''} onChange={e => setConfigForm({...configForm, observations: e.target.value})}></textarea>
                               </div>
                           </div>
                       )}

                       {configTab === 'geo' && (
                           <div className="space-y-4 animate-in fade-in">
                               <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                                   <div>
                                       <h4 className="font-bold text-blue-800 text-sm">Importar Polígono (KML)</h4>
                                       <p className="text-xs text-blue-600">Sube un archivo .kml exportado de Google Earth para delimitar el lote.</p>
                                   </div>
                                   <div className="relative">
                                       <input 
                                         type="file" 
                                         accept=".kml" 
                                         ref={fileInputRef}
                                         className="hidden"
                                         onChange={handleKMLUpload}
                                       />
                                       <button 
                                         type="button"
                                         onClick={() => fileInputRef.current?.click()}
                                         className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center"
                                       >
                                           <FileUp size={14} className="mr-1"/> Cargar KML
                                       </button>
                                   </div>
                               </div>

                               <div className="border border-gray-300 rounded-xl overflow-hidden">
                                   <MapEditor 
                                     initialCenter={configForm.coordinates || displayCoordinates}
                                     initialPolygon={configForm.polygon || []}
                                     onPolygonChange={handlePolygonChange}
                                     height="350px"
                                   />
                               </div>
                               
                               <div className="grid grid-cols-2 gap-4 text-sm">
                                   <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                       <span className="block text-xs font-bold text-gray-500 uppercase">Superficie Calc.</span>
                                       <div className="font-mono font-bold text-gray-800 flex items-center"><Ruler size={14} className="mr-1"/> {configForm.surfaceArea || 0} ha</div>
                                   </div>
                                   <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                       <span className="block text-xs font-bold text-gray-500 uppercase">Perímetro Calc.</span>
                                       <div className="font-mono font-bold text-gray-800">{configForm.perimeter || 0} m</div>
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>

                   <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50">
                       <button onClick={handleDeletePlot} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center px-3 py-2 hover:bg-red-50 rounded transition"><Trash2 size={16} className="mr-2"/> Eliminar Lote</button>
                       <div className="flex space-x-3">
                           <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold transition">Cancelar</button>
                           <button onClick={handleSaveConfig} className="px-6 py-2 bg-hemp-600 text-white rounded-lg hover:bg-hemp-700 shadow-lg font-bold flex items-center transition"><Save size={18} className="mr-2"/> Guardar Cambios</button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* TASK MODAL */}
       {isTaskModalOpen && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
                   <div className="flex justify-between items-center mb-6">
                       <h2 className="text-xl font-bold text-gray-900">Nueva Actividad</h2>
                       <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                   </div>
                   <form onSubmit={handleSaveTask} className="space-y-5">
                       <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label><input type="text" className={getInputClass()} value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Ej: Fertilización NPK"/></div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha Límite</label><input type="date" className={getInputClass()} value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}/></div>
                           <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prioridad</label><select className={getInputClass()} value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})}><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></div>
                       </div>
                       
                       <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                           <h3 className="text-xs font-bold text-purple-800 mb-3 uppercase flex items-center"><DollarSign size={12} className="mr-1"/> Asignar Recurso (Costo)</h3>
                           <div className="space-y-3">
                               <select className={getInputClass()} value={taskForm.resourceId || ''} onChange={e => setTaskForm({...taskForm, resourceId: e.target.value})}>
                                   <option value="">-- Sin Recurso --</option>
                                   {resources.map(r => <option key={r.id} value={r.id}>{r.name} (${r.costPerUnit}/{r.unit})</option>)}
                               </select>
                               {taskForm.resourceId && (
                                   <input type="number" placeholder="Cantidad a usar" className={getInputClass()} value={taskForm.resourceQuantity || ''} onChange={e => setTaskForm({...taskForm, resourceQuantity: Number(e.target.value)})}/>
                               )}
                           </div>
                       </div>

                       <button type="submit" className="w-full py-3 bg-hemp-600 text-white rounded-xl shadow-md hover:bg-hemp-700 transition font-bold flex justify-center items-center mt-4">
                           <CheckSquare size={18} className="mr-2"/> Guardar Tarea
                       </button>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
}
