import {
  User, Location, Plot, Client, Task, StoragePoint, SeedBatch,
  StructureRole, UserRole, Supplier, Variety, SupplierActorRole
} from '../../types';
import { DEMO_VARIETIES, DEMO_SEED_BATCHES, DEMO_SUPPLIERS, DEMO_PLOTS } from '../data/initialDemoData';

/**
 * Configuración visual y descriptiva de los roles dentro de cada estructura de campo (Socios de la Red).
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
 * Configuración visual y descriptiva de los Actores Humanos dentro de un Proveedor / Semillero Homologado.
 */
export const SUPPLIER_ACTOR_ROLES_INFO: Record<SupplierActorRole, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
  defaultSystemRole: UserRole;
}> = {
  director_tecnico_obtentor: {
    label: 'Director Técnico / Obtentor (Ing. Agrónomo)',
    shortLabel: 'Director Técnico / Obtentor',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    description: 'Seguimiento fitotécnico y fenológico exclusivo de las parcelas implantadas con sus semillas/insumos y emisión de recomendaciones.',
    defaultSystemRole: 'viewer'
  },
  responsable_comercial: {
    label: 'Responsable Comercial / Representante Legal',
    shortLabel: 'Resp. Comercial',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    description: 'Representante oficial de la firma proveedora, convenios de provisión, garantías de reposición y estado de lotes.',
    defaultSystemRole: 'viewer'
  },
  responsable_logistica: {
    label: 'Responsable de Logística, Remitos & Despacho',
    shortLabel: 'Logística & Despacho',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-700',
    description: 'Coordinación de envíos, carga de guías ARICCAME / remitos INASE, patente/chofer y seguimiento de recepción en almacenes.',
    defaultSystemRole: 'viewer'
  },
  responsable_calidad_ista: {
    label: 'Responsable de Calidad / Laboratorio ISTA-SENASA',
    shortLabel: 'Calidad & Laboratorio',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    description: 'Auditoría de Poder Germinativo (PG %), pureza físico-botánica, actas de inspección de lotes y certificados QR.',
    defaultSystemRole: 'viewer'
  }
};

export const SUPPLIER_ACTOR_ROLES: { value: SupplierActorRole; label: string; shortLabel: string; description: string }[] = (
  Object.keys(SUPPLIER_ACTOR_ROLES_INFO) as SupplierActorRole[]
).map(key => ({
  value: key,
  label: SUPPLIER_ACTOR_ROLES_INFO[key].label,
  shortLabel: SUPPLIER_ACTOR_ROLES_INFO[key].shortLabel,
  description: SUPPLIER_ACTOR_ROLES_INFO[key].description
}));

/**
 * Determina si el usuario actual es un Administrador o Supervisor de la Cooperativa Central.
 * Los administradores de la cooperativa (sin clientId ni supplierId asignado) son los ÚNICOS con acceso
 * de gestión irrestricto a todas las estructuras, campos y parcelas de la red.
 */
export function isCentralAdminOrSupervisor(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (user.memberType === 'Cooperativa_Central' && !user.clientId && !user.supplierId) return true;
  return false;
}

/**
 * Determina si el usuario pertenece a un Proveedor / Semillero Homologado con acceso restringido a sus semillas/insumos.
 */
export function isSupplierRestrictedUser(user: User | null): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return false;
  return Boolean(user.supplierId && String(user.supplierId).trim().length > 0 && !user.clientId);
}

/**
 * Determina si un usuario tiene alcance de lectura global (Admin Central o Auditor Externo sin establecimiento ni proveedor fijo).
 */
export function hasGlobalReadScope(user: User | null): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;
  if (isSupplierRestrictedUser(user)) return false;
  // Los visores/auditores externos sin clientId ni supplierId ni parcelas restringidas pueden auditar en modo solo lectura
  if (user.role === 'viewer' && !user.clientId && !user.supplierId && (!user.assignedPlotIds || user.assignedPlotIds.length === 0)) {
    return true;
  }
  return false;
}

/**
 * Verifica si una parcela utiliza una genética (`varietyId`) o lote de semilla (`seedBatchId`) provisto por `supplierId`.
 */
export function doesPlotBelongToSupplier(
  supplierId: string,
  plot: Plot,
  varieties: Variety[] = DEMO_VARIETIES,
  seedBatches: SeedBatch[] = DEMO_SEED_BATCHES
): boolean {
  if (!supplierId || !plot) return false;
  const supIdStr = String(supplierId).trim();
  const effectiveVarieties = varieties && varieties.length > 0 ? varieties : DEMO_VARIETIES;
  const effectiveBatches = seedBatches && seedBatches.length > 0 ? seedBatches : DEMO_SEED_BATCHES;

  const supplierVarietyIds = new Set(
    effectiveVarieties
      .filter(v => String(v.supplierId || '').trim() === supIdStr)
      .map(v => String(v.id))
  );

  if (plot.varietyId && supplierVarietyIds.has(String(plot.varietyId))) {
    return true;
  }

  if (plot.seedBatchId) {
    const matchedBatch = effectiveBatches.find(b => String(b.id) === String(plot.seedBatchId));
    if (matchedBatch) {
      if (matchedBatch.supplierId && String(matchedBatch.supplierId).trim() === supIdStr) {
        return true;
      }
      if (matchedBatch.varietyId && supplierVarietyIds.has(String(matchedBatch.varietyId))) {
        return true;
      }
    }
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
 * Regla de negocio estricta de Aislamiento Multi-Establecimiento y por Semillero:
 * - Central Admin / Auditor Global sin clientId ni supplierId: Acceso a todos los campos.
 * - Usuario vinculado a un Establecimiento (`user.clientId`): Acceso EXCLUSIVAMENTE a los campos
 *   cuyo `loc.clientId === user.clientId` o `userStructure.locationId === loc.id`.
 * - Usuario vinculado a un Proveedor Homologado (`user.supplierId`): Acceso ÚNICAMENTE a los campos
 *   que alojan parcelas implantadas con semillas/genéticas de ese proveedor.
 */
export function getAllowedLocationIds(
  user: User | null,
  locations: Location[],
  clients: Client[],
  plots: Plot[] = DEMO_PLOTS,
  varieties: Variety[] = DEMO_VARIETIES,
  seedBatches: SeedBatch[] = DEMO_SEED_BATCHES
): string[] {
  if (!user) return [];
  if (hasGlobalReadScope(user)) {
    return locations.map(l => l.id);
  }

  // Si es un usuario de un Proveedor Homologado (ej. Ananda Pampa o HEMPIT France):
  // Solo ve los campos donde existan parcelas con sus semillas/genéticas
  if (isSupplierRestrictedUser(user) && user.supplierId) {
    const effectivePlots = plots && plots.length > 0 ? plots : DEMO_PLOTS;
    const locIdsWithSupplierSeeds = new Set(
      effectivePlots
        .filter(p =>
          doesPlotBelongToSupplier(user.supplierId!, p, varieties, seedBatches) ||
          (user.assignedPlotIds && user.assignedPlotIds.includes(p.id))
        )
        .map(p => String(p.locationId))
    );
    return locations.filter(l => locIdsWithSupplierSeeds.has(String(l.id))).map(l => l.id);
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
  if (isSupplierRestrictedUser(user)) return false;
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
  clients: Client[],
  plots: Plot[] = DEMO_PLOTS,
  varieties: Variety[] = DEMO_VARIETIES,
  seedBatches: SeedBatch[] = DEMO_SEED_BATCHES
): boolean {
  if (!user || !location) return false;
  if (hasGlobalReadScope(user)) return true;
  const allowed = getAllowedLocationIds(user, [location], clients, plots, varieties, seedBatches);
  return allowed.includes(location.id);
}

/**
 * Verifica si el usuario puede acceder a una parcela específica (Plot).
 * Regla de aislamiento estricto:
 * 1. Si el usuario está asociado a un Establecimiento (`user.clientId`), ÚNICAMENTE puede acceder
 *    a parcelas emplazadas dentro de los campos (`locations`) de su propio Establecimiento.
 * 2. Si el usuario está asociado a un Proveedor Homologado (`user.supplierId`), ÚNICAMENTE puede acceder
 *    a las parcelas donde esté implantada una genética o lote de semilla provisto por su empresa (ej. Ananda Pampa -> Yuma).
 */
export function canAccessPlot(
  user: User | null,
  plot: Plot,
  locations: Location[],
  clients: Client[],
  varieties: Variety[] = DEMO_VARIETIES,
  seedBatches: SeedBatch[] = DEMO_SEED_BATCHES
): boolean {
  if (!user || !plot) return false;
  if (hasGlobalReadScope(user)) return true;

  // Candado de seguridad por Proveedor / Semillero Homologado (ej. Ananda Pampa o HEMPIT France)
  if (isSupplierRestrictedUser(user) && user.supplierId) {
    if (user.assignedPlotIds && user.assignedPlotIds.includes(plot.id)) {
      return true;
    }
    return doesPlotBelongToSupplier(user.supplierId, plot, varieties, seedBatches);
  }

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
  if (isSupplierRestrictedUser(user)) {
    // Los proveedores ven los nodos de recepción donde se alojan sus lotes
    return true;
  }
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
  clients: Client[],
  varieties: Variety[] = DEMO_VARIETIES
): boolean {
  if (!user || !batch) return false;
  if (hasGlobalReadScope(user)) return true;

  const allowedPlots = plots.filter(p => canAccessPlot(user, p, locations, clients, varieties));
  const allowedPlotIds = new Set(allowedPlots.map(p => p.id));
  const usedSeedBatchIds = new Set(allowedPlots.map(p => p.seedBatchId).filter(Boolean));

  if (isSupplierRestrictedUser(user) && user.supplierId) {
    const supIdStr = String(user.supplierId).trim();
    const effectiveVarieties = varieties && varieties.length > 0 ? varieties : DEMO_VARIETIES;
    const supplierVarietyIds = new Set(
      effectiveVarieties
        .filter(v => String(v.supplierId || '').trim() === supIdStr)
        .map(v => String(v.id))
    );
    if (batch.supplierId && String(batch.supplierId).trim() === supIdStr) return true;
    if (batch.varietyId && supplierVarietyIds.has(String(batch.varietyId))) return true;
    if (batch.originPlotId && allowedPlotIds.has(batch.originPlotId)) return true;
    if (usedSeedBatchIds.has(batch.id)) return true;
    return false;
  }

  const allowedStorageIds = new Set(
    storagePoints.filter(sp => canAccessStoragePoint(user, sp, locations, clients)).map(sp => sp.id)
  );
  if (batch.storagePointId && allowedStorageIds.has(batch.storagePointId)) {
    return true;
  }

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
  clients: Client[],
  varieties: Variety[] = DEMO_VARIETIES,
  seedBatches: SeedBatch[] = DEMO_SEED_BATCHES
): boolean {
  if (!user || !task) return false;
  if (hasGlobalReadScope(user)) return true;

  if (!task.plotId) {
    return task.assignedToIds ? task.assignedToIds.includes(user.id) : false;
  }
  const targetPlot = plots.find(p => p.id === task.plotId);
  if (!targetPlot) return false;

  return canAccessPlot(user, targetPlot, locations, clients, varieties, seedBatches);
}

/**
 * Devuelve el diagnóstico completo de alcance de datos para un usuario (para auditoría en Equipos & Accesos).
 */
export function getUserAccessAudit(
  user: User,
  locations: Location[],
  plots: Plot[],
  clients: Client[],
  storagePoints: StoragePoint[] = [],
  suppliers: Supplier[] = DEMO_SUPPLIERS,
  varieties: Variety[] = DEMO_VARIETIES,
  seedBatches: SeedBatch[] = DEMO_SEED_BATCHES
) {
  const isGlobal = hasGlobalReadScope(user);
  const isSupplierUser = isSupplierRestrictedUser(user);
  const effectiveSuppliers = suppliers && suppliers.length > 0 ? suppliers : DEMO_SUPPLIERS;
  const linkedClient = user.clientId ? clients.find(c => String(c.id) === String(user.clientId)) : undefined;
  const linkedSupplier = user.supplierId ? effectiveSuppliers.find(s => String(s.id) === String(user.supplierId)) : undefined;

  const allowedLocations = locations.filter(l => canAccessLocation(user, l, clients, plots, varieties, seedBatches));
  const allowedPlots = plots.filter(p => canAccessPlot(user, p, locations, clients, varieties, seedBatches));
  const allowedStorages = storagePoints.filter(sp => canAccessStoragePoint(user, sp, locations, clients));
  const blockedPlotsCount = Math.max(0, plots.length - allowedPlots.length);

  let accessLevelLabel = 'Establecimiento Aislado';
  if (isCentralAdminOrSupervisor(user)) {
    accessLevelLabel = 'Total Red Cooperativa (Admin Central)';
  } else if (isGlobal) {
    accessLevelLabel = 'Auditoría Global (Solo Lectura)';
  } else if (isSupplierUser && linkedSupplier) {
    accessLevelLabel = `Exclusivo Semillas: ${linkedSupplier.name}`;
  } else if (linkedClient) {
    accessLevelLabel = `Exclusivo: ${linkedClient.name}`;
  } else {
    accessLevelLabel = 'Sin Establecimiento Asignado';
  }

  const structureRoleLabel = isSupplierUser && user.supplierActorRole && SUPPLIER_ACTOR_ROLES_INFO[user.supplierActorRole]
    ? SUPPLIER_ACTOR_ROLES_INFO[user.supplierActorRole].shortLabel
    : isSupplierUser
    ? 'Representante de Proveedor'
    : user.structureRole && STRUCTURE_ROLES_INFO[user.structureRole]
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
    isSupplierUser,
    isCentralAdmin: isCentralAdminOrSupervisor(user),
    isolationScope: isGlobal
      ? ('RED_GLOBAL' as const)
      : isSupplierUser
      ? ('PROVEEDOR_SEMILLERO_AISLADO' as const)
      : ('ESTABLECIMIENTO_AISLADO' as const),
    structureRoleLabel,
    accessLevelLabel,
    linkedClient,
    linkedSupplier,
    allowedLocations,
    allowedLocationsCount: allowedLocations.length,
    allowedPlots,
    allowedPlotsCount: allowedPlots.length,
    allowedPlotNames: allowedPlots.map(p => p.name),
    allowedStorages,
    blockedPlotsCount
  };
}

/**
 * Resuelve de forma determinística la Estructura Productiva (Socio de la Red) y el Recurso Humano activo
 * registrado en el sistema (`usersList`) para un Establecimiento / Sitio (`Location`) o ID de cliente.
 * Garantiza que tanto el Propietario / Responsable del Campo como el Responsable Técnico Agronómico
 * provengan siempre de los usuarios activos registrados en el sistema.
 */
export function resolveLocationStructureRoster(
  location: Partial<Location> | null | undefined,
  clients: Client[],
  usersList: User[]
) {
  const safeUsers = (usersList || []).filter(Boolean);
  const safeClients = (clients || []).filter(Boolean);

  // 1. Identificar la Estructura Productiva (Socio de la Red) vinculada al campo
  const linkedClient = location
    ? safeClients.find(
        c =>
          (location.clientId && String(c.id) === String(location.clientId)) ||
          (location.id && c.locationId && String(c.locationId) === String(location.id))
      )
    : undefined;

  const effectiveClientId = linkedClient?.id || location?.clientId || '';

  // 2. Usuarios activos pertenecientes a la Estructura Productiva de este campo
  const teamIdsSet = new Set<string>([
    ...(linkedClient?.teamUserIds || []).map(String),
    ...(linkedClient?.relatedUserId ? [String(linkedClient.relatedUserId)] : []),
    ...((location?.responsibleIds || []).map(String))
  ]);

  const structureUsers = safeUsers.filter(u => {
    if (isSupplierRestrictedUser(u)) return false;
    if (effectiveClientId && u.clientId && String(u.clientId) === String(effectiveClientId)) {
      return true;
    }
    if (teamIdsSet.has(String(u.id))) {
      return true;
    }
    return false;
  });

  // 3. Directores / Administradores / Agrónomos de la Cooperativa Central (soporte transversal)
  const centralUsers = safeUsers.filter(
    u =>
      !isSupplierRestrictedUser(u) &&
      (isCentralAdminOrSupervisor(u) || (!u.clientId && (u.role === 'technician' || u.structureRole === 'agronomo')))
  );

  // Pool combinado sin duplicados (primero los usuarios propios de la Estructura Productiva del campo)
  const allSelectableUsers: User[] = [];
  const seenIds = new Set<string>();
  [...structureUsers, ...centralUsers, ...safeUsers.filter(u => !isSupplierRestrictedUser(u))].forEach(u => {
    if (!seenIds.has(String(u.id))) {
      seenIds.add(String(u.id));
      allSelectableUsers.push(u);
    }
  });

  const normalizeName = (str?: string | null) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const findUserByNameHint = (hint?: string | null, pool: User[] = allSelectableUsers): User | undefined => {
    const cleanHint = normalizeName(hint);
    if (!cleanHint) return undefined;
    // Coincidencia exacta primero
    const exact = pool.find(u => normalizeName(u.name) === cleanHint);
    if (exact) return exact;
    // Coincidencia parcial (ej. "Salvador MERELE" o "Matías QUINTANA / Ing. Agr. Julián PIZARRO")
    return pool.find(u => {
      const uname = normalizeName(u.name);
      if (!uname) return false;
      const parts = uname.split(' ').filter(p => p.length > 2);
      return cleanHint.includes(uname) || (parts.length >= 2 && parts.every(p => cleanHint.includes(p)));
    });
  };

  // 4. Identificar al Propietario / Titular / Responsable del Campo dentro de la Estructura Productiva
  let ownerUser: User | undefined = undefined;
  if (location?.ownerName) {
    ownerUser = findUserByNameHint(location.ownerName, structureUsers) || findUserByNameHint(location.ownerName, allSelectableUsers);
  }
  if (!ownerUser && linkedClient?.relatedUserId) {
    ownerUser = safeUsers.find(u => String(u.id) === String(linkedClient.relatedUserId));
  }
  if (!ownerUser && linkedClient?.contactName) {
    ownerUser = findUserByNameHint(linkedClient.contactName, structureUsers) || findUserByNameHint(linkedClient.contactName, allSelectableUsers);
  }
  if (!ownerUser) {
    ownerUser =
      structureUsers.find(u => u.structureRole === 'propietario') ||
      structureUsers.find(u => u.role === 'client') ||
      structureUsers.find(u => u.structureRole === 'encargado') ||
      structureUsers[0] ||
      centralUsers[0];
  }

  // 5. Identificar al Responsable Técnico Agronómico dentro de la Estructura Productiva o Cooperativa Central
  let technicalUser: User | undefined = undefined;
  if (location?.responsiblePerson) {
    // Si el texto contiene una barra (ej. "Matías QUINTANA / Ing. Agr. Julián PIZARRO"), priorizar al agrónomo de la estructura
    const segments = String(location.responsiblePerson)
      .split('/')
      .map(s => s.trim())
      .filter(Boolean);
    if (segments.length > 1) {
      // Buscar primero si alguno de los segmentos corresponde a un agrónomo registrado
      for (const seg of [...segments].reverse()) {
        const match = findUserByNameHint(seg, structureUsers) || findUserByNameHint(seg, allSelectableUsers);
        if (match) {
          technicalUser = match;
          break;
        }
      }
    } else {
      technicalUser =
        findUserByNameHint(location.responsiblePerson, structureUsers) ||
        findUserByNameHint(location.responsiblePerson, allSelectableUsers);
    }
  }
  if (!technicalUser) {
    technicalUser =
      structureUsers.find(u => u.structureRole === 'agronomo') ||
      structureUsers.find(u => u.role === 'technician' && (!ownerUser || u.id !== ownerUser.id)) ||
      structureUsers.find(u => u.structureRole === 'encargado') ||
      centralUsers.find(u => u.structureRole === 'agronomo' || u.role === 'admin' || u.role === 'super_admin') ||
      ownerUser;
  }

  // Candidatos ordenados para selector de Propietario / Responsable del Campo
  const candidateOwners: User[] = [
    ...structureUsers.filter(u => u.structureRole === 'propietario' || u.role === 'client' || u.structureRole === 'encargado'),
    ...structureUsers.filter(u => u.structureRole !== 'propietario' && u.role !== 'client' && u.structureRole !== 'encargado'),
    ...centralUsers.filter(u => !structureUsers.some(su => su.id === u.id))
  ];

  // Candidatos ordenados para selector de Responsable Técnico Agronómico
  const candidateTechnicians: User[] = [
    ...structureUsers.filter(u => u.structureRole === 'agronomo' || u.role === 'technician' || u.structureRole === 'encargado'),
    ...structureUsers.filter(u => u.structureRole !== 'agronomo' && u.role !== 'technician' && u.structureRole !== 'encargado'),
    ...centralUsers.filter(u => !structureUsers.some(su => su.id === u.id))
  ];

  const resolvedResponsibleIds = Array.from(
    new Set([
      ...structureUsers.map(u => String(u.id)),
      ...(ownerUser ? [String(ownerUser.id)] : []),
      ...(technicalUser ? [String(technicalUser.id)] : []),
      ...((location?.responsibleIds || []).map(String))
    ])
  );

  return {
    linkedClient,
    structureUsers,
    centralUsers,
    allSelectableUsers,
    ownerUser,
    ownerDisplayName: ownerUser?.name || location?.ownerName || linkedClient?.contactName || 'Sin Asignar',
    technicalUser,
    technicalDisplayName: technicalUser?.name || location?.responsiblePerson || ownerUser?.name || 'Sin Asignar',
    candidateOwners,
    candidateTechnicians,
    resolvedResponsibleIds
  };
}

