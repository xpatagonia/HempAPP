
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Droplets, CloudRain, Plus, X, Trash2, Info, Loader2, RefreshCw, AlertCircle, TrendingUp, Waves, Check, Sparkles } from 'lucide-react';

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
    const [autoRain, setAutoRain] = useState(0);
    const [formData, setFormData] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        type: 'Lluvia' as 'Lluvia' | 'Riego', 
        amountMm: 0, 
        notes: '' 
    });

    // Estado para la sugerencia satelital por día
    const [satelliteSuggestion, setSatelliteSuggestion] = useState<{ amount: number, status: 'idle' | 'loading' | 'found' | 'not_found' }>({ 
        amount: 0, 
        status: 'idle' 
    });

    // Filtrar registros manuales para esta ubicación/lote
    const manualRecords = useMemo(() => {
        return hydricRecords.filter(h => {
            const matchLoc = h.locationId === locationId;
            const matchPlot = plotId ? h.plotId === plotId : !h.plotId;
            return matchLoc && matchPlot;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [hydricRecords, locationId, plotId]);

    const totalManual = useMemo(() => manualRecords.reduce((sum, r) => sum + r.amountMm, 0), [manualRecords]);

    // FETCH ACUMULADO TOTAL (Dashboard Principal de Agua)
    useEffect(() => {
        const fetchAutoRain = async () => {
            if (!location?.coordinates || !startDate) return;
            setIsLoadingAuto(true);
            try {
                const end = new Date();
                end.setDate(end.getDate() - 1);
                const endStr = end.toISOString().split('T')[0];
                const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${location.coordinates.lat}&longitude=${location.coordinates.lng}&start_date=${startDate}&end_date=${endStr}&daily=precipitation_sum&timezone=auto`);
                const data = await res.json();
                if (data.daily?.precipitation_sum) {
                    const sum = data.daily.precipitation_sum.reduce((a: number, b: number) => a + (b || 0), 0);
                    setAutoRain(Number(sum.toFixed(1)));
                }
            } catch (e) {
                console.error("Error fetching historical rain", e);
            } finally {
                setIsLoadingAuto(false);
            }
        };
        fetchAutoRain();
    }, [location, startDate]);

    // FETCH SUGERENCIA SATELITAL PARA UNA FECHA ESPECIFICA (Modal)
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

        const timer = setTimeout(getDailySuggestion, 500); // Debounce
        return () => clearTimeout(timer);
    }, [formData.date, formData.type, isModalOpen, location]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await addHydricRecord({
            ...formData,
            id: Date.now().toString(),
            locationId,
            plotId,
            createdBy: currentUser?.id
        });
        if (success) setIsModalOpen(false);
    };

    const applySuggestion = () => {
        setFormData(prev => ({ ...prev, amountMm: satelliteSuggestion.amount }));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* AUTO ACCUMULATED (SMART) */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <CloudRain size={24} className="opacity-80" />
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full">Satelital</span>
                        </div>
                        <p className="text-xs font-bold text-blue-100 uppercase mb-1">Lluvia Acumulada</p>
                        <div className="flex items-end space-x-2">
                            <h3 className="text-4xl font-black">{isLoadingAuto ? '---' : autoRain}</h3>
                            <span className="text-lg font-bold mb-1">mm</span>
                        </div>
                        <p className="text-[10px] text-blue-200 mt-4 flex items-center">
                            <RefreshCw size={10} className={`mr-1 ${isLoadingAuto ? 'animate-spin' : ''}`} />
                            Desde siembra ({startDate})
                        </p>
                    </div>
                    <Waves className="absolute -right-4 -bottom-4 text-white opacity-5 w-32 h-32" />
                </div>

                {/* MANUAL LOGGED */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <Droplets size={24} className="text-hemp-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bitácora Campo</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Ingresado</p>
                        <div className="flex items-end space-x-2">
                            <h3 className="text-4xl font-black text-slate-800">{totalManual}</h3>
                            <span className="text-lg font-bold text-slate-400 mb-1">mm</span>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="mt-6 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all border border-slate-200">
                        <Plus size={14} className="mr-2" /> Cargar Evento
                    </button>
                </div>

                {/* HYDRIC HEALTH / INFO */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Eficiencia Variedad</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Lluvias</span>
                                <span className="text-sm font-black text-slate-800">{manualRecords.filter(r => r.type === 'Lluvia').reduce((s, r) => s + r.amountMm, 0)} mm</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Riego</span>
                                <span className="text-sm font-black text-blue-600">{manualRecords.filter(r => r.type === 'Riego').reduce((s, r) => s + r.amountMm, 0)} mm</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start">
                        <Info size={14} className="text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-[9px] text-amber-800 leading-tight font-medium">Comparar pluviómetro físico con satelital permite calibrar el balance hídrico real del ensayo.</p>
                    </div>
                </div>
            </div>

            {/* LIST OF EVENTS */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Cantidad</th>
                            <th className="px-6 py-4">Notas</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {manualRecords.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No hay registros manuales de agua.</td></tr>
                        ) : manualRecords.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800">{r.date}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${r.type === 'Lluvia' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                        {r.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-black text-slate-900">{r.amountMm} mm</td>
                                <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{r.notes || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => deleteHydricRecord(r.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL PARA CARGAR AGUA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                                <Waves size={18} className="mr-2 text-blue-600"/> Registrar Agua
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tipo de Evento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setFormData({...formData, type: 'Lluvia'})} className={`py-3 rounded-xl text-xs font-bold transition-all border ${formData.type === 'Lluvia' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Lluvia (Pluviómetro)</button>
                                    <button type="button" onClick={() => setFormData({...formData, type: 'Riego'})} className={`py-3 rounded-xl text-xs font-bold transition-all border ${formData.type === 'Riego' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Riego Aplicado</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fecha</label><input type="date" required className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold bg-slate-50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Cantidad (mm)</label>
                                    <input type="number" step="0.1" required className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold bg-slate-50" value={formData.amountMm || ''} onChange={e => setFormData({...formData, amountMm: Number(e.target.value)})} />
                                    
                                    {/* SUGERENCIA INTELIGENTE */}
                                    {formData.type === 'Lluvia' && (
                                        <div className="mt-2">
                                            {satelliteSuggestion.status === 'loading' && <div className="flex items-center text-[9px] text-slate-400 animate-pulse font-bold uppercase"><Loader2 size={10} className="animate-spin mr-1"/> Consultando satélite...</div>}
                                            {satelliteSuggestion.status === 'found' && (
                                                <button type="button" onClick={applySuggestion} className="flex items-center text-[9px] text-blue-600 font-black uppercase bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all">
                                                    <Sparkles size={10} className="mr-1"/> Satelital: {satelliteSuggestion.amount} mm <Check size={10} className="ml-1 text-green-500"/>
                                                </button>
                                            )}
                                            {satelliteSuggestion.status === 'not_found' && <div className="text-[9px] text-slate-400 font-bold uppercase italic">Sin datos satelitales hoy</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Notas / Observaciones</label>
                                <textarea className="w-full border border-slate-200 p-3 rounded-xl text-sm font-medium bg-slate-50" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">Confirmar Registro</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
