import {
  Plot,
  Variety,
  User,
  Location,
  Client,
  SeedBatch,
  StoragePoint,
  BiologicalMaterialType,
  HarvestConditioningStage
} from '../../types';
import {
  isCentralAdminOrSupervisor,
  isBlockedOrNonSystemUser,
  isSupplierRestrictedUser
} from '../utils/structurePermissions';
import { canUserEditOrMutatePlot, sanitizePlotInputText } from '../utils/plotManagementUtils';
import { formatDateAr } from '../utils/dateFormat';

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

export interface PlotHarvestProfile {
  harvestTargetCode: 'grain_only' | 'fiber_only' | 'biomass_only' | 'dual_purpose';
  harvestTargetLabel: string;
  harvestTargetBadgeClass: string;
  varietyUsageRaw: string;
  usageCategory: string;
  allowedMaterials: Exclude<BiologicalMaterialType, 'seed'>[];
  allowedMaterialTypes: Exclude<BiologicalMaterialType, 'seed'>[];
  recommendedPrimaryMaterial: Exclude<BiologicalMaterialType, 'seed'>;
  primaryMaterialType: Exclude<BiologicalMaterialType, 'seed'>;
  surfaceHa: number;
  surfaceM2: number;
  surfaceDisplay: string;
  estimatedPlantsCount: number;
  expectedGrainKgHa: number;
  expectedFiberKgHa: number;
  expectedBiomassKgHa: number;
  expectedHurdsKgHa: number;
  expectedGrainKg: number;
  expectedFiberKg: number;
  expectedBiomassKg: number;
  expectedHurdsKg: number;
  expectedPrimaryYieldKg: number;
  expectedTotalBiomassAndGrainKg: number;
}

export interface PlotExpectedVsActualYieldSummary {
  profile: PlotHarvestProfile;
  expectedPrimaryKg: number;
  expectedTotalKg: number;
  totalExpectedKg: number;
  actualGrainKg: number;
  actualFiberKg: number;
  actualBiomassKg: number;
  actualHurdsKg: number;
  actualBatchesTotalKg: number;
  actualDeclaredPlotKg: number;
  actualEffectiveTotalKg: number;
  totalActualKg: number;
  efficiencyPct: number;
  overallEfficiencyPct: number;
  harvestActCode: string;
  barcodeGs1: string;
  outputBatches: SeedBatch[];
  fractions: {
    materialType: Exclude<BiologicalMaterialType, 'seed'>;
    label: string;
    shortLabel: string;
    expectedKgPerHa: number;
    expectedKg: number;
    expectedTotalKg: number;
    actualKg: number;
    actualHarvestedKg: number;
    efficiencyPct: number;
    isPrimaryForVariety: boolean;
  }[];
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

export const HARVEST_MATERIAL_CATALOG: Record<
  Exclude<BiologicalMaterialType, 'seed'>,
  {
    label: string;
    shortLabel: string;
    unitHint: string;
    badgeClass: string;
    ariccameCategory: string;
  }
> = {
  harvested_grain: {
    label: 'Grano Acopiado (Alimenticio / Industrial)',
    shortLabel: 'Grano',
    unitHint: 'Humedad objetivo < 9% · Limpio y zarandeado',
    badgeClass:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    ariccameCategory: 'GRANO INDUSTRIAL NO PSICOACTIVO (LEY 27.669)'
  },
  fiber_bales: {
    label: 'Fardos de Fibra Técnica (Tallo / Enriado)',
    shortLabel: 'Fibra',
    unitHint: 'Enriado en campo · Fardos prensados',
    badgeClass:
      'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    ariccameCategory: 'FIBRA TEXTIL / CELULOSA INDUSTRIAL (LEY 27.669)'
  },
  biomass_cbg: {
    label: 'Flores / Biomasa Fitocannabinoide (CBG / CBD)',
    shortLabel: 'Flores / Biomasa',
    unitHint: 'THC < 1.0% auditado por HPLC (CoA)',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    ariccameCategory: 'SUMIDADES FLORIDAS / BIOMASA INDUSTRIAL THC < 1%'
  },
  hurds: {
    label: 'Cañamiza / Hurds (Núcleo Leñoso)',
    shortLabel: 'Cañamiza',
    unitHint: 'Subproducto de decorticación para bioconstrucción / cama animal',
    badgeClass:
      'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    ariccameCategory: 'CAÑAMIZA / SUBPRODUCTO CELULÓSICO (LEY 27.669)'
  }
};

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
 * Determina el perfil productivo de cosecha heredado de la Parcela y su Variedad Genética:
 * qué se cosecha (Grano, Fibra, Flores/Biomasa o Doble Propósito) y cuáles son los rindes estimados
 * escalados exactamente a la superficie de la parcela.
 */
export function resolvePlotHarvestProfile(
  plot: Plot,
  variety?: Variety | null
): PlotHarvestProfile {
  const rawArea = Math.max(0.0001, Number(plot.surfaceArea || 9));
  const unit = plot.surfaceUnit || 'm2';
  const surfaceHa =
    unit === 'ha'
      ? rawArea
      : unit === 'ac'
      ? rawArea * 0.404686
      : rawArea / 10000;
  const surfaceM2 =
    unit === 'm2'
      ? rawArea
      : unit === 'ac'
      ? rawArea * 4046.86
      : rawArea * 10000;

  const densityPlM2 = Math.max(1, Number(plot.density || 48));
  const estimatedPlantsCount = Math.round(surfaceM2 * densityPlM2);

  const usageRaw = String(variety?.usage || 'Dual').trim();
  const usageLower = usageRaw.toLowerCase();
  const rawExpected =
    (variety as any)?.expectedYieldKgHa ??
    variety?.expectedGrainYieldKgHa ??
    (variety?.expectedFiberYieldTnHa ? Number(variety.expectedFiberYieldTnHa) * 1000 : undefined);
  const baseExpectedKgHa =
    rawExpected && Number(rawExpected) > 0 ? Number(rawExpected) : 1200;

  let harvestTargetCode: PlotHarvestProfile['harvestTargetCode'] = 'dual_purpose';
  let harvestTargetLabel = 'Doble Propósito (Grano + Fibra + Cañamiza)';
  let harvestTargetBadgeClass =
    'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
  let allowedMaterials: Exclude<BiologicalMaterialType, 'seed'>[] = [
    'harvested_grain',
    'fiber_bales',
    'hurds',
    'biomass_cbg'
  ];
  let recommendedPrimaryMaterial: Exclude<BiologicalMaterialType, 'seed'> = 'harvested_grain';

  let expectedGrainKgHa = 1100;
  let expectedFiberKgHa = 2400;
  let expectedBiomassKgHa = 650;
  let expectedHurdsKgHa = 3200;

  if (usageLower.includes('grano') || usageLower.includes('semilla')) {
    harvestTargetCode = 'grain_only';
    harvestTargetLabel = 'Cosecha de Grano / Semilla Industrial';
    harvestTargetBadgeClass =
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    allowedMaterials = ['harvested_grain', 'fiber_bales', 'biomass_cbg', 'hurds'];
    recommendedPrimaryMaterial = 'harvested_grain';
    expectedGrainKgHa = baseExpectedKgHa;
    expectedFiberKgHa = Math.round(baseExpectedKgHa * 1.4);
    expectedBiomassKgHa = Math.round(baseExpectedKgHa * 0.45);
    expectedHurdsKgHa = Math.round(baseExpectedKgHa * 1.8);
  } else if (usageLower.includes('fibra')) {
    harvestTargetCode = 'fiber_only';
    harvestTargetLabel = 'Cosecha de Fibra Textil & Cañamiza';
    harvestTargetBadgeClass =
      'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    allowedMaterials = ['fiber_bales', 'hurds', 'harvested_grain', 'biomass_cbg'];
    recommendedPrimaryMaterial = 'fiber_bales';
    expectedFiberKgHa = Math.max(2200, baseExpectedKgHa);
    expectedGrainKgHa = Math.round(baseExpectedKgHa * 0.55);
    expectedHurdsKgHa = Math.round(expectedFiberKgHa * 1.45);
    expectedBiomassKgHa = Math.round(baseExpectedKgHa * 0.35);
  } else if (
    usageLower.includes('biomasa') ||
    usageLower.includes('medicinal') ||
    usageLower.includes('flor') ||
    usageLower.includes('cbg') ||
    usageLower.includes('cbd')
  ) {
    harvestTargetCode = 'biomass_only';
    harvestTargetLabel = 'Cosecha de Flores / Biomasa Fitocannabinoide';
    harvestTargetBadgeClass =
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    allowedMaterials = ['biomass_cbg', 'harvested_grain', 'fiber_bales', 'hurds'];
    recommendedPrimaryMaterial = 'biomass_cbg';
    expectedBiomassKgHa = baseExpectedKgHa;
    expectedGrainKgHa = Math.round(baseExpectedKgHa * 0.4);
    expectedFiberKgHa = Math.round(baseExpectedKgHa * 0.9);
    expectedHurdsKgHa = Math.round(baseExpectedKgHa * 1.1);
  } else {
    // Dual / Doble Propósito (ej. Futura 75, Felina 32, USO 31)
    harvestTargetCode = 'dual_purpose';
    harvestTargetLabel = 'Doble Propósito (Grano + Fibra + Biomasa)';
    harvestTargetBadgeClass =
      'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
    allowedMaterials = ['harvested_grain', 'fiber_bales', 'biomass_cbg', 'hurds'];
    recommendedPrimaryMaterial = 'harvested_grain';
    expectedGrainKgHa = baseExpectedKgHa;
    expectedFiberKgHa = Math.round(baseExpectedKgHa * 2.1);
    expectedBiomassKgHa = Math.round(baseExpectedKgHa * 0.55);
    expectedHurdsKgHa = Math.round(baseExpectedKgHa * 2.6);
  }

  // Escalar exactamente a la superficie de la parcela (con precisión de 2 decimales para microparcelas y lotes extensivos)
  const scaleToPlot = (kgHa: number) => Number(Math.max(0.25, kgHa * surfaceHa).toFixed(2));

  const expectedGrainKg = scaleToPlot(expectedGrainKgHa);
  const expectedFiberKg = scaleToPlot(expectedFiberKgHa);
  const expectedBiomassKg = scaleToPlot(expectedBiomassKgHa);
  const expectedHurdsKg = scaleToPlot(expectedHurdsKgHa);

  const expectedPrimaryYieldKg =
    recommendedPrimaryMaterial === 'fiber_bales'
      ? expectedFiberKg
      : recommendedPrimaryMaterial === 'biomass_cbg'
      ? expectedBiomassKg
      : expectedGrainKg;

  const expectedTotalBiomassAndGrainKg = Number(
    (expectedGrainKg + expectedFiberKg + expectedBiomassKg).toFixed(2)
  );

  const surfaceDisplay =
    unit === 'm2'
      ? `${rawArea} m² (${surfaceHa.toFixed(4)} ha)`
      : `${rawArea} ${unit} (${Math.round(surfaceM2).toLocaleString('es-AR')} m²)`;

  return {
    harvestTargetCode,
    harvestTargetLabel,
    harvestTargetBadgeClass,
    varietyUsageRaw: usageRaw,
    usageCategory: usageRaw,
    allowedMaterials,
    allowedMaterialTypes: allowedMaterials,
    recommendedPrimaryMaterial,
    primaryMaterialType: recommendedPrimaryMaterial,
    surfaceHa,
    surfaceM2,
    surfaceDisplay,
    estimatedPlantsCount,
    expectedGrainKgHa,
    expectedFiberKgHa,
    expectedBiomassKgHa,
    expectedHurdsKgHa,
    expectedGrainKg,
    expectedFiberKg,
    expectedBiomassKg,
    expectedHurdsKg,
    expectedPrimaryYieldKg,
    expectedTotalBiomassAndGrainKg
  };
}

/**
 * Calcula el balance comparativo entre Rinde Estimado Agronómico y Rinde Real Obtenido
 * para una parcela y sus lotes de cosecha asociados.
 */
export function calculatePlotExpectedVsActualYield(
  plot: Plot,
  variety?: Variety | null,
  allSeedBatches: SeedBatch[] = []
): PlotExpectedVsActualYieldSummary {
  const profile = resolvePlotHarvestProfile(plot, variety);
  const outputBatches = (allSeedBatches || []).filter(
    b =>
      b.materialType &&
      b.materialType !== 'seed' &&
      (String(b.originPlotId || '') === String(plot.id) ||
        (plot.outputSeedBatchIds || []).includes(b.id))
  );

  const sumByMaterial = (mat: Exclude<BiologicalMaterialType, 'seed'>) =>
    Number(
      outputBatches
        .filter(b => b.materialType === mat)
        .reduce((acc, b) => acc + Number(b.initialQuantity || b.remainingQuantity || 0), 0)
        .toFixed(2)
    );

  let actualGrainKg = sumByMaterial('harvested_grain');
  let actualFiberKg = sumByMaterial('fiber_bales');
  let actualBiomassKg = sumByMaterial('biomass_cbg');
  const actualHurdsKg = sumByMaterial('hurds');

  const actualBatchesTotalKg = Number(
    (actualGrainKg + actualFiberKg + actualBiomassKg + actualHurdsKg).toFixed(2)
  );
  const actualDeclaredPlotKg = Number(
    Number(plot.actualHarvestYieldKg || plot.harvestYieldKg || 0).toFixed(2)
  );

  // Si el productor registró rinde directo en la parcela pero aún no fraccionó en lotes de almacén,
  // asignarlo a la fracción principal recomendada para reflejarlo en las gráficas
  if (actualBatchesTotalKg === 0 && actualDeclaredPlotKg > 0) {
    if (profile.recommendedPrimaryMaterial === 'fiber_bales') {
      actualFiberKg = actualDeclaredPlotKg;
    } else if (profile.recommendedPrimaryMaterial === 'biomass_cbg') {
      actualBiomassKg = actualDeclaredPlotKg;
    } else {
      actualGrainKg = actualDeclaredPlotKg;
    }
  }

  const actualEffectiveTotalKg = Number(
    Math.max(actualBatchesTotalKg, actualDeclaredPlotKg).toFixed(2)
  );

  const expectedPrimaryKg = profile.expectedPrimaryYieldKg;
  const expectedTotalKg =
    profile.harvestTargetCode === 'dual_purpose'
      ? Number((profile.expectedGrainKg + profile.expectedFiberKg).toFixed(2))
      : expectedPrimaryKg;

  const efficiencyPct =
    expectedPrimaryKg > 0
      ? Math.min(200, Math.round((actualEffectiveTotalKg / expectedPrimaryKg) * 100))
      : 0;

  const campCompact = (plot.campaign || '2025/2026').replace(/[^0-9]/g, '').slice(0, 4) || '2526';
  const harvestActCode =
    plot.closureActCode ||
    `ACTA-COSECHA-${campCompact}-${plot.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()}`;
  const barcodeGs1 =
    plot.closureBarcode ||
    `7798394${plot.id.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6)}2026`;

  const fractions: PlotExpectedVsActualYieldSummary['fractions'] = [
    {
      materialType: 'harvested_grain',
      label: HARVEST_MATERIAL_CATALOG.harvested_grain.label,
      shortLabel: 'Grano',
      expectedKgPerHa: profile.expectedGrainKgHa,
      expectedKg: profile.expectedGrainKg,
      expectedTotalKg: profile.expectedGrainKg,
      actualKg: actualGrainKg,
      actualHarvestedKg: actualGrainKg,
      efficiencyPct:
        profile.expectedGrainKg > 0
          ? Math.round((actualGrainKg / profile.expectedGrainKg) * 100)
          : 0,
      isPrimaryForVariety:
        profile.harvestTargetCode === 'grain_only' || profile.harvestTargetCode === 'dual_purpose'
    },
    {
      materialType: 'fiber_bales',
      label: HARVEST_MATERIAL_CATALOG.fiber_bales.label,
      shortLabel: 'Fibra Técnica',
      expectedKgPerHa: profile.expectedFiberKgHa,
      expectedKg: profile.expectedFiberKg,
      expectedTotalKg: profile.expectedFiberKg,
      actualKg: actualFiberKg,
      actualHarvestedKg: actualFiberKg,
      efficiencyPct:
        profile.expectedFiberKg > 0
          ? Math.round((actualFiberKg / profile.expectedFiberKg) * 100)
          : 0,
      isPrimaryForVariety:
        profile.harvestTargetCode === 'fiber_only' || profile.harvestTargetCode === 'dual_purpose'
    },
    {
      materialType: 'biomass_cbg',
      label: HARVEST_MATERIAL_CATALOG.biomass_cbg.label,
      shortLabel: 'Flores / Biomasa',
      expectedKgPerHa: profile.expectedBiomassKgHa,
      expectedKg: profile.expectedBiomassKg,
      expectedTotalKg: profile.expectedBiomassKg,
      actualKg: actualBiomassKg,
      actualHarvestedKg: actualBiomassKg,
      efficiencyPct:
        profile.expectedBiomassKg > 0
          ? Math.round((actualBiomassKg / profile.expectedBiomassKg) * 100)
          : 0,
      isPrimaryForVariety: profile.harvestTargetCode === 'biomass_only'
    },
    {
      materialType: 'hurds',
      label: HARVEST_MATERIAL_CATALOG.hurds.label,
      shortLabel: 'Cañamiza / Hurds',
      expectedKgPerHa: profile.expectedHurdsKgHa,
      expectedKg: profile.expectedHurdsKg,
      expectedTotalKg: profile.expectedHurdsKg,
      actualKg: actualHurdsKg,
      actualHarvestedKg: actualHurdsKg,
      efficiencyPct:
        profile.expectedHurdsKg > 0
          ? Math.round((actualHurdsKg / profile.expectedHurdsKg) * 100)
          : 0,
      isPrimaryForVariety: false
    }
  ];

  return {
    profile,
    expectedPrimaryKg,
    expectedTotalKg,
    totalExpectedKg: expectedPrimaryKg,
    actualGrainKg,
    actualFiberKg,
    actualBiomassKg,
    actualHurdsKg,
    actualBatchesTotalKg,
    actualDeclaredPlotKg,
    actualEffectiveTotalKg,
    totalActualKg: actualEffectiveTotalKg,
    efficiencyPct,
    overallEfficiencyPct: efficiencyPct,
    harvestActCode,
    barcodeGs1,
    outputBatches,
    fractions
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

/**
 * Imprime / descarga en PDF formato A4 el Acta Oficial de Cosecha o la Declaración Jurada ARICCAME (Ley 27.669).
 */
export function printHarvestOfficialDocumentPDF(params: {
  mode: 'harvest_act' | 'ariccame_affidavit';
  plot: Plot;
  variety?: Variety;
  location?: Location;
  client?: Client;
  parentSeedBatch?: SeedBatch;
  seedBatch?: SeedBatch;
  storagePoint?: StoragePoint;
  allSeedBatches?: SeedBatch[];
  harvestedBatches?: SeedBatch[];
  yieldSummary?: PlotExpectedVsActualYieldSummary;
  scheduleMetrics?: PlotHarvestScheduleMetrics;
  issuerName?: string;
}) {
  if (typeof document === 'undefined') return;
  const {
    mode,
    plot,
    variety,
    location,
    client,
    parentSeedBatch: rawParentSeedBatch,
    seedBatch,
    storagePoint,
    allSeedBatches = [],
    harvestedBatches = [],
    yieldSummary: passedYieldSummary,
    scheduleMetrics: passedScheduleMetrics,
    issuerName = plot.harvestOperator || plot.sowingResponsibleName || 'Responsable de Cosecha'
  } = params;

  const parentSeedBatch = rawParentSeedBatch || seedBatch;
  const combinedBatches = allSeedBatches.length > 0 ? allSeedBatches : harvestedBatches;
  const dates = passedScheduleMetrics || calculatePlotHarvestDates(plot, variety);
  const yieldSummary =
    passedYieldSummary || calculatePlotExpectedVsActualYield(plot, variety, combinedBatches);
  const issueDateAr = formatDateAr(new Date().toISOString().split('T')[0]);
  const traceUrl = `${window.location.origin}/#/trace/${plot.id}`;

  const docTitle =
    mode === 'ariccame_affidavit'
      ? `DDJJ_ARICCAME_Cosecha_Custodia_${plot.name.replace(/\s+/g, '_')}`
      : `Acta_Oficial_Cosecha_${plot.name.replace(/\s+/g, '_')}`;

  const fractionsRowsHtml = yieldSummary.fractions
    .filter(f => f.isPrimaryForVariety || f.actualKg > 0)
    .map(
      f => `
        <tr>
          <td><strong>${f.label}</strong></td>
          <td class="num">${f.expectedKg.toFixed(2)} kg</td>
          <td class="num"><strong>${f.actualKg.toFixed(2)} kg</strong> (${Math.round(f.actualKg * 1000).toLocaleString('es-AR')} gr)</td>
          <td class="num">${f.efficiencyPct}%</td>
        </tr>
      `
    )
    .join('');

  const batchesRowsHtml =
    yieldSummary.outputBatches.length > 0
      ? yieldSummary.outputBatches
          .map(
            b => `
          <tr>
            <td><strong>${b.batchCode}</strong></td>
            <td>${HARVEST_MATERIAL_CATALOG[(b.materialType as Exclude<BiologicalMaterialType, 'seed'>) || 'harvested_grain']?.shortLabel || b.materialType}</td>
            <td>${formatDateAr(b.harvestDate || dates.producerFinalHarvestDate)}</td>
            <td class="num"><strong>${Number(b.initialQuantity || 0).toFixed(2)} kg</strong></td>
            <td>${b.moisturePct ? `Hum: ${b.moisturePct}%` : ''} ${b.rettingQuality ? `· Enriado: ${b.rettingQuality}` : ''}</td>
          </tr>
        `
          )
          .join('')
      : `<tr><td colspan="5" style="text-align:center;color:#64748b;">Rinde consolidado en parcela (${yieldSummary.actualEffectiveTotalKg.toFixed(2)} kg) · Pendiente de fraccionamiento en bolsas/fardos individuales.</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>${docTitle}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { font-family: 'Courier New', Courier, monospace; color: #0f172a; margin: 0; padding: 14px; font-size: 11px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 12px; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .title { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 4px 0 2px 0; }
        .box-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
        .box-title { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #047857; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
        h3 { font-size: 11px; text-transform: uppercase; margin: 12px 0 6px 0; color: #065f46; border-left: 3px solid #059669; padding-left: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
        th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 8.5px; padding: 6px 8px; text-align: left; }
        th.num, td.num { text-align: right; }
        td { padding: 6px 8px; border-bottom: 1px solid #cbd5e1; }
        .legal-box { border: 2px solid #0f172a; background: #fefce8; padding: 10px; border-radius: 6px; font-size: 9.5px; margin-top: 10px; }
        .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 32px; page-break-inside: avoid; }
        .sig { border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 9px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <span class="badge">${
            mode === 'ariccame_affidavit'
              ? 'DECLARACIÓN JURADA DE ORIGEN Y CUSTODIA PRIMARIA · ARICCAME LEY 27.669'
              : 'ACTA OFICIAL DE COSECHA Y TRAZABILIDAD DE CAMPO · INASE / ARICCAME'
          }</span>
          <div class="title">${
            mode === 'ariccame_affidavit'
              ? 'Declaración Jurada Post-Cosecha y Custodia Física ARICCAME'
              : `Acta Oficial de Cosecha — ${yieldSummary.harvestActCode}`
          }</div>
          <div>Cooperativa de Trabajo PatagonianC LTDA · CUIT 30-71816113-0 · HempC Nucleus Trace</div>
        </div>
        <div style="text-align:right;font-size:9.5px;">
          <div><strong>Emisión:</strong> ${issueDateAr}</div>
          <div><strong>Acta N°:</strong> ${yieldSummary.harvestActCode}</div>
          <div><strong>Código GS1:</strong> ${yieldSummary.barcodeGs1}</div>
          <div><strong>Campaña:</strong> ${plot.campaign || '2025/2026'}</div>
        </div>
      </div>

      <div class="box-grid">
        <div class="box">
          <div class="box-title">1. Establecimiento Productivo y Parcela Georreferenciada</div>
          <div><strong>Organización / Socio:</strong> ${client?.name || location?.ownerName || 'Red Cooperativa HempC'}</div>
          <div><strong>Predio / Sitio:</strong> ${location?.name || 'Establecimiento Habilitado'} (${location?.city || ''}, ${location?.province || ''})</div>
          <div><strong>Unidad Productiva:</strong> ${plot.name} (${yieldSummary.profile.surfaceDisplay})</div>
          <div><strong>Coordenadas GPS (WGS84):</strong> ${plot.coordinates ? `${plot.coordinates.lat.toFixed(6)}, ${plot.coordinates.lng.toFixed(6)}` : 'Georreferenciado en Red'}</div>
          <div><strong>Población Implantada:</strong> ~${yieldSummary.profile.estimatedPlantsCount.toLocaleString('es-AR')} plantas (${plot.density || 48} pl/m²)</div>
        </div>

        <div class="box">
          <div class="box-title">2. Semilla Fiscalizada INASE y Destino de Cosecha</div>
          <div><strong>Genética / Cultivar:</strong> ${variety?.name || 'Certificada INASE'} (RNC: ${variety?.inaseRncNumber || 'Homologado'})</div>
          <div><strong>Destino Productivo Heredado:</strong> ${yieldSummary.profile.harvestTargetLabel}</div>
          <div><strong>Lote Madre Semilla INASE:</strong> ${parentSeedBatch?.batchCode || parentSeedBatch?.certificationNumber || 'Fiscalizado INASE'}</div>
          <div><strong>Rótulo Oficial INASE:</strong> ${parentSeedBatch?.labelSerialNumber || 'Serie Oficial'}</div>
          <div><strong>Almacén de Custodia Post-Cosecha:</strong> ${storagePoint?.name || 'Depósito de Establecimiento'}</div>
        </div>
      </div>

      <h3>3. Auditoría de Doble Variable de Fecha de Cosecha (Ciclo Genético vs. Campo)</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha de Siembra</th>
            <th>Variable 1 · Estimada por Ciclo Genético (${dates.nominalCycleDays} días)</th>
            <th>Variable 2 · Fecha Final Productor en Campo</th>
            <th>Diferencial de Ciclo (Δ)</th>
            <th>Estado del Acta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${formatDateAr(dates.sowingDate)}</strong></td>
            <td>${formatDateAr(dates.geneticEstimatedHarvestDate)} (Ciclo Teórico)</td>
            <td><strong>${formatDateAr(dates.producerFinalHarvestDate)}</strong> (${dates.actualCycleDays} días reales)</td>
            <td><strong>${dates.deltaLabel}</strong></td>
            <td>${dates.isLockedFinalAct ? 'ACTA CONFIRMADA Y SELLADA' : 'EN OPERACIÓN DE CAMPO'}</td>
          </tr>
        </tbody>
      </table>

      <h3>4. Balance de Rinde Estimado (Potencial Genético) vs. Rinde Real Cosechado</h3>
      <table>
        <thead>
          <tr>
            <th>Fracción Productiva Cosechada</th>
            <th class="num">Rinde Estimado Parcela</th>
            <th class="num">Rinde Real Obtenido</th>
            <th class="num">Eficiencia (%)</th>
          </tr>
        </thead>
        <tbody>
          ${fractionsRowsHtml}
        </tbody>
      </table>

      <h3>5. Lotes de Cosecha Obtenidos e Ingresados a Custodia (Etiquetados con QR + GS1)</h3>
      <table>
        <thead>
          <tr>
            <th>Código de Lote Cosechado</th>
            <th>Categoría</th>
            <th>Fecha Cosecha</th>
            <th class="num">Peso Neto Custodia</th>
            <th>Parámetros Técnicos (Humedad / Enriado)</th>
          </tr>
        </thead>
        <tbody>
          ${batchesRowsHtml}
        </tbody>
      </table>

      <div class="legal-box">
        <strong>DECLARACIÓN REGULATORIA LEY 27.669 (ARICCAME / INASE / SENASA):</strong><br/>
        El material vegetal detallado en el presente documento proviene exclusivamente de cultivo de <strong>Cáñamo Industrial No Psicoactivo (Cannabis sativa L. con THC &lt; 1,0%)</strong> implantado con semilla fiscalizada INASE bajo Licencia Agrícola ARICCAME <strong>EX-2024-134354227--APN-ARICCAME#MEC</strong> y Licencia Industrial <strong>EX-2025-119427833--APN-ARICCAME#MEC</strong>.<br/>
        <strong>URL de Verificación Pública QR:</strong> ${traceUrl}
      </div>

      <div class="signatures">
        <div class="sig">
          <strong>${plot.harvestOperator || plot.sowingResponsibleName || client?.contactName || 'Productor Titular'}</strong><br/>
          Productor / Responsable de Cosecha en Campo<br/>
          ${client?.name || location?.name || ''}
        </div>
        <div class="sig">
          <strong>${plot.technicalResponsibleName || 'Ing. Agr. Julian PIZARRO'}</strong><br/>
          Dirección Técnica Agronómica (MP-AGRO-1492 CH)<br/>
          Certificación Fitosanitaria y Rinde
        </div>
        <div class="sig">
          <strong>${issuerName || 'Gastón BAREA M.'}</strong><br/>
          Dirección de Trazabilidad & Custodia ARICCAME<br/>
          Cooperativa PatagonianC LTDA (HempC)
        </div>
      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 2000);
    }, 350);
  }
}
