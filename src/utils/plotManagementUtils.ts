import {
  Plot,
  Location,
  Variety,
  SeedBatch,
  Project,
  Client,
  Task,
  TrialRecord,
  AgrochemicalApplication,
  User
} from '../../types';
import { canAccessLocation, canAccessPlot } from './structurePermissions';
import { convertSeedMassToKg } from './seedTraceability';
import { isEventOnlyAttendee } from '../services/eventsManagementService';

/**
 * Sanitiza entradas de texto de parcelas para prevenir inyecciones XSS o etiquetas HTML maliciosas.
 */
export function sanitizePlotInputText(value: string | undefined | null, maxLength = 300): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Evalúa de forma estricta si un usuario tiene permisos para crear, editar o eliminar una parcela,
 * previniendo escalación de privilegios o acceso vía parámetros URL (?editPlotId=...).
 */
export function canUserEditOrMutatePlot(
  user: User | null | undefined,
  plot: Plot | null | undefined,
  locations: Location[],
  clients: Client[],
  targetLocationId?: string
): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  if (isEventOnlyAttendee(user) || user.accessScope === 'event_attendee') {
    return { allowed: false, reason: 'event_attendee_forbidden' };
  }

  if (user.accountStatus === 'pending_approval' || user.accountStatus === 'rejected') {
    return { allowed: false, reason: 'account_not_active' };
  }

  if (user.role === 'viewer') {
    return { allowed: false, reason: 'viewer_read_only' };
  }

  if (user.role === 'super_admin' || user.role === 'admin') {
    return { allowed: true };
  }

  if (user.role === 'client' || user.role === 'technician') {
    if (plot && !canAccessPlot(user, plot, locations, clients)) {
      return { allowed: false, reason: 'plot_outside_assigned_structure' };
    }
    const locIdToCheck = targetLocationId || plot?.locationId;
    if (locIdToCheck) {
      const targetLoc = locations.find(l => l.id === locIdToCheck);
      if (targetLoc && !canAccessLocation(user, targetLoc, clients)) {
        return { allowed: false, reason: 'location_outside_assigned_structure' };
      }
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'unauthorized_role' };
}

/**
 * Calcula el ajuste diferencial de stock de semilla INASE al crear o editar una parcela,
 * evitando descontar dos veces cuando se edita una parcela que ya tenía semilla asignada.
 */
export function computeDifferentialSeedStockAdjustment(params: {
  editingPlot?: Plot | null;
  nextSeedBatchId?: string;
  nextUsedKg: number;
  seedBatches: SeedBatch[];
}): {
  isValid: boolean;
  error?: string;
  availablePoolKg: number;
  deltaSelectedBatchKg: number;
  newSelectedBatchRemainingKg?: number;
  restoredOldBatchRemainingKg?: number;
  oldBatchId?: string;
} {
  const { editingPlot, nextSeedBatchId, nextUsedKg, seedBatches } = params;
  const usage = Math.max(0, Number(nextUsedKg || 0));
  const selectedBatch = nextSeedBatchId ? seedBatches.find(b => b.id === nextSeedBatchId) : undefined;
  const oldBatch = editingPlot?.seedBatchId
    ? seedBatches.find(b => b.id === editingPlot.seedBatchId)
    : undefined;

  const oldUsageKg = editingPlot
    ? convertSeedMassToKg(
        editingPlot.usedSeedValue !== undefined ? editingPlot.usedSeedValue : editingPlot.usedSeedQuantity,
        editingPlot.usedSeedValue !== undefined ? (editingPlot.usedSeedUnit || 'kg') : 'kg'
      )
    : 0;

  const isSameBatch = Boolean(
    editingPlot && editingPlot.seedBatchId && editingPlot.seedBatchId === nextSeedBatchId
  );

  if (!selectedBatch) {
    return {
      isValid: true,
      availablePoolKg: 0,
      deltaSelectedBatchKg: 0,
      oldBatchId: oldBatch?.id,
      restoredOldBatchRemainingKg:
        oldBatch && oldUsageKg > 0
          ? Math.round((Number(oldBatch.remainingQuantity || 0) + oldUsageKg) * 1000) / 1000
          : undefined
    };
  }

  const currentStock = Number(selectedBatch.remainingQuantity || 0);
  const availablePoolKg = isSameBatch ? currentStock + oldUsageKg : currentStock;
  const requiredAdditionalStock = isSameBatch ? usage - oldUsageKg : usage;
  const epsilon = 0.0001;

  if (requiredAdditionalStock > currentStock + epsilon) {
    return {
      isValid: false,
      error: `Stock insuficiente en el lote ${selectedBatch.batchCode}: disponible ${availablePoolKg.toFixed(3)} kg (${Math.round(availablePoolKg * 1000)} gr) y se requieren ${usage.toFixed(3)} kg (${Math.round(usage * 1000)} gr).`,
      availablePoolKg,
      deltaSelectedBatchKg: requiredAdditionalStock
    };
  }

  const newSelectedBatchRemainingKg = Math.max(
    0,
    Math.round((currentStock - requiredAdditionalStock) * 1000) / 1000
  );

  const restoredOldBatchRemainingKg =
    !isSameBatch && oldBatch && oldUsageKg > 0
      ? Math.round((Number(oldBatch.remainingQuantity || 0) + oldUsageKg) * 1000) / 1000
      : undefined;

  return {
    isValid: true,
    availablePoolKg,
    deltaSelectedBatchKg: requiredAdditionalStock,
    newSelectedBatchRemainingKg,
    restoredOldBatchRemainingKg,
    oldBatchId: !isSameBatch ? oldBatch?.id : undefined
  };
}

/**
 * Genera un polígono geodésico rectangular de 4 vértices WGS84 centrado en (centerLat, centerLng)
 * cuya superficie coincide exactamente con el área declarada (m², ha o ac).
 */
export function generateGeodesicPolygonFromSurface(
  centerLat: number,
  centerLng: number,
  surfaceArea: number,
  surfaceUnit: 'm2' | 'ha' | 'ac' = 'm2'
): {
  polygon: { lat: number; lng: number }[];
  perimeterM: number;
  areaM2: number;
  areaHa: number;
} {
  const safeArea = Math.max(1, Number(surfaceArea || 9));
  const areaM2 =
    surfaceUnit === 'ha'
      ? safeArea * 10000
      : surfaceUnit === 'ac'
      ? safeArea * 4046.86
      : safeArea;

  // Proporción horizontal 4:3 para lotes medianos/grandes o cuadrado 1:1 para microparcelas <= 25 m²
  const aspect = areaM2 <= 25 ? 1 : 4 / 3;
  const widthM = Math.sqrt(areaM2 * aspect);
  const heightM = areaM2 / widthM;

  const metersPerDegLat = 111320;
  const metersPerDegLng = Math.max(10000, 111320 * Math.cos((centerLat * Math.PI) / 180));

  const dLat = heightM / 2 / metersPerDegLat;
  const dLng = widthM / 2 / metersPerDegLng;

  const polygon = [
    { lat: Number((centerLat + dLat).toFixed(6)), lng: Number((centerLng - dLng).toFixed(6)) },
    { lat: Number((centerLat + dLat).toFixed(6)), lng: Number((centerLng + dLng).toFixed(6)) },
    { lat: Number((centerLat - dLat).toFixed(6)), lng: Number((centerLng + dLng).toFixed(6)) },
    { lat: Number((centerLat - dLat).toFixed(6)), lng: Number((centerLng - dLng).toFixed(6)) }
  ];

  const perimeterM = Number((2 * (widthM + heightM)).toFixed(1));
  const areaHa = Number((areaM2 / 10000).toFixed(4));

  return {
    polygon,
    perimeterM,
    areaM2: Number(areaM2.toFixed(2)),
    areaHa
  };
}

/**
 * Evalúa la salud e integridad relacional de una parcela respecto al resto de las entidades del sistema.
 */
export function evaluatePlotRelationalHealth(
  plot: Partial<Plot>,
  context: {
    locations: Location[];
    varieties: Variety[];
    seedBatches: SeedBatch[];
    projects: Project[];
    clients: Client[];
    tasks?: Task[];
    trialRecords?: TrialRecord[];
    agroApps?: AgrochemicalApplication[];
  }
) {
  const parentLocation = context.locations.find(l => l.id === plot.locationId);
  const parentClient = parentLocation?.clientId
    ? context.clients.find(c => c.id === parentLocation.clientId)
    : undefined;
  const variety = context.varieties.find(v => v.id === plot.varietyId);
  const seedBatch =
    context.seedBatches.find(b => b.id === plot.seedBatchId) ||
    context.seedBatches.find(
      b => b.varietyId === plot.varietyId && (!b.materialType || b.materialType === 'seed')
    );
  const project =
    context.projects.find(p => p.id === plot.projectId) ||
    (parentLocation?.projectId ? context.projects.find(p => p.id === parentLocation.projectId) : undefined) ||
    context.projects[0];

  const linkedTasks = (context.tasks || []).filter(t => plot.id && t.plotId === plot.id);
  const linkedRecords = (context.trialRecords || []).filter(r => plot.id && r.plotId === plot.id);
  const linkedAgroApps = (context.agroApps || []).filter(a => plot.id && a.plotId === plot.id);

  const rawArea = Number(plot.surfaceArea || 0);
  const areaM2 =
    plot.surfaceUnit === 'ha'
      ? rawArea * 10000
      : plot.surfaceUnit === 'ac'
      ? rawArea * 4046.86
      : rawArea;
  const areaHa = areaM2 / 10000;
  const density = Number(plot.density || 48);
  const estimatedPlantsCount = Math.round(areaM2 * density);

  const hasValidGeodesicPolygon = Boolean(plot.polygon && plot.polygon.length >= 3);
  const hasValidCoordinates = Boolean(
    (plot.coordinates && !isNaN(plot.coordinates.lat) && plot.coordinates.lat !== 0) ||
      hasValidGeodesicPolygon ||
      (parentLocation?.coordinates && !isNaN(parentLocation.coordinates.lat))
  );

  return {
    parentLocation,
    parentClient,
    variety,
    seedBatch,
    project,
    linkedTasksCount: linkedTasks.length,
    linkedRecordsCount: linkedRecords.length,
    linkedAgroAppsCount: linkedAgroApps.length,
    areaM2,
    areaHa,
    estimatedPlantsCount,
    hasValidGeodesicPolygon,
    hasValidCoordinates,
    isFullyLinked: Boolean(parentLocation && variety && hasValidCoordinates)
  };
}
