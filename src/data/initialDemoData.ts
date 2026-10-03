import { 
  User, Location, Plot, Variety, TrialRecord, Project, Task, HydricRecord,
  StoragePoint, Supplier
} from '../../types';

export const DEMO_USER: User = {
  id: 'user-admin-nucleus',
  name: 'Ing. Gastón Barea (Nucleus)',
  email: 'gaston.barea.moreno@gmail.com',
  role: 'super_admin',
  jobTitle: 'Director Agronómico & Trazabilidad',
  phone: '+54 9 11 4567-8900',
  isNetworkMember: true
};

export const DEMO_USERS_LIST: User[] = [
  DEMO_USER,
  {
    id: 'user-admin-secondary',
    name: 'Admin Técnico HempC',
    email: 'admin@hempc.com.ar',
    role: 'super_admin',
    jobTitle: 'Administrador de Nodo',
    phone: '+54 9 11 4567-8901',
    isNetworkMember: true
  }
];

export const DEMO_VARIETIES: Variety[] = [
  {
    id: 'var-uso31',
    supplierId: 'sup-1',
    name: 'USO 31 (Fibra Industrial)',
    usage: 'Fibra',
    cycleDays: 115,
    expectedThc: 0.12,
    knowledgeBase: 'Genética ucraniana monoica de alto porte (hasta 3.2m), excelente resistencia a déficit hídrico y rendimiento de fibra técnica superior a 8.5 tn/ha.',
    notes: 'Inscrita en el Registro Nacional de Cultivares INASE.'
  },
  {
    id: 'var-santhica27',
    supplierId: 'sup-1',
    name: 'Santhica 27 (CBG / Fibra)',
    usage: 'Fibra',
    cycleDays: 120,
    expectedThc: 0.04,
    knowledgeBase: 'Variedad francesa monoica libre de THC (<0.05%), alto contenido de CBG natural y fibra celulósica de alta pureza.',
    notes: 'Excelente respuesta en suelos franco-limosos de la región pampeana.'
  },
  {
    id: 'var-futura75',
    supplierId: 'sup-2',
    name: 'Futura 75 (Doble Propósito)',
    usage: 'Dual',
    cycleDays: 130,
    expectedThc: 0.18,
    knowledgeBase: 'Genética dual vigorosa con potencial de cosecha de grano alimenticio (>1400 kg/ha) y rastrojo para bioenergía/biocompuestos.',
    notes: 'Apta para rotación con trigo y maíz tardío.'
  },
  {
    id: 'var-finola',
    supplierId: 'sup-2',
    name: 'Finola (Semilla & Aceite)',
    usage: 'Grano',
    cycleDays: 95,
    expectedThc: 0.15,
    knowledgeBase: 'Variedad autofloreciente dioica de ciclo corto, porte bajo (1.2m) ideal para cosecha directa con cosechadora de granos convencional.',
    notes: 'Perfil lipídico balanceado Omega 3-6-9.'
  }
];

export const DEMO_LOCATIONS: Location[] = [
  {
    id: 'loc-riocuarto',
    name: 'Estación Experimental Río Cuarto',
    siteType: 'Predio Experimental',
    status: 'Activo',
    activeCampaigns: ['2024/2025', '2025/2026', '2026/2027'],
    province: 'Córdoba',
    city: 'Río Cuarto',
    address: 'Ruta Nac. 36 Km 601',
    soilType: 'Franco-Limoso con buena retención hídrica',
    climate: 'Templado subhúmedo de transición',
    responsiblePerson: 'Ing. Agr. Gastón Barea',
    coordinates: { lat: -33.1235, lng: -64.3492 },
    capacityHa: 85,
    irrigationSystem: 'Pivote Central y Goteo Subterráneo',
    notes: 'Predio principal de ensayos agronómicos y monitoreo satelital continuo.'
  },
  {
    id: 'loc-pergamino',
    name: 'Campo Demostrativo Pergamino',
    siteType: 'Campo Extensivo',
    status: 'Activo',
    activeCampaigns: ['2024/2025', '2025/2026'],
    province: 'Buenos Aires',
    city: 'Pergamino',
    address: 'Ruta Nac. 8 Km 224',
    soilType: 'Argiudol Típico (Franco-Arcilloso)',
    climate: 'Templado pampeano húmedo',
    responsiblePerson: 'Ing. Téc. Marcos Gómez',
    coordinates: { lat: -33.8912, lng: -60.5731 },
    capacityHa: 120,
    irrigationSystem: 'Secano Tecnificado con microaspersión complementaria',
    notes: 'Campo extensivo en rotación. Programado para descanso parcial en la campaña 2026/2027.'
  },
  {
    id: 'loc-patagonia',
    name: 'Valle Inferior Río Negro (IDEVI)',
    siteType: 'Chacra Intensiva',
    status: 'Activo',
    activeCampaigns: ['2025/2026', '2026/2027'],
    province: 'Río Negro',
    city: 'Viedma',
    address: 'Camino 4 IDEVI Parcela 104',
    soilType: 'Franco-Arenoso aluvial fértil',
    climate: 'Semiárido de valle irrigado patagónico',
    responsiblePerson: 'Ing. Lucas Ferrando',
    coordinates: { lat: -40.7831, lng: -63.0024 },
    capacityHa: 60,
    irrigationSystem: 'Riego por Gravedad y Canales Matriz',
    notes: 'Chacra de producción intensiva bajo riego sistematizado.'
  },
  {
    id: 'loc-indoor-caba',
    name: 'BioLab Indoor & Clima Controlado CABA',
    siteType: 'Indoor / Laboratorio',
    status: 'Activo',
    activeCampaigns: ['2024/2025', '2025/2026', '2026/2027', '2027/2028'],
    province: 'Buenos Aires',
    city: 'CABA',
    address: 'Polo Tecnológico Parque Patricios',
    soilType: 'Sustrato Controlado',
    climate: 'Atmósfera Controlada (HVAC + LED espectro completo)',
    responsiblePerson: 'Dra. Elena Santillán',
    coordinates: { lat: -34.6345, lng: -58.4060 },
    capacityHa: 0.5,
    irrigationSystem: 'Goteo',
    notes: 'Cámaras de cultivo indoor de precisión para micropropagación, madres y estabilidad genética.'
  },
  {
    id: 'loc-greenhouse-castelar',
    name: 'Invernadero Tecnológico Castelar',
    siteType: 'Invernadero',
    status: 'En Preparación',
    activeCampaigns: ['2026/2027'],
    province: 'Buenos Aires',
    city: 'Castelar',
    address: 'Polo Tecnológico INTA Castelar',
    soilType: 'Sustrato Controlado',
    climate: 'Invernadero automatizado con control de fotoperiodo',
    responsiblePerson: 'Ing. Pablo Morales',
    coordinates: { lat: -34.6225, lng: -58.6730 },
    capacityHa: 1.2,
    irrigationSystem: 'Microaspersión',
    notes: 'En preparación para la próxima campaña 2026/2027 para producción de esquejes certificados.'
  },
  {
    id: 'loc-barbecho-rosas',
    name: 'Establecimiento Las Rosas (En Barbecho)',
    siteType: 'Campo Extensivo',
    status: 'En Barbecho',
    activeCampaigns: ['2024/2025'],
    province: 'Santa Fe',
    city: 'Casilda',
    address: 'Ruta Pcial. 92 Km 18',
    soilType: 'Franco Arcilloso',
    climate: 'Templado húmedo',
    responsiblePerson: 'Ing. Rodrigo Paz',
    coordinates: { lat: -33.0441, lng: -61.1681 },
    capacityHa: 95,
    irrigationSystem: 'Secano (Lluvia)',
    notes: 'Lote en barbecho químico y siembra de cultivos de servicio. Inactivo para la próxima campaña 2025/2026.'
  }
];

export const DEMO_PLOTS: Plot[] = [
  {
    id: 'plot-alfa-cordoba',
    locationId: 'loc-riocuarto',
    projectId: 'proj-fibra-2025',
    varietyId: 'var-uso31',
    name: 'Lote Alfa - Ensayo Densidad Fibra',
    type: 'Ensayo',
    surfaceArea: 14.5,
    surfaceUnit: 'ha',
    density: 55,
    status: 'Activa',
    sowingDate: '2025-10-18',
    ownerName: 'Red Cooperativa Nucleus',
    irrigationType: 'Pivote Central',
    coordinates: { lat: -33.1235, lng: -64.3492 },
    polygon: [
      { lat: -33.1200, lng: -64.3540 },
      { lat: -33.1205, lng: -64.3440 },
      { lat: -33.1270, lng: -64.3445 },
      { lat: -33.1265, lng: -64.3545 }
    ],
    observations: 'Lote piloto Agro 4.0 con sensores edáficos en estrato radicular y reflectancia NDVI Sentinel-2.'
  },
  {
    id: 'plot-beta-pergamino',
    locationId: 'loc-pergamino',
    projectId: 'proj-cbg-2025',
    varietyId: 'var-santhica27',
    name: 'Lote Beta - Santhica Bioeconomía',
    type: 'Producción',
    surfaceArea: 9.0,
    surfaceUnit: 'ha',
    density: 48,
    status: 'Activa',
    sowingDate: '2025-10-25',
    ownerName: 'Consorcio Pergamino Verde',
    irrigationType: 'Secano Tecnificado',
    coordinates: { lat: -33.8912, lng: -60.5731 },
    polygon: [
      { lat: -33.8880, lng: -60.5770 },
      { lat: -33.8885, lng: -60.5690 },
      { lat: -33.8940, lng: -60.5695 },
      { lat: -33.8935, lng: -60.5775 }
    ],
    observations: 'Monitoreo de captura neta de carbono y descompactación radicular en Argiudol.'
  },
  {
    id: 'plot-gamma-patagonia',
    locationId: 'loc-patagonia',
    projectId: 'proj-patagonia-dual',
    varietyId: 'var-futura75',
    name: 'Lote Gamma - Transición Hídrica Patagonia',
    type: 'Ensayo',
    surfaceArea: 22.0,
    surfaceUnit: 'ha',
    density: 50,
    status: 'Activa',
    sowingDate: '2025-11-05',
    ownerName: 'Asociación IDEVI Cáñamo',
    irrigationType: 'Gravedad Presurizada',
    coordinates: { lat: -40.7831, lng: -63.0024 },
    polygon: [
      { lat: -40.7790, lng: -63.0080 },
      { lat: -40.7795, lng: -62.9960 },
      { lat: -40.7865, lng: -62.9965 },
      { lat: -40.7860, lng: -63.0085 }
    ],
    observations: 'Cálculo de eficiencia de uso de agua (WUE) comparativa vs alfalfa bajo riego de cuenca.'
  }
];

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj-fibra-2025',
    name: 'Campaña Fibra Técnica & Biocompuestos 2025/26',
    description: 'Ensayos de densidad y manejo hídrico para producción de fibra larga textil y cañamiza para bioconstrucción.',
    status: 'En Curso',
    startDate: '2025-09-01'
  },
  {
    id: 'proj-cbg-2025',
    name: 'Red Santhica CBG & Suelos Regenerativos',
    description: 'Evaluación agronómica de genéticas zero-THC y regeneración edáfica en rotaciones pampeanas.',
    status: 'En Curso',
    startDate: '2025-10-01'
  }
];

export const DEMO_TRIALS: TrialRecord[] = [
  {
    id: 'trial-1',
    plotId: 'plot-alfa-cordoba',
    date: '2026-01-15',
    stage: 'Vegetativo',
    plantHeight: 215,
    plantsPerMeter: 52,
    vigor: 5,
    yield: 8850,
    createdByName: 'Ing. Gastón Barea',
    createdBy: 'user-admin-nucleus'
  },
  {
    id: 'trial-2',
    plotId: 'plot-beta-pergamino',
    date: '2026-01-20',
    stage: 'Floración',
    plantHeight: 198,
    plantsPerMeter: 46,
    vigor: 4,
    yield: 7900,
    createdByName: 'Ing. Gastón Barea',
    createdBy: 'user-admin-nucleus'
  }
];

export const DEMO_HYDRIC: HydricRecord[] = [
  {
    id: 'hydric-1',
    locationId: 'loc-riocuarto',
    plotId: 'plot-alfa-cordoba',
    date: '2026-01-10',
    type: 'Lluvia',
    amountMm: 45,
    notes: 'Frente de tormenta pampeano.'
  },
  {
    id: 'hydric-2',
    locationId: 'loc-riocuarto',
    plotId: 'plot-alfa-cordoba',
    date: '2026-01-18',
    type: 'Riego',
    amountMm: 30,
    notes: 'Riego complementario por pivote central.'
  },
  {
    id: 'hydric-3',
    locationId: 'loc-pergamino',
    plotId: 'plot-beta-pergamino',
    date: '2026-01-12',
    type: 'Lluvia',
    amountMm: 62,
    notes: 'Precipitación acumulada.'
  }
];

export const DEMO_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Monitoreo Espectral NDVI Sentinel-2',
    description: 'Verificar reflectancia y vigor foliar tras precipitación en Lote Alfa.',
    assignedToIds: ['user-admin-nucleus'],
    dueDate: '2026-02-01',
    status: 'Completada',
    priority: 'Alta',
    createdBy: 'user-admin-nucleus'
  },
  {
    id: 'task-2',
    title: 'Muestreo Edafológico Estratos 0-30cm',
    description: 'Tomar testigos de suelo para análisis de Carbono Orgánico (SOC) y pH.',
    assignedToIds: ['user-admin-nucleus'],
    dueDate: '2026-02-10',
    status: 'Pendiente',
    priority: 'Media',
    createdBy: 'user-admin-nucleus'
  }
];

export const DEMO_STORAGE_POINTS: StoragePoint[] = [
  {
    id: 'sp-riocuarto',
    name: 'Centro de Acopio & Secadero Río Cuarto',
    nodeCode: 'NOD-RC-01',
    type: 'Propio',
    address: 'Parque Industrial Río Cuarto, Lote 14',
    city: 'Río Cuarto',
    province: 'Córdoba',
    coordinates: { lat: -33.1350, lng: -64.3350 },
    surfaceM2: 1200,
    conditions: 'Humedad controlada < 12%, ventilación forzada y control térmico para biomasa y flor seca.',
    notes: 'Nodo principal de secado y acondicionamiento de biomasa para fibra y flor.'
  },
  {
    id: 'sp-pergamino',
    name: 'Depósito Central & Banco de Semillas Pergamino',
    nodeCode: 'NOD-PER-02',
    type: 'Propio',
    address: 'Ruta Nac. 8 Km 226',
    city: 'Pergamino',
    province: 'Buenos Aires',
    coordinates: { lat: -33.8800, lng: -60.5900 },
    surfaceM2: 850,
    conditions: 'Cámara fría a 15°C para conservación de semillas certificadas INASE.',
    notes: 'Almacenamiento de lotes de semillas USO 31, Futura 75 y Santhica 27.'
  },
  {
    id: 'sp-rosario',
    name: 'Terminal Logística Puerto Rosario',
    nodeCode: 'NOD-ROS-03',
    type: 'Tercerizado',
    address: 'Zona Portuaria Sur, Terminal Fluvial',
    city: 'Rosario',
    province: 'Santa Fe',
    coordinates: { lat: -32.9587, lng: -60.6558 },
    surfaceM2: 3000,
    conditions: 'Habilitación SENASA / Aduana para consolidación de contenedores de exportación.',
    notes: 'Nodo de exportación y despacho de grano y fibra procesada.'
  }
];

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'BioGenética Andina & Semillas Certificadas',
    category: 'Semillas',
    legalName: 'BioGenética Andina S.A.',
    cuit: '30-71654321-9',
    country: 'Argentina',
    province: 'Mendoza',
    city: 'Luján de Cuyo',
    address: 'Ruta Panamericana Km 18',
    coordinates: { lat: -33.0035, lng: -68.8680 },
    email: 'contacto@biogenetica.com.ar',
    commercialContact: 'Lic. Sofía Carrizo',
    isOfficialPartner: true,
    notes: 'Proveedor oficial de germoplasma y semillas fiscalizadas con rotulado INASE.'
  },
  {
    id: 'sup-2',
    name: 'Laboratorios Cannatech Innovación',
    category: 'Servicios',
    legalName: 'Cannatech Laboratorios S.R.L.',
    cuit: '30-71987654-2',
    country: 'Argentina',
    province: 'Buenos Aires',
    city: 'Castelar',
    address: 'Polo Tecnológico INTA Castelar, Edificio 4',
    coordinates: { lat: -34.6212, lng: -58.6711 },
    email: 'analitica@cannatech.com.ar',
    commercialContact: 'Dr. Fernando Míguez',
    isOfficialPartner: true,
    notes: 'Laboratorio acreditado para análisis HPLC de cannabinoides, metales pesados y terpenos.'
  },
  {
    id: 'sup-3',
    name: 'AgroInsumos Biológicos del Litoral',
    category: 'Insumos',
    legalName: 'Biológicos del Litoral S.A.',
    cuit: '30-71234567-8',
    country: 'Argentina',
    province: 'Santa Fe',
    city: 'San Lorenzo',
    address: 'Parque Industrial San Lorenzo',
    coordinates: { lat: -32.7483, lng: -60.7325 },
    email: 'ventas@biologicosdellitoral.com.ar',
    commercialContact: 'Ing. Lucas Valenzuela',
    isOfficialPartner: true,
    notes: 'Fertilizantes orgánicos, micorrizas y bioestimulantes certificados para cáñamo.'
  }
];
