import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  ShieldAlert, Sprout, Package,
  ArrowRight, Mail, Send, CheckCircle2, X,
  ChevronDown, ChevronUp,
  Check, Loader2, ShieldCheck,
  MapPin, Zap, LayoutGrid, List, Megaphone
} from 'lucide-react';
import {
  getPlotNDVIAlertStatus,
  getRegionalCatastropheAlerts,
  getPlotAgrochemicalApplications
} from '../src/services/agro40Service';
import { sendAgronomicAlertEmail } from '../src/services/emailNotificationService';
import { dispatchPushNotification } from '../src/services/pushNotificationService';

export type AlertCategory = 'all' | 'agronomica' | 'fitosanitaria' | 'stock';
export type AlertSeverity = 'all' | 'Crítica' | 'Advertencia' | 'Informativa';

export interface UnifiedAlert {
  id: string;
  category: 'agronomica' | 'fitosanitaria' | 'stock';
  severity: 'Crítica' | 'Advertencia' | 'Informativa';
  title: string;
  subtitle: string;
  targetName: string;
  description: string;
  suggestedAction: string;
  date: string;
  sourceTag: string;
  actionUrl: string;
  actionLabel: string;
  plotId?: string;
  producerEmail?: string;
  producerName?: string;
  metrics?: {
    label: string;
    value: string | number;
    unit?: string;
    isCritical?: boolean;
  }[];
}

interface AlertDashboardProps {
  onAlertSent?: (msg: string) => void;
  defaultCompact?: boolean;
  onOpenPushComposer?: (prefill?: { title?: string; body?: string; plotId?: string; severity?: 'critical' | 'warning' | 'info' }) => void;
}

export default function AlertDashboard({
  onAlertSent,
  defaultCompact = true,
  onOpenPushComposer
}: AlertDashboardProps) {
  const {
    plots,
    locations,
    varieties,
    trialRecords,
    resources,
    seedBatches,
    clients,
    usersList,
    currentUser
  } = useAppContext();

  const [selectedCategory, setSelectedCategory] = useState<AlertCategory>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'cards'>(defaultCompact ? 'compact' : 'cards');
  const [showAllRows, setShowAllRows] = useState(false);
  const [pushingAlertId, setPushingAlertId] = useState<string | null>(null);
  const [isBroadcastingPush, setIsBroadcastingPush] = useState(false);

  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ht_dismissed_alerts');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [selectedAlertForEmail, setSelectedAlertForEmail] = useState<UnifiedAlert | null>(null);
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('');
  const [alertRecipientName, setAlertRecipientName] = useState('');
  const [alertEmailSubject, setAlertEmailSubject] = useState('');
  const [alertEmailSeverity, setAlertEmailSeverity] = useState<'Crítica' | 'Advertencia' | 'Informativa'>('Crítica');
  const [alertEmailDetails, setAlertEmailDetails] = useState('');
  const [alsoTriggerPushOnEmail, setAlsoTriggerPushOnEmail] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    show: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);

  const allAlerts = useMemo<UnifiedAlert[]>(() => {
    const list: UnifiedAlert[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const getPlotProducer = (plotId?: string) => {
      if (!plotId) return { email: currentUser?.email || 'gaston.barea.moreno@gmail.com', name: 'Productor Asociado' };
      const plot = plots.find(p => p.id === plotId);
      const location = locations.find(l => l.id === plot?.locationId);
      const client = clients?.find(c => c.id === location?.clientId);
      const user = usersList?.find(u => (location?.clientId && u.clientId === location.clientId) || u.assignedPlotIds?.includes(plotId));
      return {
        email: client?.email || user?.email || currentUser?.email || 'gaston.barea.moreno@gmail.com',
        name: client?.contactName || client?.name || user?.name || 'Productor Asociado',
        plotName: plot?.name || 'Parcela'
      };
    };

    // A. ALERTAS AGRONÓMICAS: DESVÍOS NDVI SATELITAL SENTINEL-2
    try {
      plots.forEach(plot => {
        const variety = varieties.find(v => v.id === plot.varietyId);
        const trials = trialRecords.filter(t => t.plotId === plot.id);
        const a = getPlotNDVIAlertStatus(plot, variety, trials);
        if (a && a.isCritical) {
          const prod = getPlotProducer(a.plotId);
          list.push({
            id: `alert-ndvi-${a.plotId}`,
            category: 'agronomica',
            severity: a.isCriticalLow ? 'Crítica' : 'Advertencia',
            title: a.title,
            subtitle: `Vigor Satelital NDVI ${a.ndvi.toFixed(2)} (${a.isCriticalLow ? '< 0.20' : '> 0.70'})`,
            targetName: a.plotName,
            description: a.description,
            suggestedAction: a.suggestedAction,
            date: a.date,
            sourceTag: 'Sentinel-2 NDVI',
            actionUrl: `/plots/${a.plotId}`,
            actionLabel: 'Ver Lote',
            plotId: a.plotId,
            producerEmail: prod.email,
            producerName: prod.name,
            metrics: [
              { label: 'NDVI', value: a.ndvi.toFixed(2), isCritical: a.isCriticalLow },
              { label: 'Etapa', value: a.stage }
            ]
          });
        }
      });
    } catch (e) {
      console.warn('Error derivando alertas NDVI:', e);
    }

    // B. ALERTAS AGRONÓMICAS: RIESGOS CLIMÁTICOS TEMPRANOS & CATÁSTROFE (AGRO 4.0)
    try {
      const catastropheAlerts = getRegionalCatastropheAlerts(plots, locations);
      catastropheAlerts.forEach(c => {
        if (c.level === 'Alto' || c.level === 'Extremo' || c.score >= 50) {
          const prod = getPlotProducer(c.plotId);
          list.push({
            id: `alert-clima-${c.id}`,
            category: 'agronomica',
            severity: c.level === 'Alto' || c.level === 'Extremo' ? 'Crítica' : 'Advertencia',
            title: `Riesgo Climático: ${c.title}`,
            subtitle: `${c.region} (${c.province}) • Nivel ${c.level} (${c.score}/100)`,
            targetName: c.plotName,
            description: c.description,
            suggestedAction: c.preventiveMeasures[0] || 'Aplicar medidas preventivas de contingencia en lote.',
            date: c.date,
            sourceTag: 'Agro 4.0 Clima',
            actionUrl: c.plotId ? `/agro40?plotId=${c.plotId}` : '/agro40',
            actionLabel: 'Agro 4.0',
            plotId: c.plotId,
            producerEmail: prod.email,
            producerName: prod.name,
            metrics: [
              ...(c.satelliteTelemetry.temperatureC !== undefined ? [{ label: 'T° Actual', value: `${c.satelliteTelemetry.temperatureC}°C`, isCritical: c.satelliteTelemetry.temperatureC < 2 }] : []),
              ...(c.satelliteTelemetry.relativeHumidityPct !== undefined ? [{ label: 'Humedad', value: `${c.satelliteTelemetry.relativeHumidityPct}%` }] : []),
              ...(c.satelliteTelemetry.fwiIndex !== undefined ? [{ label: 'FWI Fuego', value: c.satelliteTelemetry.fwiIndex, isCritical: c.satelliteTelemetry.fwiIndex > 15 }] : [])
            ]
          });
        }
      });
    } catch (e) {
      console.warn('Error derivando alertas climáticas:', e);
    }

    // C. ALERTAS AGRONÓMICAS: LOTES ACTIVOS SIN MONITOREO (>7 DÍAS)
    plots.forEach(plot => {
      if (plot.status === 'Activa') {
        const plotTrials = trialRecords.filter(t => t.plotId === plot.id);
        const latest = plotTrials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const daysWithoutData = latest
          ? Math.floor((today.getTime() - new Date(latest.date).getTime()) / 86400000)
          : 99;

        if (daysWithoutData > 7) {
          const prod = getPlotProducer(plot.id);
          list.push({
            id: `alert-unmonitored-${plot.id}`,
            category: 'agronomica',
            severity: daysWithoutData > 14 ? 'Crítica' : 'Advertencia',
            title: 'Lote Activo sin Monitoreo Reciente',
            subtitle: latest ? `Último registro hace ${daysWithoutData} días (${latest.date})` : 'Sin registros de biometría cargados',
            targetName: plot.name,
            description: `La parcela se encuentra en ciclo biológico activo pero no cuenta con mediciones sanitarias o hídricas recientes.`,
            suggestedAction: 'Programar recorrida técnica y registrar biometría en Carga Rápida.',
            date: latest ? latest.date : todayStr,
            sourceTag: 'Monitoreo',
            actionUrl: `/plots/${plot.id}`,
            actionLabel: 'Monitorear',
            plotId: plot.id,
            producerEmail: prod.email,
            producerName: prod.name,
            metrics: [
              { label: 'Días Demora', value: `${daysWithoutData}d`, isCritical: daysWithoutData > 14 },
              { label: 'Superficie', value: `${plot.surfaceArea} ${plot.surfaceUnit}` }
            ]
          });
        }
      }
    });

    // D. ALERTAS FITOSANITARIAS: PLAGAS O ENFERMEDADES EN MONITOREO
    trialRecords.forEach(tr => {
      const isHighPest = (tr.pestsScore && tr.pestsScore >= 2);
      const isHighDisease = (tr.diseasesScore && tr.diseasesScore >= 2);
      if (isHighPest || isHighDisease) {
        const plot = plots.find(p => p.id === tr.plotId);
        if (plot && plot.status === 'Activa') {
          const prod = getPlotProducer(plot.id);
          const isCritical = (tr.pestsScore && tr.pestsScore >= 3) || (tr.diseasesScore && tr.diseasesScore >= 3);
          list.push({
            id: `alert-phyto-trial-${tr.id}`,
            category: 'fitosanitaria',
            severity: isCritical ? 'Crítica' : 'Advertencia',
            title: isHighDisease ? 'Incidencia Sanitaria / Patógeno Foliar' : 'Detección de Plagas en Parcela',
            subtitle: `Score Plagas: ${tr.pestsScore || 0}/5 • Enfermedades: ${tr.diseasesScore || 0}/5`,
            targetName: plot.name,
            description: `Se registró daño en canopia o patógenos durante el monitoreo del ${tr.date}. Etapa: ${tr.stage}.`,
            suggestedAction: 'Aplicar biocontrolador orgánico certificado (Neem / Trichoderma).',
            date: tr.date,
            sourceTag: 'Sanidad Vegetal',
            actionUrl: `/plots/${plot.id}`,
            actionLabel: 'Ficha Lote',
            plotId: plot.id,
            producerEmail: prod.email,
            producerName: prod.name,
            metrics: [
              { label: 'Plagas', value: `${tr.pestsScore || 0}/5`, isCritical: isHighPest },
              { label: 'Enfermedades', value: `${tr.diseasesScore || 0}/5`, isCritical: isHighDisease }
            ]
          });
        }
      }
    });

    // E. ALERTAS FITOSANITARIAS: PERÍODOS DE CARENCIA SENASA ACTIVOS
    try {
      const apps = getPlotAgrochemicalApplications(plots);
      apps.forEach(app => {
        if (app.safetyPeriodDays && app.safetyPeriodDays > 0) {
          const harvestSafety = new Date(app.harvestSafetyDate);
          const diffDays = Math.ceil((harvestSafety.getTime() - today.getTime()) / 86400000);
          if (diffDays >= 0) {
            const prod = getPlotProducer(app.plotId);
            list.push({
              id: `alert-carencia-${app.id}`,
              category: 'fitosanitaria',
              severity: 'Crítica',
              title: 'Período de Carencia SENASA Activo',
              subtitle: `${app.productName} (${app.activeIngredient})`,
              targetName: app.plotName,
              description: `Restricción fitosanitaria vigente. Faltan ${diffDays} días para vencimiento de carencia legal (${app.harvestSafetyDate}).`,
              suggestedAction: 'Bloquear orden de corte y cosecha en lote hasta cumplimiento del plazo.',
              date: app.date,
              sourceTag: 'SENASA Carencia',
              actionUrl: `/phytosanitary-book`,
              actionLabel: 'Libro SENASA',
              plotId: app.plotId,
              producerEmail: prod.email,
              producerName: prod.name,
              metrics: [
                { label: 'Restan', value: `${diffDays}d`, isCritical: true },
                { label: 'Carencia', value: `${app.safetyPeriodDays}d` }
              ]
            });
          }
        }
      });
    } catch (e) {
      console.warn('Error derivando períodos de carencia:', e);
    }

    // F. ALERTAS DE STOCK BAJO: SEMILLAS FISCALIZADAS INASE
    seedBatches.forEach(batch => {
      if (batch.isActive) {
        const variety = varieties.find(v => v.id === batch.varietyId);
        const percentLeft = batch.initialQuantity > 0 ? (batch.remainingQuantity / batch.initialQuantity) * 100 : 0;
        const isCriticalStock = batch.remainingQuantity <= 100 || percentLeft <= 15;
        const isLowStock = batch.remainingQuantity <= 300 || percentLeft <= 25;

        if (isLowStock || batch.remainingQuantity === 0) {
          list.push({
            id: `alert-stock-seed-${batch.id}`,
            category: 'stock',
            severity: (batch.remainingQuantity === 0 || isCriticalStock) ? 'Crítica' : 'Advertencia',
            title: batch.remainingQuantity === 0 ? 'Stock de Semilla Agotado' : 'Remanente Crítico Semilla INASE',
            subtitle: `Lote ${batch.batchCode} • ${variety?.name || 'Cáñamo'}`,
            targetName: `Bóveda INASE (${batch.batchCode})`,
            description: batch.remainingQuantity === 0
              ? `El lote ${batch.batchCode} de semilla C1 fiscalizada se agotó por completo.`
              : `Disponibilidad de ${batch.remainingQuantity} kg sobre ${batch.initialQuantity} kg iniciales (${percentLeft.toFixed(0)}%).`,
            suggestedAction: 'Gestionar reposición con semillero fiscalizado o reservar cuota prioritaria.',
            date: batch.purchaseDate || todayStr,
            sourceTag: 'Stock INASE',
            actionUrl: '/seed-batches',
            actionLabel: 'Ver Semillas',
            metrics: [
              { label: 'Remanente', value: `${batch.remainingQuantity} kg`, isCritical: isCriticalStock },
              { label: 'PG%', value: `${batch.germination || 90}%` }
            ]
          });
        }
      }
    });

    // G. ALERTAS DE STOCK BAJO: INSUMOS, FERTILIZANTES Y FITOSANITARIOS
    resources.forEach(res => {
      if (res.type !== 'Labor' && res.stock !== undefined && res.stock <= 40) {
        const isCritical = res.stock <= 15;
        list.push({
          id: `alert-stock-res-${res.id}`,
          category: 'stock',
          severity: isCritical ? 'Crítica' : 'Advertencia',
          title: `Stock Crítico Insumo: ${res.name}`,
          subtitle: `Categoría: ${res.type} • USD ${res.costPerUnit}/${res.unit}`,
          targetName: `Almacén Insumos (${res.name})`,
          description: `Stock disponible: ${res.stock} ${res.unit}. Insuficiente para labores programadas.`,
          suggestedAction: 'Emitir orden de reposición a proveedor homologado.',
          date: todayStr,
          sourceTag: 'Inventario',
          actionUrl: '/resources',
          actionLabel: 'Ver Insumos',
          metrics: [
            { label: 'Stock', value: `${res.stock} ${res.unit}`, isCritical: true },
            { label: 'Tipo', value: res.type }
          ]
        });
      }
    });

    return list;
  }, [plots, locations, varieties, trialRecords, resources, seedBatches, clients, usersList, currentUser]);

  const counts = useMemo(() => {
    const activeAlerts = allAlerts.filter(a => !dismissedAlertIds.includes(a.id));
    return {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === 'Crítica').length,
      warning: activeAlerts.filter(a => a.severity === 'Advertencia').length,
      agronomica: activeAlerts.filter(a => a.category === 'agronomica').length,
      fitosanitaria: activeAlerts.filter(a => a.category === 'fitosanitaria').length,
      stock: activeAlerts.filter(a => a.category === 'stock').length,
      dismissed: dismissedAlertIds.length
    };
  }, [allAlerts, dismissedAlertIds]);

  const visibleAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      const isDismissed = dismissedAlertIds.includes(alert.id);
      if (!showDismissed && isDismissed) return false;
      if (showDismissed && !isDismissed) return false;

      if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
      if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;

      return true;
    });
  }, [allAlerts, dismissedAlertIds, showDismissed, selectedCategory, selectedSeverity]);

  const displayedAlerts = useMemo(() => {
    if (showAllRows) return visibleAlerts;
    return visibleAlerts.slice(0, viewMode === 'compact' ? 5 : 6);
  }, [visibleAlerts, showAllRows, viewMode]);

  const toggleDismissAlert = (id: string) => {
    setDismissedAlertIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('ht_dismissed_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Emitir Push Instantáneo en 1 Clic para cualquier alerta sin abrir modales
  const handleQuickPush = async (alert: UnifiedAlert) => {
    setPushingAlertId(alert.id);
    try {
      await dispatchPushNotification({
        title: `${alert.severity === 'Crítica' ? '🚨' : '⚠️'} ${alert.title}`,
        body: `${alert.targetName}: ${alert.suggestedAction}`,
        category: alert.plotId ? 'plot_critical' : 'system',
        severity: alert.severity === 'Crítica' ? 'critical' : 'warning',
        plotId: alert.plotId,
        plotName: alert.targetName,
        targetUrl: alert.actionUrl,
        actionLabel: alert.actionLabel
      });

      setToastNotice({
        show: true,
        message: `Notificación Push enviada en vivo: "${alert.title}"`,
        sentTo: alert.targetName,
        via: 'Web Push SW'
      });

      if (onAlertSent) {
        onAlertSent(`Push emitido: ${alert.title} (${alert.targetName})`);
      }
    } finally {
      setTimeout(() => setPushingAlertId(null), 350);
    }
  };

  // Emitir Push Masivo de todas las alertas críticas visibles en 1 clic
  const handleBroadcastCriticalPush = async () => {
    const criticalList = visibleAlerts.filter(a => a.severity === 'Crítica').slice(0, 5);
    const targets = criticalList.length > 0 ? criticalList : visibleAlerts.slice(0, 3);
    if (targets.length === 0) return;

    setIsBroadcastingPush(true);
    try {
      for (const alert of targets) {
        await dispatchPushNotification({
          title: `🚨 ${alert.title}`,
          body: `${alert.targetName}: ${alert.suggestedAction}`,
          category: alert.plotId ? 'plot_critical' : 'system',
          severity: alert.severity === 'Crítica' ? 'critical' : 'warning',
          plotId: alert.plotId,
          plotName: alert.targetName,
          targetUrl: alert.actionUrl,
          actionLabel: alert.actionLabel
        });
      }
      setToastNotice({
        show: true,
        message: `Se emitieron ${targets.length} notificaciones Push críticas a los dispositivos activos.`,
        sentTo: 'Red Cooperativa HempC',
        via: 'Difusión Push'
      });
      if (onAlertSent) {
        onAlertSent(`Difusión Push enviada (${targets.length} alertas críticas)`);
      }
    } finally {
      setTimeout(() => setIsBroadcastingPush(false), 400);
    }
  };

  const handleOpenEmailModal = (alert: UnifiedAlert) => {
    setSelectedAlertForEmail(alert);
    setAlertRecipientEmail(alert.producerEmail || 'gaston.barea.moreno@gmail.com');
    setAlertRecipientName(alert.producerName || 'Productor Asociado');
    setAlertEmailSubject(`[${alert.severity.toUpperCase()}] ${alert.title} • ${alert.targetName}`);
    setAlertEmailSeverity(alert.severity);
    setAlertEmailDetails(
      `${alert.description}\n\nAcción Recomendada: ${alert.suggestedAction}\n\nOrigen: ${alert.sourceTag}`
    );
  };

  const handleSendAlertEmail = async () => {
    if (!selectedAlertForEmail || !alertRecipientEmail.trim()) return;
    setIsSendingEmail(true);
    try {
      if (alsoTriggerPushOnEmail) {
        await dispatchPushNotification({
          title: `🚨 ${selectedAlertForEmail.title}`,
          body: `${selectedAlertForEmail.targetName}: ${selectedAlertForEmail.suggestedAction}`,
          category: selectedAlertForEmail.plotId ? 'plot_critical' : 'system',
          severity: alertEmailSeverity === 'Crítica' ? 'critical' : 'warning',
          plotId: selectedAlertForEmail.plotId,
          plotName: selectedAlertForEmail.targetName,
          targetUrl: selectedAlertForEmail.actionUrl,
          actionLabel: selectedAlertForEmail.actionLabel
        });
      }

      const res = await sendAgronomicAlertEmail({
        toEmail: alertRecipientEmail.trim(),
        toName: alertRecipientName.trim() || 'Productor Asociado',
        alertTitle: alertEmailSubject,
        plotName: selectedAlertForEmail.targetName,
        alertDetails: alertEmailDetails,
        severity: alertEmailSeverity,
        actionUrl: `${window.location.origin}/#${selectedAlertForEmail.actionUrl}`,
        extraData: {
          category: selectedAlertForEmail.category,
          severity: alertEmailSeverity,
          sourceTag: selectedAlertForEmail.sourceTag,
          suggested_action: selectedAlertForEmail.suggestedAction
        }
      });

      setToastNotice({
        show: true,
        message: alsoTriggerPushOnEmail ? `${res.message} + Push emitido` : res.message,
        sentTo: alertRecipientEmail.trim(),
        via: res.deliveredVia
      });

      if (onAlertSent) {
        onAlertSent(`Alerta despachada a ${alertRecipientEmail.trim()}`);
      }

      setSelectedAlertForEmail(null);
    } catch (err: any) {
      setToastNotice({
        show: true,
        message: 'Error al despachar correo: ' + (err?.message || 'Reintentar'),
        sentTo: alertRecipientEmail.trim(),
        via: 'Error'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* 1. CABECERA EJECUTIVA COMPACTA CON DESPACHO PUSH 1-CLIC */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl shrink-0 ${
            counts.critical > 0
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              : counts.warning > 0
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}>
            <ShieldAlert size={18} className={counts.critical > 0 ? 'animate-pulse' : ''} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Radar de Alertas & Despacho Push
              </h2>

              {counts.critical > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {counts.critical} Crítica{counts.critical > 1 ? 's' : ''}
                </span>
              )}

              {counts.warning > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {counts.warning} Adv.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botonera Directa de Push y Visualización */}
        <div className="flex flex-wrap items-center gap-1.5">
          {onOpenPushComposer && (
            <button
              type="button"
              onClick={() => onOpenPushComposer()}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Megaphone size={12} />
              <span>Push Manual</span>
            </button>
          )}

          {visibleAlerts.length > 0 && (
            <button
              type="button"
              onClick={handleBroadcastCriticalPush}
              disabled={isBroadcastingPush}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Emitir notificación Push inmediata para las alertas críticas activas"
            >
              <Zap size={12} />
              <span>{isBroadcastingPush ? 'Emitiendo...' : 'Push Críticas (1-Clic)'}</span>
            </button>
          )}

          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`p-1 rounded-md transition cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Vista de Filas Compactas (Sin Scroll)"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1 rounded-md transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Vista de Tarjetas Detalladas"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDismissed(!showDismissed)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border cursor-pointer ${
              showDismissed
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <CheckCircle2 size={12} className={showDismissed ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">{showDismissed ? 'Atendidas' : `Archivo (${counts.dismissed})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={isCollapsed ? 'Expandir alertas' : 'Minimizar alertas'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS RÁPIDOS */}
      {!isCollapsed && (
        <div className="px-4 py-2 bg-slate-50/40 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {([
              { id: 'all', label: 'Todas', count: counts.total, icon: null },
              { id: 'agronomica', label: 'Agronómicas', count: counts.agronomica, icon: Sprout },
              { id: 'fitosanitaria', label: 'SENASA & Fito', count: counts.fitosanitaria, icon: ShieldCheck },
              { id: 'stock', label: 'Stock INASE/Insumos', count: counts.stock, icon: Package }
            ] as const).map(tab => {
              const Icon = tab.icon;
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 border cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                      : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon size={12} />}
                  <span>{tab.label}</span>
                  <span className="font-mono text-[10px] opacity-80">({tab.count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'Crítica', 'Advertencia'] as const).map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase transition cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {sev === 'all' ? 'Todas' : sev}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. LISTADO COMPACTO O TARJETAS */}
      {!isCollapsed && (
        <div className="p-3 md:p-4">
          {visibleAlerts.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-left">
                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase">
                  {showDismissed ? 'Sin alertas archivadas en esta vista' : 'Operación nominal — Sin alertas pendientes'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lotes, carencias SENASA y stock de semillas dentro de parámetros.
                </p>
              </div>
            </div>
          ) : viewMode === 'compact' ? (
            /* VISTA DE ALTA DENSIDAD (SIN EXCESO DE SCROLL) */
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              {displayedAlerts.map(alert => {
                const isCritical = alert.severity === 'Crítica';
                const isPushing = pushingAlertId === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={`px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      isCritical
                        ? 'bg-rose-50/30 dark:bg-rose-950/15'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                      <span className={`w-2 h-8 rounded-full shrink-0 ${isCritical ? 'bg-rose-600' : 'bg-amber-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                            {alert.sourceTag}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 truncate">
                            {alert.targetName}
                          </span>
                          {alert.metrics && alert.metrics.map((m, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300"
                            >
                              {m.label}: {m.value}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {alert.title}
                          </h4>
                          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">—</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {alert.suggestedAction}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Rápidas en 1 Clic: Push Directo | Mail | Ir al Lote | Atendida */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleQuickPush(alert)}
                        disabled={isPushing}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Emitir notificación Push inmediata a los dispositivos"
                      >
                        <Send size={11} />
                        <span>{isPushing ? 'Enviando...' : 'Push'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEmailModal(alert)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Despachar por Correo Electrónico + Push"
                      >
                        <Mail size={11} />
                        <span>Mail</span>
                      </button>

                      <Link
                        to={alert.actionUrl}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase flex items-center gap-1 transition"
                      >
                        <span>{alert.actionLabel}</span>
                        <ArrowRight size={10} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleDismissAlert(alert.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title={dismissedAlertIds.includes(alert.id) ? 'Restablecer alerta' : 'Marcar como atendida'}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA DE TARJETAS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedAlerts.map(alert => {
                const isCritical = alert.severity === 'Crítica';
                const isPushing = pushingAlertId === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                      isCritical
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                            {alert.sourceTag}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDismissAlert(alert.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          title="Marcar atendida"
                        >
                          <Check size={14} />
                        </button>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                        {alert.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-0.5">
                        <MapPin size={11} />
                        <span className="truncate">{alert.targetName}</span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickPush(alert)}
                          disabled={isPushing}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer"
                        >
                          <Send size={10} />
                          <span>{isPushing ? '...' : 'Push'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEmailModal(alert)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer"
                        >
                          <Mail size={10} />
                          <span>Mail</span>
                        </button>
                      </div>

                      <Link
                        to={alert.actionUrl}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        <span>{alert.actionLabel}</span>
                        <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botón Ver Más / Ver Menos para evitar scroll largo */}
          {visibleAlerts.length > (viewMode === 'compact' ? 5 : 6) && (
            <div className="mt-2.5 text-center">
              <button
                type="button"
                onClick={() => setShowAllRows(!showAllRows)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider transition cursor-pointer"
              >
                {showAllRows
                  ? 'Mostrar resumen compacto'
                  : `Ver las ${visibleAlerts.length - displayedAlerts.length} alertas restantes`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL DE DESPACHO DE ALERTA POR CORREO + PUSH */}
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
                  Despachar Alerta Oficial al Productor
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Correo Electrónico + Canal Web Push Simultáneo
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Objetivo / Lote:</span>
                <span className="font-black text-slate-800 dark:text-white uppercase">{selectedAlertForEmail.targetName}</span>
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
                  value={alertEmailSubject}
                  onChange={e => setAlertEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Diagnóstico & Acción Recomendada
                </label>
                <textarea
                  rows={3}
                  value={alertEmailDetails}
                  onChange={e => setAlertEmailDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Send size={13} className="text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Disparar también Notificación Push al navegador/móvil
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alsoTriggerPushOnEmail}
                  onChange={e => setAlsoTriggerPushOnEmail(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

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
                  disabled={isSendingEmail || !alertRecipientEmail.trim()}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  {isSendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{isSendingEmail ? 'Enviando...' : 'Despachar Ahora'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TOAST DE CONFIRMACIÓN */}
      {toastNotice?.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 dark:bg-slate-800 text-white border border-emerald-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="text-xs space-y-0.5 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black uppercase tracking-wider text-emerald-400">
                Notificación Emitida ({toastNotice.via})
              </span>
              <button
                onClick={() => setToastNotice(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-slate-200 font-medium">{toastNotice.message}</p>
            <p className="text-[10px] font-mono text-slate-400">Destino: {toastNotice.sentTo}</p>
          </div>
        </div>
      )}
    </div>
  );
}
