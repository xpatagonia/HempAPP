
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Activity, Sparkles, Globe, Radio, ShieldCheck, 
  ChevronRight, Bot, Sprout, Terminal, Cpu
} from 'lucide-react';

const TechKPI = ({ label, value, icon: Icon, colorClass, trend }: any) => (
  <div className="bg-[#061006] p-8 rounded-[32px] border border-hemp-900/50 relative overflow-hidden group shadow-2xl">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-hemp-500/30 to-transparent"></div>
    <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-20 text-white shadow-lg group-hover:scale-110 transition-transform duration-500`}>
             <Icon size={28} />
        </div>
        {trend && <span className="text-hemp-500 text-[10px] font-black bg-hemp-500/10 px-2 py-1 rounded-full font-mono">{trend}</span>}
    </div>
    <p className="text-hemp-800 text-[10px] font-black uppercase tracking-[0.4em] mb-1 font-mono">{label}</p>
    <h3 className="text-5xl font-black text-white italic tracking-tighter">{value}</h3>
  </div>
);

export default function Dashboard() {
  const { varieties, locations, plots, currentUser, getLatestRecord, trialRecords } = useAppContext();

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
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div>
            <div className="flex items-center space-x-3 mb-4">
                <div className="bg-hemp-500/20 text-hemp-500 p-2 rounded-lg border border-hemp-500/30">
                    <Cpu size={20} className="animate-pulse"/>
                </div>
                <span className="text-[10px] font-black text-hemp-600 uppercase tracking-[0.5em] font-mono">SYSTEM_v8.0_ONLINE</span>
            </div>
            <h1 className="text-8xl font-black text-white tracking-tighter uppercase leading-none mb-4">
                NÚCLEO <span className="text-hemp-600 italic">HEMPC</span>
            </h1>
            <p className="text-slate-500 text-lg max-w-xl font-medium border-l-2 border-hemp-900/50 pl-6">
                Terminal de control biotecnológico. Monitoreo de precisión para cultivos industriales.
            </p>
        </div>
        <Link to="/advisor" className="px-10 py-5 bg-hemp-600 hover:bg-hemp-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(22,163,74,0.4)] flex items-center transition-all hover:scale-105 group">
            <Bot size={22} className="mr-3 group-hover:rotate-12 transition-transform" /> HEMPAI CORE
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TechKPI label="NODOS_ACTIVOS" value={relevantPlots.length} icon={Activity} colorClass="bg-hemp-600" trend="+12%" />
        <TechKPI label="REGIONES" value={locations.length} icon={Globe} colorClass="bg-blue-600" />
        <TechKPI label="GERMOPLASMA" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" />
        <TechKPI label="INTEGRIDAD" value="100%" icon={ShieldCheck} colorClass="bg-hemp-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#061006] p-10 rounded-[40px] border border-hemp-900/50 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-12">
              <div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">TELEMETRÍA</h2>
                  <p className="text-[10px] text-hemp-700 font-black tracking-[0.4em] uppercase flex items-center font-mono mt-1">
                    <Terminal size={12} className="mr-2 text-hemp-500"/> RENDIMIENTO_ESTIMADO
                  </p>
              </div>
          </div>
          <div className="h-[400px]">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData}>
                  <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#0a200a" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fill: '#16a34a', fontWeight: 'bold', fontFamily: 'JetBrains Mono'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#16a34a', fontWeight: 'bold', fontFamily: 'JetBrains Mono'}} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(34,197,94,0.05)'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #16a34a', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="yield" radius={[10, 10, 0, 0]} barSize={50}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#065f46'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Activity size={80} className="text-hemp-900 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-hemp-900">Awaiting_Data_Link</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#061006] p-10 rounded-[40px] border border-hemp-900/50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">LIVE_FEED</h2>
                    <p className="text-[10px] text-hemp-500 font-black uppercase tracking-[0.4em] flex items-center font-mono mt-1 animate-pulse">
                        <Radio size={12} className="mr-2"/> NODE_STREAM
                    </p>
                </div>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {trialRecords.slice(0, 8).map((act, idx) => (
                    <div key={idx} className="bg-black/40 p-5 rounded-2xl border border-hemp-900/30">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black uppercase text-hemp-600 font-mono">{act.stage}</span>
                            <span className="text-[9px] text-hemp-900 font-black font-mono">{act.date}</span>
                        </div>
                        <p className="text-sm font-black text-white italic">{plots.find(p => p.id === act.plotId)?.name || 'SYS_EVENT'}</p>
                    </div>
                ))}
            </div>
            <Link to="/plots" className="mt-10 group flex items-center justify-center w-full py-5 bg-[#000500] border border-hemp-900/50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-hemp-600 transition-all">
                ABRIR_PLANILLA <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform"/>
            </Link>
        </div>
      </div>
    </div>
  );
}
