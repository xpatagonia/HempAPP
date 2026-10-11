import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ShieldCheck, Award, FileCheck, CheckCircle2, AlertTriangle, 
  ExternalLink, Printer, QrCode, RefreshCw, Sprout, Factory, 
  Scale, FileText, Building2, ChevronRight, Info, X, Activity,
  Check, Eye, ShieldAlert, Sparkles, MapPin, Database
} from 'lucide-react';
import { BarcodeRenderer } from './BarcodeRenderer';

export interface LicenseDetail {
  id: string;
  name: string;
  category: string;
  expediente: string;
  authority: string;
  authoritySub: string;
  regulatoryFramework: string;
  status: 'ACTIVA' | 'EN_RENOVACION' | 'SUSPENDIDA';
  issueDate: string;
  validUntil: string;
  scope: string;
  allowedActivities: string[];
  holderName: string;
  cuit: string;
  domicile: string;
  jurisdiction: string;
  type: 'agricultural' | 'industrial';
}

export const ACTIVE_LICENSES: LicenseDetail[] = [
  {
    id: 'lic-agricola-2024',
    name: 'Licencia Agrícola Oficial',
    category: 'Cultivo, Criadero & Propagación Fitosanitaria',
    expediente: 'EX-2024-134354227--APN-ARICCAME#MEC',
    authority: 'ARICCAME',
    authoritySub: 'Agencia Regulatoria del Cáñamo y Cannabis Medicinal',
    regulatoryFramework: 'Ley Nacional 27.669 / Decreto 405/2023',
    status: 'ACTIVA',
    issueDate: '01/03/2024',
    validUntil: '01/03/2029 (5 años)',
    scope: 'Cultivo a cielo abierto, criadero bajo cubierta y ensayos fitotécnicos experimentales de Cannabis Sativa L. no psicoactivo (cáñamo industrial THC < 0.30%).',
    allowedActivities: [
      'Multiplicación vegetativa y conservación de germoplasma',
      'Siembra y conducción agronómica en parcelas declaradas',
      'Ensayos comparativos de rendimiento y caracterización INASE',
      'Emisión de Pasaportes Fitotécnicos de Lote'
    ],
    holderName: 'Cooperativa PatagonianC LTDA',
    cuit: '30-71816113-0',
    domicile: 'Camino IDEVI Parcela 42, Viedma, Río Negro',
    jurisdiction: 'República Argentina · SENASA / ARICCAME',
    type: 'agricultural'
  },
  {
    id: 'lic-industrial-2025',
    name: 'Licencia Industrial Oficial',
    category: 'Derivados, Bioinsumos & Transformación Primaria',
    expediente: 'EX-2025-119427833--APN-ARICCAME#MEC',
    authority: 'ARICCAME',
    authoritySub: 'Agencia Regulatoria del Cáñamo y Cannabis Medicinal',
    regulatoryFramework: 'Ley Nacional 27.669 / Decreto 405/2023',
    status: 'ACTIVA',
    issueDate: '15/01/2025',
    validUntil: '15/01/2030 (5 años)',
    scope: 'Acondicionamiento postcosecha, despalillado, decorticado de fibra, extracción de biomoléculas no psicoactivas, prensado de grano y formulación de subproductos.',
    allowedActivities: [
      'Procesamiento y secado controlado de biomasa',
      'Extracción de cannabinoides no psicoactivos (CBD / CBG)',
      'Acondicionamiento de fibra técnica para hilado y bioconstrucción',
      'Elaboración de harinas y prensado de aceite de cáñamo'
    ],
    holderName: 'Cooperativa PatagonianC LTDA',
    cuit: '30-71816113-0',
    domicile: 'Parque Industrial Viedma Lote 18, Río Negro',
    jurisdiction: 'República Argentina · SENASA / ARICCAME',
    type: 'industrial'
  }
];

export default function DashboardLicenseIntegritySummary() {
  const { 
    plots, locations, seedBatches, trialRecords, 
    varieties, suppliers, currentUser, refreshData 
  } = useAppContext();

  const [selectedLicense, setSelectedLicense] = useState<LicenseDetail | null>(null);
  const [showIntegrityDetails, setShowIntegrityDetails] = useState(false);
  const [showFullLicenseModal, setShowFullLicenseModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  // Re-evaluación en vivo de la integridad de los datos
  const integrityAnalysis = useMemo(() => {
    const checks: {
      id: string;
      category: string;
      title: string;
      status: 'pass' | 'warn' | 'fail';
      scoreWeight: number;
      actualScore: number;
      description: string;
      metric: string;
    }[] = [];

    // 1. Trazabilidad de Parcelas Activas
    const activePlots = plots.filter(p => p.status === 'Activa');
    const validPlots = activePlots.filter(p => p.varietyId && p.seedBatchId && (p.surfaceArea || 0) > 0);
    const plotScore = activePlots.length > 0 
      ? Math.round((validPlots.length / activePlots.length) * 100) 
      : 100;
    checks.push({
      id: 'plots-traceability',
      category: 'Trazabilidad Agronómica',
      title: 'Trazabilidad de Parcelas de Cultivo',
      status: plotScore === 100 ? 'pass' : plotScore >= 80 ? 'warn' : 'fail',
      scoreWeight: 25,
      actualScore: (plotScore / 100) * 25,
      description: 'Verifica que cada parcela en producción tenga variedad registrada, lote de semilla asignado y superficie válida.',
      metric: `${validPlots.length}/${activePlots.length} parcelas conformes (${plotScore}%)`
    });

    // 2. Integridad de Inventario & Existencias de Semilla
    const totalBatches = seedBatches.length;
    const cleanBatches = seedBatches.filter(b => {
      const isNegative = b.remainingQuantity < 0;
      const isFloatingNoise = Math.abs(b.remainingQuantity - Number(b.remainingQuantity.toFixed(3))) > 0.00001;
      return !isNegative && !isFloatingNoise;
    });
    const batchScore = totalBatches > 0 
      ? Math.round((cleanBatches.length / totalBatches) * 100) 
      : 100;
    checks.push({
      id: 'batches-stock',
      category: 'Inventario & Fiscalización',
      title: 'Lotes de Semilla & Balances de Stock',
      status: batchScore === 100 ? 'pass' : batchScore >= 85 ? 'warn' : 'fail',
      scoreWeight: 25,
      actualScore: (batchScore / 100) * 25,
      description: 'Comprueba ausencia de stocks negativos, inconsistencias matemáticas y deriva de decimales.',
      metric: `${cleanBatches.length}/${totalBatches} lotes sin inconsistencias (${batchScore}%)`
    });

    // 3. Georreferenciación & Declaraciones Juradas ARICCAME
    const totalLocations = locations.length;
    const geoValidLocations = locations.filter(l => 
      l.coordinates && 
      typeof l.coordinates.lat === 'number' && 
      !isNaN(l.coordinates.lat) && 
      l.coordinates.lat !== 0
    );
    const geoScore = totalLocations > 0 
      ? Math.round((geoValidLocations.length / totalLocations) * 100) 
      : 100;
    checks.push({
      id: 'locations-geodesy',
      category: 'Geodesia & Catastro',
      title: 'Geolocalización GPS de Establecimientos',
      status: geoScore === 100 ? 'pass' : geoScore >= 75 ? 'warn' : 'fail',
      scoreWeight: 20,
      actualScore: (geoScore / 100) * 20,
      description: 'Valida coordenadas de satélite (latitud/longitud) para inspecciones presenciales de ARICCAME y SENASA.',
      metric: `${geoValidLocations.length}/${totalLocations} campos georreferenciados (${geoScore}%)`
    });

    // 4. Catálogo Genético y Variedades Fiscalizadas
    const totalVarieties = varieties.length;
    const certifiedVarieties = varieties.filter(v => 
      v.name && v.name.trim().length > 0 && typeof v.expectedThc === 'number'
    );
    const geneticScore = totalVarieties > 0 
      ? Math.round((certifiedVarieties.length / totalVarieties) * 100) 
      : 100;
    checks.push({
      id: 'genetic-registry',
      category: 'Certificación Genética',
      title: 'Catálogo de Cultivares & Límite THC',
      status: geneticScore === 100 ? 'pass' : 'warn',
      scoreWeight: 15,
      actualScore: (geneticScore / 100) * 15,
      description: 'Garantiza que todas las variedades cultivadas tengan registrado el umbral legal de THC (< 0.30% según Ley 27.669).',
      metric: `${certifiedVarieties.length}/${totalVarieties} cultivares en regla (${geneticScore}%)`
    });

    // 5. Monitoreo Fitosanitario & Ensayos Agronómicos
    const totalRecords = trialRecords.length;
    const plausibleRecords = trialRecords.filter(r => 
      (!r.plantHeight || r.plantHeight <= 450) && 
      (!r.temperature || r.temperature <= 55)
    );
    const trialScore = totalRecords > 0 
      ? Math.round((plausibleRecords.length / totalRecords) * 100) 
      : 100;
    checks.push({
      id: 'trials-quality',
      category: 'Calidad de Datos',
      title: 'Monitoreo Agronómico & Ensayos de Campo',
      status: trialScore === 100 ? 'pass' : 'warn',
      scoreWeight: 15,
      actualScore: (trialScore / 100) * 15,
      description: 'Auditoría de consistencia de mediciones de altura, temperatura y fenología sin anomalías estadísticas.',
      metric: `${plausibleRecords.length}/${totalRecords} registros validados (${trialScore}%)`
    });

    const totalCalculated = Math.round(
      checks.reduce((acc, curr) => acc + curr.actualScore, 0)
    );

    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    let grade = 'A+ (Óptimo)';
    let gradeColor = 'emerald';
    if (totalCalculated < 80 || failCount > 0) {
      grade = 'C (Observaciones Requeridas)';
      gradeColor = 'rose';
    } else if (totalCalculated < 95 || warnCount > 0) {
      grade = 'A (Operativo Conforme)';
      gradeColor = 'amber';
    }

    return {
      score: totalCalculated,
      grade,
      gradeColor,
      checks,
      passCount,
      warnCount,
      failCount
    };
  }, [plots, locations, seedBatches, trialRecords, varieties]);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    if (refreshData) {
      try {
        await refreshData();
      } catch (e) {
        console.warn('Error refreshing context:', e);
      }
    }
    setTimeout(() => {
      setIsAuditing(false);
      setLastAuditTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl p-5 md:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all duration-300">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mb-20" />

        {/* TOP BAR: INSTITUTIONAL CONTEXT & CONTROLS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                ARICCAME · Ley Nacional 27.669
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                Cooperativa PatagonianC LTDA
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                (CUIT 30-71816113-0)
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                <span>Habilitaciones Oficiales & Integridad del Sistema</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700 disabled:opacity-50"
              title="Recalcular integridad con datos actuales"
            >
              <RefreshCw size={13} className={isAuditing ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
              <span>{isAuditing ? 'Auditando...' : 'Re-auditar'}</span>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">({lastAuditTimestamp})</span>
            </button>

            <button
              onClick={() => setShowFullLicenseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all shadow-emerald-600/20 active:scale-95"
            >
              <Award size={14} />
              <span>Acta de Licencias ARICCAME</span>
            </button>

            <Link
              to="/integrity"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Auditoría DB</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* MAIN BODY: 3-COLUMN ADAPTIVE GRID (2 LICENSES + 1 SYSTEM INTEGRITY SCORE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 mt-5 relative z-10">
          
          {/* CARD 1: LICENCIA AGRÍCOLA (LG:COL-SPAN-4) */}
          <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 md:p-5 border border-emerald-500/20 dark:border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0 shadow-sm">
                    <Sprout size={18} strokeWidth={2.4} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                      Cultivo, Criadero & Propagación
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Licencia Agrícola Oficial
                    </h3>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activa
                </span>
              </div>

              {/* Expediente Code Box */}
              <div className="bg-white dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 space-y-1 mb-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono uppercase">Expediente Oficial</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">ARICCAME #MEC</span>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 truncate tracking-tight selection:bg-emerald-200" title="EX-2024-134354227--APN-ARICCAME#MEC">
                  EX-2024-134354227--APN-ARICCAME#MEC
                </div>
              </div>

              {/* Compact Details List */}
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 mb-3">
                <li className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Vigencia:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">2024 – 2029 (5 años)</span>
                </li>
                <li className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Límite Cannabinoide:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">THC &lt; 0.30% (No Psicoactivo)</span>
                </li>
                <li className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Establecimiento:</span>
                  <span className="font-medium truncate max-w-[170px]" title="Camino IDEVI Parcela 42, Viedma">IDEVI Parcela 42, Viedma</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedLicense(ACTIVE_LICENSES[0])}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Ver Alcance & Resolución</span>
                <ChevronRight size={13} />
              </button>
              <span className="text-[10px] font-mono text-slate-400">INASE / SENASA OK</span>
            </div>
          </div>

          {/* CARD 2: LICENCIA INDUSTRIAL (LG:COL-SPAN-4) */}
          <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 md:p-5 border border-sky-500/20 dark:border-sky-500/20 hover:border-sky-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20 shrink-0 shadow-sm">
                    <Factory size={18} strokeWidth={2.4} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-sky-700 dark:text-sky-400 tracking-wider block">
                      Derivados, Fibra & Transformación
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Licencia Industrial Oficial
                    </h3>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Activa
                </span>
              </div>

              {/* Expediente Code Box */}
              <div className="bg-white dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 space-y-1 mb-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono uppercase">Expediente Oficial</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">ARICCAME #MEC</span>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 truncate tracking-tight selection:bg-sky-200" title="EX-2025-119427833--APN-ARICCAME#MEC">
                  EX-2025-119427833--APN-ARICCAME#MEC
                </div>
              </div>

              {/* Compact Details List */}
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 mb-3">
                <li className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Vigencia:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">2025 – 2030 (5 años)</span>
                </li>
                <li className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Procesos:</span>
                  <span className="font-bold text-sky-700 dark:text-sky-300 font-mono">Biomasa, Fibra & Extractos</span>
                </li>
                <li className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Planta Operativa:</span>
                  <span className="font-medium truncate max-w-[170px]" title="Parque Industrial Viedma Lote 18">Parque Ind. Viedma Lote 18</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedLicense(ACTIVE_LICENSES[1])}
                className="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Ver Alcance & Procesos</span>
                <ChevronRight size={13} />
              </button>
              <span className="text-[10px] font-mono text-slate-400">BPM / HACCP Cert</span>
            </div>
          </div>

          {/* CARD 3: VISUAL SYSTEM INTEGRITY GAUGE & METRICS (LG:COL-SPAN-4) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-4 md:p-5 border border-slate-800 shadow-md flex flex-col justify-between relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20 ${
              integrityAnalysis.score >= 90 ? 'bg-emerald-500' : integrityAnalysis.score >= 75 ? 'bg-amber-500' : 'bg-rose-500'
            }`} />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400 border border-white/10">
                    <Activity size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block">
                      Auditoría de Datos en Tiempo Real
                    </span>
                    <h3 className="text-sm font-black text-white">
                      Integridad del Sistema
                    </h3>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  integrityAnalysis.score >= 90 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' 
                    : integrityAnalysis.score >= 75 
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700' 
                      : 'bg-rose-950/80 text-rose-300 border-rose-700'
                }`}>
                  {integrityAnalysis.grade.split(' ')[0]}
                </span>
              </div>

              {/* Gauge Display */}
              <div className="flex items-center gap-4 py-2">
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  {/* SVG Circular Progress Ring */}
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={
                        integrityAnalysis.score >= 90 
                          ? 'text-emerald-400' 
                          : integrityAnalysis.score >= 75 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                      }
                      strokeDasharray={`${integrityAnalysis.score}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black font-mono tracking-tight leading-none text-white">
                      {integrityAnalysis.score}%
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 uppercase mt-0.5">
                      Válido
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-slate-200">
                    {integrityAnalysis.score >= 95 ? 'Trazabilidad 100% Inmutable' : 'Consistencia Operativa Alta'}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {integrityAnalysis.checks.length} dimensiones evaluadas sobre parcelas, stock de semillas, coordenadas GPS y registros de campo.
                  </p>
                  
                  {/* Metric Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[9px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ {integrityAnalysis.passCount} Conformes
                    </span>
                    {integrityAnalysis.warnCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ! {integrityAnalysis.warnCount} Observ.
                      </span>
                    )}
                    {integrityAnalysis.failCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ✕ {integrityAnalysis.failCount} Fallas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setShowIntegrityDetails(!showIntegrityDetails)}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>{showIntegrityDetails ? 'Ocultar Desglose' : 'Ver Métricas Evaluadas'}</span>
                <ChevronRight size={13} className={`transform transition-transform ${showIntegrityDetails ? 'rotate-90' : ''}`} />
              </button>

              <Link
                to="/integrity"
                className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 underline underline-offset-2"
              >
                Centro de Integridad
              </Link>
            </div>
          </div>
        </div>

        {/* EXPANDABLE SECTION: DETAILED BREAKDOWN OF SYSTEM INTEGRITY CHECKS */}
        {showIntegrityDetails && (
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Database size={13} />
                <span>Desglose Detallado de Integridad por Dimensión de Datos</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Última evaluación: {lastAuditTimestamp}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {integrityAnalysis.checks.map(check => (
                <div 
                  key={check.id}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {check.category}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      check.status === 'pass' 
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                        : check.status === 'warn'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                    }`}>
                      {check.status === 'pass' ? '✓ Conforme' : check.status === 'warn' ? '⚠ Observación' : '✕ Crítico'}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {check.title}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {check.description}
                  </p>
                  <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-700/60 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    {check.metric}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: DETALLE ESPECÍFICO DE LICENCIA INDIVIDUAL */}
      {selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${
                  selectedLicense.type === 'agricultural' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                }`}>
                  {selectedLicense.type === 'agricultural' ? <Sprout size={24} /> : <Factory size={24} />}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
                    Certificación Oficial ARICCAME
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">
                    {selectedLicense.name}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLicense(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Expediente Principal */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-slate-500">Expediente Oficial de Registro:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold font-mono text-[10px]">
                  VIGENTE
                </span>
              </div>
              <div className="text-base font-black font-mono text-slate-900 dark:text-slate-50 select-all">
                {selectedLicense.expediente}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                <strong>Marco Normativo:</strong> {selectedLicense.regulatoryFramework}
              </div>
            </div>

            {/* Grid de Metadatos */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Titular</span>
                <strong className="text-slate-900 dark:text-slate-100">{selectedLicense.holderName}</strong>
                <span className="text-[10px] font-mono text-slate-500 block">CUIT {selectedLicense.cuit}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Vigencia & Plazo</span>
                <strong className="text-slate-900 dark:text-slate-100">{selectedLicense.validUntil}</strong>
                <span className="text-[10px] text-slate-500 block">Emisión: {selectedLicense.issueDate}</span>
              </div>
            </div>

            {/* Alcance Oficial */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase font-mono text-[11px]">
                Alcance y Objeto Regulatorio
              </h4>
              <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 leading-relaxed">
                {selectedLicense.scope}
              </p>
            </div>

            {/* Actividades Autorizadas */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase font-mono text-[11px]">
                Actividades y Operaciones Autorizadas
              </h4>
              <ul className="space-y-1.5">
                {selectedLicense.allowedActivities.map((act, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">
                {selectedLicense.authority} · {selectedLicense.jurisdiction}
              </span>
              <button
                onClick={() => setSelectedLicense(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTA COMPLETA INSTITUCIONAL DE LICENCIAS ARICCAME (IMPRIMIBLE) */}
      {showFullLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-300 shadow-2xl p-6 md:p-8 space-y-6">
            
            {/* Header Oficial Imprimible */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow">
                  HC
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-800 block">
                    República Argentina · Ministerio de Economía · ARICCAME
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
                    Acta Consolidada de Licencias y Habilitaciones
                  </h2>
                  <span className="text-xs text-slate-600 font-medium">
                    Ley Nacional 27.669 · Decreto Reglamentario 405/2023 · Cáñamo Industrial
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setShowFullLicenseModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 print:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {/* Titular Oficial */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                  Titular & Operador Responsable
                </span>
                <strong className="text-base font-black text-slate-900 uppercase">
                  Cooperativa PatagonianC LTDA
                </strong>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Establecimientos Registrados: Valle Inferior del Río Negro (IDEVI) & Parque Industrial Viedma
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Clave Única de Identificación Tributaria</span>
                <span className="font-mono font-black text-sm bg-white px-2.5 py-1 rounded border border-slate-300 inline-block mt-0.5">
                  CUIT 30-71816113-0
                </span>
              </div>
            </div>

            {/* Las 2 Licencias en Detalle */}
            <div className="space-y-4">
              {ACTIVE_LICENSES.map(lic => (
                <div key={lic.id} className="p-4 rounded-xl border border-slate-300 bg-white space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${lic.type === 'agricultural' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                        {lic.type === 'agricultural' ? <Sprout size={16} /> : <Factory size={16} />}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{lic.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{lic.category}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      ESTADO: ACTIVA Y VIGENTE
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[9px] uppercase font-mono text-slate-400 block">Número de Expediente Único</span>
                    <strong className="font-mono text-xs sm:text-sm text-slate-900 block select-all">
                      {lic.expediente}
                    </strong>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <div>
                      <strong>Período de Vigencia:</strong> {lic.validUntil}
                    </div>
                    <div>
                      <strong>Marco Normativo:</strong> {lic.regulatoryFramework}
                    </div>
                    <div className="sm:col-span-2">
                      <strong>Alcance Autorizado:</strong> {lic.scope}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Integridad & Validez */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <strong className="text-slate-900">Validación Criptográfica & Trazabilidad Digital</strong>
                </div>
                <p className="text-[11px] text-slate-500">
                  Documento respaldado por el sistema HempC Nucleus. Válido para inspecciones de INASE, SENASA, ARICCAME y Fuerzas de Seguridad en transporte.
                </p>
              </div>

              <div className="shrink-0 text-right">
                <BarcodeRenderer value="ARICCAME-PATAGONIANC-2026" width={1.2} height={28} displayValue={false} />
                <span className="text-[8px] font-mono text-slate-400 block mt-1">
                  ID: EX-2024-134354227 / EX-2025-119427833
                </span>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center print:hidden">
              <span className="text-xs text-slate-500">
                Apto para impresión en formato oficial A4 o certificación notarial.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullLicenseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow flex items-center gap-2 transition-all active:scale-95"
                >
                  <Printer size={15} />
                  <span>Imprimir Acta Oficial</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
