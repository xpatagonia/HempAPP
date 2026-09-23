
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, Cell, Legend
} from 'recharts';
import { 
  BarChart2, ArrowLeftRight, Scale, Ruler, Sprout, 
  Trophy, TrendingUp, Activity, PieChart, Microscope
} from 'lucide-react';

export default function Analytics() {
  const { varieties, plots, getLatestRecord, suppliers } = useAppContext();
  const [activeTab, setActiveTab] = useState<'global' | 'compare'>('global');

  // Selection State for Comparison
  const [varietyAId, setVarietyAId] = useState<string>(varieties[0]?.id || '');
  const [varietyBId, setVarietyBId] = useState<string>(varieties[1]?.id || '');

  // --- DATA PROCESSING ENGINE ---

  // 1. Calculate aggregated stats for ALL varieties
  const globalStats = useMemo(() => {
      return varieties.map(v => {
          const varPlots = plots.filter(p => p.varietyId === v.id);
          let totalYield = 0, yieldCount = 0;
          let totalHeight = 0, heightCount = 0;
          let totalVigor = 0, vigorCount = 0;

          varPlots.forEach(p => {
              const r = getLatestRecord(p.id);
              if (r) {
                  if (r.yield) { totalYield += r.yield; yieldCount++; }
                  if (r.plantHeight) { totalHeight += r.plantHeight; heightCount++; }
                  if (r.vigor) { totalVigor += r.vigor; vigorCount++; }
              }
          });

          return {
              id: v.id,
              name: v.name,
              usage: v.usage,
              avgYield: yieldCount > 0 ? Math.round(totalYield / yieldCount) : 0,
              avgHeight: heightCount > 0 ? Math.round(totalHeight / heightCount) : 0,
              avgVigor: vigorCount > 0 ? Number((totalVigor / vigorCount).toFixed(1)) : 0,
              plotCount: varPlots.length,
              score: (yieldCount * 0.6) + (heightCount * 0.4) // Simple reliability score based on n
          };
      }).filter(s => s.plotCount > 0); // Hide varieties with no data
  }, [varieties, plots, getLatestRecord]);

  // 2. Derive Top Performers
  const topYield = [...globalStats].sort((a,b) => b.avgYield - a.avgYield)[0];
  const topVigor = [...globalStats].sort((a,b) => b.avgVigor - a.avgVigor)[0];
  const mostStable = [...globalStats].sort((a,b) => b.plotCount - a.plotCount)[0];

  // 3. Prepare Chart Data
  const rankingData = [...globalStats].sort((a,b) => b.avgYield - a.avgYield).slice(0, 8); // Top 8
  
  const scatterData = globalStats.map(s => ({
      name: s.name,
      x: s.avgHeight, // Height
      y: s.avgYield,  // Yield
      z: s.plotCount  // Bubble size (reliability)
  }));

  // --- COMPARISON LOGIC ---
  const varietyA = varieties.find(v => v.id === varietyAId);
  const varietyB = varieties.find(v => v.id === varietyBId);
  const supplierA = suppliers.find(s => s.id === varietyA?.supplierId);
  const supplierB = suppliers.find(s => s.id === varietyB?.supplierId);
  
  const statsA = globalStats.find(s => s.id === varietyAId) || { avgYield: 0, avgHeight: 0, avgVigor: 0, plotCount: 0 };
  const statsB = globalStats.find(s => s.id === varietyBId) || { avgYield: 0, avgHeight: 0, avgVigor: 0, plotCount: 0 };

  const compYieldData = [
      { name: varietyA?.name || 'Var A', yield: statsA.avgYield, fill: '#16a34a' },
      { name: varietyB?.name || 'Var B', yield: statsB.avgYield, fill: '#0891b2' }
  ];

  const compHeightData = [
      { name: varietyA?.name || 'Var A', height: statsA.avgHeight, fill: '#16a34a' },
      { name: varietyB?.name || 'Var B', height: statsB.avgHeight, fill: '#0891b2' }
  ];

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all text-sm font-bold";

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic flex items-center">
                <BarChart2 className="mr-3 text-hemp-600" size={32}/> Inteligencia <span className="text-hemp-600">Genética</span>
            </h1>
            <p className="text-sm text-gray-500 font-medium">Análisis de rendimiento poblacional y comparativa directa.</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border dark:border-slate-800 shadow-sm">
            <button onClick={() => setActiveTab('global')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'global' ? 'bg-hemp-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Ranking Global</button>
            <button onClick={() => setActiveTab('compare')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'compare' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Versus (A/B)</button>
        </div>
      </div>

      {activeTab === 'global' && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
              
              {/* TOP PERFORMERS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-4 opacity-80"><Trophy size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Campeón Rinde (Grano)</span></div>
                          <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{topYield?.name || 'S/D'}</h3>
                          <p className="text-sm font-bold opacity-90">{topYield?.avgYield} kg/ha</p>
                      </div>
                      <Sprout className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 rotate-12"/>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-500 to-green-700 p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-4 opacity-80"><Activity size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Mayor Vigor Vegetativo</span></div>
                          <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{topVigor?.name || 'S/D'}</h3>
                          <p className="text-sm font-bold opacity-90">{topVigor?.avgVigor}/9 pts</p>
                      </div>
                      <Microscope className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 rotate-12"/>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-4 opacity-80"><PieChart size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Más Ensayada (Data)</span></div>
                          <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{mostStable?.name || 'S/D'}</h3>
                          <p className="text-sm font-bold opacity-90">{mostStable?.plotCount} Parcelas</p>
                      </div>
                      <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 rotate-12"/>
                  </div>
              </div>

              {/* GLOBAL RANKING CHART */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                  <div className="mb-8">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Ranking de Rendimiento</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comparativa general de kg/ha por variedad</p>
                  </div>
                  <div className="h-[350px] w-full">
                      {rankingData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rankingData} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', backgroundColor: '#fff', color: '#0f172a' }}
                                    cursor={{fill: '#f1f5f9', opacity: 0.5}}
                                />
                                <Bar dataKey="avgYield" radius={[0, 8, 8, 0]} barSize={24}>
                                    {rankingData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#10b981' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                              <BarChart2 size={48} className="mb-2"/>
                              <p className="text-xs font-black uppercase">Sin datos suficientes</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* SCATTER PLOT: HEIGHT VS YIELD */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
                  <div className="mb-8">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Matriz de Eficiencia</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correlación: Altura (Eje X) vs Rendimiento (Eje Y)</p>
                  </div>
                  <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{top: 20, right: 20, bottom: 20, left: 20}}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis type="number" dataKey="x" name="Altura" unit="cm" tick={{fontSize: 10}} label={{ value: 'Altura (cm)', position: 'bottom', offset: 0, fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis type="number" dataKey="y" name="Rinde" unit="kg" tick={{fontSize: 10}} label={{ value: 'Rinde (kg)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                              <ZAxis type="number" dataKey="z" range={[60, 400]} name="Parcelas" unit="u" />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                              <Scatter name="Genéticas" data={scatterData} fill="#8884d8">
                                  {scatterData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'][index % 6]} />
                                  ))}
                              </Scatter>
                              <Legend wrapperStyle={{fontSize: '10px', paddingTop: '20px'}} />
                          </ScatterChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-[10px] text-blue-700 dark:text-blue-300 font-medium text-center">
                      * El tamaño de la burbuja indica la cantidad de parcelas evaluadas (confiabilidad del dato).
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'compare' && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
              {/* SELECTORS */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Variedad Referencia (A)</label>
                      <select className={inputClass} value={varietyAId} onChange={e => setVarietyAId(e.target.value)}>
                          {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                  </div>
                  <div className="flex justify-center pb-3 text-slate-300">
                      <ArrowLeftRight size={32} />
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Variedad Desafiante (B)</label>
                      <select className={inputClass} value={varietyBId} onChange={e => setVarietyBId(e.target.value)}>
                          {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                  </div>
              </div>

              {/* COMPARISON CHARTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Yield Chart */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border dark:border-slate-800">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mb-6 flex items-center uppercase tracking-widest">
                          <Sprout size={18} className="mr-2 text-hemp-600"/> Rendimiento Grano (kg/ha)
                      </h3>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compYieldData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}} />
                                <Bar dataKey="yield" radius={[8, 8, 0, 0]} barSize={60}>
                                   {compYieldData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-6 text-center border-t dark:border-slate-800 pt-4">
                          <div><span className="text-[9px] font-black uppercase text-slate-400">{varietyA?.name}</span><p className="font-black text-2xl dark:text-white">{statsA.avgYield || '-'} <span className="text-xs text-slate-400">kg</span></p></div>
                          <div><span className="text-[9px] font-black uppercase text-slate-400">{varietyB?.name}</span><p className="font-black text-2xl dark:text-white">{statsB.avgYield || '-'} <span className="text-xs text-slate-400">kg</span></p></div>
                      </div>
                  </div>

                  {/* Height Chart */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border dark:border-slate-800">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mb-6 flex items-center uppercase tracking-widest">
                          <Ruler size={18} className="mr-2 text-blue-600"/> Altura de Planta (cm)
                      </h3>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compHeightData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}} />
                                <Bar dataKey="height" radius={[8, 8, 0, 0]} barSize={60}>
                                   {compHeightData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-6 text-center border-t dark:border-slate-800 pt-4">
                          <div><span className="text-[9px] font-black uppercase text-slate-400">{varietyA?.name}</span><p className="font-black text-2xl dark:text-white">{statsA.avgHeight || '-'} <span className="text-xs text-slate-400">cm</span></p></div>
                          <div><span className="text-[9px] font-black uppercase text-slate-400">{varietyB?.name}</span><p className="font-black text-2xl dark:text-white">{statsB.avgHeight || '-'} <span className="text-xs text-slate-400">cm</span></p></div>
                      </div>
                  </div>
              </div>

              {/* TECHNICAL SHEET */}
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden mt-8">
                  <div className="px-8 py-6 bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800 font-black text-slate-800 dark:text-white text-xs uppercase tracking-widest">
                      Ficha Técnica Comparada
                  </div>
                  <table className="min-w-full text-sm">
                      <thead className="bg-white dark:bg-slate-900">
                          <tr>
                              <th className="px-8 py-4 text-left font-bold text-slate-400 uppercase text-[9px] tracking-widest w-1/3">Característica</th>
                              <th className="px-8 py-4 text-center font-black text-hemp-600 uppercase text-xs w-1/3">{varietyA?.name}</th>
                              <th className="px-8 py-4 text-center font-black text-blue-600 uppercase text-xs w-1/3">{varietyB?.name}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr>
                              <td className="px-8 py-4 font-bold text-slate-600 dark:text-slate-400">Origen / Proveedor</td>
                              <td className="px-8 py-4 text-center text-slate-700 dark:text-slate-300 text-xs">{supplierA?.name || '-'}</td>
                              <td className="px-8 py-4 text-center text-slate-700 dark:text-slate-300 text-xs">{supplierB?.name || '-'}</td>
                          </tr>
                          <tr className="bg-slate-50/50 dark:bg-slate-950/30">
                              <td className="px-8 py-4 font-bold text-slate-600 dark:text-slate-400">Uso Principal</td>
                              <td className="px-8 py-4 text-center"><span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 text-[10px] font-black uppercase">{varietyA?.usage}</span></td>
                              <td className="px-8 py-4 text-center"><span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border dark:border-slate-700 text-[10px] font-black uppercase">{varietyB?.usage}</span></td>
                          </tr>
                          <tr>
                              <td className="px-8 py-4 font-bold text-slate-600 dark:text-slate-400">Ciclo (Días)</td>
                              <td className="px-8 py-4 text-center text-slate-700 dark:text-slate-300 font-mono font-bold">{varietyA?.cycleDays} días</td>
                              <td className="px-8 py-4 text-center text-slate-700 dark:text-slate-300 font-mono font-bold">{varietyB?.cycleDays} días</td>
                          </tr>
                          <tr className="bg-slate-50/50 dark:bg-slate-950/30">
                              <td className="px-8 py-4 font-bold text-slate-600 dark:text-slate-400">Parcelas Evaluadas (n)</td>
                              <td className="px-8 py-4 text-center text-slate-700 dark:text-slate-300 font-black">{statsA.plotCount}</td>
                              <td className="px-8 py-4 text-center text-slate-700 dark:text-slate-300 font-black">{statsB.plotCount}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
}
