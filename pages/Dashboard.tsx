
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Activity, Printer, X, Sparkles, Globe, Database, History, 
  Loader2, Radio, ShieldCheck, Clock, ChevronRight, Maximize2,
  Bot, Sprout, Zap, LayoutGrid, Terminal
} from 'lucide-react';

const TechKPI = ({ label, value, icon: Icon, colorClass, onClick, trend }: any) => (
  <button 
    onClick={onClick}
    className="bg-[#050c06] p-8 rounded-[48px] border border-hemp-900/30 flex flex-col justify-between hover:border-hemp-500/60 transition-all group relative overflow-hidden text-left w-full shadow-2xl hover:-translate-y-2"
  >
    <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${colorClass.includes('hemp') ? 'from-hemp-500/20' : 'from-blue-500/20'} to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={`p-4 rounded-3xl ${colorClass} bg-opacity-20 text-white shadow-inner group-hover:scale-110 transition-transform duration-500`}>
             <Icon size={32} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all bg-white/5 p-2 rounded-full"><Maximize2 size={16} className="text-hemp-500" /></div>
    </div>
    <div className="relative z-10">
        <p className="text-hemp-800 text-[10px] font-black uppercase tracking-[0.5em] mb-2 font-mono">{label}</p>
        <div className="flex items-end space-x-3">
            <h3 className="text-6xl font-black text-white leading-none tracking-tighter italic">{value}</h3>
            {trend && <span className="text-hemp-500 text-[10px] font-black pb-1 bg-hemp-500/10 px-2 py-0.5 rounded-full mb-1 font-mono">{trend}</span>}
        </div>
    </div>
  </button>
);

export default function Dashboard() {
  const { varieties, locations, plots, currentUser, getLatestRecord, trialRecords } = useAppContext();
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
      
      {/* BRAND HUD v6.0 */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div className="max-w-4xl relative">
            <div className="flex items-center space-x-4 mb-6">
                <div className="bg-hemp-500/20 text-hemp-500 p-2 rounded-xl border border-hemp-500/20 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <Sparkles size={24} className="animate-pulse"/>
                </div>
                <span className="text-[11px] font-black text-hemp-700 uppercase tracking-[0.8em] font-mono">NEURAL_INTERFACE_V6.0</span>
            </div>
            <h1 className="text-9xl font-black text-white tracking-tighter uppercase leading-[0.75] mb-6">
                CENTRO <br /><span className="text-hemp-600 italic">TACTICO</span>
            </h1>
            <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-xl border-l-2 border-hemp-900/50 pl-6">
                Terminal de mando para la supervisión de biotecnología aplicada en la red HempC.
            </p>
        </div>
        
        <div className="flex items-center space-x-4 bg-[#050c06] p-4 rounded-[32px] border border-hemp-900/30 shadow-2xl">
            <Link to="/advisor" className="px-12 py-6 bg-hemp-600 hover:bg-hemp-700 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(22,163,74,0.4)] flex items-center transition-all hover:scale-[1.05] active:scale-95 group">
                <Bot size={24} className="mr-3 group-hover:rotate-12 transition-transform" /> CONSULTAR HEMPAI_CORE
            </Link>
        </div>
      </div>

      {/* KPI GRID v6.0 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <TechKPI label="NODOS_ACTIVOS" value={relevantPlots.filter(p => p.status === 'Activa').length} icon={Activity} colorClass="bg-hemp-600" onClick={() => setExpandedCard('plots')} trend="+14.2%" />
        <TechKPI label="REGIONES" value={locations.length} icon={Globe} colorClass="bg-blue-600" onClick={() => setExpandedCard('locations')} />
        <TechKPI label="GENOMAS_VET" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" onClick={() => setExpandedCard('varieties')} />
        <TechKPI label="DATA_INTEGRITY" value="100%" icon={ShieldCheck} colorClass="bg-amber-600" onClick={() => setExpandedCard('integrity')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* ANALYTICS v6.0 */}
        <div className="lg:col-span-2 bg-[#050c06] p-12 rounded-[64px] border border-hemp-900/30 shadow-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start mb-16 relative z-10">
              <div>
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-2 italic">TELEMETRÍA</h2>
                  <p className="text-[10px] text-hemp-700 font-black tracking-[0.5em] uppercase flex items-center font-mono">
                    <Terminal size={12} className="mr-2 text-hemp-500"/> RENDIMIENTO_GRANO_ESTIMADO
                  </p>
              </div>
          </div>
          
          <div className="h-[480px] relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#142a18" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fill: '#16a34a', fontWeight: '900', fontFamily: 'JetBrains Mono'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#16a34a', fontWeight: 'bold', fontFamily: 'JetBrains Mono'}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(34,197,94,0.05)'}} 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #16a34a', borderRadius: '16px', color: '#fff', fontFamily: 'JetBrains Mono' }} 
                  />
                  <Bar dataKey="yield" radius={[16, 16, 0, 0]} barSize={60}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#1e3a8a'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-hemp-900">
                <History size={120} className="mb-8 opacity-20" />
                <p className="text-[14px] font-black uppercase tracking-[0.8em] font-mono">DATA_EMPTY</p>
              </div>
            )}
          </div>
        </div>

        {/* MONITOR v6.0 */}
        <div className="bg-[#050c06] p-12 rounded-[64px] border border-hemp-900/30 shadow-2xl flex flex-col group">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 italic">LIVE_FEED</h2>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.5em] flex items-center font-mono">
                        <Radio size={12} className="mr-2 animate-pulse"/> TRANSACTION_LOG
                    </p>
                </div>
            </div>
            
            <div className="flex-1 space-y-8 overflow-y-auto pr-3 custom-scrollbar">
                {trialRecords.slice(0, 10).map((act, idx) => (
                    <div key={idx} className="flex items-start space-x-6 p-6 hover:bg-hemp-900/10 rounded-[32px] transition-all border border-transparent hover:border-hemp-900/40">
                        <div className={`mt-2 w-3 h-3 rounded-full flex-shrink-0 bg-hemp-500 shadow-[0_0_20px_#16a34a]`}></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-hemp-600 font-mono">{act.stage}</span>
                                <span className="text-[10px] text-hemp-900 font-black font-mono">{act.date}</span>
                            </div>
                            <p className="text-lg font-black text-white truncate italic">{plots.find(p => p.id === act.plotId)?.name || 'SYS_EVENT'}</p>
                            <p className="text-[11px] text-hemp-700 mt-2 font-black uppercase tracking-widest">ID: {act.createdByName?.split(' ')[0] || 'TECH'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Link to="/plots" className="mt-12 group flex items-center justify-center w-full py-7 bg-[#010402] border border-hemp-900/50 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.5em] shadow-2xl transition-all hover:bg-hemp-600 hover:border-hemp-500">
                VER_PLANILLA_GLOBAL <ChevronRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform duration-500"/>
            </Link>
        </div>
      </div>
    </div>
  );
}
