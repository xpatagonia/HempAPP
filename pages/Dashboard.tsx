
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Sprout, Activity, FileText, ArrowRight, 
  Users, TrendingUp, Printer, X, 
  Sparkles, Globe, Cpu, Zap, Radio, ShieldCheck, Database, History, CheckCircle2,
  Download, Loader2, AlertCircle, Clock, Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TechKPI = ({ label, value, icon: Icon, colorClass, status, trend }: any) => (
  <div className="bg-[#0a0f1d] p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all group relative overflow-hidden">
    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${colorClass.includes('green') ? 'from-green-500/10' : 'from-blue-500/10'} to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
    
    <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-white shadow-inner`}>
             <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
        {status && (
            <div className="flex items-center space-x-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === 'online' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{status}</span>
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
  const { varieties, locations, plots, projects, trialRecords, currentUser, logs, getLatestRecord } = useAppContext();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const isClient = currentUser?.role === 'client';
  const relevantPlots = isClient ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;

  // --- REAL-TIME FEED LOGIC ---
  const recentActivity = useMemo(() => {
    const combined = [
        ...trialRecords.map(r => ({ 
            id: r.id, 
            type: 'monitoreo', 
            plotId: r.plotId, 
            date: r.date, 
            label: r.stage, 
            user: r.createdByName || 'Técnico' 
        })),
        ...logs.map(l => ({ 
            id: l.id, 
            type: 'nota', 
            plotId: l.plotId, 
            date: l.date, 
            label: 'Nota de Campo', 
            user: 'Operativo' 
        }))
    ];
    
    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [trialRecords, logs]);

  // --- ANALYTICS DATA ---
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
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, yield: Math.round(d.total / d.count) }))
      .sort((a, b) => b.yield - a.yield);
  }, [relevantPlots, varieties, getLatestRecord]);

  // --- REPORT GENERATOR (PDF) ---
  const generatePDF = async () => {
    setReportGenerating(true);
    try {
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        const projectLabel = selectedProjectId === 'all' ? 'Consolidado General' : projects.find(p => p.id === selectedProjectId)?.name;

        // Header
        doc.setFillColor(2, 4, 10);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text("HEMPC - INDUSTRIAL REPORT", 15, 25);
        doc.setFontSize(10);
        doc.text(`EMITIDO: ${timestamp}`, 150, 25);

        // SubHeader
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(12);
        doc.text(`PROYECTO: ${projectLabel}`, 15, 50);

        const tableData = relevantPlots
            .filter(p => selectedProjectId === 'all' || p.projectId === selectedProjectId)
            .map(p => {
                const latest = getLatestRecord(p.id);
                return [
                    p.name,
                    varieties.find(v => v.id === p.varietyId)?.name || 'S/D',
                    locations.find(l => l.id === p.locationId)?.name || 'S/D',
                    latest?.stage || 'Inicial',
                    latest?.yield ? `${latest.yield} kg/ha` : 'N/A',
                    p.status
                ];
            });

        autoTable(doc, {
            startY: 60,
            head: [['LOTE', 'GENÉTICA', 'ESTABLECIMIENTO', 'ETAPA', 'RENDIMIENTO', 'ESTADO']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 4 }
        });

        doc.save(`HEMPC_Industrial_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowReportModal(false);
    } catch (e) {
        alert("Error al generar el PDF. Verifica los datos.");
    } finally {
        setReportGenerating(false);
    }
  };

  const chartTextColor = '#475569';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* INDUSTRIAL HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div className="flex items-center space-x-3 mb-2">
                <div className="w-2 h-2 bg-hemp-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Network Online</span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
                Panel de <span className="text-blue-600">Control</span>
            </h1>
        </div>
        
        <div className="flex items-center space-x-3 bg-white dark:bg-[#0a0f1d] p-2.5 rounded-2xl border dark:border-white/5 shadow-2xl">
            <button onClick={() => setShowReportModal(true)} className="flex items-center px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-hemp-600 transition group">
                <Printer size={16} className="mr-2 group-hover:scale-110 transition-transform" /> Exportar Inteligencia
            </button>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="px-5 py-2.5 bg-blue-600/10 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-600/20 flex items-center">
                <Radio size={14} className="mr-2 animate-pulse" /> Telemetría Activa
            </div>
        </div>
      </div>

      {/* KPI MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TechKPI label="Unidades de Ensayo" value={relevantPlots.filter(p => p.status === 'Activa').length} icon={Activity} colorClass="bg-hemp-600" status="online" trend="+4" />
        <TechKPI label="Puntos Geográficos" value={locations.length} icon={Globe} colorClass="bg-blue-600" status="sync" />
        <TechKPI label="Variedades Registradas" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" />
        <TechKPI label="Integridad de Datos" value="100%" icon={ShieldCheck} colorClass="bg-amber-600" status="verified" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DATA VISUALIZATION CENTER */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0a0f1d] p-8 rounded-[32px] border dark:border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Rendimiento Histórico</h2>
                  <p className="text-xs text-slate-500 font-bold tracking-[0.2em] uppercase">Métrica Comparada: Kg/Ha por Genética</p>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/10"><Database size={24} className="text-hemp-500"/></div>
          </div>
          
          <div className="h-[400px] relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fill: chartTextColor, fontWeight: 'bold'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: chartTextColor}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{ backgroundColor: '#02040a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="yield" radius={[6, 6, 0, 0]} barSize={40}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#2563eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <History size={64} className="mb-4 opacity-10" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">No hay datos de cosecha procesados</p>
              </div>
            )}
          </div>
        </div>

        {/* SYSTEM MONITOR (LIVE FEED) */}
        <div className="bg-white dark:bg-[#0a0f1d] p-8 rounded-[32px] border dark:border-white/5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">System Monitor</h2>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Actividad Técnica Reciente</p>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 animate-pulse"></div>
                    <Radio size={20} className="text-blue-500 relative z-10" />
                </div>
            </div>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                    <div key={idx} className="relative pl-7 border-l border-slate-800 group pb-1">
                        <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-slate-800 rounded-full group-hover:bg-hemp-500 transition-colors border-2 border-[#0a0f1d]"></div>
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${act.type === 'monitoreo' ? 'text-hemp-500' : 'text-blue-500'}`}>
                                {act.label}
                            </span>
                            <span className="text-[9px] text-slate-600 font-bold flex items-center">
                                <Clock size={10} className="mr-1"/> {act.date}
                            </span>
                        </div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">
                            {plots.find(p => p.id === act.plotId)?.name || 'Evento de Sistema'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center italic">
                            <Users size={10} className="mr-1 opacity-50"/> {act.user}
                        </p>
                    </div>
                )) : (
                    <div className="text-center py-20">
                        <AlertCircle size={40} className="mx-auto text-slate-800 mb-4 opacity-20"/>
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Esperando Transacciones...</p>
                    </div>
                )}
            </div>

            <Link to="/plots" className="mt-10 group flex items-center justify-center w-full py-4 bg-[#02040a] border border-white/5 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white hover:border-hemp-500/50 transition-all">
                Ver Planilla Global <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform"/>
            </Link>
        </div>
      </div>

      {/* REPORT ENGINE MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-[#0a0f1d] rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                      <h3 className="text-white font-black flex items-center text-xs uppercase tracking-[0.3em]">
                          <FileText className="mr-3 text-hemp-500" size={20} /> Report Engine v4.0
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  
                  <div className="p-10 space-y-8">
                      <div className="bg-blue-50/5 border border-blue-500/20 p-5 rounded-2xl text-blue-400 text-[11px] leading-relaxed flex items-start">
                          <Info className="mr-3 flex-shrink-0" size={18}/>
                          <p>Esta operación compilará todos los datos geográficos, genéticos y técnicos en un activo digital PDF inmutable.</p>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Alcance del Reporte</label>
                          <select 
                            className="w-full bg-[#02040a] border border-slate-800 text-white p-4 rounded-xl focus:ring-1 focus:ring-hemp-500 outline-none font-bold text-sm"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                          >
                              <option value="all">Consolidado Total (Global)</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>

                      <button 
                        onClick={generatePDF}
                        disabled={reportGenerating}
                        className="w-full bg-white text-black py-5 rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-200 transition-all flex items-center justify-center disabled:opacity-50"
                      >
                          {reportGenerating ? <Loader2 className="animate-spin mr-3" size={20}/> : <Download className="mr-3" size={20}/>}
                          {reportGenerating ? 'Procesando Datos...' : 'Generar PDF Industrial'}
                      </button>
                      
                      <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest">Compilado por HempC Core Logic</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
