import { User, Location, Plot, Client, Task, StoragePoint, SeedBatch, StructureRole, UserRole } from '../../types';

/**
 * Configuración visual y descriptiva de los roles dentro de cada estructura de campo.
 */
export const STRUCTURE_ROLES_INFO: Record<StructureRole, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
  systemRole: UserRole;
}> = {
  propietario: {
    label: 'Propietario / Titular de Campo',
    shortLabel: 'Propietario',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    description: 'Titular de la explotación. Administración de la estructura, acceso exclusivo a su establecimiento y parcelas.',
    systemRole: 'client'
  },
  encargado: {
    label: 'Encargado General / Capataz',
    shortLabel: 'Capataz',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    description: 'Coordinación diaria de labores de campo, asignación de maquinaria y control de lotes en su establecimiento.',
    systemRole: 'technician'
  },
  agronomo: {
    label: 'Ingeniero Agrónomo / Asesor Técnico',
    shortLabel: 'Ing. Agrónomo',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    description: 'Prescripciones fitosanitarias, monitoreo fenológico, curvas de fertilización y homologación técnica en su establecimiento.',
    systemRole: 'technician'
  },
  operario: {
    label: 'Operario de Maquinaria / Riego',
    shortLabel: 'Operario',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    description: 'Ejecución directa de labores, registro de horas motor, consumo de combustible y aplicación de insumos.',
    systemRole: 'technician'
  },
  monitoreador: {
    label: 'Monitoreador de Ensayos / Plagas',
    shortLabel: 'Monitoreador',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300 dark:border-teal-700',
    description: 'Relevamiento de plagas, malezas, toma de muestras de suelo y recolección de métricas fenológicas.',
    systemRole: 'technician'
  }
};

export const STRUCTURE_ROLES: { value: StructureRole; label: string; description: string }[] = (
  Object.keys(STRUCTURE_ROLES_INFO) as StructureRole[]
).map(key => ({
  value: key,
  label: STRUCTURE_ROLES_INFO[key].label,
  description: STRUCTURE_ROLES_INFO[key].description
}));

/**
 * Determina si el usuario actual es un Administrador o Supervisor de la Cooperativa Central.
 * Los administradores de la cooperativa (sin clientId asignado) son los ÚNICOS con acceso
 * de gestión irrestricto a todas las estructuras, campos y parcelas de la red.
 */
export function isCentralAdminOrSupervisor(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (user.memberType === 'Cooperativa_Central' && !user.clientId) return true;
  return false;
}

/**
 * Determina si un usuario tiene alcance de lectura global (Admin Central o Auditor Externo sin establecimiento fijo).
 */
export function hasGlobalReadScope(user: User | null): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;
  // Los visores/auditores externos sin clientId ni parcelas restringidas (ej. HempIT France) pueden auditar en modo solo lectura
  if (user.role === 'viewer' && !user.clientId && (!user.assignedPlotIds || user.assignedPlotIds.length === 0)) {
    return true;
  }
  return false;
}

/**
 * Determina si el usuario es el propietario o encargado con permisos de gestión de su estructura.
 */
export function canManageStructure(user: User | null, client: Client | null): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;
  if (!client) return false;
  if (user.clientId && user.clientId === client.id) {
    return user.structureRole === 'propietario' || user.structureRole === 'encargado' || user.role === 'client';
  }
  return false;
}

/**
 * Obtiene los IDs de los campos (locations) a los que tiene acceso una estructura/usuario.
 * Regla de negocio estricta de Aislamiento Multi-Establecimiento:
 * - Central Admin / Auditor Global sin clientId: Acceso a todos los campos.
 * - Usuario vinculado a un Establecimiento (`user.clientId`): Acceso EXCLUSIVAMENTE a los campos
 *   cuyo `loc.clientId === user.clientId` o `userStructure.locationId === loc.id`.
 *   PROHIBIDO acceder a campos de otro `clientId` aunque figure nominalmente en listas heredadas.
 */
export function getAllowedLocationIds(
  user: User | null,
  locations: Location[],
  clients: Client[]
): string[] {
  if (!user) return [];
  if (hasGlobalReadScope(user)) {
    return locations.map(l => l.id);
  }

  const userClientId = user.clientId ? String(user.clientId).trim() : '';
  const userStructure = userClientId ? clients.find(c => String(c.id) === userClientId) : undefined;

  return locations
    .filter(loc => {
      const locClientId = loc.clientId ? String(loc.clientId).trim() : '';

      // Si el usuario pertenece a un establecimiento específico (clientId definido):
      // Candado estricto: SOLO puede ver campos de ese mismo clientId
      if (userClientId) {
        if (locClientId === userClientId) return true;
        if (userStructure && userStructure.locationId && String(userStructure.locationId) === String(loc.id)) return true;
        return false;
      }

      // Si el usuario NO tiene clientId pero tampoco es admin/global:
      // Solo accede si su ID está explícitamente en responsibleIds del campo
      if (loc.responsibleIds && loc.responsibleIds.includes(user.id)) return true;
      return false;
    })
    .map(l => l.id);
}

/**
 * Verifica si el usuario puede acceder a una organización/establecimiento (Client).
 */
export function canAccessClient(
  user: User | null,
  client: Client,
  _locations?: Location[]
): boolean {
  if (!user) return false;
  if (hasGlobalReadScope(user)) return true;
  if (user.clientId && String(user.clientId) === String(client.id)) return true;
  if (client.relatedUserId && String(client.relatedUserId) === String(user.id)) return true;
  if (client.teamUserIds && client.teamUserIds.includes(user.id)) return true;
  return false;
}

/**
 * Verifica si el usuario puede acceder a un campo específico (Location).
 */
export function canAccessLocation(
  user: User | null,
  location: Location,
  clients: Client[]
): boolean {
  if (!user || !location) return false;
  if (hasGlobalReadScope(user)) return true;
  const allowed = getAllowedLocationIds(user, [location], clients);
  return allowed.includes(location.id);
}

/**
 * Verifica si el usuario puede acceder a una parcela específica (Plot).
 * Regla de aislamiento estricto:
 * Si el usuario está asociado a un Establecimiento (`user.clientId`), ÚNICAMENTE puede acceder
 * a parcelas emplazadas dentro de los campos (`locations`) de su propio Establecimiento.
 * Nunca puede acceder a parcelas de otros establecimientos/cultivos.
 */
export function canAccessPlot(
  user: User | null,
  plot: Plot,
  locations: Location[],
  clients: Client[]
): boolean {
  if (!user || !plot) return false;
  if (hasGlobalReadScope(user)) return true;

  const allowedLocations = getAllowedLocationIds(user, locations, clients);
  const parentLoc = locations.find(l => String(l.id) === String(plot.locationId));

  // Candado de seguridad multi-tenant: si el usuario tiene clientId, la parcela DEBE pertenecer a un campo de su clientId
  if (user.clientId) {
    if (!allowedLocations.includes(plot.locationId)) {
      return false;
    }
    // Si además el usuario tiene sub-asignación específica de lotes dentro de su campo, respetarla
    if (user.assignedPlotIds && user.assignedPlotIds.length > 0) {
      const assignedInAllowedLoc = user.assignedPlotIds.filter(pid => pid === plot.id);
      if (assignedInAllowedLoc.length > 0) return true;
      // Si es propietario o encargado o técnico del establecimiento, ve todas las parcelas de su establecimiento
      if (user.role === 'client' || user.role === 'technician') return true;
      return false;
    }
    return true;
  }

  // Usuario sin clientId (ej. técnico externo por lote puntual sin estructura asignada)
  if (allowedLocations.includes(plot.locationId)) return true;
  if (user.assignedPlotIds && user.assignedPlotIds.includes(plot.id)) return true;
  if (!parentLoc?.clientId && plot.responsibleIds && plot.responsibleIds.includes(user.id)) return true;

  return false;
}

/**
 * Verifica si el usuario puede acceder a un punto de almacenamiento / galpón (StoragePoint).
 */
export function canAccessStoragePoint(
  user: User | null,
  storagePoint: StoragePoint,
  _locations?: Location[] | Client[],
  _clients?: Client[]
): boolean {
  if (!user || !storagePoint) return false;
  if (hasGlobalReadScope(user)) return true;
  if (user.clientId) {
    return String(storagePoint.clientId || '') === String(user.clientId);
  }
  if (storagePoint.responsibleUserId && String(storagePoint.responsibleUserId) === String(user.id)) {
    return true;
  }
  return false;
}

/**
 * Verifica si el usuario puede acceder a un lote de semillas o cosecha (SeedBatch).
 */
export function canAccessSeedBatch(
  user: User | null,
  batch: SeedBatch,
  storagePoints: StoragePoint[],
  plots: Plot[],
  locations: Location[],
  clients: Client[]
): boolean {
  if (!user || !batch) return false;
  if (hasGlobalReadScope(user)) return true;

  const allowedStorageIds = new Set(
    storagePoints.filter(sp => canAccessStoragePoint(user, sp, locations, clients)).map(sp => sp.id)
  );
  if (batch.storagePointId && allowedStorageIds.has(batch.storagePointId)) {
    return true;
  }

  const allowedPlots = plots.filter(p => canAccessPlot(user, p, locations, clients));
  const allowedPlotIds = new Set(allowedPlots.map(p => p.id));
  const usedSeedBatchIds = new Set(allowedPlots.map(p => p.seedBatchId).filter(Boolean));

  if (batch.originPlotId && allowedPlotIds.has(batch.originPlotId)) {
    return true;
  }
  if (usedSeedBatchIds.has(batch.id)) {
    return true;
  }

  return false;
}

/**
 * Verifica si el usuario puede acceder a una labor agrícola (Task).
 */
export function canAccessTask(
  user: User | null,
  task: Task,
  plots: Plot[],
  locations: Location[],
  clients: Client[]
): boolean {
  if (!user || !task) return false;
  if (hasGlobalReadScope(user)) return true;

  if (!task.plotId) {
    return task.assignedToIds ? task.assignedToIds.includes(user.id) : false;
  }
  const targetPlot = plots.find(p => p.id === task.plotId);
  if (!targetPlot) return false;

  return canAccessPlot(user, targetPlot, locations, clients);
}

/**
 * Devuelve el diagnóstico completo de alcance de datos para un usuario (para auditoría en Equipos & Accesos).
 */
export function getUserAccessAudit(
  user: User,
  locations: Location[],
  plots: Plot[],
  clients: Client[],
  storagePoints: StoragePoint[] = []
) {
  const isGlobal = hasGlobalReadScope(user);
  const linkedClient = user.clientId ? clients.find(c => String(c.id) === String(user.clientId)) : undefined;
  const allowedLocations = locations.filter(l => canAccessLocation(user, l, clients));
  const allowedPlots = plots.filter(p => canAccessPlot(user, p, locations, clients));
  const allowedStorages = storagePoints.filter(sp => canAccessStoragePoint(user, sp, locations, clients));
  const blockedPlotsCount = Math.max(0, plots.length - allowedPlots.length);

  let accessLevelLabel = 'Establecimiento Aislado';
  if (isCentralAdminOrSupervisor(user)) {
    accessLevelLabel = 'Total Red Cooperativa (Admin Central)';
  } else if (isGlobal) {
    accessLevelLabel = 'Auditoría Global (Solo Lectura)';
  } else if (linkedClient) {
    accessLevelLabel = `Exclusivo: ${linkedClient.name}`;
  } else {
    accessLevelLabel = 'Sin Establecimiento Asignado';
  }

  const structureRoleLabel = user.structureRole && STRUCTURE_ROLES_INFO[user.structureRole]
    ? STRUCTURE_ROLES_INFO[user.structureRole].shortLabel
    : user.role === 'super_admin' || user.role === 'admin'
    ? 'Dirección Central'
    : user.role === 'client'
    ? 'Propietario / Titular'
    : user.role === 'technician'
    ? 'Equipo Técnico'
    : 'Auditor Externo';

  return {
    isGlobal,
    isCentralAdmin: isCentralAdminOrSupervisor(user),
    isolationScope: isGlobal ? ('RED_GLOBAL' as const) : ('ESTABLECIMIENTO_AISLADO' as const),
    structureRoleLabel,
    accessLevelLabel,
    linkedClient,
    allowedLocations,
    allowedLocationsCount: allowedLocations.length,
    allowedPlots,
    allowedPlotsCount: allowedPlots.length,
    allowedPlotNames: allowedPlots.map(p => p.name),
    allowedStorages,
    blockedPlotsCount
  };
}
