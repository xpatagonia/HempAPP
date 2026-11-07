import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  Download,
  Compass
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  evaluateProducerSteps,
  exportProducerManualPDF
} from '../src/services/producerTutorialService';

export default function ProducerReadinessBanner() {
  const navigate = useNavigate();
  const {
    currentUser,
    clients,
    locations,
    storagePoints,
    seedBatches,
    resources,
    plots,
    tasks,
    trialRecords,
    hydricRecords,
    agrochemicalApplications
  } = useAppContext();

  const readiness = useMemo(
    () =>
      evaluateProducerSteps({
        locations,
        storagePoints,
        seedBatches,
        resources,
        plots,
        tasks,
        trialRecords,
        hydricRecords,
        agrochemicalApplications
      }),
    [
      locations,
      storagePoints,
      seedBatches,
      resources,
      plots,
      tasks,
      trialRecords,
      hydricRecords,
      agrochemicalApplications
    ]
  );

  const organizationName =
    clients.find(c => String(c.id) === String(currentUser?.clientId))?.name ||
    currentUser?.organizationName ||
    'Establecimiento Cooperativo HempC';

  const handleOpenAssistant = () => {
    window.dispatchEvent(new CustomEvent('nucleus:open-producer-assistant'));
  };

  const handleDownloadPdf = () => {
    exportProducerManualPDF({
      user: currentUser,
      organizationName,
      report: readiness
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900/95 rounded-2xl p-4 md:p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-400">
            <Compass size={14} />
            <span className="font-bold">Ruta de Carga del Productor (6 Eslabones)</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-bold">
              {readiness.completedCount}/{readiness.totalSteps} Completados ({readiness.completionPct}%)
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              Próximo paso: {readiness.nextRecommendedStep.shortTitle}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {readiness.nextRecommendedStep.liveReadinessNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAssistant}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <Compass size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Asistente Paso a Paso</span>
          </button>

          <Link
            to="/producer-guide"
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <BookOpen size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Centro de Tutoría</span>
          </Link>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            title="Descargar Manual Oficial de Procedimientos del Productor (PDF)"
          >
            <Download size={13} />
            <span>Manual PDF</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(readiness.nextRecommendedStep.primaryRoute)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <span>{readiness.nextRecommendedStep.primaryCtaLabel}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Tira Compacta de los 6 Eslabones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {readiness.steps.map(step => {
          const isDone = step.status === 'completed';
          const isNext = step.id === readiness.nextRecommendedStep.id;
          return (
            <Link
              key={step.id}
              to={step.primaryRoute}
              className={`px-3 py-2 rounded-xl border transition flex items-center justify-between gap-2 ${
                isDone
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50 text-slate-800 dark:text-slate-200 hover:bg-emerald-50'
                  : isNext
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70 text-slate-900 dark:text-white hover:bg-amber-100/60'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/70'
              }`}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-black tabular-nums">
                  PASO {step.number} · {step.shortTitle}
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {step.metricsSummary}
                </div>
              </div>
              {isDone ? (
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Clock size={14} className={isNext ? 'text-amber-600 dark:text-amber-400 shrink-0' : 'opacity-40 shrink-0'} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
