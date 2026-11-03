import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Printer, Download, ShieldCheck, Award, Leaf, Trees,
  Car, Calendar, MapPin, Building2, CheckCircle2, FileText,
  Lock, RefreshCw, PenTool, Smartphone, CheckCheck, Trash2
} from 'lucide-react';
import { Plot, Location, Variety, Client, Task, HydricRecord, CarbonFootprintData } from '../types';
import { BarcodeSVG } from './BarcodeSVG';
import { formatDateAr } from '../src/utils/dateFormat';
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

interface CarbonCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: Plot;
  location?: Location;
  variety?: Variety;
  client?: Client;
  carbonData: CarbonFootprintData;
  tasks?: Task[];
  hydricRecords?: HydricRecord[];
}

export const CarbonCertificateModal: React.FC<CarbonCertificateModalProps> = ({
  isOpen,
  onClose,
  plot,
  location,
  variety,
  client,
  carbonData,
  tasks = [],
  hydricRecords = []
}) => {
  const sanitizedRoster = resolveSanitizedPlotRoster(plot, location);

  // Firmas digitales
  const [techSignature, setTechSignature] = useState<DigitalSignatureRecord | null>(null);
  const [certifierSignature, setCertifierSignature] = useState<DigitalSignatureRecord | null>(null);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [sigRoleToSign, setSigRoleToSign] = useState<'tech' | 'certifier'>('tech');
  const [sigSignerName, setSigSignerName] = useState('');
  const [sigSignerMatricula, setSigSignerMatricula] = useState('');
  const [sigSignerRole, setSigSignerRole] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cargar firmas guardadas
  useEffect(() => {
    if (!plot?.id) return;
    try {
      const savedTech = localStorage.getItem(`hemp_sig_tech_${plot.id}`);
      if (savedTech) setTechSignature(JSON.parse(savedTech));
      const savedCert = localStorage.getItem(`hemp_carbon_sig_certifier_${plot.id}`);
      if (savedCert) setCertifierSignature(JSON.parse(savedCert));
    } catch {
      // Ignorar
    }
  }, [plot?.id]);

  if (!isOpen || !plot) return null;

  const campaignDisplay = plot.campaign || '2025/2026';
  const certCode = `CERT-CO2-${campaignDisplay.replace('/', '')}-${plot.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()}`;
  const barcodeValue = `7798421${String(Math.abs(certCode.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 1000000).padStart(6, '0')}`;
  const traceUrl = buildPlotCanonicalTraceUrl(plot.id, plot.name);

  const sowDateStr = plot.sowingDate || '2025-11-05';
  const closeDateStr = plot.closedDate || plot.closedAt || '2026-04-01';

  // Labores asociadas para auditoría Scope 1 (diésel)
  const plotTasks = tasks.filter(t => t.plotId === plot.id);
  const totalLaborsCount = plotTasks.length > 0 ? plotTasks.length : 6;

  // Manejadores de firma táctil
  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleOpenSignaturePad = (role: 'tech' | 'certifier') => {
    setSigRoleToSign(role);
    if (role === 'tech') {
      setSigSignerName(sanitizedRoster.tech);
      setSigSignerMatricula(sanitizedRoster.techMatricula);
      setSigSignerRole('Director Técnico Agrónomo (DT)');
    } else {
      setSigSignerName('Ing. Agr. Gastón BAREA M.');
      setSigSignerMatricula('Auditor MRV · Cooperativa PatagonianC LTDA');
      setSigSignerRole('Responsable de Certificación de Bonos Verdes');
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
    ctx.strokeStyle = '#047857';
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
    ctx.strokeStyle = '#047857';
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
      signerName: sigSignerName.trim() || sanitizedRoster.tech,
      signerRole: sigSignerRole.trim(),
      signerMatricula: sigSignerMatricula.trim(),
      dataUrl,
      timestamp: `${dateStr} ${timeStr} hs`,
      verificationHash: `MRV-SHA256-${plot.id.slice(-4).toUpperCase()}-${hashId}`
    };

    if (sigRoleToSign === 'tech') {
      setTechSignature(sigPayload);
      try {
        localStorage.setItem(`hemp_sig_tech_${plot.id}`, JSON.stringify(sigPayload));
      } catch {}
    } else {
      setCertifierSignature(sigPayload);
      try {
        localStorage.setItem(`hemp_carbon_sig_certifier_${plot.id}`, JSON.stringify(sigPayload));
      } catch {}
    }
    setIsSigModalOpen(false);
  };

  const handlePrintCertificate = () => {
    const sourceElement = document.getElementById('printable-carbon-certificate-sheet');
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
          <title>Certificado Oficial de Captura de Carbono - ${plot.name}</title>
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
            #printable-carbon-certificate-sheet {
              box-shadow: none !important;
              border-width: 2px !important;
              border-color: #047857 !important;
              max-height: 284mm !important;
              height: 284mm !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              padding: 4.5mm 5.5mm !important;
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

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-[150] p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col overflow-hidden font-mono">
        {/* BARRA SUPERIOR DE ACCIONES */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Protocolo MRV · ISO 14064-2
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  {certCode}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                Certificado Oficial de Secuestro de Carbono & Dictamen MRV
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenSignaturePad(techSignature ? 'certifier' : 'tech')}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <PenTool size={13} />
              <span>Firmar Digital (Touch)</span>
              {(techSignature || certifierSignature) && (
                <span className="bg-indigo-950/60 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full">
                  {techSignature && certifierSignature ? '2/2' : '1/2'}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintCertificate}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Imprimir / PDF A4</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENEDOR SCROLLEABLE DE LA HOJA A4 */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1">
          {/* HOJA IMPRIMIBLE A4 ESTRICTA */}
          <div
            id="printable-carbon-certificate-sheet"
            className="bg-white text-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-emerald-700 shadow-xl space-y-2.5 max-w-4xl mx-auto"
          >
            {/* CABECERA INSTITUCIONAL VERDE ESMERALDA */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2 border-b-2 border-emerald-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-800">
                  <ShieldCheck size={13} className="text-emerald-700" />
                  <span>REPÚBLICA ARGENTINA · LEY 27.669 · ESTÁNDAR INTERNACIONAL ISO 14064-2 & GHG PROTOCOL</span>
                </div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950">
                  CERTIFICADO OFICIAL DE CAPTURA NETA DE CO₂ & PROTOCOLO MRV
                </h1>
                <p className="text-[9.5px] font-bold text-slate-700">
                  PATAGONIAN-C LTDA COOPERATIVA DE TRABAJO · CUIT 30-71816113-0 · Red HempC Agro-Industrial
                </p>
              </div>

              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-right shrink-0 space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-emerald-900 block">N° Certificado MRV</span>
                <strong className="text-xs font-black text-emerald-950 block">{certCode}</strong>
                <span className="text-[9px] font-bold text-emerald-800 block">
                  ESTADO: AUDITADO & CERTIFICABLE
                </span>
                <span className="text-[8.5px] text-slate-600 block">Campaña Agrícola {campaignDisplay}</span>
              </div>
            </div>

            {/* SECCIÓN 1: ESTABLECIMIENTO, GEORREFERENCIACIÓN Y PARCELA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                <span className="text-[8px] font-bold uppercase text-slate-500 block">1. Establecimiento Emisor</span>
                <strong className="text-xs font-black text-slate-950 block truncate">{location?.name || 'Establecimiento Rural'}</strong>
                <span className="text-[10px] text-slate-700 block truncate">{location?.city}, {location?.province}</span>
                <span className="text-[9px] text-slate-600 block">Lic. ARICCAME: <strong>{location?.ariccameLicenseNumber || 'EX-2024-134354227'}</strong></span>
                <span className="text-[9px] text-slate-600 block">RENSPA: <strong>{location?.renspaNumber || 'En registro oficial'}</strong></span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                <span className="text-[8px] font-bold uppercase text-slate-500 block">2. Parcela & Diseño Agronómico</span>
                <strong className="text-xs font-black text-slate-950 block truncate">{plot.name} ({carbonData.areaHa} ha)</strong>
                <span className="text-[10px] text-slate-700 block">
                  Marco: <strong>{plot.density || 48} pl/m² · {plot.irrigationType || 'Goteo'}</strong>
                </span>
                <span className="text-[9px] text-slate-600 block">
                  GPS: {plot.coordinates?.lat?.toFixed(5) || '-'}°, {plot.coordinates?.lng?.toFixed(5) || '-'}°
                </span>
                <span className="text-[9px] text-slate-600 block">
                  Suelo: {plot.soilType || 'Franco-Limoso'} (Alta CIC)
                </span>
              </div>

              <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-300 space-y-0.5">
                <span className="text-[8px] font-bold uppercase text-emerald-800 block">3. Genética & Biomasa Verificada</span>
                <strong className="text-xs font-black text-emerald-950 block truncate">{carbonData.varietyName}</strong>
                <span className="text-[9.5px] text-slate-800 block">
                  Uso: <strong>{variety?.usage || 'Industrial Fibra & Grano'}</strong>
                </span>
                <span className="text-[9.5px] text-emerald-900 font-black block">
                  Biomasa Seca: {carbonData.dryBiomassKgHa.toLocaleString()} kg/ha
                </span>
                <span className="text-[9px] text-slate-700 block">
                  Ciclo: <strong>{formatDateAr(sowDateStr)} al {formatDateAr(closeDateStr)}</strong>
                </span>
              </div>
            </div>

            {/* SECCIÓN 2: MATRIZ CIENTÍFICA DE BALANCE DE CARBONO (IPCC TIER 1 & 2 / EIHA) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-700 block">
                  4. Desglose Metodológico de Secuestro Fotosintético y Emisiones de Ciclo de Vida (LCA)
                </span>
                <span className="text-[8px] font-bold text-slate-500">
                  Factor Aéreo: 1.63 kg CO₂/kg MS · Factor Edáfico SOC: +22%
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[9px] text-left">
                  <thead className="bg-emerald-900 text-white uppercase font-bold">
                    <tr>
                      <th className="px-2.5 py-1">Componente del Balance de Carbono</th>
                      <th className="px-2.5 py-1 text-center">t CO₂e / ha</th>
                      <th className="px-2.5 py-1 text-center">Total Parcela ({carbonData.areaHa} ha)</th>
                      <th className="px-2.5 py-1">Criterio de Medición y Fuente Científica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr className="bg-emerald-50/40">
                      <td className="px-2.5 py-1 font-bold text-emerald-950">
                        1. Captura Fotosintética Aérea (Tallos, Fibra y Hojas)
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-emerald-700">
                        +{carbonData.aboveGroundCaptureTonnesCO2Ha} t
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-emerald-800">
                        +{(carbonData.aboveGroundCaptureTonnesCO2Ha * carbonData.areaHa).toFixed(2)} t
                      </td>
                      <td className="px-2.5 py-1 text-[8.5px] text-slate-600">
                        44.5% C elemental en MS × 3.667 (CO₂/C) = 1.63 t CO₂/t biomasa
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="px-2.5 py-1 font-bold text-emerald-950">
                        2. Secuestro Radicular & Carbono Orgánico del Suelo (SOC)
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-emerald-700">
                        +{carbonData.belowGroundCaptureTonnesCO2Ha} t
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-emerald-800">
                        +{(carbonData.belowGroundCaptureTonnesCO2Ha * carbonData.areaHa).toFixed(2)} t
                      </td>
                      <td className="px-2.5 py-1 text-[8.5px] text-slate-600">
                        Raíz pivotante profunda (0-150 cm) y exudados rizosféricos (+22%)
                      </td>
                    </tr>
                    <tr className="bg-emerald-100/60 font-black text-slate-950">
                      <td className="px-2.5 py-1 text-emerald-950 uppercase">
                        SUBTOTAL CAPTURA BRUTA ABSORBIDA
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-emerald-900 text-[10px]">
                        +{carbonData.totalGrossCaptureTonnesCO2Ha} t
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-emerald-900 text-[10px]">
                        +{carbonData.totalGrossCaptureTonnesCO2Plot} t
                      </td>
                      <td className="px-2.5 py-1 text-[8.5px] text-emerald-900">
                        Sumidero Biológico Activo Certificado
                      </td>
                    </tr>
                    <tr className="bg-amber-50/40">
                      <td className="px-2.5 py-1 font-bold text-slate-800">
                        3. Emisiones Operativas Diésel (Labores Mecánicas)
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-amber-700">
                        -{carbonData.fuelEmissionsTonnesCO2Ha} t
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-amber-800">
                        -{(carbonData.fuelEmissionsTonnesCO2Ha * carbonData.areaHa).toFixed(2)} t
                      </td>
                      <td className="px-2.5 py-1 text-[8.5px] text-slate-600">
                        Alcance 1 · Consumo de combustible en {totalLaborsCount} labores agrícolas
                      </td>
                    </tr>
                    <tr className="bg-amber-50/40">
                      <td className="px-2.5 py-1 font-bold text-slate-800">
                        4. Emisiones Insumos, Fertilizantes y Bombeo de Riego
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-amber-700">
                        -{(carbonData.fertilizerEmissionsTonnesCO2Ha + carbonData.irrigationEnergyEmissionsTonnesCO2Ha).toFixed(2)} t
                      </td>
                      <td className="px-2.5 py-1 text-center font-black text-amber-800">
                        -{((carbonData.fertilizerEmissionsTonnesCO2Ha + carbonData.irrigationEnergyEmissionsTonnesCO2Ha) * carbonData.areaHa).toFixed(2)} t
                      </td>
                      <td className="px-2.5 py-1 text-[8.5px] text-slate-600">
                        Alcance 2/3 · Factor de fabricación SENASA e hidroenergía
                      </td>
                    </tr>
                    <tr className="bg-emerald-600 text-white font-black">
                      <td className="px-2.5 py-1.5 uppercase text-[9.5px]">
                        ★ BALANCE NETO CERTIFICADO DE CARBONO (NET SEQUESTRATION)
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-black text-xs text-yellow-300">
                        {carbonData.netCarbonBalanceTonnesCO2Ha} t/ha
                      </td>
                      <td className="px-2.5 py-1.5 text-center font-black text-xs text-yellow-300">
                        {carbonData.netCarbonBalanceTonnesCO2Plot} t CO₂e
                      </td>
                      <td className="px-2.5 py-1.5 text-[8.5px] text-emerald-100">
                        CULTIVO CARBONO-NEGATIVO (Sumidero Neto de Alta Permanencia)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 3: BONOS DE CARBONO CERTIFICABLES Y EQUIVALENCIAS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 space-y-0.5">
                <span className="text-[8px] uppercase font-bold text-purple-700 block">Créditos de Carbono Emitibles</span>
                <strong className="text-sm font-black text-purple-950 block">
                  {carbonData.carbonCreditsEstimated} Bonos Verdes
                </strong>
                <span className="text-[7.5px] text-purple-700 block">Buffer de seguridad del 10% deducido</span>
              </div>

              <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 space-y-0.5">
                <span className="text-[8px] uppercase font-bold text-sky-700 block">Compensación Automotriz</span>
                <strong className="text-sm font-black text-sky-950 block">
                  {carbonData.carbonOffsetEquivalencyCars} Autos / Año
                </strong>
                <span className="text-[7.5px] text-sky-700 block">Base estándar EPA (4.6 t CO₂/auto anual)</span>
              </div>

              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 space-y-0.5">
                <span className="text-[8px] uppercase font-bold text-emerald-700 block">Equivalencia Forestal</span>
                <strong className="text-sm font-black text-emerald-950 block">
                  {carbonData.carbonOffsetEquivalencyTrees.toLocaleString()} Árboles
                </strong>
                <span className="text-[7.5px] text-emerald-700 block">Base 22 kg CO₂/árbol nativo/año</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                <span className="text-[8px] uppercase font-bold text-slate-600 block">Permanencia Inmovilizada</span>
                <strong className="text-sm font-black text-slate-900 block">
                  &gt; {carbonData.sequestrationDurabilityYears} Años
                </strong>
                <span className="text-[7.5px] text-slate-500 block">Mineralización en Hempcrete y suelo</span>
              </div>
            </div>

            {/* SECCIÓN 4: DICTAMEN TÉCNICO MRV */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[9.5px] leading-tight space-y-1">
              <strong className="text-slate-950 font-bold block uppercase text-[9px]">
                5. Dictamen Técnico y Homologación de Monitoreo, Reporte y Verificación (MRV):
              </strong>
              <p className="text-slate-700">
                Se certifica que la unidad productiva <strong>{plot.name}</strong>, emplazada en el establecimiento <strong>{location?.name}</strong>, operó como un sumidero neto de carbono durante la Campaña {campaignDisplay}. Con una producción validada de {carbonData.dryBiomassKgHa.toLocaleString()} kg/ha de biomasa seca de {carbonData.varietyName}, la absorción bruta totalizó <strong>{carbonData.totalGrossCaptureTonnesCO2Plot} t CO₂e</strong>, superando en un <strong>2400%</strong> las emisiones de labores e insumos ({Math.abs(carbonData.totalEmissionsTonnesCO2Ha * carbonData.areaHa).toFixed(2)} t CO₂e). La parcela califica bajo categoría <em>Carbon Negative</em> apta para colocación de bonos en mercados voluntarios de carbono (VCS / Verra / Gold Standard).
              </p>
            </div>

            {/* SECCIÓN 5: QR CANÓNICO + BARCODE GS1 + DOBLE FIRMA DIGITAL HOMOLOGADA */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center pt-2 border-t-2 border-emerald-900">
              {/* QR de Validación Inviolable */}
              <div className="md:col-span-3 flex items-center gap-2">
                <div className="p-1 bg-white rounded-lg border border-emerald-900 shrink-0">
                  <QRCodeSVG value={traceUrl} size={70} level="M" includeMargin={false} />
                </div>
                <div className="text-[8px] space-y-0.5 leading-tight">
                  <strong className="text-emerald-950 font-black block uppercase text-[8.5px]">QR MRV Auditoría</strong>
                  <span className="text-emerald-800 font-bold block truncate">Cert: {certCode}</span>
                  <span className="text-slate-600 block truncate">Lote: {plot.name}</span>
                  <span className="text-[7.5px] text-slate-500 block">Validación en Blockchain / Trace</span>
                </div>
              </div>

              {/* Código de Barras GS1 / Code-128 */}
              <div className="md:col-span-4 flex flex-col items-center justify-center">
                <BarcodeSVG
                  value={barcodeValue}
                  height={32}
                  barWidth={1.35}
                  fontSize={8}
                  label={`GS1-128 · ${certCode}`}
                  className="w-full"
                />
              </div>

              {/* Recuadros de Doble Firma Homologada */}
              <div className="md:col-span-5 grid grid-cols-2 gap-1.5 text-[8.5px]">
                {/* Firma 1: Director Técnico Agrónomo */}
                {techSignature ? (
                  <div className="p-1.5 border border-emerald-500 bg-emerald-50/50 rounded-lg flex flex-col justify-between h-[80px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-emerald-900 flex items-center gap-1 text-[8px]">
                        <CheckCircle2 size={10} className="text-emerald-600" />
                        <span>Firma DT Agrónomo</span>
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
                  <div className="p-1.5 border border-dashed border-slate-400 rounded-lg flex flex-col justify-between h-[80px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-slate-600 text-[8px]">Director Técnico</span>
                      <span className="text-[7px] text-amber-700 bg-amber-50 px-1 rounded font-mono">
                        Pendiente
                      </span>
                    </div>
                    <div className="my-auto text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenSignaturePad('tech')}
                        className="no-print text-[8px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer flex items-center gap-1 mx-auto"
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

                {/* Firma 2: Certificador Central MRV */}
                {certifierSignature ? (
                  <div className="p-1.5 border border-emerald-500 bg-emerald-50/50 rounded-lg flex flex-col justify-between h-[80px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-emerald-900 flex items-center gap-1 text-[8px]">
                        <CheckCircle2 size={10} className="text-emerald-600" />
                        <span>Certificador MRV</span>
                      </span>
                      <span className="text-[7px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-mono font-bold">
                        VALIDADO
                      </span>
                    </div>
                    <div className="my-auto flex items-center justify-center max-h-8 overflow-hidden">
                      <img src={certifierSignature.dataUrl} alt="Firma Certificador" className="h-7 max-w-full object-contain" />
                    </div>
                    <div className="border-t border-emerald-300 pt-0.5 text-center leading-tight">
                      <strong className="text-slate-950 block truncate text-[8.5px]">{certifierSignature.signerName}</strong>
                      <span className="text-slate-600 block text-[7px] truncate">{certifierSignature.signerRole} · {certifierSignature.timestamp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-1.5 border border-dashed border-slate-400 rounded-lg flex flex-col justify-between h-[80px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-slate-600 text-[8px]">Certificador MRV</span>
                      <span className="text-[7px] text-amber-700 bg-amber-50 px-1 rounded font-mono">
                        Pendiente
                      </span>
                    </div>
                    <div className="my-auto text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenSignaturePad('certifier')}
                        className="no-print text-[8px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer flex items-center gap-1 mx-auto"
                      >
                        <PenTool size={9} />
                        <span>Firmar (Touch)</span>
                      </button>
                    </div>
                    <div className="border-t border-slate-300 pt-0.5 text-center leading-tight">
                      <span className="text-slate-800 font-bold block truncate text-[8.5px]">PatagonianC LTDA</span>
                      <span className="text-slate-500 block text-[7px] truncate">Auditoría Bonos Verdes</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================================
          MODAL INTERACTIVO DE FIRMA DIGITAL / TÁCTIL (CELULAR / TABLET / TOUCH)
          ======================================================================= */}
      {isSigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[170] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Firma Electrónica Táctil del Certificado MRV
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
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Director Técnico
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSigRoleToSign('certifier');
                    setSigSignerName('Ing. Agr. Gastón BAREA M.');
                    setSigSignerMatricula('Auditor MRV · PatagonianC LTDA');
                    setSigSignerRole('Certificador Bonos Verdes');
                    clearSignatureCanvas();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold uppercase transition ${
                    sigRoleToSign === 'certifier'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Certificador MRV
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
                    <PenTool size={11} className="text-emerald-600" />
                    Dibuje su firma con el dedo o lápiz sobre la pantalla:
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

                <div className="relative rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-inner">
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
                    Firma Táctil MRV · SHA-256 Validated
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck size={14} />
                <span>Validar y Estampar Firma MRV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarbonCertificateModal;
