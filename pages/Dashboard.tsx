
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Activity, Sparkles, Globe, Radio, ShieldCheck, 
  ChevronRight, Bot, Sprout, Terminal, Cpu
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, colorClass }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group">
    <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600`}>
             <Icon size={24} />
        </div>
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Panel de Control
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
                Monitoreo en tiempo real de la red nacional de ensayos.
            </p>
        </div>
        <Link to="/advisor" className="px-6 py-3 bg-hemp-600 hover:bg-hemp-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-hemp-600/20 flex items-center transition-all hover:scale-105 active:scale-95 group">
            <Bot size={20} className="mr-2 group-hover:rotate-12 transition-transform" /> HempAI Advisor
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Parcelas Activas" value={relevantPlots.length} icon={Activity} colorClass="bg-hemp-600" />
        <StatCard label="Localidades" value={locations.length} icon={Globe} colorClass="bg-blue-600" />
        <StatCard label="Variedades" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" />
        <StatCard label="Estado Red" value="100%" icon={ShieldCheck} colorClass="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rendimientos por Genética</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Promedio de kg/ha por variedad autorizada.</p>
          </div>
          <div className="h-[350px]">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="yield" radius={[6, 6, 0, 0]} barSize={40}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#10b981'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Activity size={48} className="text-slate-300 mb-4" />
                <p className="text-sm font-medium text-slate-400">Sin datos de cosecha registrados</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Actividad Reciente</h2>
            <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                {trialRecords.slice(0, 6).map((act, idx) => (
                    <div key={idx} className="flex space-x-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-hemp-500 flex-shrink-0"></div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{plots.find(p => p.id === act.plotId)?.name || 'Lote'}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">{act.stage} • {act.date}</p>
                        </div>
                    </div>
                ))}
                {trialRecords.length === 0 && <p className="text-sm text-slate-400 text-center py-10">No hay registros recientes</p>}
            </div>
            <Link to="/plots" className="mt-6 flex items-center justify-center w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-hemp-600 hover:text-white dark:text-slate-300 rounded-xl text-xs font-bold transition-all group">
                Ver Todas las Planillas <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform"/>
            </Link>
        </div>
      </div>
    </div>
  );
}
