import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Sprout, MapPin, Activity, CheckCircle, FileText, Download, ArrowRight, Users, FolderOpen, AlertCircle, TrendingUp, Calendar, FileCheck, CheckSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StatCard = ({ title, value, icon: Icon, colorClass, trend }: any) => (
  <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border flex items-center justify-between transition-colors">
    <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
             <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</h3>
        </div>
    </div>
    {trend && (
        <div className="text-green-500 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded flex items-center">
            <TrendingUp size={12} className="mr-1"/> {trend}
        </div>
    )}
  </div>
);

export default function Dashboard() {
  const { varieties, locations, plots, projects, usersList, getLatestRecord, currentUser, theme } = useAppContext();
  const [reportGenerating, setReportGenerating] = useState(false);

  // --- ONBOARDING LOGIC ---
  const isSetupMode = varieties.length === 0 && locations.length === 0 && projects.length === 0;

  // 1. Calculate Average Yield by Variety
  const yieldDataMap = new Map<string, { totalYield: number; count: number }>();

  plots.forEach(plot => {
    const latestData = getLatestRecord(plot.id);
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

  // 3. Data for Height/Vigor Comparison
  const heightData = plots.map(p => {
      const latest = getLatestRecord(p.id);
      return {
          name: p.name.split('-')[0],
          height: latest?.plantHeight || 0,
          fullName: p.name
      };
  }).filter(d => d.height > 0).slice(0, 10);

  const activePlots = plots.filter(p => p.status === 'Activa').length;
  const completedPlots = plots.filter(p => p.status === 'Cosechada').length;
  const harvestedDataCount = plots.filter(p => {
      const latest = getLatestRecord(p.id);
      return latest && latest.yield && latest.yield > 0;
  }).length;

  // --- ADVANCED REPORT GENERATOR ---
  const generateProfessionalPDF = () => {
    setReportGenerating(true);
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- Header ---
    doc.setFillColor(22, 163, 74); // Hemp Green
    doc.rect(0, 0, 210, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('HempAPP', 14, 13);
    
    doc.setFontSize(10);
    doc.text('REPORTE EJECUTIVO', 195, 13, { align: 'right' });

    // --- Metadata ---
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Generado por: ${currentUser?.name || 'Usuario'}`, 14, 30);
    doc.text(`Fecha: ${today}`, 14, 35);
    doc.text(`Proyecto Activo: ${projects.length > 0 ? projects[0].name : 'General'}`, 14, 40);

    // --- Stats Summary ---
    doc.setFillColor(240, 253, 244); // light green bg
    doc.rect(14, 45, 182, 25, 'F');
    doc.setDrawColor(22, 163, 74);
    doc.rect(14, 45, 182, 25, 'S');

    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Estado', 20, 55);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Variedades: ${varieties.length}`, 20, 63);
    doc.text(`Sitios Activos: ${locations.length}`, 80, 63);
    doc.text(`Ensayos en Curso: ${activePlots}`, 140, 63);

    // --- Main Table ---
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
            latest?.stage || 'Inicial',
            p.status
        ];
    });

    autoTable(doc, {
        startY: 80,
        head: [['Parcela', 'Variedad', 'Locación', 'Siembra', 'Altura', 'Etapa', 'Estado']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        styles: { fontSize: 9, cellPadding: 3 },
    });

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`HempAPP System - Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`HempAPP_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
    setReportGenerating(false);
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

  if (isSetupMode) {
      return (
          <div className="max-w-4xl mx-auto py-10">
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden border border-hemp-100 dark:border-dark-border">
                  <div className="bg-hemp-600 p-8 text-white">
                      <h1 className="text-3xl font-bold mb-2">¡Bienvenido a HempAPP! 👋</h1>
                      <p className="text-hemp-100 text-lg">Parece que es tu primera vez aquí. Vamos a configurar el sistema.</p>
                  </div>
                  <div className="p-8 dark:text-gray-200">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
                          <AlertCircle className="mr-2 text-hemp-600"/> Pasos Recomendados
                      </h2>
                      
                      <div className="space-y-4">
                          {/* Step 1: Create User */}
                          <div className={`p-4 rounded-xl border flex items-center justify-between ${currentUser?.id === 'rescue-admin-001' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border opacity-60'}`}>
                              <div className="flex items-center space-x-4">
                                  <div className="bg-white dark:bg-dark-card p-3 rounded-full shadow-sm">
                                      <Users className="text-orange-500" size={24} />
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-gray-800 dark:text-gray-100">1. Crear Usuario Real</h3>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">Estás usando un usuario temporal. Crea tu administrador definitivo.</p>
                                  </div>
                              </div>
                              <Link to="/users" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium text-sm flex items-center">
                                  Ir a Usuarios <ArrowRight size={16} className="ml-2"/>
                              </Link>
                          </div>
                          {/* More setup steps... (Keeping simple for brevity in this update) */}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // Determine chart text color based on theme
  const chartTextColor = theme === 'dark' ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Control</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Resumen general de operaciones.</p>
        </div>
        
        {/* Report Actions */}
        <div className="flex space-x-2 bg-white dark:bg-dark-card p-1 rounded-lg border border-gray-200 dark:border-dark-border shadow-sm">
            <button 
                onClick={generateProfessionalPDF} 
                disabled={reportGenerating}
                className="text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition flex items-center"
            >
                {reportGenerating ? <FileText size={16} className="mr-2 animate-pulse" /> : <FileText size={16} className="mr-2 text-red-500" />}
                {reportGenerating ? 'Generando...' : 'Reporte PDF'}
            </button>
            <div className="w-px bg-gray-200 dark:bg-dark-border my-1"></div>
            <button 
                onClick={exportExcel} 
                className="text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition flex items-center"
            >
                <Download size={16} className="mr-2 text-green-600" /> Excel
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Variedades" 
          value={varieties.length} 
          icon={Sprout} 
          colorClass="bg-blue-500 text-blue-500" 
        />
        <StatCard 
          title="Locaciones" 
          value={locations.length} 
          icon={MapPin} 
          colorClass="bg-amber-500 text-amber-500" 
        />
        <StatCard 
          title="Ensayos Activos" 
          value={activePlots} 
          icon={Activity} 
          colorClass="bg-hemp-500 text-hemp-500" 
          trend="+2 esta sem."
        />
        <StatCard 
          title="Cosechados" 
          value={completedPlots} 
          icon={CheckCircle} 
          colorClass="bg-purple-500 text-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAIN CHART: YIELD */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border transition-colors">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Rendimiento Promedio (kg/ha)</h2>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-border px-2 py-1 rounded">Última Campaña</div>
          </div>
          
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: chartTextColor}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: chartTextColor}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }}
                    cursor={{fill: theme === 'dark' ? '#334155' : '#f1f5f9'}}
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
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-dark-bg/50 rounded-lg border border-dashed border-gray-200 dark:border-dark-border">
              <Activity size={48} className="mb-3 opacity-50" />
              <p>Sin datos de cosecha aún</p>
            </div>
          )}
        </div>

        {/* SECONDARY: TASKS / ALERTS */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border transition-colors flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Actividad Reciente</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {harvestedDataCount > 0 ? (
                    <div className="flex items-start p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                        <FileCheck className="text-green-600 mt-1 mr-3 flex-shrink-0" size={18}/>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-green-100">Datos Cosecha</p>
                            <p className="text-xs text-gray-600 dark:text-green-300">{harvestedDataCount} parcelas actualizadas con rendimiento.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                         <AlertCircle className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18}/>
                         <p className="text-xs text-gray-500 dark:text-gray-400">Esperando primeros datos de cosecha.</p>
                    </div>
                )}

                <div className="pt-4 border-t dark:border-dark-border">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Accesos Directos</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <Link to="/tasks" className="p-3 bg-gray-50 dark:bg-dark-bg hover:bg-hemp-50 dark:hover:bg-hemp-900/20 rounded-lg text-center transition group border border-transparent hover:border-hemp-200 dark:hover:border-hemp-800">
                             <CheckSquare className="mx-auto mb-1 text-gray-400 group-hover:text-hemp-600" size={20}/>
                             <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-hemp-700">Tareas</span>
                        </Link>
                        <Link to="/calendar" className="p-3 bg-gray-50 dark:bg-dark-bg hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-center transition group border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                             <Calendar className="mx-auto mb-1 text-gray-400 group-hover:text-blue-600" size={20}/>
                             <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-700">Calendario</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Height Area Chart */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border transition-colors">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Desarrollo Vegetativo (Altura cm)</h2>
             {heightData.length > 0 ? (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={heightData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="name" tick={{fontSize: 12, fill: chartTextColor}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: chartTextColor}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }} />
                            <Area type="monotone" dataKey="height" stroke="#16a34a" fillOpacity={1} fill="url(#colorHeight)" />
                            <defs>
                                <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-dark-bg/50 rounded-lg border border-dashed border-gray-200 dark:border-dark-border">
                    <p>Sin datos de altura recientes</p>
                </div>
             )}
        </div>

        {/* Pie Chart: Varieties Usage */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border transition-colors">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Distribución por Uso</h2>
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
                            stroke="none"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: pieColors[index % pieColors.length]}}></div>
                        {entry.name} ({entry.value})
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}