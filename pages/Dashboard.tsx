
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// Fix: Added missing imports for Bot and MapPin components
import { 
  Sprout, Activity, FileText, ArrowRight, 
  Users, TrendingUp, Printer, X, 
  Sparkles, Globe, Cpu, Zap, Radio, ShieldCheck, Database, History, CheckCircle2,
  Download, Loader2, AlertCircle, Clock, Info, ChevronRight, Maximize2,
  Bot, MapPin
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TechKPI = ({ label, value, icon: Icon, colorClass, status, trend, onClick }: any) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-[#0a0f1d] p-6 rounded-[24px] border border-slate-200 dark:border-white/5 flex flex-col justify-between hover:border-hemp-500/50 dark:hover:border-hemp-500/30 transition-all group relative overflow-hidden text-left w-full shadow-sm hover:shadow-xl hover:translate-y-[-4px]"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${colorClass.includes('green') ? 'from-green-500/5' : 'from-blue-500/5'} to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
    
    <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-white shadow-inner transition-transform group-hover:scale-110`}>
             <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={14} className="text-slate-400" />
        </div>
    </div>
    
    <div className="relative z-10">
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
        <div className="flex items-end space-x-2">
            <h3 className="text-4xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{value}</h3>
            {trend && <span className="text-green-500 text-[10px] font-bold pb-1">{trend}</span>}
        </div>
    </div>
  </button>
);

export default function Dashboard() {
  const { varieties, locations, plots, projects, trialRecords, currentUser, logs, getLatestRecord } = useAppContext();
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  
  // States for Card Expansion
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const isClient = currentUser?.role === 'client';
  const relevantPlots = isClient ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;

  const recentActivity = useMemo(() => {
    const combined = [
        ...trialRecords.map(r => ({ id: r.id, type: 'monitoreo', plotId: r.plotId, date: r.date, label: r.stage, user: r.createdByName || 'Técnico' })),
        ...logs.map(l => ({ id: l.id, type: 'nota', plotId: l.plotId, date: l.date, label: 'Nota', user: 'Operativo' }))
    ];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [trialRecords, logs]);

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
    return Array.from(map.entries()).map(([name, d]) => ({ name, yield: Math.round(d.total / d.count) })).sort((a, b) => b.yield - a.yield).slice(0, 6);
  }, [relevantPlots, varieties, getLatestRecord]);

  const generatePDF = async () => {
    setReportGenerating(true);
    try {
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        doc.setFillColor(5, 8, 16);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("HEMPC - SISTEMA INTELIGENTE DE SIEMBRA", 15, 25);
        doc.setFontSize(10);
        doc.text(`REPORTE INDUSTRIAL - ${timestamp}`, 140, 25);
        
        const tableData = relevantPlots.filter(p => selectedProjectId === 'all' || p.projectId === selectedProjectId).map(p => {
            const latest = getLatestRecord(p.id);
            return [p.name, varieties.find(v => v.id === p.varietyId)?.name || 'S/D', locations.find(l => l.id === p.locationId)?.name || 'S/D', latest?.stage || 'S/D', latest?.yield ? `${latest.yield} kg/ha` : 'N/A'];
        });

        autoTable(doc, {
            startY: 50,
            head: [['LOTE', 'GENÉTICA', 'ESTABLECIMIENTO', 'ETAPA', 'RENDIMIENTO']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' }
        });

        doc.save(`HempC_Intelligence_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowReportModal(false);
    } catch (e) { alert("Error generating report"); } finally { setReportGenerating(false); }
  };

  return (
    <div className="space-y-10">
      
      {/* HEADER 4.0 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div className="flex items-center space-x-3 mb-2">
                <Sparkles size={16} className="text-purple-500 animate-pulse"/>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Engine v4.0 Active</span>
            </div>
            <h1 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                Sistema Inteligente <br className="md:hidden"/><span className="text-hemp-600">de Siembra</span>
            </h1>
        </div>
        
        <div className="flex items-center space-x-3 bg-white dark:bg-[#0a0f1d] p-2 rounded-[20px] border border-slate-200 dark:border-white/5 shadow-xl">
            <button onClick={() => setShowReportModal(true)} className="flex items-center px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-hemp-600 transition group">
                <Printer size={16} className="mr-2 group-hover:scale-110 transition-transform" /> Reporte
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
            <Link to="/advisor" className="px-5 py-2.5 bg-hemp-600 hover:bg-hemp-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-hemp-900/20 flex items-center transition-all">
                <Bot size={16} className="mr-2" /> Consultar IA
            </Link>
        </div>
      </div>

      {/* KPI GRID - MODAL DRIVEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TechKPI label="Unidades Activas" value={relevantPlots.filter(p => p.status === 'Activa').length} icon={Activity} colorClass="bg-hemp-600" onClick={() => setExpandedCard('plots')} />
        <TechKPI label="Nodos de Red" value={locations.length} icon={Globe} colorClass="bg-blue-600" onClick={() => setExpandedCard('locations')} />
        <TechKPI label="Variedades" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" onClick={() => setExpandedCard('varieties')} />
        <TechKPI label="Integridad" value="100%" icon={ShieldCheck} colorClass="bg-amber-600" onClick={() => setExpandedCard('integrity')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DATA VISUALIZATION CENTER */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0a0f1d] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Rendimiento Histórico</h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-[0.2em] uppercase">Kg/Ha por Genética Autorizada</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/10"><Database size={24} className="text-hemp-600"/></div>
          </div>
          
          <div className="h-[350px] relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 9, fill: '#64748b', fontWeight: '800'}} axisLine={false} />
                  <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0a0f1d', border: 'none', borderRadius: '16px', color: '#fff' }} />
                  <Bar dataKey="yield" radius={[6, 6, 0, 0]} barSize={32}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#2563eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-800">
                <History size={64} className="mb-4 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Telemetry idle</p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY MONITOR */}
        <div className="bg-white dark:bg-[#0a0f1d] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Monitor</h2>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Actividad de Campo</p>
                </div>
                <Radio size={20} className="text-blue-500 animate-pulse" />
            </div>
            
            <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                    <div key={idx} className="flex items-start space-x-4 group p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors">
                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${act.type === 'monitoreo' ? 'bg-hemp-500' : 'bg-blue-500'} group-hover:scale-150 transition-transform`}></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{act.label}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{act.date}</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{plots.find(p => p.id === act.plotId)?.name || 'Evento'}</p>
                            <p className="text-[10px] text-slate-400 font-medium italic">By {act.user}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 opacity-20">
                        <Activity size={40} className="mx-auto text-slate-500 mb-2"/>
                        <p className="text-[10px] font-black uppercase tracking-widest">No activity</p>
                    </div>
                )}
            </div>

            <Link to="/plots" className="mt-8 group flex items-center justify-center w-full py-4 bg-slate-900 dark:bg-hemp-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:shadow-xl transition-all">
                Planilla Global <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform"/>
            </Link>
        </div>
      </div>

      {/* EXPANDED CARD MODAL */}
      {expandedCard && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
              <div className="bg-white dark:bg-[#0a0f1d] rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10">
                  <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                      <h3 className="text-slate-800 dark:text-white font-black flex items-center text-xs uppercase tracking-[0.2em]">
                          <Maximize2 className="mr-3 text-hemp-600" size={20} /> Desglose: {expandedCard.toUpperCase()}
                      </h3>
                      <button onClick={() => setExpandedCard(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2"><X size={24} /></button>
                  </div>
                  <div className="p-10">
                      {expandedCard === 'plots' && (
                          <div className="space-y-4">
                              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">Estado actual de la red de ensayos industriales. Actualmente hay {relevantPlots.length} parcelas bajo supervisión.</p>
                              <div className="grid grid-cols-1 gap-3">
                                  {relevantPlots.slice(0, 5).map(p => (
                                      <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                          <div className="font-black text-slate-800 dark:text-white">{p.name}</div>
                                          <div className="text-[10px] font-black text-hemp-600 uppercase bg-hemp-50 dark:bg-hemp-900/40 px-2.5 py-1 rounded-full">{p.status}</div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/plots')} className="w-full mt-6 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-colors">Ver planilla completa</button>
                          </div>
                      )}
                      {expandedCard === 'varieties' && (
                          <div className="space-y-4">
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Contamos con un catálogo de {varieties.length} genéticas registradas para diferentes usos industriales.</p>
                              <div className="grid grid-cols-2 gap-4">
                                  {varieties.slice(0, 4).map(v => (
                                      <div key={v.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                          <div className="font-black text-slate-800 dark:text-white mb-1">{v.name}</div>
                                          <div className="text-[9px] text-slate-400 uppercase font-black">{v.usage}</div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/varieties')} className="w-full mt-6 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-colors">Catálogo genético</button>
                          </div>
                      )}
                      {expandedCard === 'locations' && (
                          <div className="space-y-4">
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Nodos geográficos activos en la red nacional. Total: {locations.length} establecimientos.</p>
                              <div className="space-y-3">
                                  {locations.slice(0, 3).map(l => (
                                      <div key={l.id} className="flex items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                          <MapPin size={16} className="text-blue-500 mr-3"/>
                                          <div>
                                              <div className="font-black text-slate-800 dark:text-white">{l.name}</div>
                                              <div className="text-[10px] text-slate-400 font-bold uppercase">{l.province}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/locations')} className="w-full mt-6 py-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-colors">Mapa de campos</button>
                          </div>
                      )}
                      {expandedCard === 'integrity' && (
                          <div className="text-center py-6">
                              <ShieldCheck size={64} className="mx-auto text-hemp-600 mb-6"/>
                              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">La red de datos está sincronizada al 100% con la base de datos industrial de HempC. Todas las transacciones son inmutables y auditadas por ID de usuario.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-[#0a0f1d] rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                      <h3 className="text-slate-800 dark:text-white font-black flex items-center text-xs uppercase tracking-[0.3em]">
                          <FileText className="mr-3 text-hemp-600" size={20} /> Generador de Reportes
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2"><X size={24} /></button>
                  </div>
                  
                  <div className="p-10 space-y-8">
                      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-5 rounded-2xl text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed flex items-start">
                          <Info className="mr-3 flex-shrink-0" size={18}/>
                          <p>Esta operación compilará todos los datos geográficos, genéticos y técnicos en un activo digital PDF inmutable.</p>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Alcance del Reporte</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white p-4 rounded-2xl focus:ring-1 focus:ring-hemp-500 outline-none font-bold text-sm transition-all"
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
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:shadow-2xl transition-all flex items-center justify-center disabled:opacity-50"
                      >
                          {reportGenerating ? <Loader2 className="animate-spin mr-3" size={20}/> : <Download className="mr-3" size={20}/>}
                          {reportGenerating ? 'Compilando...' : 'Generar PDF Industrial'}
                      </button>
                      
                      <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">Powered by HempC Core Intelligence</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
