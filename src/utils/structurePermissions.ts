import { User, Location, Plot, Client, Task, StructureRole, UserRole } from '../../types';

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
    description: 'Titular de la explotación. Administración de la estructura, acceso a finanzas de su campo y alta de operarios.',
    systemRole: 'client'
  },
  encargado: {
    label: 'Encargado General / Capataz',
    shortLabel: 'Capataz',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    description: 'Coordinación diaria de labores de campo, asignación de maquinaria y control de cuadrillas.',
    systemRole: 'technician'
  },
  agronomo: {
    label: 'Ingeniero Agrónomo / Asesor Técnico',
    shortLabel: 'Ing. Agrónomo',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    description: 'Prescripciones fitosanitarias, monitoreo fenológico, curvas de fertilización y homologación técnica.',
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

/**
 * Determina si el usuario actual es un Administrador o Supervisor de la Cooperativa Central.
 * Los administradores y supervisores de la cooperativa son los ÚNICOS con acceso irrestricto
 * a todas las estructuras, campos y parcelas de la red.
 */
export function isCentralAdminOrSupervisor(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (user.memberType === 'Cooperativa_Central' && !user.clientId) return true;
  return false;
}

/**
 * Determina si el usuario es el propietario o encargado con permisos de gestión de su estructura.
 */
export function canManageStructure(user: User | null, client: Client | null): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;
  if (!client) return false;
  if (user.clientId === client.id) {
    return user.structureRole === 'propietario' || user.structureRole === 'encargado' || user.role === 'client';
  }
  return false;
}

/**
 * Obtiene los IDs de los campos (locations) a los que tiene acceso una estructura/usuario.
 * Regla de negocio estricta:
 * - Central Admin/Supervisor: Acceso a todos los campos.
 * - Usuario de estructura: Acceso EXCLUSIVAMENTE al campo asociado a su estructura (clientId / locationId)
 *   o donde figure como responsable directo.
 */
export function getAllowedLocationIds(
  user: User | null, 
  locations: Location[], 
  clients: Client[]
): string[] {
  if (!user) return [];
  if (isCentralAdminOrSupervisor(user)) {
    return locations.map(l => l.id);
  }

  const userClientId = user.clientId;
  const userStructure = clients.find(c => c.id === userClientId);

  return locations
    .filter(loc => {
      // 1. El campo tiene explícitamente el clientId de la estructura
      if (userClientId && loc.clientId === userClientId) return true;
      // 2. La estructura tiene este campo como locationId principal
      if (userStructure && userStructure.locationId === loc.id) return true;
      // 3. El usuario es responsable asignado en el campo
      if (loc.responsibleIds && loc.responsibleIds.includes(user.id)) return true;
      return false;
    })
    .map(l => l.id);
}

/**
 * Verifica si el usuario puede acceder a un campo específico.
 */
export function canAccessLocation(
  user: User | null, 
  location: Location, 
  clients: Client[]
): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;
  const allowed = getAllowedLocationIds(user, [location], clients);
  return allowed.includes(location.id);
}

/**
 * Verifica si el usuario puede acceder a una parcela específica.
 */
export function canAccessPlot(
  user: User | null, 
  plot: Plot, 
  locations: Location[], 
  clients: Client[]
): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;

  const allowedLocations = getAllowedLocationIds(user, locations, clients);
  if (allowedLocations.includes(plot.locationId)) return true;

  // Asignación nominal directa a la parcela
  if (plot.responsibleIds && plot.responsibleIds.includes(user.id)) return true;
  if (user.assignedPlotIds && user.assignedPlotIds.includes(plot.id)) return true;

  return false;
}

/**
 * Verifica si el usuario puede acceder a una labor (task).
 */
export function canAccessTask(
  user: User | null, 
  task: Task, 
  plots: Plot[], 
  locations: Location[], 
  clients: Client[]
): boolean {
  if (!user) return false;
  if (isCentralAdminOrSupervisor(user)) return true;

  if (!task.plotId) return true;
  const targetPlot = plots.find(p => p.id === task.plotId);
  if (!targetPlot) return true;

  return canAccessPlot(user, targetPlot, locations, clients);
}
