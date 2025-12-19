
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ComposedChart, Line, Area 
} from 'recharts';
import { 
  Activity, Globe, ShieldCheck, ChevronRight, 
  Bot, Sprout, TrendingUp, AlertTriangle, 
  Calendar, ArrowUpRight, Zap, Target
} from 'lucide-react';

const MetricCard = ({ label, value, trend, icon: Icon, colorClass, subtext }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600`}>
             <Icon size={24} />
        </div>
        {trend && (
            <span className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                <TrendingUp size={10} className="mr-1" /> {trend}
            </span>
        )}
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
    {subtext && <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtext}</p>}
  </div>
);

export default function Dashboard() {
  const { varieties, locations, plots, currentUser, getLatestRecord, trialRecords, tasks, appName } = useAppContext();

  const relevantPlots = currentUser?.role === 'client' ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;
  const pendingTasks = tasks.filter(t => t.status === 'Pendiente').length;

  const yieldData = useMemo(() => {
    const map = new Map<string, { actual: number; target: number; count: number }>();
    relevantPlots.forEach(plot => {
      const latest = getLatestRecord(plot.id);
      const v = varieties.find(v => v.id === plot.varietyId);
      if (v) {
        const curr = map.get(v.name) || { actual: 0, target: 800, count: 0 }; // 800kg target default
        map.set(v.name, { 
            actual: curr.actual + (latest?.yield || 0), 
            target: curr.target,
            count: curr.count + (latest?.yield ? 1 : 0) 
        });
      }
    });
    return Array.from(map.entries())
        .map(([name, d]) => ({ 
            name, 
            actual: d.count > 0 ? Math.round(d.actual / d.count) : 0,
            target: d.target 
        }))
        .sort((a, b) => b.actual - a.actual)
        .slice(0, 5);
  }, [relevantPlots, varieties, getLatestRecord]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      {/* Top Banner: Saludo & Acciones Rápidas */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
            <div className="flex items-center space-x-2 mb-2">
                <span className="bg-hemp-600 w-2 h-2 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-hemp-600 uppercase tracking-widest">Panel {appName}</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Hola, {currentUser?.name.split(' ')[0]} <span className="text-slate-400 font-light">| Resumen Agrónomo</span>
            </h1>
        </div>
        <div className="flex items-center space-x-3">
            <Link to="/plots" className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center hover:bg-slate-50 transition-all">
                <Calendar size={16} className="mr-2 text-slate-400" /> Planificar Siembra
            </Link>
            <Link to="/advisor" className="px-6 py-3 bg-hemp-600 hover:bg-hemp-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_10px_25px_rgba(22,163,74,0.3)] flex items-center transition-all hover:scale-105 active:scale-95 group">
                <Bot size={18} className="mr-2 group-hover:rotate-12 transition-transform" /> Consultar HempAI
            </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Ensayos Activos" value={relevantPlots.filter(p => p.status === 'Activa').length} trend="+24%" icon={Activity} colorClass="bg-hemp-600" subtext="8 unidades en etapa reproductiva" />
        <MetricCard label="Tareas Pendientes" value={pendingTasks} icon={Zap} colorClass="bg-amber-500" subtext={`${tasks.filter(t => t.priority === 'Alta').length} de prioridad crítica`} />
        <MetricCard label="Genéticas en Red" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" subtext="3 nuevas variedades esta campaña" />
        <MetricCard label="Salud del Sistema" value="98.2%" trend="Optimo" icon={ShieldCheck} colorClass="bg-blue-600" subtext="Latencia de sincronización: 40ms" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analytics: Rendimiento Real vs Objetivo */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center">
                    <Target size={20} className="mr-2 text-hemp-600" /> Rendimiento de Cosecha
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Comparativa de kg/ha: Logrado vs. Proyectado.</p>
              </div>
              <div className="flex items-center space-x-6">
                  <div className="flex items-center"><span className="w-3 h-3 bg-hemp-500 rounded-full mr-2"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Real</span></div>
                  <div className="flex items-center"><span className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full mr-2"></span><span className="text-[10px] font-bold text-slate-500 uppercase">Objetivo</span></div>
              </div>
          </div>
          
          <div className="h-[380px] w-full">
            {yieldData.some(d => d.actual > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yieldData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', padding: '15px' }}
                    itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                  />
                  <Bar dataKey="target" fill="#f1f5f9" radius={[8, 8, 0, 0]} barSize={40} className="dark:fill-slate-800" />
                  <Bar dataKey="actual" barSize={25} radius={[6, 6, 0, 0]}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#10b981'} />)}
                  </Bar>
                  <Line type="monotone" dataKey="actual" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-full mb-4">
                    <Activity size={60} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Esperando datos de cosecha 2024</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Feed: Estilo de Notificaciones */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Actividad Reciente</h2>
                <span className="px-2 py-1 bg-hemp-50 text-hemp-600 text-[10px] font-black rounded-lg">LIVE</span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {trialRecords.length > 0 ? trialRecords.slice(0, 6).map((act, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-hemp-200 transition-all group">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-black uppercase text-hemp-600 tracking-tighter">{act.stage}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{act.date}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-hemp-700 transition-colors">
                            {plots.find(p => p.id === act.plotId)?.name || 'Evento de Sistema'}
                        </p>
                        <div className="flex items-center mt-2 text-[10px] text-slate-400 font-medium">
                            <ArrowUpRight size={12} className="mr-1" /> Registro técnico actualizado
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                        <AlertTriangle size={32} className="mb-2" />
                        <p className="text-xs font-bold">Sin actividad hoy</p>
                    </div>
                )}
            </div>
            <Link to="/plots" className="mt-8 flex items-center justify-center w-full py-4 bg-slate-900 dark:bg-hemp-600 hover:bg-black dark:hover:bg-hemp-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg">
                Explorar Planillas <ChevronRight size={16} className="ml-2" />
            </Link>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/locations" className="bg-blue-600 p-8 rounded-[32px] text-white flex items-center justify-between hover:scale-[1.02] transition-transform shadow-xl shadow-blue-900/20">
              <div>
                  <h4 className="text-2xl font-black">Campos</h4>
                  <p className="text-blue-100 text-sm font-medium mt-1">Geolocalización y límites.</p>
              </div>
              <Globe size={48} className="opacity-30" />
          </Link>
          <Link to="/tasks" className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[32px] text-white flex items-center justify-between hover:scale-[1.02] transition-transform shadow-xl">
              <div>
                  <h4 className="text-2xl font-black">Labores</h4>
                  <p className="text-slate-400 text-sm font-medium mt-1">Órdenes de trabajo.</p>
              </div>
              <Zap size={48} className="opacity-30 text-amber-500" />
          </Link>
          <Link to="/seed-batches" className="bg-hemp-800 p-8 rounded-[32px] text-white flex items-center justify-between hover:scale-[1.02] transition-transform shadow-xl shadow-hemp-900/20">
              <div>
                  <h4 className="text-2xl font-black">Logística</h4>
                  <p className="text-hemp-200 text-sm font-medium mt-1">Inventario y remitos.</p>
              </div>
              <TrendingUp size={48} className="opacity-30" />
          </Link>
      </div>
    </div>
  );
}
