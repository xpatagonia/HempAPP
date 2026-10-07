import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from './BarcodeRenderer';
import { 
  X, Printer, Download, ShieldCheck, QrCode, ScanBarcode, 
  Sprout, Package, Check, Copy, ExternalLink, Calendar, MapPin
} from 'lucide-react';
import { SeedBatch, Variety, StoragePoint } from '../types';

interface TraceabilityLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: SeedBatch;
  variety?: Variety;
  storagePoint?: StoragePoint;
}

export const TraceabilityLabelModal: React.FC<TraceabilityLabelModalProps> = ({
  isOpen,
  onClose,
  batch,
  variety,
  storagePoint
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !batch) return null;

  // URL pública de trazabilidad para el QR (funciona tanto en producción como en dev)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hemp-net.vercel.app';
  // Si tiene parcela de origen vinculada o se rastrea por ID
  const traceUrl = `${baseUrl}/trace/${batch.originPlotId || batch.id}`;

  // Código para el código de barras (Rótulo oficial o batch code)
  const barcodeValue = (batch.labelSerialNumber || batch.batchCode).replace(/[^A-Z0-9-]/gi, '').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                Emisión de Rótulo & Código de Barras
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Rótulo Oficial de Trazabilidad
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {/* CONTENEDOR DE LA ETIQUETA IMPRIMIBLE (ESTÁNDAR TÉRMICO / INASE 100x150mm) */}
        <div 
          id="printable-label"
          className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-inner space-y-4 my-2"
        >
          {/* CABECERA DE LA ETIQUETA */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                <Sprout size={16} className="text-emerald-600" />
                <span>NUCLEUS TRACE · PASAPORTE BIOLÓGICO</span>
              </div>
              <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                Fiscalización Oficial INASE / ARICCAME / GACP
              </p>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-900 text-white">
                {batch.category ? `Cat: ${batch.category}` : 'Lote Fiscal'}
              </span>
              <p className="text-[8px] text-slate-400 mt-0.5">LEY 27.669</p>
            </div>
          </div>

          {/* DATOS CLAVE DEL CULTIVAR Y LOTE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Cultivar / Genética:</span>
              <strong className="text-base font-black uppercase text-slate-900 block leading-tight">
                {variety?.name || 'Variedad Homologada'}
              </strong>
              <span className="text-[10px] text-slate-600 block mt-0.5">
                RNC INASE: {variety?.inaseRncNumber || 'INASE-RNC-8492/23'}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Identificador de Lote:</span>
              <strong className="text-sm font-black uppercase text-slate-900 block leading-tight">
                {batch.batchCode}
              </strong>
              {batch.labelSerialNumber && (
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  Rótulo: {batch.labelSerialNumber}
                </span>
              )}
            </div>
          </div>

          {/* MATRIZ DE CALIDAD TÉCNICA */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center text-xs">
            {batch.materialType === 'harvested_grain' ? (
              <>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Humedad</span>
                  <strong className="text-slate-900">{batch.moisturePct || 8.4}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Inocuidad</span>
                  <strong className="text-emerald-700 font-bold">SENASA OK</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Neta</span>
                  <strong className="text-slate-900">{Number(batch.remainingQuantity.toFixed(1))} kg</strong>
                </div>
              </>
            ) : batch.materialType === 'biomass_cbg' ? (
              <>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">THC HPLC</span>
                  <strong className="text-emerald-700 font-bold">&lt;0.04% OK</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">CBG Nativo</span>
                  <strong className="text-slate-900">{batch.hplcCbgPct || 2.7}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Neta</span>
                  <strong className="text-slate-900">{Number(batch.remainingQuantity.toFixed(1))} kg</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Poder Germinativo</span>
                  <strong className="text-emerald-700 font-bold">{batch.germination || 92}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Pureza Botánica</span>
                  <strong className="text-slate-900">{batch.purity || 99.4}%</strong>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Masa Declarada</span>
                  <strong className="text-slate-900">{Number(batch.remainingQuantity.toFixed(1))} kg</strong>
                </div>
              </>
            )}
          </div>

          {/* TITULAR OPERADOR RESPONSABLE & LICENCIAS OFICIALES ARICCAME */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1">
              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                  Titular & Operador Responsable
                </span>
                <strong className="text-xs font-black uppercase text-slate-900">
                  Cooperativa PatagonianC LTDA
                </strong>
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
          <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
            <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">
              Código de Barras Industrial (GS1 / Code 128)
            </span>
            <BarcodeRenderer 
              value={barcodeValue || 'HEMP-TRACE-001'}
              width={1.6}
              height={44}
              fontSize={10}
            />
          </div>

          {/* CÓDIGO QR Y CUSTODIA EN DESTINO */}
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1 text-xs">
              <span className="text-[9px] font-black uppercase text-emerald-700 flex items-center gap-1">
                <QrCode size={13} />
                <span>QR Trazabilidad Pública</span>
              </span>
              <p className="text-[9px] text-slate-600 leading-tight">
                Escanee con la cámara para auditar en tiempo real el origen de la semilla, DDJJ geodésica y protocolo HPLC.
              </p>
              <div className="text-[8px] text-slate-400 pt-1 font-mono break-all truncate max-w-[280px]">
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
            <span>Cooperativa PatagonianC LTDA · CUIT 30-71816113-0 · Almacén: {storagePoint?.name || 'Central Pergamino'}</span>
            <span>Lic. Agrícola EX-2024-134354227 · Lic. Industrial EX-2025-119427833</span>
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
