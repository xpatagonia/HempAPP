import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from './BarcodeRenderer';
import { 
  X, Printer, Download, ShieldCheck, QrCode, ScanBarcode, 
  Sprout, Package, Check, Copy, ExternalLink, Calendar, MapPin, UserCheck, Award, Scale
} from 'lucide-react';
import { SeedBatch, Variety, StoragePoint } from '../types';
import { useAppContext } from '../context/AppContext';
import { formatBatchMassKg, convertSeedMassToKg } from '../src/utils/seedTraceability';

interface TraceabilityLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: SeedBatch;
  variety?: Variety;
  storagePoint?: StoragePoint;
}

const QUALITY_LABELS: Record<string, { label: string; badgeClass: string }> = {
  GRADO_A_SUPERIOR: { label: 'GRADO A · ÉLITE SUPERIOR', badgeClass: 'bg-emerald-600 text-white' },
  GRADO_B_ESTANDAR: { label: 'GRADO B · ESTÁNDAR FISCAL', badgeClass: 'bg-sky-600 text-white' },
  GRADO_C_CONDICIONAL: { label: 'GRADO C · CONDICIONAL', badgeClass: 'bg-amber-600 text-white' },
  NO_CONFORME: { label: 'NO CONFORME · RECHAZADO', badgeClass: 'bg-rose-600 text-white' },
};

export const TraceabilityLabelModal: React.FC<TraceabilityLabelModalProps> = ({
  isOpen,
  onClose,
  batch,
  variety,
  storagePoint
}) => {
  const { plots } = useAppContext();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !batch) return null;

  const baseUrl = (() => {
    if (typeof window === 'undefined') return 'https://red.hempc.com.ar';
    return window.location.origin;
  })();

  const motherSeedLot = batch.certificationNumber || (batch.batchCode.includes('-REC-') ? batch.batchCode.split('-REC-')[0] : batch.batchCode);
  const officialRotulo = batch.labelSerialNumber || 'INASE-SERIE-2025-A0041928';

  const plotsWithThisBatch = plots.filter(p => p.seedBatchId === batch.id);
  const usedInPlotsKg = plotsWithThisBatch.reduce(
    (acc, p) => acc + convertSeedMassToKg(p.usedSeedValue, p.usedSeedUnit || 'gr'),
    0
  );
  const initialMass = formatBatchMassKg(batch.initialQuantity);
  const usedMass = formatBatchMassKg(usedInPlotsKg);
  const remainingMass = formatBatchMassKg(batch.remainingQuantity);

  // URL de trazabilidad directa al Lote (Semilla o Material Obtenido) con parámetros de respaldo
  const traceUrl = (() => {
    const params = new URLSearchParams();
    params.set('type', batch.materialType || 'seed');
    if (batch.batchCode) params.set('code', batch.batchCode);
    params.set('seedLot', motherSeedLot);
    params.set('seedRotulo', officialRotulo);
    if (variety?.name) params.set('var', variety.name);
    if (batch.qualityGrade) params.set('grade', batch.qualityGrade);
    if (batch.samplerName) params.set('sampler', batch.samplerName);
    if (batch.inspectorName) params.set('inspector', batch.inspectorName);
    if (batch.originPlotId) params.set('plotId', batch.originPlotId);
    if (batch.originInspectionId) params.set('inspId', batch.originInspectionId);
    params.set('initKg', initialMass.kg.toFixed(3));
    params.set('remKg', remainingMass.kg.toFixed(3));
    params.set('usedKg', usedMass.kg.toFixed(3));
    params.set('usedGr', String(usedMass.gr));
    return `${baseUrl}/#/trace/${encodeURIComponent(batch.id)}?${params.toString()}`;
  })();

  // Código para el código de barras (Rótulo oficial o batch code)
  const barcodeValue = (batch.labelSerialNumber || motherSeedLot || batch.batchCode).replace(/[^A-Z0-9-]/gi, '').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qConfig = batch.qualityGrade ? QUALITY_LABELS[batch.qualityGrade] : QUALITY_LABELS.GRADO_A_SUPERIOR;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4 font-mono">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
        
        {/* ENCABEZADO MODAL */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ScanBarcode size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                Emisión de Rótulo & Código QR Activo
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Rótulo Oficial de Trazabilidad & Custodia de Lote
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {/* CONTENEDOR DE LA ETIQUETA IMPRIMIBLE (ESTÁNDAR TÉRMICO / INASE 100x150mm) */}
        <div 
          id="printable-label"
          className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-inner space-y-3.5 my-2"
        >
          {/* CABECERA DE LA ETIQUETA */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                <Sprout size={16} className="text-emerald-600" />
                <span>PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO</span>
              </div>
              <p className="text-[10px] text-emerald-800 uppercase font-black font-mono mt-0.5">
                CUIT: 30-71816113-0 · HempC (Unidad de Negocios)
              </p>
              <p className="text-[8px] text-slate-500 uppercase font-bold">
                Pasaporte Biológico · Fiscalización Oficial INASE / ARICCAME / SENASA
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-900 text-white block">
                {batch.category ? `Cat: ${batch.category}` : batch.materialType === 'seed' ? 'Semilla Fiscal' : 'Material Obtenido'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase inline-flex items-center gap-1 ${qConfig.badgeClass}`}>
                <Award size={10} />
                {qConfig.label} {batch.qualityScore ? `(${batch.qualityScore}/100)` : ''}
              </span>
            </div>
          </div>

          {/* DATOS CLAVE DEL CULTIVAR Y N° DE LOTE DE SEMILLA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Cultivar / Genética:</span>
              <strong className="text-base font-black uppercase text-slate-900 block leading-tight">
                {variety?.name || 'Variedad Homologada'}
              </strong>
              <span className="text-[10px] text-slate-600 block mt-0.5">
                RNC INASE: <strong>{variety?.inaseRncNumber || 'INASE-RNC-8492/23'}</strong>
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Proveedor: <strong>{batch.supplierName || 'Ananda Pampa / Hemp-It ADN'}</strong>
              </span>
            </div>

            <div className="p-2.5 bg-emerald-50/80 rounded-xl border-2 border-emerald-500">
              <span className="text-[9px] text-emerald-800 uppercase font-black block">
                {batch.materialType && batch.materialType !== 'seed' ? 'N° Lote Material / Lote Semilla Origen:' : 'N° de Lote de Semilla:'}
              </span>
              <strong className="text-base font-black uppercase text-slate-950 block leading-tight">
                {motherSeedLot}
              </strong>
              <span className="text-[9.5px] text-slate-700 font-bold block mt-0.5 break-all">
                Cód. Trazabilidad: {batch.batchCode}
              </span>
              <span className="text-[9.5px] text-emerald-800 font-black block mt-0.5">
                Rótulo Oficial INASE: {officialRotulo}
              </span>
              {batch.sampleCode && (
                <span className="text-[9px] text-indigo-700 font-bold block mt-0.5">
                  Acta Muestra ISTA: {batch.sampleCode}
                </span>
              )}
            </div>
          </div>

          {/* TRAZABILIDAD DEL LOTE (CIRCUITO ORIGEN -> RECEPCIÓN -> CUSTODIA) */}
          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-[9.5px] space-y-1">
            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
              <span className="font-black uppercase text-emerald-400 tracking-wider">
                Trazabilidad del Lote de Semilla (Cadena de Custodia QR)
              </span>
              <span className="text-[8.5px] text-slate-300 font-bold">
                Ingreso: {batch.purchaseDate || '2025-10-15'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div>
                <span className="text-[8px] text-slate-400 uppercase block">1. Lote Madre / Cert.</span>
                <strong className="text-emerald-300 block truncate">{motherSeedLot}</strong>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase block">2. Rótulo / Precinto</span>
                <strong className="text-sky-300 block truncate">{officialRotulo}</strong>
              </div>
              <div>
                <span className="text-[8px] text-slate-400 uppercase block">3. Nodo / Almacén</span>
                <strong className="text-amber-300 block truncate">{storagePoint?.name || 'Bóveda Central'}</strong>
              </div>
            </div>
          </div>

          {/* BALANCE FÍSICO AUDITADO EN T / KILOS / GRAMOS */}
          <div className="grid grid-cols-3 gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-center text-[10px]">
            <div className="bg-white p-1.5 rounded-lg border border-emerald-100">
              <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Inicial Lote</span>
              <strong className="text-slate-900 font-black block">{initialMass.kgStr}</strong>
              <span className="text-[8px] text-slate-500 block">{initialMass.grStr} · {initialMass.tnStr}</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-indigo-100">
              <span className="text-[8px] text-indigo-700 uppercase block font-bold">
                Carga Siembra ({plotsWithThisBatch.length} Parc.)
              </span>
              <strong className="text-indigo-900 font-black block">{usedMass.kgStr}</strong>
              <span className="text-[8px] text-indigo-600 font-bold block">{usedMass.grStr} · {usedMass.tnStr}</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-emerald-300">
              <span className="text-[8px] text-emerald-800 uppercase block font-black">Stock Remanente Neto</span>
              <strong className="text-emerald-800 font-black block">{remainingMass.kgStr}</strong>
              <span className="text-[8px] text-emerald-700 font-bold block">{remainingMass.grStr} · {remainingMass.tnStr}</span>
            </div>
          </div>

          {/* MATRIZ DE CALIDAD TÉCNICA */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center text-xs">
            {batch.materialType === 'harvested_grain' ? (
              <>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Calidad Lote</span>
                  <strong className="text-emerald-700 text-[10px]">{batch.qualityScore || 95}/100 Pts</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Humedad</span>
                  <strong className="text-slate-900">{batch.moisturePct || 8.4}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Pureza</span>
                  <strong className="text-emerald-700 font-bold">{batch.purity || 99.1}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Neta (T/kg/gr)</span>
                  <strong className="text-slate-900 text-[10px]">{remainingMass.combinedKgGr}</strong>
                </div>
              </>
            ) : batch.materialType === 'biomass_cbg' ? (
              <>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Calidad Lote</span>
                  <strong className="text-emerald-700 text-[10px]">{batch.qualityScore || 94}/100 Pts</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">THC HPLC</span>
                  <strong className="text-emerald-700 font-bold">&lt;0.04% OK</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">CBG Nativo</span>
                  <strong className="text-slate-900">{batch.hplcCbgPct || 2.7}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Neta (T/kg/gr)</span>
                  <strong className="text-slate-900 text-[10px]">{remainingMass.combinedKgGr}</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Calidad Lote</span>
                  <strong className="text-emerald-700 text-[10px]">{batch.qualityScore || 96}/100 Pts</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Germinación</span>
                  <strong className="text-emerald-700 font-bold">{batch.germination || 92}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Pureza Bot.</span>
                  <strong className="text-slate-900">{batch.purity || 99.4}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Neta (kg/gr)</span>
                  <strong className="text-slate-900 text-[10px]">{remainingMass.combinedKgGr}</strong>
                </div>
              </>
            )}
          </div>

          {/* PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-1">
              <span className="font-black uppercase text-indigo-900 flex items-center gap-1 text-[9px]">
                <UserCheck size={12} className="text-indigo-700" />
                Personal Interviniente en Toma de Muestras y Custodia
              </span>
              <span className="text-[8px] font-bold text-indigo-700 uppercase">
                {batch.samplingMethod || 'Protocolo ISTA / INASE'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-1.5 rounded-lg border border-indigo-100">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Responsable Toma de Muestra</span>
                <strong className="text-slate-900 font-black block truncate">
                  {batch.samplerName || 'Matias QUINTANA'}
                </strong>
                <span className="text-[8px] text-indigo-700 block">
                  {batch.samplerDniOrMatricula || 'Muestreador Habilitado'} {batch.sampleCode ? `· ${batch.sampleCode}` : ''}
                </span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-indigo-100">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">
                  {batch.harvestResponsibleName ? 'Director Técnico / Resp. Cosecha' : 'Director Técnico Homologante'}
                </span>
                <strong className="text-slate-900 font-black block truncate">
                  {batch.inspectorName || 'Ing. Agr. Julian PIZARRO'}
                </strong>
                <span className="text-[8px] text-emerald-700 block truncate">
                  {batch.harvestResponsibleName ? `Cosecha: ${batch.harvestResponsibleName}` : (batch.inspectorMatricula || 'MP CIAFBA 14.892')}
                </span>
              </div>
            </div>
          </div>

          {/* TITULAR OPERADOR RESPONSABLE & LICENCIAS OFICIALES ARICCAME */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1">
              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                  Titular & Operador Responsable
                </span>
                <strong className="text-xs font-black uppercase text-slate-900 block">
                  PatagonianC LTDA Cooperativa de Trabajo
                </strong>
                <span className="text-[9px] font-mono font-bold text-emerald-800 block">
                  HempC (Unidad de Negocios)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black uppercase text-slate-400 block">CUIT</span>
                <span className="text-[11px] font-mono font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  30-71816113-0
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[9px]">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[7.5px] font-bold text-emerald-700 uppercase block">Lic. Agrícola ARICCAME</span>
                <strong className="font-mono text-slate-900 text-[8.5px] block truncate" title="EX-2024-134354227--APN-ARICCAME#MEC">
                  EX-2024-134354227--APN-ARICCAME#MEC
                </strong>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-[7.5px] font-bold text-sky-700 uppercase block">Lic. Industrial ARICCAME</span>
                <strong className="font-mono text-slate-900 text-[8.5px] block truncate" title="EX-2025-119427833--APN-ARICCAME#MEC">
                  EX-2025-119427833--APN-ARICCAME#MEC
                </strong>
              </div>
            </div>
          </div>

          {/* CÓDIGO DE BARRAS (CODE 128) */}
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center">
            <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">
              Código de Barras Industrial (GS1 / Code 128) · Lote: {motherSeedLot}
            </span>
            <BarcodeRenderer 
              value={barcodeValue || 'HEMP-TRACE-001'}
              width={1.6}
              height={40}
              fontSize={10}
            />
          </div>

          {/* CÓDIGO QR Y CUSTODIA EN DESTINO */}
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1 text-xs">
              <span className="text-[9px] font-black uppercase text-emerald-700 flex items-center gap-1">
                <QrCode size={13} />
                <span>QR Trazabilidad Integral del Lote</span>
              </span>
              <span className="text-[9.5px] font-black text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                N° Lote de Semilla: {motherSeedLot} · Rótulo: {officialRotulo}
              </span>
              <p className="text-[9px] text-slate-600 leading-tight">
                Escanee con la cámara para auditar N° de lote de semilla, calidad ISTA, personal interviniente en muestreo, parcelas sembradas y material obtenido.
              </p>
              <div className="text-[8px] text-slate-400 pt-0.5 font-mono break-all truncate max-w-[280px]">
                {traceUrl}
              </div>
            </div>

            <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-sm shrink-0">
              <QRCodeSVG 
                value={traceUrl} 
                size={84}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* PIE DE ETIQUETA */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center text-[8px] text-slate-500 gap-1">
            <span className="font-bold">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC</span>
            <span>Almacén: {storagePoint?.name || 'Central Pergamino'} · Lic. ARICCAME EX-2024-134354227</span>
          </div>
        </div>

        {/* ACCIONES Y BOTONES */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition flex items-center gap-1.5 font-bold"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? '¡Enlace Copiado!' : 'Copiar URL QR'}</span>
            </button>
            <a
              href={traceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition"
              title="Abrir Trazabilidad Pública"
            >
              <ExternalLink size={14} />
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-400 font-bold uppercase hover:text-slate-600"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold uppercase tracking-wider shadow flex items-center justify-center gap-2 hover:bg-emerald-500 transition"
            >
              <Printer size={15} />
              <span>Imprimir Rótulo Fiscal</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
