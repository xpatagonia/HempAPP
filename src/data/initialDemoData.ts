import { 
  User, Location, Plot, Variety, TrialRecord, Project, Task, HydricRecord 
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
    province: 'Córdoba',
    city: 'Río Cuarto',
    address: 'Ruta Nac. 36 Km 601',
    soilType: 'Franco-Limoso con buena retención hídrica',
    climate: 'Templado subhúmedo de transición',
    responsiblePerson: 'Ing. Agr. Gastón Barea',
    coordinates: { lat: -33.1235, lng: -64.3492 },
    capacityHa: 85,
    irrigationSystem: 'Pivote Central y Goteo Subterráneo'
  },
  {
    id: 'loc-pergamino',
    name: 'Campo Demostrativo Pergamino',
    province: 'Buenos Aires',
    city: 'Pergamino',
    address: 'Ruta Nac. 8 Km 224',
    soilType: 'Argiudol Típico (Franco-Arcilloso)',
    climate: 'Templado pampeano húmedo',
    responsiblePerson: 'Ing. Téc. Marcos Gómez',
    coordinates: { lat: -33.8912, lng: -60.5731 },
    capacityHa: 120,
    irrigationSystem: 'Secano Tecnificado con microaspersión complementaria'
  },
  {
    id: 'loc-patagonia',
    name: 'Valle Inferior Río Negro (IDEVI)',
    province: 'Río Negro',
    city: 'Viedma',
    address: 'Camino 4 IDEVI Parcela 104',
    soilType: 'Franco-Arenoso aluvial fértil',
    climate: 'Semiárido de valle irrigado patagónico',
    responsiblePerson: 'Ing. Lucas Ferrando',
    coordinates: { lat: -40.7831, lng: -63.0024 },
    capacityHa: 60,
    irrigationSystem: 'Riego por Gravedad y Canales Matriz'
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
