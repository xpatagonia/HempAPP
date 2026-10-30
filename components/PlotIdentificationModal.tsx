import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, Printer, Download, ShieldCheck, QrCode, Sprout, 
  MapPin, Calendar, FileText, AlertTriangle, ExternalLink, 
  Copy, Check, Info, Globe, Building, CheckCircle2, Scale, 
  FileCheck2, Compass, Layers, UserCheck, Award
} from 'lucide-react';
import { Plot, Location, Variety, Client, SeedBatch } from '../types';
import { BarcodeSVG } from './BarcodeSVG';
import { formatPlotSeedLoad } from '../src/utils/seedTraceability';

interface PlotIdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: Plot;
  location?: Location;
  variety?: Variety;
  client?: Client;
  seedBatch?: SeedBatch;
}

export const PlotIdentificationModal: React.FC<PlotIdentificationModalProps> = ({
  isOpen,
  onClose,
  plot,
  location,
  variety,
  client,
  seedBatch
}) => {
  const [activeView, setActiveView] = useState<'label' | 'sign'>('sign');
  const [copied, setCopied] = useState(false);
  // Orientación predeterminada VERTICAL (A4 Portrait) para coincidir 100% con la visualización del sistema
  const [signOrientation, setSignOrientation] = useState<'horizontal' | 'vertical'>('vertical');
  // Formato para la etiqueta / rótulo de parcela (A4 Centrado de oficina o Térmica 100x150mm de estaca)
  const [labelFormat, setLabelFormat] = useState<'a4' | 'thermal'>('a4');
  const [signPageFilter, setSignPageFilter] = useState<'all' | 'p1' | 'p2'>('all');

  if (!isOpen || !plot) return null;

  const campaignDisplay = plot.campaign || '2025/2026';
  const statusDisplay = plot.status || 'Activa';
  const surfaceDisplay = `${plot.surfaceArea || 1} ${plot.surfaceUnit || 'ha'}`;
  const formattedLat = plot.coordinates?.lat ? Number(plot.coordinates.lat).toFixed(5) : '-';
  const formattedLng = plot.coordinates?.lng ? Number(plot.coordinates.lng).toFixed(5) : '-';

  // Dominio público accesible para escaneo móvil
  const publicBaseUrl = (() => {
    if (typeof window === 'undefined') return 'https://red.hempc.com.ar';
    return window.location.origin;
  })();

  const seedLotCode = seedBatch?.batchCode || 'FUT-83-25-HEM';
  const seedMotherLot = seedBatch?.certificationNumber || (seedLotCode.includes('-REC-') ? seedLotCode.split('-REC-')[0] : seedLotCode);
  const seedRotuloInase = seedBatch?.labelSerialNumber || 'INASE-SERIE-2025-A0041928';
  const seedLoad = formatPlotSeedLoad(plot);
  const isCycleClosed = Boolean(plot.closureConfirmed || plot.status === 'Cosechada');
  const actCode = plot.closureActCode || `ACTA-SIEMBRA-${(plot.campaign || '2526').replace('/', '')}-${plot.id.slice(-5).toUpperCase()}`;
  const barcodeCode = plot.closureBarcode || `7798394${plot.id.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6)}2026`;

  // Construir URL pública con parámetros de respaldo para garantizar trazabilidad instantánea en cualquier celular
  const traceUrl = (() => {
    const params = new URLSearchParams();
    if (plot.name) params.set('name', plot.name);
    if (location?.name) params.set('loc', location.name);
    if (location?.province) params.set('prov', location.province);
    if (plot.coordinates?.lat) params.set('lat', String(plot.coordinates.lat));
    if (plot.coordinates?.lng) params.set('lng', String(plot.coordinates.lng));
    if (variety?.name) params.set('var', variety.name);
    if (plot.surfaceArea) params.set('ha', String(plot.surfaceArea));
    if (campaignDisplay) params.set('camp', campaignDisplay);
    if (plot.status) params.set('status', plot.status);
    if (plot.sowingDate) params.set('sowing', plot.sowingDate);
    if (plot.seedBatchId || seedBatch?.id) params.set('batchId', plot.seedBatchId || seedBatch?.id || '');
    params.set('seedLot', seedLotCode);
    params.set('seedCert', seedMotherLot);
    params.set('seedRotulo', seedRotuloInase);
    params.set('seedLoadVal', String(seedLoad.rawValue));
    params.set('seedLoadUnit', seedLoad.unit);
    params.set('seedLoadKg', seedLoad.kg.toFixed(3));
    params.set('seedLoadGr', String(seedLoad.gr));
    params.set('seedLoadTn', seedLoad.tn.toFixed(6));
    if (plot.samplingResponsibleName || seedBatch?.samplerName) params.set('sampler', plot.samplingResponsibleName || seedBatch?.samplerName || '');
    if (plot.sowingResponsibleName) params.set('sower', plot.sowingResponsibleName);
    if (plot.technicalResponsibleName || seedBatch?.inspectorName) params.set('inspector', plot.technicalResponsibleName || seedBatch?.inspectorName || '');
    if (isCycleClosed) {
      params.set('closed', '1');
      if (plot.closedDate) params.set('closedAt', plot.closedDate);
      if (plot.closedTime) params.set('closedTime', plot.closedTime);
      params.set('actCode', actCode);
      params.set('barcode', barcodeCode);
      if (plot.harvestYieldKg) params.set('yieldKg', String(plot.harvestYieldKg));
    } else if (plot.isHarvestScheduled && plot.scheduledHarvestDate) {
      params.set('scheduledAt', `${plot.scheduledHarvestDate}${plot.scheduledHarvestTime ? ` ${plot.scheduledHarvestTime}` : ''}`);
    }

    const queryStr = params.toString();
    return `${publicBaseUrl}/#/trace/${encodeURIComponent(plot.id)}${queryStr ? `?${queryStr}` : ''}`;
  })();

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(traceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    try {
      const isSign = activeView === 'sign';
      const containerId = isSign ? 'printable-sign-container' : 'printable-plot-doc';
      const sourceElement = document.getElementById(containerId);
      if (!sourceElement) {
        window.print();
        return;
      }

      // Crear iframe temporal para aislar la impresión y previsualizar exactamente sin hojas en blanco
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

      // Copiar fuentes y estilos globales excluyendo reglas que oculten el body
      const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .filter(tag => !(tag.tagName === 'STYLE' && tag.textContent?.includes('visibility: hidden')))
        .map(style => style.outerHTML)
        .join('\n');

      const docTitle = isSign 
        ? 'Cartel Oficial Tranquera - PatagonianC LTDA' 
        : 'Rótulo QR Parcela - PatagonianC LTDA';

      const orientationRule = isSign 
        ? (signOrientation === 'horizontal' ? 'A4 landscape' : 'A4 portrait')
        : (labelFormat === 'thermal' ? '100mm 150mm portrait' : 'A4 portrait');

      const pageMargin = isSign 
        ? '5mm' 
        : (labelFormat === 'thermal' ? '3mm' : '8mm');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>${docTitle}</title>
            ${headStyles}
            <style>
              @page {
                size: ${orientationRule};
                margin: ${pageMargin};
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
                color: #000000 !important;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              }
              .no-print {
                display: none !important;
              }
              /* Cartel de tranquera: encuadre estricto en hoja A4 vertical (2 páginas) */
              .printable-sheet {
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: ${signOrientation === 'horizontal' ? '280mm' : '198mm'} !important;
                height: ${signOrientation === 'horizontal' ? '198mm' : '274mm'} !important;
                max-height: ${signOrientation === 'horizontal' ? '198mm' : '274mm'} !important;
                margin: 0 auto !important;
                padding: 10px 14px !important;
                border: 4px solid #000000 !important;
                border-radius: 16px !important;
                background: #ffffff !important;
                color: #000000 !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                overflow: hidden !important;
              }
              .printable-sheet:last-of-type {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              /* Forzar columnas paralelas en Página 1 y Página 2 durante la impresión */
              #printable-plot-sign-p1 .p1-quick-grid {
                display: grid !important;
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                gap: 6px !important;
              }
              #printable-plot-sign-p2 {
                padding: 10px 14px !important;
              }
              #printable-plot-sign-p2 .p2-sec1-grid {
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                gap: 6px !important;
              }
              #printable-plot-sign-p2 .p2-sec2-grid {
                display: grid !important;
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                gap: 5px !important;
              }
              #printable-plot-sign-p2 .p2-sec3-grid {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 6px !important;
              }
              #printable-plot-sign-p2 .p2-sec4-grid {
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                gap: 6px !important;
              }
              /* Rótulo / Etiqueta de parcela (Pasaporte Biológico) */
              #printable-plot-doc {
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
                width: ${labelFormat === 'thermal' ? '96mm' : '135mm'} !important;
                max-width: 95% !important;
                height: ${labelFormat === 'thermal' ? '144mm' : 'auto'} !important;
                margin: ${labelFormat === 'thermal' ? '0 auto' : '15mm auto'} !important;
                padding: ${labelFormat === 'thermal' ? '14px' : '20px'} !important;
                border: 2px dashed #000000 !important;
                border-radius: 20px !important;
                background: #ffffff !important;
                color: #000000 !important;
                box-shadow: none !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: auto !important;
                break-after: auto !important;
                overflow: hidden !important;
              }
            </style>
          </head>
          <body style="background:#ffffff; color:#000000;">
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
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1800);
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  return (
    <div id="modal-print-overlay" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[120] p-3 sm:p-5 font-sans overflow-y-auto">
      {/* Estilos CSS de respaldo para impresión directa con Ctrl+P */}
      <style>{`
        @media print {
          @page {
            size: ${activeView === 'sign' ? (signOrientation === 'horizontal' ? 'A4 landscape' : 'A4 portrait') : (labelFormat === 'thermal' ? '100mm 150mm portrait' : 'A4 portrait')};
            margin: 5mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          #modal-print-overlay {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          #modal-print-dialog {
            position: static !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            overflow: visible !important;
            display: block !important;
          }
          #modal-print-body {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: ${signOrientation === 'horizontal' ? '280mm' : '198mm'} !important;
            height: ${signOrientation === 'horizontal' ? '198mm' : '274mm'} !important;
            max-height: ${signOrientation === 'horizontal' ? '198mm' : '274mm'} !important;
            margin: 0 auto !important;
            padding: 10px 14px !important;
            border: 4px solid #000000 !important;
            border-radius: 16px !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .printable-sheet:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          #printable-plot-sign-p1 .p1-quick-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          #printable-plot-sign-p2 {
            padding: 10px 14px !important;
          }
          #printable-plot-sign-p2 .p2-sec1-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          #printable-plot-sign-p2 .p2-sec2-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 5px !important;
          }
          #printable-plot-sign-p2 .p2-sec3-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          #printable-plot-sign-p2 .p2-sec4-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          #printable-plot-doc {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: ${labelFormat === 'thermal' ? '96mm' : '135mm'} !important;
            max-width: 95% !important;
            height: ${labelFormat === 'thermal' ? '144mm' : 'auto'} !important;
            margin: ${labelFormat === 'thermal' ? '0 auto' : '15mm auto'} !important;
            padding: ${labelFormat === 'thermal' ? '14px' : '20px'} !important;
            border: 2px dashed #000000 !important;
            border-radius: 20px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div id="modal-print-dialog" className="bg-white dark:bg-slate-900 rounded-[32px] max-w-5xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO DEL MODAL REORGANIZADO */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              {activeView === 'sign' ? <ShieldCheck size={28} /> : <QrCode size={28} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  PatagonianC LTDA · CUIT 30-71816113-0 · HempC
                </span>
                <span className="text-[10px] font-mono font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Campaña {campaignDisplay}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                {activeView === 'sign' ? 'Cartel Oficial de Tranquera (Ley 27.669)' : 'Rótulo QR y Pasaporte Biológico'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            {/* Pestañas Principales de Modo */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex items-center border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveView('sign')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                  activeView === 'sign'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🪧</span>
                <span>Cartel Tranquera (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('label')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                  activeView === 'label'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🏷️</span>
                <span>Rótulo QR Parcela</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENIDO DESPLAZABLE */}
        <div id="modal-print-body" className="flex-1 overflow-y-auto py-4 px-1 space-y-4">

          {/* VISTA 1: CARTEL PARA TRANQUERA EXTERIOR (DECLARANDO CÁÑAMO NO PSICOACTIVO - SEGMENTADO EN 2 PÁGINAS A4) */}
          {activeView === 'sign' && (
            <div className="space-y-6">
              {/* BOTONERA UNIFICADA Y ORDENADA DEL CARTEL DE TRANQUERA */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <span>Configuración Oficial de Impresión A4 para Tranquera</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                    {signPageFilter === 'all' ? '📄 Documento Completo: 2 Páginas A4' : signPageFilter === 'p1' ? '📄 Pág. 1: Cartel Tranquera (Alto Impacto)' : '📄 Pág. 2: Anexo Técnico & Geodesia'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Selector de Páginas */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Páginas:</span>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSignPageFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          signPageFilter === 'all'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>📑</span>
                        <span>Ambas (Pág. 1 y 2)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignPageFilter('p1')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          signPageFilter === 'p1'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>1️⃣</span>
                        <span>Pág. 1 (Cartel)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignPageFilter('p2')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          signPageFilter === 'p2'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>2️⃣</span>
                        <span>Pág. 2 (Anexo)</span>
                      </button>
                    </div>
                  </div>

                  {/* Selector de Orientación */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Orientación:</span>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSignOrientation('vertical')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          signOrientation === 'vertical'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>↕️</span>
                        <span>Vertical A4 (Estándar)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignOrientation('horizontal')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          signOrientation === 'horizontal'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>↔️</span>
                        <span>Horizontal</span>
                      </button>
                    </div>
                  </div>

                  {/* Descarga Anexo II Protocolo de Siembra */}
                  <a
                    href="/assets/aistudio/ANEXO_II_PROTOCOLO_DE_SIEMBRA_6dc09e5c.pdf"
                    download="ANEXO_II_PROTOCOLO_DE_SIEMBRA_PATAGONIAN_C.pdf"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    title="Descargar PDF Oficial del Protocolo Técnico de Siembra (Anexo II)"
                  >
                    <Download size={13} className="text-emerald-600" />
                    <span>Descargar Anexo II (Protocolo de Siembra)</span>
                  </a>
                </div>
              </div>

              {/* CONTENEDOR IMPRIMIBLE DE LAS 2 PÁGINAS */}
              <div id="printable-sign-container" className="printable-container space-y-8">
                
                {/* ======================================================== */}
                {/* PÁGINA 1: CARTEL PRINCIPAL PARA TRANQUERA (ALTO IMPACTO)  */}
                {/* ======================================================== */}
                {(signPageFilter === 'all' || signPageFilter === 'p1') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-2 no-print">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        Página 1: Cartel Exterior para Tranquera (Lectura a Distancia)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">Formato A4 Vertical (1 Hoja)</span>
                    </div>

                    <div
                      id="printable-plot-sign-p1"
                      className={`printable-sheet bg-white text-slate-950 p-6 md:p-8 rounded-3xl border-4 md:border-6 border-slate-950 shadow-2xl space-y-4 md:space-y-5 mx-auto ${
                        signOrientation === 'horizontal' ? 'w-full' : 'max-w-2xl'
                      }`}
                    >
                      {/* ENCABEZADO INSTITUCIONAL */}
                      <div className="border-b-4 border-slate-950 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                              REPÚBLICA ARGENTINA · LEY NACIONAL N° 27.669 & DECRETO 405/2023
                            </p>
                          </div>
                          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-950 mt-1">
                            PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO
                          </h1>
                          <p className="text-xs md:text-sm font-mono font-black text-emerald-800 uppercase mt-0.5">
                            CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
                          </p>
                          <p className="text-[10px] md:text-xs font-mono font-bold text-slate-600 uppercase mt-0.5">
                            Marco Regulatorio del Cáñamo Industrial · Fiscalización ARICCAME / INASE / SENASA
                          </p>
                        </div>
                        <div className="text-right shrink-0 bg-slate-100 p-2.5 rounded-2xl border-2 border-slate-300">
                          <span className="text-[9px] font-mono font-black uppercase text-slate-500 block">Condición Registral</span>
                          <strong className="text-xs md:text-sm font-black uppercase text-emerald-700 block">
                            PARCELA DECLARADA ACTIVA
                          </strong>
                          <span className="text-[10px] font-mono font-bold text-slate-600 block mt-0.5">
                            Campaña: {campaignDisplay}
                          </span>
                        </div>
                      </div>

                      {/* DECLARACIÓN CENTRAL DE MÁXIMO IMPACTO VISUAL EN TRANQUERA (LECTURA A DISTANCIA) */}
                      <div className="bg-amber-100/95 border-4 md:border-6 border-amber-500 p-5 md:p-7 rounded-3xl text-center space-y-3 shadow-inner my-auto">
                        <div className="inline-flex items-center justify-center gap-2 px-5 py-1.5 bg-amber-400 border-2 border-amber-600 text-slate-950 rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-sm">
                          <ShieldCheck size={20} className="text-slate-950 shrink-0" />
                          <span>DECLARACIÓN DE CULTIVO NO PSICOACTIVO</span>
                        </div>
                        
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-slate-950 leading-none py-1 drop-shadow-sm">
                          CÁÑAMO INDUSTRIAL
                        </h2>

                        <p className="text-lg md:text-xl lg:text-2xl font-black text-slate-900 uppercase tracking-wide">
                          (Cannabis sativa L. con tenor de THC menor a 1.0% P/P)
                        </p>

                        <div className="w-28 h-2 bg-amber-500 mx-auto rounded-full my-2"></div>

                        <p className="text-sm md:text-base font-bold text-amber-950 max-w-3xl mx-auto leading-relaxed">
                          Cultivo agrícola no estupefaciente con destino exclusivo a <strong className="underline decoration-amber-600 decoration-2">Fibra Textil, Grano, Bioplásticos, Celulosa y Ensayos de Investigación Bioeconómica</strong>.
                        </p>
                      </div>

                      {/* FRANJA DE IDENTIFICACIÓN RÁPIDA EN TRANQUERA (INCLUYE N° DE LOTE DE SEMILLA) */}
                      <div className="p1-quick-grid grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-2xl border-2 border-slate-300 text-xs font-mono">
                        <div className="p-2 bg-white rounded-xl border border-slate-200">
                          <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Lote / Parcela:</span>
                          <strong className="text-sm font-black uppercase text-slate-950 block truncate">{plot.name}</strong>
                          <span className="text-[9.5px] text-slate-500 block truncate">ID: {plot.id}</span>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-slate-200">
                          <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Establecimiento:</span>
                          <strong className="text-sm font-black uppercase text-slate-950 block truncate">{location?.name || 'Establecimiento Rural'}</strong>
                          <span className="text-[9.5px] text-slate-500 block truncate">{location?.city || ''}, {location?.province || ''}</span>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-slate-200">
                          <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Cultivar Certificado:</span>
                          <strong className="text-sm font-black uppercase text-emerald-800 block truncate">{variety?.name || 'Variedad Homologada'}</strong>
                          <span className="text-[9.5px] text-slate-500 block truncate">RNC INASE: {variety?.inaseRncNumber || 'Homologada'}</span>
                        </div>

                        <div className="p-2 bg-emerald-50 rounded-xl border-2 border-emerald-500">
                          <span className="text-[8.5px] uppercase font-black text-emerald-800 block">Lote & Carga Semilla:</span>
                          <strong className="text-sm font-black uppercase text-slate-950 block truncate" title={seedLotCode}>{seedMotherLot}</strong>
                          <span className="text-[9px] text-emerald-800 font-black block truncate">
                            Carga: {seedLoad.compactDisplay}
                          </span>
                        </div>
                      </div>

                      {/* ADVERTENCIA LEGAL A FUERZAS DE SEGURIDAD */}
                      <div className="p-2.5 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs md:text-sm text-rose-950 font-bold leading-snug">
                        ⚠️ ADVERTENCIA LEGAL A FUERZAS DE SEGURIDAD Y TERCEROS: Predio registrado y fiscalizado bajo la Ley 27.669. Prohibido el ingreso no autorizado o la sustracción de biomasa experimental. Acto penado por los artículos 162, 164 y 186 del Código Penal de la Nación Argentina.
                      </div>

                      {/* FOOTER PÁGINA 1 CON N° DE LOTE DE SEMILLA JUNTO AL QR */}
                      <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 border-t-2 border-slate-300 pt-2 gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 bg-white rounded-lg border border-slate-300 shrink-0">
                            <QRCodeSVG value={traceUrl} size={48} level="M" />
                          </div>
                          <div>
                            <span className="font-black text-slate-800 block text-xs">PatagonianC LTDA · CUIT: 30-71816113-0 · HempC</span>
                            <span className="text-[9.5px] text-emerald-800 font-black block">
                              Lote Semilla: {seedMotherLot} · Carga Parcela: {seedLoad.fullTriUnitDisplay}
                            </span>
                            <span className="text-[8.5px] text-slate-500 block">Escanear QR para trazabilidad del lote, carga (T/kg/gr) y verificación digital</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-700 block">Página 1 de 2 · Cartel Exterior de Tranquera</span>
                          <span className="text-[9px] text-slate-400">Emisión: {new Date().toLocaleDateString('es-AR')} · red.hempc.com.ar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* PÁGINA 2: ANEXO TÉCNICO, GEODESIA Y FICHA REGISTRAL      */}
                {/* ======================================================== */}
                {(signPageFilter === 'all' || signPageFilter === 'p2') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-2 no-print">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                        Página 2: Anexo Técnico, Geodesia y Ficha Registral de Parcela
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">Formato A4 Vertical (1 Hoja)</span>
                    </div>

                    <div
                      id="printable-plot-sign-p2"
                      className={`printable-sheet bg-white text-slate-950 p-5 md:p-6 rounded-3xl border-4 md:border-6 border-slate-950 shadow-2xl space-y-3.5 mx-auto ${
                        signOrientation === 'horizontal' ? 'w-full' : 'max-w-2xl'
                      }`}
                    >
                      {/* ENCABEZADO ANEXO TÉCNICO */}
                      <div className="border-b-4 border-slate-950 pb-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-emerald-700" />
                            <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                              REPÚBLICA ARGENTINA · LEY NACIONAL N° 27.669 & DECRETO 405/2023
                            </p>
                          </div>
                          <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight text-slate-950 mt-0.5">
                            ANEXO TÉCNICO Y FICHA REGISTRAL DE PARCELA
                          </h2>
                          <p className="text-xs md:text-sm font-mono font-black text-emerald-800 uppercase mt-0.5">
                            PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO · CUIT: 30-71816113-0 · HempC
                          </p>
                        </div>
                        <div className="text-right shrink-0 bg-slate-100 p-2 rounded-xl border border-slate-300">
                          <span className="text-[9px] font-mono font-black uppercase text-slate-500 block">Legajo Oficial</span>
                          <strong className="text-xs font-mono font-black text-slate-900 block">
                            EXP: HEMP-AR-{plot.id.substring(0, 8).toUpperCase()}
                          </strong>
                          <span className="text-[9px] font-mono text-emerald-800 font-black block">Lote Semilla: {seedMotherLot}</span>
                        </div>
                      </div>

                      {/* SECCIÓN 1: IDENTIFICACIÓN PARCELARIA Y CATASTRAL */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Sprout size={14} className="text-emerald-600" />
                          1. Ficha Catastral, Genética & N° de Lote de Semilla
                        </span>
                        <div className="p2-sec1-grid grid grid-cols-3 gap-2.5 border-2 border-slate-300 rounded-xl p-2.5 bg-slate-50 text-[11px] font-mono">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Unidad Productiva / Lote:</span>
                            <strong className="text-xs text-slate-950 font-black block">{plot.name}</strong>
                            <span className="text-[10px] text-slate-600 block">ID: <strong>{plot.id}</strong></span>
                            <span className="text-[10px] text-slate-600 block">Tipo: <strong>{plot.type || 'Ensayo / Producción'}</strong></span>
                            <span className="text-[10px] text-slate-600 block">Estado: <strong className="text-emerald-700">{statusDisplay}</strong></span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Establecimiento Rural:</span>
                            <strong className="text-xs text-slate-950 font-black block">{location?.name || 'Establecimiento Rural'}</strong>
                            <span className="text-[10px] text-slate-600 block">Ubicación: {location?.city || ''}, {location?.province || ''}</span>
                            <span className="text-[10px] text-slate-600 block truncate" title={location?.address}>Dirección: {location?.address || 'Zona Rural'}</span>
                            <span className="text-[10px] text-slate-600 block">RENSPA: <strong>{location?.renspaNumber || 'En trámite'}</strong></span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Genética, Lote & Carga:</span>
                            <strong className="text-xs text-emerald-800 font-black block">{variety?.name || 'Cultivar Homologado'}</strong>
                            <span className="text-[10px] text-slate-900 block">N° Lote Semilla: <strong>{seedMotherLot}</strong></span>
                            <span className="text-[10px] text-emerald-800 font-black block">Carga Siembra: {seedLoad.fullTriUnitDisplay}</span>
                            <span className="text-[10px] text-slate-600 block truncate" title={seedRotuloInase}>Rótulo INASE: <strong>{seedRotuloInase}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN 2: GEODESIA, CENTROIDE Y TELEDETECCIÓN */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Compass size={14} className="text-emerald-600" />
                          2. Georreferenciación Geodésica & Monitoreo Satelital
                        </span>
                        <div className="p2-sec2-grid grid grid-cols-4 gap-2 text-xs font-mono">
                          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Superficie</span>
                            <strong className="text-xs font-black text-slate-900 block">{surfaceDisplay}</strong>
                          </div>
                          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Centroide GPS</span>
                            <strong className="text-[11px] font-black text-slate-900 block">{formattedLat}, {formattedLng}</strong>
                          </div>
                          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Polígono Vectorial</span>
                            <strong className="text-[11px] font-bold text-slate-900 block">
                              {plot.polygon && plot.polygon.length >= 3 ? `${plot.polygon.length} Vértices` : 'Centroide'}
                            </strong>
                          </div>
                          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Vigilancia Espectral</span>
                            <strong className="text-xs font-bold text-emerald-700 block">Sentinel-2</strong>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN 3: TITULARIDAD, OPERADOR Y TRAZABILIDAD DEL LOTE DE SEMILLA */}
                      <div className="p2-sec3-grid grid grid-cols-2 gap-2.5 text-xs font-mono">
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                          <span className="text-[9px] uppercase text-slate-500 font-bold block">Operador Titular & Licencias ARICCAME</span>
                          <strong className="text-xs font-black text-slate-900 block">PatagonianC LTDA Cooperativa de Trabajo</strong>
                          <span className="text-[10px] text-emerald-800 font-bold block">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</span>
                          <span className="text-[10px] text-slate-700 block">Lic. Agrícola ARICCAME: <strong>EX-2024-134354227</strong></span>
                          <span className="text-[10px] text-slate-600 block">Titular Predial: <strong>{client?.name || location?.ownerName || 'HempC Red Cooperativa'}</strong></span>
                        </div>

                        <div className="p-2.5 bg-emerald-50/70 border-2 border-emerald-300 rounded-xl space-y-0.5">
                          <span className="text-[9px] uppercase text-emerald-800 font-black block">N° Lote de Semilla y Carga a la Parcela (T/kg/gr)</span>
                          <span className="text-[10px] text-slate-900 block">
                            N° Lote de Semilla: <strong className="font-black text-emerald-900">{seedMotherLot}</strong> ({seedBatch?.qualityGrade === 'GRADO_B_ESTANDAR' ? 'Grado B' : 'Grado A Élite'} · {seedBatch?.qualityScore || 96}/100 pts)
                          </span>
                          <span className="text-[9.5px] text-emerald-900 font-black block">
                            Carga de Semilla en Parcela: {seedLoad.fullTriUnitDisplay}
                          </span>
                          <span className="text-[9.5px] text-slate-700 block truncate" title={seedLotCode}>
                            Código Trazabilidad / Remito: <strong>{seedLotCode}</strong> · Rótulo: {seedRotuloInase}
                          </span>
                          <span className="text-[9.5px] text-indigo-800 font-bold block truncate">
                            Muestreo: {plot.samplingResponsibleName || seedBatch?.samplerName || 'Matias QUINTANA'} · DT: {plot.technicalResponsibleName || seedBatch?.inspectorName || 'Ing. Agr. Julian PIZARRO'}
                          </span>
                        </div>
                      </div>

                      {/* SECCIÓN 4: AUDITORÍA DIGITAL, CÓDIGO DE BARRAS Y RECUADROS DE FIRMAS */}
                      <div className="p2-sec4-grid grid grid-cols-3 gap-2.5 items-stretch border-t-2 border-slate-300 pt-2.5">
                        <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="bg-white p-1 rounded-lg border border-slate-200 shrink-0">
                            <QRCodeSVG value={traceUrl} size={56} level="M" />
                          </div>
                          <div className="text-[9px] font-mono space-y-0.5 min-w-0">
                            <strong className="font-black text-slate-900 block truncate text-[10px]">QR Trazabilidad Lote</strong>
                            <span className="text-emerald-800 font-black block truncate text-[8.5px]">Lote Semilla: {seedMotherLot}</span>
                            <span className="text-slate-600 block text-[8px] leading-tight truncate">
                              {isCycleClosed ? `Cierre Homologado: ${plot.closedDate || ''}` : `Estado: ${statusDisplay}`}
                            </span>
                            <span className="text-emerald-700 font-bold block text-[8px]">SENASA · INASE · ARICCAME</span>
                          </div>
                        </div>

                        {/* Código de Barras Vectorial GS1 / Code-128 & Acta de Siembra */}
                        <div className="p-2 bg-white border-2 border-slate-300 rounded-xl flex flex-col justify-between items-center text-[8.5px] font-mono">
                          <div className="w-full flex items-center justify-between text-[8px] font-black uppercase text-slate-700">
                            <span>Cód. Barras GS1</span>
                            <span className={isCycleClosed ? 'text-emerald-700' : 'text-amber-700'}>
                              {isCycleClosed ? 'CICLO HOMOLOGADO' : 'CICLO ACTIVO'}
                            </span>
                          </div>
                          <BarcodeSVG value={barcodeCode} height={30} barWidth={1.15} fontSize={8} />
                          <span className="text-[7.5px] font-bold text-slate-500 truncate w-full text-center">
                            {actCode}
                          </span>
                        </div>

                        {/* Caja Firma Responsable Técnico */}
                        <div className="p-2 border-2 border-dashed border-slate-400 rounded-xl h-20 flex flex-col justify-between text-[9px] font-mono">
                          <span className="font-bold text-slate-600 uppercase text-[8.5px]">Firma Dir. Técnico / Inspección</span>
                          <div className="border-t border-slate-300 pt-1 text-slate-400 text-center text-[8px]">Firma, Sello y Matrícula</div>
                        </div>
                      </div>

                      {/* FOOTER PÁGINA 2 */}
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-t-2 border-slate-300 pt-2 gap-1">
                        <span className="font-bold truncate">PatagonianC LTDA · CUIT: 30-71816113-0 · HempC</span>
                        <span className="shrink-0">Pág. 2 de 2 · Anexo Técnico · red.hempc.com.ar</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* VISTA 2: RÓTULO TÉCNICO DE TRAZABILIDAD QR (FORMATO ETIQUETA DE PARCELA / PASAPORTE) */}
          {activeView === 'label' && (
            <div className="space-y-4">
              {/* BOTONERA UNIFICADA DE LA ETIQUETA DE PARCELA */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                    <Info size={18} className="text-emerald-600 shrink-0" />
                    <span>Emisión Oficial de Rótulo QR y Pasaporte Biológico de Parcela</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                    {labelFormat === 'a4' ? '📄 1 Hoja A4 Centrado (Oficina / Carpeta)' : '🏷️ Etiqueta 100x150 mm (Térmica / Estaca de Campo)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Formato de Salida:</span>
                    <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setLabelFormat('a4')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          labelFormat === 'a4'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>📄</span>
                        <span>A4 Centrado (Carpeta de Campo)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLabelFormat('thermal')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          labelFormat === 'thermal'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <span>🏷️</span>
                        <span>100x150 mm (Térmica / Estaca)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTENEDOR DE LA ETIQUETA IMPRIMIBLE */}
              <div 
                id="printable-plot-doc"
                className={`bg-white text-slate-900 p-6 md:p-8 rounded-3xl border-2 border-dashed border-slate-400 shadow-xl space-y-4 mx-auto ${
                  labelFormat === 'thermal' ? 'max-w-md' : 'max-w-xl'
                }`}
              >
                {/* CABECERA ETIQUETA */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                      <Sprout size={18} className="text-emerald-600" />
                      <span>PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO</span>
                    </div>
                    <p className="text-xs font-black text-emerald-800 uppercase font-mono mt-0.5">
                      CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
                    </p>
                    <p className="text-[10px] text-slate-600 uppercase font-bold mt-0.5">
                      Pasaporte Biológico de Parcela · Trazabilidad Agro 4.0
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-emerald-600 text-white shadow-sm">
                      {statusDisplay}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold">LEY 27.669</p>
                  </div>
                </div>

                {/* DETALLE PARCELA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Parcela / Unidad Productiva:</span>
                    <strong className="text-xl md:text-2xl font-black uppercase text-slate-900 block leading-tight mt-0.5">
                      {plot.name}
                    </strong>
                    <span className="text-xs font-mono text-slate-600 block mt-1">
                      ID Parcelario: <strong>{plot.id}</strong>
                    </span>
                  </div>
                  <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl px-3 py-2 font-mono text-right">
                    <span className="text-[9px] font-black uppercase text-emerald-800 block">Lote de Semilla & Carga</span>
                    <strong className="text-sm font-black uppercase text-slate-950 block">{seedMotherLot}</strong>
                    <span className="text-[9px] font-black text-emerald-700 block">Carga: {seedLoad.fullTriUnitDisplay}</span>
                  </div>
                </div>

                {/* DATOS CRUZADOS */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Campo / Sitio:</span>
                    <strong className="text-slate-900 truncate block text-sm">{location?.name || 'S/D'}</strong>
                    <span className="text-[10px] text-slate-500">{location?.city || location?.province}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Cultivar Certificado:</span>
                    <strong className="text-emerald-700 truncate block text-sm">{variety?.name || 'INASE'}</strong>
                    <span className="text-[10px] text-slate-500">{variety?.inaseRncNumber || 'RNC N°'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Superficie:</span>
                    <strong className="text-slate-900 block text-sm">{surfaceDisplay}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-700 uppercase block font-black">Carga Semilla (T / kg / gr):</span>
                    <strong className="text-emerald-900 block text-xs font-black">{seedLoad.primaryDisplay}</strong>
                    <span className="text-[9.5px] text-slate-600">{seedLoad.tnFormatted} · Campaña {campaignDisplay}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Coordenadas GPS Centroide:</span>
                    <strong className="text-xs text-slate-800 block">{formattedLat}, {formattedLng}</strong>
                  </div>
                </div>

                {/* N° DE LOTE DE SEMILLA, TRAZABILIDAD DEL LOTE & PERSONAL INTERVINIENTE */}
                <div className="p-3.5 bg-indigo-50/70 rounded-2xl border-2 border-indigo-200 text-[10px] font-mono space-y-2">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                    <span className="font-black uppercase text-indigo-900 flex items-center gap-1">
                      <UserCheck size={13} className="text-indigo-700" />
                      N° de Lote de Semilla, Carga & Personal Interviniente
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[8px] uppercase flex items-center gap-1">
                      <Award size={10} />
                      {seedBatch?.qualityGrade === 'GRADO_B_ESTANDAR' ? 'Grado B Estándar' : 'Grado A Élite'} ({seedBatch?.qualityScore || 96}/100)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-2 rounded-xl border border-indigo-100">
                      <span className="text-[8px] text-emerald-700 uppercase font-black block">N° Lote de Semilla & Carga:</span>
                      <strong className="text-slate-950 text-xs font-black block truncate">{seedMotherLot} · {seedLoad.compactDisplay}</strong>
                      <span className="text-[8.5px] text-slate-600 block truncate" title={seedLotCode}>
                        Cód. Recepción: <strong>{seedLotCode}</strong>
                      </span>
                      <span className="text-[8.5px] text-emerald-700 font-bold block">
                        Rótulo INASE: {seedRotuloInase} · PG: {seedBatch?.germination || 94}%
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-indigo-100">
                      <span className="text-[8px] text-indigo-700 uppercase font-black block">Toma de Muestras & Dirección Técnica:</span>
                      <strong className="text-slate-950 block truncate">{plot.samplingResponsibleName || seedBatch?.samplerName || 'Matias QUINTANA'}</strong>
                      <span className="text-[8.5px] text-indigo-700 font-bold block truncate">
                        DT: {plot.technicalResponsibleName || seedBatch?.inspectorName || 'Ing. Agr. Julian PIZARRO'}
                      </span>
                      <span className="text-[8.5px] text-slate-600 block truncate">
                        Siembra: {plot.sowingResponsibleName || 'Joaquin AREZO'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Y CÓDIGO DE BARRAS VECTORIAL CON TRAZABILIDAD DE CIERRE DE CICLO */}
                <div className="space-y-3 border-t-2 border-slate-200 pt-3.5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-2xl border-2 border-slate-300 shadow-sm shrink-0">
                      <QRCodeSVG
                        value={traceUrl}
                        size={labelFormat === 'thermal' ? 88 : 104}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <p className="font-black text-slate-900 text-sm">
                        QR & Código de Barras de Trazabilidad Integral
                      </p>
                      <p className="text-[10.5px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        N° Lote de Semilla: {seedMotherLot} · Rótulo: {seedRotuloInase}
                      </p>
                      {isCycleClosed ? (
                        <p className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 block">
                          ✓ CICLO DE SIEMBRA FINALIZADO Y HOMOLOGADO ({plot.closedDate || ''} {plot.closedTime || ''}) · {actCode}
                        </p>
                      ) : plot.isHarvestScheduled && plot.scheduledHarvestDate ? (
                        <p className="text-[10px] font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 block">
                          ⏱ Cosecha Programada: {plot.scheduledHarvestDate} {plot.scheduledHarvestTime || ''} hs
                        </p>
                      ) : null}
                      <p className="text-slate-500 text-[9.5px] leading-tight">
                        Escanee QR o Código de Barras GS1 para auditar N° de lote de semilla, labores agrícolas, cierre de ciclo homologado y monitoreo Sentinel-2.
                      </p>
                    </div>
                  </div>

                  {/* CÓDIGO DE BARRAS VECTORIAL INCORPORADO A LA GESTIÓN */}
                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-[9.5px] font-mono space-y-0.5 text-center sm:text-left">
                      <span className="text-[8.5px] font-black uppercase text-slate-500 block">Código de Barras Trazabilidad GS1-128</span>
                      <strong className="text-slate-900 font-black block">{actCode}</strong>
                      <span className="text-emerald-700 font-bold block">
                        {isCycleClosed ? `Homologado por: ${plot.closedBy || 'Administración Central'}` : `Siembra: ${plot.sowingDate || 'Declarada'}`}
                      </span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      <BarcodeSVG value={barcodeCode} height={36} barWidth={1.35} fontSize={9.5} />
                    </div>
                  </div>
                </div>

                {/* PIE */}
                <div className="text-[9px] font-mono text-slate-500 text-center border-t border-slate-200 pt-2.5 space-y-0.5">
                  <div className="font-bold text-slate-700">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC</div>
                  <div className="text-slate-400">Documento emitido electrónicamente · red.hempc.com.ar</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES Y BOTONES DE DESCARGA / IMPRESIÓN REORGANIZADOS */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? '¡Enlace Copiado!' : 'Copiar URL Pública'}</span>
            </button>

            <a
              href={traceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition"
            >
              <ExternalLink size={14} />
              <span>Probar Trazabilidad QR en Vivo</span>
            </a>

            <span className="hidden sm:inline-flex items-center text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              Escaneo Móvil: <strong className="ml-1 text-slate-700 dark:text-slate-300">{publicBaseUrl.replace('https://', '')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Printer size={16} />
              <span>
                {activeView === 'sign'
                  ? `Imprimir Cartel Tranquera (${signOrientation === 'vertical' ? 'A4 Vertical' : 'A4 Horizontal'} · ${signPageFilter === 'all' ? '2 Págs' : '1 Pág'})`
                  : `Imprimir Rótulo QR (${labelFormat === 'thermal' ? '100x150 mm' : 'A4 1 Pág'})`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
