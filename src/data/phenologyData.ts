import { HempStageId, HempPhenologicalStage, AgriculturalLaborType } from '../../types';

export const HEMP_BASE_TEMPERATURE = 8.0; // Grados centígrados (Tbase para Cannabis sativa L.)

export const HEMP_PHENOLOGICAL_STAGES: HempPhenologicalStage[] = [
  {
    id: 'BBCH_00_09',
    bbchCode: 'BBCH 00-09',
    name: 'Germinación y Emergencia',
    shortName: 'Emergencia',
    daysRange: [0, 10],
    typicalGdd: 110,
    description: 'Imbibición del aquenio, elongación radicular y emergencia de cotiledones sobre el suelo.',
    keyMorphology: 'Cotiledones carnosos verdes desplegados, aparición del primer par de hojas unifoliadas.',
    recommendedLabors: ['PREPARACION_SUELO', 'SIEMBRA', 'MANEJO_HIDRICO'],
    criticalCare: 'Mantener humedad superficial en los primeros 3 cm sin encharcamiento. Evitar encostrado del suelo.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
  },
  {
    id: 'BBCH_10_19',
    bbchCode: 'BBCH 10-19',
    name: 'Vegetativo Inicial (V1 a V4)',
    shortName: 'Veg. Temprano',
    daysRange: [10, 25],
    typicalGdd: 320,
    description: 'Desarrollo de las 1° a 4° pares de hojas verdaderas trifoliadas y pentafoliadas. Anclaje radicular.',
    keyMorphology: 'Hojas serradas características, elongación del hipocótilo, sistema radicular pivotante activo.',
    recommendedLabors: ['LABOR_CULTURAL', 'FERTIRRIEGO', 'MONITOREO'],
    criticalCare: 'Desmalezado mecánico inter-filas antes del cierre de canopia. Aporte de Fósforo y Zinc para enraizamiento.',
    badgeColor: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300'
  },
  {
    id: 'BBCH_20_39',
    bbchCode: 'BBCH 20-39',
    name: 'Vegetativo Rápido / Gran Elongación',
    shortName: 'Gran Elongación',
    daysRange: [25, 55],
    typicalGdd: 780,
    description: 'Tasa de crecimiento exponencial (3-5 cm/día). Ramificación lateral y rápido cierre del dosel foliar.',
    keyMorphology: 'Entrenudos distanciados, hojas heptafoliadas/nonafoliadas, cobertura de suelo >80%.',
    recommendedLabors: ['FERTIRRIEGO', 'MANEJO_HIDRICO', 'MONITOREO'],
    criticalCare: 'Demanda máxima de Nitrógeno y agua. El dosel sombrea e inhibe malezas de forma natural.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300'
  },
  {
    id: 'BBCH_50_59',
    bbchCode: 'BBCH 50-59',
    name: 'Prefloración / Inducción & Sexado',
    shortName: 'Prefloración & Sexado',
    daysRange: [55, 72],
    typicalGdd: 1100,
    description: 'Detección del fotoperiodo crítico decreciente (<14.5 h). Formación de primordios florales y diferenciación sexual.',
    keyMorphology: 'Estípulas axilares con cálices pistilados (pelos blancos) o estambres masculinos visibles.',
    recommendedLabors: ['MONITOREO', 'LABOR_CULTURAL', 'FERTIRRIEGO'],
    criticalCare: 'Sexado exhaustivo (roguing de machos si el destino es grano feminizado o flor). Aplicación de Boro y Calcio.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300'
  },
  {
    id: 'BBCH_60_69',
    bbchCode: 'BBCH 60-69',
    name: 'Floración Plena',
    shortName: 'Floración Plena',
    daysRange: [72, 95],
    typicalGdd: 1450,
    description: 'Emisión masiva de pistilos o antesis masculina en variedades monoicas. Desarrollo de glándulas resinosas.',
    keyMorphology: 'Densas sumidades floridas, tricomas secretores activos, olor aromático terpenoide intenso.',
    recommendedLabors: ['FITOSANITARIO', 'MANEJO_HIDRICO', 'MONITOREO'],
    criticalCare: 'Cese de fitosanitarios químicos (carencia). Evitar anegamiento y humedad relativa >70% por riesgo de Botrytis.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300'
  },
  {
    id: 'BBCH_70_85',
    bbchCode: 'BBCH 70-85',
    name: 'Llenado y Maduración de Grano / Tricomas',
    shortName: 'Llenado de Grano',
    daysRange: [95, 120],
    typicalGdd: 1750,
    description: 'Fecundación y engrosamiento del aquenio (estado lechoso a pastoso). Maduración de metabolitos secundarios.',
    keyMorphology: 'Semillas duras dentro de las brácteas, tricomas lechosos/ámbar, inicio de amarilleamiento foliar basal.',
    recommendedLabors: ['MONITOREO', 'FITOSANITARIO'],
    criticalCare: 'Monitoreo de orugas de la inflorescencia (Helicoverpa). Muestreo analítico HPLC para cumplimiento de THC (<0.3%).',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
  },
  {
    id: 'BBCH_89_99',
    bbchCode: 'BBCH 89-99',
    name: 'Maduración Fisiológica & Cosecha Óptima',
    shortName: 'Cosecha Óptima',
    daysRange: [120, 135],
    typicalGdd: 1980,
    description: 'Senescencia foliar natural, desecación del tallo y dehiscencia controlada del grano (>70% aquenios jaspeados).',
    keyMorphology: 'Tallo lignificado óptimo para decorticación (fibra) o grano maduro de humedad <12% para trilla.',
    recommendedLabors: ['COSECHA', 'ACONDICIONAMIENTO'],
    criticalCare: 'Corte inmediato en ventana climática seca. Coordinar logística de acopio, cosechadora y transporte.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
  }
];

export const AGRICULTURAL_LABOR_INFO: Record<AgriculturalLaborType, {
  name: string;
  category: string;
  iconName: string;
  defaultCostPerHa: number;
  typicalMachinery: string;
  color: string;
}> = {
  PREPARACION_SUELO: {
    name: 'Preparación de Suelo & Cama de Siembra',
    category: 'Laboreo',
    iconName: 'Tractor',
    defaultCostPerHa: 45,
    typicalMachinery: 'Tractor 140 HP + Rastra Doble Acción / Subsolador',
    color: 'amber'
  },
  SIEMBRA: {
    name: 'Siembra & Calibración Mecánica',
    category: 'Implantación',
    iconName: 'Sprout',
    defaultCostPerHa: 50,
    typicalMachinery: 'Tractor 120 HP + Sembradora Neumática Grano Fino',
    color: 'emerald'
  },
  FERTIRRIEGO: {
    name: 'Fertirriego & Nutrición Foliar',
    category: 'Nutrición',
    iconName: 'Droplets',
    defaultCostPerHa: 35,
    typicalMachinery: 'Equipo de Riego Presurizado / Pulverizadora 3-Puntos',
    color: 'blue'
  },
  FITOSANITARIO: {
    name: 'Tratamiento Fitosanitario / Bioinsumos',
    category: 'Sanidad',
    iconName: 'ShieldAlert',
    defaultCostPerHa: 28,
    typicalMachinery: 'Pulverizadora Autopropulsada / Mochila Motorizada',
    color: 'red'
  },
  MANEJO_HIDRICO: {
    name: 'Manejo Hídrico & Turno de Riego',
    category: 'Riego',
    iconName: 'Waves',
    defaultCostPerHa: 15,
    typicalMachinery: 'Canales de distribución / Motobomba Diésel 6"',
    color: 'cyan'
  },
  LABOR_CULTURAL: {
    name: 'Labor Cultural / Desmalezado Mecánico',
    category: 'Mantenimiento',
    iconName: 'Wrench',
    defaultCostPerHa: 30,
    typicalMachinery: 'Tractor 80 HP + Carpidora Rotativa entre líneas',
    color: 'orange'
  },
  MONITOREO: {
    name: 'Monitoreo Agronómico, Sexado & Muestreo',
    category: 'Monitoreo',
    iconName: 'Search',
    defaultCostPerHa: 12,
    typicalMachinery: 'Cuadrilla Técnica de Campo + Dron Multiespectral',
    color: 'indigo'
  },
  COSECHA: {
    name: 'Corte, Cosecha Combinada & Trilla',
    category: 'Cosecha',
    iconName: 'Scissors',
    defaultCostPerHa: 95,
    typicalMachinery: 'Cosechadora Combinada / Segadora Acondicionadora',
    color: 'purple'
  },
  ACONDICIONAMIENTO: {
    name: 'Acondicionamiento de Rastrojo & Enfardado',
    category: 'Poscosecha',
    iconName: 'Package',
    defaultCostPerHa: 40,
    typicalMachinery: 'Enfardadora Prismática Gigante / Rastrillo Hilerador',
    color: 'stone'
  }
};

/**
 * Calcula días transcurridos desde la fecha de siembra
 */
export function getDaysSinceSowing(sowingDate: string): number {
  if (!sowingDate) return 0;
  const parts = sowingDate.split('-');
  if (parts.length !== 3) return 0;
  const sowingTime = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
  const diffMs = Date.now() - sowingTime;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Estima los GDD acumulados de un lote según días transcurridos y temperaturas medias representativas
 */
export function estimateAccumulatedGdd(daysSinceSowing: number, averageTemp = 23.5): number {
  const dailyGdd = Math.max(0, averageTemp - HEMP_BASE_TEMPERATURE);
  return Math.round(daysSinceSowing * dailyGdd);
}

/**
 * Obtiene el estadio fenológico correspondiente por GDD acumulados
 */
export function getPhenologicalStageByGdd(gdd: number): HempPhenologicalStage {
  if (gdd < 150) return HEMP_PHENOLOGICAL_STAGES[0]; // BBCH 00-09
  if (gdd < 450) return HEMP_PHENOLOGICAL_STAGES[1]; // BBCH 10-19
  if (gdd < 900) return HEMP_PHENOLOGICAL_STAGES[2]; // BBCH 20-39
  if (gdd < 1250) return HEMP_PHENOLOGICAL_STAGES[3]; // BBCH 50-59
  if (gdd < 1600) return HEMP_PHENOLOGICAL_STAGES[4]; // BBCH 60-69
  if (gdd < 1850) return HEMP_PHENOLOGICAL_STAGES[5]; // BBCH 70-85
  return HEMP_PHENOLOGICAL_STAGES[6]; // BBCH 89-99
}

/**
 * Obtiene el estadio fenológico correspondiente por porcentaje del ciclo
 */
export function getPhenologicalStageByCyclePct(pct: number): HempPhenologicalStage {
  if (pct < 8) return HEMP_PHENOLOGICAL_STAGES[0];
  if (pct < 20) return HEMP_PHENOLOGICAL_STAGES[1];
  if (pct < 45) return HEMP_PHENOLOGICAL_STAGES[2];
  if (pct < 60) return HEMP_PHENOLOGICAL_STAGES[3];
  if (pct < 78) return HEMP_PHENOLOGICAL_STAGES[4];
  if (pct < 92) return HEMP_PHENOLOGICAL_STAGES[5];
  return HEMP_PHENOLOGICAL_STAGES[6];
}
