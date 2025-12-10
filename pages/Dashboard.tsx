
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Sprout, MapPin, Activity, CheckCircle, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color} text-white`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

export default function Dashboard() {
  const { varieties, locations, plots, getLatestRecord } = useAppContext();

  // 1. Calculate Average Yield by Variety (Using latest data)
  const yieldDataMap = new Map<string, { totalYield: number; count: number }>();

  plots.forEach(plot => {
    const latestData = getLatestRecord(plot.id);
    // Only consider data with actual yield values
    if (!latestData || !latestData.yield || latestData.yield <= 0) return;

    const variety = varieties.find(v => v.id === plot.varietyId);
    if (variety) {
      const current = yieldDataMap.get(variety.name) || { totalYield: 0, count: 0 };
      yieldDataMap.set(variety.name, {
        totalYield: current.totalYield + latestData.yield,
        count: current.count + 1
      });
    }
  });

  const chartData = Array.from(yieldDataMap.entries()).map(([name, data]) => ({
    name,
    yield: Math.round(data.totalYield / data.count)
  }));

  // 2. Data for Usage Pie Chart
  const usageDataMap = new Map<string, number>();
  varieties.forEach(v => {
      const current = usageDataMap.get(v.usage) || 0;
      usageDataMap.set(v.usage, current + 1);
  });
  const pieData = Array.from(usageDataMap.entries()).map(([name, value]) => ({ name, value }));
  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // 3. Data for Height/Vigor Comparison (Using latest height)
  const heightData = plots.map(p => {
      const latest = getLatestRecord(p.id);
      return {
          name: p.name.split('-')[0], // Short name
          height: latest?.plantHeight || 0,
          fullName: p.name
      };
  }).filter(d => d.height > 0).slice(0, 10); // Top 10 for readability

  const activePlots = plots.filter(p => p.status === 'Activa').length;
  const completedPlots = plots.filter(p => p.status === 'Cosechada').length;
  // Count plots that have at least one record with yield
  const harvestedDataCount = plots.filter(p => {
      const latest = getLatestRecord(p.id);
      return latest && latest.yield && latest.yield > 0;
  }).length;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('HempTrack - Reporte de Estado', 14, 22);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = plots.map(p => {
        const v = varieties.find(val => val.id === p.varietyId);
        const l = locations.find(loc => loc.id === p.locationId);
        const latest = getLatestRecord(p.id);
        return [
            p.name,
            v?.name || '-',
            l?.name || '-',
            p.sowingDate,
            latest?.plantHeight ? `${latest.plantHeight} cm` : '-',
            p.status
        ];
    });

    autoTable(doc, {
        head: [['Parcela', 'Variedad', 'Locación', 'Siembra', 'Altura (Últ)', 'Estado']],
        body: tableData,
        startY: 40,
    });

    doc.save('reporte_hemptrack.pdf');
  };

  const exportExcel = () => {
      const data = plots.map(p => {
          const v = varieties.find(val => val.id === p.varietyId);
          const latest = getLatestRecord(p.id);
          return {
              Parcela: p.name,
              Variedad: v?.name,
              Estado: p.status,
              'Ultima Actualización': latest?.date || '-',
              'Altura Actual': latest?.plantHeight || 0,
              'Rendimiento': latest?.yield || 0
          };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
      XLSX.writeFile(wb, "dashboard_data.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Panel General</h1>
        <div className="flex space-x-2">
            <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition flex items-center shadow-sm">
                <FileText size={16} className="mr-2" /> Reporte PDF
            </button>
            <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition flex items-center shadow-sm">
                <Download size={16} className="mr-2" /> Excel
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Variedades" 
          value={varieties.length} 
          icon={Sprout} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Locaciones" 
          value={locations.length} 
          icon={MapPin} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Ensayos Activos" 
          value={activePlots} 
          icon={Activity} 
          color="bg-hemp-500" 
        />
        <StatCard 
          title="Cosechados" 
          value={completedPlots} 
          icon={CheckCircle} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Rendimiento Promedio (kg/ha)</h2>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="yield" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#16a34a', '#0891b2', '#f59e0b'][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="text-center">
                  <Activity size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Sin datos de cosecha aún</p>
              </div>
            </div>
          )}
        </div>

        {/* Height Area Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Desarrollo Vegetativo (Altura cm)</h2>
             {heightData.length > 0 ? (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={heightData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis />
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="height" stroke="#16a34a" fill="#dcfce7" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p>Sin datos de altura recientes</p>
                </div>
             )}
        </div>

        {/* Pie Chart: Varieties Usage */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Distribución por Uso</h2>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-sm text-gray-600 flex-wrap">
                {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: pieColors[index % pieColors.length]}}></div>
                        {entry.name} ({entry.value})
                    </div>
                ))}
            </div>
        </div>

        {/* Quick Actions / Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Estado del Proyecto</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Parcelas Registradas</span>
              <span className="font-bold text-gray-900">{plots.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Datos de Cosecha Ingresados</span>
              <span className="font-bold text-gray-900">{harvestedDataCount}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">PRÓXIMAS TAREAS SUGERIDAS</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center text-orange-600">
                  <Activity size={16} className="mr-2" />
                  Revisar riego en Campo Experimental
                </li>
                <li className="flex items-center text-blue-600">
                  <Activity size={16} className="mr-2" />
                  Registrar fenología parcela P-102
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
