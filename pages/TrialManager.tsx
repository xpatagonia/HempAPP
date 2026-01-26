
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrialRecord, Plot } from '../types';
import { 
  FlaskConical, Save, Calendar, Activity, 
  Ruler, Thermometer, Droplets, ArrowRight,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, ChevronRight, Leaf, History, TrendingUp
} from 'lucide-react';

export default function TrialManager() {
  const { plots, trialRecords, addTrialRecord, currentUser, locations, varieties } = useAppContext();
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  
  // Estado para feedback visual de guardado
  const [justSaved, setJustSaved] = useState(false);

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

  // 1. CALCULAMOS LA "COLA DE TRABAJO"
  // Ordenamos las parcelas por fecha de último registro (las más antiguas primero)
  const plotQueue = useMemo(() => {
      const active = plots.filter(p => p.status === 'Activa');
      
      return active.map(p => {
          const pRecords = trialRecords.filter(r => r.plotId === p.id);
          // Ordenar descendente para obtener el último
          pRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          const lastRecord = pRecords[0];
          const lastDate = lastRecord ? new Date(lastRecord.date).getTime() : 0;
          const daysSince = Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24));
          
          return {
              plot: p,
              lastRecord,
              daysSince,
              locationName: locations.find(l => l.id === p.locationId)?.name || 'S/D'
          };
      }).sort((a, b) => b.daysSince - a.daysSince); // Mayor tiempo sin ver primero
  }, [plots, trialRecords, locations]);

  const currentPlotData = useMemo(() => plotQueue.find(item => item.plot.id === selectedPlotId), [plotQueue, selectedPlotId]);
  const variety = varieties.find(v => v.id === currentPlotData?.plot.varietyId);

  // Seleccionar automáticamente la primera de la lista si no hay selección
  useEffect(() => {
      if (!selectedPlotId && plotQueue.length > 0) {
          setSelectedPlotId(plotQueue[0].plot.id);
      }
  }, [plotQueue.length]); // Solo al cargar o cambiar longitud

  // Efecto para precargar datos lógicos al cambiar de parcela
  useEffect(() => {
      if (currentPlotData?.lastRecord) {
          // Pre-llenar con datos anteriores lógicos (etapa sigue igual o avanza, altura igual o mayor)
          setFormData(prev => ({
              ...prev,
              stage: currentPlotData.lastRecord.stage,
              // No precargamos altura para obligar a medir, pero sí mantenemos clima por defecto
          }));
      }
  }, [selectedPlotId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotId) return;

    const success = await addTrialRecord({
        ...formData,
        id: crypto.randomUUID(),
        plotId: selectedPlotId,
        createdBy: currentUser?.id,
        createdByName: currentUser?.name
    } as TrialRecord);

    if (success) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
        
        // AUTO-AVANCE: Buscar el índice actual y mover al siguiente
        const currentIndex = plotQueue.findIndex(p => p.plot.id === selectedPlotId);
        if (currentIndex < plotQueue.length - 1) {
            setSelectedPlotId(plotQueue[currentIndex + 1].plot.id);
            // Resetear valores de medición para el nuevo
            setFormData(prev => ({ ...prev, plantHeight: 0, vigor: 8, pestsScore: 1, diseasesScore: 1 }));
        } else {
            alert("¡Recorrida completada! Todas las parcelas han sido actualizadas.");
        }
    }
  };

  const GrowthIndicator = ({ current, previous }: { current: number, previous: number }) => {
      const diff = current - previous;
      if (!previous) return <span className="text-gray-400 text-[10px]">Primer dato</span>;
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
                    Flujo de trabajo técnico y carga rápida
                </p>
            </div>
        </div>
        <div className="flex items-center space-x-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border dark:border-slate-800 shadow-sm">
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{plotQueue.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Urgentes</p>
                <p className="text-lg font-black text-red-500 leading-none">{plotQueue.filter(p => p.daysSince > 7).length}</p>
            </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* SIDEBAR: COLA DE TRABAJO */}
          <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
                      <Clock size={14} className="mr-2"/> Orden de Recorrida Sugerido
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {plotQueue.map((item) => (
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
                              <span className="font-black uppercase tracking-tighter text-sm">{item.plot.name}</span>
                              {item.daysSince > 7 && (
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center ${selectedPlotId === item.plot.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                      <AlertTriangle size={8} className="mr-1"/> +{item.daysSince} días
                                  </span>
                              )}
                          </div>
                          <p className={`text-[10px] uppercase font-bold tracking-widest relative z-10 ${selectedPlotId === item.plot.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {item.locationName}
                          </p>
                          {/* Barra de progreso de días sin ver (visual) */}
                          <div className={`absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all`} style={{ width: `${Math.min(item.daysSince * 5, 100)}%` }}></div>
                      </button>
                  ))}
              </div>
          </div>

          {/* MAIN: FORMULARIO DE CARGA */}
          <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-[40px] shadow-xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative">
              {currentPlotData ? (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-6 border-b dark:border-slate-800 flex justify-between items-end">
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
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Auditoría</p>
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
                                <p className="text-xs text-slate-400 italic">Nunca auditada</p>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            
                            {/* SECCIÓN 1: BIOMETRÍA */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center border-b pb-2 dark:border-slate-800">
                                    <Ruler size={14} className="mr-2"/> Datos Biométricos
                                </h3>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Altura Planta (cm)</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="number" 
                                            autoFocus
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-3xl font-black text-center text-emerald-600 outline-none focus:border-emerald-500 transition-all"
                                            value={formData.plantHeight}
                                            onChange={e => setFormData({...formData, plantHeight: Number(e.target.value)})}
                                        />
                                        <div className="flex flex-col justify-center min-w-[80px]">
                                            <GrowthIndicator current={formData.plantHeight || 0} previous={currentPlotData.lastRecord?.plantHeight || 0} />
                                            <span className="text-[9px] text-slate-400 uppercase font-bold mt-1">Vs. Anterior</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Etapa Fenológica</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Vegetativo', 'Floración', 'Maduración', 'Cosecha'].map(stage => (
                                            <button
                                                key={stage}
                                                type="button"
                                                onClick={() => setFormData({...formData, stage: stage as any})}
                                                className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                                    formData.stage === stage 
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-emerald-200'
                                                }`}
                                            >
                                                {stage}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: CALIDAD & AMBIENTE */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center border-b pb-2 dark:border-slate-800">
                                    <Activity size={14} className="mr-2"/> Estado & Ambiente
                                </h3>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 block">Vigor Vegetal (1-9)</label>
                                        <span className={`text-xs font-black ${formData.vigor! >= 7 ? 'text-green-500' : formData.vigor! >= 5 ? 'text-amber-500' : 'text-red-500'}`}>{formData.vigor} pts</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" max="9" step="1"
                                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                        value={formData.vigor}
                                        onChange={e => setFormData({...formData, vigor: Number(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-300 mt-1">
                                        <span>Crítico (1)</span>
                                        <span>Óptimo (9)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                                        <label className="text-[9px] font-black uppercase text-orange-700 dark:text-orange-400 mb-1 block flex items-center"><Thermometer size={12} className="mr-1"/> Temp.</label>
                                        <input type="number" className="w-full bg-transparent font-black text-xl text-slate-800 dark:text-white outline-none" value={formData.temperature} onChange={e => setFormData({...formData, temperature: Number(e.target.value)})} />
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                        <label className="text-[9px] font-black uppercase text-blue-700 dark:text-blue-400 mb-1 block flex items-center"><Droplets size={12} className="mr-1"/> Humedad</label>
                                        <input type="number" className="w-full bg-transparent font-black text-xl text-slate-800 dark:text-white outline-none" value={formData.humidity} onChange={e => setFormData({...formData, humidity: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* FOOTER ACCIONES */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black uppercase text-slate-400">Fecha Registro</label>
                                <input type="date" className="bg-transparent font-bold text-xs outline-none text-slate-700 dark:text-slate-300" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black uppercase text-slate-400">Hora</label>
                                <input type="time" className="bg-transparent font-bold text-xs outline-none text-slate-700 dark:text-slate-300" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/>
                            </div>
                        </div>
                        <button 
                            onClick={handleSave}
                            className={`px-8 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center transition-all hover:scale-[1.02] ${justSaved ? 'bg-green-500 text-white' : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-black dark:hover:bg-emerald-700'}`}
                        >
                            {justSaved ? <CheckCircle2 size={18} className="mr-2"/> : <Save size={18} className="mr-2"/>}
                            {justSaved ? '¡Registrado!' : 'Guardar y Siguiente'} <ChevronRight size={16} className="ml-2"/>
                        </button>
                    </div>
                  </>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center">
                      <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                          <Leaf size={48} className="text-slate-300"/>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 mb-2">Recorrida Finalizada</h3>
                      <p className="text-sm font-medium max-w-xs mx-auto">No hay parcelas activas pendientes de revisión en la cola de trabajo.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
