import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  AlertTriangle, ShieldAlert, Sprout, Package, Droplets,
  Calendar, ArrowRight, Mail, Send, CheckCircle2, X,
  ChevronDown, ChevronUp, Filter, Sparkles, Clock,
  ExternalLink, Eye, RefreshCw, ThermometerSnowflake,
  Flame, Sun, Wind, Check, Loader2, ShieldCheck,
  Radio, SlidersHorizontal, MapPin
} from 'lucide-react';
import {
  getPlotNDVIAlertStatus,
  getRegionalCatastropheAlerts,
  getPlotAgrochemicalApplications
} from '../src/services/agro40Service';
import { sendAgronomicAlertEmail } from '../src/services/emailNotificationService';
import { PlotNDVIAlert, CatastropheRiskAlert, AgrochemicalApplication } from '../types';

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
}

export default function AlertDashboard({ onAlertSent }: AlertDashboardProps) {
  const {
    plots,
    locations,
    varieties,
    trialRecords,
    resources,
    seedBatches,
    clients,
    usersList,
    currentUser,
    appName
  } = useAppContext();

  // Filtros de categoría y severidad
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  // Alertas atendidas (persisten en localStorage)
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

  // Modal de despacho de correo
  const [selectedAlertForEmail, setSelectedAlertForEmail] = useState<UnifiedAlert | null>(null);
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('');
  const [alertRecipientName, setAlertRecipientName] = useState('');
  const [alertEmailSubject, setAlertEmailSubject] = useState('');
  const [alertEmailSeverity, setAlertEmailSeverity] = useState<'Crítica' | 'Advertencia' | 'Informativa'>('Crítica');
  const [alertEmailDetails, setAlertEmailDetails] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    show: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);

  // 1. RECOLECCIÓN & CONSOLIDACIÓN DE ALERTAS MULTIDIMENSIONALES
  const allAlerts = useMemo<UnifiedAlert[]>(() => {
    const list: UnifiedAlert[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Helper para obtener datos del productor/cliente de una parcela
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
            sourceTag: 'Sentinel-2 Multiespectral',
            actionUrl: `/plots/${a.plotId}`,
            actionLabel: 'Ver Lote & Telemetría',
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
            sourceTag: 'Agro 4.0 Sensores & Clima',
            actionUrl: c.plotId ? `/agro40?plotId=${c.plotId}` : '/agro40',
            actionLabel: 'Protocolo Agro 4.0',
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
            description: `La parcela se encuentra en ciclo biológico activo pero no cuenta con mediciones sanitarias, hídricas o de fenología recientes.`,
            suggestedAction: 'Programar recorrida técnica presencial y registrar biometría en Carga Rápida.',
            date: latest ? latest.date : todayStr,
            sourceTag: 'Protocolo Operativo',
            actionUrl: `/plots/${plot.id}`,
            actionLabel: 'Cargar Monitoreo',
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
            subtitle: `Score Plagas: ${tr.pestsScore || 0}/5 • Score Enfermedades: ${tr.diseasesScore || 0}/5`,
            targetName: plot.name,
            description: `Se registró daño en canopia o presencia de patógenos durante el monitoreo del ${tr.date}. Etapa: ${tr.stage}.`,
            suggestedAction: 'Aplicar biocontrolador orgánico certificado (Neem / Trichoderma) e inspeccionar envés foliar.',
            date: tr.date,
            sourceTag: 'Monitoreo Fitosanitario',
            actionUrl: `/plots/${plot.id}`,
            actionLabel: 'Ficha Fitosanitaria',
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
              description: `Restricción fitosanitaria vigente. Faltan ${diffDays} días para que venza el período de carencia legal (apto reingreso/cosecha el ${app.harvestSafetyDate}).`,
              suggestedAction: 'Bloquear orden de corte y cosecha en lote hasta cumplimiento total del plazo.',
              date: app.date,
              sourceTag: 'Trazabilidad SENASA',
              actionUrl: `/plots/${app.plotId}`,
              actionLabel: 'Ver Registro Fitosanitario',
              plotId: app.plotId,
              producerEmail: prod.email,
              producerName: prod.name,
              metrics: [
                { label: 'Días Restantes', value: `${diffDays}d`, isCritical: true },
                { label: 'Carencia Total', value: `${app.safetyPeriodDays}d` }
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
            title: batch.remainingQuantity === 0 ? 'Stock de Semilla Totalmente Agotado' : 'Remanente Crítico de Semilla Fiscalizada',
            subtitle: `Lote ${batch.batchCode} • Rótulo ${batch.labelSerialNumber || 'S/N'} (${variety?.name || 'Cáñamo'})`,
            targetName: `Bóveda INASE / ${batch.storagePointId || 'Almacén Central'}`,
            description: batch.remainingQuantity === 0
              ? `El lote ${batch.batchCode} de semilla C1 fiscalizada ha consumido su totalidad para siembra.`
              : `Disponibilidad de solo ${batch.remainingQuantity} kg sobre ${batch.initialQuantity} kg iniciales (${percentLeft.toFixed(0)}% restante).`,
            suggestedAction: 'Gestionar reposición con el semillero fiscalizado habilitado o reservar cuota para parcelas prioritarias.',
            date: batch.purchaseDate || todayStr,
            sourceTag: 'INASE Registro de Semillas',
            actionUrl: '/seed-production',
            actionLabel: 'Gestionar Semillas',
            metrics: [
              { label: 'Remanente', value: `${batch.remainingQuantity} kg`, isCritical: isCriticalStock },
              { label: 'Poder Germ.', value: `${batch.germination || 90}%` }
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
          title: `Stock Crítico de Insumo: ${res.name}`,
          subtitle: `Categoría: ${res.type} • Costo: $${res.costPerUnit}/${res.unit}`,
          targetName: 'Almacén de Insumos & Biofábrica',
          description: `El stock actual de "${res.name}" es de apenas ${res.stock} ${res.unit}. No alcanza para cubrir las labores de fertilización y fertirriego programadas.`,
          suggestedAction: 'Emitir orden de compra a proveedor registrado para evitar desabastecimiento.',
          date: todayStr,
          sourceTag: 'Inventario Operativo',
          actionUrl: '/inventory',
          actionLabel: 'Ver Inventario',
          metrics: [
            { label: 'Stock Actual', value: `${res.stock} ${res.unit}`, isCritical: true },
            { label: 'Tipo', value: res.type }
          ]
        });
      }
    });

    return list;
  }, [plots, locations, varieties, trialRecords, resources, seedBatches, clients, usersList, currentUser]);

  // Contadores
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

  // Filtrado final
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

  // Handler para marcar como atendida / restablecer
  const toggleDismissAlert = (id: string) => {
    setDismissedAlertIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('ht_dismissed_alerts', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Abrir modal de despacho de correo
  const handleOpenEmailModal = (alert: UnifiedAlert) => {
    setSelectedAlertForEmail(alert);
    setAlertRecipientEmail(alert.producerEmail || 'gaston.barea.moreno@gmail.com');
    setAlertRecipientName(alert.producerName || 'Productor Asociado');
    setAlertEmailSubject(`[${alert.severity.toUpperCase()}] ${alert.title} • ${alert.targetName}`);
    setAlertEmailSeverity(alert.severity);
    setAlertEmailDetails(
      `${alert.description}

Acción Recomendada: ${alert.suggestedAction}

Origen: ${alert.sourceTag}`
    );
  };

  // Despachar correo vía sendAgronomicAlertEmail
  const handleSendAlertEmail = async () => {
    if (!selectedAlertForEmail || !alertRecipientEmail.trim()) return;
    setIsSendingEmail(true);
    try {
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
        message: res.message,
        sentTo: alertRecipientEmail.trim(),
        via: res.deliveredVia
      });

      if (onAlertSent) {
        onAlertSent(`Alerta despachada a ${alertRecipientEmail.trim()}`);
      }

      setSelectedAlertForEmail(null);
    } catch (err: any) {
      alert('Error despachando alerta por correo: ' + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
      {/* 1. BARRA SUPERIOR DE ALERTA OPERACIONAL */}
      <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-950/60 dark:via-slate-900/40 dark:to-slate-950/60">
        <div className="flex items-start md:items-center gap-3.5">
          <div className={`p-3 rounded-2xl shadow-sm shrink-0 transition-colors ${
            counts.critical > 0
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-rose-500/10'
              : counts.warning > 0
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            <ShieldAlert size={24} className={counts.critical > 0 ? 'animate-pulse' : ''} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>AlertDashboard</span>
                <span className="text-xs font-mono font-bold text-slate-400 lowercase tracking-normal">
                  v7.12.2
                </span>
              </h2>

              {counts.critical > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm shadow-rose-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {counts.critical} Crítica{counts.critical > 1 ? 's' : ''}
                </span>
              )}

              {counts.warning > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {counts.warning} Advertencia{counts.warning > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Vigilancia unificada de desvíos agronómicos, períodos fitosanitarios SENASA y stock de seguridad para productores.
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera: Colapsar / Atendidas */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <button
            type="button"
            onClick={() => setShowDismissed(!showDismissed)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              showDismissed
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Ver alertas atendidas o archivadas"
          >
            <CheckCircle2 size={13} className={showDismissed ? 'text-emerald-400' : 'text-slate-400'} />
            <span>{showDismissed ? 'Viendo Atendidas' : `Atendidas (${counts.dismissed})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={isCollapsed ? 'Expandir panel de alertas' : 'Minimizar panel de alertas'}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* 2. BARRA DE SEGMENTACIÓN POR CATEGORÍA (TABS) */}
      {!isCollapsed && (
        <div className="p-4 md:px-6 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Todas</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-700">
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('agronomica')}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                selectedCategory === 'agronomica'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sprout size={13} />
              <span>Agronómicas</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {counts.agronomica}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('fitosanitaria')}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                selectedCategory === 'fitosanitaria'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Fitosanitarias & SENASA</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                {counts.fitosanitaria}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('stock')}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                selectedCategory === 'stock'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Package size={13} />
              <span>Stock Bajo</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                {counts.stock}
              </span>
            </button>
          </div>

          {/* Filtro de Severidad */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <span className="text-[10px] uppercase font-mono tracking-wider hidden sm:inline">Severidad:</span>
            {(['all', 'Crítica', 'Advertencia'] as const).map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {sev === 'all' ? 'Todas' : sev}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. GRILLA DE TARJETAS DE ALERTA */}
      {!isCollapsed && (
        <div className="p-5 md:p-6">
          {visibleAlerts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                {showDismissed
                  ? 'No hay alertas archivadas o atendidas en este filtro'
                  : 'Sin alertas críticas en el sistema'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
                {showDismissed
                  ? 'Las alertas que marques como atendidas aparecerán en esta vista histórica.'
                  : 'Todos los lotes en producción, la sanidad fitosanitaria y los stocks de semillas e insumos operan dentro de los parámetros óptimos.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleAlerts.map(alert => {
                const isCritical = alert.severity === 'Crítica';
                const isAgronomic = alert.category === 'agronomica';
                const isPhyto = alert.category === 'fitosanitaria';
                const isStock = alert.category === 'stock';

                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 relative group ${
                      isCritical
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      {/* Cabecera de Tarjeta: Categoría, Severidad y Descarte */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isAgronomic
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : isPhyto
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}>
                            {isAgronomic && <Sprout size={10} />}
                            {isPhyto && <ShieldCheck size={10} />}
                            {isStock && <Package size={10} />}
                            {alert.category}
                          </span>

                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {alert.severity}
                          </span>

                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tight">
                            {alert.sourceTag}
                          </span>
                        </div>

                        {/* Botón Marcar Atendida */}
                        <button
                          type="button"
                          onClick={() => toggleDismissAlert(alert.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                          title={dismissedAlertIds.includes(alert.id) ? 'Restablecer como pendiente' : 'Marcar como atendida'}
                        >
                          <Check size={15} />
                        </button>
                      </div>

                      {/* Título & Parcela / Destino */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                          {alert.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <MapPin size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">{alert.targetName}</span>
                          <span className="opacity-50">·</span>
                          <span className="font-mono text-[10px]">{alert.date}</span>
                        </div>
                      </div>

                      {/* Descripción técnica */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium mt-2">
                        {alert.description}
                      </p>

                      {/* Métricas destacadas (si tiene) */}
                      {alert.metrics && alert.metrics.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-xs">
                          {alert.metrics.map((m, mIdx) => (
                            <div key={mIdx}>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">
                                {m.label}
                              </span>
                              <span className={`font-mono font-black text-sm ${
                                m.isCritical ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Acción sugerida */}
                      <div className="mt-3 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                          Acción Técnica Recomendada:
                        </span>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          {alert.suggestedAction}
                        </p>
                      </div>
                    </div>

                    {/* Acciones de Tarjeta: Despachar Correo & Navegación */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEmailModal(alert)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                        title="Despachar alerta formal por correo al productor asociado"
                      >
                        <Mail size={12} />
                        <span>Notificar Mail</span>
                      </button>

                      <Link
                        to={alert.actionUrl}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                      >
                        <span>{alert.actionLabel}</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL DE DESPACHO DE ALERTA POR CORREO */}
      {selectedAlertForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95">
            <button
              onClick={() => setSelectedAlertForEmail(null)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-rose-600 text-white p-3 rounded-2xl shadow-lg shadow-rose-900/20">
                <Mail size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  Despachar Alerta al Productor
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Notificación formal vía notificaciones@hempc.com.ar
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Información de Parcela / Lote */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Objetivo / Lote:</span>
                  <span className="font-black text-slate-800 dark:text-white uppercase">{selectedAlertForEmail.targetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Categoría:</span>
                  <span className="font-bold text-hemp-600 uppercase">{selectedAlertForEmail.category} ({selectedAlertForEmail.sourceTag})</span>
                </div>
              </div>

              {/* Selector de Severidad */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">
                  Nivel de Severidad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Crítica", "Advertencia", "Informativa"] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setAlertEmailSeverity(sev)}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition border cursor-pointer ${
                        alertEmailSeverity === sev
                          ? sev === "Crítica" ? "bg-red-600 text-white border-red-600 shadow" :
                            sev === "Advertencia" ? "bg-amber-500 text-white border-amber-500 shadow" :
                            "bg-blue-600 text-white border-blue-600 shadow"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Destinatario (Nombre) *
                  </label>
                  <input
                    type="text"
                    value={alertRecipientName}
                    onChange={e => setAlertRecipientName(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Nombre del productor"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Correo Electrónico Destino *
                  </label>
                  <input
                    type="email"
                    value={alertRecipientEmail}
                    onChange={e => setAlertRecipientEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="productor@campo.com.ar"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Asunto del Correo *
                  </label>
                  <input
                    type="text"
                    value={alertEmailSubject}
                    onChange={e => setAlertEmailSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Diagnóstico Técnico & Protocolo
                  </label>
                  <textarea
                    rows={4}
                    value={alertEmailDetails}
                    onChange={e => setAlertEmailDetails(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForEmail(null)}
                  className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSendingEmail || !alertRecipientEmail.trim()}
                  onClick={handleSendAlertEmail}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center transition disabled:opacity-50 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 size={15} className="animate-spin mr-2" />
                      Despachando Alerta...
                    </>
                  ) : (
                    <>
                      <Send size={15} className="mr-2" />
                      Despachar al Correo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TOAST FEEDBACK DE ALERTA DESPACHADA */}
      {toastNotice && toastNotice.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-md">
            <div className="bg-rose-600 text-white p-2 rounded-xl shrink-0">
              <Mail size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-rose-400">
                  Alerta Despachada
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {toastNotice.via === 'smtp' ? 'SMTP Real :2525' : 'Simulado'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5 font-medium">
                {toastNotice.sentTo}
              </p>
            </div>
            <button
              onClick={() => setToastNotice(null)}
              className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
