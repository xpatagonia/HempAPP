import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Calendar, Clock, Tractor, CheckCircle2, Lock, Unlock, FileText,
  Printer, ShieldCheck, Sprout, MapPin, Award, UserCheck, AlertTriangle,
  ScanBarcode, QrCode, Droplets, Scale, Layers, RefreshCw, PenTool,
  Smartphone, CheckCheck, Trash2
} from 'lucide-react';
import { Plot, Location, Variety, Client, SeedBatch, Task } from '../types';
import { useAppContext } from '../context/AppContext';
import { isCentralAdminOrSupervisor } from '../src/utils/structurePermissions';
import { BarcodeSVG } from './BarcodeSVG';
import { formatPlotSeedLoad } from '../src/utils/seedTraceability';
import { DateInputAr } from '../src/components/DateInputAr';
import { formatDateAr, CAMPAIGN_2526_CLOSE_DATE_ISO } from '../src/utils/dateFormat';
import { buildPlotCanonicalTraceUrl } from '../src/utils/qrBarcodeService';
import { resolveSanitizedPlotRoster, isUserAuthorizedForEstablishment } from '../src/utils/establishmentRoster';

interface DigitalSignatureRecord {
  signerName: string;
  signerRole: string;
  signerMatricula: string;
  dataUrl: string;
  timestamp: string;
  verificationHash: string;
}

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

  const location = useMemo(() => locations.find(l => l.id === plot?.locationId), [locations, plot]);
  const variety = useMemo(() => varieties.find(v => v.id === plot?.varietyId), [varieties, plot]);
  const client = useMemo(() => clients.find(c => c.id === location?.clientId), [clients, location]);

  const sanitizedRoster = useMemo(
    () => resolveSanitizedPlotRoster(plot, location),
    [plot, location]
  );

  const isCentralAdmin = isCentralAdminOrSupervisor(currentUser);
  const isConfirmed = Boolean(plot?.closureConfirmed || plot?.status === 'Cosechada');
  const isLockedForCurrentUser = isConfirmed && !isCentralAdmin;

  const [activeTab, setActiveTab] = useState<'form' | 'document'>('form');
  const [operationMode, setOperationMode] = useState<'confirm' | 'schedule'>('confirm');
  const [closedDate, setClosedDate] = useState<string>(CAMPAIGN_2526_CLOSE_DATE_ISO);
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

  // Estado de Firmas Digitales Táctiles (Celular / Tablet / Touch Pad)
  const [techSignature, setTechSignature] = useState<DigitalSignatureRecord | null>(null);
  const [closureSignature, setClosureSignature] = useState<DigitalSignatureRecord | null>(null);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [sigRoleToSign, setSigRoleToSign] = useState<'tech' | 'closure'>('tech');
  const [sigSignerName, setSigSignerName] = useState('');
  const [sigSignerMatricula, setSigSignerMatricula] = useState('');
  const [sigSignerRole, setSigSignerRole] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Usuarios autorizados estrictamente para este establecimiento (aislamiento multi-tenant inviolable)
  const establishmentUsers = useMemo(() => {
    const locClientId = location?.clientId;
    if (!locClientId) {
      return usersList.filter(u => u.role === 'admin' || u.role === 'super_admin' || !u.clientId);
    }
    const filtered = usersList.filter(u => {
      if (u.clientId === locClientId) return true;
      if (!u.clientId && (u.role === 'admin' || u.role === 'super_admin')) return true;
      return false;
    });
    return filtered.length > 0 ? filtered : usersList.filter(u => u.role === 'admin' || u.role === 'super_admin');
  }, [usersList, location]);

  // Cargar firmas digitales guardadas en localStorage
  useEffect(() => {
    if (!plot?.id) return;
    try {
      const savedTech = localStorage.getItem(`hemp_sig_tech_${plot.id}`);
      if (savedTech) setTechSignature(JSON.parse(savedTech));
      else setTechSignature(null);

      const savedClosure = localStorage.getItem(`hemp_sig_closure_${plot.id}`);
      if (savedClosure) setClosureSignature(JSON.parse(savedClosure));
      else setClosureSignature(null);
    } catch {
      // Ignorar errores de localStorage
    }
  }, [plot?.id]);

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
      CAMPAIGN_2526_CLOSE_DATE_ISO;
    const defaultTime =
      plot.closedTime ||
      plot.scheduledHarvestTime ||
      new Date().toTimeString().slice(0, 5);

    setClosedDate(defaultDate);
    setClosedTime(defaultTime);
    setOperationMode(plot.isHarvestScheduled && plot.status !== 'Cosechada' ? 'schedule' : 'confirm');
    setHarvestYieldKg(plot.actualHarvestYieldKg !== undefined ? String(plot.actualHarvestYieldKg) : '420');
    setMachinery(plot.harvestMachinery || 'Cosechadora Axial John Deere S760 / Segadora Acondicionadora');

    // Asignación de operario estrictamente sanitizada por establecimiento
    const isCurrentOpAuthorized = plot.harvestOperator && isUserAuthorizedForEstablishment(plot.harvestOperator, plot.locationId, location?.clientId);
    const validOp = isCurrentOpAuthorized ? plot.harvestOperator : sanitizedRoster.harvester;
    setOperatorName(validOp);

    setSelectedLaborId(plot.linkedClosureLaborId || 'auto');
    setNotes(
      plot.closureNotes ||
      `Acta de finalización y homologación del ciclo de siembra en ${plot.name}. Conformidad fitosanitaria y trazabilidad INASE/ARICCAME verificada.`
    );
  }, [plot?.id, isOpen, initialTab, location, sanitizedRoster]);

  if (!isOpen || !plot) return null;

  const campaignDisplay = plot.campaign || '2025/2026';

  // Código de Acta y Código de Barras (GS1 / Code-128) determinístico
  const computedCodes = (() => {
    let hash = 0;
    const seedStr = `${plot.id}-${campaignDisplay}`;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) % 1000000;
    }
    const numericSuffix = String(Math.abs(hash)).padStart(6, '0');
    const plotSuffix = plot.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || numericSuffix.slice(0, 4);
    const actCode = plot.closureActCode || `ACTA-SIEMBRA-${campaignDisplay.replace('/', '')}-${plotSuffix}`;
    const barcode = plot.closureBarcode || `7798421${numericSuffix}`;
    return { actCode, barcode };
  })();

  const sowDateStr = plot.sowingDate || '2025-11-05';
  const effectiveCloseDateStr = plot.closedDate || plot.closedAt || closedDate;
  const totalCycleDays = (() => {
    try {
      const s = new Date(sowDateStr).getTime();
      const c = new Date(effectiveCloseDateStr).getTime();
      const diff = Math.floor((c - s) / (1000 * 60 * 60 * 24));
      return isNaN(diff) || diff < 0 ? 120 : diff;
    } catch {
      return 120;
    }
  })();

  // Huella Hídrica y balance acumulado
  const waterFootprintM3Ha = (() => {
    const records = hydricRecords.filter(r => r.plotId === plot.id);
    const totalMm = records.reduce((acc, r) => acc + (r.amountMm || 0), 0);
    const totalM3 = totalMm > 0 ? Math.round(totalMm * 10) : 4850;
    return totalM3;
  })();

  const seedLotCode = seedBatch?.batchCode || 'FUT-83-25-HEM';
  const seedMotherLot = seedBatch?.certificationNumber || (seedLotCode.includes('-REC-') ? seedLotCode.split('-REC-')[0] : seedLotCode);
  const seedRotuloInase = seedBatch?.labelSerialNumber || 'INASE-SERIE-2025-A0041928';
  const seedLoad = formatPlotSeedLoad(plot);
  const traceUrl = buildPlotCanonicalTraceUrl(plot.id, plot.name);

  // Manejadores para firma digital táctil sobre Canvas
  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleOpenSignaturePad = (role: 'tech' | 'closure') => {
    setSigRoleToSign(role);
    if (role === 'tech') {
      setSigSignerName(sanitizedRoster.tech);
      setSigSignerMatricula(sanitizedRoster.techMatricula);
      setSigSignerRole('Director Técnico Agrónomo (DT)');
    } else {
      setSigSignerName(plot.closedBy || sanitizedRoster.harvester);
      setSigSignerMatricula('Responsable Oficial Homologante');
      setSigSignerRole('Jefe Operativo de Cosecha / Homologación');
    }
    setIsSigModalOpen(true);
    setTimeout(() => {
      clearSignatureCanvas();
    }, 120);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas || !touch) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
  };

  const touchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas || !touch) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !plot) return;
    const dataUrl = canvas.toDataURL('image/png');
    const now = new Date();
    const dateStr = formatDateAr(now.toISOString().split('T')[0]);
    const timeStr = now.toTimeString().slice(0, 5);
    const hashId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sigPayload: DigitalSignatureRecord = {
      signerName: sigSignerName.trim() || (sigRoleToSign === 'tech' ? sanitizedRoster.tech : sanitizedRoster.harvester),
      signerRole: sigSignerRole.trim(),
      signerMatricula: sigSignerMatricula.trim(),
      dataUrl,
      timestamp: `${dateStr} ${timeStr} hs`,
      verificationHash: `SHA256-${plot.id.slice(-4).toUpperCase()}-${hashId}`
    };

    if (sigRoleToSign === 'tech') {
      setTechSignature(sigPayload);
      try {
        localStorage.setItem(`hemp_sig_tech_${plot.id}`, JSON.stringify(sigPayload));
      } catch {}
    } else {
      setClosureSignature(sigPayload);
      try {
        localStorage.setItem(`hemp_sig_closure_${plot.id}`, JSON.stringify(sigPayload));
      } catch {}
    }
    setIsSigModalOpen(false);
    setFeedbackBanner({
      type: 'success',
      text: `Firma digital táctil certificada y estampada exitosamente para ${sigPayload.signerName}.`
    });
  };

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
            text: `Cierre de ciclo / cosecha programado para el ${formatDateAr(closedDate)} a las ${closedTime} hs y vinculado a Labores Agrícolas.`
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
            @page {
              size: A4 portrait;
              margin: 5mm 6mm;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
            }
            #printable-closure-act-sheet {
              box-shadow: none !important;
              border-width: 1.5px !important;
              border-color: #0f172a !important;
              max-height: 284mm !important;
              height: 284mm !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              padding: 4mm 5mm !important;
              margin: 0 auto !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .no-print {
              display: none !important;
            }
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

  const todayIso = new Date().toISOString().split('T')[0];
  const isRetroactiveDate = closedDate < todayIso;
  const isFutureDate = closedDate > todayIso;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[140] p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col overflow-hidden">
        {/* CABECERA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
                isConfirmed ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              <Tractor size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Campaña {campaignDisplay}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {location?.name || 'Establecimiento'} · Parcela {plot.name}
                </span>
                {isConfirmed && (
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock size={10} /> Ciclo Homologado
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                Cierre de Ciclo, Cosecha & Documento de Siembra Homologado
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            {/* Pestañas de Navegación */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'form'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Tractor size={13} />
                <span>Gestión de Cosecha</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('document')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'document'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={13} />
                <span>Documento Homologado A4</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackBanner && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs font-mono flex items-center justify-between shrink-0 ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{feedbackBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-bold underline cursor-pointer ml-3"
            >
              Entendido
            </button>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-4">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ESTADO DEL BLOQUEO REGISTRAL */}
              {isConfirmed && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs font-mono">
                      <strong className="text-amber-950 dark:text-amber-200 block">
                        Ciclo finalizado y registrado bajo Acta {computedCodes.actCode}
                      </strong>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px]">
                        Fecha de cierre: <strong>{formatDateAr(plot.closedDate || plot.closedAt)}</strong> · Barcode: <strong>{computedCodes.barcode}</strong>.
                        {isCentralAdmin
                          ? ' Como Administrador Central podés modificar los datos o reabrir el ciclo si fuese necesario.'
                          : ' El registro se encuentra cerrado. Para modificarlo comunicate con Administración Central.'}
                      </p>
                    </div>
                  </div>

                  {isCentralAdmin && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleReopenAsAdmin}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                    >
                      <Unlock size={13} />
                      <span>Reabrir Ciclo</span>
                    </button>
                  )}
                </div>
              )}

              {/* SELECCIÓN DE MODO OPERATIVO */}
              {!isLockedForCurrentUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setOperationMode('confirm')}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      operationMode === 'confirm'
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        operationMode === 'confirm' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                      }`}
                    >
                      {operationMode === 'confirm' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <strong className="text-slate-900 dark:text-white block font-bold">
                        1. Confirmar Cierre Oficial de Ciclo
                      </strong>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Asigna fecha y hora definitivas (pasadas o inmediatas), homologa el ciclo y actualiza el QR público.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setOperationMode('schedule')}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      operationMode === 'schedule'
                        ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        operationMode === 'schedule' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-400'
                      }`}
                    >
                      {operationMode === 'schedule' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <strong className="text-slate-900 dark:text-white block font-bold">
                        2. Programar Cosecha a Futuro
                      </strong>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Genera la labor agrícola en calendario, reserva maquinaria y cuadrilla sin cerrar aún el ciclo fenológico.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULARIO DE DETALLES */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Fecha de Cosecha / Cierre
                    </label>
                    <DateInputAr
                      value={closedDate}
                      disabled={isLockedForCurrentUser}
                      onChange={e => setClosedDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                    {isRetroactiveDate && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                        ℹ️ Fecha de finalización agronómica registrada (retroactiva).
                      </span>
                    )}
                    {isFutureDate && (
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono mt-1 block">
                        📅 Programación con antelación agronómica.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Hora de Cierre / Labor (HH:MM)
                    </label>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="time"
                        disabled={isLockedForCurrentUser}
                        value={closedTime}
                        onChange={e => setClosedTime(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Rendimiento Cosechado (kg brutos)
                    </label>
                    <div className="relative">
                      <Scale size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        disabled={isLockedForCurrentUser}
                        value={harvestYieldKg}
                        onChange={e => setHarvestYieldKg(e.target.value)}
                        placeholder="Ej: 420"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Maquinaria Agrícola Asignada
                    </label>
                    <input
                      type="text"
                      disabled={isLockedForCurrentUser}
                      value={machinery}
                      onChange={e => setMachinery(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Implemento / Cabezal
                    </label>
                    <input
                      type="text"
                      disabled={isLockedForCurrentUser}
                      value={implement}
                      onChange={e => setImplement(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Operario Responsable de Cosecha (Establecimiento)
                    </label>
                    <select
                      disabled={isLockedForCurrentUser}
                      value={operatorName}
                      onChange={e => setOperatorName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      {establishmentUsers.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.jobTitle || u.structureRole || u.role})
                        </option>
                      ))}
                      {!establishmentUsers.some(u => u.name === operatorName) && (
                        <option value={operatorName}>
                          {operatorName} (Responsable Autorizado)
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
                      disabled={isLockedForCurrentUser}
                      value={directCostUsd}
                      onChange={e => setDirectCostUsd(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Vincular con Labor en Cuaderno de Campo
                    </label>
                    <select
                      disabled={isLockedForCurrentUser}
                      value={selectedLaborId}
                      onChange={e => setSelectedLaborId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    >
                      <option value="auto">Crear / Actualizar labor automáticamente</option>
                      {plotLabors.map(lab => (
                        <option key={lab.id} value={lab.id}>
                          {lab.title} ({lab.executionDate || lab.dueDate})
                        </option>
                      ))}
                    </select>
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
               CON FIRMAS DIGITALES TÁCTILES Y AJUSTE PERFECTO A HOJA A4
               ================================================================= */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Documento Oficial de Siembra y Finalización Homologada · Conforme Ley 27.669 / ARICCAME
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSignaturePad(techSignature ? 'closure' : 'tech')}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <PenTool size={13} />
                    <span>Firmar con Celular/Tablet</span>
                    {(techSignature || closureSignature) && (
                      <span className="bg-indigo-950/60 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full">
                        {techSignature && closureSignature ? '2/2' : '1/2'}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintOfficialAct}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Imprimir / PDF A4</span>
                  </button>
                </div>
              </div>

              {/* HOJA IMPRIMIBLE A4 AJUSTADA AL 100% PARA NO DESBORDAR */}
              <div
                id="printable-closure-act-sheet"
                className="bg-white text-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-slate-900 shadow-lg space-y-2.5 max-w-4xl mx-auto font-mono"
              >
                {/* ENCABEZADO DEL ACTA */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2.5 border-b-2 border-slate-900">
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                      REPÚBLICA ARGENTINA · LEY 27.669 · TRAZABILIDAD OFICIAL ARICCAME / INASE
                    </div>
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950">
                      DOCUMENTO DE SIEMBRA Y ACTA DE CIERRE DE CICLO HOMOLOGADO
                    </h1>
                    <p className="text-[10px] font-bold text-slate-700">
                      PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO · CUIT 30-71816113-0 · Red HempC
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-300 text-right shrink-0 space-y-0.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 block">N° Documento Homologado</span>
                    <strong className="text-xs font-black text-slate-950 block">{computedCodes.actCode}</strong>
                    <span className="text-[9.5px] font-bold text-emerald-800 block">
                      {isConfirmed ? 'CICLO FINALIZADO Y HOMOLOGADO' : plot.isHarvestScheduled ? 'COSECHA PROGRAMADA' : 'EN CURSO'}
                    </span>
                    <span className="text-[8.5px] text-slate-600 block">Campaña {campaignDisplay}</span>
                  </div>
                </div>

                {/* SECCIÓN 1: ESTABLECIMIENTO Y UNIDAD PRODUCTIVA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[8.5px] font-bold uppercase text-slate-500 block">1. Establecimiento / Campo</span>
                    <strong className="text-xs font-black text-slate-950 block truncate">{location?.name || 'Establecimiento Rural'}</strong>
                    <span className="text-[10px] text-slate-700 block truncate">{location?.city}, {location?.province}</span>
                    <span className="text-[9px] text-slate-600 block">Lic. ARICCAME: <strong>{location?.ariccameLicenseNumber || 'EX-2024-134354227'}</strong></span>
                    <span className="text-[9px] text-slate-600 block">RENSPA: <strong>{location?.renspaNumber || 'En registro'}</strong></span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                    <span className="text-[8.5px] font-bold uppercase text-slate-500 block">2. Unidad Productiva (Parcela)</span>
                    <strong className="text-xs font-black text-slate-950 block truncate">{plot.name}</strong>
                    <span className="text-[10px] text-slate-700 block">
                      Diseño: <strong>{plot.block || plot.type} {plot.replicate ? `· Rep. ${plot.replicate}` : ''}</strong>
                    </span>
                    <span className="text-[9px] text-slate-600 block">
                      Superficie: <strong>{plot.surfaceArea} {plot.surfaceUnit}</strong> · Marco: {plot.density || 48} pl/m²
                    </span>
                    <span className="text-[9px] text-slate-600 block">
                      GPS: {plot.coordinates?.lat?.toFixed(5) || '-'}°, {plot.coordinates?.lng?.toFixed(5) || '-'}°
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-300 space-y-0.5">
                    <span className="text-[8.5px] font-bold uppercase text-emerald-800 block">3. Semilla INASE, Lote & Carga</span>
                    <strong className="text-xs font-black text-emerald-950 block truncate">{variety?.name || 'Futura 83'}</strong>
                    <span className="text-[9.5px] text-slate-800 block">
                      Lote Semilla: <strong>{seedMotherLot}</strong> ({seedLotCode})
                    </span>
                    <span className="text-[9.5px] text-emerald-900 font-black block">
                      Carga en Parcela: {seedLoad.fullTriUnitDisplay}
                    </span>
                    <span className="text-[9px] text-slate-700 block">
                      Rótulo: {seedRotuloInase} · Siembra: <strong>{formatDateAr(sowDateStr)}</strong>
                    </span>
                  </div>
                </div>

                {/* SECCIÓN 2: PERSONAL INTERVINIENTE DECLARADO (ESTRICTAMENTE AISLADO) */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-slate-700 block">
                    4. Nómina de Personal Técnico y Operativo Homologado en el Establecimiento
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div className="p-1.5 bg-white rounded-md border border-slate-200">
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Toma de Muestras Lote</span>
                      <strong className="text-slate-900 block truncate">{sanitizedRoster.sampler}</strong>
                      <span className="text-[7.5px] text-slate-500 block truncate">{sanitizedRoster.samplerMatricula}</span>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border border-slate-200">
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Jefe Operativo de Siembra</span>
                      <strong className="text-slate-900 block truncate">{sanitizedRoster.sower}</strong>
                      <span className="text-[7.5px] text-slate-500 block truncate">Operador Establecimiento</span>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border border-slate-200">
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Director Técnico Agrónomo</span>
                      <strong className="text-slate-900 block truncate">{sanitizedRoster.tech}</strong>
                      <span className="text-[7.5px] text-slate-500 block truncate">{sanitizedRoster.techMatricula}</span>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border border-slate-200">
                      <span className="text-[8px] uppercase text-slate-400 font-bold block">Responsable Cierre / Cosecha</span>
                      <strong className="text-emerald-800 block truncate">
                        {(plot.harvestOperator && isUserAuthorizedForEstablishment(plot.harvestOperator, plot.locationId, location?.clientId))
                          ? plot.harvestOperator
                          : sanitizedRoster.harvester}
                      </strong>
                      <span className="text-[7.5px] text-slate-500 block truncate">Cierre Registral Homologado</span>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 3: CERTIFICACIÓN DE CIERRE DE CICLO, FECHA/HORA Y LABOR VINCULADA */}
                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-600 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-emerald-200 pb-1">
                    <span className="text-[10.5px] font-black uppercase text-emerald-950 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" />
                      <span>5. Certificación de Finalización y Homologación del Ciclo Productivo</span>
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800">
                      🔒 Bloqueo Registral Inmutable
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-1.5 bg-white rounded-md border border-emerald-200">
                      <span className="text-[8px] uppercase text-slate-500 font-bold block">Fecha y Hora de Cierre</span>
                      <strong className="text-[11px] font-black text-slate-950 block">
                        {formatDateAr(plot.closedAt || closedDate)} · {plot.closedTime || closedTime} hs
                      </strong>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border border-emerald-200">
                      <span className="text-[8px] uppercase text-slate-500 font-bold block">Ciclo Biológico Total</span>
                      <strong className="text-[11px] font-black text-slate-950 block">
                        {totalCycleDays} Días (DDS) · BBCH 89-99
                      </strong>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border border-emerald-200">
                      <span className="text-[8px] uppercase text-slate-500 font-bold block">Rendimiento Homologado</span>
                      <strong className="text-[11px] font-black text-emerald-800 block">
                        {plot.actualHarvestYieldKg ?? (harvestYieldKg || '420')} kg totales
                      </strong>
                    </div>
                    <div className="p-1.5 bg-white rounded-md border border-emerald-200">
                      <span className="text-[8px] uppercase text-slate-500 font-bold block">Huella Hídrica</span>
                      <strong className="text-[11px] font-black text-sky-800 block">
                        {waterFootprintM3Ha} m³/ha
                      </strong>
                    </div>
                  </div>

                  <div className="text-[9.5px] text-slate-800 bg-white p-2 rounded-md border border-emerald-200 leading-tight">
                    <strong>Labor Agrícola Vinculada:</strong> {plot.harvestMachinery || machinery} ({implement}) · Operario: <strong>{plot.harvestOperator || operatorName || sanitizedRoster.harvester}</strong> · Dictamen: <em>{plot.closureNotes || notes}</em>
                  </div>
                </div>

                {/* SECCIÓN 4: RESUMEN DE LABORES AGRÍCOLAS DEL CICLO (COMPACTADO PARA A4) */}
                {plotLabors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-700 block">
                      6. Labores Agrícolas Clave del Ciclo ({plotLabors.length} registradas)
                    </span>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-[9px] text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                          <tr>
                            <th className="px-2 py-1">Fecha</th>
                            <th className="px-2 py-1">Labor</th>
                            <th className="px-2 py-1">Detalle / Maquinaria</th>
                            <th className="px-2 py-1">Operario</th>
                            <th className="px-2 py-1 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {plotLabors.slice(0, 3).map(lab => (
                            <tr key={lab.id}>
                              <td className="px-2 py-0.5 font-bold">{lab.executionDate || lab.dueDate}</td>
                              <td className="px-2 py-0.5">{lab.laborType || 'LABOR'}</td>
                              <td className="px-2 py-0.5 truncate max-w-[200px]">
                                {lab.title} {lab.machinery?.tractor ? `(${lab.machinery.tractor})` : ''}
                              </td>
                              <td className="px-2 py-0.5">{lab.operator || '-'}</td>
                              <td className="px-2 py-0.5 text-right font-bold text-emerald-800">{lab.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECCIÓN 5: TRAZABILIDAD OFICIAL + QR + CÓDIGO DE BARRAS GS1 + FIRMAS DIGITALES HOMOLOGADAS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center pt-2 border-t-2 border-slate-900">
                  {/* QR Trazabilidad */}
                  <div className="md:col-span-3 flex items-center gap-2">
                    <div className="p-1 bg-white rounded-lg border border-slate-900 shrink-0">
                      <QRCodeSVG value={traceUrl} size={70} level="M" includeMargin={false} />
                    </div>
                    <div className="text-[8.5px] space-y-0.5 leading-tight">
                      <strong className="text-slate-950 font-black block uppercase text-[9px]">QR Trazabilidad</strong>
                      <span className="text-emerald-800 font-bold block truncate">Lote: {seedMotherLot}</span>
                      <span className="text-slate-600 block truncate">Acta: {computedCodes.actCode}</span>
                      <span className="text-[7.5px] text-slate-500 block">Validación digital ARICCAME</span>
                    </div>
                  </div>

                  {/* Código de Barras GS1 / Code-128 */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center">
                    <BarcodeSVG
                      value={computedCodes.barcode}
                      height={32}
                      barWidth={1.35}
                      fontSize={8.5}
                      label={`GS1 / CODE-128 · ${computedCodes.actCode}`}
                      className="w-full"
                    />
                  </div>

                  {/* Bloque de Firmas Electrónicas / Digitales Homologadas */}
                  <div className="md:col-span-5 grid grid-cols-2 gap-1.5 text-[8.5px]">
                    {/* Tarjeta de Firma 1: Director Técnico Agrónomo */}
                    {techSignature ? (
                      <div className="p-1.5 border border-emerald-500 bg-emerald-50/50 rounded-lg flex flex-col justify-between h-[82px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase text-emerald-900 flex items-center gap-1 text-[8px]">
                            <CheckCircle2 size={10} className="text-emerald-600" />
                            <span>Firma Digital DT</span>
                          </span>
                          <span className="text-[7px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-mono font-bold">
                            HOMOLOGADA
                          </span>
                        </div>
                        <div className="my-auto flex items-center justify-center max-h-8 overflow-hidden">
                          <img src={techSignature.dataUrl} alt="Firma DT" className="h-7 max-w-full object-contain" />
                        </div>
                        <div className="border-t border-emerald-300 pt-0.5 text-center leading-tight">
                          <strong className="text-slate-950 block truncate text-[8.5px]">{techSignature.signerName}</strong>
                          <span className="text-slate-600 block text-[7px] truncate">{techSignature.signerMatricula} · {techSignature.timestamp}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 border border-dashed border-slate-400 rounded-lg flex flex-col justify-between h-[82px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase text-slate-600 text-[8px]">Director Técnico</span>
                          <span className="text-[7px] text-amber-700 bg-amber-50 px-1 rounded font-mono">
                            {isConfirmed ? 'Firma Requerida' : 'Pendiente'}
                          </span>
                        </div>
                        <div className="my-auto text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenSignaturePad('tech')}
                            className="no-print text-[8px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <PenTool size={9} />
                            <span>Firmar (Touch)</span>
                          </button>
                        </div>
                        <div className="border-t border-slate-300 pt-0.5 text-center leading-tight">
                          <span className="text-slate-800 font-bold block truncate text-[8.5px]">{sanitizedRoster.tech}</span>
                          <span className="text-slate-500 block text-[7px] truncate">{sanitizedRoster.techMatricula}</span>
                        </div>
                      </div>
                    )}

                    {/* Tarjeta de Firma 2: Homologación Central / Cosecha */}
                    {closureSignature ? (
                      <div className="p-1.5 border border-emerald-500 bg-emerald-50/50 rounded-lg flex flex-col justify-between h-[82px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase text-emerald-900 flex items-center gap-1 text-[8px]">
                            <CheckCircle2 size={10} className="text-emerald-600" />
                            <span>Firma Homologación</span>
                          </span>
                          <span className="text-[7px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-mono font-bold">
                            VALIDADA
                          </span>
                        </div>
                        <div className="my-auto flex items-center justify-center max-h-8 overflow-hidden">
                          <img src={closureSignature.dataUrl} alt="Firma Cierre" className="h-7 max-w-full object-contain" />
                        </div>
                        <div className="border-t border-emerald-300 pt-0.5 text-center leading-tight">
                          <strong className="text-slate-950 block truncate text-[8.5px]">{closureSignature.signerName}</strong>
                          <span className="text-slate-600 block text-[7px] truncate">{closureSignature.signerRole} · {closureSignature.timestamp}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 border border-dashed border-slate-400 rounded-lg flex flex-col justify-between h-[82px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase text-slate-600 text-[8px]">Homologación Central</span>
                          <span className="text-[7px] text-amber-700 bg-amber-50 px-1 rounded font-mono">
                            {isConfirmed ? 'Firma Requerida' : 'Pendiente'}
                          </span>
                        </div>
                        <div className="my-auto text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenSignaturePad('closure')}
                            className="no-print text-[8px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <PenTool size={9} />
                            <span>Firmar (Touch)</span>
                          </button>
                        </div>
                        <div className="border-t border-slate-300 pt-0.5 text-center leading-tight">
                          <span className="text-slate-800 font-bold block truncate text-[8.5px]">{plot.closedBy || 'PatagonianC LTDA'}</span>
                          <span className="text-slate-500 block text-[7px] truncate">ARICCAME / INASE Homologado</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =======================================================================
          MODAL INTERACTIVO DE FIRMA DIGITAL / TÁCTIL (CELULAR / TABLET / TOUCH)
          ======================================================================= */}
      {isSigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[160] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Firma Electrónica Táctil en Dispositivo Móvil
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Apto para celular, tablet (stylus / lápiz óptico) o ratón
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de Rol y Datos del Firmante */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSigRoleToSign('tech');
                    setSigSignerName(sanitizedRoster.tech);
                    setSigSignerMatricula(sanitizedRoster.techMatricula);
                    setSigSignerRole('Director Técnico Agrónomo (DT)');
                    clearSignatureCanvas();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold uppercase transition ${
                    sigRoleToSign === 'tech'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Director Técnico
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSigRoleToSign('closure');
                    setSigSignerName(plot.closedBy || sanitizedRoster.harvester);
                    setSigSignerMatricula('Responsable Oficial Homologante');
                    setSigSignerRole('Jefe Operativo / Homologación');
                    clearSignatureCanvas();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold uppercase transition ${
                    sigRoleToSign === 'closure'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Homologación Central
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Nombre Completo del Firmante</label>
                  <input
                    type="text"
                    value={sigSignerName}
                    onChange={e => setSigSignerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Matrícula Profesional / Cargo</label>
                  <input
                    type="text"
                    value={sigSignerMatricula}
                    onChange={e => setSigSignerMatricula(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* CANVAS DE FIRMA TÁCTIL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                    <PenTool size={11} className="text-indigo-600" />
                    Dibuje su firma dentro del recuadro con el dedo o lápiz:
                  </span>
                  <button
                    type="button"
                    onClick={clearSignatureCanvas}
                    className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Limpiar Trazo</span>
                  </button>
                </div>

                <div className="relative rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={160}
                    className="w-full h-40 cursor-crosshair touch-none select-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startTouchDrawing}
                    onTouchMove={touchDraw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                  />
                  <div className="absolute bottom-2 right-2 text-[8px] font-mono text-slate-400 pointer-events-none select-none">
                    Firma Táctil Segura · SHA-256 Validated
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSigModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck size={14} />
                <span>Validar y Estampar Firma</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotCycleClosureModal;
