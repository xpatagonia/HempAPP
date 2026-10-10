import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  DollarSign, TrendingUp, TrendingDown, Layers, Calculator, 
  FileText, Download, Printer, Filter, Calendar, Sprout, Tractor, 
  ShieldCheck, AlertCircle, ArrowUpRight, Scale, PieChart as PieChartIcon,
  BarChart3, RefreshCw, CheckCircle2, ChevronRight, Zap, Target
} from 'lucide-react';
import { AgrochemicalApplication } from '../types';
import { getPlotAgrochemicalApplications } from '../src/services/agro40Service';

export default function FinancialReports() {
  const { plots, locations, varieties, resources, currentUser } = useAppContext();

  // Estados de control de vista
  const [selectedCampaign, setSelectedCampaign] = useState<string>('2025/2026');
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD');
  const exchangeRate = 1250; // TC referencial ARS/USD
  const [activeTab, setActiveTab] = useState<'summary' | 'plots' | 'inputs_cost' | 'projections'>('summary');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Obtener aplicaciones fitosanitarias de localStorage o demo
  const agrochemicalApps = useMemo<AgrochemicalApplication[]>(() => {
    let apps: AgrochemicalApplication[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_agrochemical_apps');
      if (stored) {
        try { apps = JSON.parse(stored); } catch (e) {}
      }
    }
    if (apps.length === 0) {
      apps = getPlotAgrochemicalApplications(plots);
    }
    return apps;
  }, [plots]);

  // Mapa de costos unitarios de insumos conocidos
  const resourceCostMap = useMemo(() => {
    const map = new Map<string, number>();
    resources.forEach(r => {
      map.set(r.name.toLowerCase().trim(), r.costPerUnit);
    });
    return map;
  }, [resources]);

  // Cálculo financiero integral por lote / parcela
  const plotFinancialData = useMemo(() => {
    const filteredPlots = plots.filter(plot => {
      const matchLoc = selectedLocationId === 'all' || plot.locationId === selectedLocationId;
      const plotCamps = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
      const matchCamp = selectedCampaign === 'all' || plotCamps.includes(selectedCampaign);
      return matchLoc && matchCamp;
    });

    return filteredPlots.map(plot => {
      const loc = locations.find(l => l.id === plot.locationId);
      const variety = varieties.find(v => v.id === plot.varietyId);
      
      let areaHa = plot.surfaceArea || 1.0;
      if (plot.surfaceUnit === 'm2') areaHa = areaHa / 10000;
      else if (plot.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
      areaHa = Math.max(0.1, Number(areaHa.toFixed(2)));

      const isIrrigated = plot.irrigationType && !plot.irrigationType.toLowerCase().includes('secano');
      const isTrial = plot.type === 'Ensayo';

      // 1. Costos de Labores Agronómicas Base (USD)
      // Preparación, siembra, pulverización y cosecha
      let laborCostPerHa = isIrrigated ? 310 : 220;
      if (isTrial) laborCostPerHa += 180; // Auditoría intensiva y muestreos
      const laborTotalUsd = laborCostPerHa * areaHa;

      // 2. Costo Real de Insumos & Fitosanitarios aplicados en el Lote (Cuaderno Fitosanitario)
      const plotApps = agrochemicalApps.filter(a => a.plotId === plot.id);
      let inputsTotalUsd = 0;
      plotApps.forEach(app => {
        // Buscar costo unitario en el catálogo de recursos
        let unitCost = 15; // default USD/L o USD/kg si no está en catálogo
        const appNameLower = app.productName.toLowerCase();
        
        for (const [resName, cost] of resourceCostMap.entries()) {
          if (appNameLower.includes(resName) || resName.includes(appNameLower)) {
            unitCost = cost;
            break;
          }
        }

        if (appNameLower.includes('bio-hemp root')) unitCost = 14.5;
        else if (appNameLower.includes('phyto-mineral')) unitCost = 18.2;
        else if (appNameLower.includes('neem')) unitCost = 22.0;
        else if (appNameLower.includes('trichoderma')) unitCost = 35.0;

        inputsTotalUsd += (app.totalAppliedAmount || (app.dosagePerHa * areaHa)) * unitCost;
      });

      // Si no tiene aplicaciones en cuaderno, estimación agronómica base de insumos
      if (inputsTotalUsd === 0) {
        inputsTotalUsd = (isIrrigated ? 260 : 180) * areaHa;
      }

      // 3. Costo de Semilla Fiscalizada (USD)
      const seedRateKgHa = variety?.optimalSowingDensityKgHa || 45;
      const seedCostPerKg = 4.8; // USD/kg de semilla fiscalizada C1
      const seedTotalUsd = areaHa * seedRateKgHa * seedCostPerKg;

      // 4. Costos de Riego / Canon Hídrico & Energía
      const irrigationCostUsd = isIrrigated ? 150 * areaHa : 25 * areaHa;

      // 5. Costo Operativo Directo Consolidado (USD)
      const directCostUsd = Number((laborTotalUsd + inputsTotalUsd + seedTotalUsd + irrigationCostUsd).toFixed(2));
      const costPerHaUsd = Number((directCostUsd / areaHa).toFixed(2));

      // 6. Proyección de Ingresos Brutos (VBP - Valor Bruto de Producción)
      const usage = variety?.usage || 'Fibra';
      let projectedRevenueUsd = 0;
      let physicalYieldText = '';

      if (usage === 'Fibra') {
        const yieldTnHa = isIrrigated ? 9.2 : 7.4;
        const totalTn = areaHa * yieldTnHa;
        projectedRevenueUsd = totalTn * 340; // USD 340 / Tn fibra corta/larga
        physicalYieldText = `${totalTn.toFixed(1)} Tn Fibra (${yieldTnHa} Tn/ha)`;
      } else if (usage === 'Grano') {
        const yieldTnHa = isIrrigated ? 1.85 : 1.30;
        const totalTn = areaHa * yieldTnHa;
        projectedRevenueUsd = totalTn * 1250; // USD 1,250 / Tn grano comestible
        physicalYieldText = `${totalTn.toFixed(1)} Tn Grano (${yieldTnHa} Tn/ha)`;
      } else if (usage === 'Dual') {
        const fiberTn = areaHa * (isIrrigated ? 6.5 : 5.2);
        const grainTn = areaHa * (isIrrigated ? 1.25 : 0.90);
        projectedRevenueUsd = (fiberTn * 340) + (grainTn * 1250);
        physicalYieldText = `${fiberTn.toFixed(1)}T Fib + ${grainTn.toFixed(1)}T Gr`;
      } else {
        const biomassKg = areaHa * 1150;
        projectedRevenueUsd = biomassKg * 9.5; // USD 9.5 / kg biomasa de flor
        physicalYieldText = `${biomassKg.toFixed(0)} kg Biomasa Flor`;
      }

      projectedRevenueUsd = Number(projectedRevenueUsd.toFixed(2));
      const netMarginUsd = Number((projectedRevenueUsd - directCostUsd).toFixed(2));
      const roiPct = directCostUsd > 0 ? Number(((netMarginUsd / directCostUsd) * 100).toFixed(1)) : 0;
      const marginPerHaUsd = Number((netMarginUsd / areaHa).toFixed(2));

      // Costo por kilogramo o tonelada producida
      let unitCostMetric = '';
      if (usage === 'Fibra') {
        const yieldTn = areaHa * (isIrrigated ? 9.2 : 7.4);
        unitCostMetric = `$${(directCostUsd / yieldTn).toFixed(1)} USD/Tn`;
      } else if (usage === 'Grano') {
        const yieldTn = areaHa * (isIrrigated ? 1.85 : 1.30);
        unitCostMetric = `$${(directCostUsd / (yieldTn * 1000)).toFixed(2)} USD/kg`;
      } else {
        unitCostMetric = `$${costPerHaUsd.toFixed(0)} USD/ha`;
      }

      return {
        plotId: plot.id,
        plotName: plot.name,
        locationName: loc?.name || 'Establecimiento General',
        varietyName: variety?.name || 'Genética s/d',
        usage,
        areaHa,
        isIrrigated,
        isTrial,
        laborTotalUsd,
        inputsTotalUsd,
        seedTotalUsd,
        irrigationCostUsd,
        directCostUsd,
        costPerHaUsd,
        projectedRevenueUsd,
        netMarginUsd,
        marginPerHaUsd,
        roiPct,
        physicalYieldText,
        unitCostMetric,
        applicationsCount: plotApps.length
      };
    });
  }, [plots, locations, varieties, selectedLocationId, selectedCampaign, agrochemicalApps, resourceCostMap]);

  // Consolidado total
  const totals = useMemo(() => {
    const totalAreaHa = plotFinancialData.reduce((acc, p) => acc + p.areaHa, 0);
    const totalDirectCostUsd = plotFinancialData.reduce((acc, p) => acc + p.directCostUsd, 0);
    const totalRevenueUsd = plotFinancialData.reduce((acc, p) => acc + p.projectedRevenueUsd, 0);
    const totalNetMarginUsd = totalRevenueUsd - totalDirectCostUsd;
    const avgCostPerHaUsd = totalAreaHa > 0 ? totalDirectCostUsd / totalAreaHa : 0;
    const avgMarginPerHaUsd = totalAreaHa > 0 ? totalNetMarginUsd / totalAreaHa : 0;
    const overallRoiPct = totalDirectCostUsd > 0 ? (totalNetMarginUsd / totalDirectCostUsd) * 100 : 0;

    const totalLaborUsd = plotFinancialData.reduce((acc, p) => acc + p.laborTotalUsd, 0);
    const totalInputsUsd = plotFinancialData.reduce((acc, p) => acc + p.inputsTotalUsd, 0);
    const totalSeedUsd = plotFinancialData.reduce((acc, p) => acc + p.seedTotalUsd, 0);
    const totalIrrigationUsd = plotFinancialData.reduce((acc, p) => acc + p.irrigationCostUsd, 0);

    return {
      totalAreaHa: Number(totalAreaHa.toFixed(2)),
      totalDirectCostUsd: Number(totalDirectCostUsd.toFixed(2)),
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      totalNetMarginUsd: Number(totalNetMarginUsd.toFixed(2)),
      avgCostPerHaUsd: Number(avgCostPerHaUsd.toFixed(2)),
      avgMarginPerHaUsd: Number(avgMarginPerHaUsd.toFixed(2)),
      overallRoiPct: Number(overallRoiPct.toFixed(1)),
      totalLaborUsd: Number(totalLaborUsd.toFixed(2)),
      totalInputsUsd: Number(totalInputsUsd.toFixed(2)),
      totalSeedUsd: Number(totalSeedUsd.toFixed(2)),
      totalIrrigationUsd: Number(totalIrrigationUsd.toFixed(2))
    };
  }, [plotFinancialData]);

  // Datos para gráficos de composición de costos
  const costBreakdownData = useMemo(() => {
    return [
      { name: 'Insumos & Fitosanitarios', value: totals.totalInputsUsd, color: '#10b981' },
      { name: 'Labores & Maquinaria', value: totals.totalLaborUsd, color: '#3b82f6' },
      { name: 'Semilla Fiscalizada', value: totals.totalSeedUsd, color: '#f59e0b' },
      { name: 'Riego & Energía', value: totals.totalIrrigationUsd, color: '#06b6d4' }
    ].filter(item => item.value > 0);
  }, [totals]);

  // Formateador monetario reactivo
  const formatMoney = (amountUsd: number, decimals: number = 0) => {
    if (currency === 'ARS') {
      const ars = amountUsd * exchangeRate;
      return `$${ars.toLocaleString('es-AR', { maximumFractionDigits: decimals })} ARS`;
    }
    return `$${amountUsd.toLocaleString('en-US', { maximumFractionDigits: decimals })} USD`;
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    const headers = [
      'Lote', 'Establecimiento', 'Genetica', 'Destino', 'Superficie_Ha',
      'Costo_Labores_USD', 'Costo_Insumos_USD', 'Costo_Semilla_USD', 'Costo_Riego_USD',
      'Costo_Total_USD', 'Costo_Por_Ha_USD', 'Ingreso_Bruto_USD', 'Margen_Neto_USD', 'ROI_Pct'
    ];
    const rows = plotFinancialData.map(p => [
      `"${p.plotName}"`,
      `"${p.locationName}"`,
      `"${p.varietyName}"`,
      `"${p.usage}"`,
      p.areaHa,
      p.laborTotalUsd,
      p.inputsTotalUsd,
      p.seedTotalUsd,
      p.irrigationCostUsd,
      p.directCostUsd,
      p.costPerHaUsd,
      p.projectedRevenueUsd,
      p.netMarginUsd,
      p.roiPct
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Costos_Operativos_${selectedCampaign.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 500);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ENCABEZADO Y CONTROLES PRINCIPALES */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={24} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-mono">
                Costos Operativos & <span className="text-emerald-600">Finanzas</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Matriz analítica en tiempo real de costos directos, consumo de insumos por hectárea, VBP y margen neto.
              </p>
            </div>
          </div>
        </div>

        {/* SELECTORES DE FILTRO: CAMPAÑA, ESTABLECIMIENTO Y MONEDA */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* MONEDA */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('ARS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                currency === 'ARS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={`TC: $${exchangeRate} ARS/USD`}
            >
              ARS ($)
            </button>
          </div>

          {/* CAMPAÑA */}
          <select
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold px-3 py-2 rounded-2xl outline-none"
          >
            <option value="2025/2026">Campaña 2025/26 (En Curso)</option>
            <option value="2024/2025">Campaña 2024/25</option>
            <option value="all">Todas las Campañas</option>
          </select>

          {/* ESTABLECIMIENTO */}
          <select
            value={selectedLocationId}
            onChange={e => setSelectedLocationId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold px-3 py-2 rounded-2xl outline-none"
          >
            <option value="all">Todos los Campos ({locations.length})</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          {/* EXPORTAR REPORTE */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-2 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:opacity-90 transition"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl transition"
            title="Imprimir informe en A4"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* BILLETES DE KPI FINANCIERO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Costo Directo Total */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Costo Operativo Directo
            </span>
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Calculator size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {formatMoney(totals.totalDirectCostUsd)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
            <span>Costo Promedio / ha:</span>
            <strong className="text-slate-700 dark:text-slate-300">{formatMoney(totals.avgCostPerHaUsd)}/ha</strong>
          </div>
        </div>

        {/* KPI 2: Valor Bruto de Producción (VBP) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              VBP Proyectado (Ingresos)
            </span>
            <span className="p-1.5 rounded-xl bg-sky-500/10 text-sky-600">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">
            {formatMoney(totals.totalRevenueUsd)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
            <span>Superficie Operada:</span>
            <strong className="text-slate-700 dark:text-slate-300">{totals.totalAreaHa} ha</strong>
          </div>
        </div>

        {/* KPI 3: Margen Neto Proyectado */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Margen Neto Global
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {formatMoney(totals.totalNetMarginUsd)}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
            <span>Margen / ha:</span>
            <strong className="text-emerald-600">+{formatMoney(totals.avgMarginPerHaUsd)}/ha</strong>
          </div>
        </div>

        {/* KPI 4: Retorno ROI Proyectado */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Retorno sobre Costo (ROI)
            </span>
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Target size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
            +{totals.overallRoiPct}%
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
            <span>Eficiencia Operativa:</span>
            <strong className="text-purple-600 font-bold">Clase A+</strong>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE VISTA INTERACTIVA */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'summary'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <PieChartIcon size={14} />
          <span>Estructura de Costos & Gráficos</span>
        </button>
        <button
          onClick={() => setActiveTab('plots')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'plots'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Tractor size={14} />
          <span>Desglose por Lote & Variedad ({plotFinancialData.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('inputs_cost')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'inputs_cost'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Insumos Cuaderno Fitosanitario</span>
        </button>
        <button
          onClick={() => setActiveTab('projections')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'projections'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <TrendingUp size={14} />
          <span>Proyecciones de Cosecha & Retorno</span>
        </button>
      </div>

      {/* PESTAÑA 1: RESUMEN GRÁFICO & ESTRUCTURA */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* GRÁFICO CIRCULAR: COMPOSICIÓN DE COSTO */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-mono font-black uppercase text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <PieChartIcon size={16} className="text-emerald-500" />
                <span>Composición del Gasto Operativo</span>
              </h3>
              <p className="text-xs text-slate-500">Distribución porcentual por rubro productivo</p>
            </div>

            <div className="h-64 w-full my-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatMoney(val), 'Costo']}
                    contentStyle={{ borderRadius: '12px', border: 'none', background: '#1e293b', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-xs">
              {costBreakdownData.map(item => {
                const pct = totals.totalDirectCostUsd > 0 ? (item.value / totals.totalDirectCostUsd) * 100 : 0;
                return (
                  <div key={item.name} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </span>
                    <strong className="text-slate-900 dark:text-white">
                      {formatMoney(item.value)} ({pct.toFixed(0)}%)
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GRÁFICO DE BARRAS: COSTOS POR LOTE */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-mono font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 size={16} className="text-sky-500" />
                  <span>Costo vs. Ingreso Bruto por Parcela</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">En {currency}</span>
              </div>
              <p className="text-xs text-slate-500">Comparación directa de inversión operativa y valor bruto estimado</p>
            </div>

            <div className="h-72 w-full my-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={plotFinancialData.map(p => ({
                    name: p.plotName.length > 15 ? p.plotName.slice(0, 15) + '...' : p.plotName,
                    costo: p.directCostUsd,
                    ingreso: p.projectedRevenueUsd,
                    margen: p.netMarginUsd
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: number) => formatMoney(val)}
                    contentStyle={{ borderRadius: '12px', border: 'none', background: '#1e293b', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="costo" name="Costo Directo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ingreso" name="Ingreso Estimado" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center font-mono text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">Labores</span>
                <strong>{formatMoney(totals.totalLaborUsd)}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">Insumos</span>
                <strong>{formatMoney(totals.totalInputsUsd)}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">Semilla C1</span>
                <strong>{formatMoney(totals.totalSeedUsd)}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">Riego</span>
                <strong>{formatMoney(totals.totalIrrigationUsd)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: DESGLOSE COMPLETO POR LOTE */}
      {activeTab === 'plots' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Matriz Financiera Detallada por Unidad Productiva
              </h3>
              <p className="text-[11px] text-slate-500">
                Desglose de costos directos, laboreos, insumos aplicados y rentabilidad unitaria.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
              Total {plotFinancialData.length} Parcelas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Lote & Campo</th>
                  <th className="py-3 px-4">Genética</th>
                  <th className="py-3 px-4 text-right">Área</th>
                  <th className="py-3 px-4 text-right">Labores</th>
                  <th className="py-3 px-4 text-right">Insumos</th>
                  <th className="py-3 px-4 text-right">Costo Total</th>
                  <th className="py-3 px-4 text-right">Costo / ha</th>
                  <th className="py-3 px-4 text-right">VBP Ingreso</th>
                  <th className="py-3 px-4 text-right">Margen Neto</th>
                  <th className="py-3 px-4 text-center">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plotFinancialData.map(p => (
                  <tr key={p.plotId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{p.plotName}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{p.locationName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{p.varietyName}</span>
                      <span className="text-[10px] text-slate-400 block">{p.usage}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                      {p.areaHa} ha
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {formatMoney(p.laborTotalUsd)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {formatMoney(p.inputsTotalUsd)}
                      {p.applicationsCount > 0 && (
                        <span className="text-[9px] text-emerald-600 block">({p.applicationsCount} apps)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600">
                      {formatMoney(p.directCostUsd)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatMoney(p.costPerHaUsd)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-sky-600 dark:text-sky-400">
                      {formatMoney(p.projectedRevenueUsd)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      +{formatMoney(p.netMarginUsd)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                        p.roiPct >= 60 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        +{p.roiPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: COSTO DE INSUMOS & FITOSANITARIOS VINCULADOS */}
      {activeTab === 'inputs_cost' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span>Valorización de Aplicaciones del Cuaderno Fitosanitario</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cálculo del costo total de bioestimulantes, fertilizantes y protectores aplicados con registro oficial SENASA.
              </p>
            </div>
            <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
              Total Insumos Valorizados: {formatMoney(totals.totalInputsUsd)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(res => {
              const matchedApps = agrochemicalApps.filter(a => 
                a.productName.toLowerCase().includes(res.name.toLowerCase()) || 
                res.name.toLowerCase().includes(a.productName.toLowerCase())
              );
              const totalAppliedUnits = matchedApps.reduce((acc, a) => acc + (a.totalAppliedAmount || 0), 0);
              const totalCostVal = totalAppliedUnits * res.costPerUnit;

              return (
                <div key={res.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {res.type}
                      </span>
                      <strong className="text-emerald-600 font-mono text-sm">
                        ${res.costPerUnit} USD / {res.unit}
                      </strong>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white font-mono mt-2">
                      {res.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Stock Actual: {res.stock ?? 'Ilimitado'} {res.unit}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono text-xs flex justify-between items-center">
                    <span className="text-slate-400">Aplicado en Lotes:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {totalAppliedUnits > 0 ? `${totalAppliedUnits.toFixed(1)} ${res.unit} (${formatMoney(totalCostVal)})` : 'Planificado'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: PROYECCIONES DE COSECHA & RETORNO */}
      {activeTab === 'projections' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-sky-500" />
              <span>Sensibilidad de Precios & Proyección de Cosecha</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Escenarios de ingresos según oscilaciones del mercado de comodities de cáñamo industrial (Fibra, Grano y Biomasa).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Fibra Larga / Corta Industrial</span>
                <strong className="text-lg font-mono text-slate-900 dark:text-white block mt-1">$340 USD / Tn</strong>
                <span className="text-xs text-slate-500 block mt-1">
                  Rinde esperado: 7.4 a 9.2 Tn/ha en lotes comerciales.
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Grano / Semilla Limpia</span>
                <strong className="text-lg font-mono text-slate-900 dark:text-white block mt-1">$1,250 USD / Tn</strong>
                <span className="text-xs text-slate-500 block mt-1">
                  Rinde esperado: 1.25 a 1.85 Tn/ha bajo fertirriego.
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Biomasa CBG / Flor Seca</span>
                <strong className="text-lg font-mono text-slate-900 dark:text-white block mt-1">$9.50 USD / kg</strong>
                <span className="text-xs text-slate-500 block mt-1">
                  Rinde esperado: 900 a 1,200 kg/ha en Santhica 27.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
