
// Enums and Types
export type UsageType = 'Fibra' | 'Grano' | 'Dual' | 'Medicinal';
export type SoilType = 'Franco' | 'Arcilloso' | 'Arenoso' | 'Limoso';
export type RoleType = 'Productor' | 'Cooperativa' | 'Institución';

// Auth Types
export type UserRole = 'super_admin' | 'admin' | 'technician' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for listing, required for login/creation
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
  genetics: string; // Proveedor/Genética (Default)
  cycleDays: number;
  expectedThc: number;
  notes?: string;
}

// NUEVO: Gestión de Stock y Trazabilidad de Semillas
export interface SeedBatch {
  id: string;
  varietyId: string;
  
  // Datos Comerciales del Proveedor (Compliance)
  supplierName: string;       // Nombre Fantasía (ej: Hemp-it)
  supplierLegalName?: string; // Razón Social (ej: Hemp-it France SAS)
  supplierCuit?: string;      // CUIT / Tax ID
  supplierRenspa?: string;    // N° Registro Semillero / RENSPA Origen
  supplierAddress?: string;   // Dirección Fiscal / Origen
  
  batchCode: string;        // Número de etiqueta oficial / Lote
  certificationNumber?: string; // N° Certificado Fiscalización (INASE/SENASA)
  purchaseDate: string;     // Fecha de adquisición
  initialQuantity: number;  // Cantidad comprada (kg)
  remainingQuantity: number; // Stock actual (kg)
  storageConditions?: string; // Temp/Humedad (Compliance)
  notes?: string;
  isActive: boolean;        // Si el lote está disponible para siembra
}

// NUEVO: Movimientos Logísticos (Hoja de Ruta)
export interface SeedMovement {
  id: string;
  batchId: string;
  targetLocationId: string;
  quantity: number; // kg enviados
  date: string;
  
  // Datos de Transporte (Compliance)
  transportGuideNumber: string; // N° Guía / Remito
  driverName: string;
  vehiclePlate: string;
  transportCompany?: string;
  
  status: 'En Tránsito' | 'Recibido' | 'Cancelado';
  receivedBy?: string; // User ID
  notes?: string;
}

export interface Location {
  id: string;
  name: string;
  province?: string; // Nueva: Provincia
  city?: string;     // Nueva: Ciudad/Localidad
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
  cuie?: string; // Clave Única de Identificación de Establecimiento (Compliance)
}

export interface Plot {
  id: string;
  name: string; // Generated Name e.g. "VAR-B1-R1"
  type: 'Ensayo' | 'Producción'; // Nuevo: Diferencia I+D de Lotes Comerciales
  projectId: string; 
  locationId: string;
  varietyId: string;
  seedBatchId?: string; // NUEVO: Vinculación para trazabilidad exacta
  
  // Experimental Design Identifiers
  block: string;    // Bloque (o Lote en producción)
  replicate: number; // Rep (Repetición o Sector)
  
  // Ownership
  ownerName: string; 
  responsibleIds: string[]; 
  
  // Setup
  sowingDate: string;
  surfaceArea?: number; // Nueva Superficie
  surfaceUnit?: 'm2' | 'ha' | 'ac'; // Unidad de medida (Agregado Acres)
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
  stemDiameter?: number;      // Nuevo: Diámetro tallo (mm)
  nodesCount?: number;        // Nuevo: Número de nudos
  
  // Estado Reproductivo
  floweringState?: 'Pre-flor' | 'Floración' | 'Senescencia'; // Nuevo
  trichomeColor?: 'Transparente' | 'Lechoso' | 'Ambar' | 'Mixto'; // Nuevo

  lodging?: number;           // Vuelco (%)
  birdDamage?: string;        // Daño por aves (Si/No o Nivel)
  diseases?: string;          // Enfermedades (Texto/Tipo)
  pests?: string;             // Plagas (Texto/Tipo)
  
  // Aplicaciones (Fertilizantes / Fitosanitarios)
  applicationType?: 'Fertilizante' | 'Insecticida' | 'Fungicida' | 'Herbicida' | 'Otro';
  applicationProduct?: string;
  applicationDose?: string;

  // Resultados de Cosecha
  harvestDate?: string;       // Fecha cosecha
  harvestHeight?: number;     // altura (cm) a cosecha
  plantsPerMeterFinal?: number; // N° plantas.m (Final)
  
  // Métricas de Rendimiento
  sampleSize?: number;        // Nuevo: Tamaño de muestra (m2)
  freshWeight?: number;       // Nuevo: Peso Fresco Total (kg)
  dryWeight?: number;         // Nuevo: Peso Seco Total (kg) - para calcular humedad
  
  yield?: number;             // rendimiento (kg/ha o total parcela)
  stemWeight?: number;        // peso tallo (g/planta o kg total)
  leafWeight?: number;        // peso hoja (g/planta o kg total)
  flowerWeight?: number;      // Nuevo: peso flor (g/planta o kg total)
}

// Keep generic logs for photos or extra comments not in the official registry
export interface FieldLog {
  id: string;
  plotId: string;
  date: string;
  note: string;
  photoUrl?: string;
}

// Task Management
export interface Task {
  id: string;
  plotId?: string; // Optional, can be general
  projectId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  priority: 'Alta' | 'Media' | 'Baja';
  assignedToIds: string[]; // User IDs
  createdBy: string;
}

// Stats Interface
export interface DashboardStats {
  totalVarieties: number;
  activeLocations: number;
  activePlots: number;
  pendingTasks: number;
}