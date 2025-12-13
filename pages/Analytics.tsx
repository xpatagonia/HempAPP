
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2, ArrowLeftRight, Scale, Ruler, Sprout } from 'lucide-react';

export default function Analytics() {
  const { varieties, plots, getLatestRecord, suppliers } = useAppContext();

  // Selection State
  const [varietyAId, setVarietyAId] = useState<string>(varieties[0]?.id || '');
  const [varietyBId, setVarietyBId] = useState<string>(varieties[1]?.id || '');

  const varietyA = varieties.find(v => v.id === varietyAId);
  const varietyB = varieties.find(v => v.id === varietyBId);

  const supplierA = suppliers.find(s => s.id === varietyA?.supplierId);
  const supplierB = suppliers.find(s => s.id === varietyB?.supplierId);

  // Helper to aggregate data for a specific variety
  const getVarietyStats = (varId: string) => {
      const varPlots = plots.filter(p => p.varietyId === varId);
      
      let totalHeight = 0;
      let heightCount = 0;
      let totalYield = 0;
      let yieldCount = 0;
      let totalLeaf = 0;
      let leafCount = 0;

      varPlots.forEach(p => {
          const r = getLatestRecord(p.id);
          if (r) {
              if (r.plantHeight) { totalHeight += r.plantHeight; heightCount++; }
              if (r.yield) { totalYield += r.yield; yieldCount++; }
              if (r.leafWeight) { totalLeaf += r.leafWeight; leafCount++; }
          }
      });

      return {
          avgHeight: heightCount > 0 ? Math.round(totalHeight / heightCount) : 0,
          avgYield: yieldCount > 0 ? Math.round(totalYield / yieldCount) : 0,
          avgLeaf: leafCount > 0 ? Number((totalLeaf / leafCount).toFixed(1)) : 0,
          plotCount: varPlots.length
      };
  };

  const statsA = getVarietyStats(varietyAId);
  const statsB = getVarietyStats(varietyBId);

  // Chart Data Preparation
  const yieldData = [
      { name: varietyA?.name || 'Var A', yield: statsA.avgYield, fill: '#16a34a' },
      { name: varietyB?.name || 'Var B', yield: statsB.avgYield, fill: '#0891b2' }
  ];

  const heightData = [
      { name: varietyA?.name || 'Var A', height: statsA.avgHeight, fill: '#16a34a' },
      { name: varietyB?.name || 'Var B', height: statsB.avgHeight, fill: '#0891b2' }
  ];
  
  // Specific Metric requested: Leaf Weight (Biomasa Foliar)
  const leafData = [
      { name: varietyA?.name || 'Var A', weight: statsA.avgLeaf, fill: '#16a34a' },
      { name: varietyB?.name || 'Var B', weight: statsB.avgLeaf, fill: '#0891b2' }
  ];

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center mb-4">
        <BarChart2 className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Análisis Comparativo</h1>
            <p className="text-gray-500">Compara el rendimiento agronómico entre variedades.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variedad A (Referencia)</label>
              <select className={inputClass} value={varietyAId} onChange={e => setVarietyAId(e.target.value)}>
                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
          </div>
          <div className="flex justify-center pb-2 text-gray-400">
              <ArrowLeftRight size={24} />
          </div>
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variedad B (Desafiante)</label>
              <select className={inputClass} value={varietyBId} onChange={e => setVarietyBId(e.target.value)}>
                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
          </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Yield Chart */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Sprout size={18} className="mr-2 text-hemp-600"/> Rendimiento Grano (kg/ha)
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yieldData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="yield" radius={[4, 4, 0, 0]} barSize={50} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-center border-t pt-2">
                  <div>
                      <span className="text-xs text-gray-500">{varietyA?.name}</span>
                      <p className="font-bold text-lg">{statsA.avgYield || '-'} kg</p>
                  </div>
                  <div>
                      <span className="text-xs text-gray-500">{varietyB?.name}</span>
                      <p className="font-bold text-lg">{statsB.avgYield || '-'} kg</p>
                  </div>
              </div>
          </div>

          {/* Leaf Weight Chart (Requested Feature) */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Scale size={18} className="mr-2 text-purple-600"/> Peso Hoja / Biomasa (g/pl)
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leafData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="weight" radius={[4, 4, 0, 0]} barSize={50} fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-center border-t pt-2">
                  <div>
                      <span className="text-xs text-gray-500">{varietyA?.name}</span>
                      <p className="font-bold text-lg">{statsA.avgLeaf || '-'} g</p>
                  </div>
                  <div>
                      <span className="text-xs text-gray-500">{varietyB?.name}</span>
                      <p className="font-bold text-lg">{statsB.avgLeaf || '-'} g</p>
                  </div>
              </div>
          </div>

          {/* Height Chart */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Ruler size={18} className="mr-2 text-blue-600"/> Altura de Planta (cm)
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heightData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="height" radius={[4, 4, 0, 0]} barSize={50} fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-center border-t pt-2">
                  <div>
                      <span className="text-xs text-gray-500">{varietyA?.name}</span>
                      <p className="font-bold text-lg">{statsA.avgHeight || '-'} cm</p>
                  </div>
                  <div>
                      <span className="text-xs text-gray-500">{varietyB?.name}</span>
                      <p className="font-bold text-lg">{statsB.avgHeight || '-'} cm</p>
                  </div>
              </div>
          </div>

      </div>

      {/* Technical Sheet Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800">
              Ficha Técnica Comparada
          </div>
          <table className="min-w-full text-sm">
              <thead className="bg-white">
                  <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 w-1/3">Característica</th>
                      <th className="px-6 py-3 text-center font-bold text-gray-800 w-1/3">{varietyA?.name}</th>
                      <th className="px-6 py-3 text-center font-bold text-gray-800 w-1/3">{varietyB?.name}</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  <tr>
                      <td className="px-6 py-3 font-medium text-gray-600">Origen / Proveedor</td>
                      <td className="px-6 py-3 text-center text-gray-700">{supplierA?.name || '-'}</td>
                      <td className="px-6 py-3 text-center text-gray-700">{supplierB?.name || '-'}</td>
                  </tr>
                  <tr className="bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-600">Uso Principal</td>
                      <td className="px-6 py-3 text-center">
                          <span className="px-2 py-1 rounded-full bg-white border text-xs">{varietyA?.usage}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                          <span className="px-2 py-1 rounded-full bg-white border text-xs">{varietyB?.usage}</span>
                      </td>
                  </tr>
                  <tr>
                      <td className="px-6 py-3 font-medium text-gray-600">Ciclo (Días)</td>
                      <td className="px-6 py-3 text-center text-gray-700">{varietyA?.cycleDays} días</td>
                      <td className="px-6 py-3 text-center text-gray-700">{varietyB?.cycleDays} días</td>
                  </tr>
                  <tr className="bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-600">THC Esperado</td>
                      <td className="px-6 py-3 text-center text-gray-700">{varietyA?.expectedThc}%</td>
                      <td className="px-6 py-3 text-center text-gray-700">{varietyB?.expectedThc}%</td>
                  </tr>
                  <tr>
                      <td className="px-6 py-3 font-medium text-gray-600">Parcelas Evaluadas (n)</td>
                      <td className="px-6 py-3 text-center text-gray-700">{statsA.plotCount}</td>
                      <td className="px-6 py-3 text-center text-gray-700">{statsB.plotCount}</td>
                  </tr>
              </tbody>
          </table>
      </div>
    </div>
  );
}
