import React, { useState, useEffect } from 'react';
import { 
  Download, Printer, FileText, X, CheckCircle2, AlertTriangle, 
  ExternalLink, ShieldCheck, Sprout, Droplets, Scale, Copy, Check, Eye
} from 'lucide-react';

interface SeedingProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'document' | 'pdf';
}

export const SEEDING_PROTOCOL_PDF_URL = '/assets/aistudio/ANEXO_II_PROTOCOLO_DE_SIEMBRA_6dc09e5c.pdf';
export const SEEDING_PROTOCOL_CANONICAL_NAME = 'ANEXO_II_PROTOCOLO_DE_SIEMBRA_PATAGONIAN_C.pdf';

export default function SeedingProtocolModal({ isOpen, onClose, defaultTab = 'document' }: SeedingProtocolModalProps) {
  const [activeView, setActiveView] = useState<'document' | 'pdf'>(defaultTab);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    const link = document.createElement('a');
    link.href = SEEDING_PROTOCOL_PDF_URL;
    link.download = SEEDING_PROTOCOL_CANONICAL_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + SEEDING_PROTOCOL_PDF_URL;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4 md:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 relative">
        
        {/* ENCABEZADO MODAL CON BOTÓN X DE ALTA VISIBILIDAD */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
              <Sprout size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest shrink-0">
                  Anexo II Oficial
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline truncate">
                  ARICCAME • Ley 27.669
                </span>
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white mt-0.5 truncate">
                Protocolo Técnico de Siembra y Manejo Agronómico
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Alternador de vista Desktop */}
            <div className="hidden md:flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveView('document')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeView === 'document' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText size={14} />
                <span>Guía Homologada</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('pdf')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeView === 'pdf' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={14} />
                <span>Visor PDF</span>
              </button>
            </div>

            {/* Botón Descargar PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              title="Descargar PDF Oficial"
            >
              <Download size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>

            {/* BOTÓN X DE CIERRE DESTACADO */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-full transition-all shadow-md active:scale-90 flex items-center justify-center shrink-0 cursor-pointer border border-slate-700 hover:border-rose-500 group"
              title="Cerrar ventana (Esc)"
              aria-label="Cerrar ventana"
            >
              <X size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* SELECTOR DE VISTA MÓVIL */}
        <div className="flex md:hidden px-4 py-2 bg-slate-950 border-b border-slate-800 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('document')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeView === 'document' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 bg-slate-900 border border-slate-800'
            }`}
          >
            <FileText size={14} />
            <span>Guía Homologada</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pdf')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeView === 'pdf' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 bg-slate-900 border border-slate-800'
            }`}
          >
            <Eye size={14} />
            <span>Visor PDF</span>
          </button>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">

          {activeView === 'pdf' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <FileText className="text-emerald-500" size={24} />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Documento PDF Original cargado: ANEXO_II_PROTOCOLO_DE_SIEMBRA.pdf
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      4 páginas oficiales · Expediente EX-2024-134354227-APN-ARICCAME#MEC
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>
                  <a
                    href={SEEDING_PROTOCOL_PDF_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200"
                  >
                    <ExternalLink size={14} />
                    <span>Abrir en Pestaña</span>
                  </a>
                </div>
              </div>

              <div className="w-full h-[650px] bg-white rounded-2xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner">
                <iframe
                  src={`${SEEDING_PROTOCOL_PDF_URL}#toolbar=1&navpanes=0`}
                  title="Protocolo Técnico de Siembra (Anexo II)"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl mx-auto">
              
              {/* MEMBRETE INSTITUCIONAL HOMOLOGADO */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center font-black text-slate-900 text-xl tracking-tighter shadow-md">
                      Hemp<span className="text-emerald-700 font-extrabold">C</span>
                    </div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        PATAGONIAN C LTDA.
                      </h1>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 space-x-2">
                        <span>MATRÍCULA: 68218</span>
                        <span>•</span>
                        <span>CUIT: 30718161130</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Fuerte Viejo 1082 · Trelew / Chubut (CP 9100) · patagoniancoop@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 p-4 rounded-2xl text-left md:text-right shrink-0">
                    <span className="text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest block">
                      Normativa ARICCAME / INASE
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block mt-1">
                      Lic. Agrícola: EX-2024-134354227
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                      Lic. Industrial: EX-2025-119427833
                    </span>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    PROTOCOLO TÉCNICO DE SIEMBRA Y MANEJO AGRONÓMICO
                  </h2>
                  <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm tracking-wider uppercase mt-1">
                    ANEXO II · RED DE PRODUCTORES PATAGONIAN C LTDA.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 max-w-2xl mx-auto">
                    Marco Legal: Ley N.° 27.669 y Decreto Reglamentario N.° 405/2023. Organismos de Fiscalización: ARICCAME / INASE / SENASA.
                  </p>
                </div>
              </div>

              {/* SECCIÓN 1: PROPÓSITO Y ALCANCE */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Propósito y Alcance
                  </h3>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-11">
                  El presente protocolo establece las <strong>pautas técnicas de cumplimiento obligatorio</strong> para la preparación del suelo, siembra, fertilización, riego, control fitosanitario, monitoreo de THC y cosecha en todos los lotes pertenecientes a los productores integrados a la <strong>Red de PatagonianC LTDA. en la Provincia del Chubut</strong>.
                </p>
              </div>

              {/* SECCIÓN 2: SELECCIÓN Y PREPARACIÓN DEL SUELO */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                    2
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Selección y Preparación del Suelo
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-0 md:pl-11">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Aptitud de Suelo
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Suelos profundos, mullidos, bien estructurados y de <strong>textura franco a franco-arenosa</strong>. Alta sensibilidad al anegamiento y a la asfixia radicular en los <strong>primeros 20 días</strong> desde la emergencia.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Labranza Primaria & Secundaria
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Labor profunda con descompactador o arado para penetración de la raíz pivotante. Rastra de discos y rolo compactador para una cama mullida y nivelada sin terrones.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      pH y Salinidad
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Rango óptimo de <strong>pH entre 6.0 y 7.5</strong>. En suelos con conductividad eléctrica elevada o tendencia a salinidad, análisis de suelo obligatorio previo con laboratorio de la Cooperativa.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PARÁMETROS ESPECÍFICOS DE SIEMBRA (TABLA COMPARATIVA) */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Parámetros Específicos de Siembra
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ajuste de sembradora de grano fino según propósito agroindustrial
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-5 py-3.5">Parámetro Agronómico</th>
                        <th className="px-5 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                          Variedad (Grano / Alimento)
                        </th>
                        <th className="px-5 py-3.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                          Variedad (Multipropósito / Biomasa)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      <tr>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">Dosis de Siembra</td>
                        <td className="px-5 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">50 kg / Ha</td>
                        <td className="px-5 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">50 kg / Ha</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">Profundidad de Siembra</td>
                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">
                          1.5 cm a 2.0 cm <span className="text-[10px] text-amber-600 font-bold">(Máx. 2.5 cm)</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">
                          1.5 cm a 2.0 cm <span className="text-[10px] text-amber-600 font-bold">(Máx. 2.5 cm)</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">Distancia entre Surcos</td>
                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">15 cm a 20 cm</td>
                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">15 cm a 20 cm</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">Ventana de Siembra (Chubut)</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">1° Noviembre a 15 Diciembre</td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">1° Noviembre a 15 Diciembre</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">Temperatura Mínima Suelo</td>
                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">10°C a 12°C estables a 5 cm</td>
                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">10°C a 12°C estables a 5 cm</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800 flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                    <strong>PUNTO CRÍTICO:</strong> Profundidades superiores a <strong>2.5 cm</strong> generan pérdidas drásticas en el porcentaje de emergencia de la plántula, comprometiendo de forma irreversible el stand final de plantas por metro cuadrado.
                  </p>
                </div>
              </div>

              {/* SECCIÓN 4 & 5: MANEJO NUTRICIONAL & RIEGO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 4. Nutrición */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                      4
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Manejo Nutricional y Fertilización
                    </h3>
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 pl-4 list-disc marker:text-emerald-500">
                    <li><strong>Nitrógeno (N):</strong> Fraccionado. Requerimiento principal entre emergencia e inicio de floración. Evitar aplicaciones tardías.</li>
                    <li><strong>Fósforo (P):</strong> Crucial en arranque radicular. Aplicado incorporado junto a la siembra.</li>
                    <li><strong>Potasio (K) y Micros:</strong> Según deficiencia de análisis de suelo previo obligatorio.</li>
                    <li className="text-rose-700 dark:text-rose-400 font-semibold">
                      <strong>PROHIBICIÓN ESTRICTA:</strong> Prohibido el uso de efluentes sin tratar, purines no compostados, residuos urbanos o fitosanitarios de síntesis no aprobados.
                    </li>
                  </ul>
                </div>

                {/* 5. Riego */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-mono font-bold text-sm">
                      5
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Régimen y Gestión del Riego
                    </h3>
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 pl-4 list-disc marker:text-blue-500">
                    <li><strong>Emergencia (Días 1 a 15):</strong> Riegos livianos, superficiales y frecuentes en el perfil (0-5 cm) evitando encostramiento o anegamiento.</li>
                    <li><strong>Vegetativa Rápida:</strong> Incrementar lámina de riego acompañando la curva exponencial de crecimiento.</li>
                    <li><strong>Floración y Llenado:</strong> Máxima demanda hídrica. Evitar estrés que altere concentración de cannabinoides.</li>
                    <li><strong>Corte Pre-cosecha:</strong> Suspender el riego según pauta del agrónomo para facilitar entrada de maquinaria y secado de grano.</li>
                  </ul>
                </div>
              </div>

              {/* SECCIÓN 6: MANEJO INTEGRADO DE PLAGAS Y MALEZAS */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                    6
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Manejo Integrado de Malezas y Plagas (MIP)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-11">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Competencia Natural</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      La siembra a alta densidad (50 kg/ha) genera sombreado rápido de canopia (a partir de 30-40 cm de altura), ejerciendo un control cultural eficiente sobre malezas competidoras.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tratamientos de Intervención</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      En caso de plagas cortadoras o malezas pre-emergentes, se utilizarán exclusivamente insumos fitosanitarios inscritos en la lista autorizada por la Cooperativa.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 7: OBLIGACIÓN DE TRAZABILIDAD EN NÚCLEOS AGTECH */}
              <div className="bg-emerald-900 text-white p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-mono font-bold text-sm">
                    7
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Obligación de Trazabilidad en el Software Núcleos AgTech
                  </h3>
                </div>
                <p className="text-xs text-emerald-200 pl-11">
                  El Productor deberá ingresar en la plataforma digital de la Red los siguientes eventos técnicos dentro de un <strong>plazo máximo de 48 horas</strong> de acontecidos:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pl-0 md:pl-11">
                  {[
                    { n: '1', title: 'Siembra Georreferenciada', desc: 'Fecha exacta, lote georreferenciado, dosis y calibración de maquinaria.' },
                    { n: '2', title: 'Emergencia 7 y 14 Días', desc: 'Porcentaje de emergencia del stand de plantas por m².' },
                    { n: '3', title: 'Turnos y Riego', desc: 'Planilla de turnos y láminas de riego aplicadas (mm).' },
                    { n: '4', title: 'Registro de Insumos', desc: 'Producto, dosis, lote, fecha y operario responsable.' },
                    { n: '5', title: 'Novedades y Clima', desc: 'Fitosanitarias, presencia de malezas o clima (heladas, viento).' },
                  ].map(item => (
                    <div key={item.n} className="bg-emerald-950/80 p-3.5 rounded-2xl border border-emerald-700/60 space-y-1">
                      <span className="text-[10px] font-mono font-black text-emerald-400">EVENTO #{item.n}</span>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-emerald-300 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 8: MONITOREO DE THC Y PROTOCOLO DE COSECHA */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                    8
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Monitoreo de THC, Inspección y Protocolo de Cosecha
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-0 md:pl-11">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                      Control Legal de THC (&lt; 1.0%)
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Entre 10 y 15 días desde floración plena, personal técnico toma muestras foliares/florales para certificar en laboratorio HPLC THC inferior al límite legal (&lt; 1.0%).
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Punto de Cosecha
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Grano:</strong> trilla con 75%-80% de semilla madura (marrón/veteado) y humedad 12-15%. <strong>Biomasa:</strong> corte y enfardado inmediato post-trilla.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                      Guía de Tránsito Sectorial
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Ningún camión o remolque podrá retirar grano o biomasa de la chacra sin la <strong>Guía de Tránsito y Transporte Sectorial</strong> emitida por PatagonianC LTDA.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 9: FIRMAS Y CONFORMIDAD TÉCNICA */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-mono font-bold text-sm">
                    9
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Firmas y Conformidad Técnica
                  </h3>
                </div>

                <p className="text-xs text-slate-500 pl-0 md:pl-11">
                  En prueba de conformidad y conocimiento de los requerimientos técnicos fijados para el desarrollo del cultivo bajo la Licencia Agrícola Expte. N.° EX-2024-134354227:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 pl-0 md:pl-11">
                  <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="h-12 border-b border-slate-300 dark:border-slate-600 mx-8"></div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase">
                      Tec. Agrónomo / Dirección Técnica
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Cooperativa de Trabajo Patagonian C Ltda.
                    </p>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block font-bold">
                      ARICCAME Lic. Agrícola y Lic. Industrial
                    </span>
                  </div>

                  <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="h-12 border-b border-slate-300 dark:border-slate-600 mx-8"></div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase">
                      El Productor (En Conformidad)
                    </h5>
                    <div className="text-[11px] text-slate-500 text-left px-8 space-y-1">
                      <p>Nombre / Razón Social: ________________________</p>
                      <p>CUIT: ________________________</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* PIE DE ACCIONES */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <ShieldCheck className="text-emerald-500" size={16} />
            <span>Documento Homologado Oficial Patagonian C Ltda. (Validez 2025/2026)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Cerrar</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              <Download size={15} strokeWidth={2.5} />
              <span>Descargar PDF Oficial</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
