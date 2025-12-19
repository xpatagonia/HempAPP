
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { 
  Sprout, MapPin, Activity, CheckCircle, FileText, Download, ArrowRight, 
  Users, AlertCircle, TrendingUp, Calendar, FileCheck, Printer, X, 
  Sparkles, Globe, Cpu, Zap, Radio, ShieldCheck, Database, History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TechKPI = ({ label, value, icon: Icon, colorClass, trend, status }: any) => (
  <div className="bg-[#0f172a]/40 backdrop-blur-md p-6 rounded-[24px] border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all group overflow-hidden relative">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass.includes('green') ? 'from-green-500/10' : 'from-blue-500/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-white shadow-inner`}>
             <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
        {status && (
            <div className="flex items-center space-x-1.5 bg-slate-900/50 px-2 py-1 rounded-full border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === 'online' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">{status}</span>
            </div>
        )}
    </div>
    <div className="relative z-10">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
        <div className="flex items-end space-x-2">
            <h3 className="text-3xl font-black text-white leading-none tracking-tighter">{value}</h3>
            {trend && <span className="text-green-500 text-[10px] font-bold pb-1">{trend}</span>}
        </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { varieties, locations, plots, projects, trialRecords, currentUser, theme, getLatestRecord } = useAppContext();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportConfig, setReportConfig] = useState({ projectId: 'all', includeFinancials: false, includeLogs: true });

  const isClient = currentUser?.role === 'client';
  const relevantPlots = isClient ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;

  // --- DATA AGGREGATION ---
  const yieldData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    relevantPlots.forEach(plot => {
      const latest = getLatestRecord(plot.id);
      if (!latest || !latest.yield) return;
      const v = varieties.find(v => v.id === plot.varietyId);
      if (v) {
        const curr = map.get(v.name) || { total: 0, count: 0 };
        map.set(v.name, { total: curr.total + latest.yield, count: curr.count + 1 });
      }
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, yield: Math.round(d.total / d.count) }));
  }, [relevantPlots, varieties]);

  const recentActivity = useMemo(() => {
    return [...trialRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        plotName: plots.find(p => p.id === r.plotId)?.name || 'Parcela',
        stage: r.stage,
        date: r.date,
        user: r.createdByName || 'Técnico'
      }));
  }, [trialRecords, plots]);

  const activePlots = relevantPlots.filter(p => p.status === 'Activa').length;
  const chartTextColor = '#64748b';

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      
      {/* HEADER 4.0 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div className="flex items-center space-x-3 mb-1">
                <Zap size={16} className="text-hemp-500 animate-pulse"/>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">System Operational</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Control <span className="text-blue-600">Central</span></h1>
        </div>
        
        <div className="flex space-x-3 bg-white dark:bg-[#0f172a]/60 backdrop-blur-xl p-2 rounded-[20px] border dark:border-white/5 shadow-xl">
            <button onClick={() => setShowReportModal(true)} className="flex items-center px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-hemp-600 transition">
                <Printer size={16} className="mr-2" /> Report Generator
            </button>
            <div className="w-px bg-slate-800 my-2"></div>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 hover:bg-blue-700 transition flex items-center">
                <Radio size={14} className="mr-2 animate-ping" /> Live Feed
            </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TechKPI label="Ensayos Activos" value={activePlots} icon={Activity} colorClass="bg-hemp-600" trend="+12%" status="online" />
        <TechKPI label="Nodos Geográficos" value={locations.length} icon={Globe} colorClass="bg-blue-600" status="sync" />
        <TechKPI label="Diversidad Genética" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" />
        <TechKPI label="Integridad Datos" value="99.8%" icon={ShieldCheck} colorClass="bg-amber-600" status="verified" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ANALYTICS MAIN PANEL */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f172a]/40 backdrop-blur-xl p-8 rounded-[32px] border dark:border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Rendimiento Comparado</h2>
                  <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Promedio Industrial (Kg/Ha)</p>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-white/5"><Database size={20} className="text-hemp-500"/></div>
          </div>
          
          <div className="h-80 relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: chartTextColor, fontWeight: 'bold'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: chartTextColor}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  />
                  <Bar dataKey="yield" radius={[8, 8, 0, 0]} barSize={40}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#2563eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <History size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Esperando Telemetría de Cosecha</p>
              </div>
            )}
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-hemp-500/5 blur-[100px] rounded-full"></div>
        </div>

        {/* REAL-TIME FEED */}
        <div className="bg-white dark:bg-[#0f172a]/40 backdrop-blur-xl p-8 rounded-[32px] border dark:border-white/5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">System Log</h2>
                <span className="text-[10px] font-black text-blue-500 animate-pulse uppercase tracking-widest">Live Updates</span>
            </div>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {recentActivity.length > 0 ? recentActivity.map(act => (
                    <div key={act.id} className="relative pl-6 border-l border-slate-800 group">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 bg-slate-700 rounded-full group-hover:bg-hemp-500 transition-colors"></div>
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-hemp-500 uppercase tracking-tighter">{act.stage}</span>
                            <span className="text-[9px] text-slate-500 font-bold">{act.date}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight mb-1">{act.plotName}</p>
                        <p className="text-[10px] text-slate-500 flex items-center italic">
                            <Users size={10} className="mr-1"/> Updated by {act.user}
                        </p>
                    </div>
                )) : (
                    <div className="text-center py-10">
                        <Cpu size={32} className="mx-auto text-slate-800 mb-3"/>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No recent transactions</p>
                    </div>
                )}
            </div>

            <Link to="/plots" className="mt-8 group flex items-center justify-center w-full py-4 bg-slate-900 border border-white/5 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all">
                Access Global Matrix <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform"/>
            </Link>
        </div>
      </div>

      {/* REPORT MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0f172a] rounded-[40px] shadow-2xl max-w-lg w-full overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-white/5 bg-slate-900 flex justify-between items-center">
                      <h3 className="text-white font-black flex items-center text-xs uppercase tracking-[0.2em]">
                          <FileText className="mr-3 text-hemp-500" size={20} /> Intelligent Report Engine
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  
                  <div className="p-10 space-y-8">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Scope Selection</label>
                          <select className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl focus:ring-2 focus:ring-hemp-500/30 outline-none font-bold text-sm">
                              <option value="all">Full Enterprise Consolidated</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>

                      <div className="space-y-4">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Advanced Modules</label>
                          <div className="grid grid-cols-1 gap-3">
                              <label className="flex items-center justify-between p-5 bg-slate-950 border border-slate-800 rounded-3xl cursor-pointer hover:border-hemp-500/30 transition-all">
                                  <div className="flex items-center">
                                      <History size={18} className="mr-3 text-blue-500"/>
                                      <div><p className="text-xs font-black text-white uppercase tracking-tighter">Event Logs</p><p className="text-[9px] text-slate-500">Include full field log history</p></div>
                                  </div>
                                  <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-700 bg-slate-800 text-hemp-600 focus:ring-0" defaultChecked />
                              </label>
                          </div>
                      </div>

                      <button className="w-full bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center">
                          <Sparkles size={16} className="mr-2"/> Generate Digital Asset (PDF)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
