
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
  isNetworkMember: boolean; 
}

export type RoleType = 
  | 'Productor Pequeño (0-5 ha)' 
  | 'Productor Mediano (5-15 ha)' 
  | 'Productor Grande (>20 ha)' 
  | 'Empresa Privada' 
  | 'Gobierno' 
  | 'Academia' 
  | 'ONG/Cooperativa';

export type SupplierCategory = 'Semillas' | 'Insumos' | 'Servicios' | 'Recursos Humanos';

export type MembershipLevel = 'Activo' | 'En Observación' | 'Premium' | 'Baja Temporal';

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

export interface HydricRecord {
  id: string;
  locationId: string;
  plotId?: string; 
  date: string;
  time?: string;
  type: 'Lluvia' | 'Riego';
  amountMm: number;
  notes?: string;
  createdBy?: string;
}

export interface StoragePoint {
  id: string;
  name: string; 
  nodeCode: string; // Nuevo: Código de trazabilidad único estándar HNC
  type: 'Propio' | 'Tercerizado' | 'Transitorio';
  address: string;
  city?: string;
  province?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  responsibleUserId?: string; 
  clientId?: string; 
  surfaceM2?: number; 
  conditions?: string; 
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  legalName?: string;
  cuit?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  whatsapp?: string;
  email?: string;
  coordinates?: { lat: number; lng: number };
  commercialContact?: string;
  logisticsContact?: string;
  website?: string;
  notes?: string;
  isOfficialPartner?: boolean;
}

export interface Variety {
  id: string;
  supplierId: string; 
  name: string;
  usage: UsageType;
  cycleDays: number;
  expectedThc: number;
  knowledgeBase?: string; 
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  type: RoleType;
  contactName: string;
  contactPhone?: string;
  email?: string;
  address?: string; // Nuevo: Dirección Postal
  totalHectares?: number; // Nuevo: Hectáreas del socio
  isNetworkMember: boolean;
  membershipLevel?: MembershipLevel;
  contractDate?: string;
  cuit?: string;
  notes?: string;
  relatedUserId?: string; 
  coordinates?: { lat: number; lng: number }; 
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
  temperature?: number;
  humidity?: number;
  emergenceDate?: string;
  replicate?: number; 
  plantsPerMeter?: number; 
  uniformity?: number; 
  vigor?: number; 
  floweringDate?: string; 
  plantHeight?: number; 
  lodging?: number; 
  birdDamage?: number; 
  diseases?: string; 
  pests?: string; 
  harvestDate?: string; 
  yield?: number; 
  stemWeight?: number; 
  leafWeight?: number; 
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
