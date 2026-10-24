import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Calendar, Clock, Tractor, CheckCircle2, Lock, Unlock, FileText,
  Printer, ShieldCheck, Sprout, MapPin, Award, UserCheck, AlertTriangle,
  ScanBarcode, QrCode, Droplets, Scale, Layers, RefreshCw
} from 'lucide-react';
import { Plot, Location, Variety, Client, SeedBatch, Task } from '../types';
import { useAppContext } from '../context/AppContext';
import { isCentralAdminOrSupervisor } from '../src/utils/structurePermissions';
import { BarcodeSVG } from './BarcodeSVG';

interface PlotCycleClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: Plot | null;
  location?: Location;
  variety?: Variety;
  client?: Client;
  seedBatch?: SeedBatch;
  initialTab?: 'form' | 'document';
}

export const PlotCycleClosureModal: React.FC<PlotCycleClosureModalProps> = ({
  isOpen,
  onClose,
  plot: initialPlot,
  initialTab
}) => {
  const {
    plots,
    locations,
    varieties,
    clients,
    seedBatches,
    tasks,
    hydricRecords,
    usersList,
    currentUser,
    closePlotCycle,
    reopenPlotCycle
  } = useAppContext();

  // Obtener siempre la versión más fresca de la parcela desde el contexto
  const plot = useMemo(
    () => (initialPlot ? plots.find(p => p.id === initialPlot.id) || initialPlot : null),
    [plots, initialPlot]
  );

  const isCentralAdmin = isCentralAdminOrSupervisor(currentUser);
  const isConfirmed = Boolean(plot?.closureConfirmed || plot?.status === 'Cosechada');
  const isLockedForCurrentUser = isConfirmed && !isCentralAdmin;

  const [activeTab, setActiveTab] = useState<'form' | 'document'>('form');
  const [operationMode, setOperationMode] = useState<'confirm' | 'schedule'>('confirm');
  const [closedDate, setClosedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closedTime, setClosedTime] = useState<string>('16:00');
  const [harvestYieldKg, setHarvestYieldKg] = useState<string>('');
  const [machinery, setMachinery] = useState<string>('Cosechadora Axial John Deere S760 / Segadora Acondicionadora');
  const [implement, setImplement] = useState<string>('Cabezal Draper 35 pies + Enfardadora Prismática');
  const [operatorName, setOperatorName] = useState<string>('');
  const [directCostUsd, setDirectCostUsd] = useState<number>(145);
  const [selectedLaborId, setSelectedLaborId] = useState<string>('auto');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const location = useMemo(() => locations.find(l => l.id === plot?.locationId), [locations, plot]);
  const variety = useMemo(() => varieties.find(v => v.id === plot?.varietyId), [varieties, plot]);
  const client = useMemo(() => clients.find(c => c.id === location?.clientId), [clients, location]);
  const seedBatch = useMemo(() => {
    if (!plot) return undefined;
    return (
      seedBatches.find(b => b.id === plot.seedBatchId) ||
      seedBatches.find(b => b.varietyId === plot.varietyId && (!b.materialType || b.materialType === 'seed')) ||
      seedBatches[0]
    );
  }, [seedBatches, plot]);

  // Labores agrícolas asociadas a esta parcela
  const plotLabors = useMemo(() => {
    if (!plot) return [];
    return tasks
      .filter(t => t.plotId === plot.id)
      .sort((a, b) => new Date(a.executionDate || a.dueDate).getTime() - new Date(b.executionDate || b.dueDate).getTime());
  }, [tasks, plot]);

  // Usuarios declarados del establecimiento para asignar operario / responsable de cosecha
  const establishmentUsers = useMemo(() => {
    if (!location?.clientId) return usersList;
    const filtered = usersList.filter(
      u => u.clientId === location.clientId || u.role === 'admin' || u.role === 'super_admin'
    );
    return filtered.length > 0 ? filtered : usersList;
  }, [usersList, location]);

  useEffect(() => {
    if (!plot || !isOpen) return;
    setFeedbackBanner(null);

    if (initialTab) {
      setActiveTab(initialTab);
    } else if (plot.closureConfirmed || plot.status === 'Cosechada') {
      setActiveTab('document');
    } else {
      setActiveTab('form');
    }

    const defaultDate =
      plot.closedAt ||
      plot.scheduledHarvestDate ||
      new Date().toISOString().split('T')[0];
    const defaultTime =
      plot.closedTime ||
      plot.scheduledHarvestTime ||
      new Date().toTimeString().slice(0, 5);

    setClosedDate(defaultDate);
    setClosedTime(defaultTime);
    setOperationMode(plot.isHarvestScheduled && plot.status !== 'Cosechada' ? 'schedule' : 'confirm');
    setHarvestYieldKg(plot.actualHarvestYieldKg !== undefined ? String(plot.actualHarvestYieldKg) : '420');
    setMachinery(plot.harvestMachinery || 'Cosechadora Axial John Deere S760 / Segadora Acondicionadora');
    setOperatorName(
      plot.harvestOperator ||
      plot.sowingResponsibleName ||
      currentUser?.name ||
      establishmentUsers[0]?.name ||
      'Jefe Operativo de Campo'
    );
    setSelectedLaborId(plot.linkedClosureLaborId || 'auto');
    setNotes(
      plot.closureNotes ||
      `Acta de finalización y homologación del ciclo de siembra en ${plot.name}. Conformidad fitosanitaria y trazabilidad INASE/ARICCAME verificada.`
    );
  }, [plot?.id, isOpen, initialTab]);

  if (!isOpen || !plot) return null;

  const campaignDisplay = plot.campaign || '2025/2026';

  // Código de Acta y Código de Barras (GS1 / Code-128) determinístico
  const computedCodes = (() => {
    let hash = 0;
    const seedStr = `${plot.id}-${campaignDisplay}`;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) % 1000000;
    }
    const suffix = String(Math.abs(hash)).padStart(6, '0');
    const actCode =
      plot.closureActCode ||
      `ACTA-SIEMBRA-${campaignDisplay.replace('/', '')}-${plot.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || suffix.slice(0, 4)}`;
    const barcode = plot.closureBarcode || `7798421${suffix}`;
    return { actCode, barcode };
  })();

  const seedLotCode = seedBatch?.batchCode || 'FUT-83-25-HEM';
  const seedMotherLot =
    seedBatch?.certificationNumber || (seedLotCode.includes('-REC-') ? seedLotCode.split('-REC-')[0] : seedLotCode);
  const seedRotuloInase = seedBatch?.labelSerialNumber || 'INASE-SERIE-2025-A0041928';

  // Días totales del ciclo desde fecha de siembra hasta fecha de cierre
  const sowDateStr = plot.sowingDate || '2026-01-13';
  const effectiveEndDateStr = plot.closedAt || closedDate || new Date().toISOString().split('T')[0];
  const totalCycleDays = Math.max(
    1,
    Math.round(
      (new Date(`${effectiveEndDateStr}T12:00:00`).getTime() - new Date(`${sowDateStr}T09:00:00`).getTime()) /
        86400000
    )
  );

  // Huella hídrica consolidada
  const waterFootprintM3Ha = (() => {
    if (plot.waterFootprintM3Ha) return plot.waterFootprintM3Ha;
    const recs = hydricRecords.filter(
      h => h.plotId === plot.id || (h.locationId === plot.locationId && !h.plotId)
    );
    const mm = recs.reduce((s, r) => s + Number(r.amountMm || 0), 0);
    return Number((mm * 10).toFixed(1));
  })();

  // URL pública de trazabilidad enriquecida con datos de cierre y código de barras
  const publicBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hemp-app-alpha.vercel.app';
  const traceUrl = (() => {
    const params = new URLSearchParams();
    params.set('name', plot.name);
    if (location?.name) params.set('loc', location.name);
    if (location?.province) params.set('prov', location.province);
    if (plot.coordinates?.lat) params.set('lat', String(plot.coordinates.lat));
    if (plot.coordinates?.lng) params.set('lng', String(plot.coordinates.lng));
    if (variety?.name) params.set('var', variety.name);
    if (plot.surfaceArea) params.set('ha', String(plot.surfaceArea));
    params.set('camp', campaignDisplay);
    params.set('status', plot.status);
    params.set('seedLot', seedLotCode);
    params.set('seedCert', seedMotherLot);
    params.set('seedRotulo', seedRotuloInase);
    params.set('actCode', computedCodes.actCode);
    params.set('barcode', computedCodes.barcode);
    if (plot.closedAt || closedDate) params.set('closedAt', plot.closedAt || closedDate);
    if (plot.closedTime || closedTime) params.set('closedTime', plot.closedTime || closedTime);
    if (plot.actualHarvestYieldKg || harvestYieldKg) {
      params.set('yieldKg', String(plot.actualHarvestYieldKg || harvestYieldKg));
    }
    if (plot.samplingResponsibleName) params.set('sampler', plot.samplingResponsibleName);
    if (plot.sowingResponsibleName) params.set('sower', plot.sowingResponsibleName);
    if (plot.technicalResponsibleName) params.set('inspector', plot.technicalResponsibleName);
    return `${publicBaseUrl}/#/trace/${encodeURIComponent(plot.id)}?${params.toString()}`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedForCurrentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const matchedUser = establishmentUsers.find(u => u.name === operatorName);
      const ok = await closePlotCycle(plot.id, {
        mode: operationMode,
        closedDate,
        closedTime,
        harvestYieldKg: harvestYieldKg ? Number(harvestYieldKg) : undefined,
        machinery,
        implement,
        operatorName,
        operatorUserId: matchedUser?.id,
        directCostUsd,
        linkedLaborId: selectedLaborId !== 'auto' ? selectedLaborId : undefined,
        notes
      });

      if (ok) {
        if (operationMode === 'confirm') {
          setFeedbackBanner({
            type: 'success',
            text: `Ciclo de siembra finalizado y homologado (${computedCodes.actCode}). Se actualizó la Labor Agrícola, el QR y el Código de Barras (${computedCodes.barcode}).`
          });
          setActiveTab('document');
        } else {
          setFeedbackBanner({
            type: 'success',
            text: `Cierre de ciclo / cosecha programado para el ${closedDate} a las ${closedTime} hs y vinculado a Labores Agrícolas.`
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenAsAdmin = async () => {
    if (!isCentralAdmin) return;
    setIsSubmitting(true);
    try {
      const ok = await reopenPlotCycle(plot.id, campaignDisplay);
      if (ok) {
        setFeedbackBanner({
          type: 'warning',
          text: 'El ciclo de la unidad productiva fue reabierto por Administración Central y desbloqueado.'
        });
        setActiveTab('form');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintOfficialAct = () => {
    const sourceElement = document.getElementById('printable-closure-act-sheet');
    if (!sourceElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '1000px';
    iframe.style.height = '1000px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .filter(tag => !(tag.tagName === 'STYLE' && tag.textContent?.includes('visibility: hidden')))
      .map(s => s.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Documento Homologado de Siembra y Cierre de Ciclo - ${plot.name}</title>
          ${headStyles}
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #0f172a !important; font-family: ui-sans-serif, system-ui, sans-serif !important; }
          </style>
        </head>
        <body>
          ${sourceElement.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1800);
      }
    }, 350);
  };

  // Identificar si la fecha elegida es retroactiva (hacia atrás) o futura (con anticipación)
  const todayIso = new Date().toISOString().split('T')[0];
  const isRetroactiveDate = closedDate < todayIso;
  const isFutureDate = closedDate > todayIso;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[140] p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[93vh] flex flex-col overflow-hidden">
        {/* CABECERA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isConfirmed
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              {isConfirmed ? <ShieldCheck size={26} /> : <Tractor size={26} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-200">{location?.name || 'Establecimiento'}</span>
                <span>·</span>
                <span>Unidad: <strong className="text-emerald-600 dark:text-emerald-400">{plot.name}</strong></span>
                <span>·</span>
                <span>Campaña {campaignDisplay}</span>
                {isConfirmed && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <Lock size={11} /> Homologado ({computedCodes.actCode})
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                Cierre de Ciclo / Cosecha & Documento de Siembra Homologado
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'form'
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar size={13} />
                <span>1. Fecha, Hora & Labor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('document')}
                className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'document'
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText size={13} />
                <span>2. Documento Homologado (QR & Barcode)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BANNER DE FEEDBACK */}
        {feedbackBanner && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shrink-0 ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{feedbackBanner.text}</span>
            </div>
            <button onClick={() => setFeedbackBanner(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* CUERPO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-5">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* AVISO DE REGLA DE BLOQUEO DE SEGURIDAD (PRODUCTOR VS ADMINISTRADOR) */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isConfirmed
                    ? isCentralAdmin
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-200'
                      : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-200'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isConfirmed ? (
                    <Lock size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <Unlock size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <p className="font-bold uppercase tracking-wide">
                      {isConfirmed
                        ? `Ciclo Finalizado y Confirmado el ${plot.closedAt} a las ${plot.closedTime || '16:00'} hs`
                        : 'Protocolo de Confirmación y Homologación de Cierre de Ciclo'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {isConfirmed
                        ? isCentralAdmin
                          ? 'Como Administrador Central, usted posee privilegios exclusivos para rectificar la fecha/hora confirmada o reabrir el ciclo productivo.'
                          : 'Una vez confirmada la fecha de cierre de ciclo, el productor no puede modificarla. Únicamente el Administrador Central puede rectificar o reabrir el lote.'
                        : 'Puede registrar una fecha retroactiva (hacia atrás), la fecha actual o programar con anticipación. Al confirmar la fecha, quedará bloqueada para el productor y se emitirá el Documento Oficial de Siembra Homologado.'}
                    </p>
                  </div>
                </div>

                {isConfirmed && isCentralAdmin && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleReopenAsAdmin}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-mono font-bold uppercase shrink-0 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Reabrir Ciclo (Admin)</span>
                  </button>
                )}
              </div>

              {/* 1. SELECCIÓN DE MODALIDAD: CONFIRMAR CIERRE vs PROGRAMAR CON ANTICIPACIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  disabled={isLockedForCurrentUser}
                  onClick={() => setOperationMode('confirm')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    operationMode === 'confirm'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      <span>Opción A · Confirmar y Homologar Cierre</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Genera Acta Oficial</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Permite ingresar fecha hacia atrás (retroactiva) o fecha actual, homologa la Labor Agrícola de Cosecha, bloquea la edición para el productor y emite el Documento de Siembra con QR y Código de Barras.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isLockedForCurrentUser}
                  onClick={() => setOperationMode('schedule')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    operationMode === 'schedule'
                      ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Calendar size={15} />
                      <span>Opción B · Programar con Anticipación</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Agenda Labor Agrícola</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Agenda con anticipación la fecha y hora prevista de cosecha/cierre y crea automáticamente la Orden de Trabajo en Labores Agrícolas manteniendo la unidad activa hasta su confirmación.
                  </p>
                </button>
              </div>

              {/* 2. FECHA Y HORA DE CIERRE / COSECHA (ADMITE FECHA HACIA ATRÁS Y ANTICIPADA) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700/70 pb-2.5">
                  <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={14} className="text-emerald-500" />
                    <span>Fecha, Hora Exacta y Rendimiento de Cierre / Cosecha</span>
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Siembra registrada: <strong>{sowDateStr}</strong> · Duración resultante: <strong className="text-emerald-600 dark:text-emerald-400">{totalCycleDays} DDS</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Fecha de Cierre / Cosecha (Pasada, Hoy o Futura) *
                    </label>
                    <input
                      type="date"
                      required
                      disabled={isLockedForCurrentUser}
                      value={closedDate}
                      onChange={e => setClosedDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      {isRetroactiveDate
                        ? '⏪ Fecha hacia atrás (registro retroactivo habilitado)'
                        : isFutureDate
                        ? '📅 Fecha futura (programación anticipada)'
                        : '📍 Fecha del día de hoy'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Hora Oficial en Lote (UTC-3) *
                    </label>
                    <input
                      type="time"
                      required
                      disabled={isLockedForCurrentUser}
                      value={closedTime}
                      onChange={e => setClosedTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      Quedará impresa en el Acta y Código QR
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Rendimiento Obtenido / Estimado (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled={isLockedForCurrentUser}
                      value={harvestYieldKg}
                      onChange={e => setHarvestYieldKg(e.target.value)}
                      placeholder="Ej: 450"
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      Superficie del lote: {plot.surfaceArea} {plot.surfaceUnit}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. VINCULACIÓN CON LABORES AGRÍCOLAS (PREPARACIÓN DE SUELO, SIEMBRA Y COSECHA) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700/70 pb-2.5">
                  <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Tractor size={14} className="text-emerald-500" />
                    <span>Vinculación Directa con Labores Agrícolas ({plotLabors.length} registradas en parcela)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    Sincronización Automática con Módulo de Labores y Costos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Orden de Labor Agrícola Asociada
                    </label>
                    <select
                      disabled={isLockedForCurrentUser}
                      value={selectedLaborId}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedLaborId(val);
                        const found = plotLabors.find(l => l.id === val);
                        if (found) {
                          if (found.machinery?.tractor) setMachinery(found.machinery.tractor);
                          if (found.machinery?.implement) setImplement(found.machinery.implement);
                          if (found.operator) setOperatorName(found.operator);
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      <option value="auto">
                        ⚡ Generar / Actualizar Automáticamente Labor de Cosecha y Cierre (BBCH 89-99)
                      </option>
                      {plotLabors.map(lab => (
                        <option key={lab.id} value={lab.id}>
                          🔗 Vincular a: {lab.title} ({lab.executionDate || lab.dueDate} · {lab.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Personal / Operario Declarado *
                    </label>
                    <select
                      disabled={isLockedForCurrentUser}
                      value={operatorName}
                      onChange={e => setOperatorName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      {establishmentUsers.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.jobTitle || u.structureRole || u.role})
                        </option>
                      ))}
                      {plot.sowingResponsibleName &&
                        !establishmentUsers.some(u => u.name === plot.sowingResponsibleName) && (
                          <option value={plot.sowingResponsibleName}>
                            {plot.sowingResponsibleName} (Jefe Operativo Siembra)
                          </option>
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Costo Operativo Labor (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={isLockedForCurrentUser}
                      value={directCostUsd}
                      onChange={e => setDirectCostUsd(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Tractor / Maquinaria de Cosecha
                    </label>
                    <input
                      type="text"
                      disabled={isLockedForCurrentUser}
                      value={machinery}
                      onChange={e => setMachinery(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Cabezal / Implemento Acoplado
                    </label>
                    <input
                      type="text"
                      disabled={isLockedForCurrentUser}
                      value={implement}
                      onChange={e => setImplement(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Dictamen Técnico y Observaciones de Cierre de Ciclo
                  </label>
                  <textarea
                    rows={2}
                    disabled={isLockedForCurrentUser}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* PIE DEL FORMULARIO */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                  <ScanBarcode size={15} className="text-emerald-600" />
                  <span>
                    Acta asignada: <strong className="text-slate-900 dark:text-white">{computedCodes.actCode}</strong> · Barcode: <strong>{computedCodes.barcode}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('document')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold uppercase transition cursor-pointer"
                  >
                    Ver Documento de Siembra
                  </button>

                  {!isLockedForCurrentUser && (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-5 py-2.5 rounded-xl text-white text-xs font-mono font-bold uppercase tracking-wider shadow-md transition flex items-center gap-2 cursor-pointer ${
                        operationMode === 'confirm'
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-amber-600 hover:bg-amber-500'
                      }`}
                    >
                      <CheckCircle2 size={15} />
                      <span>
                        {operationMode === 'confirm'
                          ? isConfirmed
                            ? 'Actualizar Homologación (Admin)'
                            : 'Confirmar Fecha y Emitir Documento Homologado'
                          : 'Guardar Programación de Cosecha'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          ) : (
            /* =================================================================
               PESTAÑA 2: DOCUMENTO OFICIAL DE SIEMBRA Y CIERRE HOMOLOGADO (A4)
               CON QR Y CÓDIGO DE BARRAS VECTORIAL ACTUALIZADOS
               ================================================================= */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>
                    Documento Oficial de Siembra y Finalización Homologada · QR y Código de Barras Sincronizados
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintOfficialAct}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir / Descargar Documento Oficial (PDF A4)</span>
                </button>
              </div>

              {/* HOJA IMPRIMIBLE A4 */}
              <div
                id="printable-closure-act-sheet"
                className="bg-white text-slate-950 p-6 sm:p-8 rounded-2xl border-2 border-slate-900 shadow-lg space-y-5 max-w-4xl mx-auto font-mono"
              >
                {/* ENCABEZADO DEL ACTA */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-slate-900">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                      <span>REPÚBLICA ARGENTINA · LEY 27.669 · TRAZABILIDAD OFICIAL ARICCAME / INASE</span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950">
                      DOCUMENTO DE SIEMBRA Y ACTA DE CIERRE DE CICLO HOMOLOGADO
                    </h1>
                    <p className="text-xs font-bold text-slate-700">
                      PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO · CUIT 30-71816113-0 · Red HempC
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-right shrink-0 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">N° Documento Homologado</span>
                    <strong className="text-xs font-black text-slate-950 block">{computedCodes.actCode}</strong>
                    <span className="text-[10px] font-bold text-emerald-800 block">
                      Estado: {isConfirmed ? 'CICLO FINALIZADO Y HOMOLOGADO' : plot.isHarvestScheduled ? 'COSECHA PROGRAMADA' : 'EN CURSO'}
                    </span>
                    <span className="text-[9px] text-slate-600 block">Campaña Agrícola {campaignDisplay}</span>
                  </div>
                </div>

                {/* SECCIÓN 1: ESTABLECIMIENTO Y UNIDAD PRODUCTIVA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-500 block">1. Establecimiento / Campo</span>
                    <strong className="text-sm font-black text-slate-950 block">{location?.name || 'Establecimiento Rural'}</strong>
                    <span className="text-[11px] text-slate-700 block">{location?.city}, {location?.province}</span>
                    <span className="text-[10px] text-slate-600 block">Lic. ARICCAME: <strong>{location?.ariccameLicenseNumber || 'EX-2024-134354227'}</strong></span>
                    <span className="text-[10px] text-slate-600 block">RENSPA: <strong>{location?.renspaNumber || 'En registro'}</strong></span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-500 block">2. Unidad Productiva (Parcela)</span>
                    <strong className="text-sm font-black text-slate-950 block">{plot.name}</strong>
                    <span className="text-[11px] text-slate-700 block">
                      Diseño: <strong>{plot.block || plot.type} {plot.replicate ? `· Rep. ${plot.replicate}` : ''}</strong>
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      Superficie: <strong>{plot.surfaceArea} {plot.surfaceUnit}</strong> · Marco: {plot.density || 48} pl/m²
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      GPS: {plot.coordinates?.lat?.toFixed(5) || '-'}°, {plot.coordinates?.lng?.toFixed(5) || '-'}°
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-emerald-800 block">3. Semilla INASE & Siembra</span>
                    <strong className="text-sm font-black text-emerald-950 block">{variety?.name || 'Futura 83'}</strong>
                    <span className="text-[10px] text-slate-800 block">
                      Lote Semilla: <strong>{seedMotherLot}</strong> ({seedLotCode})
                    </span>
                    <span className="text-[10px] text-emerald-900 font-bold block">
                      Rótulo Oficial: {seedRotuloInase}
                    </span>
                    <span className="text-[10px] text-slate-700 block">
                      Fecha de Siembra: <strong>{sowDateStr}</strong>
                    </span>
                  </div>
                </div>

                {/* SECCIÓN 2: PERSONAL INTERVINIENTE DECLARADO */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-700 block">
                    4. Nómina de Personal Técnico y Operativo Declarado en el Ciclo de Siembra
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Toma de Muestras en Lote</span>
                      <strong className="text-slate-900 block">{plot.samplingResponsibleName || seedBatch?.samplerName || 'Matias QUINTANA'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Jefe Operativo de Siembra</span>
                      <strong className="text-slate-900 block">{plot.sowingResponsibleName || 'Joaquin AREZO'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Director Técnico Agrónomo</span>
                      <strong className="text-slate-900 block">{plot.technicalResponsibleName || 'Ing. Agr. Julian PIZARRO'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Responsable Cierre / Cosecha</span>
                      <strong className="text-emerald-800 block">{plot.harvestOperator || operatorName}</strong>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 3: CERTIFICACIÓN DE CIERRE DE CICLO, FECHA/HORA Y LABOR AGRÍCOLA VINCULADA */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border-2 border-emerald-600 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                    <span className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-700" />
                      <span>5. Certificación de Finalización y Homologación del Ciclo de Siembra</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      🔒 Bloqueo Registral: Modificación exclusiva por Administración Central
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Fecha y Hora de Cierre</span>
                      <strong className="text-sm font-black text-slate-950 block">
                        {plot.closedAt || closedDate} · {plot.closedTime || closedTime} hs
                      </strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Ciclo Biológico Total</span>
                      <strong className="text-sm font-black text-slate-950 block">
                        {totalCycleDays} Días (DDS) · BBCH 89-99
                      </strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Rendimiento Homologado</span>
                      <strong className="text-sm font-black text-emerald-800 block">
                        {plot.actualHarvestYieldKg ?? (harvestYieldKg || '420')} kg totales
                      </strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Huella Hídrica Consolidada</span>
                      <strong className="text-sm font-black text-sky-800 block">
                        {waterFootprintM3Ha} m³/ha
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-800 bg-white p-2.5 rounded-lg border border-emerald-200">
                    <strong>Labor Agrícola de Cierre Vinculada:</strong> {plot.harvestMachinery || machinery} ({implement}) · Ejecutada por <strong>{plot.harvestOperator || operatorName}</strong> · Certificada por <strong>{plot.closedBy || currentUser?.name || 'Dirección Técnica'}</strong>.
                    <div className="text-slate-600 mt-1">{plot.closureNotes || notes}</div>
                  </div>
                </div>

                {/* SECCIÓN 4: RESUMEN DE LABORES AGRÍCOLAS DEL CICLO */}
                {plotLabors.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-700 block">
                      6. Registro Consolidado de Labores Agrícolas y Preparación de Suelo ({plotLabors.length})
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                          <tr>
                            <th className="px-3 py-1.5">Fecha</th>
                            <th className="px-3 py-1.5">Tipo de Labor</th>
                            <th className="px-3 py-1.5">Detalle / Maquinaria</th>
                            <th className="px-3 py-1.5">Operario</th>
                            <th className="px-3 py-1.5 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {plotLabors.slice(0, 6).map(lab => (
                            <tr key={lab.id}>
                              <td className="px-3 py-1.5 font-bold">{lab.executionDate || lab.dueDate}</td>
                              <td className="px-3 py-1.5">{lab.laborType || 'LABOR'}</td>
                              <td className="px-3 py-1.5 truncate max-w-[240px]">
                                {lab.title} {lab.machinery?.tractor ? `(${lab.machinery.tractor})` : ''}
                              </td>
                              <td className="px-3 py-1.5">{lab.operator || '-'}</td>
                              <td className="px-3 py-1.5 text-right font-bold text-emerald-800">{lab.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECCIÓN 5: TRAZABILIDAD OFICIAL ACTUALIZADA (QR + CÓDIGO DE BARRAS GS1/CODE-128 + FIRMAS) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-3 border-t-2 border-slate-900">
                  <div className="md:col-span-3 flex items-center gap-3">
                    <div className="p-1.5 bg-white rounded-xl border-2 border-slate-900 shrink-0">
                      <QRCodeSVG value={traceUrl} size={76} level="M" />
                    </div>
                    <div className="text-[9.5px] space-y-0.5">
                      <strong className="text-slate-950 font-black block uppercase">QR Trazabilidad</strong>
                      <span className="text-emerald-800 font-bold block">Lote: {seedMotherLot}</span>
                      <span className="text-slate-600 block">Acta: {computedCodes.actCode}</span>
                      <span className="text-slate-500 block">Escaneo móvil directo</span>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    <BarcodeSVG
                      value={computedCodes.barcode}
                      height={38}
                      barWidth={1.5}
                      label={`GS1 / CODE-128 · ${computedCodes.actCode}`}
                      className="w-full"
                    />
                  </div>

                  <div className="md:col-span-4 grid grid-cols-2 gap-2 text-[9px]">
                    <div className="p-2 border border-dashed border-slate-400 rounded-xl h-20 flex flex-col justify-between">
                      <span className="font-bold uppercase text-slate-600">Director Técnico</span>
                      <div className="border-t border-slate-300 pt-1 text-center text-slate-500 truncate">
                        {plot.technicalResponsibleName || 'Ing. Agr. Julian PIZARRO'}
                      </div>
                    </div>
                    <div className="p-2 border border-dashed border-slate-400 rounded-xl h-20 flex flex-col justify-between">
                      <span className="font-bold uppercase text-slate-600">Homologación Central</span>
                      <div className="border-t border-slate-300 pt-1 text-center text-slate-500 truncate">
                        {plot.closedBy || 'PatagonianC LTDA'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlotCycleClosureModal;
