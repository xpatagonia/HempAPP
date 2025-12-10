
// Enums and Types
export type UsageType = 'Fibra' | 'Grano' | 'Dual' | 'Medicinal';
export type SoilType = 'Franco' | 'Arcilloso' | 'Arenoso' | 'Limoso';
export type RoleType = 'Productor' | 'Cooperativa' | 'Institución';

// Auth Types
export type UserRole = 'admin' | 'technician' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// Entities

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  status: 'Planificación' | 'En Curso' | 'Finalizado';
  responsibleIds?: string[]; // Usuarios a cargo del proyecto general
}

export interface Variety {
  id: string;
  name: string;
  usage: UsageType;
  genetics: string; // Proveedor/Genética
  cycleDays: number;
  expectedThc: number;
  notes?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  soilType: SoilType;
  climate: string;
  responsiblePerson: string; // Deprecated visual field, prefer responsibleIds logic if needed, but keeping for now
  ownerName?: string; // Nombre del titular (Empresa, ONG)
  ownerType?: RoleType;
  responsibleIds?: string[]; // IDs de usuarios asignados a la locación
}

export interface Plot {
  id: string;
  name: string; // Generated Name e.g. "VAR-B1-R1"
  projectId: string; 
  locationId: string;
  varietyId: string;
  
  // Experimental Design Identifiers
  block: string;    // Bloque
  replicate: number; // Rep (Repetición)
  
  // Ownership
  ownerName: string; 
  responsibleIds: string[]; 
  
  // Setup
  sowingDate: string;
  rowDistance: number; // cm
  density: number; // plants/m2 target
  status: 'Activa' | 'Cosechada' | 'Cancelada';
  observations?: string; // Notas generales de la parcela
  irrigationType?: string;
  
  // Specific GPS for this plot (overrides Location gps)
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// The official registry data structure (Hoja de Excel), now historical
export interface TrialRecord {
  id: string;
  plotId: string;
  date: string; // Fecha del registro (toma de dato)
  // Expanded stages for better precision
  stage: 'Emergencia' | 'Vegetativo' | 'Floración' | 'Maduración' | 'Cosecha'; 
  
  // Fenología y Desarrollo (Vegetativo)
  emergenceDate?: string;     // Fecha emergencia
  plantsPerMeterInit?: number; // N° plantas.m (Inicial)
  uniformity?: number;        // Uniformidad parcela (1-5 o 1-10)
  vigor?: number;             // Vigor (1-5)
  floweringDate?: string;     // Fecha Floración
  plantHeight?: number;       // Altura de planta (cm) - Durante ciclo o max
  lodging?: number;           // Vuelco (%)
  birdDamage?: string;        // Daño por aves (Si/No o Nivel)
  diseases?: string;          // Enfermedades (Texto/Tipo)
  pests?: string;             // Plagas (Texto/Tipo)
  
  // Resultados de Cosecha
  harvestDate?: string;       // Fecha cosecha
  harvestHeight?: number;     // altura (cm) a cosecha
  plantsPerMeterFinal?: number; // N° plantas.m (Final)
  yield?: number;             // rendimiento (kg/ha o total parcela)
  stemWeight?: number;        // peso tallo (g)
  leafWeight?: number;        // peso hoja (g)
}

// Keep generic logs for photos or extra comments not in the official registry
export interface FieldLog {
  id: string;
  plotId: string;
  date: string;
  note: string;
  photoUrl?: string;
}

// Stats Interface
export interface DashboardStats {
  totalVarieties: number;
  activeLocations: number;
  activePlots: number;
  pendingTasks: number;
}
