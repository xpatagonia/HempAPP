
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Sprout, Activity, FileText, ArrowRight, 
  Users, Printer, X, 
  Sparkles, Globe, Database, History, 
  Download, Loader2, Radio, ShieldCheck, Clock, Info, ChevronRight, Maximize2,
  Bot, MapPin, Zap
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TechKPI = ({ label, value, icon: Icon, colorClass, status, trend, onClick }: any) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-[#0a0f1d] p-7 rounded-[32px] border border-slate-200 dark:border-white/5 flex flex-col justify-between hover:border-hemp-500/50 dark:hover:border-hemp-500/30 transition-all group relative overflow-hidden text-left w-full shadow-sm hover:shadow-2xl hover:-translate-y-1"
  >
    <div className={`absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br ${colorClass.includes('green') ? 'from-green-500/5' : 'from-blue-500/5'} to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    
    <div className="flex items-center justify-between mb-5 relative z-10">
        <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 text-white shadow-inner transition-transform group-hover:scale-110`}>
             <Icon size={28} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-white/5 p-2 rounded-full">
            <Maximize2 size={14} className="text-slate-400" />
        </div>
    </div>
    
    <div className="relative z-10">
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
        <div className="flex items-end space-x-3">
            <h3 className="text-4xl font-black text-slate-800 dark:text-white leading-none tracking-tighter">{value}</h3>
            {trend && <span className="text-green-500 text-[10px] font-bold pb-1 flex items-center"><Zap size={10} className="mr-0.5"/> {trend}</span>}
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
        ...logs.map(l => ({ id: l.id, type: 'nota', plotId: l.plotId, date: l.date, label: 'Nota de Campo', user: 'Operativo' }))
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
        doc.text(`REPORTE DE INTELIGENCIA - ${timestamp}`, 140, 25);
        
        const tableData = relevantPlots.filter(p => selectedProjectId === 'all' || p.projectId === selectedProjectId).map(p => {
            const latest = getLatestRecord(p.id);
            return [p.name, varieties.find(v => v.id === p.varietyId)?.name || 'S/D', locations.find(l => l.id === p.locationId)?.name || 'S/D', latest?.stage || 'S/D', latest?.yield ? `${latest.yield} kg/ha` : 'N/A'];
        });

        autoTable(doc, {
            startY: 50,
            head: [['UNIDAD', 'GENÉTICA', 'ESTABLECIMIENTO', 'ETAPA ACTUAL', 'RENDIMIENTO']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' }
        });

        doc.save(`HempC_Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowReportModal(false);
    } catch (e) { alert("Error al generar el reporte PDF."); } finally { setReportGenerating(false); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* BRAND HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <div className="flex items-center space-x-3 mb-3">
                <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-1.5 rounded-lg border border-purple-500/20">
                    <Sparkles size={16} className="animate-pulse"/>
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.5em]">Global Control Center</span>
            </div>
            <h1 className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-[0.9]">
                Sistema Inteligente <br /><span className="text-hemp-600">de Siembra</span>
            </h1>
        </div>
        
        <div className="flex items-center space-x-3 bg-white dark:bg-[#0a0f1d] p-2.5 rounded-[24px] border border-slate-200 dark:border-white/5 shadow-xl">
            <button onClick={() => setShowReportModal(true)} className="flex items-center px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-hemp-600 transition group border border-transparent hover:border-hemp-500/20 rounded-2xl">
                <Printer size={16} className="mr-2 group-hover:scale-110 transition-transform" /> Exportar Datos
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
            <Link to="/advisor" className="px-6 py-3 bg-hemp-600 hover:bg-hemp-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-hemp-900/20 flex items-center transition-all">
                <Bot size={18} className="mr-2" /> Consultar HempAI
            </Link>
        </div>
      </div>

      {/* KPI GRID - INTERACTIVE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TechKPI label="Unidades en Producción" value={relevantPlots.filter(p => p.status === 'Activa').length} icon={Activity} colorClass="bg-hemp-600" onClick={() => setExpandedCard('plots')} trend="+3" />
        <TechKPI label="Red de Establecimientos" value={locations.length} icon={Globe} colorClass="bg-blue-600" onClick={() => setExpandedCard('locations')} />
        <TechKPI label="Lotes Genéticos" value={varieties.length} icon={Sprout} colorClass="bg-purple-600" onClick={() => setExpandedCard('varieties')} />
        <TechKPI label="Fiabilidad del Nodo" value="99.8%" icon={ShieldCheck} colorClass="bg-amber-600" onClick={() => setExpandedCard('integrity')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* ANALYTICS BLOCK */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0a0f1d] p-10 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">Rendimientos Proyectados</h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-[0.3em] uppercase">Kg/Ha por Variedad Registrada</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 group-hover:rotate-12 transition-transform">
                  <Database size={28} className="text-hemp-600"/>
              </div>
          </div>
          
          <div className="h-[380px] relative z-10">
            {yieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#e2e8f0" className="dark:opacity-[0.03]" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: '900'}} axisLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(22,163,74,0.05)'}} 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
                  />
                  <Bar dataKey="yield" radius={[8, 8, 0, 0]} barSize={45}>
                    {yieldData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#16a34a' : '#2563eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-800">
                <History size={80} className="mb-6 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">Sin telemetría de cosecha</p>
              </div>
            )}
          </div>
        </div>

        {/* FEED MONITOR BLOCK */}
        <div className="bg-white dark:bg-[#0a0f1d] p-10 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-sm flex flex-col group">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">Monitor</h2>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Actividad Técnica</p>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 animate-pulse"></div>
                    <Radio size={24} className="text-blue-500 relative z-10" />
                </div>
            </div>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                    <div key={idx} className="flex items-start space-x-5 group/item p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[24px] transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5">
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${act.type === 'monitoreo' ? 'bg-hemp-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]'} group-hover/item:scale-125 transition-transform`}></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${act.type === 'monitoreo' ? 'text-hemp-600' : 'text-blue-600'}`}>{act.label}</span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center"><Clock size={10} className="mr-1"/> {act.date}</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{plots.find(p => p.id === act.plotId)?.name || 'Evento Global'}</p>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center"><Users size={12} className="mr-1.5 opacity-50"/> {act.user}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-24 opacity-20">
                        <Activity size={56} className="mx-auto text-slate-400 mb-4"/>
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin transacciones registradas</p>
                    </div>
                )}
            </div>

            <Link to="/plots" className="mt-10 group flex items-center justify-center w-full py-5 bg-slate-900 dark:bg-hemp-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:shadow-2xl transition-all shadow-xl shadow-slate-900/10 dark:shadow-hemp-900/20">
                Ver Planilla Global <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform"/>
            </Link>
        </div>
      </div>

      {/* EXPANDED KPI MODAL */}
      {expandedCard && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
              <div className="bg-white dark:bg-[#0a0f1d] rounded-[48px] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10">
                  <div className="px-10 py-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                      <h3 className="text-slate-800 dark:text-white font-black flex items-center text-xs uppercase tracking-[0.3em]">
                          <Maximize2 className="mr-4 text-hemp-600" size={24} /> Desglose Técnico: {expandedCard.toUpperCase()}
                      </h3>
                      <button onClick={() => setExpandedCard(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-3 bg-white dark:bg-white/5 rounded-full shadow-sm"><X size={28} /></button>
                  </div>
                  <div className="p-12">
                      {expandedCard === 'plots' && (
                          <div className="space-y-6">
                              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8 font-medium">Estado de la red operativa. Actualmente el sistema supervisa {relevantPlots.length} unidades industriales de ensayo y producción.</p>
                              <div className="grid grid-cols-1 gap-4">
                                  {relevantPlots.slice(0, 6).map(p => (
                                      <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border dark:border-white/5 group hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer" onClick={() => navigate(`/plots/${p.id}`)}>
                                          <div className="font-black text-slate-800 dark:text-white flex items-center"><Sprout size={16} className="mr-3 text-hemp-600"/> {p.name}</div>
                                          <div className="text-[10px] font-black text-hemp-600 uppercase bg-hemp-50 dark:bg-hemp-900/40 px-3 py-1.5 rounded-full">{p.status}</div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/plots')} className="w-full mt-8 py-5 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/10">Gestión Integral de Lotes</button>
                          </div>
                      )}
                      {expandedCard === 'varieties' && (
                          <div className="space-y-6">
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Banco genético autorizado. Contamos con {varieties.length} variedades certificadas para fibra, grano y medicina.</p>
                              <div className="grid grid-cols-2 gap-5">
                                  {varieties.slice(0, 4).map(v => (
                                      <div key={v.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border dark:border-white/5">
                                          <div className="font-black text-slate-800 dark:text-white mb-2 text-lg">{v.name}</div>
                                          <div className="text-[10px] text-hemp-600 uppercase font-black tracking-widest">{v.usage}</div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/varieties')} className="w-full mt-8 py-5 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/10">Explorar Catálogo Genético</button>
                          </div>
                      )}
                      {expandedCard === 'locations' && (
                          <div className="space-y-6">
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Nodos geográficos activos en la red nacional. Total: {locations.length} establecimientos sincronizados.</p>
                              <div className="space-y-4">
                                  {locations.slice(0, 4).map(l => (
                                      <div key={l.id} className="flex items-center p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border dark:border-white/5">
                                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mr-5 text-blue-600"><MapPin size={20}/></div>
                                          <div>
                                              <div className="font-black text-slate-800 dark:text-white text-lg">{l.name}</div>
                                              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{l.province}, Argentina</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <button onClick={() => navigate('/locations')} className="w-full mt-8 py-5 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/10">Ver Mapa de Red</button>
                          </div>
                      )}
                      {expandedCard === 'integrity' && (
                          <div className="text-center py-10">
                              <div className="relative inline-block mb-10">
                                  <div className="absolute inset-0 bg-hemp-500 blur-2xl opacity-20 animate-pulse"></div>
                                  <ShieldCheck size={100} className="relative z-10 text-hemp-600 mx-auto"/>
                              </div>
                              <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase mb-4 tracking-tighter">Datos Certificados</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto font-medium">La integridad de la red está verificada por HempC Core Logic. Todas las transacciones de campo están auditadas y cifradas en el nodo principal.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* REPORT GENERATOR MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-[#0a0f1d] rounded-[48px] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95">
                  <div className="px-10 py-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                      <h3 className="text-slate-800 dark:text-white font-black flex items-center text-xs uppercase tracking-[0.3em]">
                          <FileText className="mr-3 text-hemp-500" size={24} /> Engine v4.0 Reports
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-3 bg-white dark:bg-white/5 rounded-full"><X size={28} /></button>
                  </div>
                  
                  <div className="p-12 space-y-10">
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-6 rounded-3xl text-blue-700 dark:text-blue-300 text-[12px] leading-relaxed flex items-start">
                          <Info className="mr-4 flex-shrink-0 text-blue-500" size={20}/>
                          <p className="font-medium">Esta operación compilará toda la inteligencia agrónoma en un documento inmutable PDF.</p>
                      </div>

                      <div>
                          <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">Alcance Geográfico</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white p-5 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none font-black text-sm transition-all"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                          >
                              <option value="all">Consolidado Nacional (Global)</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>

                      <button 
                        onClick={generatePDF}
                        disabled={reportGenerating}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:shadow-2xl transition-all flex items-center justify-center disabled:opacity-50 shadow-2xl shadow-slate-900/30"
                      >
                          {reportGenerating ? <Loader2 className="animate-spin mr-3" size={20}/> : <Download className="mr-3" size={20}/>}
                          {reportGenerating ? 'Procesando Inteligencia...' : 'Generar PDF Industrial'}
                      </button>
                      
                      <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em]">HempC Intelligence Core Unit</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
