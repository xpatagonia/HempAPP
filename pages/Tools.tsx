import React, { useState, useEffect } from 'react';
import { 
  Calculator, Scale, Sprout, ArrowRight, Download, FileText, 
  ShieldCheck, AlertTriangle, Eye, Sparkles, CheckCircle2 
} from 'lucide-react';
import SeedingProtocolModal, { SEEDING_PROTOCOL_PDF_URL, SEEDING_PROTOCOL_CANONICAL_NAME } from '../components/SeedingProtocolModal';

export default function Tools() {
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [protocolDefaultTab, setProtocolDefaultTab] = useState<'document' | 'pdf'>('document');

  // --- Calculator 1: Seeding Rate ---
  const [targetDensity, setTargetDensity] = useState<number>(250); // pl/m2 (standard para 50 kg/ha según Anexo II)
  const [pms, setPms] = useState<number>(18); // Peso Mil Semillas (g)
  const [germination, setGermination] = useState<number>(92); // %
  const [purity, setPurity] = useState<number>(98); // %
  const [seedingRateResult, setSeedingRateResult] = useState<number>(0);
  const [appliedPreset, setAppliedPreset] = useState<string | null>('anexo2');

  useEffect(() => {
    if (germination > 0 && purity > 0) {
      const rate = (targetDensity * pms * 100) / (germination * purity);
      setSeedingRateResult(rate);
    }
  }, [targetDensity, pms, germination, purity]);

  // Aplicar preset homologado de Anexo II
  const applyPreset = (preset: 'grain' | 'biomass') => {
    if (preset === 'grain') {
      setTargetDensity(255);
      setPms(18.0);
      setGermination(92);
      setPurity(99);
      setRowDistance(17.5);
      setAppliedPreset('grain');
    } else {
      setTargetDensity(245);
      setPms(18.5);
      setGermination(90);
      setPurity(98);
      setRowDistance(17.5);
      setAppliedPreset('biomass');
    }
  };

  // --- Calculator 2: Stand Verification ---
  const [rowDistance, setRowDistance] = useState<number>(17.5); // cm (15cm a 20cm según Anexo II)
  const [plantsPerMeter, setPlantsPerMeter] = useState<number>(44); // Aprox 250 pl/m2
  const [realDensity, setRealDensity] = useState<number>(0);
  const [plantsPerHectare, setPlantsPerHectare] = useState<number>(0);

  useEffect(() => {
    if (rowDistance > 0) {
      const dens = (plantsPerMeter * 100) / rowDistance;
      setRealDensity(dens);
      setPlantsPerHectare(dens * 10000);
    }
  }, [rowDistance, plantsPerMeter]);

  const handleDownloadPdf = () => {
    const link = document.createElement('a');
    link.href = SEEDING_PROTOCOL_PDF_URL;
    link.download = SEEDING_PROTOCOL_CANONICAL_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors text-sm font-bold";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* ENCABEZADO DE HERRAMIENTAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="p-3 bg-hemp-500/10 text-hemp-600 dark:text-hemp-400 rounded-2xl mr-3 border border-hemp-500/20">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Herramientas Agronómicas & Calibración
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs">
              Planificación técnica de siembra, cálculo de dosis y verificación de stand a campo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setProtocolDefaultTab('document'); setIsProtocolModalOpen(true); }}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Eye size={15} className="text-emerald-500" />
            <span>Ver Protocolo</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95"
            title="Descargar Anexo II Protocolo de Siembra PDF"
          >
            <Download size={15} strokeWidth={2.5} />
            <span>Descargar Protocolo (PDF)</span>
          </button>
        </div>
      </div>

      {/* BANNER OFICIAL DE HOMOLOGACIÓN: ANEXO II PATAGONIAN C LTDA */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 uppercase tracking-widest">
                Documento Vigente Homologado
              </span>
              <span className="text-xs font-mono text-emerald-300">
                Licencia ARICCAME Expte. EX-2024-134354227
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
              Protocolo Técnico de Siembra y Manejo Agronómico (Anexo II)
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Normativa de cumplimiento obligatorio para la Red de Productores Patagonian C Ltda. en Chubut. Fija dosis estándar de <strong>50 kg/Ha</strong>, profundidad crítica de <strong>1.5 a 2.0 cm (máx. 2.5 cm)</strong>, distancia entre surcos de <strong>15 a 20 cm</strong> y registro de trazabilidad en plazo máximo de <strong>48 horas</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => { setProtocolDefaultTab('document'); setIsProtocolModalOpen(true); }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <FileText size={16} strokeWidth={2.5} />
              <span>Consultar Anexo II</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Download size={15} />
              <span>Descargar PDF Oficial</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRESETS HOMOLOGADOS DIRECTOS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-500 shrink-0" size={18} />
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Calibración Rápida Según Cultivar Homologado (Anexo II):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset('grain')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              appliedPreset === 'grain'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Sprout size={14} />
            <span>Variedad (Grano / Alimento) · 50 kg/Ha</span>
          </button>

          <button
            onClick={() => applyPreset('biomass')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              appliedPreset === 'biomass'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
            }`}
          >
            <Scale size={14} />
            <span>Variedad (Multipropósito / Biomasa) · 50 kg/Ha</span>
          </button>
        </div>
      </div>

      {/* CALCULATOR 1: Seeding Rate */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center">
            <Sprout className="text-emerald-600 dark:text-emerald-400 mr-2" size={20} />
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm md:text-base">
              Calculadora de Dosis de Siembra (kg / Ha)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            Dosis Protocolar: 50 kg/Ha (±2 kg)
          </span>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Densidad Objetivo (plántulas emergidas / m²)
              </label>
              <input 
                type="number" 
                className={inputClass} 
                value={targetDensity} 
                onChange={e => { setTargetDensity(Number(e.target.value)); setAppliedPreset(null); }} 
              />
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                Rango recomendado en Anexo II: 220 a 270 pl/m² para lograr 50 kg/ha.
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Peso de Mil Semillas (PMS) en gramos
              </label>
              <input 
                type="number" 
                step="0.1" 
                className={inputClass} 
                value={pms} 
                onChange={e => { setPms(Number(e.target.value)); setAppliedPreset(null); }} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Poder Germinativo PG (%)
                </label>
                <input 
                  type="number" 
                  className={inputClass} 
                  value={germination} 
                  onChange={e => { setGermination(Number(e.target.value)); setAppliedPreset(null); }} 
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Pureza Física (%)
                </label>
                <input 
                  type="number" 
                  className={inputClass} 
                  value={purity} 
                  onChange={e => { setPurity(Number(e.target.value)); setAppliedPreset(null); }} 
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full border border-slate-200 dark:border-slate-700/80">
            <h3 className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              Dosis Necesaria Calibrada
            </h3>
            <div className="text-5xl md:text-6xl font-black text-emerald-600 dark:text-emerald-400 mb-1 font-mono">
              {seedingRateResult.toFixed(1)}
            </div>
            <span className="text-lg text-gray-700 dark:text-slate-300 font-bold uppercase">kg / ha</span>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 w-full flex items-center justify-center gap-2">
              {Math.abs(seedingRateResult - 50) <= 5 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                  <CheckCircle2 size={14} /> Alineado con Protocolo Anexo II (50 kg/Ha)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full">
                  <AlertTriangle size={14} /> Desvío respecto al estándar Anexo II (50 kg/Ha)
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 mt-2 font-mono">
              Fórmula Oficial: (Densidad × PMS × 100) / (PG × Pureza)
            </p>
          </div>
        </div>
      </div>

      {/* CALCULATOR 2: Stand Verification */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-blue-50 dark:bg-blue-950/40 px-6 py-4 border-b border-blue-100 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center">
            <Scale className="text-blue-600 dark:text-blue-400 mr-2" size={20} />
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm md:text-base">
              Verificador de Stand a Campo (Emergencia a 7 y 14 Días)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
            Evento #2 Núcleos AgTech (Oblig. 48h)
          </span>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">
                  Distancia entre hileras (cm)
                </label>
                <span className="text-[10px] font-mono text-blue-600 font-bold">
                  Protocolo: 15 a 20 cm
                </span>
              </div>
              <input 
                type="number" 
                step="0.5" 
                className={inputClass} 
                value={rowDistance} 
                onChange={e => setRowDistance(Number(e.target.value))} 
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Plantas contadas en 1 metro lineal
              </label>
              <input 
                type="number" 
                className={inputClass} 
                value={plantsPerMeter} 
                onChange={e => setPlantsPerMeter(Number(e.target.value))} 
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Recomendación Anexo II: Efectuar 5 repeticiones al azar y promediar en metros lineales homogéneos.
              </p>
            </div>

            {/* ADVERTENCIA PROFUNDIDAD ANEXO II */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800/70 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <AlertTriangle size={14} />
                <span>Advertencia Crítica de Calibración:</span>
              </div>
              <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                Profundidades mayores a <strong>2.5 cm</strong> reducen drásticamente la emergencia. Ajustar tren de siembra entre <strong>1.5 y 2.0 cm</strong> con temperatura de suelo superior a <strong>10°C - 12°C</strong>.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div>
              <h3 className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                Densidad Real Obtenida
              </h3>
              <div className="text-4xl md:text-5xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {realDensity.toFixed(1)} <span className="text-base text-gray-500">pl/m²</span>
              </div>
            </div>

            <div className="w-full border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-gray-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                Población Total Estimada
              </h3>
              <div className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white font-mono">
                {Math.round(plantsPerHectare).toLocaleString()} <span className="text-xs text-gray-500">plantas / ha</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DEL PROTOCOLO */}
      <SeedingProtocolModal
        isOpen={isProtocolModalOpen}
        onClose={() => setIsProtocolModalOpen(false)}
        defaultTab={protocolDefaultTab}
      />
    </div>
  );
}
