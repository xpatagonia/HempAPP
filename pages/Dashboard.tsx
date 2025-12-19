
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Activity, Printer, X, Sparkles, Globe, Database, History, 
  Download, Loader2, Radio, ShieldCheck, Clock, ChevronRight, Maximize2,
  Bot, Sprout, Zap, LayoutGrid
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TechKPI = ({ label, value, icon: Icon, colorClass, onClick, trend }: any) => (
  <button 
    onClick={onClick}
    className="bg-[#0a0f1d] p-8 rounded-[40px] border border-white/5 flex flex-col justify-between hover:border-hemp-500/50 transition-all group relative overflow-hidden text-left w-full shadow-2xl hover:-translate-y-2"
  >
    <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${colorClass.includes('hemp') ? 'from-hemp-500/10' : 'from-blue-500/10'} to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-20 text-white shadow-inner transition-transform group-hover:scale-110`}>
             <Icon size={32} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all bg-white/5 p-2 rounded-full"><Maximize2 size={16} className="text-slate-500" /></div>
    </div>
    <div className="relative z-10">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">{label}</p>
        <div className="flex items-end space-x-3">
            <h3 className="text-5xl font-black text-white leading-none tracking-tighter italic">{value}</h3>
            {trend && <span className="text-hemp-500 text-xs font-black pb-1 bg-hemp-500/10 px-2 py-0.5 rounded-full mb-1">+{trend}</span>}
        </div>
    </div>
  </button>
);

export default function Dashboard() {
  const { varieties, locations, plots, projects, currentUser, getLatestRecord, trialRecords } = useAppContext();
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const relevantPlots = currentUser?.role === 'client' ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;

  const yieldData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    relevantPlots.forEach(plot => {
      const latest = getLatestRecord(plot.id);
      if (!latest?.yield) return;
      const v = varieties.find(v => v.id === plot.varietyId);
      if (v) {
        const curr = map.get(v.name) || { total: 0, count: 0 };
        map.set(v.name, { total: curr.total + latest.yield, count: curr.count + 1 });
      }
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, yield: Math.round(d.total / d.count) })).sort((a, b) => b.yield - a.yield).slice(0, 6);
  }, [relevantPlots, varieties, getLatestRecord]);

  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      
      {/* BRAND HUD v5.0 */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="max-w-4xl">
            <div className="flex items-center space-x-4 mb-6">
                <div className="bg-hemp-500/20 text-hemp-500 p-2 rounded-xl border border-hemp-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <Sparkles size={20} className="animate-pulse"/>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.6em]">Agro-Neural Interface v5.0.4</span>
            </div>
            <h1 className="text-8xl font-black text-white tracking-tighter uppercase leading-[0.8] mb-6">
                Central de <br /><span className="text-hemp-600 italic">Inteligencia</span>
            </h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-2xl">
                Supervisión táctica de la red nacional de ensayos industriales HempC.
            </p>
        </div>
        
        <div className="flex items-center space-x-4 bg-[#0a0f1d] p-4 rounded-[32px] border border-white/5 shadow-2xl">
            <button onClick={() => setShowReportModal(true)} className="flex items-center px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 rounded-2xl group">
                <Printer size={18} className="mr-3 group-hover:scale-110 transition-transform" /> Exportar Nodo
            </button>
            <Link to="/advisor" className="px-10 py-5 bg-hemp-600 hover:bg-hemp-700 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(22,163,74,0.3)] flex items-center transition-all hover:scale-[1.02] active:scale-95">
                <Bot size={22} className="mr-3" /> Consultar HempAI
            </Link>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <TechKPI label="Unidades Activas" value={relevantPlots.filter(p => p.status === 'Activa').length} icon={Activity} colorClass="bg-hemp-600" onClick={() => setExpandedCard('plots')} trend="12%" />
        <TechKPI label="Red de Nodos" value={locations.length} icon={Globe} colorClass="bg-blue-600" onClick={() => setExpandedCard('locations')} />
        <TechKPI label="Variedades Cert." value={varieties.length} icon={Sprout} colorClass="bg-purple-600" onClick={() => setExpandedCard('varieties')} />
        <TechKPI label="Seguridad Datos" value="SSL" icon={ShieldCheck} colorClass="bg-amber-600" onClick={() => setExpandedCard('integrity')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* DATA BLOCK */}
        <div className="lg:col-span-2 bg-[#0a0f1d] p-12 rounded-[56px] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-16 relative z-10">
              <div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 italic">Performance</h2>
                  <p className="text-[11px] text-slate-500 font-bold tracking-[0.4em] uppercase flex items-center">
                    <Database size={12} className="mr-2 text-hemp-600"/> Rendimientos Proyectados (Kg/Ha)
                  </p>
              </div>
          </div>
          
          <div className="h-[450px] relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fill: '#64748b', fontWeight: '900'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.02)'}} 
                    contentStyle={{ backgroundColor: '#050810', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: '#fff' }} 
                  />
                  <Bar dataKey="yield" radius={[12, 12, 0, 0]} barSize={54}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#3b82f6'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <History size={100} className="mb-8 opacity-20" />
                <p className="text-[12px] font-black uppercase tracking-[0.5em]">No data records in this node</p>
              </div>
            )}
          </div>
        </div>

        {/* FEED BLOCK */}
        <div className="bg-[#0a0f1d] p-12 rounded-[56px] border border-white/5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 italic">Monitor</h2>
                    <p className="text-[11px] text-blue-500 font-bold uppercase tracking-[0.2em] flex items-center">
                        <Radio size={12} className="mr-2 animate-pulse"/> Live Transactions
                    </p>
                </div>
            </div>
            
            <div className="flex-1 space-y-8 overflow-y-auto pr-3 custom-scrollbar">
                {trialRecords.slice(0, 8).map((act, idx) => (
                    <div key={idx} className="flex items-start space-x-6 p-5 hover:bg-white/5 rounded-[32px] transition-all border border-transparent hover:border-white/5">
                        <div className={`mt-2 w-3 h-3 rounded-full flex-shrink-0 bg-hemp-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]`}></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-hemp-600">{act.stage}</span>
                                <span className="text-[10px] text-slate-500 font-bold">{act.date}</span>
                            </div>
                            <p className="text-base font-black text-white truncate">{plots.find(p => p.id === act.plotId)?.name || 'Evento'}</p>
                            <p className="text-[11px] text-slate-500 mt-2 font-medium italic">By {act.createdByName || 'Técnico'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Link to="/plots" className="mt-12 group flex items-center justify-center w-full py-6 bg-hemp-600 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(22,163,74,0.2)] transition-all hover:scale-[1.01]">
                Planilla Global <ChevronRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform"/>
            </Link>
        </div>
      </div>

      {/* MODAL EXPANDED KPI */}
      {expandedCard && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in zoom-in-95 duration-500">
              <div className="bg-[#0a0f1d] rounded-[64px] shadow-2xl max-w-2xl w-full overflow-hidden border border-white/10 p-16 relative">
                  <button onClick={() => setExpandedCard(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-all p-4 bg-white/5 rounded-full hover:rotate-90"><X size={32} /></button>
                  <div className="mb-10">
                      <h3 className="text-hemp-500 font-black text-xs uppercase tracking-[0.5em] mb-4">Detalle Técnico</h3>
                      <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">{expandedCard}</h2>
                  </div>
                  <div className="space-y-6">
                      <p className="text-slate-400 text-lg">Información detallada sobre el nodo seleccionado. Sincronización 100% íntegra con la base de datos industrial.</p>
                      <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                          <p className="text-sm text-slate-300 font-medium">La red operativa de HempC permite la trazabilidad completa desde la semilla hasta el rinde final, garantizando datos limpios para toma de decisiones agrónomas.</p>
                      </div>
                      <button onClick={() => setExpandedCard(null)} className="w-full py-5 bg-hemp-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl">Cerrar Desglose</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
