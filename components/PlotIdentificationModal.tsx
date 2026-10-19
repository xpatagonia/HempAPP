import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, Printer, Download, ShieldCheck, QrCode, Sprout, 
  MapPin, Calendar, FileText, AlertTriangle, ExternalLink, 
  Copy, Check, Info, Globe, Building, CheckCircle2, Scale, 
  FileCheck2, Compass, Layers, UserCheck
} from 'lucide-react';
import { Plot, Location, Variety, Client } from '../types';

interface PlotIdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: Plot;
  location?: Location;
  variety?: Variety;
  client?: Client;
}

export const PlotIdentificationModal: React.FC<PlotIdentificationModalProps> = ({
  isOpen,
  onClose,
  plot,
  location,
  variety,
  client
}) => {
  const [activeView, setActiveView] = useState<'label' | 'sign'>('sign');
  const [copied, setCopied] = useState(false);
  const [signOrientation, setSignOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  if (!isOpen || !plot) return null;

  // URL pública de trazabilidad en vivo
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://red.hempc.com.ar';
  const traceUrl = `${baseUrl}/#/trace/${plot.id}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(traceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedLat = plot.coordinates?.lat ? Number(plot.coordinates.lat).toFixed(5) : '-';
  const formattedLng = plot.coordinates?.lng ? Number(plot.coordinates.lng).toFixed(5) : '-';
  const surfaceDisplay = `${plot.surfaceArea || 1} ${plot.surfaceUnit || 'ha'}`;
  const campaignDisplay = plot.campaign || '2025/2026';
  const statusDisplay = plot.status || 'Activa';

  const [signPageFilter, setSignPageFilter] = useState<'all' | 'p1' | 'p2'>('all');

  return (
    <div id="modal-print-overlay" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[120] p-3 sm:p-5 font-sans overflow-y-auto">
      {/* Estilos CSS dedicados de impresión limpia a pantalla completa y 2 páginas A4 */}
      <style>{`
        @media print {
          @page {
            size: ${signOrientation === 'horizontal' ? 'A4 landscape' : 'A4 portrait'};
            margin: 6mm;
          }

          /* Asegurar que la ventana de impresión no quede bloqueada ni recortada por el modal fijo */
          html, body {
            overflow: visible !important;
            height: auto !important;
            min-height: 100% !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Desacoplar el modal fixed y scroll containers para permitir paginación fluida de múltiples hojas A4 */
          #modal-print-overlay,
          #modal-print-dialog,
          #modal-print-body {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
            inset: auto !important;
            z-index: auto !important;
            display: block !important;
          }

          body * {
            visibility: hidden !important;
          }

          #printable-sign-container,
          #printable-sign-container *,
          .printable-sheet,
          .printable-sheet *,
          #printable-plot-doc,
          #printable-plot-doc * {
            visibility: visible !important;
          }

          #printable-sign-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          #printable-plot-doc {
            display: block !important;
            position: relative !important;
            margin: 20mm auto !important;
            width: 140mm !important;
            max-width: 95% !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 2px dashed #000000 !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .printable-sheet {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 4px solid #000000 !important;
            margin: 0 0 10mm 0 !important;
            padding: 18px !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            /* Auto-encuadre proporcional al 87% dentro de la hoja A4 sin alterar pantalla */
            zoom: 0.87 !important;
          }

          .printable-sheet:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
            margin-bottom: 0 !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="modal-print-dialog" className="bg-white dark:bg-slate-900 rounded-[32px] max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO DEL MODAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              {activeView === 'sign' ? <ShieldCheck size={26} /> : <QrCode size={26} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-widest bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
                </span>
                <span className="text-[10px] font-mono font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Campaña {campaignDisplay}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                {activeView === 'sign' ? 'Cartel Oficial de Parcela Exterior / Tranquera' : 'Rótulo de Trazabilidad QR (Pasaporte Biológico)'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Pestañas de Cambio de Modo */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center">
              <button
                type="button"
                onClick={() => setActiveView('sign')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  activeView === 'sign'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Cartel para tranquera exterior declarando cáñamo no psicoactivo"
              >
                🪧 Cartel Tranquera (A4)
              </button>
              <button
                type="button"
                onClick={() => setActiveView('label')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  activeView === 'label'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Rótulo técnico QR para pasaporte biológico y carpeta de lote"
              >
                🏷️ Rótulo QR Parcela
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
              {/* Barra de opciones del cartel: Segmentación de Páginas y Orientación */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs no-print">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  <span>
                    Cartel Oficial Tranquera (2 Páginas A4): Pág. 1 Cartel de Alto Impacto / Visible a distancia · Pág. 2 Anexo Técnico & Geodesia.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de visualización de páginas */}
                  <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSignPageFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        signPageFilter === 'all'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Ambas (Pág 1 y 2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignPageFilter('p1')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        signPageFilter === 'p1'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Pág. 1 (Cartel)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignPageFilter('p2')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        signPageFilter === 'p2'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Pág. 2 (Anexo)
                    </button>
                  </div>

                  {/* Selector de orientación */}
                  <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSignOrientation('horizontal')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        signOrientation === 'horizontal'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Horizontal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignOrientation('vertical')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        signOrientation === 'vertical'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Vertical
                    </button>
                  </div>
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
                      <span className="text-[10px] font-mono text-slate-400">Formato A4</span>
                    </div>

                    <div
                      id="printable-plot-sign-p1"
                      className={`printable-sheet bg-white text-slate-950 p-6 md:p-10 rounded-3xl border-4 md:border-8 border-slate-950 shadow-2xl space-y-6 mx-auto ${
                        signOrientation === 'horizontal' ? 'w-full' : 'max-w-2xl'
                      }`}
                    >
                      {/* ENCABEZADO INSTITUCIONAL */}
                      <div className="border-b-4 border-slate-950 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                              REPÚBLICA ARGENTINA · LEY NACIONAL N° 27.669 & DECRETO 405/2023
                            </p>
                          </div>
                          <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight text-slate-950 mt-1">
                            PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO
                          </h1>
                          <p className="text-sm md:text-base font-mono font-black text-emerald-800 uppercase mt-0.5">
                            CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
                          </p>
                          <p className="text-[10px] md:text-xs font-mono font-bold text-slate-600 uppercase mt-0.5">
                            Marco Regulatorio del Cáñamo Industrial · Fiscalización ARICCAME / INASE / SENASA
                          </p>
                        </div>
                        <div className="text-right shrink-0 bg-slate-100 p-3.5 rounded-2xl border-2 border-slate-300">
                          <span className="text-[9px] font-mono font-black uppercase text-slate-500 block">Condición Registral</span>
                          <strong className="text-sm md:text-base font-black uppercase text-emerald-700 block">
                            PARCELA DECLARADA ACTIVA
                          </strong>
                          <span className="text-[11px] font-mono font-bold text-slate-600 block mt-0.5">
                            Campaña: {campaignDisplay}
                          </span>
                        </div>
                      </div>

                      {/* DECLARACIÓN CENTRAL DE MÁXIMO IMPACTO VISUAL EN TRANQUERA (LECTURA A DISTANCIA) */}
                      <div className="bg-amber-100/95 border-4 md:border-8 border-amber-500 p-6 md:p-10 rounded-3xl text-center space-y-4 shadow-inner">
                        <div className="inline-flex items-center justify-center gap-2.5 px-6 py-2 bg-amber-400 border-2 border-amber-600 text-slate-950 rounded-full font-black text-sm md:text-lg uppercase tracking-widest shadow-sm">
                          <ShieldCheck size={22} className="text-slate-950 shrink-0" />
                          <span>DECLARACIÓN DE CULTIVO NO PSICOACTIVO</span>
                        </div>
                        
                        <h2 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-slate-950 leading-none py-2 drop-shadow-sm">
                          CÁÑAMO INDUSTRIAL
                        </h2>

                        <p className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-wide">
                          (Cannabis sativa L. con tenor de THC menor a 1.0% P/P)
                        </p>

                        <div className="w-32 h-2 bg-amber-500 mx-auto rounded-full my-3"></div>

                        <p className="text-sm md:text-xl font-bold text-amber-950 max-w-4xl mx-auto leading-relaxed">
                          Cultivo agrícola no estupefaciente con destino exclusivo a <strong className="underline decoration-amber-600 decoration-4">Fibra Textil, Grano, Bioplásticos, Celulosa y Ensayos de Investigación Bioeconómica</strong>.
                        </p>
                      </div>

                      {/* FRANJA DE IDENTIFICACIÓN RÁPIDA EN TRANQUERA */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 text-xs font-mono">
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Lote / Parcela:</span>
                          <strong className="text-base font-black uppercase text-slate-950 block truncate">{plot.name}</strong>
                          <span className="text-[10px] text-slate-500 block">ID Catastral: {plot.id}</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Establecimiento:</span>
                          <strong className="text-sm font-black uppercase text-slate-950 block truncate">{location?.name || 'Establecimiento Rural'}</strong>
                          <span className="text-[10px] text-slate-500 block truncate">{location?.city || ''}, {location?.province || ''}</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Cultivar Certificado:</span>
                          <strong className="text-sm font-black uppercase text-emerald-800 block truncate">{variety?.name || 'Variedad Homologada'}</strong>
                          <span className="text-[10px] text-slate-500 block">RNC INASE: {variety?.inaseRncNumber || 'Homologada'}</span>
                        </div>
                      </div>

                      {/* ADVERTENCIA LEGAL A FUERZAS DE SEGURIDAD */}
                      <div className="p-4 bg-rose-50 border-2 md:border-3 border-rose-400 rounded-2xl text-xs md:text-sm text-rose-950 font-bold leading-snug">
                        ⚠️ ADVERTENCIA LEGAL A FUERZAS DE SEGURIDAD Y TERCEROS: Predio registrado y fiscalizado bajo la Ley 27.669. Prohibido el ingreso no autorizado o la sustracción de biomasa experimental. Acto penado por los artículos 162, 164 y 186 del Código Penal de la Nación Argentina.
                      </div>

                      {/* FOOTER PÁGINA 1 */}
                      <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 border-t-2 border-slate-300 pt-3 gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-1 bg-white rounded-lg border border-slate-300">
                            <QRCodeSVG value={traceUrl} size={46} level="M" />
                          </div>
                          <div>
                            <span className="font-black text-slate-800 block">PatagonianC LTDA · CUIT: 30-71816113-0 · HempC</span>
                            <span className="text-[9px] text-slate-400 block">Escanear para verificación digital inmediata</span>
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
                      <span className="text-[10px] font-mono text-slate-400">Formato A4</span>
                    </div>

                    <div
                      id="printable-plot-sign-p2"
                      className={`printable-sheet bg-white text-slate-950 p-6 md:p-8 rounded-3xl border-4 md:border-8 border-slate-950 shadow-2xl space-y-5 mx-auto ${
                        signOrientation === 'horizontal' ? 'w-full' : 'max-w-2xl'
                      }`}
                    >
                      {/* ENCABEZADO ANEXO TÉCNICO */}
                      <div className="border-b-4 border-slate-950 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-emerald-700" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                              REPÚBLICA ARGENTINA · LEY NACIONAL N° 27.669 & DECRETO 405/2023
                            </p>
                          </div>
                          <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight text-slate-950 mt-1">
                            ANEXO TÉCNICO Y FICHA REGISTRAL DE PARCELA
                          </h2>
                          <p className="text-xs md:text-sm font-mono font-black text-emerald-800 uppercase mt-0.5">
                            PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO · CUIT: 30-71816113-0 · HempC
                          </p>
                        </div>
                        <div className="text-right shrink-0 bg-slate-100 p-2.5 rounded-xl border border-slate-300">
                          <span className="text-[9px] font-mono font-black uppercase text-slate-500 block">Legajo Oficial</span>
                          <strong className="text-xs font-mono font-black text-slate-900 block">
                            EXP: HEMP-AR-{plot.id.substring(0, 8).toUpperCase()}
                          </strong>
                          <span className="text-[9px] font-mono text-slate-500 block">Campaña {campaignDisplay}</span>
                        </div>
                      </div>

                      {/* SECCIÓN 1: IDENTIFICACIÓN PARCELARIA Y CATASTRAL */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Sprout size={14} className="text-emerald-600" />
                          1. Ficha Catastral & Identificación del Cultivo
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-2 border-slate-300 rounded-2xl p-3.5 bg-slate-50 text-xs font-mono">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Unidad Productiva / Lote:</span>
                            <strong className="text-sm text-slate-950 font-black block">{plot.name}</strong>
                            <span className="text-[10px] text-slate-600 block">ID Parcelario: <strong>{plot.id}</strong></span>
                            <span className="text-[10px] text-slate-600 block">Tipo: <strong>{plot.type || 'Ensayo / Producción'}</strong></span>
                            <span className="text-[10px] text-slate-600 block">Estado: <strong className="text-emerald-700">{statusDisplay}</strong></span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Establecimiento / Campo Padre:</span>
                            <strong className="text-sm text-slate-950 font-black block">{location?.name || 'Establecimiento Rural'}</strong>
                            <span className="text-[10px] text-slate-600 block">Ubicación: {location?.city || ''}, {location?.province || ''}</span>
                            <span className="text-[10px] text-slate-600 block truncate" title={location?.address}>Dirección: {location?.address || 'Zona Rural'}</span>
                            <span className="text-[10px] text-slate-600 block">RENSPA: <strong>{location?.renspaNumber || 'En trámite'}</strong></span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Genética Certificada (INASE):</span>
                            <strong className="text-sm text-emerald-800 font-black block">{variety?.name || 'Cultivar Homologado'}</strong>
                            <span className="text-[10px] text-slate-600 block">RNC INASE: <strong>{variety?.inaseRncNumber || 'Certificación RNC'}</strong></span>
                            <span className="text-[10px] text-slate-600 block">Destino Bioeconómico: <strong>{variety?.usage || 'Fibra / Grano'}</strong></span>
                            <span className="text-[10px] text-slate-600 block">Fotoperíodo: <strong>{variety?.photoperiodType || 'Monoica'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN 2: GEODESIA, CENTROIDE Y TELEDETECCIÓN */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Compass size={14} className="text-emerald-600" />
                          2. Georreferenciación Geodésica & Monitoreo Satelital
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
                          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Superficie Declarada</span>
                            <strong className="text-sm font-black text-slate-900 block">{surfaceDisplay}</strong>
                          </div>
                          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Coordenadas Centroide</span>
                            <strong className="text-xs font-black text-slate-900 block">{formattedLat}, {formattedLng}</strong>
                          </div>
                          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Polígono Geodésico</span>
                            <strong className="text-xs font-bold text-slate-900 block">
                              {plot.polygon && plot.polygon.length >= 3 ? `${plot.polygon.length} Vértices Vectoriales` : 'Centroide georreferenciado'}
                            </strong>
                          </div>
                          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 font-bold block">Vigilancia Espectral</span>
                            <strong className="text-xs font-bold text-emerald-700 block">Copernicus Sentinel-2</strong>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN 3: TITULARIDAD, OPERADOR Y LICENCIAS ARICCAME */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[9px] uppercase text-slate-500 font-bold block">Operador Titular Responsable</span>
                          <strong className="text-xs font-black text-slate-900 block">PatagonianC LTDA Cooperativa de Trabajo</strong>
                          <span className="text-[10px] text-emerald-800 font-bold block">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</span>
                          <span className="text-[10px] text-slate-600 block">Titular Predial / Socio: <strong>{client?.name || location?.ownerName || 'HempC Red Cooperativa'}</strong></span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[9px] uppercase text-slate-500 font-bold block">Licencias y Fiscalización Sanitaria</span>
                          <span className="text-[10px] text-slate-700 block">Lic. Agrícola ARICCAME: <strong>EX-2024-134354227</strong></span>
                          <span className="text-[10px] text-slate-700 block">Lic. Industrial ARICCAME: <strong>EX-2025-119427833</strong></span>
                          <span className="text-[10px] text-emerald-700 font-bold block">Cumplimiento Fitosanitario: Resoluciones SENASA N° 350/99 y 637/11</span>
                        </div>
                      </div>

                      {/* SECCIÓN 4: AUDITORÍA DIGITAL Y RECUADROS DE FIRMAS */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border-t-2 border-slate-300 pt-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <QRCodeSVG value={traceUrl} size={76} level="H" />
                          <div className="text-[9px] font-mono space-y-0.5">
                            <strong className="font-black text-slate-900 block">QR Auditoría Digital</strong>
                            <span className="text-slate-500 block leading-tight">Escaneo directo para verificar historial satelital y DDJJ oficial</span>
                            <span className="text-emerald-700 font-bold block">SENASA · INASE · ARICCAME</span>
                          </div>
                        </div>

                        {/* Caja Firma Responsable Técnico */}
                        <div className="p-3 border-2 border-dashed border-slate-400 rounded-2xl h-24 flex flex-col justify-between text-[9px] font-mono">
                          <span className="font-bold text-slate-500 uppercase">Firma Responsable Técnico / Agrónomo</span>
                          <div className="border-t border-slate-300 pt-1 text-slate-400 text-center">Firma, Aclaración y Matrícula</div>
                        </div>

                        {/* Caja Visado Inspección Oficial */}
                        <div className="p-3 border-2 border-dashed border-slate-400 rounded-2xl h-24 flex flex-col justify-between text-[9px] font-mono">
                          <span className="font-bold text-slate-500 uppercase">Inspección Oficial / Autoridad Rural</span>
                          <div className="border-t border-slate-300 pt-1 text-slate-400 text-center">Sello, Fecha y Matrícula Inspector</div>
                        </div>
                      </div>

                      {/* FOOTER PÁGINA 2 */}
                      <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-500 border-t-2 border-slate-300 pt-2 gap-1">
                        <span className="font-bold">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</span>
                        <span>Página 2 de 2 · Anexo Técnico y Geodésico · red.hempc.com.ar</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* VISTA 2: RÓTULO TÉCNICO DE TRAZABILIDAD QR (FORMATO ETIQUETA / PASAPORTE) */}
          {activeView === 'label' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Info size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Rótulo técnico de 100 x 150 mm para carpetas de lote, estacas de parcela, remitos de cosecha y certificación fitosanitaria.
                </span>
              </div>

              {/* CONTENEDOR DE LA ETIQUETA IMPRIMIBLE */}
              <div 
                id="printable-plot-doc"
                className="bg-white text-slate-900 p-6 rounded-3xl border-2 border-dashed border-slate-400 shadow-lg space-y-4 max-w-lg mx-auto"
              >
                {/* CABECERA ETIQUETA */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                      <Sprout size={18} className="text-emerald-600" />
                      <span>PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO</span>
                    </div>
                    <p className="text-[11px] font-black text-emerald-800 uppercase font-mono mt-0.5">
                      CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
                    </p>
                    <p className="text-[9px] text-slate-600 uppercase font-bold">
                      Pasaporte Biológico de Parcela · Trazabilidad Agro 4.0
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600 text-white">
                      {statusDisplay}
                    </span>
                    <p className="text-[8px] text-slate-400 mt-0.5 font-bold">LEY 27.669</p>
                  </div>
                </div>

                {/* DETALLE PARCELA */}
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Parcela / Unidad Productiva:</span>
                  <strong className="text-lg font-black uppercase text-slate-900 block leading-tight">
                    {plot.name}
                  </strong>
                  <span className="text-[11px] font-mono text-slate-600 block mt-0.5">
                    ID Parcelario: <strong>{plot.id}</strong>
                  </span>
                </div>

                {/* DATOS CRUZADOS */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Campo / Sitio:</span>
                    <strong className="text-slate-900 truncate block">{location?.name || 'S/D'}</strong>
                    <span className="text-[9px] text-slate-500">{location?.city || location?.province}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Cultivar Certificado:</span>
                    <strong className="text-emerald-700 truncate block">{variety?.name || 'INASE'}</strong>
                    <span className="text-[9px] text-slate-500">{variety?.inaseRncNumber || 'RNC N°'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Superficie:</span>
                    <strong className="text-slate-900 block">{surfaceDisplay}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Campaña:</span>
                    <strong className="text-slate-900 block">{campaignDisplay}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[8px] text-slate-400 uppercase block font-bold">Coordenadas GPS Centroide:</span>
                    <strong className="text-[11px] text-slate-800 block">{formattedLat}, {formattedLng}</strong>
                  </div>
                </div>

                {/* QR Y VERIFICACIÓN */}
                <div className="flex items-center gap-4 border-t border-slate-200 pt-3">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <QRCodeSVG
                      value={traceUrl}
                      size={105}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <p className="font-bold text-slate-900">
                      Trazabilidad Digital Completa
                    </p>
                    <p className="text-slate-500 text-[9px] leading-tight">
                      Escanee para verificar la declaración jurada, historial fitosanitario y pasadas satelitales Sentinel-2 en tiempo real.
                    </p>
                    <span className="text-[9px] text-emerald-700 font-bold block pt-1">
                      Fiscalización: SENASA · ARICCAME
                    </span>
                  </div>
                </div>

                {/* PIE */}
                <div className="text-[8px] font-mono text-slate-500 text-center border-t border-slate-200 pt-2 space-y-0.5">
                  <div className="font-bold text-slate-700">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
                  <div className="text-slate-400">Documento emitido electrónicamente · red.hempc.com.ar</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES Y BOTONES DE DESCARGA / IMPRESIÓN */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? '¡Enlace Copiado!' : 'Copiar URL Pública'}</span>
            </button>

            <a
              href={`/#/trace/${plot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
            >
              <ExternalLink size={14} />
              <span>Ver Trazabilidad en Vivo</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
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
              <span>{activeView === 'sign' ? 'Imprimir Cartel Tranquera' : 'Imprimir Rótulo QR'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
