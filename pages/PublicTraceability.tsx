
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
    Sprout, MapPin, Calendar, Clock, Activity, 
    ShieldCheck, Leaf, Waves, Thermometer, Globe, Info, Sparkles, Package
} from 'lucide-react';
import { getPlotAgrochemicalApplications } from '../src/services/agro40Service';
import { AgrochemicalApplication } from '../types';

export default function PublicTraceability() {
    const { id } = useParams();
    const { plots, locations, varieties, trialRecords, appName } = useAppContext();

    const plot = plots.find(p => p.id === id);
    const location = locations.find(l => l.id === plot?.locationId);
    const variety = varieties.find(v => v.id === plot?.varietyId);
    const history = trialRecords.filter(r => r.plotId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = history[0];

    // Insumos y fitosanitarios aplicados en este lote
    const plotAgroApps = useMemo(() => {
        if (!plot) return [];
        let allApps: AgrochemicalApplication[] = [];
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ht_agrochemical_apps');
            if (stored) {
                try { allApps = JSON.parse(stored); } catch (e) {}
            }
        }
        if (allApps.length === 0) {
            allApps = getPlotAgrochemicalApplications(plots);
        }
        return allApps.filter(a => a.plotId === plot.id);
    }, [plot, plots]);

    const cycleProgress = useMemo(() => {
        if (!plot || !variety) return 0;
        const sowing = new Date(plot.sowingDate).getTime();
        const now = Date.now();
        const diffDays = (now - sowing) / 86400000;
        return Math.min(100, Math.max(0, (diffDays / variety.cycleDays) * 100));
    }, [plot, variety]);

    if (!plot) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
            <div className="space-y-4">
                <div className="bg-red-500/10 p-4 rounded-full inline-block text-red-500"><Info size={48}/></div>
                <h1 className="text-white text-2xl font-black">UNIDAD NO LOCALIZADA</h1>
                <p className="text-slate-400 text-sm">El identificador de este lote no es válido en el sistema Nucleus Trace.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-hemp-500 pb-20">
            {/* Cabecera Hero */}
            <div className="relative h-72 overflow-hidden flex flex-col justify-end p-8 bg-gradient-to-t from-[#020617] to-transparent">
                {location?.coordinates && (
                    <iframe 
                        className="absolute inset-0 w-full h-full opacity-40 grayscale pointer-events-none"
                        src={`https://maps.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}&z=14&output=embed`}
                        frameBorder="0"
                    />
                )}
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-hemp-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                            <ShieldCheck size={12} className="mr-1.5"/> Trazabilidad Verificada
                        </span>
                    </div>
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{plot.name}</h1>
                    <p className="text-slate-400 font-bold flex items-center text-sm"><MapPin size={16} className="mr-2 text-hemp-500"/> {location?.name}, {location?.province}</p>
                </div>
            </div>

            <div className="p-6 space-y-8 -mt-4 relative z-20">
                {/* Stats Rápidos */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Genética Autorizada</p>
                        <p className="text-xl font-black text-hemp-400 uppercase italic">{variety?.name}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado del Lote</p>
                        <p className="text-xl font-black uppercase italic">{plot.status}</p>
                    </div>
                </div>

                {/* Ciclo Biológico */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[40px]">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Progreso del Ciclo</h3>
                            <p className="text-2xl font-black italic uppercase mt-1">Día {Math.floor((Date.now() - new Date(plot.sowingDate).getTime()) / 86400000)} <span className="text-slate-500 font-medium">/ {variety?.cycleDays}</span></p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-hemp-500">{Math.round(cycleProgress)}%</span>
                        </div>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-hemp-600 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.4)] transition-all duration-1000" style={{ width: `${cycleProgress}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <span className="flex items-center"><Calendar size={12} className="mr-1.5"/> Siembra: {plot.sowingDate}</span>
                        <span className="flex items-center">Cosecha Est. <Sparkles size={12} className="ml-1.5 text-amber-500"/></span>
                    </div>
                </div>

                {/* Último Monitoreo */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-2xl text-slate-900 dark:text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-slate-900 dark:bg-hemp-600 p-3 rounded-2xl text-white"><Activity size={24}/></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter italic">Auditoría Reciente</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura Actual</p>
                            <p className="text-3xl font-black">{latest?.plantHeight || 'S/D'} cm</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigor Técnico</p>
                            <p className="text-3xl font-black text-emerald-600">{latest?.vigor || '-'}/9</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fase Fisiológica</p>
                            <p className="text-xl font-black uppercase italic">{latest?.stage || 'En curso'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trazabilidad</p>
                            <p className="text-[10px] font-black uppercase text-blue-500 tracking-tighter">{plot.id.substring(0,18)}...</p>
                        </div>
                    </div>
                </div>

                {/* Registro Público de Insumos & Tratamientos (SENASA) */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-600 p-3 rounded-2xl text-white">
                                <Package size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">Insumos & Tratamientos Acreditados</h3>
                                <p className="text-xs text-slate-400 font-medium">Cumplimiento SENASA y trazabilidad sanitaria para destino comercial</p>
                            </div>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                            ✓ {plotAgroApps.length} Tratamientos Auditados
                        </span>
                    </div>

                    <div className="space-y-4">
                        {plotAgroApps.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No hay tratamientos o insumos fitosanitarios registrados para este lote.</p>
                        ) : (
                            plotAgroApps.map(app => (
                                <div key={app.id} className="bg-slate-900/80 border border-white/10 p-5 rounded-3xl space-y-3">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-black text-white uppercase text-base">{app.productName}</h4>
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                    {app.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                Principio Activo: <span className="text-slate-200">{app.activeIngredient}</span>
                                            </p>
                                        </div>
                                        <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                                            {app.senasaRegisterNumber}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-2 border-t border-white/5">
                                        <div>
                                            <span className="text-[9px] uppercase font-black text-slate-500 block">Proveedor / Distribuidor</span>
                                            <span className="font-bold text-slate-300">{app.supplierName}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase font-black text-slate-500 block">Lote de Fabricación</span>
                                            <span className="font-mono font-bold text-slate-300">{app.batchNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase font-black text-slate-500 block">Dosis por Ha</span>
                                            <span className="font-bold text-slate-300">{app.dosagePerHa} {app.dosageUnit}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase font-black text-slate-500 block">Agrónomo MP</span>
                                            <span className="font-bold text-slate-300">{app.responsibleAgronomist}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer Transparencia */}
                <div className="text-center py-10 space-y-6">
                    <div className="flex justify-center items-center space-x-2">
                        <Leaf className="text-hemp-600" size={20}/>
                        <span className="text-2xl font-black italic tracking-tighter">{appName} <span className="text-hemp-600">Nucleus</span></span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                        Este reporte es generado en tiempo real por la red de inteligencia agronómica Nucleus Trace.
                    </p>
                </div>
            </div>
        </div>
    );
}
