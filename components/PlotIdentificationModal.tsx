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

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[120] p-3 sm:p-5 font-sans overflow-y-auto">
      {/* Estilos CSS dedicados de impresión limpia a pantalla completa */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-plot-doc, #printable-plot-doc * {
            visibility: visible !important;
          }
          #printable-plot-doc {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: auto !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
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
        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4">

          {/* VISTA 1: CARTEL PARA TRANQUERA EXTERIOR (DECLARANDO CÁÑAMO NO PSICOACTIVO) */}
          {activeView === 'sign' && (
            <div className="space-y-4">
              {/* Barra de opciones del cartel */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Cartel reglamentario para exhibir en tranquera de acceso y linderos exteriores del campo.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Orientación:</span>
                  <button
                    type="button"
                    onClick={() => setSignOrientation('horizontal')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                      signOrientation === 'horizontal'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignOrientation('vertical')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                      signOrientation === 'vertical'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Vertical
                  </button>
                </div>
              </div>

              {/* DOCUMENTO IMPRIMIBLE: CARTEL EXTERIOR */}
              <div
                id="printable-plot-doc"
                className={`bg-white text-slate-950 p-6 md:p-8 rounded-3xl border-4 border-slate-950 shadow-xl space-y-5 mx-auto ${
                  signOrientation === 'horizontal' ? 'w-full' : 'max-w-2xl'
                }`}
              >
                {/* 1. ENCABEZADO INSTITUCIONAL */}
                <div className="border-b-4 border-slate-950 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-600 inline-block"></span>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                        REPÚBLICA ARGENTINA · LEY NACIONAL N° 27.669 & DECRETO 405/2023
                      </p>
                    </div>
                    <h1 className="text-lg md:text-2xl font-black uppercase tracking-tight text-slate-950 mt-1">
                      PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO
                    </h1>
                    <p className="text-[13px] font-mono font-black text-emerald-800 uppercase mt-0.5">
                      CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-600 uppercase mt-0.5">
                      Marco Regulatorio del Cáñamo y Cannabis · Fiscalización ARICCAME / INASE / SENASA
                    </p>
                  </div>
                  <div className="text-right shrink-0 bg-slate-100 p-3 rounded-2xl border-2 border-slate-300">
                    <span className="text-[9px] font-mono font-black uppercase text-slate-500 block">Condición Registral</span>
                    <strong className="text-sm font-black uppercase text-emerald-700 block">
                      PARCELA DECLARADA ACTIVA
                    </strong>
                    <span className="text-[10px] font-mono font-bold text-slate-600 block mt-0.5">
                      Campaña: {campaignDisplay}
                    </span>
                  </div>
                </div>

                {/* 2. DECLARACIÓN PRINCIPAL MUY DESTACADA EN TRANQUERA */}
                <div className="bg-amber-100/90 border-4 border-amber-500 p-5 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-amber-900">
                    <ShieldCheck size={28} className="text-emerald-700" />
                    <span className="text-xs md:text-sm font-black uppercase tracking-widest">
                      DECLARACIÓN DE CULTIVO NO PSICOACTIVO
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-slate-950 leading-tight">
                    CÁÑAMO INDUSTRIAL
                  </h2>
                  <p className="text-sm md:text-base font-black text-slate-800 uppercase">
                    (Cannabis sativa L. con tenor de THC menor a 1.0% P/P)
                  </p>
                  <p className="text-xs md:text-sm font-bold text-amber-950 max-w-2xl mx-auto leading-snug">
                    Cultivo agrícola no estupefaciente con destino exclusivo a <strong>Fibra Textil, Grano, Bioplásticos, Celulosa y Ensayos de Investigación Bioeconómica</strong>.
                  </p>
                </div>

                {/* 3. GRILLA TÉCNICA DE IDENTIFICACIÓN PARCELARIA Y GEODÉSICA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-2 border-slate-300 rounded-2xl p-4 bg-slate-50">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">
                      1. Unidad Productiva / Lote:
                    </span>
                    <strong className="text-base font-black uppercase text-slate-950 block">
                      {plot.name}
                    </strong>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 block">
                      ID Catastral: <strong>{plot.id}</strong>
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 block">
                      Tipo: <strong>{plot.type || 'Ensayo / Producción'}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">
                      2. Establecimiento / Campo Padre:
                    </span>
                    <strong className="text-base font-black uppercase text-slate-950 block">
                      {location?.name || 'Establecimiento Agropecuario'}
                    </strong>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 block">
                      {location?.city || 'Localidad'}, {location?.province || 'Provincia'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 block truncate" title={location?.address}>
                      {location?.address || 'Ruta / Paraje Rural'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">
                      3. Genética & Obtención (INASE):
                    </span>
                    <strong className="text-base font-black uppercase text-emerald-800 block">
                      {variety?.name || 'Variedad Homologada'}
                    </strong>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 block">
                      RNC INASE: <strong>{variety?.inaseRncNumber || 'Certificación RNC'}</strong>
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 block">
                      Destino: <strong>{variety?.usage || 'Fibra / Grano'}</strong>
                    </span>
                  </div>
                </div>

                {/* 4. COORDENADAS GEODÉSICAS Y CODIGO QR DE VERIFICACIÓN OFICIAL */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-t-2 border-slate-300 pt-4">
                  <div className="md:col-span-3 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Superficie Declarada</span>
                        <strong className="text-sm font-black text-slate-900 block">{surfaceDisplay}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Coordenadas Geodésicas</span>
                        <strong className="text-xs font-mono font-black text-slate-900 block">
                          {formattedLat}, {formattedLng}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Titular / Operador Responsable</span>
                        <strong className="text-xs font-bold text-slate-900 truncate block">
                          PatagonianC LTDA · CUIT: 30-71816113-0
                        </strong>
                        <span className="text-[9px] font-mono text-emerald-800 font-bold block truncate">
                          HempC (Unidad de Negocios) {client?.name ? `· Socio: ${client.name}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl text-[10px] text-red-950 font-bold leading-tight">
                      ⚠️ ADVERTENCIA LEGAL A FUERZAS DE SEGURIDAD Y TERCEROS: Predio registrado y fiscalizado bajo la Ley 27.669. Prohibido el ingreso no autorizado o la sustracción de biomasa experimental. Acto penado por los artículos 162, 164 y 186 del Código Penal de la Nación Argentina.
                    </div>
                  </div>

                  {/* QR VECTORIAL DE AUDITORÍA OFICIAL */}
                  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border-2 border-slate-300 text-center">
                    <QRCodeSVG
                      value={traceUrl}
                      size={120}
                      level="H"
                      includeMargin={true}
                    />
                    <span className="text-[8px] font-mono font-black uppercase text-slate-500 mt-1 block">
                      Escanear para Auditoría Digital Oficial
                    </span>
                  </div>
                </div>

                {/* 5. PIE DEL CARTEL */}
                <div className="flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-500 border-t-2 border-slate-300 pt-2 gap-1">
                  <span className="font-bold">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</span>
                  <span>Plataforma HempTrack · Emisión: {new Date().toLocaleDateString('es-AR')} · red.hempc.com.ar</span>
                </div>
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
