import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot, Location } from '../types';
import { 
  FlaskConical, Save, Calendar, Activity, 
  Ruler, Thermometer, Droplets, ArrowRight,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, ChevronRight, Leaf, History, TrendingUp,
  Sun, Moon, Target, AlertCircle, Loader2, ExternalLink, Filter, Search, Check, Sprout, ChevronLeft
} from 'lucide-react';

const fastUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const calculateLunarPhase = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const cycle = 29.53058867;
    const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
    const diff = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
    const pos = (diff % cycle) / cycle;
    if (pos < 0.06 || pos >= 0.94) return 'Nueva';
    if (pos < 0.44) return 'Creciente';
    if (pos < 0.56) return 'Llena';
    return 'Menguante';
};

export default function TrialManager() {
  const { plots, trialRecords, addTrialRecord, currentUser, locations, varieties } = useAppContext();
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [justSaved, setJustSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingConditions, setIsFetchingConditions] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Ensayo' | 'Comercial'>('all');

  // Valores predeterminados oficiales idénticos a la ficha técnica "Informe periódico Nucleus Trace"
  const [formData, setFormData] = useState<Partial<TrialRecord>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    stage: 'Vegetativo',
    temperature: 11,
    humidity: 85,
    lightHours: 13.17,
    lunarPhase: 'Nueva',
    plantsPerMeter: 0,
    plantHeight: 0,
    vigor: 9,
    uniformity: 9,
    lodging: 1,
    birdDamage: 1,
    diseasesScore: 1,
    pestsScore: 1,
    floweringDate: '',
    seedYield: 0,
    stemWeight: 0,
    seedQualityGermination: 90,
    seedQualityNonConformity: 0
  });

  // 1. COLA DE TRABAJO INTELIGENTE: Ordena las parcelas por días desde la última visita
  const plotQueue = useMemo(() => {
      const active = plots.filter(p => p.status === 'Activa');
      
      const mapped = active.map(p => {
          const pRecords = trialRecords.filter(r => r.plotId === p.id);
          pRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          const lastRecord = pRecords[0];
          const lastDate = lastRecord ? new Date(lastRecord.date).getTime() : 0;
          const daysSince = lastRecord ? Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)) : 999; 
          const loc = locations.find(l => l.id === p.locationId);
          const varObj = varieties.find(v => v.id === p.varietyId);
          
          return {
              plot: p,
              lastRecord,
              daysSince,
              locationName: loc?.name || 'S/D',
              varietyName: varObj?.name || 'S/D',
              location: loc
          };
      }).sort((a, b) => b.daysSince - a.daysSince);

      return mapped.filter(item => {
          if (typeFilter !== 'all' && item.plot.type !== typeFilter) return false;
          if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return item.plot.name.toLowerCase().includes(q) || 
                     item.locationName.toLowerCase().includes(q) ||
                     item.varietyName.toLowerCase().includes(q);
          }
          return true;
      });
  }, [plots, trialRecords, locations, varieties, typeFilter, searchQuery]);

  const currentPlotData = useMemo(() => plotQueue.find(item => item.plot.id === selectedPlotId) || plotQueue[0], [plotQueue, selectedPlotId]);
  const variety = varieties.find(v => v.id === currentPlotData?.plot.varietyId);
  const plotHistory = useMemo(() => {
      if (!currentPlotData) return [];
      return trialRecords
          .filter(r => r.plotId === currentPlotData.plot.id)
          .sort((a,b) => new Date(b.date + (b.time ? 'T' + b.time : '')).getTime() - new Date(a.date + (a.time ? 'T' + a.time : '')).getTime());
  }, [trialRecords, currentPlotData]);

  // Auto-seleccionar el primero si no hay selección
  useEffect(() => {
      if (!selectedPlotId && plotQueue.length > 0) {
          setSelectedPlotId(plotQueue[0].plot.id);
      }
  }, [plotQueue.length]);

  // Sincronización ambiental con Open-Meteo y Sunrise-Sunset (Red GFS)
  const syncEnvironmentalData = async (targetDate: string, plotLocation?: Location) => {
      setIsFetchingConditions(true);
      try {
          const lat = plotLocation?.coordinates?.lat || -38.95;
          const lng = plotLocation?.coordinates?.lng || -68.05;
          const isToday = targetDate === new Date().toISOString().split('T')[0];
          let temp = 11;
          let hum = 85;

          if (isToday) {
              const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&timezone=auto`);
              const wData = await wRes.json();
              if (wData.current) {
                  temp = Math.round(wData.current.temperature_2m ?? 11);
                  hum = Math.round(wData.current.relative_humidity_2m ?? 85);
              }
          } else {
              const wRes = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`);
              const wData = await wRes.json();
              if (wData.hourly && wData.hourly.temperature_2m?.length) {
                  temp = Math.round(wData.hourly.temperature_2m.reduce((a:number,b:number)=>a+b,0) / wData.hourly.temperature_2m.length);
                  hum = Math.round(wData.hourly.relative_humidity_2m.reduce((a:number,b:number)=>a+b,0) / wData.hourly.relative_humidity_2m.length);
              }
          }
          const aRes = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${targetDate}&formatted=0`);
          const aData = await aRes.json();
          const lunar = calculateLunarPhase(targetDate);
          const hours = aData.results ? parseFloat((aData.results.day_length / 3600).toFixed(2)) : 13.17;
          
          setFormData(p => ({
              ...p,
              temperature: temp,
              humidity: hum,
              lightHours: hours,
              lunarPhase: lunar
          }));
      } catch (err) {
          console.error("Sync Error:", err);
          const lunar = calculateLunarPhase(targetDate);
          setFormData(p => ({
              ...p,
              lunarPhase: lunar,
              lightHours: p.lightHours || 13.17
          }));
      } finally {
          setIsFetchingConditions(false);
      }
  };

  // Pre-cargar datos lógicos al cambiar de parcela seleccionada
  useEffect(() => {
      if (currentPlotData) {
          const today = new Date().toISOString().split('T')[0];
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          const last = currentPlotData.lastRecord;
          
          setFormData({
              date: today,
              time: nowTime,
              stage: last?.stage || 'Vegetativo',
              plantHeight: last?.plantHeight || 0,
              plantsPerMeter: last?.plantsPerMeter || 0,
              temperature: 11,
              humidity: 85,
              lightHours: 13.17,
              lunarPhase: calculateLunarPhase(today),
              vigor: 9,
              uniformity: 9,
              lodging: 1,
              birdDamage: 1,
              diseasesScore: 1,
              pestsScore: 1,
              floweringDate: last?.floweringDate || '',
              seedYield: last?.seedYield || 0,
              stemWeight: last?.stemWeight || 0,
              seedQualityGermination: 90,
              seedQualityNonConformity: 0
          });

          // Disparar sincronización ambiental con las coordenadas del campo
          syncEnvironmentalData(today, currentPlotData.location);
      }
  }, [currentPlotData?.plot.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlotData?.plot.id) return;

    setIsSaving(true);
    const newId = (window.crypto as any).randomUUID ? (window.crypto as any).randomUUID() : fastUUID();

    try {
        const success = await addTrialRecord({
            ...formData,
            id: newId,
            plotId: currentPlotData.plot.id,
            createdBy: currentUser?.id,
            createdByName: currentUser?.name
        } as TrialRecord);

        if (success) {
            setJustSaved(true);
            setTimeout(() => {
                setJustSaved(false);
                if (autoAdvance) {
                    const currentIndex = plotQueue.findIndex(p => p.plot.id === currentPlotData.plot.id);
                    if (currentIndex < plotQueue.length - 1) {
                        setSelectedPlotId(plotQueue[currentIndex + 1].plot.id);
                    }
                }
            }, 1200);
        }
    } finally {
        setIsSaving(false);
    }
  };

  const GrowthIndicator = ({ current, previous }: { current: number, previous: number }) => {
      if (!previous) return <span className="text-gray-400 text-[10px]">Sin dato previo</span>;
      const diff = current - previous;
      if (diff > 0) return <span className="text-emerald-500 text-[10px] font-bold flex items-center">+{diff} cm <TrendingUp size={12} className="ml-1"/></span>;
      if (diff < 0) return <span className="text-red-500 text-[10px] font-bold flex items-center">{diff} cm <AlertTriangle size={12} className="ml-1"/></span>;
      return <span className="text-gray-400 text-[10px] font-bold">Sin variación</span>;
  };

  const inputStyle = "w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm dark:text-white";
  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";

  const ScaleSelect = ({ label, value, onChange, disabled }: { label: string; value?: number; onChange: (v: number) => void; disabled?: boolean }) => (
      <div>
          <label className={labelClass}>{label}</label>
          <select disabled={disabled} className={inputStyle} value={value ?? 1} onChange={e => onChange(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
      </div>
  );

  return (
    <div className="animate-in fade-in duration-500 min-h-[calc(100vh-140px)] flex flex-col space-y-6 pb-12">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3.5 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
                <ClipboardList size={28} />
            </div>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">
                    Monitoreo <span className="text-emerald-600">Agronómico</span>
                </h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Relevamiento técnico y biométrico en lotes productivos y ensayos • Protocolo Oficial Nucleus Trace
                </p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center space-x-4 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl border dark:border-slate-800 shadow-sm">
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lotes Activos</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{plotQueue.length}</p>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Urgentes (+7d)</p>
                    <p className="text-lg font-black text-red-500 leading-none">{plotQueue.filter(p => p.daysSince > 7).length}</p>
                </div>
            </div>
            {currentPlotData && (
                <Link 
                    to={`/plots/${currentPlotData.plot.id}`}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 border dark:border-slate-700 shadow-sm"
                    title="Ver Ficha Técnica completa de la parcela seleccionada"
                >
                    <ExternalLink size={14}/> Ficha de Parcela
                </Link>
            )}
        </div>
      </div>

      {/* GRID PRINCIPAL: COLA DE LOTES + FICHA TÉCNICA NUCLEUS TRACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          {/* SIDEBAR: COLA DE TRABAJO Y RECORRIDA DE LOTES */}
          <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-[750px]">
              <div className="p-5 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 space-y-3">
                  <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
                          <Clock size={14} className="mr-2"/> Recorrida de Lotes
                      </h3>
                      <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                          Prioridad por antigüedad
                      </span>
                  </div>

                  {/* Búsqueda y Filtro de Tipo */}
                  <div className="space-y-2">
                      <div className="relative">
                          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                          <input 
                              type="text"
                              placeholder="Buscar parcela, campo o variedad..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                      </div>
                      <div className="flex gap-1.5">
                          {(['all', 'Ensayo', 'Comercial'] as const).map(f => (
                              <button
                                  key={f}
                                  type="button"
                                  onClick={() => setTypeFilter(f)}
                                  className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${typeFilter === f ? 'bg-slate-800 dark:bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                              >
                                  {f === 'all' ? 'Todos' : f === 'Ensayo' ? 'Ensayos' : 'Comerciales'}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {plotQueue.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
                          No se encontraron parcelas que coincidan con la búsqueda.
                      </div>
                  ) : (
                      plotQueue.map((item) => {
                          const isSelected = currentPlotData?.plot.id === item.plot.id;
                          return (
                              <button
                                key={item.plot.id}
                                onClick={() => setSelectedPlotId(item.plot.id)}
                                className={`w-full p-4 rounded-2xl text-left transition-all border group relative overflow-hidden ${
                                    isSelected 
                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' 
                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 hover:bg-emerald-50/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                  <div className="flex justify-between items-start mb-1 relative z-10">
                                      <div className="truncate pr-2">
                                          <span className="font-black uppercase tracking-tighter text-sm truncate block">{item.plot.name}</span>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                                  {item.plot.type}
                                              </span>
                                              <span className={`text-[9px] font-bold uppercase truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                  {item.varietyName}
                                              </span>
                                          </div>
                                      </div>
                                      {item.daysSince > 7 ? (
                                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                              <AlertTriangle size={8} className="mr-1"/> +{item.daysSince}d
                                          </span>
                                      ) : (
                                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300'}`}>
                                              Hace {item.daysSince === 999 ? 'S/D' : `${item.daysSince}d`}
                                          </span>
                                      )}
                                  </div>
                                  <p className={`text-[9px] uppercase font-bold tracking-widest relative z-10 truncate mt-1 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                      {item.locationName}
                                  </p>
                                  {/* Indicador visual de urgencia */}
                                  <div className={`absolute bottom-0 left-0 h-1 transition-all ${item.daysSince > 7 ? 'bg-red-500' : 'bg-emerald-400'} opacity-40`} style={{ width: `${Math.min(item.daysSince * 10, 100)}%` }}></div>
                              </button>
                          );
                      })
                  )}
              </div>
          </div>

          {/* PANEL PRINCIPAL: FICHA TÉCNICA OFICIAL "INFORME PERIÓDICO NUCLEUS TRACE" */}
          <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-[36px] shadow-xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative min-h-[750px]">
              {currentPlotData ? (
                  <>
                    {/* ENCABEZADO DE LA PARCELA SELECCIONADA */}
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-6 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">
                                    {currentPlotData.plot.type}
                                </span>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                    Genética: {variety?.name || 'S/D'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    • {currentPlotData.locationName}
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic leading-none">
                                {currentPlotData.plot.name}
                            </h2>
                        </div>

                        {/* SELECTOR DE PESTAÑAS: FORMULARIO vs HISTORIAL */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border dark:border-slate-800 shadow-sm self-stretch sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setActiveTab('form')}
                                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'form' 
                                    ? 'bg-emerald-600 text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <Activity size={12}/> Ficha de Relevamiento
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'history' 
                                    ? 'bg-emerald-600 text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <History size={12}/> Historial ({plotHistory.length})
                            </button>
                        </div>
                    </div>

                    {/* VISTA 1: FORMULARIO OFICIAL INFORME PERIÓDICO NUCLEUS TRACE */}
                    {activeTab === 'form' && (
                        <div className="flex-1 flex flex-col justify-between">
                            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                                
                                {/* TÍTULO OFICIAL DE LA FICHA NUCLEUS TRACE */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-hemp-600 p-2.5 rounded-2xl text-white shadow-md">
                                            <Activity size={20}/>
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black dark:text-white uppercase tracking-tighter italic">
                                                Informe periódico <span className="text-emerald-600">Nucleus Trace</span>
                                            </h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                Estándar de Trazabilidad y Calidad de Red Cooperativa
                                            </p>
                                        </div>
                                    </div>
                                    {isFetchingConditions && (
                                        <div className="flex items-center text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                            <Loader2 className="animate-spin mr-1.5" size={12}/> Capturando Red Nucleus GFS...
                                        </div>
                                    )}
                                </div>

                                {/* GRILLA ESTRUCTURAL IDÉNTICA A PLOTDETAILS */}
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    
                                    {/* COLUMNA 1: AMBIENTE & TIEMPO */}
                                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800 space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b dark:border-slate-800 pb-2 flex items-center">
                                            <Sun size={14} className="mr-2 text-amber-500"/> Ambiente & Tiempo
                                        </h3>
                                        <div>
                                            <label className={labelClass}>Fecha de Muestreo</label>
                                            <input 
                                                type="date" 
                                                required 
                                                className={inputStyle} 
                                                value={formData.date} 
                                                onChange={e => { 
                                                    const newDate = e.target.value;
                                                    setFormData(p => ({...p, date: newDate})); 
                                                    syncEnvironmentalData(newDate, currentPlotData.location);
                                                }} 
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Hora de Muestreo</label>
                                            <input 
                                                type="time" 
                                                required 
                                                className={inputStyle} 
                                                value={formData.time} 
                                                onChange={e => setFormData({...formData, time: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Fase Fisiológica</label>
                                            <select 
                                                required 
                                                className={inputStyle} 
                                                value={formData.stage} 
                                                onChange={e => setFormData({...formData, stage: e.target.value as any})}
                                            >
                                                <option value="Vegetativo">Vegetativo</option>
                                                <option value="Floración">Floración</option>
                                                <option value="Maduración">Maduración</option>
                                                <option value="Cosecha">Cosecha</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-orange-500 p-3 rounded-xl text-white text-center shadow-sm">
                                                <p className="text-[8px] font-black uppercase opacity-75">Temp.</p>
                                                <p className="text-base font-black">{formData.temperature}°C</p>
                                            </div>
                                            <div className="bg-blue-600 p-3 rounded-xl text-white text-center shadow-sm">
                                                <p className="text-[8px] font-black uppercase opacity-75">Hum.</p>
                                                <p className="text-base font-black">{formData.humidity}%</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-xl text-white text-center border border-white/10 flex flex-col justify-center gap-2">
                                            <div>
                                                <p className="text-[8px] font-black uppercase opacity-60">Luz Solar / Fotoperiodo</p>
                                                <p className="text-lg font-black">{formData.lightHours} h</p>
                                            </div>
                                            <div className="border-t border-white/10 pt-2">
                                                <p className="text-[8px] font-black uppercase opacity-60">Luna</p>
                                                <p className="text-xs font-black text-amber-400 uppercase tracking-widest">{formData.lunarPhase || 'Nueva'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLUMNAS 2 & 3: EVALUACIÓN VEGETAL (1-9) + SANIDAD (1-9) */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2 border-b dark:border-slate-800 pb-2">
                                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                                                    <Target size={14} className="mr-2"/> Evaluación Vegetal (1-9)
                                                </h3>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Población (Pl/m²)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className={inputStyle} 
                                                    value={formData.plantsPerMeter} 
                                                    onChange={e => setFormData({...formData, plantsPerMeter: Number(e.target.value)})} 
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Altura Media (cm)</label>
                                                    <GrowthIndicator 
                                                        current={formData.plantHeight || 0} 
                                                        previous={currentPlotData.lastRecord?.plantHeight || 0} 
                                                    />
                                                </div>
                                                <input 
                                                    type="number" 
                                                    step="0.1" 
                                                    className={inputStyle} 
                                                    value={formData.plantHeight} 
                                                    onChange={e => setFormData({...formData, plantHeight: Number(e.target.value)})} 
                                                />
                                            </div>
                                            <ScaleSelect 
                                                label="Vigor (1-9)" 
                                                value={formData.vigor} 
                                                onChange={(v: number) => setFormData({...formData, vigor: v})} 
                                            />
                                            <ScaleSelect 
                                                label="Homogeneidad (1-9)" 
                                                value={formData.uniformity} 
                                                onChange={(v: number) => setFormData({...formData, uniformity: v})} 
                                            />
                                            <ScaleSelect 
                                                label="Encamado (Pour 1-9)" 
                                                value={formData.lodging} 
                                                onChange={(v: number) => setFormData({...formData, lodging: v})} 
                                            />
                                            <ScaleSelect 
                                                label="Daño Aves (1-9)" 
                                                value={formData.birdDamage} 
                                                onChange={(v: number) => setFormData({...formData, birdDamage: v})} 
                                            />
                                        </div>

                                        <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/30 grid grid-cols-2 gap-4">
                                            <div className="col-span-2 border-b border-amber-100 dark:border-amber-900/30 pb-2">
                                                <h3 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center">
                                                    <AlertCircle size={14} className="mr-2"/> Sanidad (1-9)
                                                </h3>
                                            </div>
                                            <ScaleSelect 
                                                label="Enfermedades (1-9)" 
                                                value={formData.diseasesScore} 
                                                onChange={(v: number) => setFormData({...formData, diseasesScore: v})} 
                                            />
                                            <ScaleSelect 
                                                label="Plagas / Parásitos (1-9)" 
                                                value={formData.pestsScore} 
                                                onChange={(v: number) => setFormData({...formData, pestsScore: v})} 
                                            />
                                        </div>
                                    </div>

                                    {/* COLUMNA 4: DATOS DE COSECHA & CALIDAD SEMILLA */}
                                    <div className="bg-slate-900 p-6 rounded-[32px] text-white space-y-4 shadow-sm">
                                        <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex items-center">
                                            <FlaskConical size={14} className="mr-2"/> Datos de Cosecha
                                        </h3>
                                        <div>
                                            <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Plena Floración (50%)</label>
                                            <input 
                                                type="date" 
                                                className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                                                value={formData.floweringDate} 
                                                onChange={e => setFormData({...formData, floweringDate: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Rendimiento Semillas (g)</label>
                                            <input 
                                                type="number" 
                                                className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                                                value={formData.seedYield} 
                                                onChange={e => setFormData({...formData, seedYield: Number(e.target.value)})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Peso Tallo / Biomasa (g)</label>
                                            <input 
                                                type="number" 
                                                className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                                                value={formData.stemWeight} 
                                                onChange={e => setFormData({...formData, stemWeight: Number(e.target.value)})} 
                                            />
                                        </div>
                                        <div className="pt-3 space-y-2 border-t border-white/10">
                                            <label className="text-[9px] uppercase font-black text-emerald-400 block">Calidad Semilla</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">Germinación %</p>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-white/10 border-none p-2 rounded-lg text-xs font-bold text-center" 
                                                        value={formData.seedQualityGermination} 
                                                        onChange={e => setFormData({...formData, seedQualityGermination: Number(e.target.value)})} 
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">No Conforme %</p>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-white/10 border-none p-2 rounded-lg text-xs font-bold text-center" 
                                                        value={formData.seedQualityNonConformity} 
                                                        onChange={e => setFormData({...formData, seedQualityNonConformity: Number(e.target.value)})} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FOOTER DE ACCIONES Y SELLADO */}
                                <div className="pt-4 border-t dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={autoAdvance} 
                                            onChange={e => setAutoAdvance(e.target.checked)}
                                            className="rounded accent-emerald-600 w-4 h-4"
                                        />
                                        <span>Avanzar automáticamente al siguiente lote de la recorrida</span>
                                    </label>

                                    <button 
                                        type="submit"
                                        disabled={isSaving || isFetchingConditions}
                                        className={`w-full sm:w-auto px-10 py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.25em] shadow-2xl flex items-center justify-center transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 ${
                                            justSaved 
                                            ? 'bg-emerald-600 text-white' 
                                            : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-black dark:hover:bg-emerald-700'
                                        }`}
                                    >
                                        {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : justSaved ? <CheckCircle2 className="mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                                        {justSaved ? '¡Informe Sellado con Éxito!' : 'Sellar Informe periódico Nucleus'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* VISTA 2: HISTORIAL DE INFORMES REGISTRADOS EN ESTA PARCELA */}
                    {activeTab === 'history' && (
                        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                                        Historial de Informes Registrados
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Auditoría completa de visitas y evolución biométrica de {currentPlotData.plot.name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('form')}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-emerald-700 transition"
                                >
                                    + Cargar Nuevo Informe
                                </button>
                            </div>

                            {plotHistory.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic font-bold bg-slate-50 dark:bg-slate-950/50 rounded-3xl border dark:border-slate-800">
                                    No hay informes registrados aún para este lote.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {plotHistory.map(record => (
                                        <div 
                                            key={record.id}
                                            className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-emerald-50/20 transition-all space-y-3"
                                        >
                                            <div className="flex flex-wrap justify-between items-center gap-2 border-b dark:border-slate-800 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-slate-800 dark:text-white text-sm">
                                                        {record.date} <span className="text-xs font-normal text-slate-400">{record.time || ''} HS</span>
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        {record.stage}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                    Auditado por: {record.createdByName || 'Técnico Nucleus'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Altura Media</p>
                                                    <p className="font-black text-emerald-600 text-sm">{record.plantHeight || 0} cm</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Población</p>
                                                    <p className="font-black text-slate-700 dark:text-slate-200 text-sm">{record.plantsPerMeter || 0} pl/m²</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Vigor / Homog.</p>
                                                    <p className="font-black text-emerald-600 text-sm">{record.vigor || '-'}/9 • {record.uniformity || '-'}/9</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Sanidad (Enf/Plag)</p>
                                                    <p className="font-black text-amber-600 text-sm">{record.diseasesScore || 1}/9 • {record.pestsScore || 1}/9</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Clima / Fotoperiodo</p>
                                                    <p className="font-black text-slate-600 dark:text-slate-300 text-sm">{record.temperature}°C • {record.lightHours || 12}h</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Calidad Semilla</p>
                                                    <p className="font-black text-slate-700 dark:text-slate-200 text-sm">{record.seedQualityGermination || 90}% Germ.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                  </>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center bg-gray-50 dark:bg-slate-950/50">
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-full mb-6 shadow-sm">
                          <CheckCircle2 size={64} className="text-emerald-500"/>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 mb-2">
                          Recorrida Completada
                      </h3>
                      <p className="text-sm font-medium max-w-xs mx-auto text-slate-500">
                          Todos los lotes productivos y ensayos de la cooperativa están al día con sus relevamientos.
                      </p>
                      <button 
                          onClick={() => window.location.reload()} 
                          className="mt-8 text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline"
                      >
                          Refrescar Lista
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
