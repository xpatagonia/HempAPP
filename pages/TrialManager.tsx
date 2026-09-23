
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot } from '../types';
import { 
  FlaskConical, Save, Calendar, Activity, 
  Ruler, Thermometer, Droplets, ArrowRight,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, ChevronRight, Leaf, History, TrendingUp,
  Wind, Bug, Skull
} from 'lucide-react';

const fastUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function TrialManager() {
  const { plots, trialRecords, addTrialRecord, currentUser, locations, varieties } = useAppContext();
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [justSaved, setJustSaved] = useState(false);

  // Valores por defecto para carga rápida
  const [formData, setFormData] = useState<Partial<TrialRecord>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    stage: 'Vegetativo',
    plantHeight: 0,
    temperature: 24,
    humidity: 50,
    vigor: 8,
    pestsScore: 1,
    diseasesScore: 1
  });

  // 1. COLA DE TRABAJO INTELIGENTE
  // Ordena las parcelas: Primero las que hace más tiempo no se visitan
  const plotQueue = useMemo(() => {
      const active = plots.filter(p => p.status === 'Activa');
      
      return active.map(p => {
          const pRecords = trialRecords.filter(r => r.plotId === p.id);
          pRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          const lastRecord = pRecords[0];
          const lastDate = lastRecord ? new Date(lastRecord.date).getTime() : 0;
          // Si nunca se visitó, ponemos un número alto de días
          const daysSince = lastRecord ? Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)) : 999; 
          
          return {
              plot: p,
              lastRecord,
              daysSince,
              locationName: locations.find(l => l.id === p.locationId)?.name || 'S/D'
          };
      }).sort((a, b) => b.daysSince - a.daysSince); // Descendente (más urgentes arriba)
  }, [plots, trialRecords, locations]);

  const currentPlotData = useMemo(() => plotQueue.find(item => item.plot.id === selectedPlotId), [plotQueue, selectedPlotId]);
  const variety = varieties.find(v => v.id === currentPlotData?.plot.varietyId);

  // Auto-seleccionar el primero si no hay selección
  useEffect(() => {
      if (!selectedPlotId && plotQueue.length > 0) {
          setSelectedPlotId(plotQueue[0].plot.id);
      }
  }, [plotQueue.length]);

  // Pre-cargar datos lógicos al cambiar de parcela
  useEffect(() => {
      if (currentPlotData) {
          setFormData(prev => ({
              ...prev,
              // Mantenemos fecha/hora actual y clima, pero reseteamos medidas
              plantHeight: 0, 
              // Si hay registro anterior, sugerimos la misma etapa, si no, Vegetativo
              stage: currentPlotData.lastRecord?.stage || 'Vegetativo',
              vigor: 8,
              pestsScore: 1,
              diseasesScore: 1
          }));
      }
  }, [selectedPlotId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotId) return;

    // Use fastUUID to prevent crash on non-secure contexts where crypto.randomUUID is undefined
    const newId = (window.crypto as any).randomUUID ? (window.crypto as any).randomUUID() : fastUUID();

    const success = await addTrialRecord({
        ...formData,
        id: newId,
        plotId: selectedPlotId,
        createdBy: currentUser?.id,
        createdByName: currentUser?.name
    } as TrialRecord);

    if (success) {
        setJustSaved(true);
        setTimeout(() => {
            setJustSaved(false);
            // AUTO-AVANCE: Mover al siguiente de la lista
            const currentIndex = plotQueue.findIndex(p => p.plot.id === selectedPlotId);
            if (currentIndex < plotQueue.length - 1) {
                setSelectedPlotId(plotQueue[currentIndex + 1].plot.id);
            } else {
                alert("¡Recorrida completada! Has actualizado todas las parcelas activas.");
            }
        }, 1000);
    }
  };

  const GrowthIndicator = ({ current, previous }: { current: number, previous: number }) => {
      if (!previous) return <span className="text-gray-400 text-[10px]">Sin dato previo</span>;
      const diff = current - previous;
      if (diff > 0) return <span className="text-emerald-500 text-[10px] font-bold flex items-center">+{diff} cm <TrendingUp size={12} className="ml-1"/></span>;
      if (diff < 0) return <span className="text-red-500 text-[10px] font-bold flex items-center">{diff} cm <AlertTriangle size={12} className="ml-1"/></span>;
      return <span className="text-gray-400 text-[10px] font-bold">Sin cambios</span>;
  };

  return (
    <div className="animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
                <ClipboardList size={28} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">
                    Estación de <span className="text-emerald-600">Campo</span>
                </h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Modo de carga rápida para recorrida técnica
                </p>
            </div>
        </div>
        <div className="hidden md:flex items-center space-x-4 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border dark:border-slate-800 shadow-sm">
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
                <p className="text-xl font-black text-slate-800 dark:text-white leading-none">{plotQueue.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Críticas (+7d)</p>
                <p className="text-xl font-black text-red-500 leading-none">{plotQueue.filter(p => p.daysSince > 7).length}</p>
            </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
          
          {/* SIDEBAR: COLA DE TRABAJO */}
          <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
              <div className="p-5 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
                      <Clock size={14} className="mr-2"/> Próximos Lotes
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {plotQueue.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs font-bold italic">
                          No hay parcelas activas.
                      </div>
                  ) : (
                      plotQueue.map((item) => (
                          <button
                            key={item.plot.id}
                            onClick={() => setSelectedPlotId(item.plot.id)}
                            className={`w-full p-4 rounded-2xl text-left transition-all border group relative overflow-hidden ${
                                selectedPlotId === item.plot.id 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' 
                                : 'bg-white dark:bg-slate-800 border-transparent hover:border-emerald-200 dark:hover:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                              <div className="flex justify-between items-start mb-1 relative z-10">
                                  <span className="font-black uppercase tracking-tighter text-sm truncate pr-2">{item.plot.name}</span>
                                  {item.daysSince > 7 ? (
                                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center flex-shrink-0 ${selectedPlotId === item.plot.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                          <AlertTriangle size={8} className="mr-1"/> +{item.daysSince}d
                                      </span>
                                  ) : (
                                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex-shrink-0 ${selectedPlotId === item.plot.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                          Hace {item.daysSince}d
                                      </span>
                                  )}
                              </div>
                              <p className={`text-[10px] uppercase font-bold tracking-widest relative z-10 truncate ${selectedPlotId === item.plot.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                                  {item.locationName}
                              </p>
                              {/* Indicador visual de urgencia */}
                              <div className={`absolute bottom-0 left-0 h-1 transition-all ${item.daysSince > 7 ? 'bg-red-500' : 'bg-emerald-400'} opacity-30`} style={{ width: `${Math.min(item.daysSince * 10, 100)}%` }}></div>
                          </button>
                      ))
                  )}
              </div>
          </div>

          {/* MAIN: FORMULARIO DE CARGA */}
          <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-[40px] shadow-xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative h-full">
              {currentPlotData ? (
                  <>
                    {/* Header Parcela */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-6 border-b dark:border-slate-800 flex justify-between items-end flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{currentPlotData.plot.type}</span>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{variety?.name || 'S/D'}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic leading-none">
                                {currentPlotData.plot.name}
                            </h2>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registro Anterior</p>
                            {currentPlotData.lastRecord ? (
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-end gap-2">
                                        <History size={14}/> {currentPlotData.lastRecord.date}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 font-bold">
                                        h: {currentPlotData.lastRecord.plantHeight}cm • {currentPlotData.lastRecord.stage}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic font-bold bg-slate-200 px-2 py-1 rounded">Sin Datos Previos</p>
                            )}
                        </div>
                    </div>

                    <form className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            
                            {/* SECCIÓN 1: BIOMETRÍA (Controles Grandes) */}
                            <div className="space-y-8">
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
                                    <label className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-4 block flex items-center">
                                        <Ruler size={14} className="mr-2"/> Altura Planta (cm)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <button type="button" onClick={() => setFormData(p => ({...p, plantHeight: Math.max(0, (p.plantHeight||0) - 5)}))} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 font-black text-xl hover:bg-emerald-50 active:scale-95 transition">-</button>
                                        <input 
                                            type="number" 
                                            className="w-full bg-white dark:bg-slate-950 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 text-4xl font-black text-center text-emerald-600 outline-none focus:border-emerald-500 transition-all shadow-inner"
                                            value={formData.plantHeight}
                                            onChange={e => setFormData({...formData, plantHeight: Number(e.target.value)})}
                                        />
                                        <button type="button" onClick={() => setFormData(p => ({...p, plantHeight: (p.plantHeight||0) + 5}))} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 font-black text-xl hover:bg-emerald-50 active:scale-95 transition">+</button>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <GrowthIndicator current={formData.plantHeight || 0} previous={currentPlotData.lastRecord?.plantHeight || 0} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Etapa Fenológica</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Vegetativo', 'Floración', 'Maduración', 'Cosecha'].map(stage => (
                                            <button
                                                key={stage}
                                                type="button"
                                                onClick={() => setFormData({...formData, stage: stage as any})}
                                                className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                                    formData.stage === stage 
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.02]' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-emerald-200'
                                                }`}
                                            >
                                                {stage}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: ESTADO SANITARIO (Sliders) */}
                            <div className="space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800">
                                    <div className="flex justify-between mb-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 flex items-center"><Activity size={14} className="mr-2"/> Vigor General (1-9)</label>
                                        <span className={`text-xl font-black ${formData.vigor! >= 7 ? 'text-green-500' : formData.vigor! >= 5 ? 'text-amber-500' : 'text-red-500'}`}>{formData.vigor}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" max="9" step="1"
                                        className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                        value={formData.vigor}
                                        onChange={e => setFormData({...formData, vigor: Number(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mt-2">
                                        <span>1 (Muerta)</span>
                                        <span>5 (Regular)</span>
                                        <span>9 (Excelente)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-3xl border border-red-100 dark:border-red-900/20">
                                        <label className="text-[9px] font-black uppercase text-red-700 dark:text-red-400 mb-2 block flex items-center"><Bug size={12} className="mr-1"/> Plagas</label>
                                        <select 
                                            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-black p-2 outline-none text-red-600"
                                            value={formData.pestsScore}
                                            onChange={e => setFormData({...formData, pestsScore: Number(e.target.value)})}
                                        >
                                            <option value="1">1 - Sin Presencia</option>
                                            <option value="3">3 - Leve</option>
                                            <option value="5">5 - Moderado</option>
                                            <option value="7">7 - Severo</option>
                                            <option value="9">9 - Crítico</option>
                                        </select>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-900/20">
                                        <label className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 mb-2 block flex items-center"><Skull size={12} className="mr-1"/> Enferm.</label>
                                        <select 
                                            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-black p-2 outline-none text-amber-600"
                                            value={formData.diseasesScore}
                                            onChange={e => setFormData({...formData, diseasesScore: Number(e.target.value)})}
                                        >
                                            <option value="1">1 - Sano</option>
                                            <option value="3">3 - Leve</option>
                                            <option value="5">5 - Visible</option>
                                            <option value="7">7 - Extendido</option>
                                            <option value="9">9 - Perdido</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Temperatura</label>
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl flex items-center border dark:border-slate-700">
                                            <Thermometer size={14} className="text-orange-500 mr-2"/>
                                            <input type="number" className="w-full bg-transparent font-black text-sm outline-none dark:text-white" value={formData.temperature} onChange={e => setFormData({...formData, temperature: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Humedad %</label>
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl flex items-center border dark:border-slate-700">
                                            <Droplets size={14} className="text-blue-500 mr-2"/>
                                            <input type="number" className="w-full bg-transparent font-black text-sm outline-none dark:text-white" value={formData.humidity} onChange={e => setFormData({...formData, humidity: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* FOOTER ACCIONES */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0,5)}
                        </div>
                        <button 
                            onClick={handleSave}
                            className={`px-8 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center transition-all hover:scale-[1.02] active:scale-95 ${justSaved ? 'bg-green-500 text-white' : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-black dark:hover:bg-emerald-700'}`}
                        >
                            {justSaved ? <CheckCircle2 size={18} className="mr-2"/> : <Save size={18} className="mr-2"/>}
                            {justSaved ? '¡Registrado!' : 'Guardar y Siguiente'} <ChevronRight size={16} className="ml-2"/>
                        </button>
                    </div>
                  </>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center bg-gray-50 dark:bg-slate-950/50">
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-full mb-6 shadow-sm">
                          <CheckCircle2 size={64} className="text-green-500"/>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 mb-2">Todo al Día</h3>
                      <p className="text-sm font-medium max-w-xs mx-auto text-slate-500">No hay más parcelas activas pendientes de revisión en la cola de trabajo.</p>
                      <button onClick={() => window.location.reload()} className="mt-8 text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Refrescar Lista</button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
