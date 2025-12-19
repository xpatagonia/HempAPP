
export type UsageType = 'Fibra' | 'Grano' | 'Dual' | 'Medicinal';

export type UserRole = 'super_admin' | 'admin' | 'technician' | 'client' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  jobTitle?: string;
  phone?: string;
  avatar?: string;
  clientId?: string;
}

export type RoleType = 
  | 'Productor Pequeño (<5 ha)' 
  | 'Productor Mediano (5-15 ha)' 
  | 'Productor Grande (>15 ha)' 
  | 'Empresa Privada' 
  | 'Gobierno' 
  | 'Academia' 
  | 'ONG/Cooperativa';

export type SoilType = string;

export interface Location {
  id: string;
  name: string;
  province: string;
  city: string;
  address: string;
  soilType: SoilType;
  climate?: string;
  responsiblePerson?: string;
  coordinates?: { lat: number; lng: number };
  polygon?: { lat: number; lng: number }[];
  clientId?: string;
  ownerName?: string;
  ownerLegalName?: string;
  ownerCuit?: string;
  ownerContact?: string;
  ownerType?: RoleType;
  capacityHa?: number;
  irrigationSystem?: string;
  responsibleIds?: string[];
}

export interface StoragePoint {
  id: string;
  name: string; 
  type: 'Propio' | 'Tercerizado' | 'Transitorio';
  address: string;
  city?: string;
  province?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  responsibleUserId?: string; 
  capacityKg?: number; 
  surfaceM2?: number; 
  conditions?: string; 
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  legalName?: string;
  cuit?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  commercialContact?: string;
  logisticsContact?: string;
  website?: string;
  notes?: string;
}

export interface Variety {
  id: string;
  supplierId: string; 
  name: string;
  usage: UsageType;
  cycleDays: number;
  expectedThc: number;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  type: RoleType;
  contactName: string;
  contactPhone?: string;
  email?: string;
  isNetworkMember: boolean;
  cuit?: string;
  notes?: string;
  relatedUserId?: string; // Link to system user
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  status: 'Planificación' | 'En Curso' | 'Finalizado';
  directorId?: string;
  responsibleIds?: string[];
}

export interface Plot {
  id: string;
  locationId: string;
  projectId: string;
  varietyId: string;
  seedBatchId?: string;
  name: string;
  type: 'Ensayo' | 'Producción';
  block?: string;
  replicate?: number;
  surfaceArea?: number;
  surfaceUnit?: 'ha' | 'm2' | 'ac';
  density?: number;
  status: 'Activa' | 'Cosechada' | 'Cancelada';
  sowingDate: string;
  ownerName?: string;
  responsibleIds?: string[];
  rowDistance?: number;
  perimeter?: number;
  observations?: string;
  coordinates?: { lat: number; lng: number };
  polygon?: { lat: number; lng: number }[];
  irrigationType?: string;
}

export interface TrialRecord {
  id: string;
  plotId: string;
  date: string;
  time?: string;
  stage: 'Vegetativo' | 'Floración' | 'Maduración' | 'Cosecha';
  
  // Clima Automático
  temperature?: number;
  humidity?: number;

  // Datos solicitados para ensayos
  emergenceDate?: string;
  replicate?: number; // Rep
  plantsPerMeter?: number; // N° plantas.m
  uniformity?: number; // Uniformidad parcela (%)
  vigor?: number; // Vigor (1-10 o %)
  floweringDate?: string; // Fecha Floración
  plantHeight?: number; // Altura de planta (cm)
  lodging?: number; // Vuelco (%)
  birdDamage?: number; // Daño por aves (%)
  diseases?: string; // Enfermedades
  pests?: string; // Plagas
  harvestDate?: string; // Fecha cosecha
  
  // Rendimiento y Biomasa
  yield?: number; // Rendimiento (kg/ha)
  stemWeight?: number; // Peso tallo (g)
  leafWeight?: number; // Peso hoja (g)
  freshWeight?: number;
  
  applicationType?: string;
  applicationProduct?: string;
  applicationDose?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface FieldLog {
  id: string;
  plotId: string;
  date: string;
  time?: string; 
  note: string;
  photoUrl?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: 'Fertilizante' | 'Fitosanitario' | 'Labor' | 'Insumo';
  unit: string;
  costPerUnit: number;
  stock?: number;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'Pendiente' | 'Completada';
  priority: 'Alta' | 'Media' | 'Baja';
  assignedToIds: string[];
  dueDate: string;
  plotId?: string;
  createdBy: string;
  resourceId?: string;
  resourceQuantity?: number;
  resourceCost?: number;
}

export interface SeedBatch {
  id: string;
  varietyId: string;
  supplierId?: string;
  batchCode: string;
  labelSerialNumber?: string;
  category?: 'C1' | 'C2' | 'Base' | 'Original';
  analysisDate?: string;
  purity?: number;
  germination?: number;
  gs1Code?: string;
  certificationNumber?: string;
  purchaseOrder?: string;
  purchaseDate?: string;
  pricePerKg?: number;
  initialQuantity: number;
  remainingQuantity: number;
  storageConditions?: string;
  storagePointId?: string;
  logisticsResponsible?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface SeedMovement {
  id: string;
  batchId: string;
  clientId?: string;
  targetLocationId: string;
  quantity: number;
  date: string;
  dispatchTime?: string;
  transportGuideNumber?: string;
  transportType?: 'Propio' | 'Tercerizado';
  driverName?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  transportCompany?: string;
  routeItinerary?: string;
  status?: 'En Tránsito' | 'Recibido';
  originStorageId?: string;
  routeGoogleLink?: string;
  estimatedDistanceKm?: number;
}
