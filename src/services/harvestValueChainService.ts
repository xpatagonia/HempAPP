import {
  Plot,
  Variety,
  User,
  Location,
  Client,
  SeedBatch,
  BiologicalMaterialType,
  HarvestConditioningStage
} from '../../types';
import {
  isCentralAdminOrSupervisor,
  isBlockedOrNonSystemUser,
  isSupplierRestrictedUser
} from '../utils/structurePermissions';
import { canUserEditOrMutatePlot, sanitizePlotInputText } from '../utils/plotManagementUtils';

const PLOT_META_PREFIX = '/*HEMPC_PLOT_META:';
const PLOT_META_SUFFIX = '*/';

export interface PlotHarvestScheduleMetrics {
  sowingDate: string;
  nominalCycleDays: number;
  cycleDays: number;
  /** Variable 1: Fecha estimada automática según Fecha de Siembra + Ciclo de la Genética (YYYY-MM-DD) */
  geneticEstimatedHarvestDate: string;
  /** Variable 2: Fecha final real en campo manejada por el Productor (YYYY-MM-DD) */
  producerFinalHarvestDate: string;
  /** Indica si el Productor (o Admin) definió una fecha específica en campo distinta de la teórica */
  isCustomProducerDate: boolean;
  /** Días reales totales desde Siembra hasta la Fecha Final del Productor */
  actualCycleDays: number;
  /** Diferencial en días: (Fecha Final Productor - Fecha Estimada Genética) */
  deltaCycleDays: number;
  /** Etiqueta legible del diferencial respecto al ciclo genético */
  deltaLabel: string;
  /** Estado semántico del diferencial: 'on_time' | 'extended' | 'early' */
  deltaStatus: 'on_time' | 'extended' | 'early';
  /** Porcentaje de avance del ciclo (0 a 100) */
  cycleProgressPct: number;
  /** Días restantes hasta la Fecha Final del Productor (negativo si ya pasó) */
  daysRemainingToFinal: number;
  /** Eslabón actual de la cadena de valor de cosecha */
  conditioningStage: HarvestConditioningStage;
  /** Indica si el Acta Final de Cosecha ya fue bloqueada/confirmada */
  isLockedFinalAct: boolean;
}

export interface PackedPlotHarvestMeta {
  producerFinalHarvestDate?: string;
  geneticEstimatedHarvestDate?: string;
  scheduledHarvestDate?: string;
  scheduledHarvestTime?: string;
  isHarvestScheduled?: boolean;
   harvestDelayReason?: string;
  harvestActConfirmedByProducer?: boolean;
  conditioningStage?: HarvestConditioningStage;
  conditioningNotes?: string;
  grainMoisturePct?: number;
  rettingStatus?: 'Óptimo (Gris plateado)' | 'Medio (Amarillo tostado)' | 'Verde (Sin enriar)';
  actualHarvestYieldKg?: number;
  harvestYieldKg?: number;
  harvestBaleCount?: number;
  avgBaleWeightKg?: number;
  harvestMachinery?: string;
  harvestOperator?: string;
  harvestStoragePointId?: string;
  outputSeedBatchIds?: string[];
  closedDate?: string;
  closedTime?: string;
  closedBy?: string;
  closureConfirmed?: boolean;
  closureActCode?: string;
  closureBarcode?: string;
  closureNotes?: string;
}

/**
 * Suma una cantidad exacta de días calendario a una fecha ISO YYYY-MM-DD en UTC mediodía
 * para evitar desfasajes de huso horario.
 */
export function addDaysToIsoDate(isoDate: string, daysToAdd: number): string {
  const clean = String(isoDate || '').trim().slice(0, 10);
  const parsed = new Date(`${clean}T12:00:00Z`);
  if (isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + Number(daysToAdd || 0));
    return fallback.toISOString().split('T')[0];
  }
  parsed.setUTCDate(parsed.getUTCDate() + Math.round(Number(daysToAdd || 0)));
  return parsed.toISOString().split('T')[0];
}

/**
 * Calcula la diferencia exacta en días calendario: (dateB - dateA).
 */
export function diffDaysBetweenIsoDates(dateAIso: string, dateBIso: string): number {
  const a = new Date(`${String(dateAIso || '').trim().slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${String(dateBIso || '').trim().slice(0, 10)}T12:00:00Z`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula las dos variables fundamentales de cosecha para una parcela:
 * - Variable 1 (Automática): Fecha Estimada por Ciclo Genético = sowingDate + variety.cycleDays
 * - Variable 2 (Operativa del Productor): Fecha Final de Cosecha en Campo
 */
export function calculatePlotHarvestDates(
  plot: Plot,
  variety?: Variety | null,
  referenceDateIso?: string
): PlotHarvestScheduleMetrics {
  const sowingDate = String(plot.sowingDate || '2025-11-15').trim().slice(0, 10);
  const nominalCycleDays =
    variety && Number(variety.cycleDays) > 0 ? Math.round(Number(variety.cycleDays)) : 120;

  // Variable 1: Fecha Estimada por Ciclo Genético (inmutable según Fecha de Siembra + Genética)
  const geneticEstimatedHarvestDate = addDaysToIsoDate(sowingDate, nominalCycleDays);

  // Variable 2: Fecha Final en Campo manejada por el Productor
  // Si el productor aún no fijó una fecha personalizada (o tenía el cierre genérico de campaña 2026-04-01 sin confirmación de acta),
  // parte inicialmente de la fecha programada o de la fecha estimada genética para que pueda ajustarla en campo.
  const explicitProducerDate =
    plot.producerFinalHarvestDate ||
    plot.scheduledHarvestDate ||
    (plot.harvestActConfirmedByProducer && plot.closedDate ? plot.closedDate : '');

  const producerFinalHarvestDate =
    explicitProducerDate && /^\d{4}-\d{2}-\d{2}$/.test(explicitProducerDate.slice(0, 10))
      ? explicitProducerDate.slice(0, 10)
      : geneticEstimatedHarvestDate;

  const isCustomProducerDate = Boolean(
    plot.producerFinalHarvestDate ||
      plot.scheduledHarvestDate ||
      plot.harvestActConfirmedByProducer
  );

  const actualCycleDays = Math.max(1, diffDaysBetweenIsoDates(sowingDate, producerFinalHarvestDate));
  const deltaCycleDays = diffDaysBetweenIsoDates(
    geneticEstimatedHarvestDate,
    producerFinalHarvestDate
  );

  let deltaLabel = 'En fecha de ciclo genético (0 días)';
  let deltaStatus: 'on_time' | 'extended' | 'early' = 'on_time';
  if (deltaCycleDays > 0) {
    deltaLabel = `+${deltaCycleDays} días sobre ciclo genético`;
    deltaStatus = 'extended';
  } else if (deltaCycleDays < 0) {
    deltaLabel = `${deltaCycleDays} días antes del ciclo genético`;
    deltaStatus = 'early';
  }

  const todayIso = (referenceDateIso || new Date().toISOString().split('T')[0]).slice(0, 10);
  const elapsedDays = diffDaysBetweenIsoDates(sowingDate, todayIso);
  const daysRemainingToFinal = diffDaysBetweenIsoDates(todayIso, producerFinalHarvestDate);

  const isLockedFinalAct = Boolean(plot.harvestActConfirmedByProducer);
  const rawProgress =
    actualCycleDays > 0 ? Math.round((elapsedDays / actualCycleDays) * 100) : 100;
  const cycleProgressPct = isLockedFinalAct
    ? 100
    : Math.max(0, Math.min(100, rawProgress));

  const conditioningStage: HarvestConditioningStage =
    plot.conditioningStage ||
    (plot.outputSeedBatchIds && plot.outputSeedBatchIds.length > 0
      ? 'lote_generado_almacen'
      : isLockedFinalAct
      ? 'en_enriado_secado'
      : isCustomProducerDate
      ? 'corte_trilla_programada'
      : 'en_cultivo');

  return {
    sowingDate,
    nominalCycleDays,
    cycleDays: nominalCycleDays,
    geneticEstimatedHarvestDate,
    producerFinalHarvestDate,
    isCustomProducerDate,
    actualCycleDays,
    deltaCycleDays,
    deltaLabel,
    deltaStatus,
    cycleProgressPct,
    daysRemainingToFinal,
    conditioningStage,
    isLockedFinalAct
  };
}

/**
 * Gobernanza Estricta de Semillas INASE:
 * Toda la gestión (alta, edición, baja, QA ISTA y remitos de despacho) de lotes de semilla la realizan
 * exclusivamente los Administradores Centrales ('admin' y 'super_admin').
 */
export function canUserManageSeedBatches(user: User | null | undefined): boolean {
  return isCentralAdminOrSupervisor(user);
}

/**
 * Gobernanza de Cosecha en Campo (Variable 2 — Fecha Final del Productor):
 * - Los Administradores Centrales pueden editar o reabrir cualquier parcela.
 * - El Productor / Encargado / Agrónomo puede ajustar libremente la Fecha Final de Cosecha,
 *   el acondicionamiento en campo y el rinde de las parcelas de su establecimiento
 *   hasta que confirme el Acta Final de Cosecha (`harvestActConfirmedByProducer = true`).
 */
export function canUserEditPlotHarvestVariable(
  user: User | null | undefined,
  plot: Plot | null | undefined,
  locations: Location[],
  clients: Client[]
): { allowed: boolean; reason?: string; isAdminOverride?: boolean } {
  if (!user || !plot) {
    return { allowed: false, reason: 'Sesión o parcela inválida.' };
  }
  if (isBlockedOrNonSystemUser(user)) {
    return { allowed: false, reason: 'Cuenta sin permisos operativos en el sistema.' };
  }
  if (isSupplierRestrictedUser(user)) {
    return {
      allowed: false,
      reason: 'El perfil Semillero / Proveedor tiene acceso de consulta y no opera fechas de cosecha en campo.'
    };
  }
  if (isCentralAdminOrSupervisor(user)) {
    return { allowed: true, isAdminOverride: true };
  }

  // Verificar pertenencia de la parcela al establecimiento del Productor
  const basePerm = canUserEditOrMutatePlot(user, plot, locations, clients);
  if (!basePerm.allowed) {
    return basePerm;
  }

  // Si el Productor ya cerró y bloqueó el Acta Definitiva de Cosecha, solo un Administrador puede reabrirla
  if (plot.harvestActConfirmedByProducer) {
    return {
      allowed: false,
      reason:
        'El Acta Final de Cosecha ya fue confirmada y cerrada. Solicite a un Administrador Central su reapertura si requiere rectificar datos.'
    };
  }

  return { allowed: true };
}

/**
 * Empaqueta la metadata de Cosecha y Cadena de Valor dentro de `observations`
 * para persistencia transparente en Supabase (`public.plots.observations`).
 */
export function packPlotHarvestMetaIntoObservations(
  rawObservationsOrPlot: string | Partial<Plot> | undefined,
  maybePlot?: Partial<Plot>
): string {
  const isFirstArgObject =
    typeof rawObservationsOrPlot === 'object' && rawObservationsOrPlot !== null;
  const plot: Partial<Plot> = isFirstArgObject
    ? (rawObservationsOrPlot as Partial<Plot>)
    : (maybePlot || {});
  const rawObservations: string | undefined = isFirstArgObject
    ? (rawObservationsOrPlot as Partial<Plot>).observations
    : (rawObservationsOrPlot as string | undefined);

  const { cleanObservations, parsedMeta } = unpackPlotHarvestMetaFromObservations(rawObservations);
  const mergedMeta: PackedPlotHarvestMeta = {
    ...parsedMeta,
    producerFinalHarvestDate: plot.producerFinalHarvestDate ?? parsedMeta.producerFinalHarvestDate,
    geneticEstimatedHarvestDate:
      plot.geneticEstimatedHarvestDate ?? parsedMeta.geneticEstimatedHarvestDate,
    scheduledHarvestDate: plot.scheduledHarvestDate ?? parsedMeta.scheduledHarvestDate,
    scheduledHarvestTime: plot.scheduledHarvestTime ?? parsedMeta.scheduledHarvestTime,
    isHarvestScheduled: plot.isHarvestScheduled ?? parsedMeta.isHarvestScheduled,
    harvestDelayReason:
      plot.harvestDelayReason !== undefined
        ? sanitizePlotInputText(plot.harvestDelayReason, 300)
        : parsedMeta.harvestDelayReason,
    harvestActConfirmedByProducer:
      plot.harvestActConfirmedByProducer ?? parsedMeta.harvestActConfirmedByProducer,
    conditioningStage: plot.conditioningStage ?? parsedMeta.conditioningStage,
    conditioningNotes:
      plot.conditioningNotes !== undefined
        ? sanitizePlotInputText(plot.conditioningNotes, 400)
        : parsedMeta.conditioningNotes,
    grainMoisturePct: plot.grainMoisturePct ?? parsedMeta.grainMoisturePct,
    rettingStatus: plot.rettingStatus ?? parsedMeta.rettingStatus,
    actualHarvestYieldKg: plot.actualHarvestYieldKg ?? parsedMeta.actualHarvestYieldKg,
    harvestYieldKg: plot.harvestYieldKg ?? parsedMeta.harvestYieldKg,
    harvestBaleCount: plot.harvestBaleCount ?? parsedMeta.harvestBaleCount,
    avgBaleWeightKg: plot.avgBaleWeightKg ?? parsedMeta.avgBaleWeightKg,
    harvestMachinery: plot.harvestMachinery ?? parsedMeta.harvestMachinery,
    harvestOperator: plot.harvestOperator ?? parsedMeta.harvestOperator,
    harvestStoragePointId: plot.harvestStoragePointId ?? parsedMeta.harvestStoragePointId,
    outputSeedBatchIds: plot.outputSeedBatchIds ?? parsedMeta.outputSeedBatchIds,
    closedDate: plot.closedDate ?? parsedMeta.closedDate,
    closedTime: plot.closedTime ?? parsedMeta.closedTime,
    closedBy: plot.closedBy ?? parsedMeta.closedBy,
    closureConfirmed: plot.closureConfirmed ?? parsedMeta.closureConfirmed,
    closureActCode: plot.closureActCode ?? parsedMeta.closureActCode,
    closureBarcode: plot.closureBarcode ?? parsedMeta.closureBarcode,
    closureNotes: plot.closureNotes ?? parsedMeta.closureNotes
  };

  // Limpiar claves undefined
  Object.keys(mergedMeta).forEach(k => {
    if ((mergedMeta as any)[k] === undefined) {
      delete (mergedMeta as any)[k];
    }
  });

  if (Object.keys(mergedMeta).length === 0) {
    return cleanObservations;
  }

  return `${cleanObservations} ${PLOT_META_PREFIX}${JSON.stringify(mergedMeta)}${PLOT_META_SUFFIX}`.trim();
}

/**
 * Desempaqueta la metadata de Cosecha y Cadena de Valor desde `public.plots.observations`.
 */
export function unpackPlotHarvestMetaFromObservations(rawObservations: string | undefined): {
  cleanObservations: string;
  parsedMeta: PackedPlotHarvestMeta;
  meta: PackedPlotHarvestMeta;
} {
  const raw = String(rawObservations || '');
  const startIdx = raw.indexOf(PLOT_META_PREFIX);
  if (startIdx === -1) {
    return { cleanObservations: raw.trim(), parsedMeta: {}, meta: {} };
  }
  const endIdx = raw.indexOf(PLOT_META_SUFFIX, startIdx + PLOT_META_PREFIX.length);
  if (endIdx === -1) {
    return { cleanObservations: raw.slice(0, startIdx).trim(), parsedMeta: {}, meta: {} };
  }
  const cleanObservations = `${raw.slice(0, startIdx)} ${raw.slice(endIdx + PLOT_META_SUFFIX.length)}`.trim();
  const jsonPart = raw.slice(startIdx + PLOT_META_PREFIX.length, endIdx);
  try {
    const parsed = JSON.parse(jsonPart);
    const validObj = parsed && typeof parsed === 'object' ? parsed : {};
    return {
      cleanObservations,
      parsedMeta: validObj,
      meta: validObj
    };
  } catch {
    return { cleanObservations, parsedMeta: {}, meta: {} };
  }
}

/**
 * Construye un lote trazable de producto cosechado (Grano, Fardos de Fibra, Biomasa CBG o Cañamiza)
 * vinculado a la Parcela de origen, su Lote Madre de Semilla INASE y la Fecha Final de Cosecha del Productor.
 */
export function buildHarvestedOutputBatch(params: {
  plot: Plot;
  variety: Variety | undefined;
  parentSeedBatch?: SeedBatch;
  storagePoint?: { id: string; name?: string };
  materialType: Exclude<BiologicalMaterialType, 'seed'>;
  quantityKg: number;
  harvestDateIso?: string;
  producerHarvestDate?: string;
  storagePointId?: string;
  responsibleName: string;
  moisturePct?: number;
  oilContentPct?: number;
  baleCount?: number;
  avgBaleWeightKg?: number;
  rettingQuality?: 'Óptimo (Gris plateado)' | 'Medio (Amarillo tostado)' | 'Verde (Sin enriar)';
  hplcThcPct?: number;
  hplcCbgPct?: number;
  hurdGranulometry?: 'Fina (0-5 mm)' | 'Media (5-15 mm)' | 'Gruesa (15-25 mm)';
  notes?: string;
}): SeedBatch {
  const {
    plot,
    variety,
    parentSeedBatch,
    storagePoint,
    materialType,
    quantityKg,
    harvestDateIso,
    producerHarvestDate,
    storagePointId,
    responsibleName,
    moisturePct = 8.5,
    oilContentPct = 30,
    baleCount = 0,
    avgBaleWeightKg = 450,
    rettingQuality = 'Óptimo (Gris plateado)',
    hplcThcPct = 0.12,
    hplcCbgPct = 2.4,
    hurdGranulometry = 'Media (5-15 mm)',
    notes = ''
  } = params;

  const resolvedHarvestDate =
    harvestDateIso ||
    producerHarvestDate ||
    plot.producerFinalHarvestDate ||
    new Date().toISOString().split('T')[0];
  const resolvedStoragePointId = storagePointId || storagePoint?.id || plot.harvestStoragePointId || '';
  const resolvedParentSeedBatchId = parentSeedBatch?.id || plot.seedBatchId;

  const prefixMap: Record<Exclude<BiologicalMaterialType, 'seed'>, string> = {
    harvested_grain: 'GRANO',
    fiber_bales: 'FIBRA',
    biomass_cbg: 'BIOMASA',
    hurds: 'CANAMIZA'
  };

  const varCode = (variety?.name || 'HEMP')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 5)
    .toUpperCase();
  const plotCode = (plot.name || 'LOTE')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  const dateCompact = resolvedHarvestDate.replace(/-/g, '');
  const batchCode = `COS-${prefixMap[materialType]}-${varCode}-${plotCode}-${dateCompact}`;

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cos-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return {
    id,
    varietyId: plot.varietyId,
    supplierId: variety?.supplierId,
    batchCode,
    materialType,
    originPlotId: plot.id,
    parentSeedBatchId: resolvedParentSeedBatchId,
    originCampaign: plot.campaign || '2025/2026',
    harvestDate: resolvedHarvestDate,
    purchaseDate: resolvedHarvestDate,
    analysisDate: resolvedHarvestDate,
    initialQuantity: Number(Math.max(0.01, Number(quantityKg || 0)).toFixed(2)),
    remainingQuantity: Number(Math.max(0.01, Number(quantityKg || 0)).toFixed(2)),
    storagePointId: resolvedStoragePointId,
    logisticsResponsible: sanitizePlotInputText(responsibleName, 100),
    sowingResponsibleName: plot.sowingResponsibleName || responsibleName,
    harvestResponsibleName: sanitizePlotInputText(responsibleName, 100),
    isActive: true,
    qaStatus: 'APROBADO_QA',
    qualityGrade: plot.qualityGrade || 'GRADO_A_SUPERIOR',
    qualityScore: 95,
    moisturePct,
    oilContentPct,
    baleCount,
    avgBaleWeightKg,
    rettingQuality,
    hplcThcPct,
    hplcCbgPct,
    hurdGranulometry,
    notes: sanitizePlotInputText(
      notes ||
        `Lote de cosecha (${prefixMap[materialType]}) generado desde parcela ${plot.name} en fecha final de campo ${resolvedHarvestDate}.`,
      400
    ),
    createdAt: new Date().toISOString()
  };
}
