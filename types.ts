
export type UsageType = 'Fibra' | 'Grano' | 'Dual' | 'Medicinal';
export type UserRole = 'super_admin' | 'admin' | 'technician' | 'client' | 'viewer';
export type RoleType = 'Productor Pequeño (0-5 ha)' | 'Productor Mediano (5-15 ha)' | 'Productor Grande (>20 ha)' | 'Empresa Privada' | 'Gobierno' | 'Academia' | 'ONG/Cooperativa';
export type SupplierCategory = 
  | 'Semillero_Criadero'          // Semillas & Multiplicación Fiscalizada INASE
  | 'Bioinsumos_Fertilizantes'    // Fertilizantes, Enmiendas & Bioestimulantes SENASA
  | 'Fitosanitarios_Control'      // Control Fitosanitario & Biológico SENASA
  | 'Mecanizacion_Servicios'      // Siembra de Precisión, Cosecha & Enfardado
  | 'Laboratorio_Analitica'       // Laboratorios HPLC, Metales Pesados & Pureza
  | 'Sustratos_Vivero'            // Sustratos & Propagación Agámica
  | 'Semillas'
  | 'Insumos'
  | 'Servicios'
  | 'Recursos Humanos';

export type TechnicalHomologationStatus = 
  | 'Homologado_Conforme'         // Apto para producción y trazabilidad oficial
  | 'En_Auditoria_Tecnica'        // En ensayo agronómico o revisión documental
  | 'Cuarentena_Tecnica'          // En revisión técnica / lote observado
  | 'No_Apto_Restringido';        // Desestimado por no conformidad técnica o contaminantes

export type AgronomicInspectionVerdict = 
  | 'APROBADO_CAMPO'            // Lote conforme para siembra / aplicación
  | 'EN_CUARENTENA_OBSERVADO'   // En observación fisiológica o ensayo de contraprueba
  | 'RECHAZADO_DEVOLUCION';     // Rechazado por bajo poder germinativo, patógenos o residuo

export type LotQualityGrade =
  | 'GRADO_A_SUPERIOR'          // 90-100 pts: Calidad Élite Fiscalizada (Óptimo vigor y sanidad)
  | 'GRADO_B_ESTANDAR'          // 75-89 pts: Calidad Estándar Comercial (Apto siembra general)
  | 'GRADO_C_CONDICIONAL'       // 60-74 pts: Calidad Condicional (Requiere ajuste de densidad / observación)
  | 'NO_CONFORME';              // <60 pts: Fuera de estándar técnico / Rechazado

export interface SupplierLotInspection {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  inputCategory: 'Semilla C1/C2' | 'Bioinsumo / Enmienda' | 'Fitosanitario / Biológico' | 'Sustrato / Enraizante' | 'Servicio Mecanización';
  lotNumber: string;
  guideOrRemitoNumber?: string;
  germinationTestedPct?: number;     // % Germinación real en cámara (ISTA / INASE)
  germinationDeclaredPct?: number;   // % Germinación marbete oficial
  purityPct?: number;                // % Pureza física
  moisturePct?: number;              // % Humedad de semilla / grano
  vigorScore?: number;               // Vigor fisiológico (Escala 1 a 9)
  thousandSeedWeightGr?: number;     // Peso de 1000 semillas (PMS en g)
  weedSeedsFound?: boolean;          // Presencia de malezas
  pathogenScreeningResult?: 'Negativo (Conforme)' | 'Presencia Aislada No Cuarentenaria' | 'Positivo Cuarentenario (Alerta)';
  residueStatus?: 'Cero Residuos / Orgánico' | 'Dentro de LMR SENASA' | 'Excede LMR';
  qualityGrade?: LotQualityGrade;    // Determinación de calidad del lote
  qualityScore?: number;             // Índice numérico de calidad (0 a 100)
  verdict: AgronomicInspectionVerdict;
  // ASOCIACIÓN CON TRAZABILIDAD DE LOTES DE SIEMBRA Y CULTIVAR
  varietyId?: string;
  varietyName?: string;
  seedBatchId?: string;              // Lote de siembra vinculado en Inventario Biológico
  initialQuantityKg?: number;        // Masa recepcionada del lote (kg)
  storagePointId?: string;           // Nodo de custodia de recepción
  // PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD
  samplerUserId?: string;
  samplerName?: string;              // Personal interviniente en la toma de muestra
  samplerRole?: string;              // Cargo / Función en muestreo
  samplerDniOrMatricula?: string;    // DNI / Legajo / Matrícula del muestreador
  sampleCode?: string;               // Código de muestra precintada (ej: MUE-INASE-2026-0041)
  samplingDate?: string;             // Fecha de toma de muestra
  samplingMethod?: string;           // Protocolo de muestreo (ej: ISTA Compuesto con Calador)
  agronomistUserId?: string;
  agronomistName: string;            // Ingeniero Agrónomo dictaminante
  agronomistMatricula: string;       // Matrícula profesional
  receptionResponsibleName?: string; // Responsable de recepción y custodia en almacén
  observations?: string;
  createdAt?: string;
}

export interface SupplierAgronomicAudit {
  technicalAgronomistName?: string;
  technicalAgronomistMatricula?: string;
  samplerName?: string;              // Responsable de toma de muestras en homologación
  samplerMatricula?: string;
  lastAuditDate?: string;
  auditScore?: number;            // Calificación técnica (0 a 100)
  gacpCertified?: boolean;        // Buenas Prácticas Agrícolas y de Recolección (GACP)
  bpaCertified?: boolean;         // Buenas Prácticas Agrícolas (BPA Oficiales)
  organicCertified?: boolean;     // Certificación Orgánica SENASA / IFOAM
  zeroResidueGuarantee?: boolean; // Garantía de Inocuidad y Cero Residuos Químicos
  labAccreditationStandard?: string; // Ej: ISO/IEC 17025, INTA, SENASA
}
export type MembershipLevel = 'Activo' | 'En Observación' | 'Premium' | 'Baja Temporal';
export type SoilType = string;

export type SiteType = 
  | 'Campo Extensivo' 
  | 'Chacra Intensiva' 
  | 'Predio Experimental' 
  | 'Indoor / Laboratorio' 
  | 'Invernadero' 
  | 'Centro de Procesamiento';

export type SiteStatus = 'Activo' | 'Inactivo' | 'En Barbecho' | 'En Preparación' | 'Pausado';

export const CAMPAIGNS = ['2024/2025', '2025/2026', '2026/2027', '2027/2028'] as const;

export type StructureRole = 
  | 'propietario'     // Propietario / Titular de la Explotación
  | 'encargado'       // Encargado General / Capataz de Campo
  | 'agronomo'        // Ingeniero Agrónomo / Asesor Técnico
  | 'operario'        // Operario de Campo / Maquinista / Riego
  | 'monitoreador';   // Monitoreador de Ensayos / Muestreador

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  structureRole?: StructureRole;
  password?: string;
  jobTitle?: string;
  phone?: string;
  avatar?: string;
  clientId?: string;
  isNetworkMember: boolean; 
  memberType?: 'Socio_Productor' | 'Cooperativa_Central' | 'Auditor_Tecnico';
  organizationName?: string;
  assignedPlotIds?: string[];
  invitedAt?: string;
  invitationEmailSent?: boolean;
  lastInvitationSentAt?: string;
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
  pauseReason?: string; // Motivo de pausa / descanso agronómico
  campaignStatuses?: Record<string, 'Activo' | 'Pausado' | 'En Barbecho' | 'Finalizado'>;
  campaignPauseReasons?: Record<string, string>;
}

export interface CampaignHistoryEntry {
  id: string;
  campaign: string;
  entityType: 'Campo' | 'Parcela';
  entityId: string;
  entityName: string;
  locationName?: string;
  previousStatus: string;
  newStatus: 'Activo' | 'Pausado' | 'En Barbecho' | 'Finalizado';
  reason?: string;
  timestamp: string;
  responsibleName?: string;
  surfaceArea?: number;
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

export interface StorageZone {
  id: string;
  name: string;
  type: 'Camara_Semilla_INASE' | 'Silo_Grano_Alimento' | 'Playa_Estiba_Fardos' | 'Cuarentena_Muestreo' | 'Biomasa_Custodiada';
  capacityTn: number;
  currentOccupancyTn: number;
  targetTempC?: number;
  maxHumidityPct?: number;
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

  // ESTÁNDARES GACP, SENASA & ARICCAME DE CUSTODIA
  zones?: StorageZone[];
  tempC?: number; // Temperatura actual censada en tiempo real
  humidityPct?: number; // Humedad relativa actual censada (%)
  tempStatus?: 'normal' | 'alerta' | 'critico';
  humidityStatus?: 'normal' | 'alerta' | 'critico';
  ariccameCustodyRegistry?: string; // N° Libro de Guardia ARICCAME
  responsibleAgronomistMatricula?: string; // Matrícula profesional del agrónomo responsable
  securityLevel?: 'Estándar' | 'GACP Alta Seguridad' | 'Custodia Fiscal';
  totalCapacityTn?: number;
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
  commercialContact?: string;
  logisticsContact?: string;
  coordinates?: { lat: number; lng: number };
  website?: string;
  notes?: string;
  isOfficialPartner?: boolean;

  // ACREDITACIONES REGULATORIAS & AGRONÓMICAS (NO CRM)
  inaseRncyfsNumber?: string;          // N° Registro Nacional de Comercio y Fiscalización de Semillas (INASE)
  senasaRegisterNumber?: string;       // N° Registro Nacional Sanitario de Insumos / Fitosanitarios (SENASA)
  ariccameLicenseNumber?: string;      // N° Licencia / Disposición ARICCAME
  homologationStatus?: TechnicalHomologationStatus; // Estado de homologación técnica

  // AUDITORÍA DE CALIDAD & PROTOCOLOS AGRONÓMICOS
  audit?: SupplierAgronomicAudit;
  technicalSpecialty?: string;         // Especialidad agronómica
  activeIngredientsProvided?: string[]; // Principios activos o insumos autorizados
  technicalDatasheetUrl?: string;      // Ficha técnica agronómica
  batchReturnWarrantyDays?: number;    // Plazo de garantía técnica por lote / germinación
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

  // ESTÁNDARES REGULATORIOS & AGRONÓMICOS GLOBALES (INASE, OECD, GACP)
  inaseRncNumber?: string; // N° Registro Nacional de Cultivares (INASE RNC)
  oecdListing?: boolean; // Inscrita en Catálogo Común Europeo / OECD
  breederName?: string; // Obtentor / Criadero original
  breederCountry?: string; // País de origen del cultivar
  chemotype?: 'Tipo III (CBD/CBG dominante)' | 'Tipo IV (CBG puro)' | 'Tipo V (Fibra industrial sin cannabinoides)' | 'Fibra/Grano (<0.3% THC)';
  expectedCbg?: number; // % CBG esperado
  expectedCbd?: number; // % CBD esperado
  photoperiodType?: 'Monoica' | 'Dioica' | 'Autofloreciente';
  gddRequirement?: number; // Grados-Día de Desarrollo acumulados (GDD)
  waterNeedMm?: number; // Requerimiento hídrico milimétrico por ciclo
  optimalSowingDensityKgHa?: number; // Densidad recomendada (kg/ha)
  thousandSeedWeightGr?: number; // Peso de mil semillas (PMS en gramos)
  expectedFiberYieldTnHa?: number; // Rendimiento estimado fibra/tallo seco (Tn/ha)
  expectedGrainYieldKgHa?: number; // Rendimiento estimado grano (kg/ha)
  thcLabCertificate?: string; // N° Certificado / Protocolo HPLC oficial
  thcLabName?: string; // Laboratorio acreditado de cromatografía
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
  locationId?: string; // Campo / Establecimiento asociado a la estructura
  teamUserIds?: string[]; // IDs de operarios vinculados a esta estructura
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
  soilType?: string;
  usedSeedValue?: number;
  usedSeedUnit?: 'gr' | 'kg' | 'tn';
  color?: string; // Nuevo campo para el color de referencia
  campaign?: string; // Campaña agrícola asignada (ej: '2025/2026')
  activeCampaigns?: string[];
  pauseReason?: string;
  campaignStatuses?: Record<string, 'Activa' | 'Pausada' | 'En Barbecho' | 'Cosechada'>;
  campaignPauseReasons?: Record<string, string>;
  // FENOLOGÍA & CICLO BIOLÓGICO
  currentPhenologicalStage?: HempStageId;
  accumulatedGdd?: number;
  lastStageUpdateDate?: string;
  stageHistory?: Array<{ stageId: HempStageId; date: string; laborId?: string; certifiedBy?: string; notes?: string }>;
  // TRAZABILIDAD DE CALIDAD Y PERSONAL INTERVINIENTE
  originInspectionId?: string;       // Inspección técnica de lote homologado asociada
  qualityGrade?: LotQualityGrade;    // Grado de calidad del lote sembrado
  samplingResponsibleName?: string;  // Personal interviniente en toma de muestras de parcela
  sowingResponsibleName?: string;    // Personal responsable de siembra
  technicalResponsibleName?: string; // Ingeniero Agrónomo responsable del seguimiento
  technicalResponsibleMatricula?: string; // Matrícula del Director Técnico
  // CIERRE DE CICLO AGRONÓMICO, PROGRAMACIÓN DE COSECHA, LABORES Y DOCUMENTO DE SIEMBRA HOMOLOGADO
  closedAt?: string;                 // Fecha ISO de cierre de ciclo / cosecha (YYYY-MM-DD)
  closedDate?: string;               // Alias de fecha ISO de cierre de ciclo / cosecha (YYYY-MM-DD)
  closedTime?: string;               // Hora exacta de cierre de ciclo / cosecha (HH:mm)
  closedBy?: string;                 // Responsable que certificó el cierre de ciclo
  closureNotes?: string;             // Acta / Observaciones de cierre de ciclo y cosecha
  closureConfirmed?: boolean;        // Candado: una vez confirmada la fecha, el productor no puede modificar (solo Admin)
  closureActCode?: string;           // N° de Documento Oficial de Siembra y Cierre Homologado (ej: ACTA-HOM-2026-0041)
  closureBarcode?: string;           // Código de barras GS1 / Code-128 asignado al lote y cierre de ciclo
  scheduledHarvestDate?: string;     // Fecha programada con anticipación para cierre / cosecha
  scheduledHarvestTime?: string;     // Hora programada con anticipación para cierre / cosecha
  isHarvestScheduled?: boolean;      // Indica si tiene fecha de cierre/cosecha programada con anticipación
  linkedClosureLaborId?: string;     // ID de la Labor Agrícola (Task) de Cosecha / Cierre vinculada
  harvestMachinery?: string;         // Maquinaria / Implemento afectado al cierre o cosecha
  harvestOperator?: string;          // Operario / Responsable ejecutante de la labor de cosecha
  actualHarvestYieldKg?: number;     // Rendimiento real cosechado (kg totales en parcela)
  harvestYieldKg?: number;           // Alias de rendimiento real cosechado (kg totales en parcela)
  waterFootprintM3Ha?: number;       // Huella hídrica consolidada al cierre (m³/ha)
}

export type BiologicalMaterialType = 'seed' | 'harvested_grain' | 'fiber_bales' | 'biomass_cbg' | 'hurds';

export interface SeedBatch {
  id: string;
  varietyId: string;
  supplierId?: string;
  supplierName?: string;
  batchCode: string;
  labelSerialNumber?: string;
  category?: 'C1' | 'C2' | 'Base' | 'Original' | 'C1_CERTIFICADA_1';
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

  // VINCULACIÓN CON INSPECCIÓN DE CALIDAD HOMOLOGADA Y LOTE MADRE
  originInspectionId?: string;       // ID de la Inspección Técnica de Lote en Recepción
  parentSeedBatchId?: string;        // Si es material obtenido en cosecha, ID del lote de semilla sembrado
  qualityGrade?: LotQualityGrade;    // Grado de calidad determinado (Grado A/B/C)
  qualityScore?: number;             // Puntaje técnico de calidad (0-100)

  // PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD DEL LOTE
  samplerName?: string;              // Personal que realizó la toma de muestra
  samplerRole?: string;              // Rol o cargo del muestreador
  samplerMatricula?: string;         // Matrícula / DNI / Rol del muestreador
  samplerDniOrMatricula?: string;    // Alias DNI / Matrícula del muestreador
  sampleCode?: string;               // Código oficial de muestra precintada
  samplingMethod?: string;           // Protocolo de toma de muestra (ISTA / INASE)
  inspectorName?: string;            // Ingeniero Agrónomo certificante de calidad
  inspectorMatricula?: string;       // Matrícula profesional del inspector
  sowingResponsibleName?: string;    // Responsable técnico de siembra
  harvestResponsibleName?: string;   // Responsable técnico de cosecha / obtención de material

  // MULTI-ETAPA DE TRAZABILIDAD AGRONÓMICA & DERIVADOS COSECHADOS
  materialType?: BiologicalMaterialType; // Tipo biológico (Semilla, Grano, Fardos Fibra, Biomasa CBG, Cañamiza)
  originPlotId?: string; // Parcela de procedencia en caso de cosecha
  originCampaign?: string; // Campaña de cosecha (ej: '2025/2026')
  harvestDate?: string; // Fecha de trilla / corte / fardado
  
  // Parámetros de Calidad de Granos
  moisturePct?: number; // % Humedad (<9% ideal)
  oilContentPct?: number; // % Contenido lipídico
  aflatoxinFreeCertificate?: string; // N° Análisis libre de micotoxinas/aflatoxinas

  // Parámetros de Fardos de Paja / Fibra
  baleCount?: number; // Cantidad de fardos
  avgBaleWeightKg?: number; // Peso medio por fardo
  rettingQuality?: 'Óptimo (Gris plateado)' | 'Medio (Amarillo tostado)' | 'Verde (Sin enriar)'; // Enriado en campo

  // Parámetros de Biomasa Cannabinoide / CBG
  hplcThcPct?: number; // % THC certificado (<0.3%)
  hplcCbgPct?: number; // % CBG analizado
  hplcLabCertificate?: string; // Certificado de Análisis (CoA) oficial

  // Parámetros de Cañamiza / Hurds
  hurdGranulometry?: 'Fina (0-5 mm)' | 'Media (5-15 mm)' | 'Gruesa (15-25 mm)';
  dustExtractionPct?: number; // % Despolvoreado para hempcrete

  // Vencimientos regulatorios
  germinationExpiryDate?: string; // Límite de vigencia del análisis INASE
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
  stage: 'Emergencia' | 'Vegetativo' | 'Floración' | 'Maduración' | 'Cosecha';
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

export type ExpenseScope = 'PARCELA_SOCIO' | 'COOPERATIVA_GENERAL';

export type ExpenseCategory = 
  | 'LABOR_CULTURAL'          // Preparación de suelo, siembra, labores en lote
  | 'INSUMO_FITOSANITARIO'    // Fertilizantes, bioinsumos, enmiendas aplicadas
  | 'SEMILLA_FISCALIZADA'     // Semilla certificada C1/C2 asignada
  | 'RIEGO_COMBUSTIBLE'       // Gasoil maquinaria local / energía y canon hídrico
  | 'COSECHA_LOTE'            // Cosecha, corte y enfardado en lote
  | 'FLETE_LOGISTICA_CENTRAL' // Fletes troncales y logística colectiva cooperativa
  | 'ACOPIO_SECADO_SILOS'     // Acondicionamiento, secado y custodia en silos cooperativos
  | 'CERTIFICACION_AUDITORIA' // Ensayos HPLC de cannabinoides, pureza ISTA, aranceles regulatorios
  | 'SEGUROS_COLECTIVOS'      // Póliza multirriesgo agrícola y granizo cooperativa
  | 'ESTRUCTURA_ADMIN_COOP';  // Balances, asesoría técnica agronómica central, gestión legal

export type ExpenseAuditStatus = 
  | 'BORRADOR'               // En edición preliminar
  | 'DECLARADO_SOCIO'        // Enviado por el socio para validación cooperativa
  | 'AUDITADO_CONFORME'      // Verificado por el equipo técnico/financiero cooperativo
  | 'OBSERVADO_REVISION';    // Observado por discrepancia de remito o dosis

export interface OperationalExpense {
  id: string;
  campaign: string;                      // ej: '2025/2026'
  date: string;                          // YYYY-MM-DD
  scope: ExpenseScope;                   // 'PARCELA_SOCIO' | 'COOPERATIVA_GENERAL'
  plotId?: string;                       // ID de la parcela (obligatorio si PARCELA_SOCIO)
  plotName?: string;
  locationId?: string;
  locationName?: string;
  socioId?: string;                      // Identificador del socio
  socioName?: string;                    // Razón social del socio (ej: 'Consorcio Pergamino Verde')
  category: ExpenseCategory;
  concept: string;                       // Concepto / detalle del gasto
  quantity: number;
  unit: string;                          // 'ha', 'litros', 'kg', 'horas', 'viajes', 'tn', 'global'
  unitCost: number;                      // Costo unitario
  totalCost: number;                     // quantity * unitCost
  currency: 'USD' | 'ARS';
  exchangeRate?: number;                 // TC aplicado si ARS
  totalCostUsd: number;                  // Normalizado a USD
  receiptType?: 'Factura A' | 'Factura B/C' | 'Remito Oficial' | 'Orden de Trabajo' | 'Liquidación Cooperativa';
  receiptNumber?: string;                // ej: 'FAC-A-0004-00012894'
  supplierName?: string;                 // Proveedor o contratista
  status: ExpenseAuditStatus;
  auditedBy?: string;                    // Responsable de auditoría cooperativa
  auditDate?: string;
  auditNotes?: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  status: 'Planificación' | 'En Curso' | 'Finalizado';
  directorId?: string;
  responsibleIds?: string[];
  campaign?: string; // Campaña agrícola asociada ej: '2025/2026'
  targetYieldTn?: number;
  budgetUsd?: number;
  objectiveType?: 'Fibra Industrial' | 'Grano y Alimento' | 'I+D Genético' | 'Cannabinoides / Biomasa';
}

// CICLO BIOLÓGICO Y FENOLOGÍA (ESCALA BBCH CÁÑAMO INDUSTRIAL)
export type HempStageId = 
  | 'BBCH_00_09' // Germinación y Emergencia (Días 0-10 | ~100 GDD)
  | 'BBCH_10_19' // Vegetativo Temprano V1-V4 (Días 10-25 | ~300 GDD)
  | 'BBCH_20_39' // Vegetativo Rápido / Gran Elongación (Días 25-55 | ~750 GDD)
  | 'BBCH_50_59' // Prefloración / Inducción & Sexado (Días 55-70 | ~1050 GDD)
  | 'BBCH_60_69' // Floración Plena (Días 70-95 | ~1400 GDD)
  | 'BBCH_70_85' // Llenado y Maduración de Grano/Inflorescencia (Días 95-120 | ~1700 GDD)
  | 'BBCH_89_99'; // Maduración Fisiológica y Cosecha Óptima (Días 120-135 | ~1950 GDD)

export type AgriculturalLaborType = 
  | 'PREPARACION_SUELO'   // Arado, rastra, subsolado, nivelación de cama
  | 'SIEMBRA'             // Siembra directa, calibración de sembradora
  | 'FERTIRRIEGO'         // Fertilización de arranque, cobertera, fertirriego
  | 'FITOSANITARIO'       // Aplicación de bioinsumos, fitosanitarios, curasemilla
  | 'MANEJO_HIDRICO'      // Turnos de riego por gravedad, mantenimiento goteo
  | 'LABOR_CULTURAL'      // Desmalezado mecánico, aporque, roguing
  | 'MONITOREO'           // Monitoreo de plagas, sexado, muestreo HPLC
  | 'COSECHA'             // Corte, hilerado, cosecha combinada, enfardado
  | 'ACONDICIONAMIENTO';  // Acondicionamiento de rastrojo, secado en campo

export type LaborStatus = 'Planificada' | 'Pendiente' | 'En_Curso' | 'Ejecutada' | 'Homologada' | 'Cancelada' | 'Completada';

export interface HempPhenologicalStage {
  id: HempStageId;
  bbchCode: string;
  name: string;
  shortName: string;
  daysRange: [number, number];
  typicalGdd: number;
  description: string;
  keyMorphology: string;
  recommendedLabors: AgriculturalLaborType[];
  criticalCare: string;
  badgeColor: string;
}

export interface LaborMachinery {
  tractor?: string;
  implement?: string;
  fuelConsumptionLiters?: number;
  machineHours?: number;
}

export interface LaborWeatherConditions {
  tempC?: number;
  humidityPct?: number;
  windSpeedKmh?: number;
  windDirection?: string;
  suitableForSpraying?: boolean;
}

export interface LaborAppliedInput {
  resourceId?: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: LaborStatus;
  priority: 'Alta' | 'Media' | 'Baja';
  assignedToIds: string[];
  dueDate: string;
  plotId?: string;
  createdBy: string;
  // ENRIQUECIMIENTO AGRONÓMICO & CICLO BIOLÓGICO
  laborType?: AgriculturalLaborType;
  targetStage?: HempStageId;
  advancesPhenologicalStage?: boolean;
  newPhenologicalStage?: HempStageId;
  machinery?: LaborMachinery;
  operator?: string;
  weather?: LaborWeatherConditions;
  appliedInputs?: LaborAppliedInput[];
  directCostUsd?: number;
  syncWithPhytosanitary?: boolean;
  syncWithExpenses?: boolean;
  executionDate?: string;
  notes?: string;
  evidenceUrl?: string;
  homologatedBy?: string;
  homologatedAt?: string;
  homologationNotes?: string;
  category?: string;
  date?: string;
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
    tempMinC?: number;
    tempMaxC?: number;
    relativeHumidityPct?: number;
    windSpeedKmH?: number;
    soilSaturationPct?: number;
    vegetationDrynessIndex?: number;
    fwiIndex?: number;
    dataSource?: string;
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
  ndreAverage?: number;
  rviSarAverage?: number;
  canopyCoveragePct: number;
  biomassIndex: number;
  stressDetected: boolean;
}

export interface StacBandAssets {
  redB04?: string;
  rededge1B05?: string;
  rededge2B06?: string;
  rededge3B07?: string;
  nirB08?: string;
  nirNarrowB8A?: string;
  swirB11?: string;
  scl?: string;
  visual?: string;
  thumbnail?: string;
  vv?: string;
  vh?: string;
}

export interface SatellitePass {
  id: string;
  plotId: string;
  date: string;
  acquisitionTimeUtc?: string;
  acquisitionTimeLocal?: string;
  satellite: 'Sentinel-2A' | 'Sentinel-2B' | 'Sentinel-2C' | 'Sentinel-1A (SAR)' | 'Sentinel-1C (SAR)' | 'Sentinel-1D (SAR)' | 'Landsat-9' | 'Dron Multiespectral';
  sensorMode?: 'OPTICAL_MSI' | 'SAR_C_BAND';
  cycleDay: number;
  stageName: string;
  cloudCoveragePct: number;
  ndviAverage: number;
  ndviMin: number;
  ndviMax: number;
  // Índices de Borde Rojo (Sentinel-2 Bandas 5, 6, 7 y 8A a 20m) para dosel cerrado
  ndreAverage?: number;
  ndreMin?: number;
  ndreMax?: number;
  redEdgeB5Reflectance?: number; // 705 nm
  redEdgeB6Reflectance?: number; // 740 nm
  redEdgeB7Reflectance?: number; // 783 nm
  reciChlorophyllIndex?: number; // (B7 / B5) - 1
  ndmiMoistureIndex?: number;    // (B8A - B11) / (B8A + B11)
  isCanopyClosed?: boolean;      // true cuando cobertura >= 75% (recomienda priorizar NDRE sobre NDVI)
  // Telemetría Radar de Apertura Sintética Sentinel-1 (Banda C 5.405 GHz - Libre de nubes)
  sarRviIndex?: number;          // Radar Vegetation Index (0 a 1+)
  sarVvDb?: number;              // Retrodispersión VV en dB (ej. -10.4 dB)
  sarVhDb?: number;              // Retrodispersión VH en dB (ej. -16.8 dB)
  sarVhVvRatioDb?: number;       // Relación cruzada VH - VV (dB) sensible a estructura de tallo
  sarOrbitState?: 'ascending' | 'descending';
  sarRelativeOrbit?: number;
  sarPolarizations?: string[];
  // Metadatos reales del Catálogo STAC (Copernicus CDSE / Element84 Earth Search)
  stacItemId?: string;
  stacCollection?: string;
  stacProvider?: string;
  mgrsTile?: string;
  sunElevationDeg?: number;
  sunAzimuthDeg?: number;
  processingBaseline?: string;
  isLiveStac?: boolean;
  stacAssets?: StacBandAssets;
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

export type AgrochemicalCategory = 'Fertilizante Edáfico' | 'Fertilizante Foliar' | 'Insecticida' | 'Fungicida' | 'Bioestimulante' | 'Enmienda Orgánica' | 'Herbicida' | 'Bioinsumo / Orgánico';

export interface AgrochemicalApplication {
  id: string;
  plotId: string;
  plotName: string;
  date: string;
  time?: string;
  category: AgrochemicalCategory;
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

// ==========================================
// TELEMETRÍA IOT Y SENSORES DE CAMPO (PYTHON / RENDER ENGINE)
// ==========================================

export interface LiveSensorMetrics {
  soil_moisture_pct?: number;
  soil_temp_c?: number;
  soil_ec_ds_m?: number;
  soil_matric_potential_kpa?: number;
  air_temp_c?: number;
  air_humidity_pct?: number;
  solar_radiation_wm2?: number;
  rain_mm?: number;
  wind_speed_kmh?: number;
  wind_gust_kmh?: number;
  wind_direction_deg?: number;
  atmospheric_pressure_hpa?: number;
  leaf_wetness_pct?: number;
  par_umol_m2s?: number;
}

export interface LiveAgronomicAssessment {
  et0_fao56_mm_day?: number;
  gdd_accumulated?: number;
  delta_t_c?: number;
  spray_suitability: string;
  water_stress_status: string;
  vapor_pressure_deficit_kpa?: number;
  dew_point_c?: number;
  frost_risk: boolean;
}

export interface LiveTelemetryRecord {
  id: string;
  device_id: string;
  plot_id: string;
  timestamp: string;
  metrics: LiveSensorMetrics;
  assessment: LiveAgronomicAssessment;
  battery_pct?: number;
  created_at?: string;
}

export type TelemetryStreamStatus = 'connecting' | 'connected' | 'simulated' | 'disconnected' | 'error';


