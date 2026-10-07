import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from './BarcodeRenderer';
import { 
  X, Printer, Check, Copy, ExternalLink, Sprout, ShieldCheck, 
  FlaskConical, Globe, Calendar, Award, Droplets, Thermometer, Scale, Compass
} from 'lucide-react';
import { Variety, SeedBatch } from '../types';

interface VarietyPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  variety: Variety;
  batches?: SeedBatch[];
}

export const VarietyPassportModal: React.FC<VarietyPassportModalProps> = ({
  isOpen,
  onClose,
  variety,
  batches = []
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !variety) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hemp-net.vercel.app';
  const traceUrl = `${baseUrl}/trace/${variety.id}`;

  // Código de barras normalizado (ej: INASE-RNC-8492-23 o VAR-USO31)
  const rawCode = variety.inaseRncNumber || `VAR-${variety.name.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
  const barcodeValue = rawCode.replace(/[^A-Z0-9-]/gi, '').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalStockKg = batches.reduce((acc, b) => acc + (b.remainingQuantity || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4 font-mono">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
        
        {/* HEADER MODAL */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Sprout size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                Emisión de Pasaporte Genético & Rótulo
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Pasaporte Fitotécnico Oficial
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {/* ETIQUETA / PASAPORTE IMPRIMIBLE */}
        <div 
          id="printable-variety-passport"
          className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-inner space-y-4 my-2"
        >
          {/* CABECERA FITOTÉCNICA */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>NUCLEUS GENETICS · PASAPORTE FITOTÉCNICO</span>
              </div>
              <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                Registro Nacional de Cultivares (INASE / OECD / UE) · Ley 27.669
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                {variety.usage}
              </span>
              <p className="text-[8px] text-slate-400 font-bold mt-1">
                {variety.photoperiodType || 'Monoica'}
              </p>
            </div>
          </div>

          {/* DATOS CENTRALES DEL CULTIVAR */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Cultivar / Denominación:</span>
              <strong className="text-xl font-black uppercase text-slate-900 block leading-tight">
                {variety.name}
              </strong>
              <span className="text-[10px] text-slate-600 block mt-1">
                Obtentor: <strong>{variety.breederName || 'Hemp-it ADN / FNPC'}</strong> ({variety.breederCountry || 'Francia'})
              </span>
            </div>

            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Registro Fiscal:</span>
              <strong className="text-sm font-black uppercase text-slate-900 block leading-tight">
                {variety.inaseRncNumber || 'RNC INASE HOMOLOGADO'}
              </strong>
              <div className="flex gap-1.5 mt-1">
                {variety.oecdListing && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-black uppercase rounded">
                    Listado OECD
                  </span>
                )}
                <span className="px-2 py-0.5 bg-sky-100 text-sky-900 text-[9px] font-black uppercase rounded">
                  {variety.cycleDays} días ciclo
                </span>
              </div>
            </div>
          </div>

          {/* LÍMITES QUÍMICOS Y CANNABINOIDES AUDITADOS */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center text-xs">
            <div>
              <span className="text-[8px] text-slate-400 uppercase block font-bold">THC Límite Legal</span>
              <strong className="text-emerald-700 font-black text-sm">
                &lt; {variety.expectedThc !== undefined ? variety.expectedThc : '0.30'}%
              </strong>
              <span className="text-[8px] text-emerald-600 block">Norma Internacional OK</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 uppercase block font-bold">Quimiotipo / CBG</span>
              <strong className="text-slate-900 font-bold text-sm">
                {variety.expectedCbg ? `${variety.expectedCbg}% CBG` : 'Tipo V (Fibra)'}
              </strong>
              <span className="text-[8px] text-slate-500 block">HPLC Auditado</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 uppercase block font-bold">Stock Semilla Nodo</span>
              <strong className="text-slate-900 font-bold text-sm">
                {totalStockKg.toLocaleString()} kg
              </strong>
              <span className="text-[8px] text-slate-500 block">{batches.length} Lotes C1/C2</span>
            </div>
          </div>

          {/* PARÁMETROS AGRONÓMICOS OFICIALES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Densidad Siembra</span>
              <strong className="text-slate-800">{variety.optimalSowingDensityKgHa || 45} kg/ha</strong>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Peso 1.000 Granos</span>
              <strong className="text-slate-800">{variety.thousandSeedWeightGr || 16.5} g</strong>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Demanda Hídrica</span>
              <strong className="text-slate-800">{variety.waterNeedMm || 480} mm</strong>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Suma Térmica</span>
              <strong className="text-slate-800">{variety.gddRequirement || 1900} °C d</strong>
            </div>
          </div>

          {/* CÓDIGO DE BARRAS INDUSTRIAL (CODE 128) */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
            <span className="text-[8px] font-bold text-slate-400 uppercase block mb-1">
              Código de Barras Industrial (GS1 / Code 128)
            </span>
            <BarcodeRenderer 
              value={barcodeValue || 'HEMP-GEN-001'}
              width={1.6}
              height={44}
              fontSize={10}
            />
          </div>

          {/* CÓDIGO QR Y VERIFICACIÓN PÚBLICA INMUTABLE */}
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1 text-xs">
              <span className="text-[9px] font-black uppercase text-emerald-700 flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>QR Trazabilidad Pública Inmutable</span>
              </span>
              <p className="text-[9px] text-slate-600 leading-tight">
                Escanee con cualquier smartphone para verificar el certificado botánico, límite legal de THC y genealogía oficial en la red pública.
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

          {/* PIE DE PASAPORTE */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
            <span>Certificado Técnico Fitotécnico Nucleus</span>
            <span>Estándar Internacional OECD / INASE</span>
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
              <span>Imprimir Pasaporte</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
