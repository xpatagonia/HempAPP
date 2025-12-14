
// Enums and Types
export type UsageType = 'Fibra' | 'Grano' | 'Dual' | 'Medicinal';
export type SoilType = 'Franco' | 'Arcilloso' | 'Arenoso' | 'Limoso';

// Redefinición de Roles de Cliente / Entidad
export type RoleType = 
  | 'Productor Pequeño (<5 ha)' 
  | 'Productor Mediano (5-15 ha)' 
  | 'Productor Grande (>15 ha)' 
  | 'Empresa Privada' 
  | 'Gobierno' 
  | 'Academia' 
  | 'ONG/Cooperativa';

// Auth Types
export type UserRole = 'super_admin' | 'admin' | 'technician' | 'viewer' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for listing, required for login/creation
  role: UserRole;
  avatar?: string; // URL to avatar image
  jobTitle?: string; // Nuevo: Cargo (ej: Ingeniero Agrónomo, Director)
  phone?: string;    // Nuevo: Teléfono de contacto
  clientId?: string; // NUEVO: Vinculación directa a la entidad Cliente
}

// Entities

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  status: 'Planificación' | 'En Curso' | 'Finalizado';
  directorId?: string; // Nuevo: ID del Director del Proyecto (Líder)
  responsibleIds?: string[]; // Usuarios operativos a cargo
}

// NUEVO: Entidad Cliente (Para gestión comercial y Red de Agricultores)
export interface Client {
  id: string;
  name: string; // Nombre Comercial / Razón Social
  type: RoleType;
  cuit?: string; // Tax ID
  
  // Contacto Principal
  contactName: string;
  contactPhone?: string;
  email?: string;
  
  // Red de Agricultores
  isNetworkMember: boolean; // ¿Pertenece a la Red?
  
  notes?: string;
}

// NUEVO: Entidad Proveedor (Semillero / Breeder)
export interface Supplier {
  id: string;
  name: string; // Nombre Comercial / Fantasía
  legalName?: string; // Razón Social
  cuit?: string; // Tax ID
  
  // Ubicación Detallada
  country: string; // País de Origen
  province?: string; // Nuevo: Provincia / Estado
  city?: string;     // Nuevo: Ciudad
  address?: string;  // Nuevo: Dirección específica

  // Contactos
  commercialContact?: string; // Nuevo: Nombre y Teléfono Comercial
  logisticsContact?: string;  // Nuevo: Nombre y Teléfono Logística
  
  website?: string;
  notes?: string;
}

export interface Variety {
  id: string;
  supplierId: string; // Link estricto a Supplier
  name: string;
  usage: UsageType;
  // genetics: string; // REMOVIDO: Ahora se usa supplierId
  cycleDays: number;
  expectedThc: number;
  notes?: string;
}

// NUEVO: Gestión de Stock y Trazabilidad de Semillas
export interface SeedBatch {
  id: string;
  varietyId: string;
  
  // Datos Comerciales del Proveedor (Compliance)
  supplierId?: string;        // Link directo al ID del proveedor (Nuevo)
  supplierName: string;       // Nombre Fantasía (ej: Hemp-it)
  supplierLegalName?: string; // Razón Social (ej: Hemp-it France SAS)
  supplierCuit?: string;      // CUIT / Tax ID
  supplierRenspa?: string;    // N° Registro Semillero / RENSPA Origen
  supplierAddress?: string;   // Dirección Fiscal / Origen
  originCountry?: string;     // País de Origen de la Semilla (Nuevo)
  
  // Datos de Compra (Nuevo)
  purchaseOrder?: string;   // N° Orden de Compra / Factura
  purchaseDate: string;     // Fecha de adquisición
  pricePerKg?: number;      // Precio por Kg (Opcional)

  // Identificación Técnica
  batchCode: string;        // Número de etiqueta oficial / Lote
  gs1Code?: string;         // Código de Barras GS1 / GTIN (Nuevo)
  certificationNumber?: string; // N° Certificado Fiscalización (INASE/SENASA)
  
  // Almacenamiento Físico
  initialQuantity: number;  // Cantidad comprada (kg)
  remainingQuantity: number; // Stock actual (kg)
  storageConditions?: string; // Temp/Humedad (Compliance)
  storageAddress?: string;    // Ubicación física exacta (Galpón/Estantería) (Nuevo)
  logisticsResponsible?: string; // Nombre del responsable de custodia (Nuevo)
  
  notes?: string;
  isActive: boolean;        // Si el lote está disponible para siembra
}

// NUEVO: Movimientos Logísticos (Hoja de Ruta)
export interface SeedMovement {
  id: string;
  batchId: string;
  clientId?: string; // NUEVO: Cliente destinatario (para facilitar filtrado)
  targetLocationId: string;
  quantity: number; // kg enviados
  date: string;
  dispatchTime?: string; // Hora de salida (Compliance)
  
  // Datos de Transporte (Compliance)
  transportGuideNumber: string; // N° Guía / Remito
  transportType?: 'Propio' | 'Tercerizado'; // Nuevo
  driverName: string;
  vehiclePlate: string;
  vehicleModel?: string; // Modelo del vehiculo (Nuevo)
  transportCompany?: string;
  routeItinerary?: string; // Calles / Rutas principales (Nuevo)
  
  status: 'En Tránsito' | 'Recibido' | 'Cancelado';
  receivedBy?: string; // User ID
  notes?: string;
}

// NUEVO: Recursos e Insumos (Plan Agrícola)
export interface Resource {
  id: string;
  name: string; // Urea, Glifosato, Jornal
  type: 'Fertilizante' | 'Fitosanitario' | 'Labor' | 'Insumo' | 'Maquinaria';
  unit: 'kg' | 'lts' | 'horas' | 'unidad' | 'ha';
  costPerUnit: number; // Costo estimado
  stock?: number; // Stock actual en depósito central
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
  
  // CLIENTE / TITULAR
  clientId?: string; // Nuevo: Link a entidad Client
  ownerName?: string; // Nombre Comercial / Fantasía del Cliente (Legacy o Display)
  ownerLegalName?: string; // Razón Social (Nuevo)
  ownerCuit?: string; // CUIT / Tax ID (Nuevo)
  ownerType?: RoleType; // Tipo de Cliente (Empresa, Gobierno, etc)
  ownerContact?: string; // Email o Teléfono de contacto del cliente (Nuevo)

  // CAPACIDAD & RIEGO (NUEVO REQUERIMIENTO)
  capacityHa?: number; // Capacidad total en Hectáreas
  irrigationSystem?: string; // Texto descriptivo o tags (ej: "Goteo, Pivot, Canales")

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
  
  // NUEVO: Polígono de la parcela (Array de coordenadas para dibujar el mapa)
  polygon?: { lat: number; lng: number }[];
}

// The official registry data structure (Hoja de Excel), now historical
export interface TrialRecord {
  id: string;
  plotId: string;
  date: string; // Fecha del registro (toma de dato)
  time?: string; // Hora del registro (HH:MM) - Nuevo
  createdBy?: string; // ID del ingeniero/técnico - Nuevo
  createdByName?: string; // Nombre para visualización rápida - Nuevo

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

// Task Management with Resources
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
  
  // NUEVO: Uso de Recursos (Plan Agrícola)
  resourceId?: string; // ID del recurso (Fertilizante, etc)
  resourceQuantity?: number; // Cantidad planificada
  resourceCost?: number; // Costo total estimado
}

// Stats Interface
export interface DashboardStats {
  totalVarieties: number;
  activeLocations: number;
  activePlots: number;
  pendingTasks: number;
}
