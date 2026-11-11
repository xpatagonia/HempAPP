import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calculator,
  UserCheck,
  Sprout,
  Archive,
  CheckSquare,
  Tractor,
  Warehouse
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  evaluateProducerSteps,
  PRODUCER_VS_ADMIN_MATRIX,
  exportProducerManualPDF
} from '../src/services/producerTutorialService';

export default function ProducerGuide() {
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
    agrochemicalApplications,
    usersList,
    startImpersonation,
    impersonatingAdmin,
    stopImpersonation
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

  const [activeTab, setActiveTab] = useState<'steps' | 'phytosanitary' | 'matrix'>('steps');
  const [selectedStepId, setSelectedStepId] = useState<string>(readiness.nextRecommendedStep.id);

  // Estado del simulador interactivo de control de dosificación para práctica del productor
  const [simSurfaceHa, setSimSurfaceHa] = useState<number>(
    plots[0]?.surfaceArea && plots[0].surfaceArea > 0 ? plots[0].surfaceArea : 10
  );
  const [simAppliedDosage, setSimAppliedDosage] = useState<number>(2.0);
  const [simMinDosage, setSimMinDosage] = useState<number>(1.5);
  const [simMaxDosage, setSimMaxDosage] = useState<number>(2.5);
  const [simAvailableStock, setSimAvailableStock] = useState<number>(30);
  const [simWindSpeed, setSimWindSpeed] = useState<number>(11);

  const activeStep =
    readiness.steps.find(s => s.id === selectedStepId) || readiness.steps[0];

  const organizationName =
    clients.find(c => String(c.id) === String(currentUser?.clientId))?.name ||
    currentUser?.organizationName ||
    'Establecimiento Cooperativo HempC';

  const isAdminUser =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    Boolean(impersonatingAdmin);

  const producerUsers = useMemo(
    () =>
      (usersList || []).filter(
        u => u.role === 'client' || u.requestedProfileType === 'productor' || Boolean(u.clientId)
      ),
    [usersList]
  );

  const simTotalRequired = Number((simSurfaceHa * simAppliedDosage).toFixed(2));
  const simRemainingStock = Number((simAvailableStock - simTotalRequired).toFixed(2));
  const simDosageStatus =
    simAppliedDosage < simMinDosage
      ? 'subdosis'
      : simAppliedDosage > simMaxDosage
      ? 'sobredosis'
      : 'optima';
  const simStockOk = simTotalRequired <= simAvailableStock;
  const simWindOk = simWindSpeed <= 15;

  const handleDownloadPdf = () => {
    exportProducerManualPDF({
      user: currentUser,
      organizationName,
      report: readiness
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Encabezado Principal y Estado General del Establecimiento */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Centro Oficial de Capacitación Operativa</span>
              <span aria-hidden="true">·</span>
              <span>Establecimiento: {organizationName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                {readiness.completedCount} de {readiness.totalSteps} Eslabones Completados ({readiness.completionPct}%)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tutoría y Procedimientos de Carga del Productor
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              Guía interactiva paso a paso conectada en tiempo real a los datos de tu establecimiento para completar la trazabilidad desde la georreferenciación del campo hasta el Cuaderno Fitosanitario SENASA y el cierre de cosecha.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
            >
              <Download size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Descargar Manual Oficial PDF</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  !isAdminUser && readiness.nextRecommendedStep.primaryRoute === '/resources'
                    ? '/tools'
                    : readiness.nextRecommendedStep.primaryRoute
                )
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap"
            >
              <span>Continuar en Paso {readiness.nextRecommendedStep.number}: {readiness.nextRecommendedStep.shortTitle}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Etapa 0: Protocolo de Alta y Validación Exclusiva por Administrador */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck size={14} />
              <span>ETAPA 00 · ALTA Y VALIDACIÓN EXCLUSIVA POR ADMINISTRADOR</span>
              <span aria-hidden="true">·</span>
              <span>Estado de Cuenta: {currentUser?.accountStatus === 'pending_approval' ? 'Pendiente' : 'Aprobada y Activa'}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              1º El postulante solicita el alta sin contraseña (`pending_approval`, sin crear registros previos en Organizaciones) → 2º Un <strong>Administrador</strong> valida la solicitud en <em>Equipo & Accesos (/users)</em>, aprueba como <strong>Productor</strong> y el sistema crea/vincula automáticamente su <strong>Organización (`clientId`)</strong> → 3º El productor recibe el enlace oficial con `activationToken` para definir su contraseña e iniciar los 6 eslabones.
            </p>
          </div>
          {isAdminUser && (
            <Link
              to="/users"
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <UserCheck size={14} />
              <span>Ir a Aprobaciones Admin (/users)</span>
            </Link>
          )}
        </div>

        {/* Barra de Progreso de los 6 Eslabones en Vivo */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {readiness.steps.map(step => {
              const isSelected = activeTab === 'steps' && step.id === activeStep.id;
              const isDone = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveTab('steps');
                    setSelectedStepId(step.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                      : isDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-black tabular-nums">
                      PASO {step.number}
                    </span>
                    {isDone ? (
                      <CheckCircle2
                        size={14}
                        className={
                          isSelected
                            ? 'text-emerald-400 dark:text-emerald-600'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      />
                    ) : (
                      <Clock
                        size={14}
                        className={
                          isInProgress ? 'text-amber-500' : 'opacity-50'
                        }
                      />
                    )}
                  </div>
                  <div className="text-xs font-bold truncate">{step.shortTitle}</div>
                  <div
                    className={`text-[11px] font-mono truncate mt-0.5 ${
                      isSelected
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {step.metricsSummary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conmutador de Secciones del Centro de Tutoría */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('steps')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'steps'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              1. Guía de los 6 Eslabones de Carga
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phytosanitary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'phytosanitary'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. Circuito Fitosanitario y Simulador de Dosis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Diferencias: Vista Productor vs. Administrador
            </button>
          </div>

          {isAdminUser && producerUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                Auditar vista como Productor:
              </span>
              <select
                value={currentUser?.id || ''}
                onChange={e => {
                  if (e.target.value) startImpersonation(e.target.value);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={currentUser?.id || ''}>
                  Sesión Actual ({currentUser?.name})
                </option>
                {producerUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    Simular Productor: {u.name} ({u.organizationName || 'Socio'})
                  </option>
                ))}
              </select>
              {impersonatingAdmin && (
                <button
                  type="button"
                  onClick={() => stopImpersonation()}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  Volver a Admin
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 1: DETALLE DEL ESLABÓN SELECCIONADO */}
      {activeTab === 'steps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Índice Vertical de las 6 Etapas */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Secuencia Obligatoria de Campaña
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hacé clic en cada etapa para ver qué datos cargar y cómo evitar bloqueos.
              </p>
            </div>
            {readiness.steps.map(step => {
              const isSelected = step.id === activeStep.id;
              const isDone = step.status === 'completed';
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className={`w-full p-4 text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ETAPA {step.number}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {step.primaryRoute}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {step.shortTitle}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {step.metricsSummary}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold shrink-0 ${
                      isDone
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : step.status === 'in_progress'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {isDone ? 'Listo' : step.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Columna Derecha: Instructivo Paso a Paso de la Etapa */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>ESLABÓN {activeStep.number} DE 06</span>
                  <span aria-hidden="true">·</span>
                  <span>Ruta: {activeStep.primaryRoute}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-bold ${
                      activeStep.status === 'completed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {activeStep.status === 'completed' ? 'Etapa Completada' : 'Requiere Atención'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {activeStep.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {activeStep.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeStep.secondaryRoute && activeStep.secondaryCtaLabel && (
                  <Link
                    to={activeStep.secondaryRoute}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                  >
                    {activeStep.secondaryCtaLabel}
                  </Link>
                )}
                <Link
                  to={!isAdminUser && activeStep.primaryRoute === '/resources' ? '/tools' : activeStep.primaryRoute}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>
                    {!isAdminUser && activeStep.primaryRoute === '/resources'
                      ? 'Calculadora de Dosis (/tools)'
                      : activeStep.primaryCtaLabel}
                  </span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Diagnóstico en Vivo y Regla de Pre-requisito */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Diagnóstico en Vivo de tu Establecimiento
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeStep.liveReadinessNote}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Regla de Dependencia y Trazabilidad
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
                  {activeStep.prerequisiteRule}
                </p>
              </div>
            </div>

            {/* Guía de Carga Paso a Paso */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Cómo Utilizar la Plataforma en esta Etapa (Paso a Paso)
              </h3>
              <div className="space-y-2.5">
                {activeStep.stepByStepChecklist.map((instruction, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3.5"
                  >
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0 mt-0.5">
                      0{index + 1}.
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla de Campos Requeridos */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Campos Obligatorios y Validaciones del Formulario
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-4 font-bold">Campo del Formulario</th>
                      <th className="py-2.5 px-4 font-bold">Regla de Validación</th>
                      <th className="py-2.5 px-4 font-bold">Ejemplo Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {activeStep.requiredFields.map((rf, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {rf.field}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {rf.rule}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {rf.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparativa en Etapa + Errores que Bloquean */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Diferencia de Rol en este Módulo
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-emerald-700 dark:text-emerald-400">Productor:</strong> {activeStep.producerViewSummary}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-800 dark:text-slate-200">Administrador:</strong> {activeStep.adminViewSummary}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle size={14} />
                  <span>Errores Comunes que Debés Evitar</span>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-700 dark:text-rose-300 list-disc pl-4">
                  {activeStep.blockingErrorsToAvoid.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: CIRCUITO FITOSANITARIO Y SIMULADOR DE DOSIFICACIÓN */}
      {activeTab === 'phytosanitary' && (
        <div className="space-y-6">
          {/* Diagrama de los 4 Nodos del Circuito Fitosanitario */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="space-y-1">
              <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                Trazabilidad Fitosanitaria End-to-End · Resolución SENASA / GACP
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Circuito Obligatorio de Insumos, Dosificación, Clima y Cuaderno Fitosanitario
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                Recordá que el productor no puede aplicar ningún producto en el campo ni asentarlo en el Cuaderno Fitosanitario si no figura previamente en una Orden de Labor vinculada a un Insumo Homologado de su galpón.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-mono font-bold text-slate-500">ESLABÓN A · ORIGEN</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  1. Proveedor Homologado
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Todo bioinsumo, fertilizante o fitosanitario se asocia a su fabricante/proveedor con CUIT y habilitación vigente.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ESLABÓN B · GALPÓN (/resources)
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  2. Insumo + Ficha SENASA + Dosis
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Se carga el stock disponible, Nº Registro SENASA, Lote, Carencia y el rango de Dosis Recomendada, Mínima y Máxima por ha.
                </p>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  Actual: {readiness.phytosanitaryChainSummary.homologatedResourcesCount} insumos SENASA
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  ESLABÓN C · CAMPO (/tasks)
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  3. Orden de Labor (Insumo y Clima)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Al elegir lote e insumo, calcula Cantidad Total = Dosis/ha × Superficie, valida el stock y registra Temperatura, HR y Viento.
                </p>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  Actual: {readiness.phytosanitaryChainSummary.phytoTasksCount} labores con insumo
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  ESLABÓN D · AUDITORÍA (/phytosanitary)
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  4. Cuaderno Fitosanitario SENASA
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Recibe automáticamente el asiento desde la Orden de Labor. Bloquea la carga manual de productos fuera de la lista de tareas.
                </p>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  Actual: {readiness.phytosanitaryChainSummary.senasaBookEntriesCount} asientos trazados
                </div>
              </div>
            </div>
          </div>

          {/* Simulador Interactivo de Dosificación y Validación Pre-Aplicación */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <Calculator size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Simulador de Entrenamiento Operativo</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  Probá Cómo Controla la Plataforma la Dosificación, el Stock y el Clima
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') ? (
                  <Link
                    to="/resources"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Ir a Insumos (/resources)
                  </Link>
                ) : (
                  <Link
                    to="/tools"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Calculadoras de Dosis (/tools)
                  </Link>
                )}
                <Link
                  to="/tasks"
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Ir a Órdenes de Labor (/tasks)
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Superficie de la Parcela (ha)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={simSurfaceHa}
                    onChange={e => setSimSurfaceHa(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                  />
                  <span className="text-[11px] text-slate-500">Viene del polígono de /plots</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dosis Prescrita en Orden de Labor (L/ha)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={simAppliedDosage}
                    onChange={e => setSimAppliedDosage(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                  />
                  <span className="text-[11px] text-slate-500">Se controla en /tasks</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Umbral Mínimo / Máximo Marbete (L/ha)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={simMinDosage}
                      onChange={e => setSimMinDosage(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                      title="Dosis mínima segura"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={simMaxDosage}
                      onChange={e => setSimMaxDosage(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                      title="Dosis máxima segura"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">Configurado en Ficha de /resources</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stock en Galpón (L) y Viento (km/h)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="1"
                      value={simAvailableStock}
                      onChange={e => setSimAvailableStock(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                      title="Stock actual en galpón"
                    />
                    <input
                      type="number"
                      step="1"
                      value={simWindSpeed}
                      onChange={e => setSimWindSpeed(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white tabular-nums"
                      title="Velocidad del viento km/h"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">Stock (/resources) · Viento máx 15 km/h</span>
                </div>
              </div>

              {/* Resultado del Validador en Tiempo Real */}
              <div className="lg:col-span-5 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">VOLUMEN TOTAL REQUERIDO:</span>
                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {simTotalRequired} L ({simAppliedDosage} L/ha × {simSurfaceHa} ha)
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between">
                    <span>1. Control de Dosificación SENASA:</span>
                    <span
                      className={`font-mono font-bold ${
                        simDosageStatus === 'optima'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {simDosageStatus === 'optima'
                        ? 'DENTRO DE MARBETE'
                        : simDosageStatus === 'subdosis'
                        ? 'SUB-DOSIS (< Mínimo)'
                        : 'SOBRE-DOSIS (> Máximo)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>2. Disponibilidad en Galpón:</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        simStockOk
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {simStockOk
                        ? `STOCK APTO (Saldo: ${simRemainingStock} L)`
                        : `STOCK INSUFICIENTE (Faltan ${Math.abs(simRemainingStock)} L)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>3. Ventana Eólica de Pulverización:</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        simWindOk
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {simWindOk
                        ? `VIENTO APTO (${simWindSpeed} km/h ≤ 15 km/h)`
                        : `ALERTA DERIVA (${simWindSpeed} km/h > 15 km/h)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: MATRIZ COMPARATIVA PRODUCTOR VS ADMINISTRADOR */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Gobernanza y Control de Acceso Basado en Roles (RBAC)
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Matriz Comparativa: Qué Ve y Opera el Productor vs. Qué Audita el Administrador
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Esta tabla resume las diferencias exactas de visualización, carga de datos y bloqueos normativos entre el perfil de Socio Productor y la Administración Central.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5 font-bold">Módulo / Pantalla</th>
                  <th className="py-3 px-5 font-bold">Vista y Permisos del Productor</th>
                  <th className="py-3 px-5 font-bold">Vista y Permisos del Administrador</th>
                  <th className="py-3 px-5 font-bold">Regla de Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {PRODUCER_VS_ADMIN_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <div>{row.moduleName}</div>
                      <Link
                        to={row.route}
                        className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Abrir {row.route}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 dark:text-slate-200 leading-relaxed">
                      {row.producerCapability}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {row.adminCapability}
                    </td>
                    <td className="py-3.5 px-5 text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                      {row.regulatoryRule}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
