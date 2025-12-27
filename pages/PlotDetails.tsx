
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
  TrendingUp, ArrowUpRight, Beaker, FileUp, Moon, Sunrise, Sunset, ZapOff, Archive, Navigation, Scan, Target, FlaskConical, ClipboardCheck
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

const calculateLunarPhase = (dateStr: string) => {
    const date = new Date(dateStr);
    const cycle = 29.53058867;
    const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
    const diff = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
    const pos = (diff % cycle) / cycle;
    if (pos < 0.06 || pos >= 0.94) return 'Nueva';
    if (pos < 0.44) return 'Creciente';
    if (pos < 0.56) return 'Llena';
    return 'Menguante';
};

export default function PlotDetails() {
  const { id } = useParams<{ id: string }>();
  const { plots, locations, varieties, getPlotHistory, addTrialRecord, updateTrialRecord, deleteTrialRecord, currentUser, seedBatches, logs, addLog, deleteLog, hydricRecords } = useAppContext();
  
  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const seedBatch = seedBatches.find(b => b.id === plot?.seedBatchId);
  
  const history = getPlotHistory(id || '');
  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs, id]);
  
  const [activeTab, setActiveTab] = useState<'records' | 'logs' | 'water' | 'astro' | 'map'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingConditions, setIsFetchingConditions] = useState(false);
  
  const [astroData, setAstroData] = useState<any>(null);
  const [autoWeather, setAutoWeather] = useState<any>(null);

  const [recordForm, setRecordForm] = useState<Partial<TrialRecord>>({ 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    stage: 'Vegetativo' as any, temperature: 0, humidity: 0, plantHeight: 0, plantsPerMeter: 0, lightHours: 12, lunarPhase: 'S/D',
    vigor: 9, uniformity: 9, lodging: 1, birdDamage: 1, diseasesScore: 1, pestsScore: 1, harvestPlantCount: 0, seedYield: 0, 
    seedQualityGermination: 90, seedQualityNonConformity: 0, stemWeight: 0, floweringDate: '', harvestDate: ''
  });

  const [logForm, setLogForm] = useState<Partial<FieldLog>>({ 
    note: '', 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 
    photoUrl: '' 
  });

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

  const syncCurrentConditions = async (targetDate: string) => {
      if (!location?.coordinates) return;
      setIsFetchingConditions(true);
      try {
          const lat = location.coordinates.lat;
          const lng = location.coordinates.lng;
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
          const wData = await wRes.json();
          const aRes = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${targetDate}&formatted=0`);
          const aData = await aRes.json();
          const lunar = calculateLunarPhase(targetDate);
          
          if (wData.current && aData.results) {
              setRecordForm(prev => ({
                  ...prev,
                  temperature: Math.round(wData.current.temperature_2m),
                  humidity: Math.round(wData.current.relative_humidity_2m),
                  lightHours: parseFloat((aData.results.day_length / 3600).toFixed(2)),
                  lunarPhase: lunar
              }));
          }
      } catch (err) { console.error("Sync Error:", err); } finally { setIsFetchingConditions(false); }
  };

  useEffect(() => {
      if (isRecordModalOpen && !editingRecordId) {
          syncCurrentConditions(recordForm.date || new Date().toISOString().split('T')[0]);
      }
  }, [isRecordModalOpen, editingRecordId]);

  const handleSaveRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const payload = { ...recordForm, plotId: plot?.id, createdBy: currentUser?.id, createdByName: currentUser?.name };
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
      if ((!logForm.note && !logForm.photoUrl) || isSaving || !plot) return;
      setIsSaving(true);
      try {
          const payload = { 
            id: crypto.randomUUID(), 
            plotId: plot.id, 
            date: logForm.date || new Date().toISOString().split('T')[0], 
            time: logForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            note: logForm.note || '', 
            photoUrl: logForm.photoUrl || ''
          } as FieldLog;
          await addLog(payload);
          setLogForm({ note: '', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), photoUrl: '' });
          alert("✅ Nota guardada en bitácora.");
      } finally { setIsSaving(false); }
  };

  const chartData = useMemo(() => {
      return [...history].reverse().map(r => ({
          fecha: r.date.split('-').slice(1).join('/'),
          altura: r.plantHeight || 0,
          temp: r.temperature || 0,
          hum: r.humidity || 0
      }));
  }, [history]);

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

  if (!plot) return <div className="p-10 text-center text-slate-500 font-bold">Unidad productiva no localizada.</div>;

  const inputStyle = "w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm dark:text-white";
  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";

  const ScaleSelect = ({ label, value, onChange, disabled }: any) => (
      <div>
          <label className={labelClass}>{label}</label>
          <select disabled={disabled} className={inputStyle} value={value} onChange={e => onChange(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
      </div>
  );

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
          <button onClick={() => setActiveTab('water')} className={`px-8 py-3 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === 'water' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Pluviómetro</button>
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
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic"><Activity size={48} className="mb-2 opacity-20"/> Sin datos suficientes.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                    <div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                        <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.3em] flex items-center"><Activity size={18} className="mr-3 text-hemp-600"/> Monitoreos Técnicos</h2>
                        {currentUser && <button onClick={() => { setIsRecordModalOpen(true); setIsViewMode(false); setEditingRecordId(null); setRecordForm({ ...recordForm, date: new Date().toISOString().split('T')[0], stage: 'Vegetativo' }); }} className="bg-hemp-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-hemp-700 transition">Nuevo Informe periódico</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest border-b dark:border-slate-800"><tr><th className="px-10 py-5">Fecha</th><th className="px-10 py-5">Etapa</th><th className="px-10 py-5 text-center">Altura</th><th className="px-10 py-5 text-center">Vigor (1-9)</th><th className="px-10 py-5 text-center">Temp/Hum</th><th className="px-10 py-5 text-right">Detalle</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold uppercase text-[11px]">{history.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => { setEditingRecordId(r.id); setRecordForm(r); setIsViewMode(true); setIsRecordModalOpen(true); }}>
                                    <td className="px-10 py-6 font-black text-gray-800 dark:text-white tracking-tighter">{r.date}</td>
                                    <td className="px-10 py-6"><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30">{r.stage}</span></td>
                                    <td className="px-10 py-6 text-center font-black text-gray-900 dark:text-white">{r.plantHeight} cm</td>
                                    <td className="px-10 py-6 text-center font-black text-emerald-600">{r.vigor || '-'}</td>
                                    <td className="px-10 py-6 text-center font-black text-slate-400 italic text-[9px]">{r.temperature}° / {r.humidity}%</td>
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
                      </div>
                      <div className="space-y-6">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center"><Navigation size={18} className="mr-2 text-emerald-600"/> Datos Geofísicos</h3>
                              <div className="space-y-4">
                                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Superficie Perimetral</p>
                                      <p className="text-3xl font-black text-emerald-800 dark:text-emerald-300">{plot.surfaceArea} <span className="text-sm">{plot.surfaceUnit}</span></p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'astro' && (
              <div className="animate-in fade-in space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-700 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
                           <div className="relative z-10">
                               <Sun size={48} className="mb-6 opacity-40"/>
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Duración del Día (Fotoperiodo)</p>
                               <h3 className="text-5xl font-black italic tracking-tighter mt-2">{astroData?.formatted || '12h 00m'}</h3>
                               <div className="mt-8 flex items-center gap-6">
                                   <div><p className="text-[9px] uppercase font-black opacity-50">Salida</p><p className="font-black">{astroData?.sunrise?.split('T')[1].substring(0,5) || '--:--'}</p></div>
                                   <div><p className="text-[9px] uppercase font-black opacity-50">Ocaso</p><p className="font-black">{astroData?.sunset?.split('T')[1].substring(0,5) || '--:--'}</p></div>
                               </div>
                           </div>
                           <Activity className="absolute -bottom-10 -right-10 w-64 h-64 opacity-5 pointer-events-none" />
                      </div>

                      <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col justify-between">
                           <div>
                               <Moon size={32} className="text-blue-400 mb-6"/>
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Estado de Influencia Lunar</p>
                               <h3 className="text-4xl font-black italic tracking-tighter mt-2">{calculateLunarPhase(new Date().toISOString())}</h3>
                           </div>
                           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-6">
                               <p className="text-[9px] font-bold text-slate-400 leading-relaxed italic">
                                   "El ciclo lunar afecta la presión osmótica de la planta, influyendo en la absorción de nutrientes y rinde final."
                               </p>
                           </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-10 rounded-[48px] shadow-sm flex flex-col">
                           <div className="flex justify-between items-center mb-6">
                               <Thermometer size={28} className="text-orange-500"/>
                               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Atmósfera Actual</span>
                           </div>
                           <div className="space-y-6">
                               <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temperatura Ambiente</p>
                                   <p className="text-4xl font-black dark:text-white">{autoWeather?.current?.temperature_2m || '--'}°C</p>
                               </div>
                               <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Humedad Relativa</p>
                                   <p className="text-4xl font-black dark:text-white">{autoWeather?.current?.relative_humidity_2m || '--'}%</p>
                               </div>
                           </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'logs' && (
              <div className="animate-in fade-in space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm sticky top-6">
                              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-6">Nueva Entrada <span className="text-hemp-600">Bitácora</span></h3>
                              <form onSubmit={handleSaveLog} className="space-y-4">
                                  <div>
                                      <label className={labelClass}>Fecha y Hora</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <input type="date" className={inputStyle} value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} />
                                          <input type="time" className={inputStyle} value={logForm.time} onChange={e => setLogForm({...logForm, time: e.target.value})} />
                                      </div>
                                  </div>
                                  <div>
                                      <label className={labelClass}>Observación Técnica</label>
                                      <textarea 
                                          required 
                                          className={`${inputStyle} h-32 resize-none text-xs`} 
                                          placeholder="Describa el evento, plaga detectada o labor realizada..."
                                          value={logForm.note}
                                          onChange={e => setLogForm({...logForm, note: e.target.value})}
                                      />
                                  </div>
                                  <div>
                                      <label className={`${labelClass} flex justify-between items-center`}>
                                          Captura Visual
                                          {isUploading && <Loader2 size={12} className="animate-spin text-hemp-600"/>}
                                      </label>
                                      <div className="relative group cursor-pointer">
                                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                          <div className="border-2 border-dashed dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 group-hover:bg-hemp-50 transition-colors">
                                              {logForm.photoUrl ? (
                                                  <img src={logForm.photoUrl} className="w-full h-32 object-cover rounded-xl shadow-md" />
                                              ) : (
                                                  <>
                                                      <Camera size={24} className="text-slate-300 mb-2"/>
                                                      <span className="text-[9px] font-black uppercase text-slate-400">Subir Evidencia</span>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50">
                                      {isSaving ? "Grabando..." : "Sellar Entrada"}
                                  </button>
                              </form>
                          </div>
                      </div>

                      <div className="lg:col-span-2 space-y-6">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] dark:text-white flex items-center"><MessageSquare size={16} className="mr-2 text-hemp-600"/> Historial Multimedia</h3>
                          {plotLogs.length === 0 ? (
                              <div className="bg-white dark:bg-slate-900 p-20 rounded-[40px] border border-dashed dark:border-slate-800 text-center text-slate-400">
                                  <ImageIcon size={48} className="mx-auto mb-4 opacity-20"/>
                                  <p className="font-black uppercase tracking-widest text-xs">Sin registros multimedia aún.</p>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  {plotLogs.map(log => (
                                      <div key={log.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                                          <div className="flex justify-between items-start mb-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-500"><Clock size={16}/></div>
                                                  <div>
                                                      <p className="text-[10px] font-black text-gray-800 dark:text-white uppercase tracking-tighter">{log.date}</p>
                                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{log.time || '--:--'} hs</p>
                                                  </div>
                                              </div>
                                              <button onClick={() => { if(window.confirm("¿Eliminar entrada?")) deleteLog(log.id); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                          </div>
                                          <div className="flex flex-col md:flex-row gap-6">
                                              {log.photoUrl && (
                                                  <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden cursor-pointer shadow-lg border border-white/10" onClick={() => setPreviewPhoto(log.photoUrl)}>
                                                      <img src={log.photoUrl} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                                  </div>
                                              )}
                                              <div className="flex-1">
                                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{log.note}</p>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'water' && <HydricBalance locationId={plot.locationId} plotId={plot.id} startDate={plot.sowingDate} />}
      </div>

      {/* MODAL INFORME PERIÓDICO */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto border border-white/10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Activity size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">Informe periódico <span className="text-hemp-600">Nucleus Trace</span></h2>
                        {isFetchingConditions && <div className="flex items-center text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1"><Loader2 className="animate-spin mr-1.5" size={10}/> Capturando Red Nucleus GFS...</div>}
                    </div>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSaveRecord} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* SECCIÓN 1: AMBIENTE */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b dark:border-slate-800 pb-2 flex items-center"><Sun size={14} className="mr-2"/> Ambiente & Tiempo</h3>
                        <div><label className={labelClass}>Fecha de Muestreo</label><input type="date" required disabled={isViewMode} className={inputStyle} value={recordForm.date} onChange={e => { setRecordForm({...recordForm, date: e.target.value}); if (!isViewMode) syncCurrentConditions(e.target.value); }} /></div>
                        <div><label className={labelClass}>Fase Fisiológica</label><select required disabled={isViewMode} className={inputStyle} value={recordForm.stage} onChange={e => setRecordForm({...recordForm, stage: e.target.value as any})}><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option></select></div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-orange-500 p-3 rounded-xl text-white text-center">
                                <p className="text-[8px] font-black uppercase opacity-60">Temp.</p>
                                <p className="text-sm font-black">{recordForm.temperature}°C</p>
                            </div>
                            <div className="bg-blue-600 p-3 rounded-xl text-white text-center">
                                <p className="text-[8px] font-black uppercase opacity-60">Hum.</p>
                                <p className="text-sm font-black">{recordForm.humidity}%</p>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl text-white text-center border border-white/10">
                            <p className="text-[8px] font-black uppercase opacity-60">Luz Solar / Fotoperiodo</p>
                            <p className="text-lg font-black">{recordForm.lightHours} h</p>
                        </div>
                    </div>

                    {/* SECCIÓN 2: EVALUACIÓN VEGETAL */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 border-b dark:border-slate-800 pb-2"><h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center"><Target size={14} className="mr-2"/> Evaluación Vegetal (1-9)</h3></div>
                            <div><label className={labelClass}>Población (Pl/m²)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantsPerMeter} onChange={e => setRecordForm({...recordForm, plantsPerMeter: Number(e.target.value)})} /></div>
                            <div><label className={labelClass}>Altura Media (cm)</label><input type="number" step="0.1" disabled={isViewMode} className={inputStyle} value={recordForm.plantHeight} onChange={e => setRecordForm({...recordForm, plantHeight: Number(e.target.value)})} /></div>
                            
                            <ScaleSelect label="Vigor (1-9)" value={recordForm.vigor} onChange={(v: number) => setRecordForm({...recordForm, vigor: v})} disabled={isViewMode}/>
                            <ScaleSelect label="Homogeneidad (1-9)" value={recordForm.uniformity} onChange={(v: number) => setRecordForm({...recordForm, uniformity: v})} disabled={isViewMode}/>
                            <ScaleSelect label="Encamado (Pour 1-9)" value={recordForm.lodging} onChange={(v: number) => setRecordForm({...recordForm, lodging: v})} disabled={isViewMode}/>
                            <ScaleSelect label="Daño Aves (1-9)" value={recordForm.birdDamage} onChange={(v: number) => setRecordForm({...recordForm, birdDamage: v})} disabled={isViewMode}/>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/30 grid grid-cols-2 gap-4">
                            <div className="col-span-2 border-b border-amber-100 dark:border-amber-900/30 pb-2"><h3 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center"><AlertCircle size={14} className="mr-2"/> Sanidad (1-9)</h3></div>
                            <ScaleSelect label="Enfermedades (1-9)" value={recordForm.diseasesScore} onChange={(v: number) => setRecordForm({...recordForm, diseasesScore: v})} disabled={isViewMode}/>
                            <ScaleSelect label="Plagas / Parásitos (1-9)" value={recordForm.pestsScore} onChange={(v: number) => setRecordForm({...recordForm, pestsScore: v})} disabled={isViewMode}/>
                        </div>
                    </div>

                    {/* SECCIÓN 3: REPRODUCCIÓN & COSECHA */}
                    <div className="bg-slate-900 p-6 rounded-[32px] text-white space-y-4">
                        <h3 className="text-[10px] font-black text-hemp-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center"><FlaskConical size={14} className="mr-2"/> Datos de Cosecha</h3>
                        <div><label className="text-[9px] uppercase font-black text-slate-400">Plena Floración (50%)</label><input type="date" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-hemp-500" value={recordForm.floweringDate} onChange={e => setRecordForm({...recordForm, floweringDate: e.target.value})} /></div>
                        <div><label className="text-[9px] uppercase font-black text-slate-400">Rendimiento Semillas (g)</label><input type="number" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-hemp-500" value={recordForm.seedYield} onChange={e => setRecordForm({...recordForm, seedYield: Number(e.target.value)})} /></div>
                        <div><label className="text-[9px] uppercase font-black text-slate-400">Peso Tallo / Biomasa (g)</label><input type="number" className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-hemp-500" value={recordForm.stemWeight} onChange={e => setRecordForm({...recordForm, stemWeight: Number(e.target.value)})} /></div>
                        
                        <div className="pt-4 space-y-3">
                            <label className="text-[9px] uppercase font-black text-hemp-400">Calidad Semilla</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div><p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Germinación %</p><input type="number" className="w-full bg-white/10 border-none p-2 rounded-lg text-xs" value={recordForm.seedQualityGermination} onChange={e => setRecordForm({...recordForm, seedQualityGermination: Number(e.target.value)})} /></div>
                                <div><p className="text-[8px] text-slate-500 font-bold uppercase mb-1">No Conforme %</p><input type="number" className="w-full bg-white/10 border-none p-2 rounded-lg text-xs" value={recordForm.seedQualityNonConformity} onChange={e => setRecordForm({...recordForm, seedQualityNonConformity: Number(e.target.value)})} /></div>
                            </div>
                        </div>
                    </div>
                </div>

                {!isViewMode && <button type="submit" disabled={isSaving || isFetchingConditions} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center hover:scale-[1.01] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>} 
                    Sellar Informe periódico Nucleus
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
