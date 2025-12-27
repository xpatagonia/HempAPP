
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, FieldLog, HydricRecord, SeedBatch } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  ArrowLeft, Activity, MapPin, Plus, Eye, Tag, Clock, 
  Sprout, X, Map, ShieldCheck, Info, AlertCircle, Trash2, Edit2,
  Camera, Image as ImageIcon, MessageSquare, ClipboardList, User, Calendar, Ruler, Maximize2, Download, Scale, Wind, Bird, CheckCircle2,
  RefreshCw, Globe, Layers, Save, Thermometer, Droplets, Waves, QrCode, Printer, Loader2, Zap, Sparkles, Link as LinkIcon, Sun,
  TrendingUp, ArrowUpRight, Beaker, FileUp, Moon, Sunrise, Sunset, ZapOff, Archive, Navigation, Scan
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

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog, deleteLog, hydricRecords, updatePlot } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  
  const history = getPlotHistory(id || '');
  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs, id]);
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs' | 'water' | 'astro' | 'map'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Astro & Weather States
  const [astroData, setAstroData] = useState<any>(null);
  const [autoWeather, setAutoWeather] = useState<any>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canWriteLog = !!currentUser; 

  // --- CARGA DE CLIMA Y ASTRONOMÍA ---
  useEffect(() => {
    const fetchAstroAndWeather = async () => {
        if (!location?.coordinates) return;
        try {
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&current=temperature_2m,relative_humidity_2m,weather_code&daily=uv_index_max,sunrise,sunset&timezone=auto`);
            const weatherData = await weatherRes.json();
            setAutoWeather(weatherData);

            const today = new Date().toISOString().split('T')[0];
            const astroRes = await fetch(`https://api.sunrise-sunset.org/json?lat=${location.coordinates.lat}&lng=${location.coordinates.lng}&date=${today}&formatted=0`);
            const astro = await astroRes.json();
            if (astro.status === "OK") {
                const dayLengthHours = Math.floor(astro.results.day_length / 3600);
                const dayLengthMins = Math.floor((astro.results.day_length % 3600) / 60);
                setAstroData({ ...astro.results, decimalHours: (astro.results.day_length / 3600).toFixed(2), formatted: `${dayLengthHours}h ${dayLengthMins}m` });
            }
        } catch (e) { console.error("Astro Error:", e); }
    };
    fetchAstroAndWeather();
  }, [location]);

  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({ 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    stage: 'Vegetativo' as any, temperature: 0, humidity: 0, plantHeight: 0, plantsPerMeter: 0, lightHours: 18, lunarPhase: 'Creciente'
  });

  useEffect(() => {
      if (isRecordModalOpen && !editingRecordId && autoWeather?.current) {
          setRecordForm(prev => ({
              ...prev,
              temperature: autoWeather.current.temperature_2m,
              humidity: autoWeather.current.relative_humidity_2m,
              lightHours: parseFloat(astroData?.decimalHours || '18'),
              lunarPhase: 'Creciente' 
          }));
      }
  }, [isRecordModalOpen, editingRecordId, autoWeather, astroData]);

  const agronomyStats = useMemo(() => {
      if (history.length === 0) return { avgGrowth: 0, totalGdd: 0, currentPhase: 'Emergencia' };
      const TBASE = 10;
      let totalGdd = 0;
      history.forEach(r => { if (r.temperature && r.temperature > TBASE) totalGdd += (r.temperature - TBASE); });
      let lastGrowth = 0;
      if (history.length >= 2) {
          const newest = history[0];
          const previous = history[1];
          const diffCm = (newest.plantHeight || 0) - (previous.plantHeight || 0);
          const diffDays = Math.max(1, (new Date(newest.date).getTime() - new Date(previous.date).getTime()) / 86400000);
          lastGrowth = diffCm / diffDays;
      }
      return { avgGrowth: lastGrowth.toFixed(2), totalGdd: Math.round(totalGdd), currentPhase: history[0].stage };
  }, [history]);

  const chartData = useMemo(() => {
      return [...history].reverse().map(r => ({
          fecha: r.date.split('-').slice(1).join('/'),
          altura: r.plantHeight || 0,
          temp: r.temperature || 0,
          hum: r.humidity || 0
      }));
  }, [history]);

  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });

  if (!plot) return <div className="p-10 text-center text-slate-500 font-bold">Unidad productiva no localizada.</div>;

  const handleSaveRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const payload = { ...recordForm, plotId: plot.id, createdBy: currentUser?.id, createdByName: currentUser?.name };
          if (editingRecordId) await updateTrialRecord({ ...payload, id: editingRecordId } as TrialRecord);
          else await addTrialRecord({ ...payload, id: crypto.randomUUID() } as TrialRecord);
          setIsRecordModalOpen(false);
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
      try {
          const payload = { 
            id: crypto.randomUUID(), plotId: plot.id, date: logForm.date || new Date().toISOString().split('T')[0], time: logForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            note: `[REGISTRO: ${currentUser?.name}] ${logForm.note || ''}`.trim(), photoUrl: logForm.photoUrl || ''
          } as FieldLog;
          await addLog(payload);
          setIsLogModalOpen(false);
          setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
      } finally { setIsSaving(false); }
  };

  const inputStyle = "w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm dark:text-white";
  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Link to="/plots" className="flex items-center text-gray-500 font-black hover:text-gray-800 transition uppercase text-[10px] tracking-widest group">
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Listado Global
        </Link>
        <button onClick={() => setIsQrModalOpen(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl text-slate-500 hover:text-hemp-600 shadow-sm transition-all flex items-center gap-2 px-6 text-xs font-black uppercase tracking-widest">
            <QrCode size={18}/> Etiqueta QR
        </button>
      </div>

      {/* HEADER TRAZABILIDAD */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 p-10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
              <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                      <Tag size={12} className="text-hemp-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{plot.type} / Trazabilidad Nucleus</span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 italic uppercase tracking-tighter leading-none">{plot.name}</h1>
                  <div className="flex flex-wrap gap-6">
                    <p className="text-gray-500 flex items-center text-sm font-bold"><MapPin size={18} className="mr-2 text-blue-500 opacity-60"/> {location?.name}</p>
                    <p className="text-hemp-600 flex items-center text-sm font-black uppercase tracking-tighter"><Sprout size={18} className="mr-2 opacity-60"/> {variety?.name}</p>
                    {seedBatch && <p className="text-slate-400 flex items-center text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border dark:border-slate-700"><Archive size={14} className="mr-1.5"/> Lote Maestro: {seedBatch.batchCode}</p>}
                  </div>
              </div>
              <div className={`px-6 py-2 rounded-2xl text-xs font-black uppercase border tracking-widest flex items-center shadow-sm ${plot.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {plot.status === 'Activa' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>}
                  {plot.status}
              </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <KPI label="Huella Hídrica" value={`${(hydricRecords.filter(h => h.plotId === id).reduce((s, r) => s + r.amountMm, 0)).toFixed(1)} mm`} icon={Waves} color="bg-blue-100" />
              <KPI label="Acumulación Térmica" value={`${agronomyStats.totalGdd} GDD`} icon={Thermometer} color="bg-orange-100" />
              <KPI label="Crecimiento Act." value={`${agronomyStats.avgGrowth} cm/d`} icon={TrendingUp} color="bg-emerald-100" subtext={`Fase: ${agronomyStats.currentPhase}`} />
              <KPI label="Días Ciclo" value={Math.floor((Date.now() - new Date(plot.sowingDate).getTime()) / 86400000)} icon={Clock} color="bg-blue-100" />
          </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border dark:border-slate-800 shadow-sm w-fit overflow-x-auto">
          <button onClick={() => setActiveTab('records')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'records' ? 'bg-hemp-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Monitoreo & Curvas</button>
          <button onClick={() => setActiveTab('map')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'map' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Mapa & Geocerca</button>
          <button onClick={() => setActiveTab('astro')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'astro' ? 'bg-amber-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Ciclo de Luz</button>
          <button onClick={() => setActiveTab('logs')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-slate-800 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Bitácora Multimedia</button>
          <button onClick={() => setActiveTab('water')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'water' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Pluviómetro</button>
      </div>

      <div className="grid grid-cols-1 gap-8">
          {activeTab === 'records' && (
            <div className="space-y-8 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Curva de Crecimiento</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolución de altura vs Tiempo (Fenología)</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-hemp-500"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (cm)</span></div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="altura" stroke="#16a34a" strokeWidth={4} fillOpacity={1} fill="url(#colorHeight)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic"><Activity size={48} className="mb-2 opacity-20"/> Sin datos suficientes para proyectar curvas evolutivas.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                    <div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                        <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.3em] flex items-center"><Activity size={18} className="mr-3 text-hemp-600"/> Monitoreos Técnicos</h2>
                        {currentUser && <button onClick={() => { setIsRecordModalOpen(true); setIsViewMode(false); setEditingRecordId(null); setRecordForm({ date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), stage: 'Vegetativo' }); }} className="bg-hemp-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition">Nuevo Monitoreo</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest border-b dark:border-slate-800"><tr><th className="px-10 py-5">Fecha</th><th className="px-10 py-5">Etapa</th><th className="px-10 py-5 text-center">Altura</th><th className="px-10 py-5 text-center">Clima</th><th className="px-10 py-5 text-center">Ciclo Luz / Luna</th><th className="px-10 py-5 text-right">Detalle</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold uppercase text-[11px]">{history.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                    <td className="px-10 py-6 font-black text-gray-800 dark:text-white tracking-tighter">{r.date}</td>
                                    <td className="px-10 py-6"><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30">{r.stage}</span></td>
                                    <td className="px-10 py-6 text-center font-black text-gray-900 dark:text-white">{r.plantHeight} cm</td>
                                    <td className="px-10 py-6 text-center text-[10px] text-slate-500 whitespace-nowrap">{r.temperature}°C / {r.humidity}% HR</td>
                                    <td className="px-10 py-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1.5 text-amber-600 font-black text-[9px]">
                                                <Sun size={10}/> {r.lightHours || '---'}h
                                            </div>
                                            <div className="flex items-center gap-1.5 text-blue-500 font-black text-[9px]">
                                                <Moon size={10}/> {r.lunarPhase || '---'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right"><Eye size={18} className="text-gray-300 ml-auto transition"/></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'map' && (
              <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 shadow-sm overflow-hidden h-[600px] relative">
                          <MapEditor 
                            initialCenter={plot.coordinates} 
                            initialPolygon={plot.polygon} 
                            referencePolygon={location?.polygon}
                            readOnly={true} 
                            height="100%" 
                          />
                          <div className="absolute top-6 left-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border dark:border-slate-800 shadow-2xl space-y-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-hemp-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]"></div>
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Parcela: {plot.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full border-2 border-red-500 border-dashed"></div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Establecimiento: {location?.name}</span>
                              </div>
                          </div>
                      </div>
                      <div className="space-y-6">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center"><Navigation size={18} className="mr-2 text-emerald-600"/> Datos Geofísicos</h3>
                              <div className="space-y-4">
                                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Superficie Perimetral</p>
                                      <p className="text-3xl font-black text-emerald-800 dark:text-emerald-300">{plot.surfaceArea} <span className="text-sm">{plot.surfaceUnit}</span></p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800">
                                          <p className="text-[8px] font-black text-slate-400 uppercase">Latitud</p>
                                          <p className="text-xs font-mono font-bold dark:text-white truncate">{plot.coordinates?.lat.toFixed(6) || 'S/D'}</p>
                                      </div>
                                      <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800">
                                          <p className="text-[8px] font-black text-slate-400 uppercase">Longitud</p>
                                          <p className="text-xs font-mono font-bold dark:text-white truncate">{plot.coordinates?.lng.toFixed(6) || 'S/D'}</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden">
                              <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center relative z-10"><Scan size={18} className="mr-2 text-blue-400"/> Trazabilidad Geo</h3>
                              <div className="space-y-4 relative z-10">
                                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                                      <span>Nodos de Borde</span>
                                      <span className="text-white">{plot.polygon?.length || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                                      <span>Perímetro Lineal</span>
                                      <span className="text-white">--- m</span>
                                  </div>
                              </div>
                              <Globe className="absolute -bottom-10 -right-10 w-48 h-48 text-blue-500 opacity-10" />
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'astro' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border dark:border-slate-800 shadow-sm relative overflow-hidden">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-8 flex items-center">
                          <Sun size={24} className="mr-3 text-amber-500"/> Ciclo de Luz & Fotoperiodo
                      </h3>
                      {astroData ? (
                          <div className="space-y-8">
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/30">
                                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Fotoperiodo (Día)</p>
                                      <p className="text-4xl font-black text-amber-700 dark:text-amber-300">{astroData.formatted}</p>
                                      <p className="text-[9px] text-amber-500 font-bold mt-2 uppercase tracking-widest">Hrs Luz Decimal: {astroData.decimalHours}</p>
                                  </div>
                                  <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Índice UV Máx.</p>
                                      <p className="text-4xl font-black text-blue-700 dark:text-blue-300">{autoWeather?.daily?.uv_index_max?.[0] || '---'}</p>
                                      <p className="text-[9px] text-blue-500 font-bold mt-2 uppercase tracking-widest">Radiación fotosintética</p>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                                  <div className="text-center">
                                      <Sunrise size={28} className="mx-auto text-amber-400 mb-2"/>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salida Sol</p>
                                      <p className="text-lg font-black text-slate-700 dark:text-white">{new Date(astroData.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  <div className="h-12 w-px bg-slate-200 dark:border-slate-800"></div>
                                  <div className="text-center">
                                      <Sunset size={28} className="mx-auto text-orange-500 mb-2"/>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ocaso Sol</p>
                                      <p className="text-lg font-black text-slate-700 dark:text-white">{new Date(astroData.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                              </div>
                          </div>
                      ) : <div className="text-center p-12 text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/> Sincronizando Astronomía GPS...</div>}
                  </div>

                  <div className="bg-slate-900 p-10 rounded-[40px] text-white relative overflow-hidden flex flex-col justify-center items-center text-center">
                       <h3 className="absolute top-10 left-10 text-xl font-black uppercase tracking-tighter italic flex items-center">
                          <Moon size={24} className="mr-3 text-blue-300"/> Estado Lunar
                       </h3>
                       <div className="relative z-10 py-10">
                           <Moon size={84} className="text-blue-100 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse"/>
                           <p className="text-3xl font-black uppercase tracking-tighter italic">Creciente / Fase Dual</p>
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-4">Transición óptima para monitoreo nocturno</p>
                       </div>
                       <Activity className="absolute -bottom-10 -right-10 w-64 h-64 text-blue-600 opacity-10 pointer-events-none" />
                  </div>
              </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border dark:border-slate-800 shadow-sm animate-in fade-in">
                <div className="flex justify-between items-center mb-10">
                    <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.4em] flex items-center">
                        <MessageSquare size={18} className="mr-3 text-blue-500"/> Bitácora Digital Multimedia
                    </h2>
                    {canWriteLog && (
                        <button onClick={() => { setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' }); setIsLogModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition flex items-center group">
                            <Camera size={16} className="mr-2 group-hover:rotate-12 transition-transform"/> Capturar Registro Campo
                        </button>
                    )}
                </div>
                <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">
                    {plotLogs.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 italic bg-gray-50 dark:bg-slate-950 rounded-[32px] border border-dashed dark:border-slate-800">No hay observaciones en la bitácora técnica.</div>
                    ) : plotLogs.map(log => (
                        <div key={log.id} className="relative flex items-start group">
                            <div className="absolute left-0 w-10 h-10 bg-white dark:bg-slate-800 border-4 border-blue-50 dark:border-slate-700 rounded-full flex items-center justify-center z-10 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div></div>
                            <div className="ml-16 flex-1 bg-gray-50/50 dark:bg-slate-950/50 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 hover:border-blue-200 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <div className="flex items-center"><Calendar size={12} className="text-blue-500 mr-2"/><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.date} - {log.time} hs</span></div>
                                    </div>
                                    {isAdmin && <button onClick={() => window.confirm("¿Borrar observación?") && deleteLog(log.id)} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-bold mb-6 italic">"{log.note}"</p>
                                {log.photoUrl && <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700 max-w-sm cursor-zoom-in group/img" onClick={() => setPreviewPhoto(log.photoUrl!)}>
                                    <img src={log.photoUrl} className="w-full h-auto group-hover/img:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white" size={32}/></div>
                                </div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {activeTab === 'water' && <HydricBalance locationId={plot.locationId} plotId={plot.id} startDate={plot.sowingDate} />}
      </div>

      {/* MODAL BITÁCORA */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-2xl w-full p-10 shadow-2xl animate-in zoom-in-95 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Camera size={24}/></div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">Nueva <span className="text-blue-600">Observación Multimedia</span></h2>
                </div>
                <button onClick={() => setIsLogModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X size={28}/></button>
            </div>
            <form onSubmit={handleSaveLog} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Fecha Registro</label><input type="date" required className={inputStyle} value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} /></div>
                    <div><label className={labelClass}>Hora Captura</label><input type="time" required className={inputStyle} value={logForm.time} onChange={e => setLogForm({...logForm, time: e.target.value})} /></div>
                </div>
                <div>
                    <label className={labelClass}>Nota Técnica / Observación</label>
                    <textarea required className={`${inputStyle} h-32 resize-none italic`} value={logForm.note} onChange={e => setLogForm({...logForm, note: e.target.value})} placeholder="Describe el vigor, plagas, color de hoja o cualquier anomalía detectada..."></textarea>
                </div>
                <div className="space-y-3">
                    <label className={labelClass}>Registro Fotográfico</label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-6 bg-gray-50 dark:bg-slate-950 hover:border-blue-400 transition-all group relative overflow-hidden min-h-[180px] shadow-inner">
                        {logForm.photoUrl ? (
                            <div className="absolute inset-0 group/imgp">
                                <img src={logForm.photoUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/imgp:opacity-100 flex items-center justify-center transition-opacity">
                                    <button type="button" onClick={() => setLogForm({...logForm, photoUrl: ''})} className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition-all"><X size={20}/></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Camera size={32} className="text-blue-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tocar para Abrir Cámara o Galería</p>
                                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} />
                            </>
                        )}
                        {isUploading && <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>}
                    </div>
                </div>
                <button type="submit" disabled={isSaving || isUploading} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>} 
                    Registrar Observación Técnica
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MONITORING */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto border border-white/10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Activity size={24}/></div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">Monitoreo <span className="text-hemp-600">Fisiológico Automático</span></h2>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X size={28}/></button>
            </div>
            <form onSubmit={handleSaveRecord} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div><label className={labelClass}>Fecha de Muestreo</label><input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => setRecordForm({...recordForm, date: e.target.value})} /></div>
                        <div><label className={labelClass}>Hora Local</label><input type="time" required disabled={isViewMode} className={inputStyle} value={recordForm.time} onChange={e => setRecordForm({...recordForm, time: e.target.value})} /></div>
                        <div><label className={labelClass}>Etapa Fenológica</label><select required disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Altura de Planta (cm)</label><input type="number" step="0.1" disabled={isViewMode} className={`${inputStyle} text-hemp-600 text-lg`} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})} /></div>
                            <div><label className={labelClass}>Población (Pl/m²)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantsPerMeter} onChange={e => setRecordForm({...recordForm, plantsPerMeter: Number(e.target.value)})} /></div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center"><Sparkles size={12} className="mr-2 animate-pulse"/> Red de Captura Automática GFS/Archive</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className={labelClass}>Temp. Amb. (°C)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.temperature} onChange={e => setRecordForm({...recordForm, temperature: Number(e.target.value)})} /></div>
                                <div><label className={labelClass}>Hum. Rel. (%)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.humidity} onChange={e => setRecordForm({...recordForm, humidity: Number(e.target.value)})} /></div>
                                <div><label className={labelClass}>Luz (Fotoperiodo)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.lightHours} onChange={e => setRecordForm({...recordForm, lightHours: Number(e.target.value)})} /></div>
                                <div>
                                    <label className={labelClass}>Fase Lunar</label>
                                    <select disabled={isViewMode} className={inputStyle} value={recordForm.lunarPhase} onChange={e => setRecordForm({...recordForm, lunarPhase: e.target.value})}>
                                        <option value="Nueva">Nueva</option>
                                        <option value="Creciente">Creciente</option>
                                        <option value="Llena">Llena</option>
                                        <option value="Menguante">Menguante</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {!isViewMode && <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>} 
                    Sellar y Validar Registro Técnico
                </button>}
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW */}
      {previewPhoto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
              <div className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"><X size={32}/></div>
              <img src={previewPhoto} className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain animate-in zoom-in-90" />
          </div>
      )}
    </div>
  );
}
