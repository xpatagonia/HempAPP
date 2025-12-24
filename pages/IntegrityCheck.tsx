
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    ShieldAlert, AlertCircle, CheckCircle2, 
    Zap, Package, Sprout, MapPin, 
    Activity, RefreshCw, Trash2, Edit2, ShieldCheck,
    ChevronRight, ExternalLink, ArrowRight, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IntegrityCheck() {
    const { 
        plots, seedBatches, locations, trialRecords, 
        updateSeedBatch, isRefreshing, refreshData 
    } = useAppContext();
    const [isFixing, setIsFixing] = useState(false);

    const audit = useMemo(() => {
        const issues: any[] = [];
        
        // 1. CHEQUEO DE INVENTARIO
        seedBatches.forEach(b => {
            if (b.remainingQuantity < 0) {
                issues.push({ id: `b-${b.id}`, level: 'critical', cat: 'Inventario', item: b.batchCode, msg: `Stock negativo (${b.remainingQuantity} kg)`, link: '/seed-batches' });
            }
            if (b.isActive && b.remainingQuantity === 0) {
                issues.push({ id: `b-z-${b.id}`, level: 'warning', cat: 'Inventario', item: b.batchCode, msg: 'Lote activo pero sin existencias', type: 'empty-batch', data: b });
            }
        });

        // 2. CHEQUEO DE UNIDADES PRODUCTIVAS
        plots.forEach(p => {
            if (p.status === 'Activa' && !p.seedBatchId) {
                issues.push({ id: `p-${p.id}`, level: 'critical', cat: 'Cultivo', item: p.name, msg: 'Sin lote de semilla vinculado (Pierde Trazabilidad)', link: '/plots' });
            }
            if ((p.surfaceArea || 0) <= 0) {
                issues.push({ id: `p-a-${p.id}`, level: 'warning', cat: 'Cultivo', item: p.name, msg: 'Superficie declarada en 0. Cálculos de rinde serán nulos.', link: '/plots' });
            }
        });

        // 3. CHEQUEO GEO
        locations.forEach(l => {
            if (!l.coordinates?.lat || l.coordinates.lat === 0) {
                issues.push({ id: `l-${l.id}`, level: 'warning', cat: 'Geo', item: l.name, msg: 'Sin coordenadas GPS. Inaccesible en Torre de Control.', link: '/locations' });
            }
        });

        // 4. CHEQUEO DE OUTLIERS EN MONITOREO
        trialRecords.forEach(r => {
            if ((r.plantHeight || 0) > 450) {
                issues.push({ id: `r-${r.id}`, level: 'warning', cat: 'Monitor', item: `Reg ${r.date}`, msg: `Altura inusual detectada (${r.plantHeight}cm)`, link: `/plots/${r.plotId}` });
            }
            if ((r.temperature || 0) > 52) {
                issues.push({ id: `r-t-${r.id}`, level: 'warning', cat: 'Monitor', item: `Reg ${r.date}`, msg: `Temperatura extrema registrada (${r.temperature}°C)`, link: `/plots/${r.plotId}` });
            }
        });

        return {
            issues,
            criticalCount: issues.filter(i => i.level === 'critical').length,
            warningCount: issues.filter(i => i.level === 'warning').length,
            totalCount: issues.length
        };
    }, [seedBatches, plots, locations, trialRecords]);

    const handleAutoFixEmptyBatches = async () => {
        const emptyActive = audit.issues.filter(i => i.type === 'empty-batch');
        if (emptyActive.length === 0) return;
        
        setIsFixing(true);
        try {
            for (const issue of emptyActive) {
                await updateSeedBatch({ ...issue.data, isActive: false });
            }
            alert(`✅ Se han desactivado ${emptyActive.length} lotes sin stock.`);
            await refreshData();
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic flex items-center">
                        <ShieldAlert className="mr-3 text-red-500" size={32}/> Auditoría de <span className="text-hemp-600">Integridad</span>
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Validación de consistencia y salud de la base de datos industrial.</p>
                </div>
                <button 
                    onClick={() => refreshData()} 
                    disabled={isRefreshing}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm hover:bg-gray-50 transition-all"
                >
                    {isRefreshing ? <Loader2 className="animate-spin mr-2" size={16}/> : <RefreshCw className="mr-2" size={16}/>}
                    Relanzar Escaneo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm overflow-hidden relative group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estatus General</p>
                        <div className="flex items-center gap-3">
                            {audit.criticalCount === 0 ? (
                                <CheckCircle2 className="text-green-500" size={32}/>
                            ) : (
                                <ShieldAlert className="text-red-500" size={32}/>
                            )}
                            <h3 className="text-3xl font-black text-gray-800 dark:text-white">{audit.criticalCount === 0 ? 'ÓPTIMO' : 'ACCIONES REQUERIDAS'}</h3>
                        </div>
                    </div>
                    <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-5 group-hover:scale-110 transition-transform ${audit.criticalCount === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Inconsistencias Críticas</p>
                    <div className="flex items-baseline space-x-2">
                        <h3 className="text-5xl font-black text-red-600">{audit.criticalCount}</h3>
                        <span className="text-xs font-bold text-gray-400 uppercase">Conflictos</span>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Deben corregirse para mantener la trazabilidad.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Advertencias (Clean-up)</p>
                    <div className="flex items-baseline space-x-2">
                        <h3 className="text-5xl font-black text-amber-500">{audit.warningCount}</h3>
                        <span className="text-xs font-bold text-gray-400 uppercase">Observaciones</span>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Afectan la UX o la calidad del reporte analítico.</p>
                </div>
            </div>

            {audit.warningCount > 0 && audit.issues.some(i => i.type === 'empty-batch') && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl mr-4"><Zap className="text-amber-600" size={24}/></div>
                        <div>
                            <h4 className="font-black text-amber-900 dark:text-amber-200 uppercase text-xs tracking-widest">Optimización de Interfaz</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">Se detectaron lotes sin stock marcados como 'Activos'. Esto sobrecarga los selectores de siembra.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAutoFixEmptyBatches}
                        disabled={isFixing}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center transition-all disabled:opacity-50"
                    >
                        {isFixing ? <Loader2 className="animate-spin mr-2" size={14}/> : <ShieldCheck className="mr-2" size={14}/>}
                        Limpiar Lotes Vacíos
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                    <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.3em] flex items-center">
                        <Activity size={18} className="mr-3 text-hemp-600"/> Log de Auditoría Operativa
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest border-b dark:border-slate-800">
                            <tr>
                                <th className="px-10 py-5">Nivel</th>
                                <th className="px-10 py-5">Categoría</th>
                                <th className="px-10 py-5">Elemento / ID</th>
                                <th className="px-10 py-5">Hallazgo / Inconsistencia</th>
                                <th className="px-10 py-5 text-right">Solución</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {audit.issues.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center opacity-40">
                                            <ShieldCheck size={64} className="text-green-500 mb-4"/>
                                            <p className="font-black uppercase tracking-widest text-slate-500">Base de Datos Saludable</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : audit.issues.map(issue => (
                                <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-10 py-6">
                                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                            issue.level === 'critical' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                            {issue.level === 'critical' ? 'CRÍTICO' : 'ADVERTENCIA'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 font-black text-[10px] text-slate-400 uppercase tracking-widest">{issue.cat}</td>
                                    <td className="px-10 py-6 font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">{issue.item}</td>
                                    <td className="px-10 py-6 font-bold text-gray-600 dark:text-gray-400 text-xs">{issue.msg}</td>
                                    <td className="px-10 py-6 text-right">
                                        <Link to={issue.link || '#'} className="p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-400 hover:text-hemp-600 rounded-xl shadow-sm transition-all inline-flex items-center group">
                                            <Edit2 size={14} className="mr-2 group-hover:scale-110 transition-transform"/>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Corregir</span>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="max-w-xl">
                        <h4 className="text-2xl font-black uppercase tracking-tighter italic mb-4">¿Todo listo para el <span className="text-hemp-500">Siguiente Nivel?</span></h4>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed italic">
                            "La calidad de la analítica en la cosecha depende de la pureza de los datos cargados en la siembra. Realizar este chequeo semanalmente reduce en un 95% los errores de reporte de Campaña."
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="px-6 py-4 bg-white/5 rounded-[24px] border border-white/10 flex items-center gap-4">
                            <Package className="text-hemp-400" size={24}/>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lotes Auditados</p>
                                <p className="text-xl font-black uppercase tracking-tighter">{seedBatches.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <Activity className="absolute -right-20 -bottom-20 w-96 h-96 opacity-5 pointer-events-none" />
            </div>
        </div>
    );
}
