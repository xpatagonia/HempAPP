
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
/* Added missing Save import */
import { Droplets, CloudRain, Plus, X, Trash2, Info, Loader2, RefreshCw, AlertCircle, TrendingUp, Waves, Check, Sparkles, Clock, Save } from 'lucide-react';

interface HydricBalanceProps {
    locationId: string;
    plotId?: string;
    startDate?: string;
}

export default function HydricBalance({ locationId, plotId, startDate }: HydricBalanceProps) {
    const { hydricRecords, addHydricRecord, deleteHydricRecord, currentUser, locations } = useAppContext();
    const location = locations.find(l => l.id === locationId);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingAuto, setIsLoadingAuto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [autoRain, setAutoRain] = useState(0);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        type: 'Lluvia' as 'Lluvia' | 'Riego', 
        amountMm: 0, 
        notes: '' 
    });

    const [satelliteSuggestion, setSatelliteSuggestion] = useState<{ amount: number, status: 'idle' | 'loading' | 'found' | 'not_found' }>({ 
        amount: 0, 
        status: 'idle' 
    });

    const manualRecords = useMemo(() => {
        return hydricRecords.filter(h => {
            const matchLoc = h.locationId === locationId;
            const matchPlot = plotId ? h.plotId === plotId : !h.plotId;
            return matchLoc && matchPlot;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [hydricRecords, locationId, plotId]);

    const totalManual = useMemo(() => manualRecords.reduce((sum, r) => sum + r.amountMm, 0), [manualRecords]);

    // EFECTO: CARGA DE PLUVIÓMETRO AUTOMÁTICO (HISTÓRICO ACUMULADO)
    useEffect(() => {
        const fetchAutoRain = async () => {
            if (!location?.coordinates || !startDate) return;
            setIsLoadingAuto(true);
            try {
                // El satélite necesita fechas YYYY-MM-DD. Si no hay startDate, usamos 30 días atrás.
                const startStr = startDate;
                const end = new Date();
                end.setDate(end.getDate() - 1); // El satélite histórico tiene un día de retraso usualmente
                const endStr = end.toISOString().split('T')[0];
                
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&start_date=${startStr}&end_date=${endStr}&daily=precipitation_sum&timezone=auto`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.daily?.precipitation_sum) {
                    const sum = data.daily.precipitation_sum.reduce((a: number, b: number) => a + (b || 0), 0);
                    setAutoRain(Number(sum.toFixed(1)));
                } else {
                    setAutoRain(0);
                }
            } catch (e) {
                console.error("Error al cargar lluvia satelital:", e);
                setAutoRain(0);
            } finally {
                setIsLoadingAuto(false);
            }
        };
        fetchAutoRain();
    }, [location, startDate]);

    // EFECTO: SUGERENCIA SATELITAL AL CARGAR REGISTRO MANUAL
    useEffect(() => {
        const getDailySuggestion = async () => {
            if (!isModalOpen || formData.type !== 'Lluvia' || !location?.coordinates || !formData.date) {
                setSatelliteSuggestion({ amount: 0, status: 'idle' });
                return;
            }

            setSatelliteSuggestion(prev => ({ ...prev, status: 'loading' }));
            try {
                const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&start_date=${formData.date}&end_date=${formData.date}&daily=precipitation_sum&timezone=auto`);
                const data = await res.json();
                
                if (data.daily?.precipitation_sum && data.daily.precipitation_sum[0] !== undefined) {
                    const val = data.daily.precipitation_sum[0];
                    setSatelliteSuggestion({ amount: val, status: 'found' });
                } else {
                    setSatelliteSuggestion({ amount: 0, status: 'not_found' });
                }
            } catch (e) {
                setSatelliteSuggestion({ amount: 0, status: 'not_found' });
            }
        };

        const timer = setTimeout(getDailySuggestion, 600); 
        return () => clearTimeout(timer);
    }, [formData.date, formData.type, isModalOpen, location]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            const success = await addHydricRecord({
                ...formData,
                id: Date.now().toString(),
                locationId,
                plotId,
                createdBy: currentUser?.id
            });
            if (success) setIsModalOpen(false);
        } catch (err) {
            console.error("Save Error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AUTOMÁTICO SATELITAL */}
                <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <CloudRain size={28} className="text-blue-300" />
                            <div className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20">Monitor Satelital GFS</div>
                        </div>
                        <p className="text-xs font-black text-blue-200 uppercase mb-1 tracking-widest">Lluvia Acumulada (Satelital)</p>
                        <div className="flex items-baseline space-x-2">
                            <h3 className="text-5xl font-black tracking-tighter">{isLoadingAuto ? '---' : autoRain}</h3>
                            <span className="text-xl font-bold opacity-60">mm</span>
                        </div>
                        <p className="text-[10px] text-blue-300 mt-6 font-bold flex items-center uppercase tracking-widest">
                            <RefreshCw size={10} className={`mr-2 ${isLoadingAuto ? 'animate-spin' : ''}`} />
                            Desde siembra: {startDate || 'N/A'}
                        </p>
                    </div>
                    <Waves className="absolute -right-8 -bottom-8 text-white opacity-5 w-48 h-48 animate-pulse" />
                </div>

                {/* MANUAL BITÁCORA */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <Droplets size={28} className="text-hemp-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pluviómetro de Campo</span>
                        </div>
                        <p className="text-xs font-black text-slate-500 uppercase mb-1 tracking-widest">Registros Manuales</p>
                        <div className="flex items-baseline space-x-2">
                            <h3 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{totalManual}</h3>
                            <span className="text-xl font-bold text-slate-400">mm</span>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="mt-8 w-full py-4 bg-slate-900 dark:bg-hemp-600 hover:bg-black dark:hover:bg-hemp-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-[1.02]">
                        Cargar Bitácora Agua
                    </button>
                </div>

                {/* HUELLA HÍDRICA TÉCNICA */}
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-2 flex items-center"><TrendingUp size={14} className="mr-2"/> Balance del Ensayo</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Aporte Lluvias</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white">{manualRecords.filter(r => r.type === 'Lluvia').reduce((s, r) => s + r.amountMm, 0)} mm</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Aporte Riego</span>
                                <span className="text-sm font-black text-blue-600">{manualRecords.filter(r => r.type === 'Riego').reduce((s, r) => s + r.amountMm, 0)} mm</span>
                            </div>
                            <div className="pt-2 border-t dark:border-slate-800 flex justify-between items-center">
                                <span className="text-xs font-black text-hemp-600 uppercase tracking-widest">Total MM</span>
                                <span className="text-lg font-black text-hemp-700">{(autoRain + manualRecords.filter(r => r.type === 'Riego').reduce((s, r) => s + r.amountMm, 0)).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start">
                        <Info size={16} className="text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-[9px] text-amber-800 dark:text-amber-200 leading-tight font-bold uppercase tracking-widest">Comparar pluviómetro físico con satelital calibra la huella hídrica real del cáñamo.</p>
                    </div>
                </div>
            </div>

            {/* TABLA DE HISTORIAL */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b dark:border-slate-800">
                        <tr>
                            <th className="px-8 py-5">Fecha / Registro</th>
                            <th className="px-8 py-5">Fuente</th>
                            <th className="px-8 py-5 text-center">Cantidad</th>
                            <th className="px-8 py-5">Notas</th>
                            <th className="px-8 py-5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {manualRecords.length === 0 ? (
                            <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic font-medium">No se registran eventos manuales de pluviómetro o riego.</td></tr>
                        ) : manualRecords.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-8 py-5 font-black text-gray-800 dark:text-gray-200">
                                    {r.date} <span className="text-[10px] text-slate-400 font-bold ml-2 uppercase tracking-tighter">{r.time || '--:--'} hs</span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${r.type === 'Lluvia' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {r.type}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center font-black text-slate-900 dark:text-white text-base">{r.amountMm} mm</td>
                                <td className="px-8 py-5 text-xs text-slate-500 font-medium italic max-w-xs truncate">{r.notes || '-'}</td>
                                <td className="px-8 py-5 text-right">
                                    <button onClick={() => deleteHydricRecord(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-white/10">
                        <div className="px-8 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center">
                                <Waves size={18} className="mr-2 text-blue-600"/> Registrar Insumo Hídrico
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Recurso</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setFormData({...formData, type: 'Lluvia'})} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.type === 'Lluvia' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>Lluvia (Pluv.)</button>
                                    <button type="button" onClick={() => setFormData({...formData, type: 'Riego'})} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.type === 'Riego' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>Riego Activo</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha</label>
                                    <input type="date" required className="w-full border dark:border-slate-800 border-slate-200 p-3 rounded-2xl text-sm font-black bg-gray-50 dark:bg-slate-950 dark:text-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hora</label>
                                    <input type="time" required className="w-full border dark:border-slate-800 border-slate-200 p-3 rounded-2xl text-sm font-black bg-gray-50 dark:bg-slate-950 dark:text-white" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Milímetros (MM)</label>
                                    {formData.type === 'Lluvia' && satelliteSuggestion.status === 'found' && (
                                        <button type="button" onClick={() => setFormData({...formData, amountMm: satelliteSuggestion.amount})} className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 flex items-center animate-bounce">
                                            <Sparkles size={8} className="mr-1"/> Satélite dice {satelliteSuggestion.amount} mm
                                        </button>
                                    )}
                                </div>
                                <input type="number" step="0.1" required className="w-full border dark:border-slate-800 border-slate-200 p-4 rounded-2xl text-2xl font-black bg-gray-50 dark:bg-slate-950 dark:text-hemp-600 text-center" value={formData.amountMm} onChange={e => setFormData({...formData, amountMm: Number(e.target.value)})} />
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-hemp-600 hover:bg-black dark:hover:bg-hemp-700 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center hover:scale-[1.02] disabled:opacity-50">
                                {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2"/>}
                                {isSaving ? "Grabando..." : "Confirmar Registro"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
