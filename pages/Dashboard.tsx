import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Activity, Mail, Send, Loader2, X, ShieldCheck, ChevronRight, 
  Bot, Sprout, TrendingUp, AlertTriangle, 
  Calendar, ArrowUpRight, Zap, AlertCircle, Clock, FlaskConical, Plus, ClipboardList,
  Satellite, Sparkles, RefreshCw, CheckCircle2, CheckSquare, Download, Package, ArrowRight,
  SlidersHorizontal, BarChart3, Award, DollarSign, Megaphone, CloudRain, Droplets, Archive, Users, RotateCcw
} from 'lucide-react';
import { getPlotNDVIAlertStatus, exportNDVITimeSeriesPDF, generateDetailedSatellitePasses, getPlotAgrochemicalApplications } from '../src/services/agro40Service';
import { PlotNDVIAlert, Task, AgrochemicalApplication, Plot, CAMPAIGNS } from '../types';
import { sendAgronomicAlertEmail } from '../src/services/emailNotificationService';
import { dispatchPushNotification } from '../src/services/pushNotificationService';
import AlertDashboard from '../components/AlertDashboard';
import DashboardLicenseIntegritySummary from '../components/DashboardLicenseIntegritySummary';
import YieldAndInputConsumptionWidget from '../components/YieldAndInputConsumptionWidget';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendPositive?: boolean;
  icon: any;
  accentColor: 'emerald' | 'amber' | 'purple' | 'sky' | 'rose';
  subtext: string;
  to?: string;
}

const colorMap = {
  emerald: {
    hoverBorder: 'hover:border-emerald-500/50',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    accentDot: 'bg-emerald-500',
    barFill: 'bg-emerald-500',
  },
  amber: {
    hoverBorder: 'hover:border-amber-500/50',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    accentDot: 'bg-amber-500',
    barFill: 'bg-amber-500',
  },
  purple: {
    hoverBorder: 'hover:border-purple-500/50',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    accentDot: 'bg-purple-500',
    barFill: 'bg-purple-500',
  },
  sky: {
    hoverBorder: 'hover:border-sky-500/50',
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    accentDot: 'bg-sky-500',
    barFill: 'bg-sky-500',
  },
  rose: {
    hoverBorder: 'hover:border-rose-500/50',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
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
  to
}) => {
  const c = colorMap[accentColor] || colorMap.emerald;
  const content = (
    <div className={`relative bg-white dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md ${c.hoverBorder} transition-all duration-200 group flex flex-col justify-between overflow-hidden h-full`}>
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.barFill} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${c.iconBg}`}>
              <Icon size={17} strokeWidth={2.2} />
            </div>
            <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider font-mono">
              {label}
            </p>
          </div>

          {trend && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
              trendPositive !== false 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40' 
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
            }`}>
              <TrendingUp size={10} className={trendPositive !== false ? '' : 'rotate-180'} />
              {trend}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 mb-1.5">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 font-mono tracking-tight tabular-nums">
            {value}
          </h3>
          {unit && <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
        <p className="text-slate-500 dark:text-slate-400 font-medium truncate">{subtext}</p>
        <span className={`w-1.5 h-1.5 rounded-full ${c.accentDot} shrink-0 ml-2`} />
      </div>
    </div>
  );

  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
};

export default function Dashboard() {
  const {
    varieties, locations, plots, currentUser, getLatestRecord, trialRecords,
    tasks, addTask, appName, clients, usersList, hydricRecords,
    activeCampaign, setActiveCampaign, closePlotCycle, reopenPlotCycle,
    syncAllPlotsContinuousRainfall, isSyncingGlobalRainfall
  } = useAppContext();

  const [selectedSocioId, setSelectedSocioId] = useState<string>('all');
  const [cycleViewMode, setCycleViewMode] = useState<'active' | 'closed'>('active');

  // Modal de Cierre de Ciclo / Cosecha de Parcela
  const [closingPlot, setClosingPlot] = useState<Plot | null>(null);
  const [closureYieldKg, setClosureYieldKg] = useState<string>('');
  const [closureDate, setClosureDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [closureNotes, setClosureNotes] = useState<string>('');
  const [isClosingCycle, setIsClosingCycle] = useState(false);

  // Socios que participan en la campaña seleccionada
  const campaignSocios = useMemo(() => {
    const plotLocIds = new Set(
      plots
        .filter(p => {
          if (activeCampaign === 'all') return true;
          const camps = p.activeCampaigns || (p.campaign ? [p.campaign] : ['2025/2026']);
          return camps.includes(activeCampaign) || p.campaign === activeCampaign;
        })
        .map(p => p.locationId)
    );
    const socioIds = new Set(
      locations
        .filter(l => plotLocIds.has(l.id) || (activeCampaign === 'all' ? true : (l.activeCampaigns || ['2025/2026']).includes(activeCampaign)))
        .map(l => l.clientId)
        .filter(Boolean) as string[]
    );
    return clients.filter(c => socioIds.has(c.id) || clients.length <= 10);
  }, [plots, locations, clients, activeCampaign]);

  // Todas las parcelas vinculadas a la campaña y socio (ya aisladas por establecimiento desde AppContext)
  const campaignScopedPlots = useMemo(() => {
    return plots.filter(p => {
      if (activeCampaign !== 'all') {
        const plotCamps = p.activeCampaigns || (p.campaign ? [p.campaign] : ['2025/2026']);
        if (!plotCamps.includes(activeCampaign) && p.campaign !== activeCampaign) return false;
      }
      if (selectedSocioId !== 'all') {
        const loc = locations.find(l => l.id === p.locationId);
        if (loc?.clientId !== selectedSocioId) return false;
      }
      return true;
    });
  }, [plots, locations, activeCampaign, selectedSocioId]);

  useEffect(() => {
    if (selectedSocioId !== 'all' && !clients.some(c => c.id === selectedSocioId)) {
      setSelectedSocioId('all');
    }
  }, [clients, selectedSocioId]);

  // Parcelas OPERATIVAS ACTIVAS (las parcelas con ciclo cerrado / cosechadas desaparecen del dashboard operativo actual)
  const relevantPlots = useMemo(() => {
    return campaignScopedPlots.filter(p => {
      if (activeCampaign !== 'all' && p.campaignStatuses?.[activeCampaign] === 'Cosechada') return false;
      return p.status === 'Activa';
    });
  }, [campaignScopedPlots, activeCampaign]);

  // Parcelas de CICLO CERRADO / COSECHADAS en la campaña actual (Archivo de Cosecha)
  const closedCampaignPlots = useMemo(() => {
    return campaignScopedPlots.filter(p => {
      if (activeCampaign !== 'all' && p.campaignStatuses?.[activeCampaign] === 'Cosechada') return true;
      return p.status === 'Cosechada';
    });
  }, [campaignScopedPlots, activeCampaign]);

  const activePlotIdsSet = useMemo(() => new Set(relevantPlots.map(p => p.id)), [relevantPlots]);
  const pendingTasks = tasks.filter(t => t.status === 'Pendiente' && (!t.plotId || activePlotIdsSet.has(t.plotId))).length;
  const highPriorityTasks = tasks.filter(t => t.status === 'Pendiente' && t.priority === 'Alta' && (!t.plotId || activePlotIdsSet.has(t.plotId))).length;

  // Vista activa: 'overview' muestra el tablero ejecutivo compacto sin scroll excesivo
  const [activeSection, setActiveSection] = useState<'overview' | 'water' | 'satellite' | 'senasa' | 'yield' | 'finances' | 'licenses'>('overview');
  const [rightFeedTab, setRightFeedTab] = useState<'risk' | 'activity'>('risk');

  // Cálculo continuo de Huella Hídrica por Parcela (Verde + Azul en m³/ha y m³ totales)
  const plotWaterFootprintList = useMemo(() => {
    const targetList = cycleViewMode === 'active' ? relevantPlots : closedCampaignPlots;
    return targetList.map(plot => {
      const loc = locations.find(l => l.id === plot.locationId);
      const socio = clients.find(c => c.id === loc?.clientId);
      const vari = varieties.find(v => v.id === plot.varietyId);
      const waterNeedMm = vari?.waterNeedMm || 480;

      let areaHa = plot.surfaceArea || 1;
      if (plot.surfaceUnit === 'm2') areaHa = areaHa / 10000;
      else if (plot.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
      areaHa = Math.max(0.01, Number(areaHa.toFixed(2)));

      const records = hydricRecords.filter(
        r => r.plotId === plot.id || (r.locationId === plot.locationId && !r.plotId)
      );
      const rainRecords = records.filter(r => r.type === 'Lluvia');
      const irrigRecords = records.filter(r => r.type === 'Riego');

      const rainMm = Number(rainRecords.reduce((s, r) => s + Number(r.amountMm || 0), 0).toFixed(1));
      const irrigMm = Number(irrigRecords.reduce((s, r) => s + Number(r.amountMm || 0), 0).toFixed(1));
      const totalMm = Number((rainMm + irrigMm).toFixed(1));

      const greenWaterM3Ha = Number((rainMm * 10).toFixed(1));
      const blueWaterM3Ha = Number((irrigMm * 10).toFixed(1));
      const totalWaterM3Ha = Number((totalMm * 10).toFixed(1));
      const totalVolumeM3 = Number((totalWaterM3Ha * areaHa).toFixed(1));
      const completionPct = Math.min(100, Math.round((totalMm / Math.max(1, waterNeedMm)) * 100));
      const lastRainDate = rainRecords.length > 0
        ? [...rainRecords].sort((a, b) => b.date.localeCompare(a.date))[0].date
        : null;

      return {
        plot,
        loc,
        socio,
        vari,
        areaHa,
        rainMm,
        irrigMm,
        totalMm,
        greenWaterM3Ha,
        blueWaterM3Ha,
        totalWaterM3Ha,
        totalVolumeM3,
        waterNeedMm,
        completionPct,
        rainEventsCount: rainRecords.length,
        lastRainDate
      };
    });
  }, [cycleViewMode, relevantPlots, closedCampaignPlots, locations, clients, varieties, hydricRecords]);

  const globalWaterSummary = useMemo(() => {
    if (plotWaterFootprintList.length === 0) {
      return { avgM3Ha: 0, totalVolumeM3: 0, totalRainEvents: 0, avgRainMm: 0 };
    }
    const totalVolumeM3 = plotWaterFootprintList.reduce((s, item) => s + item.totalVolumeM3, 0);
    const avgM3Ha = plotWaterFootprintList.reduce((s, item) => s + item.totalWaterM3Ha, 0) / plotWaterFootprintList.length;
    const avgRainMm = plotWaterFootprintList.reduce((s, item) => s + item.rainMm, 0) / plotWaterFootprintList.length;
    const totalRainEvents = plotWaterFootprintList.reduce((s, item) => s + item.rainEventsCount, 0);
    return {
      avgM3Ha: Number(avgM3Ha.toFixed(1)),
      totalVolumeM3: Number(totalVolumeM3.toFixed(1)),
      totalRainEvents,
      avgRainMm: Number(avgRainMm.toFixed(1))
    };
  }, [plotWaterFootprintList]);

  const handleConfirmCloseCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPlot || isClosingCycle) return;
    setIsClosingCycle(true);
    try {
      const yieldNum = closureYieldKg.trim() !== '' ? Number(closureYieldKg) : undefined;
      const ok = await closePlotCycle(closingPlot.id, {
        harvestYieldKg: yieldNum,
        closedDate: closureDate,
        notes: closureNotes.trim() || 'Ciclo biológico completado desde siembra hasta cosecha.'
      });
      if (ok) {
        setEmailAlertToast({
          show: true,
          message: `Ciclo cerrado: ${closingPlot.name} archivada en Cosechadas (${activeCampaign})`,
          sentTo: `Campaña ${activeCampaign}`,
          via: 'Gestión de Ciclo'
        });
        setClosingPlot(null);
        setClosureYieldKg('');
        setClosureNotes('');
      }
    } finally {
      setIsClosingCycle(false);
    }
  };

  const handleSyncNetworkRainfall = async () => {
    const count = await syncAllPlotsContinuousRainfall(true);
    setEmailAlertToast({
      show: true,
      message: count > 0
        ? `Pluviómetro Satelital: ${count} nuevas lluvias asentadas en BD`
        : 'Pluviómetro al día: todas las lluvias del ciclo ya están asentadas en BD',
      sentTo: `${relevantPlots.length} parcelas activas`,
      via: 'Open-Meteo ERA5/GFS'
    });
  };

  // Gestión de Alertas Agronómicas por Correo Electrónico
  const [selectedAlertForEmail, setSelectedAlertForEmail] = useState<PlotNDVIAlert | null>(null);
  const [alertRecipientEmail, setAlertRecipientEmail] = useState("");
  const [alertRecipientName, setAlertRecipientName] = useState("");
  const [alertSubject, setAlertSubject] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"Crítica" | "Advertencia" | "Informativa">("Crítica");
  const [alertDetails, setAlertDetails] = useState("");
  const [isSendingAlertEmail, setIsSendingAlertEmail] = useState(false);
  const [emailAlertToast, setEmailAlertToast] = useState<{
    show: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);

  const openPushComposerDrawer = (prefill?: { title?: string; body?: string; plotId?: string; severity?: 'critical' | 'warning' | 'info' }) => {
    window.dispatchEvent(new CustomEvent('nucleus:open-push-composer', { detail: prefill }));
  };

  const handleOpenAlertEmail = (alert: PlotNDVIAlert) => {
    const plot = plots.find(p => p.id === alert.plotId);
    const location = locations.find(l => l.id === plot?.locationId);
    const client = clients?.find(c => c.id === location?.clientId);
    const assignedUser = usersList?.find(u => (location?.clientId && u.clientId === location.clientId) || u.assignedPlotIds?.includes(plot?.id || ""));
    const variety = varieties.find(v => v.id === plot?.varietyId);

    const recipientEmail = client?.email || assignedUser?.email || currentUser?.email || "gaston.barea.moreno@gmail.com";
    const recipientName = client?.contactName || client?.name || assignedUser?.name || "Productor Asociado";

    const severityLevel = alert.isCriticalLow ? "Crítica" : "Advertencia";
    setAlertSeverity(severityLevel);
    setSelectedAlertForEmail(alert);
    setAlertRecipientEmail(recipientEmail);
    setAlertRecipientName(recipientName);
    setAlertSubject(`Alerta Agronómica NDVI • Parcela ${alert.plotName}`);
    setAlertDetails(
      `Se detectó un desvío de vigor vegetativo en la parcela "${alert.plotName}" (${variety?.name || "Cáñamo"}). NDVI actual: ${alert.ndvi.toFixed(2)} (${alert.isCriticalLow ? "Crítico < 0.20" : "Vigor > 0.70"}). ${alert.description}. Acción técnica recomendada: ${alert.suggestedAction}`
    );
  };

  const handleQuickPushNDVIAlert = async (alert: PlotNDVIAlert) => {
    await dispatchPushNotification({
      title: `🛰️ ${alert.title}`,
      body: `${alert.plotName} (NDVI ${alert.ndvi.toFixed(2)}): ${alert.suggestedAction}`,
      category: 'plot_critical',
      severity: alert.isCriticalLow ? 'critical' : 'warning',
      plotId: alert.plotId,
      plotName: alert.plotName,
      targetUrl: `/plots/${alert.plotId}`,
      actionLabel: 'Ver Parcela'
    });
    setEmailAlertToast({
      show: true,
      message: `Push Satelital emitido: ${alert.plotName}`,
      sentTo: alert.plotName,
      via: 'Web Push'
    });
  };

  const handleSendAlertEmail = async () => {
    if (!selectedAlertForEmail || !alertRecipientEmail.trim()) return;
    setIsSendingAlertEmail(true);
    try {
      const res = await sendAgronomicAlertEmail({
        toEmail: alertRecipientEmail.trim(),
        toName: alertRecipientName.trim() || "Productor Asociado",
        alertTitle: `[${alertSeverity.toUpperCase()}] ${alertSubject}`,
        plotName: selectedAlertForEmail.plotName,
        alertDetails: alertDetails,
        severity: alertSeverity,
        actionUrl: `${window.location.origin}/#/plots/${selectedAlertForEmail.plotId}`,
        extraData: {
          ndvi: selectedAlertForEmail.ndvi.toFixed(2),
          stage: selectedAlertForEmail.stage,
          suggested_action: selectedAlertForEmail.suggestedAction,
          severity: alertSeverity
        }
      });
      setEmailAlertToast({
        show: true,
        message: res.message,
        sentTo: alertRecipientEmail.trim(),
        via: res.deliveredVia
      });
      setSelectedAlertForEmail(null);
    } catch (err: any) {
      setEmailAlertToast({
        show: true,
        message: "Error despachando correo: " + (err?.message || "Reintentar"),
        sentTo: alertRecipientEmail.trim(),
        via: "Error"
      });
    } finally {
      setIsSendingAlertEmail(false);
    }
  };

  const plotNDVIAlerts: PlotNDVIAlert[] = useMemo(() => {
    return relevantPlots.map(plot => {
      const variety = varieties.find(v => v.id === plot.varietyId);
      const trials = trialRecords.filter(t => t.plotId === plot.id);
      return getPlotNDVIAlertStatus(plot, variety, trials);
    });
  }, [relevantPlots, varieties, trialRecords]);

  const criticalAlerts = useMemo(() => plotNDVIAlerts.filter(a => a.isCritical), [plotNDVIAlerts]);
  const criticalLowAlerts = useMemo(() => plotNDVIAlerts.filter(a => a.isCriticalLow), [plotNDVIAlerts]);
  const criticalHighAlerts = useMemo(() => plotNDVIAlerts.filter(a => a.isCriticalHigh), [plotNDVIAlerts]);

  const avgNDVI = useMemo(() => {
    if (plotNDVIAlerts.length === 0) return 0.58;
    const sum = plotNDVIAlerts.reduce((acc, curr) => acc + (curr.ndvi || 0), 0);
    return (sum / plotNDVIAlerts.length).toFixed(2);
  }, [plotNDVIAlerts]);

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

  const liveFinancialSummary = useMemo(() => {
    let totalDirectCostUsd = 0;
    let totalGrossRevenueUsd = 0;
    let totalAreaHa = 0;

    relevantPlots.forEach(plot => {
      let area = plot.surfaceArea || 1.0;
      if (plot.surfaceUnit === 'm2') area = area / 10000;
      else if (plot.surfaceUnit === 'ac') area = area * 0.404686;
      totalAreaHa += area;

      const isIrrigated = plot.irrigationType && !plot.irrigationType.toLowerCase().includes('secano');
      let costPerHa = isIrrigated ? 720 : 480;
      if (plot.type === 'Ensayo') costPerHa += 400;
      totalDirectCostUsd += area * costPerHa;

      const variety = varieties.find(v => v.id === plot.varietyId);
      const usage = variety?.usage || 'Fibra';
      if (usage === 'Fibra') {
        totalGrossRevenueUsd += area * (isIrrigated ? 9.2 : 7.4) * 340;
      } else if (usage === 'Grano') {
        totalGrossRevenueUsd += area * (isIrrigated ? 1.85 : 1.30) * 1250;
      } else if (usage === 'Dual') {
        totalGrossRevenueUsd += (area * (isIrrigated ? 6.5 : 5.2) * 340) + (area * (isIrrigated ? 1.25 : 0.90) * 1250);
      } else {
        totalGrossRevenueUsd += area * 1150 * 9.5;
      }
    });

    const netMarginUsd = totalGrossRevenueUsd - totalDirectCostUsd;
    const avgRoiPct = totalDirectCostUsd > 0 ? (netMarginUsd / totalDirectCostUsd) * 100 : 0;

    return {
      totalDirectCostUsd: Math.round(totalDirectCostUsd),
      totalGrossRevenueUsd: Math.round(totalGrossRevenueUsd),
      netMarginUsd: Math.round(netMarginUsd),
      avgRoiPct: Number(avgRoiPct.toFixed(1)),
      totalAreaHa: Number(totalAreaHa.toFixed(1))
    };
  }, [relevantPlots, varieties]);

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
      if (!latest) return true;
      const lastDate = new Date(latest.date).getTime();
      const diffDays = (now - lastDate) / 86400000;
      return diffDays > 7;
    }).slice(0, 5);
  }, [relevantPlots, getLatestRecord]);

  return (
    <div className="space-y-4 md:space-y-5 animate-in fade-in duration-300 max-w-[1600px] mx-auto pb-8">
      
      {/* 1. CABECERA DE COMANDO COMPACTA + BARRA DE ACCIONES RÁPIDAS */}
      <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-4 md:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Red {appName} Online
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                <Satellite size={10} className="text-sky-500" />
                Sentinel-2 Activo
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <ShieldCheck size={10} className="text-purple-500" />
                SENASA 100%
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-baseline gap-2">
              <span>Centro de Control Agronómico</span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-slate-400">
                {currentUser?.name ? `· ${currentUser.name.split(' ')[0]}` : '· Red Nucleus'}
              </span>
            </h1>
          </div>

          {/* Botones de Acción Directa (Sin Scroll) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openPushComposerDrawer()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone size={14} />
              <span>Emitir Push Manual</span>
            </button>

            <Link 
              to="/trials-lite" 
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-700"
            >
              <ClipboardList size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Monitoreo Rápido</span>
            </Link>

            <Link 
              to="/plots" 
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-700"
            >
              <Calendar size={14} className="text-slate-500" />
              <span>Parcelas</span>
            </Link>

            <Link 
              to="/advisor" 
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
            >
              <Bot size={14} />
              <span>Asesor IA</span>
            </Link>
          </div>
        </div>

        {/* BARRA DE CONTROL OPERATIVO: CAMPAÑA AGRÍCOLA + SOCIO EN CAMPAÑA + ESTADO DE CICLO */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Campaña */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
              <Calendar size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400">Campaña:</span>
              <select
                value={activeCampaign}
                onChange={e => setActiveCampaign(e.target.value)}
                className="bg-transparent text-xs font-mono font-black text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {CAMPAIGNS.map(c => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c} {c === '2025/2026' ? '(Actual)' : ''}
                  </option>
                ))}
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  Todas las Campañas
                </option>
              </select>
            </div>

            {/* Selector de Socio en la Campaña */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
              <Users size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400">Socio:</span>
              <select
                value={selectedSocioId}
                onChange={e => setSelectedSocioId(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  Todos los Socios ({campaignSocios.length})
                </option>
                {campaignSocios.map(s => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Conmutador Operativo: En Cultivo Activo vs Ciclos Cerrados / Cosechados */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCycleViewMode('active')}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                  cycleViewMode === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Muestra únicamente las parcelas con ciclo biológico activo. Las parcelas cosechadas desaparecen de esta vista operativa."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>En Cultivo Activo ({relevantPlots.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCycleViewMode('closed')}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                  cycleViewMode === 'closed'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Archivo de parcelas que completaron su ciclo (Cosechadas) en esta campaña."
              >
                <Archive size={12} />
                <span>Ciclos Cerrados / Cosechados ({closedCampaignPlots.length})</span>
              </button>
            </div>
          </div>

          {/* Estado de Pluviómetro Continuo & Sincronización Global */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncNetworkRainfall}
              disabled={isSyncingGlobalRainfall}
              className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/70 text-[11px] font-mono font-bold uppercase flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Sincroniza las lluvias satelitales (Open-Meteo ERA5/GFS) de todas las parcelas activas y actualiza la huella hídrica en BD"
            >
              <CloudRain size={13} className={isSyncingGlobalRainfall ? 'animate-bounce text-sky-500' : 'text-sky-500'} />
              <span>
                {isSyncingGlobalRainfall
                  ? 'Sincronizando Pluviómetro...'
                  : `Pluviómetro Continuo: ${globalWaterSummary.avgM3Ha} m³/ha`}
              </span>
            </button>
          </div>
        </div>

        {/* Selector de Módulos del Dashboard (Evita apilar 6 pantallas largas a la vez) */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mr-1 shrink-0 flex items-center gap-1">
            <SlidersHorizontal size={11} /> Vista:
          </span>
          {([
            { id: 'overview', label: 'Resumen Ejecutivo (Operativo)', icon: null, activeCls: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' },
            { id: 'water', label: `Huella Hídrica & Lluvias (${globalWaterSummary.totalRainEvents})`, icon: CloudRain, activeCls: 'bg-sky-600 text-white' },
            { id: 'satellite', label: `Satelital NDVI (${criticalAlerts.length})`, icon: Satellite, activeCls: 'bg-emerald-600 text-white' },
            { id: 'senasa', label: 'SENASA & Fitosanitario', icon: ShieldCheck, activeCls: 'bg-purple-600 text-white' },
            { id: 'yield', label: 'Rendimiento & Cosecha', icon: BarChart3, activeCls: 'bg-indigo-600 text-white' },
            { id: 'finances', label: 'Costos & ROI', icon: DollarSign, activeCls: 'bg-emerald-700 text-white' },
            { id: 'licenses', label: 'Licencias & Integridad', icon: Award, activeCls: 'bg-amber-600 text-white' }
          ] as const).map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? `${tab.activeCls} shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TIRAS DE 4 KPIS PRINCIPALES (CLICABLES & FILTRADOS POR CICLO ACTIVO EN CAMPAÑA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard 
          label={cycleViewMode === 'active' ? 'Lotes en Cultivo Activo' : 'Ciclos Cerrados / Cosecha'} 
          value={cycleViewMode === 'active' ? relevantPlots.length : closedCampaignPlots.length} 
          unit={`Camp. ${activeCampaign === 'all' ? 'Global' : activeCampaign}`}
          trend={`${liveFinancialSummary.totalAreaHa} ha activas`} 
          trendPositive={true}
          icon={Sprout} 
          accentColor="emerald"
          subtext={
            closedCampaignPlots.length > 0
              ? `${closedCampaignPlots.length} lote(s) cerrado(s) fuera del tablero activo`
              : 'Parcelas en seguimiento biológico actual'
          }
          to="/plots"
        />
        <MetricCard 
          label="Huella Hídrica Media" 
          value={globalWaterSummary.avgM3Ha} 
          unit="m³/ha"
          trend={`${globalWaterSummary.avgRainMm} mm lluvia`}
          trendPositive={true}
          icon={CloudRain} 
          accentColor="sky"
          subtext={`Volumen total: ${globalWaterSummary.totalVolumeM3.toLocaleString()} m³ (${globalWaterSummary.totalRainEvents} lluvias BD)`}
        />
        <MetricCard 
          label="Vigor Medio NDVI" 
          value={avgNDVI} 
          unit="Sentinel-2"
          trend={criticalAlerts.length > 0 ? `${criticalAlerts.length} Alertas` : 'Óptimo'} 
          trendPositive={criticalAlerts.length === 0}
          icon={Satellite} 
          accentColor="amber"
          subtext={`Labores pendientes: ${pendingTasks} (${highPriorityTasks} alta prio.)`}
          to="/agro40"
        />
        <MetricCard 
          label="Margen Operativo Activo" 
          value={`$${(liveFinancialSummary.netMarginUsd / 1000).toFixed(1)}k`} 
          unit="USD"
          trend={`ROI +${liveFinancialSummary.avgRoiPct}%`} 
          trendPositive={true}
          icon={DollarSign} 
          accentColor="purple"
          subtext={`Costo Directo: $${liveFinancialSummary.totalDirectCostUsd.toLocaleString()} USD`}
          to="/finances"
        />
      </div>

      {/* PANEL ESPECIAL CUANDO EL USUARIO CONMUTA A "CICLOS CERRADOS / COSECHADOS" */}
      {cycleViewMode === 'closed' && (
        <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-5 md:p-6 border border-amber-300/80 dark:border-amber-800/80 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Archive size={20} />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Archivo de Parcelas con Ciclo Cerrado / Cosechadas ({closedCampaignPlots.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estas unidades completaron su ciclo en la campaña <strong>{activeCampaign}</strong> y fueron retiradas automáticamente del tablero operativo activo para no distorsionar alertas ni promedios.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCycleViewMode('active')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <Sprout size={14} />
              <span>Volver a Cultivos Activos ({relevantPlots.length})</span>
            </button>
          </div>

          {closedCampaignPlots.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={26} />
              <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                No hay parcelas con ciclo cerrado en la campaña {activeCampaign}. Todas las unidades están en cultivo activo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedCampaignPlots.map(p => {
                const loc = locations.find(l => l.id === p.locationId);
                const socio = clients.find(c => c.id === loc?.clientId);
                const vari = varieties.find(v => v.id === p.varietyId);
                const wf = plotWaterFootprintList.find(w => w.plot.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3 font-mono"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            🏁 Ciclo Cerrado / Cosechada
                          </span>
                          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mt-1.5">
                            {p.name}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {loc?.name || 'Establecimiento'} • Socio: <strong>{socio?.name || p.ownerName || 'Red HempC'}</strong>
                          </p>
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {p.surfaceArea} {p.surfaceUnit}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[9px] uppercase text-slate-400 block">Siembra → Cierre</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {p.sowingDate} → {p.closedAt || 'Cosecha'}
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[9px] uppercase text-slate-400 block">Huella Hídrica Ciclo</span>
                          <strong className="text-sky-600 dark:text-sky-400">
                            {p.waterFootprintM3Ha ?? wf?.totalWaterM3Ha ?? 0} m³/ha
                          </strong>
                        </div>
                      </div>

                      {p.actualHarvestYieldKg !== undefined && (
                        <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 flex justify-between items-center text-xs">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                            Rinde Cosechado Real:
                          </span>
                          <strong className="font-black text-emerald-800 dark:text-emerald-200">
                            {p.actualHarvestYieldKg.toLocaleString()} kg ({vari?.name || 'Cáñamo'})
                          </strong>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <Link
                        to={`/plots/${p.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        <span>Ver Historial</span>
                        <ChevronRight size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await reopenPlotCycle(p.id, activeCampaign === 'all' ? undefined : activeCampaign);
                          setEmailAlertToast({
                            show: true,
                            message: `Parcela ${p.name} reabierta en el ciclo activo`,
                            sentTo: p.name,
                            via: 'Gestión de Ciclo'
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        <span>Reabrir Ciclo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. VISTA POR PESTAÑA SELECCIONADA */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 items-start">
          {/* COLUMNA IZQUIERDA (2/3): RADAR DE ALERTAS COMPACTO + RESUMEN RÁPIDO SENASA Y FINANZAS */}
          <div className="lg:col-span-2 space-y-4">
            <AlertDashboard
              defaultCompact={true}
              campaignFilter={activeCampaign}
              socioFilter={selectedSocioId}
              onOpenPushComposer={openPushComposerDrawer}
            />

            {/* Tarjetas ejecutivas duales (SENASA + Finanzas) para evitar scroll vertical */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mini Card SENASA */}
              <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Cumplimiento SENASA & Fito
                      </h3>
                      <p className="text-[11px] text-slate-500">Trazabilidad de insumos y carencias</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    100% OK
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Tratamientos</span>
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white">{inputStats.totalApps}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Bio / Verde</span>
                    <span className="text-sm font-mono font-black text-purple-600 dark:text-purple-400">
                      {inputStats.organicCount + inputStats.greenBandCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Lotes</span>
                    <span className="text-sm font-mono font-black text-emerald-600">{inputStats.plotsWithApps}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveSection('senasa')}
                    className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver detalle en Dashboard</span>
                  </button>
                  <Link
                    to="/phytosanitary"
                    className="font-black text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1"
                  >
                    <span>Abrir Cuaderno</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>

              {/* Mini Card Costos Operativos */}
              <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Matriz Financiera & Costos
                      </h3>
                      <p className="text-[11px] text-slate-500">Sobre {liveFinancialSummary.totalAreaHa} ha activas</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    +{liveFinancialSummary.avgRoiPct}% ROI
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Costo Directo</span>
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      ${(liveFinancialSummary.totalDirectCostUsd / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">VBP Est.</span>
                    <span className="text-sm font-mono font-black text-sky-600 dark:text-sky-400">
                      ${(liveFinancialSummary.totalGrossRevenueUsd / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Margen Neto</span>
                    <span className="text-sm font-mono font-black text-emerald-600">
                      +${(liveFinancialSummary.netMarginUsd / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveSection('yield')}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Rendimiento</span>
                  </button>
                  <Link
                    to="/finances"
                    className="font-black text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1"
                  >
                    <span>Auditoría Gastos</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (1/3): ESTACIÓN DE RECORRIDA COMPACTA + MONITOR LATERAL */}
          <div className="space-y-4">
            {/* Banner Compacto de Recorrida de Campo */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/30 text-white shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-400 block">
                      Modo Tablet / Móvil
                    </span>
                    <h3 className="text-sm font-black text-white">Estación de Recorrida Rápida</h3>
                  </div>
                </div>
                <Link
                  to="/trials-lite"
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] uppercase rounded-xl transition flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Cargar</span>
                </Link>
              </div>
            </div>

            {/* Panel Unificado con Tabs: Lotes sin Monitoreo vs Actividad Reciente */}
            <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRightFeedTab('risk')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                      rightFeedTab === 'risk'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <AlertCircle size={12} />
                    <span>Sin Monitoreo ({plotsAtRisk.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightFeedTab('activity')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
                      rightFeedTab === 'activity'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Activity size={12} />
                    <span>Últimos Registros</span>
                  </button>
                </div>
              </div>

              {rightFeedTab === 'risk' ? (
                <div className="space-y-2">
                  {plotsAtRisk.length === 0 ? (
                    <div className="py-6 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <ShieldCheck className="mx-auto text-emerald-500 mb-1" size={22} />
                      <p className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                        Todos los lotes monitoreados al día
                      </p>
                    </div>
                  ) : (
                    plotsAtRisk.map(p => {
                      const loc = locations.find(l => l.id === p.locationId);
                      const latest = getLatestRecord(p.id);
                      return (
                        <div
                          key={p.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <Link to={`/plots/${p.id}`} className="min-w-0 flex-1 group">
                            <h4 className="font-mono font-black text-slate-900 dark:text-white text-xs truncate uppercase group-hover:text-emerald-600">
                              {p.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">
                              {loc?.name || 'Establecimiento'} · Último: {latest ? latest.date : 'Sin datos'}
                            </p>
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              openPushComposerDrawer({
                                title: `📋 Requerimiento de Monitoreo: ${p.name}`,
                                body: `La parcela ${p.name} lleva más de 7 días sin carga biométrica. Programar recorrida técnica y registrar estado fenológico.`,
                                plotId: p.id,
                                severity: 'warning'
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white text-[10px] font-black uppercase flex items-center gap-1 transition shrink-0 cursor-pointer"
                            title="Emitir Push al responsable de la parcela"
                          >
                            <Send size={10} />
                            <span>Push</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                  {trialRecords.length > 0 ? (
                    trialRecords.slice(0, 5).map((act, idx) => {
                      const plot = plots.find(p => p.id === act.plotId);
                      return (
                        <Link
                          key={idx}
                          to={plot ? `/plots/${plot.id}` : '/trials-lite'}
                          className="block p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-400 transition"
                        >
                          <div className="flex justify-between items-center text-[10px] font-mono mb-0.5">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase">
                              {act.stage || 'Muestreo'}
                            </span>
                            <span className="text-slate-400">{act.date}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {plot?.name || 'Registro Técnico'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <ArrowUpRight size={10} className="text-emerald-500" />
                            <span>Altura: {act.plantHeight || 0} cm</span>
                            <span>·</span>
                            <span>Vigor: {act.vigor || 8}/10</span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">Sin actividad reciente</div>
                  )}
                </div>
              )}

              <Link
                to="/plots"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5"
              >
                <span>Ver Todas las Parcelas</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {/* Tarjeta Lateral de Gestión de Ciclo & Huella Hídrica Rápida */}
            <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <CloudRain size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      Huella Hídrica & Ciclo por Lote
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Lluvia continua + Cierre de ciclo al cosechar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('water')}
                  className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Ver Todo →
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {plotWaterFootprintList.slice(0, 4).map(item => (
                  <div
                    key={item.plot.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 font-mono"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/plots/${item.plot.id}`}
                        className="text-xs font-black text-slate-900 dark:text-white hover:text-sky-600 truncate block uppercase"
                      >
                        {item.plot.name}
                      </Link>
                      <span className="text-[10px] text-slate-500 block">
                        🌧️ {item.rainMm} mm ({item.greenWaterM3Ha} m³/ha) • 💧 {item.blueWaterM3Ha} m³/ha
                      </span>
                    </div>
                    {item.plot.status === 'Activa' && (
                      <button
                        type="button"
                        onClick={() => {
                          setClosingPlot(item.plot);
                          setClosureDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-500/20 text-[9.5px] font-bold uppercase shrink-0 transition cursor-pointer"
                        title="Completar y cerrar el ciclo de esta parcela (Pasa a Cosechada y sale del tablero activo)"
                      >
                        Cerrar Ciclo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: HUELLA HÍDRICA CONTINUA & GESTIÓN DE CICLOS POR PARCELA */}
      {activeSection === 'water' && (
        <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-500/20">
                <CloudRain size={22} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Registro Continuo de Lluvias & Huella Hídrica por Parcela (Campaña {activeCampaign})
                </h2>
                <p className="text-xs text-slate-500">
                  Pluviómetro satelital automatizado (Open-Meteo ERA5/GFS) + Riego suplementario y cierre operativo de ciclo por socio.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncNetworkRainfall}
                disabled={isSyncingGlobalRainfall}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isSyncingGlobalRainfall ? 'animate-spin' : ''} />
                <span>{isSyncingGlobalRainfall ? 'Sincronizando Red...' : 'Sincronizar Lluvias Ahora'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono tabular-nums">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Parcela & Socio</th>
                  <th className="px-4 py-3.5">Siembra & Estado</th>
                  <th className="px-4 py-3.5 text-right">Agua Verde (Lluvia)</th>
                  <th className="px-4 py-3.5 text-right">Agua Azul (Riego)</th>
                  <th className="px-4 py-3.5 text-right">Huella Hídrica (m³/ha)</th>
                  <th className="px-4 py-3.5 text-right">Volumen Lote (m³)</th>
                  <th className="px-4 py-3.5 text-right">Acciones de Ciclo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plotWaterFootprintList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No hay parcelas registradas para el filtro actual.
                    </td>
                  </tr>
                ) : (
                  plotWaterFootprintList.map(item => (
                    <tr key={item.plot.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/plots/${item.plot.id}`}
                          className="font-black text-slate-900 dark:text-white hover:text-sky-600 uppercase block"
                        >
                          {item.plot.name}
                        </Link>
                        <span className="text-[10px] text-slate-400 block">
                          {item.loc?.name || 'Campo'} • Socio: {item.socio?.name || item.plot.ownerName || 'Red HempC'} ({item.areaHa} ha)
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-700 dark:text-slate-300 font-bold block">
                          Siembra: {item.plot.sowingDate}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          ● {item.plot.status} {item.lastRainDate ? `• Últ. lluvia: ${item.lastRainDate}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <strong className="text-sky-600 dark:text-sky-400">{item.greenWaterM3Ha} m³/ha</strong>
                        <span className="text-[10px] text-slate-400 block">
                          {item.rainMm} mm ({item.rainEventsCount} lluvias)
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <strong className="text-emerald-600 dark:text-emerald-400">{item.blueWaterM3Ha} m³/ha</strong>
                        <span className="text-[10px] text-slate-400 block">{item.irrigMm} mm</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{item.totalWaterM3Ha} m³/ha</strong>
                        <span className="text-[10px] text-slate-400 block">{item.completionPct}% del ciclo</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white">
                        {item.totalVolumeM3.toLocaleString()} m³
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/plots/${item.plot.id}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase"
                          >
                            Pluviómetro
                          </Link>
                          {item.plot.status === 'Activa' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setClosingPlot(item.plot);
                                setClosureDate(new Date().toISOString().split('T')[0]);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Cerrar Ciclo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reopenPlotCycle(item.plot.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: SATELITAL NDVI */}
      {activeSection === 'satellite' && (
        <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                <Satellite size={22} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Alertas Satelitales NDVI (Copernicus Sentinel-2)
                </h2>
                <p className="text-xs text-slate-500">
                  Detección automática de anomalías: suelo descubierto (&lt;0.20) o vigor foliar superior (&gt;0.70).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {criticalLowAlerts.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
                  {criticalLowAlerts.length} Crítico Bajo
                </span>
              )}
              {criticalHighAlerts.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                  {criticalHighAlerts.length} Vigor Alto
                </span>
              )}
              <button
                onClick={syncNDVITasks}
                disabled={isSyncingTasks}
                className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw size={12} className={isSyncingTasks ? 'animate-spin text-emerald-600' : ''} />
                <span>Sincronizar Labores</span>
              </button>
            </div>
          </div>

          {syncedMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{syncedMessage}</span>
            </div>
          )}

          {criticalAlerts.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <ShieldCheck className="mx-auto text-emerald-500 mb-2" size={28} />
              <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                Todos los lotes presentan vigor equilibrado (0.20 - 0.70 NDVI).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalAlerts.map(alert => {
                const assignedTask = getTaskForAlert(alert);
                const isLow = alert.isCriticalLow;
                return (
                  <div
                    key={alert.plotId}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isLow 
                        ? 'bg-red-50/30 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40' 
                        : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-black ${
                            isLow ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            <span className="text-[8px] uppercase">NDVI</span>
                            <span className="text-base leading-none">{alert.ndvi.toFixed(2)}</span>
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase">
                              {alert.plotName}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {alert.stage} · {alert.date}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {alert.description}
                      </p>

                      <div className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px]">
                        <span className="font-bold text-slate-400 uppercase block text-[9px]">Acción Recomendada:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{alert.suggestedAction}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickPushNDVIAlert(alert)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer"
                        >
                          <Send size={10} />
                          <span>Push</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAlertEmail(alert)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer"
                        >
                          <Mail size={10} />
                          <span>Mail</span>
                        </button>
                        <button
                          onClick={() => {
                            const plot = plots.find(p => p.id === alert.plotId);
                            if (!plot) return;
                            const variety = varieties.find(v => v.id === plot.varietyId);
                            const trials = trialRecords.filter(t => t.plotId === plot.id);
                            const passes = generateDetailedSatellitePasses(plot, variety, trials);
                            exportNDVITimeSeriesPDF(plot, variety, passes, trials);
                          }}
                          className="px-2 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Download size={10} />
                          <span>PDF</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {assignedTask && (
                          <Link
                            to="/tasks"
                            className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold"
                          >
                            Labor
                          </Link>
                        )}
                        <Link
                          to={`/plots/${alert.plotId}`}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold uppercase"
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

      {/* PESTAÑA: SENASA & FITOSANITARIO */}
      {activeSection === 'senasa' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Trazabilidad de Insumos & Normativa SENASA
                  </h2>
                  <p className="text-xs text-slate-500">
                    Auditoría digital de fertilizantes, fitosanitarios y períodos de carencia pre-cosecha.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/phytosanitary"
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5"
                >
                  <Package size={14} />
                  <span>Abrir Cuaderno Fitosanitario</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {agrochemicalApps.slice(0, 8).map(app => (
                <div
                  key={app.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono font-black text-slate-900 dark:text-white uppercase text-xs block">
                        {app.plotName}
                      </span>
                      <h4 className="font-black text-purple-700 dark:text-purple-300 text-xs mt-0.5">
                        {app.productName}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {app.senasaRegisterNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Lote: {app.batchNumber}</span>
                    <span className="font-bold">{app.dosagePerHa} {app.dosageUnit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: RENDIMIENTO & COSECHA */}
      {activeSection === 'yield' && (
        <YieldAndInputConsumptionWidget />
      )}

      {/* PESTAÑA: FINANZAS & COSTOS */}
      {activeSection === 'finances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                <DollarSign size={22} />
              </div>
              <div>
                <h3 className="font-mono font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                  Costos Operativos & Proyección Financiera ({liveFinancialSummary.totalAreaHa} ha)
                </h3>
                <p className="text-xs text-slate-500">
                  Consolidado en tiempo real de labores culturales, insumos y margen bruto cooperativo.
                </p>
              </div>
            </div>

            <Link
              to="/finances"
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-mono font-bold uppercase flex items-center gap-1.5"
            >
              <span>Abrir Módulo de Finanzas & Auditoría</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Costo Directo Total</span>
              <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                ${liveFinancialSummary.totalDirectCostUsd.toLocaleString()} USD
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">VBP Proyectado</span>
              <p className="text-xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
                ${liveFinancialSummary.totalGrossRevenueUsd.toLocaleString()} USD
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Margen Neto Operativo</span>
              <p className="text-xl font-black font-mono text-emerald-600 mt-1">
                +${liveFinancialSummary.netMarginUsd.toLocaleString()} USD
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">ROI Estimado</span>
              <p className="text-xl font-black font-mono text-purple-600 mt-1">
                +{liveFinancialSummary.avgRoiPct}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: LICENCIAS & INTEGRIDAD */}
      {activeSection === 'licenses' && (
        <DashboardLicenseIntegritySummary />
      )}

      {/* TOAST DE NOTIFICACIÓN */}
      {emailAlertToast && emailAlertToast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 max-w-md">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase text-emerald-400">
                {emailAlertToast.message}
              </p>
              <p className="text-[11px] text-slate-300 truncate">
                Destino: {emailAlertToast.sentTo} ({emailAlertToast.via})
              </p>
            </div>
            <button
              onClick={() => setEmailAlertToast(null)}
              className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE DESPACHO DE ALERTA AGRONÓMICA POR CORREO */}
      {selectedAlertForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 relative animate-in zoom-in-95">
            <button
              onClick={() => setSelectedAlertForEmail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-600 text-white p-2.5 rounded-2xl shadow-lg shadow-rose-900/20">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Notificar Alerta al Productor
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Despacho formal vía notificaciones@hempc.com.ar
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Lote / Parcela:</span>
                <span className="font-black text-slate-800 dark:text-white uppercase">{selectedAlertForEmail.plotName}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Destinatario (Nombre) *
                  </label>
                  <input
                    type="text"
                    value={alertRecipientName}
                    onChange={e => setAlertRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Correo Electrónico Destino *
                  </label>
                  <input
                    type="email"
                    value={alertRecipientEmail}
                    onChange={e => setAlertRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={alertSubject}
                  onChange={e => setAlertSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Diagnóstico & Recomendación
                </label>
                <textarea
                  rows={3}
                  value={alertDetails}
                  onChange={e => setAlertDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForEmail(null)}
                  className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendAlertEmail}
                  disabled={isSendingAlertEmail || !alertRecipientEmail.trim()}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  {isSendingAlertEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{isSendingAlertEmail ? 'Enviando...' : 'Despachar Alerta'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA COMPLETAR Y CERRAR CICLO DE PARCELA (COSECHA) */}
      {closingPlot && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Archive size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                    Cerrar Ciclo & Archivar Parcela
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Campaña {activeCampaign} • {closingPlot.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClosingPlot(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseCycle} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                Al confirmar el cierre de ciclo, la parcela pasará a estado <strong>Cosechada</strong>, consolidará su Huella Hídrica final y <strong>desaparecerá del Dashboard Operativo Activo</strong>, quedando resguardada en el archivo histórico de la campaña.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Fecha de Cierre / Cosecha
                  </label>
                  <input
                    type="date"
                    required
                    value={closureDate}
                    onChange={e => setClosureDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Rinde Cosechado (kg tot.)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 1850"
                    value={closureYieldKg}
                    onChange={e => setClosureYieldKg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Acta Técnica / Observaciones de Cierre
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Corte y enfardado finalizado con humedad 13%. Lote liberado para barbecho..."
                  value={closureNotes}
                  onChange={e => setClosureNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingPlot(null)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isClosingCycle}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isClosingCycle ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Confirmar Cierre de Ciclo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
