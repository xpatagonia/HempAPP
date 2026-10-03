
export type UsageType = 'Fibra' | 'Grano' | 'Dual' | 'Medicinal';
export type UserRole = 'super_admin' | 'admin' | 'technician' | 'client' | 'viewer';
export type RoleType = 'Productor Pequeño (0-5 ha)' | 'Productor Mediano (5-15 ha)' | 'Productor Grande (>20 ha)' | 'Empresa Privada' | 'Gobierno' | 'Academia' | 'ONG/Cooperativa';
export type SupplierCategory = 'Semillas' | 'Insumos' | 'Servicios' | 'Recursos Humanos';
export type MembershipLevel = 'Activo' | 'En Observación' | 'Premium' | 'Baja Temporal';
export type SoilType = string;

export type SiteType = 
  | 'Campo Extensivo' 
  | 'Chacra Intensiva' 
  | 'Predio Experimental' 
  | 'Indoor / Laboratorio' 
  | 'Invernadero' 
  | 'Centro de Procesamiento';

export type SiteStatus = 'Activo' | 'Inactivo' | 'En Barbecho' | 'En Preparación';

export const CAMPAIGNS = ['2024/2025', '2025/2026', '2026/2027', '2027/2028'] as const;

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

export type HempLicenseCategory = 
  | 'Cultivo e Industrialización (Fibra y Grano)' 
  | 'Investigación y Desarrollo (I+D / Ensayos)' 
  | 'Semillero y Criadero Certificado (INASE)' 
  | 'Alimentos y Biomasa' 
  | 'Medicinal / Fitoquímicos';

export type HempLicenseStatus = 'Vigente' | 'En Trámite' | 'Pre-Aprobada' | 'Vencida';

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
  polygon?: { lat: number; lng: number }[]; // Perímetro General del Establecimiento
  clientId?: string;
  ownerName?: string;
  ownerLegalName?: string;
  ownerCuit?: string;
  ownerContact?: string;
  ownerType?: RoleType;
  capacityHa?: number;
  irrigationSystem?: string;
  responsibleIds?: string[];
  siteType?: SiteType;
  status?: SiteStatus;
  activeCampaigns?: string[];
  notes?: string;

  // ESTÁNDARES REGULATORIOS Y LICENCIA DE CÁÑAMO (ARICCAME / INASE / SENASA)
  ariccameLicenseNumber?: string; // N° Disposición / Licencia ARICCAME
  ariccameLicenseCategory?: HempLicenseCategory; // Categoría de licencia
  ariccameLicenseStatus?: HempLicenseStatus; // Estado de la licencia
  renspaNumber?: string; // Registro Nacional Sanitario de Productores Agropecuarios (SENASA)
  cadastralId?: string; // Partida Inmobiliaria / Nomenclatura Catastral
  landTenureType?: 'Propiedad' | 'Arrendamiento' | 'Comodato' | 'Convenio Institucional';
  securityMeasures?: string[]; // Medidas de seguridad (Cerco, CCTV, Control biométrico, Protocolo residuos)

  // GEODESIA: DECLARACIÓN JURADA DE SIEMBRA (DDJJ)
  sowingDeclarationPolygon?: { lat: number; lng: number }[]; // Polígono geodésico exacto declarado ante ARICCAME/SENASA
  sowingDeclarationHa?: number; // Superficie geodésica declarada
  sowingDeclarationId?: string; // N° Expediente / Código de DDJJ de Siembra
  sowingDeclarationDate?: string; // Fecha de presentación oficial de DDJJ
}

export interface HydricRecord {
  id: string;
  locationId: string;
  plotId?: string; 
  date: string;
  time?: string;
  endTime?: string; // Nuevo campo para fin de riego
  type: 'Lluvia' | 'Riego';
  amountMm: number;
  notes?: string;
  createdBy?: string;
}

export interface StoragePoint {
  id: string;
  name: string; 
  nodeCode: string; 
  type: 'Propio' | 'Tercerizado' | 'Transitorio';
  address: string;
  city?: string;
  province?: string;
  coordinates?: { lat: number; lng: number };
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
  address?: string; 
  totalHectares?: number; 
  isNetworkMember: boolean;
  membershipLevel?: MembershipLevel;
  contractDate?: string;
  cuit?: string;
  notes?: string;
  relatedUserId?: string; 
  coordinates?: { lat: number; lng: number }; 
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
  status: 'Activa' | 'Cosechada' | 'Cancelada' | 'Pausada' | 'En Barbecho';
  sowingDate: string;
  ownerName?: string;
  responsibleIds?: string[];
  rowDistance?: number;
  perimeter?: number;
  observations?: string;
  coordinates?: { lat: number; lng: number };
  polygon?: { lat: number; lng: number }[];
  irrigationType?: string;
  usedSeedValue?: number;
  usedSeedUnit?: 'gr' | 'kg' | 'tn';
  color?: string; // Nuevo campo para el color de referencia
  campaign?: string; // Campaña agrícola asignada (ej: '2025/2026')
  activeCampaigns?: string[];
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
  driverDni?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  transportCompany?: string;
  recipientName?: string;
  recipientDni?: string;
  routeItinerary?: string;
  status?: 'En Tránsito' | 'Recibido';
  originStorageId?: string;
  routeGoogleLink?: string;
  estimatedDistanceKm?: number;
}

export interface TrialRecord {
  id: string;
  plotId: string;
  date: string;
  time?: string;
  stage: 'Vegetativo' | 'Floración' | 'Maduración' | 'Cosecha';
  temperature?: number;
  humidity?: number;
  plantHeight?: number;
  plantsPerMeter?: number;
  uniformity?: number; 
  vigor?: number; 
  lodging?: number; 
  birdDamage?: number; 
  diseasesScore?: number; 
  pestsScore?: number; 
  harvestPlantCount?: number; 
  seedYield?: number; 
  seedQualityGermination?: number; 
  seedQualityNonConformity?: number; 
  stemWeight?: number; 
  leafWeight?: number;
  freshWeight?: number;
  yield?: number;
  replicate?: number;
  emergenceDate?: string;
  floweringDate?: string; 
  harvestDate?: string;
  diseases?: string; 
  pests?: string; 
  createdBy?: string;
  createdByName?: string;
  lightHours?: number;
  lunarPhase?: string;
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
}

export interface SoilHealthData {
  sandPercent: number;
  clayPercent: number;
  siltPercent: number;
  textureClass: string;
  socPercent: number; // Soil Organic Carbon %
  somPercent: number; // Soil Organic Matter % (~ soc * 1.724)
  phWater: number;
  cec: number; // Cation exchange capacity cmol(+)/kg
  bulkDensity: number; // g/cm3
  compactionRisk: 'Bajo' | 'Moderado' | 'Alto';
  rootPenetrationPotentialMm: number;
  surfaceTempC: number;
  rootZoneTempC: number;
  moistureSurfacePct: number;
  moistureRootZonePct: number;
  moistureDeepPct: number;
  waterHoldingCapacityMmPerM: number;
  dataSource: string;
  lastUpdated: string;
}

export interface WaterEfficiencyMetrics {
  plotAreaHa: number;
  cycleDays: number;
  cumulativeRainMm: number;
  cumulativeIrrigationMm: number;
  totalWaterAppliedMm: number;
  totalWaterAppliedM3: number;
  et0CumulativeMm: number;
  hempEtcMm: number;
  wueBiomassKgM3: number; // kg biomass / m3 water
  wueGrainKgM3: number;   // kg grain / m3 water
  waterSavedVsCornM3: number;
  waterSavedVsCottonM3: number;
  waterSavedVsAlfalfaM3: number;
  // Desglose Huella Hídrica (Water Footprint Network / Hoekstra)
  greenWaterFootprintM3Ha: number; // Agua de lluvia evapotranspirada
  blueWaterFootprintM3Ha: number;  // Agua de riego aplicada
  greyWaterFootprintM3Ha: number;  // Dilución de lixiviados/nutrientes
  totalWaterFootprintM3Ha: number;
  waterFootprintPerKgYieldLiters: number; // Litros por kg producido
  waterBenchmarkVsCottonPct: number; // Ahorro relativo vs algodón (~75-80%)
  waterBenchmarkVsCornPct: number;   // Ahorro relativo vs maíz (~35-45%)
  co2CapturedTonnes: number;
  soilRestorationIndex: number; // 0 - 100
}

export interface CarbonFootprintData {
  plotId: string;
  plotName: string;
  areaHa: number;
  varietyName: string;
  dryBiomassKgHa: number;
  aboveGroundCaptureTonnesCO2Ha: number;
  belowGroundCaptureTonnesCO2Ha: number;
  totalGrossCaptureTonnesCO2Ha: number;
  totalGrossCaptureTonnesCO2Plot: number;
  fuelEmissionsTonnesCO2Ha: number;
  fertilizerEmissionsTonnesCO2Ha: number;
  irrigationEnergyEmissionsTonnesCO2Ha: number;
  totalEmissionsTonnesCO2Ha: number;
  netCarbonBalanceTonnesCO2Ha: number; // Valor negativo indica fijación neta
  netCarbonBalanceTonnesCO2Plot: number;
  carbonCreditsEstimated: number; // tCO2e certificables
  carbonOffsetEquivalencyCars: number;
  carbonOffsetEquivalencyTrees: number;
  sequestrationDurabilityYears: number;
  mrvStatus: 'Auditado' | 'En Proceso' | 'Verificado Satelital';
  lastCalculated: string;
}

export type RiskLevel = 'Bajo' | 'Moderado' | 'Alto' | 'Extremo';
export type CatastropheType = 'incendio' | 'sequia' | 'inundacion' | 'helada' | 'viento_granizo';

export interface CatastropheRiskAlert {
  id: string;
  plotId?: string;
  plotName: string;
  region: string;
  province: string;
  coordinates: { lat: number; lng: number };
  type: CatastropheType;
  level: RiskLevel;
  score: number; // 0 - 100
  title: string;
  description: string;
  triggerFactors: string[];
  preventiveMeasures: string[];
  satelliteTelemetry: {
    temperatureC?: number;
    relativeHumidityPct?: number;
    windSpeedKmH?: number;
    soilSaturationPct?: number;
    vegetationDrynessIndex?: number;
    fwiIndex?: number;
  };
  date: string;
  status: 'Activa' | 'En Observación' | 'Mitigada';
}


export interface NDVISample {
  date: string;
  stage: string;
  ndviAverage: number;
  ndviMin: number;
  ndviMax: number;
  canopyCoveragePct: number;
  biomassIndex: number;
  stressDetected: boolean;
}

export interface SatellitePass {
  id: string;
  plotId: string;
  date: string;
  satellite: 'Sentinel-2A' | 'Sentinel-2B' | 'Landsat-9' | 'Dron Multiespectral';
  cycleDay: number;
  stageName: string;
  cloudCoveragePct: number;
  ndviAverage: number;
  ndviMin: number;
  ndviMax: number;
  optimalAreaPct: number;
  moderateAreaPct: number;
  stressedAreaPct: number;
  canopyCoveragePct: number;
  biomassEstimateKgHa: number;
  notes?: string;
}

export interface DroneFlight {
  id: string;
  plotId: string;
  date: string;
  pilotName: string;
  droneModel: string;
  flightAltitudeM: number;
  resolutionCmPx: number;
  sensorType: string;
  mapUrl?: string;
  ndviAverage: number;
  observations: string;
}

export interface PlotNDVIAlert {
  plotId: string;
  plotName: string;
  ndvi: number;
  date: string;
  stage: string;
  isCriticalLow: boolean;
  isCriticalHigh: boolean;
  isCritical: boolean;
  type: 'CRITICAL_LOW' | 'CRITICAL_HIGH' | 'NORMAL';
  title: string;
  description: string;
  suggestedAction: string;
}

export type ToxicologicalBand = 'Banda Verde (Banda IV - Poco Peligroso)' | 'Banda Azul (Banda III - Cuidado)' | 'Banda Amarilla (Banda II - Nocivo)' | 'Banda Roja (Banda I - Muy Tóxico)' | 'Biológico / Orgánico Certificado';

export interface AgrochemicalApplication {
  id: string;
  plotId: string;
  plotName: string;
  date: string;
  time?: string;
  category: 'Fertilizante Edáfico' | 'Fertilizante Foliar' | 'Insecticida' | 'Fungicida' | 'Bioestimulante' | 'Enmienda Orgánica' | 'Herbicida';
  productName: string; // Marca comercial
  activeIngredient: string; // Principio activo o composición NPK/Biológica
  manufacturer: string; // Fabricante / Marca / Laboratorio
  supplierId?: string;
  supplierName: string; // Proveedor distribuidor
  senasaRegisterNumber: string; // Registro Oficial SENASA / INASE
  toxicologicalClass: ToxicologicalBand;
  dosagePerHa: number; // Dosis numérica
  dosageUnit: 'L/ha' | 'kg/ha' | 'ml/ha' | 'g/ha' | 't/ha';
  totalAppliedAmount: number; // Cantidad total aplicada en el lote
  applicationMethod: 'Fertirriego' | 'Pulverización Terrestre' | 'Pulverización Aérea' | 'Incorporación Edáfica' | 'Manual / Follaje';
  batchNumber: string; // Lote de fabricación
  expirationDate?: string; // Fecha de vencimiento
  senasaComplianceStatus?: 'Conforme SENASA (Normativa VIGENTE)' | 'Certificación Orgánica Acreditada' | 'En Revisión Documental'; // Cumplimiento normativo
  safetyPeriodDays: number; // Días de carencia pre-cosecha
  harvestSafetyDate: string; // Fecha liberada para cosecha
  responsibleAgronomist: string; // Nombre del Ingeniero Agrónomo
  agronomistLicense: string; // Matrícula Profesional MP
  weatherCondition?: {
    temperatureC: number;
    windSpeedKmH: number;
    relativeHumidityPct: number;
  };
  notes?: string;
  status: 'Aplicado' | 'En Carencia' | 'Apto Cosecha';
}


