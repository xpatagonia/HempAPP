import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Download,
  BookOpen,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  evaluateProducerSteps,
  getContextualScreenGuide,
  exportProducerManualPDF
} from '../src/services/producerTutorialService';

interface ProducerStepAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProducerStepAssistantModal({
  isOpen,
  onClose
}: ProducerStepAssistantModalProps) {
  const location = useLocation();
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

  const contextualStep = useMemo(
    () => getContextualScreenGuide(location.pathname, readiness),
    [location.pathname, readiness]
  );

  const [selectedStepId, setSelectedStepId] = useState<string>(contextualStep.id);

  useEffect(() => {
    if (isOpen) {
      setSelectedStepId(contextualStep.id);
    }
  }, [isOpen, contextualStep.id]);

  if (!isOpen) return null;

  const activeStep =
    readiness.steps.find(s => s.id === selectedStepId) || contextualStep;

  const organizationName =
    clients.find(c => String(c.id) === String(currentUser?.clientId))?.name ||
    currentUser?.organizationName ||
    'Establecimiento Asociado HempC';

  const handleGoToRoute = (route: string) => {
    onClose();
    navigate(route);
  };

  const handleDownloadPdf = () => {
    exportProducerManualPDF({
      user: currentUser,
      organizationName,
      report: readiness
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
        {/* Cabecera del Asistente */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              <Compass size={14} />
              <span>Asistente Paso a Paso en Vivo</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{readiness.completionPct}% Completado</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Guía Operativa del Productor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Establecimiento: <strong className="text-slate-700 dark:text-slate-200">{organizationName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar asistente"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector Horizontal de los 6 Eslabones */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Seleccioná un eslabón de la cadena de carga:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {readiness.completedCount}/{readiness.totalSteps} listos
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {readiness.steps.map(step => {
              const isSelected = step.id === activeStep.id;
              const isDone = step.status === 'completed';
              const isCurrentRoute = step.id === contextualStep.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className={`px-2 py-2 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                      : isDone
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black tabular-nums">{step.number}</span>
                    {isDone ? (
                      <CheckCircle2 size={12} className={isSelected ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'} />
                    ) : (
                      <Clock size={12} className="opacity-60" />
                    )}
                  </div>
                  <div className="text-[10px] font-semibold truncate mt-0.5">{step.shortTitle}</div>
                  {isCurrentRoute && (
                    <div className="text-[9px] font-mono opacity-75 truncate">Pantalla actual</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido Detallado del Eslabón Seleccionado */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Encabezado y Estado en Vivo del Paso */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                ESLABÓN {activeStep.number} DE 06 · {activeStep.metricsSummary}
              </span>
              <span
                className={`font-mono font-bold ${
                  activeStep.status === 'completed'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : activeStep.status === 'in_progress'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {activeStep.status === 'completed'
                  ? 'Completado'
                  : activeStep.status === 'in_progress'
                  ? 'En Curso'
                  : 'Pendiente de Carga'}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {activeStep.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeStep.liveReadinessNote}
            </p>
          </div>

          {/* Regla de Pre-Requisito y Trazabilidad */}
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <ShieldCheck size={15} className="shrink-0" />
              <span>Regla de Integridad y Orden de Carga</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {activeStep.prerequisiteRule}
            </p>
          </div>

          {/* Checklist Paso a Paso */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Procedimiento Paso a Paso en Pantalla
            </h4>
            <div className="space-y-2">
              {activeStep.stepByStepChecklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0 mt-0.5">
                    0{idx + 1}.
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Campos Obligatorios y Ejemplos */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Datos Clave que Debés Tener a Mano
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
              {activeStep.requiredFields.map((rf, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{rf.field}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{rf.rule}</div>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                    Ej: {rf.example}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diferencia Productor vs Administrador en esta Etapa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                Qué ve y hace el Productor
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStep.producerViewSummary}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Qué audita el Administrador
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStep.adminViewSummary}
              </p>
            </div>
          </div>

          {/* Errores Comunes que Bloquean la Carga */}
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Errores Frecuentes a Evitar</span>
            </div>
            <ul className="space-y-1.5 text-xs text-rose-700 dark:text-rose-300/90 list-disc pl-4">
              {activeStep.blockingErrorsToAvoid.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pie del Asistente con Acciones Directas */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleGoToRoute('/producer-guide')}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <BookOpen size={14} />
              <span>Centro de Tutoría Completo</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="Descargar Manual Oficial de Procedimientos del Productor (PDF)"
            >
              <Download size={14} />
              <span>Manual PDF</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleGoToRoute(activeStep.primaryRoute)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <span>{activeStep.primaryCtaLabel}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
