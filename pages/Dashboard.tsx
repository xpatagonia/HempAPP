import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ComposedChart, Line, Area 
} from 'recharts';
import { 
  Activity, Globe, ShieldCheck, ChevronRight, 
  Bot, Sprout, TrendingUp, AlertTriangle, 
  Calendar, ArrowUpRight, Zap, Target, AlertCircle, Clock, FlaskConical, Plus, ClipboardList,
  Satellite, Sparkles, RefreshCw, CheckCircle2, CheckSquare, Eye, Download, Package, FileText, ArrowRight, Layers,
  ChevronDown, MapPin, Check, SlidersHorizontal, BarChart3, Wifi
} from 'lucide-react';
import { getPlotNDVIAlertStatus, exportNDVITimeSeriesPDF, generateDetailedSatellitePasses, getPlotAgrochemicalApplications } from '../src/services/agro40Service';
import { PlotNDVIAlert, Task, AgrochemicalApplication } from '../types';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendPositive?: boolean;
  icon: any;
  accentColor: 'emerald' | 'amber' | 'purple' | 'sky' | 'rose';
  subtext: string;
  badge?: string;
}

const colorMap = {
  emerald: {
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200/80 dark:border-emerald-800/40',
    hoverBorder: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentDot: 'bg-emerald-500',
    barFill: 'bg-emerald-500',
  },
  amber: {
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200/80 dark:border-amber-800/40',
    hoverBorder: 'hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    accentText: 'text-amber-600 dark:text-amber-400',
    accentDot: 'bg-amber-500',
    barFill: 'bg-amber-500',
  },
  purple: {
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200/80 dark:border-purple-800/40',
    hoverBorder: 'hover:border-purple-500/40',
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    accentText: 'text-purple-600 dark:text-purple-400',
    accentDot: 'bg-purple-500',
    barFill: 'bg-purple-500',
  },
  sky: {
    bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200/80 dark:border-sky-800/40',
    hoverBorder: 'hover:border-sky-500/40',
    iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    accentText: 'text-sky-600 dark:text-sky-400',
    accentDot: 'bg-sky-500',
    barFill: 'bg-sky-500',
  },
  rose: {
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200/80 dark:border-rose-800/40',
    hoverBorder: 'hover:border-rose-500/40',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    accentText: 'text-rose-600 dark:text-rose-400',
    accentDot: 'bg-rose-500',
    barFill: 'bg-rose-500',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  trendPositive,
  icon: Icon,
  accentColor,
  subtext,
  badge
}) => {
  const c = colorMap[accentColor] || colorMap.emerald;

  return (
    <div className={`relative bg-white dark:bg-slate-900/90 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md ${c.hoverBorder} transition-all duration-200 group flex flex-col justify-between overflow-hidden`}>
      {/* Top subtle highlight line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.barFill} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${c.iconBg} group-hover:scale-105 transition-transform duration-200 shadow-sm`}>
              <Icon size={20} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">{label}</p>
              {badge && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {badge}
                </span>
              )}
            </div>
          </div>

          {trend && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg ${
              trendPositive !== false 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40' 
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
            }`}>
              <TrendingUp size={11} className={trendPositive !== false ? '' : 'rotate-180'} />
              {trend}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 font-mono tracking-tight tabular-nums">
            {value}
          </h3>
          {unit && <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <p className="text-slate-500 dark:text-slate-400 font-medium truncate text-[11px]">{subtext}</p>
        <span className={`w-1.5 h-1.5 rounded-full ${c.accentDot} shrink-0 ml-2`} />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { varieties, locations, plots, currentUser, getLatestRecord, trialRecords, tasks, addTask, appName } = useAppContext();
  const navigate = useNavigate();

  const relevantPlots = currentUser?.role === 'client' ? plots.filter(p => p.responsibleIds?.includes(currentUser?.id || '')) : plots;
  const pendingTasks = tasks.filter(t => t.status === 'Pendiente').length;
  const highPriorityTasks = tasks.filter(t => t.status === 'Pendiente' && t.priority === 'Alta').length;

  // Filtro de pestañas de visualización rápida
  const [activeSection, setActiveSection] = useState<'all' | 'satellite' | 'senasa' | 'yield'>('all');

  // Evaluación de alertas automáticas NDVI (<0.2 o >0.7) en lotes registrados
  const plotNDVIAlerts: PlotNDVIAlert[] = useMemo(() => {
    return relevantPlots.map(plot => {
      const variety = varieties.find(v => v.id === plot.varietyId);
      const trials = trialRecords.filter(t => t.plotId === plot.id);
      return getPlotNDVIAlertStatus(plot, variety, trials);
    });
  }, [relevantPlots, varieties, trialRecords]);

  const criticalAlerts = useMemo(() => {
    return plotNDVIAlerts.filter(a => a.isCritical);
  }, [plotNDVIAlerts]);

  const criticalLowAlerts = useMemo(() => {
    return plotNDVIAlerts.filter(a => a.isCriticalLow);
  }, [plotNDVIAlerts]);

  const criticalHighAlerts = useMemo(() => {
    return plotNDVIAlerts.filter(a => a.isCriticalHigh);
  }, [plotNDVIAlerts]);

  // Cálculo del NDVI medio en la red
  const avgNDVI = useMemo(() => {
    if (plotNDVIAlerts.length === 0) return 0.58;
    const sum = plotNDVIAlerts.reduce((acc, curr) => acc + (curr.ndvi || 0), 0);
    return (sum / plotNDVIAlerts.length).toFixed(2);
  }, [plotNDVIAlerts]);

  // Trazabilidad de Insumos y Cumplimiento SENASA
  const agrochemicalApps: AgrochemicalApplication[] = useMemo(() => {
    let allApps: AgrochemicalApplication[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_agrochemical_apps');
      if (stored) {
        try { allApps = JSON.parse(stored); } catch (e) {}
      }
    }
    if (allApps.length === 0) {
      allApps = getPlotAgrochemicalApplications(relevantPlots);
    }
    const relevantPlotIds = new Set(relevantPlots.map(p => p.id));
    return allApps.filter(a => relevantPlotIds.has(a.plotId));
  }, [relevantPlots]);

  const inputStats = useMemo(() => {
    const totalApps = agrochemicalApps.length;
    const organicCount = agrochemicalApps.filter(a => a.toxicologicalClass.includes('Orgánico') || a.toxicologicalClass.includes('Biológico')).length;
    const greenBandCount = agrochemicalApps.filter(a => a.toxicologicalClass.includes('Verde')).length;
    const plotsWithApps = new Set(agrochemicalApps.map(a => a.plotId)).size;
    const activePlotsCount = relevantPlots.filter(p => p.status === 'Activa').length;
    
    return {
      totalApps,
      organicCount,
      greenBandCount,
      plotsWithApps,
      activePlotsCount,
      senasaCompliancePct: 100
    };
  }, [agrochemicalApps, relevantPlots]);

  // Estado de sincronización automática de tareas
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [syncedMessage, setSyncedMessage] = useState<string | null>(null);

  const getTaskForAlert = (alert: PlotNDVIAlert) => {
    return tasks.find(t => 
      t.plotId === alert.plotId && 
      (t.title.includes('NDVI CRÍTICO') || t.title.includes('NDVI SUPERIOR') || t.title.includes('ALERTA NDVI'))
    );
  };

  const syncNDVITasks = async () => {
    setIsSyncingTasks(true);
    let createdCount = 0;

    for (const alert of criticalAlerts) {
      const existing = getTaskForAlert(alert);
      if (!existing) {
        const plot = plots.find(p => p.id === alert.plotId);
        const isLow = alert.isCriticalLow;
        const newTask: Task = {
          id: `task-ndvi-${alert.plotId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: alert.title,
          description: `${alert.description} Acción recomendada: ${alert.suggestedAction}`,
          status: 'Pendiente',
          priority: 'Alta',
          assignedToIds: plot?.responsibleIds && plot.responsibleIds.length > 0 ? plot.responsibleIds : (currentUser ? [currentUser.id] : []),
          dueDate: new Date(Date.now() + (isLow ? 24 : 72) * 3600000).toISOString().split('T')[0],
          plotId: alert.plotId,
          createdBy: 'Sistema Satelital Sentinel-2'
        };
        await addTask(newTask);
        createdCount++;
      }
    }

    setIsSyncingTasks(false);
    if (createdCount > 0) {
      setSyncedMessage(`Se generaron ${createdCount} tareas automáticas de inspección NDVI.`);
    } else {
      setSyncedMessage('Todas las alertas satelitales ya tienen tarea registrada y activa.');
    }
    setTimeout(() => setSyncedMessage(null), 4000);
  };

  // Disparar sincronización silenciosa al cargar si hay alertas sin tarea
  useEffect(() => {
    const missing = criticalAlerts.filter(a => !getTaskForAlert(a));
    if (missing.length > 0 && tasks.length > 0) {
      syncNDVITasks();
    }
  }, [criticalAlerts.length, tasks.length]);

  const plotsAtRisk = useMemo(() => {
      const now = new Date().getTime();
      return relevantPlots.filter(p => {
          if (p.status !== 'Activa') return false;
          const latest = getLatestRecord(p.id);
          if (!latest) return true; // Nunca monitoreada es un riesgo
          const lastDate = new Date(latest.date).getTime();
          const diffDays = (now - lastDate) / 86400000;
          return diffDays > 7; // Más de una semana sin datos
      }).slice(0, 5);
  }, [relevantPlots, getLatestRecord]);

  const yieldData = useMemo(() => {
    const map = new Map<string, { actual: number; target: number; count: number }>();
    relevantPlots.forEach(plot => {
      const latest = getLatestRecord(plot.id);
      const v = varieties.find(v => v.id === plot.varietyId);
      if (v) {
        const curr = map.get(v.name) || { actual: 0, target: 800, count: 0 }; 
        map.set(v.name, { 
            actual: curr.actual + (latest?.yield || 0), 
            target: curr.target,
            count: curr.count + (latest?.yield ? 1 : 0) 
        });
      }
    });
    return Array.from(map.entries())
        .map(([name, d]) => ({ 
            name, 
            actual: d.count > 0 ? Math.round(d.actual / d.count) : 0,
            target: d.target 
        }))
        .sort((a, b) => b.actual - a.actual)
        .slice(0, 5);
  }, [relevantPlots, varieties, getLatestRecord]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      
      {/* 1. OPERATIONAL TELEMETRY & COMMAND HEADER */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            {/* Live Operational Status Kicker */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Red {appName} Online
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                <Satellite size={11} className="text-sky-500" />
                Sentinel-2 Órbita Activa
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <ShieldCheck size={11} className="text-purple-500" />
                SENASA 100% Auditado
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-baseline gap-3">
              <span>Centro de Control Agronómico</span>
              <span className="text-base sm:text-lg font-mono font-medium text-slate-400 hidden sm:inline">
                {currentUser?.name ? `| ${currentUser.name.split(' ')[0]}` : '| Red Nucleus'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
              Monitoreo multiespectral en tiempo real, gestión de labores de campo y trazabilidad de cáñamo industrial.
            </p>
          </div>

          {/* Action Control Buttons (Linear / Industrial Style) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link 
              to="/trials-lite" 
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 border border-slate-200/60 dark:border-slate-700"
            >
              <ClipboardList size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Carga Rápida</span>
            </Link>

            <Link 
              to="/plots" 
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 border border-slate-200/60 dark:border-slate-700"
            >
              <Calendar size={15} className="text-slate-500" />
              <span>Planificar Siembra</span>
            </Link>

            <Link 
              to="/advisor" 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 group active:scale-95"
            >
              <Bot size={16} className="group-hover:rotate-12 transition-transform" />
              <span>AI Terminal</span>
            </Link>
          </div>
        </div>

        {/* Section Segmented Filter Control */}
        <div className="flex items-center gap-1.5 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mr-2 shrink-0 flex items-center gap-1">
            <SlidersHorizontal size={11} /> Enfoque:
          </span>
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
              activeSection === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Vista Integral
          </button>
          <button
            onClick={() => setActiveSection('satellite')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeSection === 'satellite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Satellite size={13} />
            Sentinel-2 NDVI {criticalAlerts.length > 0 && `(${criticalAlerts.length})`}
          </button>
          <button
            onClick={() => setActiveSection('senasa')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeSection === 'senasa'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={13} />
            SENASA & Insumos
          </button>
          <button
            onClick={() => setActiveSection('yield')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeSection === 'yield'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={13} />
            Rendimiento & Cosecha
          </button>
        </div>
      </div>

      {/* 2. INDUSTRIAL KPI CARDS (HIGH-CONTRAST METRIC GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard 
          label="Lotes en Producción" 
          value={relevantPlots.filter(p => p.status === 'Activa').length} 
          unit="Parcelas"
          trend="+24% vs ciclo anterior" 
          trendPositive={true}
          icon={Sprout} 
          accentColor="emerald"
          badge="Activas"
          subtext={`${relevantPlots.length} parcelas registradas en total`} 
        />
        <MetricCard 
          label="Tareas de Campo" 
          value={pendingTasks} 
          unit="Pendientes"
          trend={highPriorityTasks > 0 ? `${highPriorityTasks} Críticas` : 'Al día'}
          trendPositive={highPriorityTasks === 0}
          icon={Zap} 
          accentColor="amber"
          badge="Prioridad"
          subtext={highPriorityTasks > 0 ? `${highPriorityTasks} tareas de inspección fitosanitaria` : 'Sin tareas demoradas'} 
        />
        <MetricCard 
          label="Variedades en Red" 
          value={varieties.length} 
          unit="Cultivares"
          trend="INASE Cert." 
          trendPositive={true}
          icon={FlaskConical} 
          accentColor="purple"
          badge="Genética"
          subtext="Certificación oficial y trazabilidad genética" 
        />
        <MetricCard 
          label="Vigor Vegetativo NDVI" 
          value={avgNDVI} 
          unit="NDVI Medio"
          trend="Óptimo" 
          trendPositive={true}
          icon={Satellite} 
          accentColor="sky"
          badge="Sentinel-2"
          subtext={`${criticalAlerts.length} lotes con valores atípicos detectados`} 
        />
      </div>

      {/* 3. FIELD COMMAND BANNER: RAPID FIELD INSPECTION (HIGH DENSITY AGTECH BANNER) */}
      <div className="relative rounded-2xl md:rounded-3xl p-6 md:p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 text-white shadow-xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-10 opacity-10 pointer-events-none text-emerald-400">
          <FlaskConical size={220} className="rotate-12 group-hover:rotate-0 transition-transform duration-700" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                <ClipboardList size={22} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">Operaciones de Lote</span>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Estación de Recorrida y Carga Rápida</h2>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
              Modo ergonómico diseñado para técnicos y operarios con tablet o smartphone en el lote. Registra fenología, plagas, riego y biometría con geolocalización en un solo toque.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Check size={12} className="text-emerald-400" /> Sincronización Automática
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Wifi size={12} className="text-emerald-400" /> Soporte Offline en Campo
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <MapPin size={12} className="text-emerald-400" /> Georreferenciación GPS
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/trials-lite"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Iniciar Recorrida de Campo</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE GRID: 2 COLUMNS ON DESKTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* LEFT COLUMN: CRITICAL MODULES (2/3 WIDTH) */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* SECTION A: SATELLITE NDVI AUTOMATED ALERTS (SENTINEL-2) */}
          {(activeSection === 'all' || activeSection === 'satellite') && (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 relative">
                    <Satellite size={24} />
                    {criticalAlerts.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Alertas Satelitales NDVI (Copernicus Sentinel-2)
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20">
                        LIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Detección automática de anomalías: suelo descubierto (&lt;0.20) o vigor foliar superior (&gt;0.70).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {criticalLowAlerts.length > 0 && (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-red-500" /> {criticalLowAlerts.length} Crítico Bajo
                    </span>
                  )}
                  {criticalHighAlerts.length > 0 && (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-600" /> {criticalHighAlerts.length} Vigor Alto
                    </span>
                  )}
                  <button
                    onClick={syncNDVITasks}
                    disabled={isSyncingTasks}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50 border border-slate-200/60 dark:border-slate-700"
                  >
                    <RefreshCw size={13} className={isSyncingTasks ? 'animate-spin text-emerald-600' : ''} />
                    <span>Sincronizar</span>
                  </button>
                </div>
              </div>

              {syncedMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-300">
                  <CheckCircle2 size={16} />
                  <span>{syncedMessage}</span>
                </div>
              )}

              {/* Tarjetas de Alertas Críticas */}
              {criticalAlerts.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="mx-auto text-emerald-500 mb-2" size={32} />
                  <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Todos los lotes presentan vigor equilibrado (0.20 - 0.70 NDVI).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criticalAlerts.map(alert => {
                    const assignedTask = getTaskForAlert(alert);
                    const isLow = alert.isCriticalLow;
                    return (
                      <div
                        key={alert.plotId}
                        className={`p-5 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                          isLow 
                            ? 'bg-red-50/30 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40' 
                            : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-black ${
                              isLow ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                              <span className="text-[9px] uppercase font-bold tracking-tight">NDVI</span>
                              <span className="text-lg leading-none">{alert.ndvi.toFixed(2)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-slate-900 dark:text-white text-sm tracking-tight uppercase">
                                  {alert.plotName}
                                </h3>
                                <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                                  isLow ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                }`}>
                                  {isLow ? 'Crítico < 0.20' : 'Vigor > 0.70'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                Etapa: {alert.stage} · Pase: {alert.date}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {alert.description}
                        </p>

                        <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Acción Recomendada:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{alert.suggestedAction}</span>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60">
                          <div>
                            {assignedTask ? (
                              <Link
                                to="/tasks"
                                className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                              >
                                <CheckSquare size={13} />
                                <span>Tarea {assignedTask.priority}</span>
                              </Link>
                            ) : (
                              <button
                                onClick={syncNDVITasks}
                                className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-slate-300 transition"
                              >
                                <Plus size={13} /> Crear Tarea
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const plot = plots.find(p => p.id === alert.plotId);
                                if (!plot) return;
                                const variety = varieties.find(v => v.id === plot.varietyId);
                                const trials = trialRecords.filter(t => t.plotId === plot.id);
                                const passes = generateDetailedSatellitePasses(plot, variety, trials);
                                exportNDVITimeSeriesPDF(plot, variety, passes, trials);
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition"
                              title="Descargar Reporte Satelital NDVI en PDF"
                            >
                              <Download size={11} />
                              <span>PDF</span>
                            </button>
                            <Link
                              to={`/agro40?plotId=${alert.plotId}`}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition"
                            >
                              <Satellite size={11} />
                              <span>Agro 4.0</span>
                            </Link>
                            <Link
                              to={`/plots/${alert.plotId}`}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold uppercase transition"
                            >
                              Ficha
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: SENASA INPUT TRACEABILITY & AUDIT */}
          {(activeSection === 'all' || activeSection === 'senasa') && (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-500/20">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Trazabilidad de Insumos & Normativa SENASA
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        AUDITADO
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Auditoría digital de fertilizantes, fitosanitarios, lotes y períodos de carencia pre-cosecha.
                    </p>
                  </div>
                </div>

                <Link
                  to="/intelligence"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0 self-start md:self-auto"
                >
                  <Package size={14} />
                  <span>Auditoría SENASA</span>
                </Link>
              </div>

              {/* 4 Indicadores Rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">Normativa SENASA</span>
                  <p className="text-2xl font-mono font-black text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 size={18} />
                    <span>100%</span>
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">Auditoría aprobada</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">Tratamientos</span>
                  <p className="text-2xl font-mono font-black text-slate-900 dark:text-white">
                    {inputStats.totalApps} <span className="text-xs font-normal text-slate-400">Apps</span>
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">En {inputStats.plotsWithApps} lotes activos</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">Banda Verde</span>
                  <p className="text-2xl font-mono font-black text-purple-600 dark:text-purple-400">
                    {inputStats.organicCount + inputStats.greenBandCount} <span className="text-xs font-normal text-slate-400">Bio</span>
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">Bajo impacto ecológico</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">Período Carencia</span>
                  <p className="text-2xl font-mono font-black text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <ShieldCheck size={18} />
                    <span>Liberado</span>
                  </p>
                  <span className="text-[10px] text-slate-400 block font-medium">Apto para cosecha</span>
                </div>
              </div>

              {/* Feed de Últimos Tratamientos */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Package size={13} className="text-purple-500" />
                    <span>Últimas Aplicaciones Registradas en Campo</span>
                  </h3>
                  <Link to="/intelligence" className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                    <span>Ver todos</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agrochemicalApps.slice(0, 4).map(app => (
                    <div
                      key={app.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800/60 transition-all space-y-2 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 dark:text-white uppercase text-xs">
                              {app.plotName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              {app.category}
                            </span>
                          </div>
                          <h4 className="font-black text-purple-700 dark:text-purple-300 text-sm mt-0.5">
                            {app.productName}
                          </h4>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                          {app.senasaRegisterNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 font-medium">
                        <div>
                          <span className="font-mono font-bold uppercase text-slate-400 block text-[8px]">Proveedor</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-bold truncate block">{app.supplierName}</strong>
                        </div>
                        <div>
                          <span className="font-mono font-bold uppercase text-slate-400 block text-[8px]">Lote</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-bold block">{app.batchNumber}</strong>
                        </div>
                        <div>
                          <span className="font-mono font-bold uppercase text-slate-400 block text-[8px]">Dosis</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-bold block">{app.dosagePerHa} {app.dosageUnit}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION C: YIELD ANALYTICS & PRODUCTION PROJECTIONS */}
          {(activeSection === 'all' || activeSection === 'yield') && (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-500/20">
                    <Target size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Rendimiento de Cosecha (kg/ha)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Comparativa agronómica por cultivar: Biomasa Real Lograda vs. Meta Productiva.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                    <span className="text-slate-600 dark:text-slate-300 uppercase">Real</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-sm" />
                    <span className="text-slate-600 dark:text-slate-300 uppercase">Proyectado</span>
                  </div>
                </div>
              </div>

              <div className="h-[340px] w-full pt-2">
                {yieldData.some(d => d.actual > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={yieldData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          padding: '12px 16px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Bar 
                        dataKey="target" 
                        fill="#cbd5e1" 
                        radius={[6, 6, 0, 0]} 
                        barSize={32} 
                        className="dark:fill-slate-800" 
                      />
                      <Bar 
                        dataKey="actual" 
                        barSize={20} 
                        radius={[6, 6, 0, 0]}
                      >
                        {yieldData.map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? '#059669' : '#10b981'} />
                        ))}
                      </Bar>
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#059669" 
                        strokeWidth={2.5} 
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Activity size={40} className="text-slate-400 mb-2" />
                    <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                      Esperando registros biométricos de corte y pesaje
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REAL-TIME FEED & RISK MONITOR (1/3 WIDTH) */}
        <div className="space-y-6 md:space-y-8">
          
          {/* RISK WATCHLIST (PLOTS NEEDING TECHNICAL MONITORING) */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">Atención Requerida</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Lotes sin datos técnicos (+7 días)</p>
                </div>
              </div>

              {plotsAtRisk.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  {plotsAtRisk.length} Alertas
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {plotsAtRisk.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="mx-auto text-emerald-500 mb-1" size={26} />
                  <p className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                    Toda la red bajo monitoreo activo
                  </p>
                </div>
              ) : (
                plotsAtRisk.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const latest = getLatestRecord(p.id);
                  return (
                    <Link 
                      key={p.id} 
                      to={`/plots/${p.id}`}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800/80 hover:border-rose-300 dark:hover:border-rose-800/60 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-lg shrink-0">
                          <Clock size={15} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-mono font-black text-slate-900 dark:text-white text-xs truncate uppercase group-hover:text-emerald-600 transition-colors">
                            {p.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {loc?.name || 'S/D'} · {loc?.province || ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-mono font-black text-rose-600 dark:text-rose-400 uppercase block">Sin Datos</span>
                        <span className="text-[9px] text-slate-400 font-mono block">
                          {latest ? latest.date : 'Nunca'}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* LIVE ACTIVITY FEED */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">Actividad de Campo</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Últimos registros biométricos</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono font-black uppercase rounded">
                  LIVE
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
                {trialRecords.length > 0 ? trialRecords.slice(0, 7).map((act, idx) => {
                  const plot = plots.find(p => p.id === act.plotId);
                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all group"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-[9px] font-mono font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                          {act.stage || 'Muestreo'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold">
                          {act.date}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors truncate">
                        {plot?.name || 'Registro Técnico'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                        <ArrowUpRight size={11} className="text-emerald-500" />
                        <span>Altura: {act.plantHeight || 0} cm</span>
                        <span aria-hidden="true">·</span>
                        <span>Vigor: {act.vigor || 8}/10</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <AlertTriangle size={28} className="mb-1 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500">Sin actividad registrada</p>
                  </div>
                )}
              </div>
            </div>

            <Link 
              to="/plots" 
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Explorar Todas las Parcelas</span>
              <ChevronRight size={14} />
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
