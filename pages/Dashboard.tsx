
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Sprout, Activity, FileText, ArrowRight, 
  Users, Printer, X, 
  Sparkles, Globe, Database, History, 
  Download, Loader2, Radio, ShieldCheck, Clock, Info, ChevronRight, Maximize2,
  Bot, MapPin, Zap, ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TechKPI = ({ label, value, icon: Icon, colorClass, onClick, trend }: any) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-[#0a0f1d] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 flex flex-col justify-between hover:border-hemp-500/50 dark:hover:border-hemp-500/30 transition-all group relative overflow-hidden text-left w-full shadow-sm hover:shadow-2xl hover:-translate-y-2"
  >
    <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${colorClass.includes('green') ? 'from-green-500/10' : 'from-blue-500/10'} to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
    
    <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 text-white shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
             <Icon size={32} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <div className="bg-slate-100 dark:bg-white/5 p-2 rounded-full">
                <Maximize2 size={16} className="text-slate-400" />
            </div>
        </div>
    </div>
    
    <div className="relative z-10">
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">{label}</p>
        <div className="flex items-end space-x-3">
            <h3 className="text-5xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{value}</h3>
            {trend && <span className="text-green-500 text-xs font-bold pb-1 flex items-center bg-green-500/10 px-2 py-0.5 rounded-full mb-1"><Zap size={10} className="mr-1"/> {trend}</span>}
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const isClient = currentUser?.role === 'client';
  const relevantPlots = isClient ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;

  const recentActivity = useMemo(() => {
    const combined = [
        ...trialRecords.map(r => ({ id: r.id, type: 'monitoreo', plotId: r.plotId, date: r.date, label: r.stage, user: r.createdByName || 'Técnico' })),
        ...logs.map(l => ({ id: l.id, type: 'nota', plotId: l.plotId, date: l.date, label: 'Nota Técnica', user: 'Operativo' }))
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
        doc.setFillColor(15, 23, 42); // Navy Dark
        doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text("HEMPC CORE INTELLIGENCE", 15, 25);
        doc.setFontSize(10);
        doc.text(`REPORTE INDUSTRIAL - GENERADO: ${timestamp}`, 15, 38);
        
        const tableData = relevantPlots.filter(p => selectedProjectId === 'all' || p.projectId === selectedProjectId).map(p => {
            const latest = getLatestRecord(p.id);
            return [p.name, varieties.find(v => v.id === p.varietyId)?.name || 'S/D', locations.find(l => l.id === p.locationId)?.name || 'S/D', latest?.stage || 'S/D', latest?.yield ? `${latest.yield} kg/ha` : 'N/A'];
        });

        autoTable(doc, {
            startY: 60,
            head: [['LOTE', 'GENÉTICA', 'STABLECIMIENTO', 'ETAPA ACTUAL', 'RINDES']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' }
        });

        doc.save(`HempC_Intelligence_v4_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowReportModal(false);
    } catch (e) { alert("Error al generar reporte técnico."); } finally { setReportGenerating(false); }
  };

  return (
    <div className="space-y-16">
      
      {/* BRAND HEADER 4.0 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-4">
                <div className="bg-purple-600/20 text-purple-600 dark:text-purple-400 p-2 rounded-xl border border-purple-500/20 shadow-xl shadow-purple-500/5">
                    <Sparkles size={20} className="animate-pulse"/>
                </div>
                <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.6em]">Neural Agrotechnology v4.0</span>
            </div>
            <h1 className="text-7xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-[0.85]">
                Sistema Inteligente <br /><span className="text-hemp-600 italic">de Siembra</span>
            </h1>
            <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                Control y visualización de datos industriales para la red nacional de ensayos de Cáñamo Industrial.
            </p>
        </div>
        
        <div className="flex items-center space-x-4 bg-white dark:bg-[#0a0f1d] p-3 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-2xl">
            <button onClick={() => setShowReportModal(true)} className="flex items-center px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-hemp-600 transition-all border border-transparent hover:border-hemp-500/20 rounded-2xl group">
                <Printer size={18} className="mr-3 group-hover:scale-110 transition-transform" /> Reporte Global
            </button>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
            <Link to="/advisor" className="px-8 py-4 bg-hemp-600 hover:bg-hemp-700 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-2xl shadow-hemp-900/30 flex items-center transition-all hover:scale-[1.02] active:scale-95">
                <Bot size={20} className="mr-3" /> Consultar HempAI
            </Link>
        </div>
      </div>

      {/* KPI GRID - EXPANDABLE SYSTEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <TechKPI label="Parcelas en Red" value={relevantPlots.filter(p => p.status === 'Activa').length} icon={Activity} colorClass="bg-hemp-600" onClick={() => setExpandedCard('plots')} trend="+4" />
        <TechKPI label="Establecimientos" value={locations.length} icon={Globe} colorClass="bg-blue-600" onClick={() => setExpandedCard('locations')} />
        <TechKPI label="Genéticas Cert." value={varieties.length} icon={Sprout} colorClass="bg-purple-600" onClick={() => setExpandedCard('varieties')} />
        <TechKPI label="Integridad Nodo" value="100%" icon={ShieldCheck} colorClass="bg-amber-600" onClick={() => setExpandedCard('integrity')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* ANALYTICS BLOCK */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0a0f1d] p-12 rounded-[56px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-14 relative z-10">
              <div>
                  <h2 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">Performance Histórica</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold tracking-[0.4em] uppercase flex items-center">
                    <Database size={12} className="mr-2 text-hemp-600"/> Rendimientos Kg/Ha por Genética
                  </p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 group-hover:rotate-12 transition-all duration-700">
                  <ExternalLink size={32} className="text-hemp-600"/>
              </div>
          </div>
          
          <div className="h-[420px] relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#e2e8f0" className="dark:opacity-[0.03]" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: '900'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(22,163,74,0.05)'}} 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '24px', color: '#fff', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
                  />
                  <Bar dataKey="yield" radius={[12, 12, 0, 0]} barSize={54}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#2563eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-800">
                <History size={100} className="mb-8 opacity-20" />
                <p className="text-[12px] font-black uppercase tracking-[0.5em]">Nodo local sin datos históricos</p>
              </div>
            )}
          </div>
        </div>

        {/* REAL-TIME MONITOR */}
        <div className="bg-white dark:bg-[#0a0f1d] p-12 rounded-[56px] border border-slate-200 dark:border-white/5 shadow-sm flex flex-col group">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">Monitor</h2>
                    <p className="text-[11px] text-blue-500 font-bold uppercase tracking-[0.2em] flex items-center">
                        <Radio size={12} className="mr-2 animate-pulse"/> Actividad Operativa
                    </p>
                </div>
            </div>
            
            <div className="flex-1 space-y-8 overflow-y-auto pr-3 custom-scrollbar">
                {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                    <div key={idx} className="flex items-start space-x-6 group/item p-5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[32px] transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5">
                        <div className={`mt-2 w-3 h-3 rounded-full flex-shrink-0 ${act.type === 'monitoreo' ? 'bg-hemp-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.6)]'} group-hover/item:scale-150 transition-transform duration-500`}></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${act.type === 'monitoreo' ? 'text-hemp-600' : 'text-blue-600'}`}>{act.label}</span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center"><Clock size={10} className="mr-1.5"/> {act.date}</span>
                            </div>
                            <p className="text-base font-black text-slate-800 dark:text-slate-200 truncate">{plots.find(p => p.id === act.plotId)?.name || 'Evento Global'}</p>
                            <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center bg-slate-100 dark:bg-white/5 w-fit px-3 py-1 rounded-full"><Users size={12} className="mr-2 opacity-50"/> {act.user}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-32 opacity-20">
                        <Activity size={72} className="mx-auto text-slate-400 mb-6"/>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Telemetry Standby</p>
                    </div>
                )}
            </div>

            <Link to="/plots" className="mt-12 group flex items-center justify-center w-full py-6 bg-slate-900 dark:bg-hemp-600 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.4em] hover:shadow-3xl transition-all shadow-2xl shadow-slate-900/20 dark:shadow-hemp-900/30 hover:scale-[1.01] active:scale-95">
                Acceder a Planilla Global <ChevronRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform duration-500"/>
            </Link>
        </div>
      </div>

      {/* EXPANDED KPI MODAL - HIGH FIDELITY UI */}
      {expandedCard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-white dark:bg-[#0a0f1d] rounded-[64px] shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10">
                  <div className="px-12 py-10 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                      <h3 className="text-slate-800 dark:text-white font-black flex items-center text-xs uppercase tracking-[0.4em]">
                          <Maximize2 className="mr-5 text-hemp-600" size={28} /> Detalle Técnico: {expandedCard.toUpperCase()}
                      </h3>
                      <button onClick={() => setExpandedCard(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all p-4 bg-white dark:bg-white/5 rounded-full shadow-lg border dark:border-white/10 hover:rotate-90"><X size={32} /></button>
                  </div>
                  <div className="p-16">
                      {expandedCard === 'plots' && (
                          <div className="space-y-8">
                              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-10 font-medium">Estado consolidado de la red nacional. Actualmente el núcleo supervisa {relevantPlots.length} unidades industriales de alto rendimiento.</p>
                              <div className="grid grid-cols-1 gap-5">
                                  {relevantPlots.slice(0, 6).map(p => (
                                      <div key={p.id} className="flex justify-between items-center p-6 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 group hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer" onClick={() => navigate(`/plots/${p.id}`)}>
                                          <div className="font-black text-slate-800 dark:text-white flex items-center text-lg"><Sprout size={20} className="mr-4 text-hemp-600"/> {p.name}</div>
                                          <div className="text-[11px] font-black text-hemp-600 uppercase bg-hemp-50 dark:bg-hemp-900/40 px-4 py-2 rounded-full border border-hemp-200 dark:border-hemp-700/30">{p.status}</div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/plots')} className="w-full mt-10 py-6 bg-slate-100 dark:bg-white/5 rounded-[24px] text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10">Ver Historial Operativo Completo</button>
                          </div>
                      )}
                      {expandedCard === 'varieties' && (
                          <div className="space-y-8">
                              <p className="text-base text-slate-500 dark:text-slate-400 mb-10 font-medium">Banco de germoplasma certificado. Contamos con {varieties.length} genéticas registradas para usos de fibra, grano y medicinales.</p>
                              <div className="grid grid-cols-2 gap-6">
                                  {varieties.slice(0, 4).map(v => (
                                      <div key={v.id} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[40px] border border-slate-100 dark:border-white/5 hover:border-purple-500/30 transition-colors">
                                          <div className="font-black text-slate-800 dark:text-white mb-3 text-xl">{v.name}</div>
                                          <div className="text-[10px] text-hemp-600 uppercase font-black tracking-[0.2em] bg-hemp-50 dark:bg-hemp-900/20 w-fit px-3 py-1 rounded-lg">{v.usage}</div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/varieties')} className="w-full mt-10 py-6 bg-slate-100 dark:bg-white/5 rounded-[24px] text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-all">Catálogo Genético Global</button>
                          </div>
                      )}
                      {expandedCard === 'locations' && (
                          <div className="space-y-8">
                              <p className="text-base text-slate-500 dark:text-slate-400 mb-10 font-medium">Red geográfica de nodos productivos. {locations.length} establecimientos activos sincronizados con el núcleo central.</p>
                              <div className="space-y-5">
                                  {locations.slice(0, 4).map(l => (
                                      <div key={l.id} className="flex items-center p-6 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 group hover:border-blue-500/30 transition-colors">
                                          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mr-6 text-blue-600 group-hover:scale-110 transition-transform"><MapPin size={24}/></div>
                                          <div>
                                              <div className="font-black text-slate-800 dark:text-white text-xl">{l.name}</div>
                                              <div className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.1em]">{l.province}, ARG</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/locations')} className="w-full mt-10 py-6 bg-slate-100 dark:bg-white/5 rounded-[24px] text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-all">Explorar Mapa de Nodos</button>
                          </div>
                      )}
                      {expandedCard === 'integrity' && (
                          <div className="text-center py-16">
                              <div className="relative inline-block mb-12">
                                  <div className="absolute inset-0 bg-hemp-500 blur-[80px] opacity-20 animate-pulse"></div>
                                  <ShieldCheck size={120} className="relative z-10 text-hemp-600 mx-auto drop-shadow-2xl"/>
                              </div>
                              <h4 className="text-3xl font-black text-slate-800 dark:text-white uppercase mb-6 tracking-tighter">Certificación de Datos</h4>
                              <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto font-medium">La red está operando bajo estándares de integridad HempC. Todas las transacciones de campo están auditadas por hash y ID único de operario.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* REPORT MODAL - PREMIUM DESIGN */}
      {showReportModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-[#0a0f1d] rounded-[64px] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95">
                  <div className="px-12 py-10 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                      <h3 className="text-slate-800 dark:text-white font-black flex items-center text-xs uppercase tracking-[0.4em]">
                          <FileText className="mr-4 text-hemp-500" size={28} /> Compilador v4.0
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all p-3 bg-white dark:bg-white/5 rounded-full border dark:border-white/10 hover:rotate-90"><X size={32} /></button>
                  </div>
                  
                  <div className="p-16 space-y-12">
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 p-8 rounded-[40px] text-blue-700 dark:text-blue-300 text-sm leading-relaxed flex items-start">
                          <Info className="mr-5 flex-shrink-0 text-blue-500" size={24}/>
                          <p className="font-medium">Esta operación compilará todos los KPIs, telemetría de rinde y estados fenológicos en un activo digital inmutable.</p>
                      </div>

                      <div>
                          <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.5em] mb-5 ml-2">Jurisdicción de Datos</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white p-6 rounded-[24px] focus:ring-4 focus:ring-hemp-500/20 outline-none font-black text-sm transition-all appearance-none cursor-pointer"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                          >
                              <option value="all">Consolidado Nacional (Maestro)</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>

                      <button 
                        onClick={generatePDF}
                        disabled={reportGenerating}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-7 rounded-[32px] font-black text-xs uppercase tracking-[0.5em] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                      >
                          {reportGenerating ? <Loader2 className="animate-spin mr-4" size={24}/> : <Download className="mr-4" size={24}/>}
                          {reportGenerating ? 'Cifrando...' : 'Compilar PDF Industrial'}
                      </button>
                      
                      <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.5em]">HempC Core Logic Unit</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
