import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  TrialRecord,
  Location,
  FieldLog,
  HydricRecord,
  Task,
  AgriculturalLaborType,
  HempStageId,
  AgrochemicalApplication,
  AgrochemicalCategory,
  ToxicologicalBand,
  Resource
} from '../types';
import { PlotCycleClosureModal } from '../components/PlotCycleClosureModal';
import {
  FlaskConical,
  Save,
  Calendar,
  Activity,
  Ruler,
  Droplets,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  History,
  TrendingUp,
  Sun,
  Loader2,
  ExternalLink,
  Filter,
  Search,
  Sprout,
  ChevronLeft,
  Edit2,
  Trash2,
  X,
  Camera,
  Upload,
  CloudRain,
  Tractor,
  RefreshCw,
  Layers,
  MapPin,
  Dna,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Award,
  Timer,
  ShieldCheck,
  Bug
} from 'lucide-react';

const fastUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const calculateLunarPhase = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  const cycle = 29.53058867;
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const diff = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const pos = (((diff % cycle) + cycle) % cycle) / cycle;
  if (pos < 0.06 || pos >= 0.94) return 'Nueva';
  if (pos < 0.44) return 'Creciente';
  if (pos < 0.56) return 'Llena';
  return 'Menguante';
};

function addDaysToIsoDate(isoDateStr: string, daysToAdd: number): string {
  const base = new Date((isoDateStr || new Date().toISOString().split('T')[0]) + 'T12:00:00Z');
  if (isNaN(base.getTime())) return new Date().toISOString().split('T')[0];
  base.setUTCDate(base.getUTCDate() + Math.round(daysToAdd));
  return base.toISOString().split('T')[0];
}

// Paleta agronómica oficial por Fase Fenológica (Fisiológica y BBCH)
export type PhenologicalStageKey = 'Emergencia' | 'Vegetativo' | 'Floración' | 'Maduración' | 'Cosecha';

const PHENOLOGICAL_STAGE_META: Record<
  PhenologicalStageKey,
  {
    label: PhenologicalStageKey;
    bbchHint: string;
    defaultBbch: HempStageId;
    dotClass: string;
    activeBtnClass: string;
    inactiveBtnClass: string;
    badgeClass: string;
  }
> = {
  Emergencia: {
    label: 'Emergencia',
    bbchHint: 'BBCH 00-09',
    defaultBbch: 'BBCH_00_09',
    dotClass: 'bg-sky-400',
    activeBtnClass:
      'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-500/30',
    inactiveBtnClass:
      'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-700 dark:text-sky-300',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
  },
  Vegetativo: {
    label: 'Vegetativo',
    bbchHint: 'BBCH 10-39',
    defaultBbch: 'BBCH_20_39',
    dotClass: 'bg-emerald-400',
    activeBtnClass:
      'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30',
    inactiveBtnClass:
      'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
  },
  Floración: {
    label: 'Floración',
    bbchHint: 'BBCH 50-69',
    defaultBbch: 'BBCH_60_69',
    dotClass: 'bg-purple-400',
    activeBtnClass:
      'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-500/30',
    inactiveBtnClass:
      'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
  },
  Maduración: {
    label: 'Maduración',
    bbchHint: 'BBCH 70-85',
    defaultBbch: 'BBCH_70_85',
    dotClass: 'bg-amber-400',
    activeBtnClass:
      'bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/30',
    inactiveBtnClass:
      'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
  },
  Cosecha: {
    label: 'Cosecha',
    bbchHint: 'BBCH 89-99',
    defaultBbch: 'BBCH_89_99',
    dotClass: 'bg-rose-400',
    activeBtnClass:
      'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/25 ring-2 ring-rose-500/30',
    inactiveBtnClass:
      'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-700 dark:text-rose-300',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
  }
};

function getStageMeta(stage?: string) {
  if (stage && stage in PHENOLOGICAL_STAGE_META) {
    return PHENOLOGICAL_STAGE_META[stage as PhenologicalStageKey];
  }
  return PHENOLOGICAL_STAGE_META.Vegetativo;
}

function getBbchSelectColorClass(bbch?: HempStageId): string {
  switch (bbch) {
    case 'BBCH_00_09':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
    case 'BBCH_10_19':
    case 'BBCH_20_39':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'BBCH_50_59':
    case 'BBCH_60_69':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
    case 'BBCH_70_85':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'BBCH_89_99':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    default:
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  }
}

// Compresión cliente para fotografías de bitácora tomadas desde cámara móvil o escritorio
async function compressImageFileToDataUrl(file: File, maxDimension = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const QUICK_LABOR_PRESETS: Array<{
  label: string;
  laborType: AgriculturalLaborType;
  title: string;
  description: string;
  tractor: string;
  implement: string;
  stage: HempStageId;
}> = [
  {
    label: 'Preparación de Suelo (Cincel + Rastra)',
    laborType: 'PREPARACION_SUELO',
    title: 'Cincelado profundo + Rastra de disco (Cama de siembra)',
    description: 'Roturación vertical a 30 cm, desterronado superficial y refinado de cama de siembra.',
    tractor: 'Tractor John Deere 5090E (90 HP)',
    implement: 'Cincel 7 púas + Rastra excéntrica',
    stage: 'BBCH_00_09'
  },
  {
    label: 'Nivelación y Rolado Pre-Siembra',
    laborType: 'PREPARACION_SUELO',
    title: 'Nivelación láser y rolado de compactación superficial',
    description: 'Acondicionamiento de micro-relieve para uniformidad de riego y profundidad de semilla.',
    tractor: 'Tractor Pauny 210A',
    implement: 'Rolo compactador + Niveladora',
    stage: 'BBCH_00_09'
  },
  {
    label: 'Desmalezado Mecánico / Escardillo',
    laborType: 'LABOR_CULTURAL',
    title: 'Control mecánico de malezas en entrelínea y aporque',
    description: 'Escardillado superficial entre hileras para oxigenación radicular y supresión de competencia.',
    tractor: 'Tractor Kubota B2420',
    implement: 'Escardillo cultivador de 5 cuerpos',
    stage: 'BBCH_20_39'
  },
  {
    label: 'Fertirriego / Enmienda Orgánica',
    laborType: 'FERTIRRIEGO',
    title: 'Inyección de bioestimulante radicular y nitrógeno asimilable',
    description: 'Aplicación fraccionada en línea de goteo durante elongación vegetativa.',
    tractor: 'Cabezal Venturi Automatizado',
    implement: 'Sistema de Goteo Compensado',
    stage: 'BBCH_20_39'
  },
  {
    label: 'Inspección y Sexado / Roguing',
    laborType: 'MONITOREO',
    title: 'Recorrida de depuración varietal (Roguing) e inducción floral',
    description: 'Eliminación de plantas fuera de tipo y verificación de fotoperiodo crítico.',
    tractor: 'Cuadrilla Técnica de Campo',
    implement: 'Instrumental de Muestreo GACP',
    stage: 'BBCH_50_59'
  }
];

const QUICK_AGRO_PRESETS: Array<{
  label: string;
  category: AgrochemicalCategory;
  productName: string;
  activeIngredient: string;
  senasaRegisterNumber: string;
  batchNumber: string;
  dosagePerHa: number;
  dosageUnit: AgrochemicalApplication['dosageUnit'];
  safetyPeriodDays: number;
  applicationMethod: AgrochemicalApplication['applicationMethod'];
  toxicologicalClass: ToxicologicalBand;
  targetPestOrDisease: string;
}> = [
  {
    label: '🌱 Mejorador Suelo: Húmicos + Micorrizas',
    category: 'Mejorador de Suelo',
    productName: 'HumiFulvic Complex + Glomus intraradices',
    activeIngredient: 'Ácidos Húmicos 15% + Fúlvicos 8% + Micorrizas',
    senasaRegisterNumber: 'SENASA-ENM-9042-AR',
    batchNumber: 'HUMI-SOIL-26A',
    dosagePerHa: 5.0,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 0,
    applicationMethod: 'Fertirriego',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    targetPestOrDisease: 'Estructura edáfica, CIC y floculación radicular'
  },
  {
    label: '🧬 Biocontrol Suelo: Trichoderma TH-35',
    category: 'Bioestimulante',
    productName: 'Trichoderma harzianum TH-35 Líquido',
    activeIngredient: 'Trichoderma harzianum 1x10^9 UFC/ml',
    senasaRegisterNumber: 'SENASA-REG-BIO-4491-SF',
    batchNumber: 'LOT-BIO-TRICHO-25B',
    dosagePerHa: 1.5,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 0,
    applicationMethod: 'Fertirriego',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    targetPestOrDisease: 'Prevención Fusarium / Pythium / Sclerotinia'
  },
  {
    label: '⚡ Fertilizante Edáfico: N + Aminoácidos',
    category: 'Fertilizante Edáfico',
    productName: 'NitroHemp Bio-Amin L-Libre',
    activeIngredient: 'Nitrógeno Orgánico 12% + L-Aminoácidos 18%',
    senasaRegisterNumber: 'SENASA-FERT-3109-AR',
    batchNumber: 'NITRO-2026-04',
    dosagePerHa: 4.0,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 0,
    applicationMethod: 'Fertirriego',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    targetPestOrDisease: 'Elongación vegetativa y corrección clorosis N'
  },
  {
    label: '🍃 Fertilizante Foliar: P+B+Zn Pre-Flora',
    category: 'Fertilizante Foliar',
    productName: 'YaraVita CropBoost',
    activeIngredient: 'Fósforo 20% + Magnesio 4% + Cinc 3% + Boro 1%',
    senasaRegisterNumber: 'SENASA N° 15.892/2019',
    batchNumber: 'YARA-8821-X',
    dosagePerHa: 2.5,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 7,
    applicationMethod: 'Pulverización Terrestre',
    toxicologicalClass: 'Banda Verde (Banda IV - Poco Peligroso)',
    targetPestOrDisease: 'Inducción floral y cuaje de semilla'
  },
  {
    label: '🐛 Insecticida Bio: Bacillus thuringiensis',
    category: 'Insecticida',
    productName: 'BioBt Kurstaki HD-1',
    activeIngredient: 'Bacillus thuringiensis var. kurstaki 32.000 UI/mg',
    senasaRegisterNumber: 'SENASA N° 34.112/2021',
    batchNumber: 'BTK-2026-19',
    dosagePerHa: 1.2,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 3,
    applicationMethod: 'Pulverización Terrestre',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    targetPestOrDisease: 'Oruga Cogollera (Helicoverpa) / Isocas'
  },
  {
    label: '🛡️ Insecticida/Acaricida: Neem + Potásico',
    category: 'Insecticida',
    productName: 'Azadiractina Neem 1.2% EC + Jabón Potásico',
    activeIngredient: 'Azadiractina 1.2% + Sales Potásicas de Ácidos Grasos',
    senasaRegisterNumber: 'SENASA-BIO-7781-AR',
    batchNumber: 'NEEM-26-09',
    dosagePerHa: 2.0,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 3,
    applicationMethod: 'Pulverización Terrestre',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    targetPestOrDisease: 'Arañuela Roja / Pulgón Phorodon cannabis / Trips'
  }
];

const HEMP_PESTS_CATALOG = [
  'Oruga Cogollera (Helicoverpa)',
  'Arañuela Roja (Tetranychus)',
  'Pulgón (Phorodon cannabis)',
  'Trips (Frankliniella)',
  'Chinche Verde (Nezara)',
  'Hormigas Cortadoras'
];

const HEMP_DISEASES_CATALOG = [
  'Botrytis cinerea (Moho Gris)',
  'Fusarium oxysporum',
  'Sclerotinia sclerotiorum',
  'Oídio (Golovinomyces)',
  'Pythium / Damping-off'
];

const HEMP_BENEFICIAL_FAUNA = [
  'Coccinélidos (Vaquitas)',
  'Crisopas (Chrysoperla)',
  'Chinche Pirata (Orius)',
  'Avispas Trichogramma',
  'Sírfidos / Abejas'
];

export default function TrialManager() {
  const {
    plots,
    trialRecords,
    addTrialRecord,
    updateTrialRecord,
    deleteTrialRecord,
    currentUser,
    locations,
    varieties,
    logs,
    addLog,
    deleteLog,
    hydricRecords,
    addHydricRecord,
    tasks,
    addTask,
    deleteTask,
    resources,
    agrochemicalApplications,
    addAgrochemicalApplication,
    deleteAgrochemicalApplication,
    updatePlotPhenology,
    closePlotCycle,
    syncAllPlotsContinuousRainfall,
    isSyncingGlobalRainfall
  } = useAppContext();

  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [justSaved, setJustSaved] = useState(false);
  const [saveSummaryBanner, setSaveSummaryBanner] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingConditions, setIsFetchingConditions] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'trials' | 'logs' | 'hydric' | 'labors' | 'phytosanitary'>('all');
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Modo ergonómico para Celular / Tablet: permite contraer la cola de lotes tras elegir parcela
  const [isMobileQueueOpen, setIsMobileQueueOpen] = useState<boolean>(false);
  const [fieldViewSection, setFieldViewSection] = useState<'all' | 'biometrics' | 'shortcuts' | 'harvest'>('all');
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  // Filtros en cascada de la Cola de Recorrida
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [varietyFilter, setVarietyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'uptodate' | 'harvest_window'>('all');

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Estados de Programación de Cosecha y Modal Oficial de Cierre de Ciclo
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [scheduleHarvestDateInput, setScheduleHarvestDateInput] = useState<string>('');
  const [grainMoistureFieldPct, setGrainMoistureFieldPct] = useState<number>(13.5);
  const [isSchedulingHarvest, setIsSchedulingHarvest] = useState(false);

  // ============================================================================
  // ESTADOS DE LOS 4 ATAJOS OPERATIVOS DE CAMPO (SINCRONIZADOS CON PLOTDETAILS Y CUADERNO FITOSANITARIO)
  // ============================================================================
  const [activeShortcutTab, setActiveShortcutTab] = useState<'photo_log' | 'hydric' | 'labor' | 'phytosanitary'>('photo_log');

  // Atajo 1: Bitácora Multimedia & Toma Fotográfica In-Situ
  const [quickLogNote, setQuickLogNote] = useState('');
  const [quickLogPhoto, setQuickLogPhoto] = useState('');
  const [autoAttachBiometricsToLog, setAutoAttachBiometricsToLog] = useState(true);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSavingQuickLog, setIsSavingQuickLog] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement | null>(null);
  const fileInputMobileCamRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Atajo 2: Pluviómetro Físico & Riego Suplementario
  const [quickHydricType, setQuickHydricType] = useState<'Riego' | 'Lluvia'>('Riego');
  const [quickHydricMm, setQuickHydricMm] = useState<string>('');
  const [quickHydricStartTime, setQuickHydricStartTime] = useState<string>('08:00');
  const [quickHydricEndTime, setQuickHydricEndTime] = useState<string>('10:00');
  const [quickHydricNotes, setQuickHydricNotes] = useState<string>(
    'Riego por goteo suplementario verificado en recorrida'
  );
  const [isSavingQuickHydric, setIsSavingQuickHydric] = useState(false);

  // Atajo 3: Labores Culturales & Preparación de Suelo
  const [quickLaborType, setQuickLaborType] = useState<AgriculturalLaborType>('PREPARACION_SUELO');
  const [quickLaborTitle, setQuickLaborTitle] = useState<string>('');
  const [quickLaborDescription, setQuickLaborDescription] = useState<string>('');
  const [quickLaborTractor, setQuickLaborTractor] = useState<string>('Tractor John Deere 5090E (90 HP)');
  const [quickLaborImplement, setQuickLaborImplement] = useState<string>('Cincel 7 púas + Rastra excéntrica');
  const [quickLaborStatus, setQuickLaborStatus] = useState<Task['status']>('Completada');
  const [quickLaborApplyBlock, setQuickLaborApplyBlock] = useState<boolean>(false);
  const [isSavingQuickLabor, setIsSavingQuickLabor] = useState(false);

  // Atajo 4: Cuaderno Fitosanitario SENASA (Fertilizantes, Mejoradores de Suelo e Insecticidas/Fungicidas vinculados a Base de Datos)
  const [quickAgroCategory, setQuickAgroCategory] = useState<AgrochemicalCategory>('Mejorador de Suelo');
  const [quickAgroProduct, setQuickAgroProduct] = useState<string>('HumiFulvic Complex + Glomus intraradices');
  const [isCustomAgroProduct, setIsCustomAgroProduct] = useState<boolean>(false);
  const [quickAgroActiveIngredient, setQuickAgroActiveIngredient] = useState<string>(
    'Ácidos Húmicos 15% + Ácidos Fúlvicos 8% + Endomicorrizas'
  );
  const [quickAgroSenasa, setQuickAgroSenasa] = useState<string>('SENASA-ENM-9042-AR');
  const [quickAgroBatch, setQuickAgroBatch] = useState<string>('HUMI-SOIL-26A');
  const [quickAgroDosage, setQuickAgroDosage] = useState<string>('5.0');
  const [quickAgroUnit, setQuickAgroUnit] = useState<AgrochemicalApplication['dosageUnit']>('L/ha');
  const [quickAgroSafetyDays, setQuickAgroSafetyDays] = useState<string>('0');
  const [quickAgroMethod, setQuickAgroMethod] = useState<AgrochemicalApplication['applicationMethod']>('Fertirriego');
  const [quickAgroToxClass, setQuickAgroToxClass] = useState<ToxicologicalBand>('Biológico / Orgánico Certificado');
  const [quickAgroTarget, setQuickAgroTarget] = useState<string>(
    'Estructura edáfica, CIC, floculación de arcillas y retención hídrica'
  );
  const [quickAgroSupplierName, setQuickAgroSupplierName] = useState<string>(
    'BioFábrica & Insumos Agrícolas Red HempC'
  );
  const [quickAgroManufacturer, setQuickAgroManufacturer] = useState<string>('BioTerra Patagonia Labs');
  const [quickAgroNotes, setQuickAgroNotes] = useState<string>('');
  const [isSavingQuickAgro, setIsSavingQuickAgro] = useState(false);

  // Catálogo relacional de Productos Comerciales Prescriptos desde la Base de Datos (`resources`) filtrado por Categoría Insumo
  const prescribedProductsByCategory = useMemo(() => {
    const matched = resources.filter(r => {
      if (r.agroCategory) return r.agroCategory === quickAgroCategory;
      if (
        quickAgroCategory === 'Fertilizante Edáfico' ||
        quickAgroCategory === 'Fertilizante Foliar' ||
        quickAgroCategory === 'Mejorador de Suelo' ||
        quickAgroCategory === 'Enmienda Orgánica'
      ) {
        return r.type === 'Fertilizante';
      }
      return r.type === 'Fitosanitario';
    });
    return matched;
  }, [resources, quickAgroCategory]);

  const applyCatalogResourceToQuickAgro = (res: Resource) => {
    setIsCustomAgroProduct(false);
    setQuickAgroProduct(res.name);
    if (res.agroCategory) setQuickAgroCategory(res.agroCategory);
    setQuickAgroActiveIngredient(res.activeIngredient || 'Insumo Agrícola Homologado');
    setQuickAgroDosage(String(res.recommendedDosagePerHa ?? 2.0));
    setQuickAgroUnit(res.dosageUnit || (res.unit === 'kg' ? 'kg/ha' : 'L/ha'));
    setQuickAgroSafetyDays(String(res.safetyPeriodDays ?? 0));
    setQuickAgroMethod(res.applicationMethod || 'Pulverización Terrestre');
    setQuickAgroSenasa(res.senasaRegisterNumber || 'SENASA-OFICIAL');
    setQuickAgroBatch(res.batchNumber || 'LOT-2026-A');
    setQuickAgroToxClass(res.toxicologicalClass || 'Biológico / Orgánico Certificado');
    setQuickAgroTarget(res.targetPestOrDisease || '');
    setQuickAgroSupplierName(res.supplierName || 'BioFábrica & Insumos Agrícolas Red HempC');
    setQuickAgroManufacturer(res.manufacturer || 'Elaborador Homologado GACP');
  };

  const handleQuickAgroCategoryChange = (newCategory: AgrochemicalCategory) => {
    setQuickAgroCategory(newCategory);
    const categoryProducts = resources.filter(r => r.agroCategory === newCategory);
    if (categoryProducts.length > 0) {
      applyCatalogResourceToQuickAgro(categoryProducts[0]);
    } else {
      const presetMatch = QUICK_AGRO_PRESETS.find(p => p.category === newCategory);
      if (presetMatch) {
        setIsCustomAgroProduct(false);
        setQuickAgroProduct(presetMatch.productName);
        setQuickAgroActiveIngredient(presetMatch.activeIngredient);
        setQuickAgroDosage(String(presetMatch.dosagePerHa));
        setQuickAgroUnit(presetMatch.dosageUnit);
        setQuickAgroMethod(presetMatch.applicationMethod);
        setQuickAgroSafetyDays(String(presetMatch.safetyPeriodDays));
        setQuickAgroSenasa(presetMatch.senasaRegisterNumber);
        setQuickAgroBatch(presetMatch.batchNumber);
        setQuickAgroToxClass(presetMatch.toxicologicalClass);
        setQuickAgroTarget(presetMatch.targetPestOrDisease);
      } else {
        setIsCustomAgroProduct(true);
        setQuickAgroProduct('');
      }
    }
  };

  // Valores predeterminados oficiales sincronizados con Nucleus Trace
  const [formData, setFormData] = useState<Partial<TrialRecord>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    stage: 'Vegetativo',
    temperature: 18,
    humidity: 65,
    lightHours: 13.17,
    lunarPhase: 'Nueva',
    plantsPerMeter: 0,
    plantHeight: 0,
    vigor: 9,
    uniformity: 9,
    lodging: 1,
    birdDamage: 1,
    diseasesScore: 1,
    pestsScore: 1,
    detectedPests: [],
    detectedDiseases: [],
    beneficialFauna: ['Coccinélidos (Vaquitas)'],
    pestThresholdStatus: 'Sin Presión',
    nutritionalStatus: 'Óptimo / Balanceado',
    soilConditionNotes: '',
    floweringDate: '',
    seedYield: 0,
    stemWeight: 0,
    seedQualityGermination: 90,
    seedQualityNonConformity: 0
  });

  // ============================================================================
  // 1. PARCELAS ACTIVAS ENRIQUECIDAS CON RELOJ DE COSECHA Y PROYECCIÓN COMERCIAL
  // ============================================================================
  const allEnrichedActivePlots = useMemo(() => {
    const active = plots.filter(p => p.status === 'Activa');

    return active
      .map(p => {
        const pRecords = trialRecords.filter(r => r.plotId === p.id);
        pRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastRecord = pRecords[0];
        const lastDate = lastRecord ? new Date(lastRecord.date).getTime() : 0;
        const daysSince = lastRecord ? Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)) : 999;
        const loc = locations.find(l => l.id === p.locationId);
        const varObj = varieties.find(v => v.id === p.varietyId);

        // Superficie convertida a hectáreas para totales de tablero y proyección comercial
        const rawSurface = Number(p.surfaceArea || 0);
        const areaM2 =
          p.surfaceUnit === 'm2' ? rawSurface : p.surfaceUnit === 'ac' ? rawSurface * 4046.86 : rawSurface * 10000;
        const areaHa = Number((areaM2 / 10000).toFixed(4));

        // Reloj Biológico de Cosecha basado en Fecha de Siembra + Germoplasma (cycleDays)
        const sowDateIso = p.sowingDate || '2025-10-15';
        const sowTime = new Date(sowDateIso + 'T12:00:00Z').getTime();
        const dds = Math.max(0, Math.floor((Date.now() - sowTime) / 86400000));
        const cycleDays = Number(varObj?.cycleDays || 120);
        const usage = varObj?.usage || 'Dual';

        // Si el germoplasma es exclusivamente para Fibra, la ventana óptima de corte es en fin de floración (~18d antes de madurez de grano)
        const optimalBiologicalHarvestDate = addDaysToIsoDate(sowDateIso, cycleDays);
        const optimalFiberCutDate = addDaysToIsoDate(sowDateIso, Math.max(65, cycleDays - 18));
        const targetHarvestDate =
          p.scheduledHarvestDate || (usage === 'Fibra' ? optimalFiberCutDate : optimalBiologicalHarvestDate);

        const targetHarvestTime = new Date(targetHarvestDate + 'T12:00:00Z').getTime();
        const daysToHarvest = Math.ceil((targetHarvestTime - Date.now()) / 86400000);
        const cycleProgressPct = Math.min(100, Math.round((dds / Math.max(1, cycleDays)) * 100));

        // Proyección comercial de cosecha (Grano en kg y Fibra/Tallo en Tn)
        const vigorScore = lastRecord?.vigor || 8;
        const vigorFactor = 0.72 + (vigorScore / 9) * 0.28;
        const baseGrainKgHa =
          varObj?.expectedGrainYieldKgHa ||
          (usage === 'Grano' ? 1250 : usage === 'Dual' ? 980 : usage === 'Medicinal' ? 650 : 450);
        const baseFiberTnHa =
          varObj?.expectedFiberYieldTnHa ||
          (usage === 'Fibra' ? 8.8 : usage === 'Dual' ? 6.5 : usage === 'Grano' ? 4.2 : 2.8);

        // Si ya hay muestreo de campo (g/m²), 1 g/m² = 10 kg/ha; si no, usamos potencial genético ajustado por vigor
        const projectedGrainKgHa =
          lastRecord?.seedYield && lastRecord.seedYield > 0
            ? Math.round(lastRecord.seedYield * 10)
            : Math.round(baseGrainKgHa * vigorFactor);
        const projectedFiberTnHa =
          lastRecord?.stemWeight && lastRecord.stemWeight > 0
            ? Number(((lastRecord.stemWeight * 10) / 1000).toFixed(2))
            : Number((baseFiberTnHa * vigorFactor).toFixed(2));

        const projectedPlotGrainKg = Math.round(projectedGrainKgHa * areaHa);
        const projectedPlotFiberTn = Number((projectedFiberTnHa * areaHa).toFixed(2));

        // Cotejo Hídrico de la parcela (desde fecha de siembra)
        const pHydric = hydricRecords.filter(
          r => (r.plotId === p.id || (r.locationId === p.locationId && !r.plotId)) && r.date >= sowDateIso
        );
        const rainMm = Number(
          pHydric
            .filter(r => r.type === 'Lluvia')
            .reduce((s, r) => s + Number(r.amountMm || 0), 0)
            .toFixed(1)
        );
        const irrigMm = Number(
          pHydric
            .filter(r => r.type === 'Riego')
            .reduce((s, r) => s + Number(r.amountMm || 0), 0)
            .toFixed(1)
        );
        const totalWaterMm = Number((rainMm + irrigMm).toFixed(1));

        // Cotejo Bitácora Multimedia y Labores
        const pLogs = logs.filter(l => l.plotId === p.id);
        const pTasks = tasks.filter(t => t.plotId === p.id);
        const soilPrepCount = pTasks.filter(
          t => t.laborType === 'PREPARACION_SUELO' || t.laborType === 'SIEMBRA'
        ).length;

        return {
          plot: p,
          lastRecord,
          daysSince,
          locationName: loc?.name || 'S/D',
          varietyName: varObj?.name || 'S/D',
          varietyUsage: usage,
          location: loc,
          areaM2,
          areaHa,
          dds,
          cycleDays,
          optimalBiologicalHarvestDate,
          optimalFiberCutDate,
          targetHarvestDate,
          daysToHarvest,
          cycleProgressPct,
          projectedGrainKgHa,
          projectedFiberTnHa,
          projectedPlotGrainKg,
          projectedPlotFiberTn,
          rainMm,
          irrigMm,
          totalWaterMm,
          logsCount: pLogs.length,
          photosCount: pLogs.filter(l => Boolean(l.photoUrl)).length,
          tasksCount: pTasks.length,
          soilPrepCount
        };
      })
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [plots, trialRecords, locations, varieties, hydricRecords, logs, tasks]);

  // Opciones del Filtro 1: Establecimientos con conteo real de Ensayos y Producción
  const locationFilterOptions = useMemo(() => {
    return locations
      .map(loc => {
        const locPlots = allEnrichedActivePlots.filter(item => item.plot.locationId === loc.id);
        const ensayosCount = locPlots.filter(item => item.plot.type === 'Ensayo').length;
        const produccionCount = locPlots.filter(item => item.plot.type === 'Producción').length;
        return {
          id: loc.id,
          name: loc.name,
          province: loc.province,
          totalPlots: locPlots.length,
          ensayosCount,
          produccionCount
        };
      })
      .filter(opt => opt.totalPlots > 0);
  }, [locations, allEnrichedActivePlots]);

  // Opciones del Filtro 2 (EN CASCADA): Únicamente las genéticas asignadas al Establecimiento seleccionado
  const availableVarietiesForSelectedLocation = useMemo(() => {
    const plotsInLocation =
      locationFilter === 'all'
        ? allEnrichedActivePlots
        : allEnrichedActivePlots.filter(item => item.plot.locationId === locationFilter);

    const byVariety = new Map<
      string,
      { id: string; name: string; totalPlots: number; ensayosCount: number; produccionCount: number }
    >();

    plotsInLocation.forEach(item => {
      const vId = item.plot.varietyId;
      if (!vId) return;
      const existing = byVariety.get(vId);
      if (existing) {
        existing.totalPlots += 1;
        if (item.plot.type === 'Ensayo') existing.ensayosCount += 1;
        if (item.plot.type === 'Producción') existing.produccionCount += 1;
      } else {
        byVariety.set(vId, {
          id: vId,
          name: item.varietyName,
          totalPlots: 1,
          ensayosCount: item.plot.type === 'Ensayo' ? 1 : 0,
          produccionCount: item.plot.type === 'Producción' ? 1 : 0
        });
      }
    });

    return Array.from(byVariety.values()).sort((a, b) => b.totalPlots - a.totalPlots || a.name.localeCompare(b.name));
  }, [allEnrichedActivePlots, locationFilter]);

  // Si al cambiar de Establecimiento la genética antes elegida no existe en ese campo, resetear a 'all'
  useEffect(() => {
    if (varietyFilter !== 'all' && !availableVarietiesForSelectedLocation.some(v => v.id === varietyFilter)) {
      setVarietyFilter('all');
    }
  }, [locationFilter, varietyFilter, availableVarietiesForSelectedLocation]);

  // Subconjunto filtrado por Establecimiento + Genética + Búsqueda (base para los contadores de Ensayo vs Producción)
  const baseScopedPlots = useMemo(() => {
    return allEnrichedActivePlots.filter(item => {
      if (locationFilter !== 'all' && item.plot.locationId !== locationFilter) return false;
      if (varietyFilter !== 'all' && item.plot.varietyId !== varietyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.plot.name.toLowerCase().includes(q) ||
          item.locationName.toLowerCase().includes(q) ||
          item.varietyName.toLowerCase().includes(q) ||
          (item.plot.block || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allEnrichedActivePlots, locationFilter, varietyFilter, searchQuery]);

  // Métricas de Tablero (Ensayos vs Producción, Urgentes, Ventana de Cosecha y Volumen Pre-Venta)
  const boardStats = useMemo(() => {
    const total = baseScopedPlots.length;
    const ensayos = baseScopedPlots.filter(i => i.plot.type === 'Ensayo');
    const produccion = baseScopedPlots.filter(i => i.plot.type === 'Producción');
    const urgent = baseScopedPlots.filter(i => i.daysSince > 7);
    const upToDate = baseScopedPlots.filter(i => i.daysSince <= 7);
    const harvestWindow = baseScopedPlots.filter(
      i => i.daysToHarvest <= 30 || Boolean(i.plot.isHarvestScheduled) || i.cycleProgressPct >= 75
    );

    const ensayosHa = Number(ensayos.reduce((s, i) => s + i.areaHa, 0).toFixed(2));
    const produccionHa = Number(produccion.reduce((s, i) => s + i.areaHa, 0).toFixed(2));
    const totalHa = Number((ensayosHa + produccionHa).toFixed(2));

    const totalProjectedGrainKg = baseScopedPlots.reduce((s, i) => s + i.projectedPlotGrainKg, 0);
    const totalProjectedFiberTn = Number(
      baseScopedPlots.reduce((s, i) => s + i.projectedPlotFiberTn, 0).toFixed(1)
    );

    return {
      total,
      totalHa,
      ensayosCount: ensayos.length,
      ensayosHa,
      produccionCount: produccion.length,
      produccionHa,
      urgentCount: urgent.length,
      upToDateCount: upToDate.length,
      harvestWindowCount: harvestWindow.length,
      totalProjectedGrainKg,
      totalProjectedFiberTn
    };
  }, [baseScopedPlots]);

  // Cola final aplicando también el filtro de Tipo ('Ensayo' | 'Producción') y Urgencia / Ventana de Cosecha
  const plotQueue = useMemo(() => {
    return baseScopedPlots.filter(item => {
      if (typeFilter !== 'all' && item.plot.type !== typeFilter) return false;
      if (urgencyFilter === 'urgent' && item.daysSince <= 7) return false;
      if (urgencyFilter === 'uptodate' && item.daysSince > 7) return false;
      if (
        urgencyFilter === 'harvest_window' &&
        item.daysToHarvest > 30 &&
        !item.plot.isHarvestScheduled &&
        item.cycleProgressPct < 75
      ) {
        return false;
      }
      return true;
    });
  }, [baseScopedPlots, typeFilter, urgencyFilter]);

  const currentPlotData = useMemo(
    () => plotQueue.find(item => item.plot.id === selectedPlotId) || plotQueue[0],
    [plotQueue, selectedPlotId]
  );
  const currentPlotIndex = useMemo(
    () => (currentPlotData ? plotQueue.findIndex(item => item.plot.id === currentPlotData.plot.id) : -1),
    [plotQueue, currentPlotData]
  );
  const variety = varieties.find(v => v.id === currentPlotData?.plot.varietyId);

  // Datos cotejados completos de la parcela actualmente seleccionada
  const plotHistory = useMemo(() => {
    if (!currentPlotData) return [];
    return trialRecords
      .filter(r => r.plotId === currentPlotData.plot.id)
      .sort(
        (a, b) =>
          new Date(b.date + (b.time ? 'T' + b.time : '')).getTime() -
          new Date(a.date + (a.time ? 'T' + a.time : '')).getTime()
      );
  }, [trialRecords, currentPlotData]);

  const currentPlotLogs = useMemo(() => {
    if (!currentPlotData) return [];
    return logs
      .filter(l => l.plotId === currentPlotData.plot.id)
      .sort(
        (a, b) =>
          new Date(b.date + (b.time ? 'T' + b.time : '')).getTime() -
          new Date(a.date + (a.time ? 'T' + a.time : '')).getTime()
      );
  }, [logs, currentPlotData]);

  const currentPlotHydric = useMemo(() => {
    if (!currentPlotData) return [];
    const sowDateIso = currentPlotData.plot.sowingDate || '2025-09-01';
    return hydricRecords
      .filter(
        r =>
          (r.plotId === currentPlotData.plot.id ||
            (r.locationId === currentPlotData.plot.locationId && !r.plotId)) &&
          r.date >= sowDateIso
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [hydricRecords, currentPlotData]);

  const currentPlotTasks = useMemo(() => {
    if (!currentPlotData) return [];
    return tasks
      .filter(t => t.plotId === currentPlotData.plot.id)
      .sort((a, b) => (b.executionDate || b.dueDate || '').localeCompare(a.executionDate || a.dueDate || ''));
  }, [tasks, currentPlotData]);

  const currentPlotAgroApps = useMemo(() => {
    if (!currentPlotData) return [];
    return agrochemicalApplications
      .filter(a => a.plotId === currentPlotData.plot.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [agrochemicalApplications, currentPlotData]);

  // Estado de Carencia SENASA Pre-Cosecha en vivo para la parcela seleccionada
  const currentPlotSafetyStatus = useMemo(() => {
    const today = new Date();
    const activeApp = currentPlotAgroApps.find(a => new Date(a.harvestSafetyDate) > today);
    if (!activeApp) {
      return {
        inSafetyPeriod: false,
        daysRemaining: 0,
        releaseDate: '',
        productName: ''
      };
    }
    const daysRemaining = Math.max(
      1,
      Math.ceil((new Date(activeApp.harvestSafetyDate).getTime() - today.getTime()) / 86400000)
    );
    return {
      inSafetyPeriod: true,
      daysRemaining,
      releaseDate: activeApp.harvestSafetyDate,
      productName: activeApp.productName
    };
  }, [currentPlotAgroApps]);

  // Cálculos agronómicos de ciclo, cosecha óptima y proyección comercial en tiempo real
  const currentPlotMetrics = useMemo(() => {
    if (!currentPlotData) {
      return {
        dds: 0,
        cycleDays: 120,
        cycleProgressPct: 0,
        optimalBiologicalHarvestDate: '',
        optimalFiberCutDate: '',
        targetHarvestDate: '',
        daysToHarvest: 120,
        areaM2: 0,
        areaHa: 0,
        waterNeedMm: 480,
        waterPct: 0,
        totalVolumeM3: 0,
        totalLiters: 0,
        liveProjectedGrainKgHa: 0,
        liveProjectedGrainTotalKg: 0,
        liveProjectedFiberTnHa: 0,
        liveProjectedFiberTotalTn: 0,
        usingFieldSampleForGrain: false,
        usingFieldSampleForFiber: false
      };
    }

    const waterNeedMm = variety?.waterNeedMm || 480;
    const waterPct = Math.min(100, Math.round((currentPlotData.totalWaterMm / Math.max(1, waterNeedMm)) * 100));
    const totalLiters = Math.round(currentPlotData.totalWaterMm * currentPlotData.areaM2);
    const totalVolumeM3 = Number(((currentPlotData.totalWaterMm * currentPlotData.areaM2) / 1000).toFixed(2));

    // Proyección Comercial en Vivo (reacciona inmediatamente al editar Vigor o Muestreo g/m² en el formulario)
    const vigorScore = Number(formData.vigor || 8);
    const vigorFactor = 0.72 + (vigorScore / 9) * 0.28;
    const usage = variety?.usage || 'Dual';
    const baseGrainKgHa =
      variety?.expectedGrainYieldKgHa ||
      (usage === 'Grano' ? 1250 : usage === 'Dual' ? 980 : usage === 'Medicinal' ? 650 : 450);
    const baseFiberTnHa =
      variety?.expectedFiberYieldTnHa ||
      (usage === 'Fibra' ? 8.8 : usage === 'Dual' ? 6.5 : usage === 'Grano' ? 4.2 : 2.8);

    const sampledSeedGrM2 = Number(formData.seedYield || 0);
    const sampledStemGrM2 = Number(formData.stemWeight || 0);

    const usingFieldSampleForGrain = sampledSeedGrM2 > 0;
    const usingFieldSampleForFiber = sampledStemGrM2 > 0;

    // 1 g/m² = 10 kg/ha
    const liveProjectedGrainKgHa = usingFieldSampleForGrain
      ? Math.round(sampledSeedGrM2 * 10)
      : Math.round(baseGrainKgHa * vigorFactor);
    const liveProjectedGrainTotalKg = Math.round(liveProjectedGrainKgHa * currentPlotData.areaHa);

    const liveProjectedFiberTnHa = usingFieldSampleForFiber
      ? Number(((sampledStemGrM2 * 10) / 1000).toFixed(2))
      : Number((baseFiberTnHa * vigorFactor).toFixed(2));
    const liveProjectedFiberTotalTn = Number((liveProjectedFiberTnHa * currentPlotData.areaHa).toFixed(2));

    return {
      dds: currentPlotData.dds,
      cycleDays: currentPlotData.cycleDays,
      cycleProgressPct: currentPlotData.cycleProgressPct,
      optimalBiologicalHarvestDate: currentPlotData.optimalBiologicalHarvestDate,
      optimalFiberCutDate: currentPlotData.optimalFiberCutDate,
      targetHarvestDate: currentPlotData.targetHarvestDate,
      daysToHarvest: currentPlotData.daysToHarvest,
      areaM2: currentPlotData.areaM2,
      areaHa: currentPlotData.areaHa,
      waterNeedMm,
      waterPct,
      totalVolumeM3,
      totalLiters,
      liveProjectedGrainKgHa,
      liveProjectedGrainTotalKg,
      liveProjectedFiberTnHa,
      liveProjectedFiberTotalTn,
      usingFieldSampleForGrain,
      usingFieldSampleForFiber
    };
  }, [currentPlotData, variety, formData.vigor, formData.seedYield, formData.stemWeight]);

  // Auto-seleccionar el primero si la selección actual no está en la cola filtrada
  useEffect(() => {
    if (plotQueue.length > 0 && !plotQueue.some(item => item.plot.id === selectedPlotId)) {
      setSelectedPlotId(plotQueue[0].plot.id);
    }
  }, [plotQueue, selectedPlotId]);

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Sincronización ambiental con Open-Meteo y Sunrise-Sunset (Red GFS)
  const syncEnvironmentalData = async (dateStr: string, loc?: Location) => {
    const lunar = calculateLunarPhase(dateStr);
    setFormData(prev => ({ ...prev, lunarPhase: lunar }));

    const lat = loc?.coordinates?.lat || currentPlotData?.plot.coordinates?.lat || -34.6037;
    const lng = loc?.coordinates?.lng || currentPlotData?.plot.coordinates?.lng || -58.3816;

    setIsFetchingConditions(true);
    try {
      const sunRes = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`
      );
      const sunData = await sunRes.json();
      let lightH = 12.5;
      if (sunData.status === 'OK') {
        lightH = Number((sunData.results.day_length / 3600).toFixed(2));
      }

      const isToday = dateStr === new Date().toISOString().split('T')[0];
      let temp = 18;
      let hum = 65;

      if (isToday) {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&timezone=auto`
        );
        const wData = await wRes.json();
        if (wData.current) {
          temp = Math.round(wData.current.temperature_2m);
          hum = Math.round(wData.current.relative_humidity_2m);
        }
      } else {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const wData = await wRes.json();
        if (wData.daily && wData.daily.temperature_2m_max?.[0] !== undefined) {
          temp = Math.round((wData.daily.temperature_2m_max[0] + wData.daily.temperature_2m_min[0]) / 2);
        }
      }

      setFormData(prev => ({
        ...prev,
        lightHours: lightH,
        temperature: temp,
        humidity: hum,
        lunarPhase: lunar
      }));
    } catch {
      // Mantiene valores manuales si no hay señal en el lote
    } finally {
      setIsFetchingConditions(false);
    }
  };

  // Pre-cargar datos base cuando cambia la parcela seleccionada
  useEffect(() => {
    if (currentPlotData && !editingRecordId) {
      const last = currentPlotData.lastRecord;
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setFormData(prev => ({
        ...prev,
        date: todayStr,
        time: nowTime,
        stage: last?.stage || 'Vegetativo',
        plantsPerMeter: last?.plantsPerMeter || 0,
        plantHeight: last?.plantHeight || 0,
        vigor: last?.vigor || 9,
        uniformity: last?.uniformity || 9,
        lodging: last?.lodging || 1,
        birdDamage: last?.birdDamage || 1,
        diseasesScore: last?.diseasesScore || 1,
        pestsScore: last?.pestsScore || 1,
        detectedPests: last?.detectedPests || [],
        detectedDiseases: last?.detectedDiseases || [],
        beneficialFauna: last?.beneficialFauna || ['Coccinélidos (Vaquitas)'],
        pestThresholdStatus: last?.pestThresholdStatus || 'Sin Presión',
        nutritionalStatus: last?.nutritionalStatus || 'Óptimo / Balanceado',
        soilConditionNotes: last?.soilConditionNotes || '',
        floweringDate: last?.floweringDate || '',
        seedYield: last?.seedYield || 0,
        stemWeight: last?.stemWeight || 0,
        seedQualityGermination: last?.seedQualityGermination ?? 90,
        seedQualityNonConformity: last?.seedQualityNonConformity ?? 0
      }));

      setScheduleHarvestDateInput(
        currentPlotData.plot.scheduledHarvestDate || currentPlotData.targetHarvestDate || todayStr
      );

      syncEnvironmentalData(todayStr, currentPlotData.location);
    }
  }, [currentPlotData?.plot.id, editingRecordId]);

  const handleSelectPlotFromQueue = (plotId: string) => {
    setSelectedPlotId(plotId);
    setIsMobileQueueOpen(false);
  };

  const handleStepPlot = (direction: 'prev' | 'next') => {
    if (plotQueue.length <= 1 || currentPlotIndex === -1) return;
    const nextIdx =
      direction === 'next'
        ? (currentPlotIndex + 1) % plotQueue.length
        : (currentPlotIndex - 1 + plotQueue.length) % plotQueue.length;
    setSelectedPlotId(plotQueue[nextIdx].plot.id);
  };

  const handleEditRecord = (record: TrialRecord) => {
    setEditingRecordId(record.id);
    setFormData({
      ...record,
      date: record.date || new Date().toISOString().split('T')[0],
      time: record.time || '12:00',
      stage: record.stage || 'Vegetativo',
      temperature: record.temperature ?? 18,
      humidity: record.humidity ?? 60,
      lightHours: record.lightHours ?? 12.5,
      lunarPhase: record.lunarPhase || calculateLunarPhase(record.date),
      plantsPerMeter: record.plantsPerMeter ?? 0,
      plantHeight: record.plantHeight ?? 0,
      vigor: record.vigor ?? 9,
      uniformity: record.uniformity ?? 9,
      lodging: record.lodging ?? 1,
      birdDamage: record.birdDamage ?? 1,
      diseasesScore: record.diseasesScore ?? 1,
      pestsScore: record.pestsScore ?? 1,
      detectedPests: record.detectedPests || [],
      detectedDiseases: record.detectedDiseases || [],
      beneficialFauna: record.beneficialFauna || [],
      pestThresholdStatus: record.pestThresholdStatus || 'Sin Presión',
      nutritionalStatus: record.nutritionalStatus || 'Óptimo / Balanceado',
      soilConditionNotes: record.soilConditionNotes || '',
      floweringDate: record.floweringDate || '',
      seedYield: record.seedYield ?? 0,
      stemWeight: record.stemWeight ?? 0,
      seedQualityGermination: record.seedQualityGermination ?? 90,
      seedQualityNonConformity: record.seedQualityNonConformity ?? 0
    });
    setActiveTab('form');
  };

  // Programar fecha de cosecha directamente desde Monitoreo Rápido en la ficha de Parcela
  const handleQuickScheduleHarvest = async () => {
    if (!currentPlotData?.plot.id || !scheduleHarvestDateInput) return;
    setIsSchedulingHarvest(true);
    try {
      const ok = await closePlotCycle(currentPlotData.plot.id, {
        mode: 'schedule',
        closedDate: scheduleHarvestDateInput,
        closedTime: '08:00',
        harvestYieldKg: currentPlotMetrics.liveProjectedGrainTotalKg,
        notes: `Ventana de cosecha programada desde Monitoreo Agronómico (${currentPlotData.dds} DDS · Humedad campo ${grainMoistureFieldPct}% · Proyección: ${currentPlotMetrics.liveProjectedGrainTotalKg} kg grano / ${currentPlotMetrics.liveProjectedFiberTotalTn} Tn fibra).`
      });
      if (ok) {
        setSaveSummaryBanner(
          `✓ Cosecha programada para el ${scheduleHarvestDateInput} en ${currentPlotData.plot.name} (Proyección: ${currentPlotMetrics.liveProjectedGrainTotalKg.toLocaleString('es-AR')} kg grano · ${currentPlotMetrics.liveProjectedFiberTotalTn} Tn fibra)`
        );
        setTimeout(() => setSaveSummaryBanner(null), 4500);
      }
    } finally {
      setIsSchedulingHarvest(false);
    }
  };

  // ============================================================================
  // FUNCIONES DE CÁMARA Y BITÁCORA MULTIMEDIA
  // ============================================================================
  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    try {
      const compressed = await compressImageFileToDataUrl(file);
      setQuickLogPhoto(compressed);
    } catch (err: any) {
      setCameraError(err?.message || 'Error al procesar la imagen.');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const startWebCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'No se pudo acceder a la cámara en vivo del navegador. Utilizá el botón "Cámara Celular / Galería".'
      );
    }
  };

  const stopWebCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureWebCameraFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      setQuickLogPhoto(dataUrl);
    }
    stopWebCamera();
  };

  // Guardado directo independiente de Bitácora Multimedia
  const handleQuickSaveLogOnly = async () => {
    if (!currentPlotData?.plot.id) return;
    if (!quickLogNote.trim() && !quickLogPhoto) return;

    setIsSavingQuickLog(true);
    try {
      const biometricPrefix = autoAttachBiometricsToLog
        ? `[Monitoreo ${formData.stage || 'Vegetativo'} | Alt: ${formData.plantHeight || 0}cm | Pob: ${formData.plantsPerMeter || 0} pl/m² | Vigor: ${formData.vigor || 9}/9] `
        : '';
      const finalNote = `${biometricPrefix}${quickLogNote.trim() || 'Registro fotográfico de recorrida técnica.'}`.trim();

      const newLog: FieldLog = {
        id: fastUUID(),
        plotId: currentPlotData.plot.id,
        date: formData.date || new Date().toISOString().split('T')[0],
        time: formData.time || new Date().toTimeString().slice(0, 5),
        note: finalNote,
        photoUrl: quickLogPhoto || undefined
      };
      await addLog(newLog);
      setQuickLogNote('');
      setQuickLogPhoto('');
      setSaveSummaryBanner(`✓ Bitácora Multimedia sincronizada en ${currentPlotData.plot.name}`);
      setTimeout(() => setSaveSummaryBanner(null), 3500);
    } finally {
      setIsSavingQuickLog(false);
    }
  };

  // Guardado directo independiente de Pluviómetro / Riego
  const handleQuickSaveHydricOnly = async () => {
    if (!currentPlotData?.plot.id) return;
    const mm = parseFloat(quickHydricMm);
    if (isNaN(mm) || mm <= 0) return;

    setIsSavingQuickHydric(true);
    try {
      const newHydric: HydricRecord = {
        id: fastUUID(),
        locationId: currentPlotData.plot.locationId,
        plotId: currentPlotData.plot.id,
        date: formData.date || new Date().toISOString().split('T')[0],
        time: quickHydricStartTime || formData.time,
        endTime: quickHydricType === 'Riego' ? quickHydricEndTime : undefined,
        type: quickHydricType,
        amountMm: Number(mm.toFixed(1)),
        notes:
          quickHydricNotes.trim() ||
          `${quickHydricType} registrado desde Monitoreo Rápido (${currentPlotData.plot.name})`,
        createdBy: currentUser?.name || 'Técnico Nucleus'
      };
      await addHydricRecord(newHydric);
      setQuickHydricMm('');
      setSaveSummaryBanner(
        `✓ ${quickHydricType} (${mm.toFixed(1)} mm = ${(mm * 10).toFixed(0)} m³/ha) asentado en ${currentPlotData.plot.name}`
      );
      setTimeout(() => setSaveSummaryBanner(null), 3500);
    } finally {
      setIsSavingQuickHydric(false);
    }
  };

  // Guardado directo independiente de Labor Cultural / Preparación de Suelo
  const handleQuickSaveLaborOnly = async () => {
    if (!currentPlotData?.plot.id || !quickLaborTitle.trim()) return;

    setIsSavingQuickLabor(true);
    try {
      const targetPlots = quickLaborApplyBlock
        ? plots.filter(
            p =>
              p.status === 'Activa' &&
              p.locationId === currentPlotData.plot.locationId &&
              (currentPlotData.plot.block ? p.block === currentPlotData.plot.block : true)
          )
        : [currentPlotData.plot];

      for (const targetPlot of targetPlots) {
        const newTask: Task = {
          id: fastUUID(),
          title: quickLaborTitle.trim(),
          description:
            quickLaborDescription.trim() ||
            `Labor registrada durante relevamiento agronómico en ${targetPlot.name}.`,
          status: quickLaborStatus,
          priority: 'Alta',
          assignedToIds: currentUser?.id ? [currentUser.id] : ['1'],
          dueDate: formData.date || new Date().toISOString().split('T')[0],
          executionDate: formData.date || new Date().toISOString().split('T')[0],
          plotId: targetPlot.id,
          createdBy: currentUser?.id || '1',
          laborType: quickLaborType,
          targetStage: targetPlot.currentPhenologicalStage || 'BBCH_10_19',
          operator: currentUser?.name || 'Equipo Técnico',
          machinery: {
            tractor: quickLaborTractor,
            implement: quickLaborImplement
          }
        };
        await addTask(newTask);
      }

      setQuickLaborTitle('');
      setQuickLaborDescription('');
      setSaveSummaryBanner(
        `✓ Labor "${quickLaborType}" registrada en ${
          targetPlots.length > 1 ? `${targetPlots.length} parcelas del establecimiento` : currentPlotData.plot.name
        }`
      );
      setTimeout(() => setSaveSummaryBanner(null), 3500);
    } finally {
      setIsSavingQuickLabor(false);
    }
  };

  // Guardado directo independiente en el Cuaderno Fitosanitario SENASA (Fertilizante / Mejorador de Suelo / Insecticida)
  const handleQuickSaveAgroOnly = async () => {
    if (!currentPlotData?.plot.id || !quickAgroProduct.trim()) return;

    setIsSavingQuickAgro(true);
    try {
      const appDate = formData.date || new Date().toISOString().split('T')[0];
      const safetyDays = Math.max(0, Number(quickAgroSafetyDays) || 0);
      const harvestSafetyDate = addDaysToIsoDate(appDate, safetyDays);
      const dosage = Math.max(0.1, Number(quickAgroDosage) || 1);
      const areaHa = Math.max(0.05, currentPlotMetrics.areaHa || 0.1);
      const totalApplied = Number((dosage * areaHa).toFixed(2));

      const newApp: AgrochemicalApplication = {
        id: `app-${Date.now()}`,
        plotId: currentPlotData.plot.id,
        plotName: currentPlotData.plot.name,
        date: appDate,
        time: formData.time || '09:00',
        category: quickAgroCategory,
        productName: quickAgroProduct.trim(),
        activeIngredient: quickAgroActiveIngredient.trim() || 'Insumo Agrícola Homologado',
        manufacturer: quickAgroManufacturer || 'Elaborador Homologado GACP',
        supplierName: quickAgroSupplierName || 'BioFábrica & Insumos Agrícolas Red HempC',
        senasaRegisterNumber: quickAgroSenasa.trim() || 'SENASA-OFICIAL',
        toxicologicalClass: quickAgroToxClass,
        dosagePerHa: dosage,
        dosageUnit: quickAgroUnit,
        totalAppliedAmount: totalApplied,
        applicationMethod: quickAgroMethod,
        batchNumber: quickAgroBatch.trim().toUpperCase() || `LOT-${Date.now().toString().slice(-5)}`,
        expirationDate: '2027-12-31',
        senasaComplianceStatus: 'Conforme SENASA (Normativa VIGENTE)',
        safetyPeriodDays: safetyDays,
        harvestSafetyDate,
        responsibleAgronomist: currentUser?.name || 'Ing. Agr. Gastón Barea',
        agronomistLicense: 'MP-4821-CIAFBA',
        weatherCondition: {
          temperatureC: Number(formData.temperature || 20),
          windSpeedKmH: 9,
          relativeHumidityPct: Number(formData.humidity || 55)
        },
        targetPestOrDisease:
          quickAgroTarget.trim() ||
          [...(formData.detectedPests || []), ...(formData.detectedDiseases || [])].join(', ') ||
          formData.nutritionalStatus ||
          undefined,
        pestIncidenceScore: Math.max(Number(formData.pestsScore || 1), Number(formData.diseasesScore || 1)),
        phenologicalStage: formData.stage,
        notes:
          quickAgroNotes.trim() ||
          `Registrado desde Monitoreo Rápido (${formData.stage || 'Vegetativo'} · ${currentPlotData.dds} DDS).`,
        status: safetyDays > 0 ? 'En Carencia' : 'Apto Cosecha'
      };

      await addAgrochemicalApplication(newApp);
      setIsCustomAgroProduct(false);
      setQuickAgroNotes('');
      setSaveSummaryBanner(
        `✓ ${newApp.category} "${newApp.productName}" asentado en Cuaderno Fitosanitario SENASA y en Parcela ${currentPlotData.plot.name} (Carencia: ${safetyDays}d)`
      );
      setTimeout(() => setSaveSummaryBanner(null), 4000);
    } finally {
      setIsSavingQuickAgro(false);
    }
  };

  // ============================================================================
  // GUARDADO INTEGRAL UNIFICADO (BIOMETRÍA + ATAJOS PENDIENTES EN UN SOLO CLIC)
  // ============================================================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlotData?.plot.id) return;

    setIsSaving(true);
    const recordId =
      editingRecordId || ((window.crypto as any)?.randomUUID ? (window.crypto as any).randomUUID() : fastUUID());

    try {
      const maxSanityScore = Math.max(Number(formData.pestsScore || 1), Number(formData.diseasesScore || 1));
      const autoThresholdStatus: TrialRecord['pestThresholdStatus'] =
        maxSanityScore >= 7
          ? 'Intervención Urgente'
          : maxSanityScore >= 4
          ? 'Umbral de Intervención'
          : maxSanityScore >= 2
          ? 'Monitoreo Preventivo'
          : 'Sin Presión';

      const payload: TrialRecord = {
        ...formData,
        id: recordId,
        plotId: currentPlotData.plot.id,
        pestThresholdStatus: autoThresholdStatus,
        harvestDate: scheduleHarvestDateInput || currentPlotData.targetHarvestDate,
        createdBy: formData.createdBy || currentUser?.id,
        createdByName: formData.createdByName || currentUser?.name
      } as TrialRecord;

      const success = editingRecordId ? await updateTrialRecord(payload) : await addTrialRecord(payload);

      const extraSaved: string[] = [];

      // 1. Si el técnico adjuntó foto o nota en el Atajo de Bitácora, guardarla automáticamente en `field_logs`
      if (success && (quickLogPhoto || quickLogNote.trim())) {
        const biometricPrefix = autoAttachBiometricsToLog
          ? `[Monitoreo ${formData.stage || 'Vegetativo'} | Alt: ${formData.plantHeight || 0}cm | Pob: ${formData.plantsPerMeter || 0} pl/m² | Vigor: ${formData.vigor || 9}/9] `
          : '';
        await addLog({
          id: fastUUID(),
          plotId: currentPlotData.plot.id,
          date: formData.date || new Date().toISOString().split('T')[0],
          time: formData.time || new Date().toTimeString().slice(0, 5),
          note: `${biometricPrefix}${quickLogNote.trim() || 'Registro fotográfico de monitoreo.'}`.trim(),
          photoUrl: quickLogPhoto || undefined
        });
        setQuickLogNote('');
        setQuickLogPhoto('');
        extraSaved.push('Bitácora Multimedia');
      }

      // 2. Si el técnico ingresó milímetros en el Atajo de Pluviómetro/Riego, guardarlo en `hydric_records`
      const pendingMm = parseFloat(quickHydricMm);
      if (success && !isNaN(pendingMm) && pendingMm > 0) {
        await addHydricRecord({
          id: fastUUID(),
          locationId: currentPlotData.plot.locationId,
          plotId: currentPlotData.plot.id,
          date: formData.date || new Date().toISOString().split('T')[0],
          time: quickHydricStartTime || formData.time,
          endTime: quickHydricType === 'Riego' ? quickHydricEndTime : undefined,
          type: quickHydricType,
          amountMm: Number(pendingMm.toFixed(1)),
          notes:
            quickHydricNotes.trim() ||
            `${quickHydricType} asentado junto al Informe Nucleus Trace (${currentPlotData.plot.name})`,
          createdBy: currentUser?.name || 'Técnico Nucleus'
        });
        setQuickHydricMm('');
        extraSaved.push(`${quickHydricType} (${pendingMm.toFixed(1)} mm)`);
      }

      // 3. Si el técnico dejó cargada una Labor Cultural / Preparación de Suelo, guardarla en `tasks`
      if (success && quickLaborTitle.trim()) {
        await addTask({
          id: fastUUID(),
          title: quickLaborTitle.trim(),
          description:
            quickLaborDescription.trim() ||
            `Labor verificada durante monitoreo en ${currentPlotData.plot.name}.`,
          status: quickLaborStatus,
          priority: 'Alta',
          assignedToIds: currentUser?.id ? [currentUser.id] : ['1'],
          dueDate: formData.date || new Date().toISOString().split('T')[0],
          executionDate: formData.date || new Date().toISOString().split('T')[0],
          plotId: currentPlotData.plot.id,
          createdBy: currentUser?.id || '1',
          laborType: quickLaborType,
          targetStage: currentPlotData.plot.currentPhenologicalStage || 'BBCH_10_19',
          operator: currentUser?.name || 'Equipo Técnico',
          machinery: {
            tractor: quickLaborTractor,
            implement: quickLaborImplement
          }
        });
        setQuickLaborTitle('');
        setQuickLaborDescription('');
        extraSaved.push(`Labor (${quickLaborType})`);
      }

      // 4. Si el técnico está en la pestaña Fitosanitario (o ingresó notas/producto personalizado), asentarlo en Cuaderno Fitosanitario SENASA
      if (
        success &&
        quickAgroProduct.trim() &&
        (activeShortcutTab === 'phytosanitary' || isCustomAgroProduct || Boolean(quickAgroNotes.trim()))
      ) {
        const appDate = formData.date || new Date().toISOString().split('T')[0];
        const safetyDays = Math.max(0, Number(quickAgroSafetyDays) || 0);
        const harvestSafetyDate = addDaysToIsoDate(appDate, safetyDays);
        const dosage = Math.max(0.1, Number(quickAgroDosage) || 1);
        const areaHa = Math.max(0.05, currentPlotMetrics.areaHa || 0.1);
        const totalApplied = Number((dosage * areaHa).toFixed(2));

        await addAgrochemicalApplication({
          id: `app-${Date.now()}`,
          plotId: currentPlotData.plot.id,
          plotName: currentPlotData.plot.name,
          date: appDate,
          time: formData.time || '09:00',
          category: quickAgroCategory,
          productName: quickAgroProduct.trim(),
          activeIngredient: quickAgroActiveIngredient.trim() || 'Insumo Agrícola Homologado',
          manufacturer: quickAgroManufacturer || 'Elaborador Homologado GACP',
          supplierName: quickAgroSupplierName || 'BioFábrica & Insumos Agrícolas Red HempC',
          senasaRegisterNumber: quickAgroSenasa.trim() || 'SENASA-OFICIAL',
          toxicologicalClass: quickAgroToxClass,
          dosagePerHa: dosage,
          dosageUnit: quickAgroUnit,
          totalAppliedAmount: totalApplied,
          applicationMethod: quickAgroMethod,
          batchNumber: quickAgroBatch.trim().toUpperCase() || `LOT-${Date.now().toString().slice(-5)}`,
          expirationDate: '2027-12-31',
          senasaComplianceStatus: 'Conforme SENASA (Normativa VIGENTE)',
          safetyPeriodDays: safetyDays,
          harvestSafetyDate,
          responsibleAgronomist: currentUser?.name || 'Ing. Agr. Gastón Barea',
          agronomistLicense: 'MP-4821-CIAFBA',
          weatherCondition: {
            temperatureC: Number(formData.temperature || 20),
            windSpeedKmH: 9,
            relativeHumidityPct: Number(formData.humidity || 55)
          },
          targetPestOrDisease:
            quickAgroTarget.trim() ||
            [...(formData.detectedPests || []), ...(formData.detectedDiseases || [])].join(', ') ||
            formData.nutritionalStatus ||
            undefined,
          pestIncidenceScore: maxSanityScore,
          phenologicalStage: formData.stage,
          linkedTrialRecordId: recordId,
          notes:
            quickAgroNotes.trim() ||
            `Sellado junto a Relevamiento Biométrico Nucleus Trace (${formData.stage || 'Vegetativo'}).`,
          status: safetyDays > 0 ? 'En Carencia' : 'Apto Cosecha'
        });
        setIsCustomAgroProduct(false);
        setQuickAgroNotes('');
        extraSaved.push(`Cuaderno SENASA (${quickAgroCategory})`);
      }

      if (success) {
        setJustSaved(true);
        setSaveSummaryBanner(
          extraSaved.length > 0
            ? `✓ Sellado Integral en ${currentPlotData.plot.name}: Informe Biométrico + ${extraSaved.join(' + ')}`
            : `✓ Informe Periódico Nucleus Trace sellado en ${currentPlotData.plot.name}`
        );
        const wasEditing = Boolean(editingRecordId);
        setEditingRecordId(null);
        setTimeout(() => {
          setJustSaved(false);
          if (wasEditing) {
            setActiveTab('history');
          } else if (autoAdvance) {
            const currentIndex = plotQueue.findIndex(p => p.plot.id === currentPlotData.plot.id);
            if (currentIndex < plotQueue.length - 1) {
              setSelectedPlotId(plotQueue[currentIndex + 1].plot.id);
            }
          }
        }, 900);
        setTimeout(() => setSaveSummaryBanner(null), 4500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const GrowthIndicator = ({ current, previous }: { current: number; previous: number }) => {
    if (!previous) return <span className="text-slate-400 text-[10px]">Sin dato previo</span>;
    const diff = Number((current - previous).toFixed(1));
    if (diff > 0)
      return (
        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center">
          +{diff} cm <TrendingUp size={12} className="ml-1" />
        </span>
      );
    if (diff < 0)
      return (
        <span className="text-red-500 text-[10px] font-bold flex items-center">
          {diff} cm <AlertTriangle size={12} className="ml-1" />
        </span>
      );
    return <span className="text-slate-400 text-[10px] font-bold">Sin variación</span>;
  };

  const labelClass = 'text-[10px] font-black uppercase mb-1 block text-slate-400 tracking-widest';

  // Selector táctil 1-9 optimizado para celular, tablet y escritorio (encuadrado sin desborde)
  const TouchScaleControl = ({
    label,
    value,
    onChange,
    invertColor = false,
    helperText
  }: {
    label: string;
    value?: number;
    onChange: (v: number) => void;
    invertColor?: boolean;
    helperText?: string;
  }) => {
    const current = value ?? 1;
    const getBadgeStyle = (n: number, isSelected: boolean) => {
      if (!isSelected) {
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';
      }
      if (!invertColor) {
        if (n >= 7) return 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/40';
        if (n >= 4) return 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/40';
        return 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/40';
      } else {
        if (n <= 2) return 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/40';
        if (n <= 5) return 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/40';
        return 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/40';
      }
    };

    return (
      <div className="min-w-0 overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider block truncate">
              {label}
            </span>
            {helperText && <span className="text-[9px] text-slate-400 block truncate">{helperText}</span>}
          </div>
          <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            {current}/9
          </span>
        </div>
        <div className="grid grid-cols-9 gap-1 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-9 min-w-0 rounded-lg font-mono text-xs font-black transition-all cursor-pointer flex items-center justify-center ${getBadgeStyle(
                n,
                current === n
              )}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const selectedLocationObj = locations.find(l => l.id === locationFilter);

  return (
    <div className="animate-in fade-in duration-500 min-h-[calc(100vh-140px)] flex flex-col space-y-4 pb-20 lg:pb-12">
      {/* ====================================================================== */}
      {/* 1. CABECERA + TABLERO EJECUTIVO (ENSAYOS, PRODUCCIÓN Y PRE-VENTA)      */}
      {/* ====================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg shadow-emerald-600/20 shrink-0">
              <ClipboardList size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Monitoreo Agronómico <span className="text-emerald-600">360°</span>
                </h1>
                <span className="text-xs text-slate-400 font-mono">· Protocolo Oficial Nucleus Trace</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Terminal de relevamiento rápido, proyección de cosecha y preventa • Sincronizada en vivo con Parcelas y Germoplasma
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => syncAllPlotsContinuousRainfall(true)}
              disabled={isSyncingGlobalRainfall}
              className="flex-1 sm:flex-initial bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Sincronizar lluvias satelitales Open-Meteo ERA5 en todos los establecimientos"
            >
              <RefreshCw size={14} className={isSyncingGlobalRainfall ? 'animate-spin' : ''} />
              <span>{isSyncingGlobalRainfall ? 'Sincronizando ERA5...' : 'Sincronizar Lluvias'}</span>
            </button>

            {currentPlotData && (
              <Link
                to={`/plots/${currentPlotData.plot.id}`}
                className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                title="Abrir Ficha Técnica completa de la parcela seleccionada"
              >
                <ExternalLink size={14} /> Ficha de Parcela
              </Link>
            )}
          </div>
        </div>

        {/* TABLERO INTERACTIVO DE TOTALES: ENSAYOS vs PRODUCCIÓN + URGENCIA + PROYECCIÓN PRE-VENTA */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* KPI 1: Total Parcelas en el alcance actual */}
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              setUrgencyFilter('all');
            }}
            className={`p-3 rounded-2xl text-left border transition cursor-pointer min-w-0 ${
              typeFilter === 'all' && urgencyFilter === 'all'
                ? 'bg-slate-900 dark:bg-emerald-950/60 border-slate-900 dark:border-emerald-500/50 text-white'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  typeFilter === 'all' && urgencyFilter === 'all'
                    ? 'text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Total Parcelas
              </span>
              <Layers size={14} className="text-emerald-500 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  typeFilter === 'all' && urgencyFilter === 'all'
                    ? 'text-white'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {boardStats.total}
              </span>
              <span
                className={`text-[11px] font-mono ${
                  typeFilter === 'all' && urgencyFilter === 'all' ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                ({boardStats.totalHa} ha)
              </span>
            </div>
            <p
              className={`text-[10px] truncate mt-0.5 ${
                typeFilter === 'all' && urgencyFilter === 'all' ? 'text-slate-300' : 'text-slate-400'
              }`}
            >
              {selectedLocationObj ? selectedLocationObj.name : `${locationFilterOptions.length} establecimientos`}
            </p>
          </button>

          {/* KPI 2: Lotes de Ensayo I+D */}
          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'Ensayo' ? 'all' : 'Ensayo')}
            className={`p-3 rounded-2xl text-left border transition cursor-pointer min-w-0 ${
              typeFilter === 'Ensayo'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  typeFilter === 'Ensayo' ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                Ensayos (I+D)
              </span>
              <FlaskConical
                size={14}
                className={typeFilter === 'Ensayo' ? 'text-white shrink-0' : 'text-indigo-500 shrink-0'}
              />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  typeFilter === 'Ensayo' ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {boardStats.ensayosCount}
              </span>
              <span
                className={`text-[11px] font-mono ${
                  typeFilter === 'Ensayo' ? 'text-indigo-100' : 'text-slate-400'
                }`}
              >
                ({boardStats.ensayosHa} ha)
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${typeFilter === 'Ensayo' ? 'text-indigo-100' : 'text-slate-400'}`}>
              {typeFilter === 'Ensayo' ? '✓ Solo Ensayos' : 'Filtrar Ensayos'}
            </p>
          </button>

          {/* KPI 3: Parcelas en Producción */}
          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'Producción' ? 'all' : 'Producción')}
            className={`p-3 rounded-2xl text-left border transition cursor-pointer min-w-0 ${
              typeFilter === 'Producción'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  typeFilter === 'Producción' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                En Producción
              </span>
              <Sprout
                size={14}
                className={typeFilter === 'Producción' ? 'text-white shrink-0' : 'text-emerald-500 shrink-0'}
              />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  typeFilter === 'Producción' ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {boardStats.produccionCount}
              </span>
              <span
                className={`text-[11px] font-mono ${
                  typeFilter === 'Producción' ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                ({boardStats.produccionHa} ha)
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${typeFilter === 'Producción' ? 'text-emerald-100' : 'text-slate-400'}`}>
              {typeFilter === 'Producción' ? '✓ Solo Producción' : 'Filtrar Producción'}
            </p>
          </button>

          {/* KPI 4: Urgentes (+7 días sin visita) */}
          <button
            type="button"
            onClick={() => setUrgencyFilter(urgencyFilter === 'urgent' ? 'all' : 'urgent')}
            className={`p-3 rounded-2xl text-left border transition cursor-pointer min-w-0 ${
              urgencyFilter === 'urgent'
                ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  urgencyFilter === 'urgent' ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                Urgentes (+7d)
              </span>
              <AlertTriangle
                size={14}
                className={urgencyFilter === 'urgent' ? 'text-white shrink-0' : 'text-rose-500 shrink-0'}
              />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  urgencyFilter === 'urgent' ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {boardStats.urgentCount}
              </span>
              <span className={`text-[11px] ${urgencyFilter === 'urgent' ? 'text-rose-100' : 'text-slate-400'}`}>
                pendientes
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${urgencyFilter === 'urgent' ? 'text-rose-100' : 'text-slate-400'}`}>
              {urgencyFilter === 'urgent' ? '✓ Solo urgentes' : 'Prioridad visita'}
            </p>
          </button>

          {/* KPI 5: Al Día (≤7 días) */}
          <button
            type="button"
            onClick={() => setUrgencyFilter(urgencyFilter === 'uptodate' ? 'all' : 'uptodate')}
            className={`p-3 rounded-2xl text-left border transition cursor-pointer min-w-0 ${
              urgencyFilter === 'uptodate'
                ? 'bg-teal-600 border-teal-500 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-teal-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  urgencyFilter === 'uptodate' ? 'text-teal-100' : 'text-teal-600 dark:text-teal-400'
                }`}
              >
                Al Día (≤7d)
              </span>
              <CheckCircle2
                size={14}
                className={urgencyFilter === 'uptodate' ? 'text-white shrink-0' : 'text-teal-500 shrink-0'}
              />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  urgencyFilter === 'uptodate' ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {boardStats.upToDateCount}
              </span>
              <span className={`text-[11px] ${urgencyFilter === 'uptodate' ? 'text-teal-100' : 'text-slate-400'}`}>
                relevadas
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${urgencyFilter === 'uptodate' ? 'text-teal-100' : 'text-slate-400'}`}>
              {boardStats.total > 0
                ? `${Math.round((boardStats.upToDateCount / boardStats.total) * 100)}% cobertura`
                : 'Sin lotes'}
            </p>
          </button>

          {/* KPI 6: Ventana de Cosecha & Proyección Pre-Venta */}
          <button
            type="button"
            onClick={() => setUrgencyFilter(urgencyFilter === 'harvest_window' ? 'all' : 'harvest_window')}
            className={`p-3 rounded-2xl text-left border transition cursor-pointer min-w-0 ${
              urgencyFilter === 'harvest_window'
                ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  urgencyFilter === 'harvest_window' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                Cosecha / Pre-Venta
              </span>
              <Timer
                size={14}
                className={urgencyFilter === 'harvest_window' ? 'text-white shrink-0' : 'text-amber-500 shrink-0'}
              />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  urgencyFilter === 'harvest_window' ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {boardStats.harvestWindowCount}
              </span>
              <span
                className={`text-[10px] font-mono ${
                  urgencyFilter === 'harvest_window' ? 'text-amber-100' : 'text-slate-400'
                }`}
              >
                lotes (≤30d)
              </span>
            </div>
            <p
              className={`text-[9.5px] font-mono truncate mt-0.5 ${
                urgencyFilter === 'harvest_window' ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'
              }`}
              title="Proyección acumulada de Grano y Fibra en el alcance actual"
            >
              Est: {(boardStats.totalProjectedGrainKg / 1000).toFixed(1)}t grano · {boardStats.totalProjectedFiberTn}t fibra
            </p>
          </button>
        </div>
      </div>

      {/* BANNER DE CONFIRMACIÓN DE GUARDADO / SELLADO INTEGRAL */}
      {saveSummaryBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{saveSummaryBanner}</span>
          </div>
          <button type="button" onClick={() => setSaveSummaryBanner(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 2. BARRA MÓVIL / TABLET DE CAMBIO RÁPIDO DE LOTE (SIN SCROLL LARGO)   */}
      {/* ====================================================================== */}
      <div className="lg:hidden sticky top-2 z-30 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleStepPlot('prev')}
            disabled={plotQueue.length <= 1}
            className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
          >
            <ChevronLeft size={16} /> Ant.
          </button>

          <div className="flex-1 min-w-0">
            <select
              value={currentPlotData?.plot.id || ''}
              onChange={e => handleSelectPlotFromQueue(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black uppercase text-white outline-none truncate"
            >
              {plotQueue.map((item, idx) => (
                <option key={item.plot.id} value={item.plot.id}>
                  [{idx + 1}/{plotQueue.length}] {item.plot.name} · {item.varietyName} ({item.dds}/{item.cycleDays}d)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleStepPlot('next')}
            disabled={plotQueue.length <= 1}
            className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
          >
            Sig. <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsMobileQueueOpen(prev => !prev)}
            className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition cursor-pointer ${
              isMobileQueueOpen
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Filter size={13} />
            <span>
              {isMobileQueueOpen
                ? 'Ocultar Filtros y Lista de Lotes'
                : `Filtrar Campo / Genética (${plotQueue.length} lotes)`}
            </span>
            {isMobileQueueOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('form');
              setFieldViewSection('shortcuts');
              setActiveShortcutTab('photo_log');
              startWebCamera();
            }}
            className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <Camera size={14} /> Foto Rápida
          </button>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 3. GRID PRINCIPAL: COLA EN CASCADA + CONSOLA DE RELEVAMIENTO 360°      */}
      {/* ====================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* SIDEBAR: COLA DE TRABAJO Y FILTRADO EN CASCADA (CAMPO -> GENÉTICAS ASIGNADAS) */}
        <div
          className={`lg:col-span-4 flex-col bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden lg:h-[920px] min-w-0 ${
            isMobileQueueOpen ? 'flex max-h-[640px]' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 border-b dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Filter size={14} className="text-emerald-600" /> Filtros en Cascada de Lotes
              </h3>
              {(searchQuery ||
                locationFilter !== 'all' ||
                varietyFilter !== 'all' ||
                typeFilter !== 'all' ||
                urgencyFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setLocationFilter('all');
                    setVarietyFilter('all');
                    setTypeFilter('all');
                    setUrgencyFilter('all');
                  }}
                  className="text-[10px] font-black uppercase text-rose-500 hover:underline cursor-pointer"
                >
                  Restablecer ({allEnrichedActivePlots.length})
                </button>
              )}
            </div>

            {/* PASO 1: Selector de Establecimiento / Campo con totales reales */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-emerald-600" /> 1. Establecimiento / Campo
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {locationFilter === 'all'
                    ? `${locationFilterOptions.length} campos activos`
                    : `${boardStats.total} parcelas en campo`}
                </span>
              </label>
              <select
                value={locationFilter}
                onChange={e => {
                  const newLoc = e.target.value;
                  setLocationFilter(newLoc);
                  setVarietyFilter('all');
                  setSelectedPlotId('');
                }}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              >
                <option value="all">
                  Todos los Establecimientos ({allEnrichedActivePlots.length} parcelas:{' '}
                  {allEnrichedActivePlots.filter(p => p.plot.type === 'Ensayo').length} Ens. /{' '}
                  {allEnrichedActivePlots.filter(p => p.plot.type === 'Producción').length} Prod.)
                </option>
                {locationFilterOptions.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} — {loc.totalPlots} lotes ({loc.ensayosCount} Ensayo / {loc.produccionCount} Prod.)
                  </option>
                ))}
              </select>
            </div>

            {/* PASO 2: Selector de Genética (FILTRADO EN CASCADA SEGÚN EL CAMPO ELEGIDO) */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Dna size={11} className="text-indigo-500" /> 2. Genética Asignada al Campo
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {availableVarietiesForSelectedLocation.length} genéticas disponibles
                </span>
              </label>
              <select
                value={varietyFilter}
                onChange={e => {
                  setVarietyFilter(e.target.value);
                  setSelectedPlotId('');
                }}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              >
                <option value="all">
                  Todas las Genéticas del Campo (
                  {availableVarietiesForSelectedLocation.reduce((s, v) => s + v.totalPlots, 0)} parcelas)
                </option>
                {availableVarietiesForSelectedLocation.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.totalPlots} {v.totalPlots === 1 ? 'parcela' : 'parcelas'} (
                    {v.ensayosCount > 0 ? `${v.ensayosCount} Ens.` : ''}
                    {v.ensayosCount > 0 && v.produccionCount > 0 ? ' / ' : ''}
                    {v.produccionCount > 0 ? `${v.produccionCount} Prod.` : ''})
                  </option>
                ))}
              </select>

              {/* Chips rápidos de genéticas del campo seleccionado */}
              {locationFilter !== 'all' && availableVarietiesForSelectedLocation.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setVarietyFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                      varietyFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Todas ({availableVarietiesForSelectedLocation.reduce((s, v) => s + v.totalPlots, 0)})
                  </button>
                  {availableVarietiesForSelectedLocation.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVarietyFilter(varietyFilter === v.id ? 'all' : v.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                        varietyFilter === v.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300/70'
                      }`}
                    >
                      {v.name} ({v.totalPlots})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Búsqueda rápida por nombre o bloque */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar lote por código, bloque o nota..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
              />
            </div>

            {/* Filtro de Tipo real ('Ensayo' | 'Producción') con conteos en vivo */}
            <div className="flex gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({boardStats.total})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Ensayo')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  typeFilter === 'Ensayo'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ensayos ({boardStats.ensayosCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Producción')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  typeFilter === 'Producción'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Producción ({boardStats.produccionCount})
              </button>
            </div>
          </div>

          {/* LISTA DE PARCELAS EN LA COLA CON RELOJ DE COSECHA, FASE FENOLÓGICA E INDICADORES COTEJADOS */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {plotQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
                No se encontraron parcelas activas para la combinación seleccionada.
              </div>
            ) : (
              plotQueue.map(item => {
                const isSelected = currentPlotData?.plot.id === item.plot.id;
                const itemStageMeta = getStageMeta(item.lastRecord?.stage);
                return (
                  <button
                    key={item.plot.id}
                    type="button"
                    onClick={() => handleSelectPlotFromQueue(item.plot.id)}
                    className={`w-full p-3.5 rounded-2xl text-left transition-all border group relative overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 relative z-10">
                      <div className="truncate pr-2">
                        <span className="font-black uppercase tracking-tight text-sm truncate block">
                          {item.plot.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                          <span
                            className={`font-black uppercase ${
                              isSelected
                                ? 'text-white'
                                : item.plot.type === 'Ensayo'
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {item.plot.type}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-bold truncate ${
                              isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.varietyName} ({item.varietyUsage})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${
                            isSelected ? 'bg-white/20 text-white' : itemStageMeta.badgeClass
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${itemStageMeta.dotClass}`} />
                          {itemStageMeta.label}
                        </span>
                        {item.daysSince > 7 ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase flex items-center ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            +{item.daysSince}d
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {item.daysSince === 999 ? 'S/D' : `${item.daysSince}d`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between text-[10px] font-mono mt-1 ${
                        isSelected ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      <span className="truncate">
                        {item.locationName} · {item.plot.surfaceArea} {item.plot.surfaceUnit}
                      </span>
                      <span
                        className={`font-bold shrink-0 ${
                          isSelected
                            ? 'text-white'
                            : item.daysToHarvest <= 20
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.daysToHarvest > 0
                          ? `Cosecha: T-${item.daysToHarvest}d`
                          : `En Ventana (${item.dds}/${item.cycleDays}d)`}
                      </span>
                    </div>

                    {/* Indicadores de Cotejo Rápido (Hídrico + Fotos + Labores) */}
                    <div
                      className={`mt-2 pt-1.5 border-t flex flex-wrap items-center gap-2 text-[10px] font-mono ${
                        isSelected
                          ? 'border-white/15 text-emerald-50'
                          : 'border-slate-100 dark:border-slate-700/70 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span title="Días desde siembra vs Ciclo del Germoplasma">
                        🌱 {item.dds}/{item.cycleDays} DDS ({item.cycleProgressPct}%)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span title="Lámina hídrica acumulada">💧 {item.totalWaterMm}mm</span>
                      <span aria-hidden="true">·</span>
                      <span title="Bitácora Multimedia">📷 {item.photosCount}</span>
                      <span aria-hidden="true">·</span>
                      <span title="Labores de suelo y cultivo">🚜 {item.tasksCount}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL PRINCIPAL: FICHA TÉCNICA + CINTA DE COTEJO + ATAJOS + RELOJ DE COSECHA */}
        <div
          ref={formContainerRef}
          className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-[28px] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative min-h-[820px] min-w-0"
        >
          {currentPlotData ? (
            <>
              {/* ENCABEZADO DE LA PARCELA SELECCIONADA + CINTA DE COTEJO 360° */}
              <div className="bg-slate-50 dark:bg-slate-950/70 p-4 md:p-6 border-b dark:border-slate-800 space-y-4 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                      <span
                        className={`font-black uppercase tracking-wider ${
                          currentPlotData.plot.type === 'Ensayo'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {currentPlotData.plot.type}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                        ·
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Genética: {variety?.name || 'S/D'} ({variety?.usage || 'Dual'} · Ciclo{' '}
                        {currentPlotMetrics.cycleDays}d)
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                        ·
                      </span>
                      <span className="text-slate-500">{currentPlotData.locationName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                        {currentPlotData.plot.name}
                      </h2>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1.5 ${
                          getStageMeta(formData.stage).badgeClass
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${getStageMeta(formData.stage).dotClass}`} />
                        Fase: {formData.stage || 'Vegetativo'}
                      </span>
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        Siembra: {currentPlotData.plot.sowingDate} · {currentPlotMetrics.dds}/
                        {currentPlotMetrics.cycleDays} DDS ({currentPlotMetrics.cycleProgressPct}%)
                      </span>
                      <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">
                        · Cosecha Óptima: {currentPlotMetrics.targetHarvestDate} (
                        {currentPlotMetrics.daysToHarvest > 0
                          ? `Faltan ${currentPlotMetrics.daysToHarvest} días`
                          : `Ventana activa +${Math.abs(currentPlotMetrics.daysToHarvest)}d`}
                        )
                      </span>
                    </div>
                  </div>

                  {/* SELECTOR DE PESTAÑAS: RELEVAMIENTO + ATAJOS vs HISTORIAL COTEJADO 360° */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs self-stretch sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('form')}
                      className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'form'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Activity size={13} /> Relevamiento
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'history'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <History size={13} /> Cotejo 360° (
                      {plotHistory.length +
                        currentPlotLogs.length +
                        currentPlotHydric.length +
                        currentPlotTasks.length +
                        currentPlotAgroApps.length}
                      )
                    </button>
                  </div>
                </div>

                {/* CINTA DE COTEJO INSTANTÁNEO CON PARCELAS DE CULTIVO (5 TARJETAS INTERACTIVAS) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono text-xs">
                  {/* 1. Superficie y Estadio BBCH con color según fase */}
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                      Superficie & Fenología BBCH
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotData.plot.surfaceArea} {currentPlotData.plot.surfaceUnit} ({currentPlotMetrics.areaHa}{' '}
                      ha)
                    </div>
                    <select
                      value={currentPlotData.plot.currentPhenologicalStage || 'BBCH_20_39'}
                      onChange={e =>
                        updatePlotPhenology(
                          currentPlotData.plot.id,
                          e.target.value as HempStageId,
                          formData.date,
                          'Actualizado desde Monitoreo Rápido',
                          currentUser?.name
                        )
                      }
                      className={`mt-1 w-full min-w-0 border rounded-lg px-2 py-1 text-[10px] font-bold outline-none cursor-pointer transition ${getBbchSelectColorClass(
                        currentPlotData.plot.currentPhenologicalStage || 'BBCH_20_39'
                      )}`}
                      title="Actualizar estadio fenológico BBCH de la parcela"
                    >
                      <option value="BBCH_00_09">🔵 BBCH 00-09 Germinación</option>
                      <option value="BBCH_10_19">🟢 BBCH 10-19 Vegetativo Temprano</option>
                      <option value="BBCH_20_39">🟢 BBCH 20-39 Elongación Vegetativa</option>
                      <option value="BBCH_50_59">🟣 BBCH 50-59 Prefloración / Sexado</option>
                      <option value="BBCH_60_69">🟣 BBCH 60-69 Floración Plena</option>
                      <option value="BBCH_70_85">🟠 BBCH 70-85 Llenado de Grano</option>
                      <option value="BBCH_89_99">🔴 BBCH 89-99 Maduración / Cosecha</option>
                    </select>
                  </div>

                  {/* 2. Pluviómetro & Balance Hídrico */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('form');
                      setFieldViewSection('shortcuts');
                      setActiveShortcutTab('hydric');
                    }}
                    className="p-2.5 rounded-2xl text-left bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500 transition cursor-pointer min-w-0"
                  >
                    <span className="text-[9px] uppercase font-bold text-sky-600 dark:text-sky-400 block truncate">
                      🌧️ Pluviómetro & Riego ({currentPlotMetrics.waterPct}%)
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotData.totalWaterMm} mm ({(currentPlotData.totalWaterMm * 10).toFixed(0)} m³/ha)
                    </div>
                    <span className="text-[9.5px] text-slate-400 block truncate">
                      Lluvia: {currentPlotData.rainMm}mm · Riego: {currentPlotData.irrigMm}mm
                    </span>
                  </button>

                  {/* 3. Labores y Preparación de Suelo */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('form');
                      setFieldViewSection('shortcuts');
                      setActiveShortcutTab('labor');
                    }}
                    className="p-2.5 rounded-2xl text-left bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 transition cursor-pointer min-w-0"
                  >
                    <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 block truncate">
                      🚜 Suelo & Labores ({currentPlotTasks.length})
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotTasks[0]?.title || 'Sin labores registradas'}
                    </div>
                    <span className="text-[9.5px] text-slate-400 block truncate">
                      {currentPlotData.soilPrepCount} prep. suelo / siembra
                    </span>
                  </button>

                  {/* 4. Cuaderno Fitosanitario SENASA, Fertilizantes & Mejoradores de Suelo */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('form');
                      setFieldViewSection('shortcuts');
                      setActiveShortcutTab('phytosanitary');
                    }}
                    className="p-2.5 rounded-2xl text-left bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500 transition cursor-pointer min-w-0"
                  >
                    <span className="text-[9px] uppercase font-bold text-teal-600 dark:text-teal-400 block truncate">
                      🧪 Fitosanitario & Suelo ({currentPlotAgroApps.length})
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotAgroApps[0]?.productName || 'Sin insumos aplicados'}
                    </div>
                    <span
                      className={`text-[9.5px] font-bold block truncate ${
                        currentPlotSafetyStatus.inSafetyPeriod
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {currentPlotSafetyStatus.inSafetyPeriod
                        ? `⚠️ Carencia: ${currentPlotSafetyStatus.daysRemaining}d (${currentPlotSafetyStatus.releaseDate})`
                        : '✓ Lote Libre de Carencia'}
                    </span>
                  </button>

                  {/* 5. Reloj de Cosecha & Pre-Venta Comercial */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('form');
                      setFieldViewSection('harvest');
                    }}
                    className="p-2.5 rounded-2xl text-left bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 transition cursor-pointer min-w-0 sm:col-span-2 lg:col-span-1"
                  >
                    <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                      🌾 Cosecha & Pre-Venta ({currentPlotMetrics.cycleProgressPct}%)
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotMetrics.daysToHarvest > 0
                        ? `Faltan ${currentPlotMetrics.daysToHarvest}d (${currentPlotMetrics.targetHarvestDate})`
                        : `Ventana Óptima Activa`}
                    </div>
                    <span className="text-[9.5px] text-slate-400 block truncate">
                      Est: {currentPlotMetrics.liveProjectedGrainTotalKg.toLocaleString('es-AR')} kg ·{' '}
                      {currentPlotMetrics.liveProjectedFiberTotalTn} Tn fibra
                    </span>
                  </button>
                </div>

                {/* SELECTOR DE MODO DE VISTA EN CAMPO */}
                {activeTab === 'form' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto">
                      {(
                        [
                          { id: 'all', label: 'Vista Completa' },
                          { id: 'biometrics', label: '1. Biometría & MIP' },
                          { id: 'shortcuts', label: '2. Foto / Riego / Labor / Fitosanitario' },
                          { id: 'harvest', label: '3. Cosecha & Pre-Venta' }
                        ] as const
                      ).map(sec => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setFieldViewSection(sec.id)}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                            fieldViewSection === sec.id
                              ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {sec.label}
                        </button>
                      ))}
                    </div>

                    {currentPlotData.lastRecord && (
                      <button
                        type="button"
                        onClick={() => {
                          const last = currentPlotData.lastRecord!;
                          setFormData(prev => ({
                            ...prev,
                            plantsPerMeter: last.plantsPerMeter ?? prev.plantsPerMeter,
                            plantHeight: last.plantHeight ?? prev.plantHeight,
                            vigor: last.vigor ?? prev.vigor,
                            uniformity: last.uniformity ?? prev.uniformity
                          }));
                        }}
                        className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        ↺ Restaurar base anterior ({currentPlotData.lastRecord.plantHeight || 0} cm ·{' '}
                        {currentPlotData.lastRecord.plantsPerMeter || 0} pl/m²)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* VISTA 1: FORMULARIO OFICIAL NUCLEUS TRACE + RELOJ DE COSECHA + ATAJOS DE CAMPO */}
              {activeTab === 'form' && (
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <form onSubmit={handleSave} className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar min-w-0">
                    {/* ==================================================================== */}
                    {/* SECCIÓN 1: BIOMETRÍA, AMBIENTE Y SANIDAD (ENCUADRE PERFECTO)         */}
                    {/* ==================================================================== */}
                    {(fieldViewSection === 'all' || fieldViewSection === 'biometrics') && (
                      <div className="space-y-4 min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-emerald-600 p-2 rounded-xl text-white shrink-0">
                              <Activity size={18} />
                            </div>
                            <div>
                              <h3 className="text-base md:text-lg font-black dark:text-white uppercase tracking-tight">
                                1. Relevamiento Biométrico & Sanitario Nucleus Trace
                              </h3>
                              <p className="text-[10px] text-slate-400">
                                Controles táctiles encuadrados y selector cromático de estadio fenológico
                              </p>
                            </div>
                          </div>
                          {isFetchingConditions && (
                            <div className="flex items-center text-[10px] font-mono font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-900/40">
                              <Loader2 className="animate-spin mr-1.5" size={12} /> Sincronizando Clima Open-Meteo...
                            </div>
                          )}
                        </div>

                        {/* BLOQUE 1A: AMBIENTE, FECHA/HORA Y SELECTOR CROMÁTICO DE FASE FENOLÓGICA */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 min-w-0 overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b dark:border-slate-800 pb-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                              <Sun size={14} className="mr-1.5 text-amber-500" /> Condiciones Ambientales & Fase Fenológica
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">
                              Luna: <strong className="text-slate-600 dark:text-slate-300">{formData.lunarPhase}</strong>
                            </span>
                          </div>

                          {/* Fila de Fecha, Hora y Clima (sin desbordes en ninguna resolución) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 min-w-0">
                            <div className="min-w-0">
                              <label className={labelClass}>Fecha de Visita</label>
                              <input
                                type="date"
                                required
                                className="w-full min-w-0 h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-mono font-bold text-xs dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={formData.date}
                                onChange={e => {
                                  const newDate = e.target.value;
                                  setFormData(p => ({ ...p, date: newDate }));
                                  syncEnvironmentalData(newDate, currentPlotData.location);
                                }}
                              />
                            </div>

                            <div className="min-w-0">
                              <label className={labelClass}>Hora</label>
                              <input
                                type="time"
                                required
                                className="w-full min-w-0 h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-mono font-bold text-xs dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                              />
                            </div>

                            <div className="min-w-0 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Temperatura</span>
                                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                                  {formData.temperature}°C
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-500/70 font-bold">GFS</span>
                            </div>

                            <div className="min-w-0 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Humedad Rel.</span>
                                <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                                  {formData.humidity}%
                                </span>
                              </div>
                              <span className="text-[10px] text-sky-500/70 font-bold">HR</span>
                            </div>

                            <div className="min-w-0 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono sm:col-span-2 lg:col-span-1">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Fotoperiodo</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white">
                                  {formData.lightHours} h
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-500 font-bold">Luz</span>
                            </div>
                          </div>

                          {/* Selector Cromático de Fase Fenológica (5 estadios con color propio) */}
                          <div className="min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className={labelClass}>
                                Fase Fenológica / Estadio Fisiológico (Código de Color Oficial)
                              </label>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                Seleccionado: {getStageMeta(formData.stage).label} ({getStageMeta(formData.stage).bbchHint})
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                              {(Object.keys(PHENOLOGICAL_STAGE_META) as PhenologicalStageKey[]).map(st => {
                                const meta = PHENOLOGICAL_STAGE_META[st];
                                const isSelected = formData.stage === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, stage: st })}
                                    className={`min-w-0 py-2.5 px-2.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                                      isSelected ? meta.activeBtnClass : meta.inactiveBtnClass
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 w-full">
                                      <span className="text-[10px] font-black uppercase tracking-wider truncate">
                                        {meta.label}
                                      </span>
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          isSelected ? 'bg-white' : meta.dotClass
                                        }`}
                                      />
                                    </div>
                                    <span
                                      className={`text-[9px] font-mono mt-0.5 block truncate ${
                                        isSelected ? 'text-white/90 font-bold' : 'opacity-75'
                                      }`}
                                    >
                                      {meta.bbchHint}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* BLOQUE 1B: ALTURA MEDIA (CM) Y DENSIDAD / POBLACIÓN (PL/M²) ENCUADRADOS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                          {/* TARJETA 1: ALTURA MEDIA (CM) */}
                          <div className="min-w-0 overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                            <div className="flex justify-between items-center gap-2">
                              <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider flex items-center gap-1.5 truncate">
                                <Ruler size={14} className="text-emerald-600 shrink-0" />
                                <span className="truncate">Altura Media de Planta (cm)</span>
                              </label>
                              <GrowthIndicator
                                current={formData.plantHeight || 0}
                                previous={currentPlotData.lastRecord?.plantHeight || 0}
                              />
                            </div>

                            {/* Campo numérico de ancho completo (nunca desborda) */}
                            <div className="relative flex items-center w-full min-w-0">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                min="0"
                                className="w-full min-w-0 h-11 pl-3.5 pr-12 text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-mono text-lg font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={formData.plantHeight}
                                onChange={e => setFormData({ ...formData, plantHeight: Number(e.target.value) })}
                              />
                              <span className="absolute right-3.5 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">
                                cm
                              </span>
                            </div>

                            {/* Grilla de 4 botones de ajuste rápido perfectamente contenida */}
                            <div className="grid grid-cols-4 gap-1.5 w-full">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantHeight: Math.max(0, Number(((p.plantHeight || 0) - 10).toFixed(1)))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantHeight: Math.max(0, Number(((p.plantHeight || 0) - 5).toFixed(1)))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantHeight: Number(((p.plantHeight || 0) + 5).toFixed(1))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-emerald-600 text-white font-mono text-xs font-black hover:bg-emerald-500 cursor-pointer shadow-xs"
                              >
                                +5 cm
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantHeight: Number(((p.plantHeight || 0) + 10).toFixed(1))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-emerald-700 text-white font-mono text-xs font-black hover:bg-emerald-600 cursor-pointer shadow-xs"
                              >
                                +10 cm
                              </button>
                            </div>
                          </div>

                          {/* TARJETA 2: DENSIDAD / POBLACIÓN (PL/M²) */}
                          <div className="min-w-0 overflow-hidden bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                            <div className="flex justify-between items-center gap-2">
                              <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider flex items-center gap-1.5 truncate">
                                <Sprout size={14} className="text-emerald-600 shrink-0" />
                                <span className="truncate">Densidad / Población (Pl/m²)</span>
                              </label>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                Ant: {currentPlotData.lastRecord?.plantsPerMeter || 0} pl/m²
                              </span>
                            </div>

                            {/* Campo numérico de ancho completo (nunca desborda) */}
                            <div className="relative flex items-center w-full min-w-0">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                min="0"
                                className="w-full min-w-0 h-11 pl-3.5 pr-14 text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-mono text-lg font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={formData.plantsPerMeter}
                                onChange={e =>
                                  setFormData({ ...formData, plantsPerMeter: Number(e.target.value) })
                                }
                              />
                              <span className="absolute right-3.5 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">
                                pl/m²
                              </span>
                            </div>

                            {/* Grilla de 4 botones de ajuste rápido perfectamente contenida */}
                            <div className="grid grid-cols-4 gap-1.5 w-full">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantsPerMeter: Math.max(0, Number(((p.plantsPerMeter || 0) - 5).toFixed(1)))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantsPerMeter: Math.max(0, Number(((p.plantsPerMeter || 0) - 1).toFixed(1)))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantsPerMeter: Number(((p.plantsPerMeter || 0) + 1).toFixed(1))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-emerald-600 text-white font-mono text-xs font-black hover:bg-emerald-500 cursor-pointer shadow-xs"
                              >
                                +1 pl
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData(p => ({
                                    ...p,
                                    plantsPerMeter: Number(((p.plantsPerMeter || 0) + 5).toFixed(1))
                                  }))
                                }
                                className="h-9 min-w-0 rounded-xl bg-emerald-700 text-white font-mono text-xs font-black hover:bg-emerald-600 cursor-pointer shadow-xs"
                              >
                                +5 pl
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* BLOQUE 1C: ESCALAS TÁCTILES 1-9 (VIGOR, HOMOGENEIDAD, SANIDAD, ENCAMADO, AVES) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                          <TouchScaleControl
                            label="Vigor Vegetativo (1-9)"
                            helperText="9 = Máximo vigor foliar y elongación"
                            value={formData.vigor}
                            onChange={v => setFormData({ ...formData, vigor: v })}
                          />
                          <TouchScaleControl
                            label="Homogeneidad de Lote (1-9)"
                            helperText="9 = Canopia totalmente uniforme"
                            value={formData.uniformity}
                            onChange={v => setFormData({ ...formData, uniformity: v })}
                          />
                          <TouchScaleControl
                            label="Sanidad: Enfermedades (1-9)"
                            helperText="1 = Sano sin síntomas · 9 = Afectación severa"
                            invertColor
                            value={formData.diseasesScore}
                            onChange={v => setFormData({ ...formData, diseasesScore: v })}
                          />
                          <TouchScaleControl
                            label="Sanidad: Plagas / Insectos (1-9)"
                            helperText="1 = Sin plagas · 9 = Presión crítica"
                            invertColor
                            value={formData.pestsScore}
                            onChange={v => setFormData({ ...formData, pestsScore: v })}
                          />
                          <TouchScaleControl
                            label="Encamado / Vuelco (1-9)"
                            helperText="1 = Tallo erecto · 9 = Vuelco generalizado"
                            invertColor
                            value={formData.lodging}
                            onChange={v => setFormData({ ...formData, lodging: v })}
                          />
                          <TouchScaleControl
                            label="Daño por Aves (1-9)"
                            helperText="1 = Sin daño · 9 = Pérdida severa de grano"
                            invertColor
                            value={formData.birdDamage}
                            onChange={v => setFormData({ ...formData, birdDamage: v })}
                          />
                        </div>

                        {/* BLOQUE 1D: MANEJO INTEGRADO DE PLAGAS (MIP), FAUNA BENÉFICA, NUTRICIÓN & CONDICIÓN EDÁFICA */}
                        <div className="bg-slate-50/90 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 min-w-0 overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 block">
                                Monitoreo Fitosanitario & Edáfico en Lote • Enlazado con Cuaderno Fitosanitario SENASA
                              </span>
                              <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                                <Bug size={15} className="text-rose-500 shrink-0" />
                                <span>
                                  Diagnóstico MIP (Plagas, Patógenos & Fauna Benéfica) + Estado Nutricional / Suelo
                                </span>
                              </h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {(() => {
                                const maxSanity = Math.max(
                                  Number(formData.pestsScore || 1),
                                  Number(formData.diseasesScore || 1)
                                );
                                const statusLabel =
                                  maxSanity >= 7
                                    ? 'Intervención Urgente'
                                    : maxSanity >= 4
                                    ? 'Umbral de Intervención'
                                    : maxSanity >= 2 ||
                                      (formData.detectedPests?.length || 0) > 0 ||
                                      (formData.detectedDiseases?.length || 0) > 0
                                    ? 'Monitoreo Preventivo'
                                    : 'Sin Presión';
                                const badgeColors =
                                  statusLabel === 'Intervención Urgente'
                                    ? 'bg-rose-600 text-white'
                                    : statusLabel === 'Umbral de Intervención'
                                    ? 'bg-amber-500 text-white'
                                    : statusLabel === 'Monitoreo Preventivo'
                                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
                                return (
                                  <span
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black uppercase ${badgeColors}`}
                                  >
                                    Umbral MIP: {statusLabel}
                                  </span>
                                );
                              })()}

                              <button
                                type="button"
                                onClick={() => {
                                  const autoTarget = [
                                    ...(formData.detectedPests || []),
                                    ...(formData.detectedDiseases || [])
                                  ].join(', ');
                                  if (autoTarget && !quickAgroTarget) {
                                    setQuickAgroTarget(autoTarget);
                                  }
                                  setFieldViewSection('shortcuts');
                                  setActiveShortcutTab('phytosanitary');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <FlaskConical size={12} />
                                <span>Prescribir en Cuaderno SENASA</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 min-w-0">
                            {/* 1. Plagas e Insectos Detectados */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                                  🐛 Plagas / Insectos ({formData.detectedPests?.length || 0})
                                </span>
                                {(formData.detectedPests?.length || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, detectedPests: [] }))}
                                    className="text-[9px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                                  >
                                    Limpiar
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {HEMP_PESTS_CATALOG.map(pest => {
                                  const active = (formData.detectedPests || []).includes(pest);
                                  return (
                                    <button
                                      key={pest}
                                      type="button"
                                      onClick={() =>
                                        setFormData(prev => {
                                          const list = prev.detectedPests || [];
                                          const next = active ? list.filter(x => x !== pest) : [...list, pest];
                                          return {
                                            ...prev,
                                            detectedPests: next,
                                            pestsScore:
                                              next.length > 0 && (prev.pestsScore || 1) === 1 ? 3 : prev.pestsScore
                                          };
                                        })
                                      }
                                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border text-left ${
                                        active
                                          ? 'bg-rose-600 border-rose-500 text-white shadow-xs'
                                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-400'
                                      }`}
                                    >
                                      {active ? '✓ ' : '+ '}
                                      {pest}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 2. Patógenos y Enfermedades Fúngicas / Bacterianas */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                                  🍄 Patógenos / Hongos ({formData.detectedDiseases?.length || 0})
                                </span>
                                {(formData.detectedDiseases?.length || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, detectedDiseases: [] }))}
                                    className="text-[9px] font-bold text-slate-400 hover:text-amber-500 cursor-pointer"
                                  >
                                    Limpiar
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {HEMP_DISEASES_CATALOG.map(dis => {
                                  const active = (formData.detectedDiseases || []).includes(dis);
                                  return (
                                    <button
                                      key={dis}
                                      type="button"
                                      onClick={() =>
                                        setFormData(prev => {
                                          const list = prev.detectedDiseases || [];
                                          const next = active ? list.filter(x => x !== dis) : [...list, dis];
                                          return {
                                            ...prev,
                                            detectedDiseases: next,
                                            diseasesScore:
                                              next.length > 0 && (prev.diseasesScore || 1) === 1
                                                ? 3
                                                : prev.diseasesScore
                                          };
                                        })
                                      }
                                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border text-left ${
                                        active
                                          ? 'bg-amber-600 border-amber-500 text-white shadow-xs'
                                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                                      }`}
                                    >
                                      {active ? '✓ ' : '+ '}
                                      {dis}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 3. Fauna Benéfica / Control Biológico Natural */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                  🐞 Fauna Benéfica / Predadores ({formData.beneficialFauna?.length || 0})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {HEMP_BENEFICIAL_FAUNA.map(ben => {
                                  const active = (formData.beneficialFauna || []).includes(ben);
                                  return (
                                    <button
                                      key={ben}
                                      type="button"
                                      onClick={() =>
                                        setFormData(prev => {
                                          const list = prev.beneficialFauna || [];
                                          const next = active ? list.filter(x => x !== ben) : [...list, ben];
                                          return { ...prev, beneficialFauna: next };
                                        })
                                      }
                                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border text-left ${
                                        active
                                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                                      }`}
                                    >
                                      {active ? '✓ ' : '+ '}
                                      {ben}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Fila de Estado Nutricional y Condición Edáfica / Suelo */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 min-w-0">
                            <div className="md:col-span-5 min-w-0">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                Estado Nutricional Foliar & Demanda NPK
                              </label>
                              <select
                                value={formData.nutritionalStatus || 'Óptimo / Balanceado'}
                                onChange={e => setFormData({ ...formData, nutritionalStatus: e.target.value })}
                                className="w-full min-w-0 h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                              >
                                <option value="Óptimo / Balanceado">🟢 Óptimo / Balanceado (Verde Intenso)</option>
                                <option value="Demanda Nitrógeno (Vigor / Elongación)">
                                  🟡 Demanda Nitrógeno (Clorosis Basal / Elongación)
                                </option>
                                <option value="Demanda Fósforo / Enraizamiento">
                                  🟣 Demanda Fósforo / Bioestimulación Radicular
                                </option>
                                <option value="Demanda Potasio / Calcio (Floración y Grano)">
                                  🟠 Demanda Potasio / Calcio (Floración / Llenado)
                                </option>
                                <option value="Déficit Micronutrientes (Fe / Zn / Mg)">
                                  🔵 Déficit Micronutrientes (Clorosis Intervenal)
                                </option>
                                <option value="Requiere Mejorador de Suelo (Ácidos Húmicos / pH)">
                                  🟤 Requiere Mejorador de Suelo (Estructura / pH / CE)
                                </option>
                              </select>
                            </div>

                            <div className="md:col-span-7 min-w-0">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                Condición de Suelo, Rizósfera y Observación Fitosanitaria
                              </label>
                              <input
                                type="text"
                                value={formData.soilConditionNotes || ''}
                                onChange={e => setFormData({ ...formData, soilConditionNotes: e.target.value })}
                                placeholder="Ej: Buena porosidad superficial, humedad uniforme a 10cm, sin compactación ni encostramiento..."
                                className="w-full min-w-0 h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ==================================================================== */}
                    {/* SECCIÓN 2: ATAJOS OPERATIVOS COTEJADOS CON LA PARCELA (4 MÓDULOS)    */}
                    {/* ==================================================================== */}
                    {(fieldViewSection === 'all' || fieldViewSection === 'shortcuts') && (
                      <div className="bg-slate-50 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 space-y-4 min-w-0 overflow-hidden">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                              Atajos Directos de Carga en Campo • Fuente Única de Verdad con Parcelas & Cuaderno SENASA
                            </span>
                            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                              2. Foto/Bitácora, Pluviómetro/Riego, Labores & Cuaderno Fitosanitario ({currentPlotData.plot.name})
                            </h4>
                          </div>

                          {/* Pestañas de los 4 Atajos (encuadradas en 2x2 móvil o 4 columnas desktop) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
                            <button
                              type="button"
                              onClick={() => setActiveShortcutTab('photo_log')}
                              className={`px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer min-w-0 ${
                                activeShortcutTab === 'photo_log'
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Camera size={13} className="shrink-0" />
                              <span className="truncate">Foto ({currentPlotLogs.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveShortcutTab('hydric')}
                              className={`px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer min-w-0 ${
                                activeShortcutTab === 'hydric'
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <CloudRain size={13} className="shrink-0" />
                              <span className="truncate">Riego ({currentPlotHydric.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveShortcutTab('labor')}
                              className={`px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer min-w-0 ${
                                activeShortcutTab === 'labor'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Tractor size={13} className="shrink-0" />
                              <span className="truncate">Labores ({currentPlotTasks.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveShortcutTab('phytosanitary')}
                              className={`px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer min-w-0 ${
                                activeShortcutTab === 'phytosanitary'
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <FlaskConical size={13} className="shrink-0" />
                              <span className="truncate">Fitosanitario ({currentPlotAgroApps.length})</span>
                            </button>
                          </div>
                        </div>

                        {/* ATAJO A: BITÁCORA MULTIMEDIA & TOMA FOTOGRÁFICA */}
                        {activeShortcutTab === 'photo_log' && (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                            <div className="lg:col-span-7 space-y-3 min-w-0">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={startWebCamera}
                                  className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Camera size={15} /> Cámara en Vivo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => fileInputMobileCamRef.current?.click()}
                                  className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Smartphone size={15} /> Cámara Celular
                                </button>
                                <button
                                  type="button"
                                  onClick={() => fileInputGalleryRef.current?.click()}
                                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Upload size={15} /> Galería
                                </button>

                                <input
                                  ref={fileInputMobileCamRef}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handleSelectPhotoFile}
                                  className="hidden"
                                />
                                <input
                                  ref={fileInputGalleryRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSelectPhotoFile}
                                  className="hidden"
                                />
                              </div>

                              {isProcessingImage && (
                                <div className="text-xs font-mono text-purple-600 flex items-center gap-1.5">
                                  <Loader2 size={14} className="animate-spin" /> Comprimiendo y optimizando fotografía...
                                </div>
                              )}

                              {quickLogPhoto && (
                                <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-purple-500 shadow-md">
                                  <img
                                    src={quickLogPhoto}
                                    alt="Evidencia capturada"
                                    className="h-36 w-auto object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setQuickLogPhoto('')}
                                    className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-600"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}

                              <textarea
                                rows={2}
                                value={quickLogNote}
                                onChange={e => setQuickLogNote(e.target.value)}
                                placeholder={`Observación de Bitácora para ${currentPlotData.plot.name} (ej. estado foliar, humedad en línea de siembra, presencia de benéficos)...`}
                                className="w-full min-w-0 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:border-purple-500 dark:text-white"
                              />

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={autoAttachBiometricsToLog}
                                    onChange={e => setAutoAttachBiometricsToLog(e.target.checked)}
                                    className="rounded accent-purple-600"
                                  />
                                  <span>Incluir resumen biométrico (Altura/Población/Vigor) en la nota</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={handleQuickSaveLogOnly}
                                  disabled={isSavingQuickLog || (!quickLogNote.trim() && !quickLogPhoto)}
                                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                                >
                                  {isSavingQuickLog ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Save size={13} />
                                  )}
                                  <span>Guardar en Bitácora Ahora</span>
                                </button>
                              </div>
                            </div>

                            {/* Cotejo de últimas fotos y notas de la parcela */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto min-w-0">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                Últimos Registros en Bitácora ({currentPlotLogs.length})
                              </span>
                              {currentPlotLogs.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-4 text-center">
                                  Sin fotografías ni notas previas en esta parcela.
                                </p>
                              ) : (
                                currentPlotLogs.slice(0, 4).map(lg => (
                                  <div
                                    key={lg.id}
                                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs"
                                  >
                                    {lg.photoUrl && (
                                      <img
                                        src={lg.photoUrl}
                                        alt="Foto bitácora"
                                        onClick={() => setPreviewPhotoUrl(lg.photoUrl!)}
                                        className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-pointer border border-purple-500/30"
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 block">
                                        {lg.date} {lg.time || ''}
                                      </span>
                                      <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">
                                        {lg.note}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* ATAJO B: PLUVIÓMETRO & RIEGO SUPLEMENTARIO */}
                        {activeShortcutTab === 'hydric' && (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                            <div className="lg:col-span-7 space-y-3 min-w-0">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0">
                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Tipo de Aporte
                                  </label>
                                  <select
                                    value={quickHydricType}
                                    onChange={e => setQuickHydricType(e.target.value as 'Riego' | 'Lluvia')}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                  >
                                    <option value="Riego">💧 Riego (Agua Azul)</option>
                                    <option value="Lluvia">🌧️ Pluviómetro (Lluvia)</option>
                                  </select>
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Lámina (mm) *
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.5"
                                    min="0"
                                    value={quickHydricMm}
                                    onChange={e => setQuickHydricMm(e.target.value)}
                                    placeholder="Ej: 15"
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold dark:text-white"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Hora Inicio
                                  </label>
                                  <input
                                    type="time"
                                    value={quickHydricStartTime}
                                    onChange={e => setQuickHydricStartTime(e.target.value)}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono dark:text-white"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Hora Fin
                                  </label>
                                  <input
                                    type="time"
                                    value={quickHydricEndTime}
                                    onChange={e => setQuickHydricEndTime(e.target.value)}
                                    disabled={quickHydricType === 'Lluvia'}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono dark:text-white disabled:opacity-40"
                                  />
                                </div>
                              </div>

                              {/* Botones rápidos de milímetros frecuentes para carga táctil */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 mr-1">Lámina rápida:</span>
                                {[5, 10, 15, 20, 25, 35, 50].map(mmPreset => (
                                  <button
                                    key={mmPreset}
                                    type="button"
                                    onClick={() => setQuickHydricMm(String(mmPreset))}
                                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer ${
                                      Number(quickHydricMm) === mmPreset
                                        ? 'bg-sky-600 border-sky-500 text-white'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {mmPreset} mm
                                  </button>
                                ))}
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 min-w-0">
                                <input
                                  type="text"
                                  value={quickHydricNotes}
                                  onChange={e => setQuickHydricNotes(e.target.value)}
                                  placeholder="Observaciones del turno de riego o lectura de pluviómetro físico..."
                                  className="flex-1 min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleQuickSaveHydricOnly}
                                  disabled={isSavingQuickHydric || !quickHydricMm}
                                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                                >
                                  {isSavingQuickHydric ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Droplets size={13} />
                                  )}
                                  <span>Registrar en Pluviómetro</span>
                                </button>
                              </div>

                              {parseFloat(quickHydricMm) > 0 && (
                                <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20">
                                  Conversión en {currentPlotData.plot.name}:{' '}
                                  <strong>{(parseFloat(quickHydricMm) * 10).toFixed(1)} m³/ha</strong> · Volumen real en
                                  lote:{' '}
                                  <strong>
                                    {Math.round(parseFloat(quickHydricMm) * currentPlotMetrics.areaM2).toLocaleString(
                                      'es-AR'
                                    )}{' '}
                                    Litros
                                  </strong>
                                </div>
                              )}
                            </div>

                            {/* Cotejo con registros hídricos de la parcela */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto font-mono min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400">
                                  Historial Pluviómetro & Riego ({currentPlotHydric.length})
                                </span>
                                <span className="text-[10px] font-bold text-sky-600">
                                  Total: {currentPlotData.totalWaterMm} mm
                                </span>
                              </div>
                              {currentPlotHydric.slice(0, 5).map(hr => {
                                const isSat =
                                  String(hr.id).startsWith('auto-rain-') ||
                                  String(hr.notes || '').includes('Open-Meteo');
                                return (
                                  <div
                                    key={hr.id}
                                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800 dark:text-white">{hr.date}</span>{' '}
                                      <span
                                        className={
                                          hr.type === 'Riego'
                                            ? 'text-emerald-600 font-bold'
                                            : 'text-sky-600 font-bold'
                                        }
                                      >
                                        · {hr.type}
                                      </span>
                                      <span className="text-[9.5px] text-slate-400 block">
                                        {isSat ? '🛰️ Satélite Open-Meteo ERA5' : '🧑‍🌾 Registro de Campo'}
                                      </span>
                                    </div>
                                    <strong className="text-slate-900 dark:text-white">{hr.amountMm} mm</strong>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ATAJO C: LABORES CULTURALES & PREPARACIÓN DE SUELO */}
                        {activeShortcutTab === 'labor' && (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                            <div className="lg:col-span-7 space-y-3 min-w-0">
                              {/* Plantillas rápidas de preparación de suelo y labores */}
                              <div className="flex flex-wrap gap-1.5">
                                {QUICK_LABOR_PRESETS.map((preset, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setQuickLaborType(preset.laborType);
                                      setQuickLaborTitle(preset.title);
                                      setQuickLaborDescription(preset.description);
                                      setQuickLaborTractor(preset.tractor);
                                      setQuickLaborImplement(preset.implement);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold cursor-pointer"
                                  >
                                    + {preset.label}
                                  </button>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Categoría de Labor
                                  </label>
                                  <select
                                    value={quickLaborType}
                                    onChange={e => setQuickLaborType(e.target.value as AgriculturalLaborType)}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                  >
                                    <option value="PREPARACION_SUELO">🚜 Preparación de Suelo</option>
                                    <option value="SIEMBRA">🌱 Siembra / Implantación</option>
                                    <option value="LABOR_CULTURAL">🛠️ Labor Cultural / Desmalezado</option>
                                    <option value="FERTIRRIEGO">🧪 Fertirriego / Enmienda</option>
                                    <option value="MANEJO_HIDRICO">💧 Manejo Hídrico</option>
                                    <option value="FITOSANITARIO">🛡️ Aplicación Fitosanitaria</option>
                                    <option value="MONITOREO">🔍 Depuración / Roguing</option>
                                    <option value="COSECHA">🌾 Corte / Hilerado / Cosecha</option>
                                  </select>
                                </div>

                                <div className="sm:col-span-2 min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Título de la Labor Ejecutada / Verificada *
                                  </label>
                                  <input
                                    type="text"
                                    value={quickLaborTitle}
                                    onChange={e => setQuickLaborTitle(e.target.value)}
                                    placeholder="Ej: Cincelado profundo + Rastra de disco (Cama de siembra)"
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
                                <input
                                  type="text"
                                  value={quickLaborTractor}
                                  onChange={e => setQuickLaborTractor(e.target.value)}
                                  placeholder="Tractor / Unidad Motriz"
                                  className="min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={quickLaborImplement}
                                  onChange={e => setQuickLaborImplement(e.target.value)}
                                  placeholder="Implemento / Herramienta"
                                  className="min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                                />
                                <select
                                  value={quickLaborStatus}
                                  onChange={e => setQuickLaborStatus(e.target.value as Task['status'])}
                                  className="min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                >
                                  <option value="Completada">✓ Ejecutada / Completada</option>
                                  <option value="En_Curso">⏳ En Curso</option>
                                  <option value="Pendiente">📌 Programada / Pendiente</option>
                                </select>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={quickLaborApplyBlock}
                                    onChange={e => setQuickLaborApplyBlock(e.target.checked)}
                                    className="rounded accent-amber-600"
                                  />
                                  <span>
                                    Replicar labor en todo el establecimiento ({currentPlotData.locationName})
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  onClick={handleQuickSaveLaborOnly}
                                  disabled={isSavingQuickLabor || !quickLaborTitle.trim()}
                                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                                >
                                  {isSavingQuickLabor ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Tractor size={13} />
                                  )}
                                  <span>Asentar Labor de Suelo/Cultivo</span>
                                </button>
                              </div>
                            </div>

                            {/* Cotejo con labores registradas en la parcela */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto min-w-0">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">
                                Labores & Preparación de Suelo en Lote ({currentPlotTasks.length})
                              </span>
                              {currentPlotTasks.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-4 text-center">
                                  Sin labores culturales o de preparación de suelo registradas en esta parcela.
                                </p>
                              ) : (
                                currentPlotTasks.slice(0, 4).map(tk => (
                                  <div
                                    key={tk.id}
                                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[9.5px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                                        {tk.laborType || 'LABOR'} · {tk.executionDate || tk.dueDate}
                                      </span>
                                      <span className="text-[9px] font-mono font-bold text-emerald-600">
                                        {tk.status}
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-white mt-0.5 truncate">
                                      {tk.title}
                                    </p>
                                    {tk.machinery?.implement && (
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {tk.machinery.tractor} · {tk.machinery.implement}
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* ATAJO D: FERTILIZANTES, MEJORADORES DE SUELO E INSECTICIDAS / BIOINSUMOS (CUADERNO SENASA) */}
                        {activeShortcutTab === 'phytosanitary' && (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                            <div className="lg:col-span-7 space-y-3 min-w-0">
                              {/* Vincular Insumo Recepcionado de Proveedor Homologado (en vivo desde BD resources) */}
                              <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/60 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                                    <ShieldCheck size={13} />
                                    <span>
                                      Vincular Insumo Recepcionado de Proveedor Homologado ({prescribedProductsByCategory.length} en {quickAgroCategory})
                                    </span>
                                  </span>
                                  <Link
                                    to="/resources"
                                    className="text-[9px] font-mono font-bold text-teal-700 dark:text-teal-300 hover:underline"
                                  >
                                    + Registrar Nuevo Recurso en Inventario BD →
                                  </Link>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {prescribedProductsByCategory.map(res => {
                                    const isSelected = quickAgroProduct === res.name && !isCustomAgroProduct;
                                    return (
                                      <button
                                        key={res.id}
                                        type="button"
                                        onClick={() => applyCatalogResourceToQuickAgro(res)}
                                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold border transition cursor-pointer text-left ${
                                          isSelected
                                            ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                                            : 'bg-white dark:bg-slate-900 hover:bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/30'
                                        }`}
                                      >
                                        <span className="block truncate max-w-[230px]">{res.name}</span>
                                        <span
                                          className={`block text-[8.5px] ${
                                            isSelected ? 'text-teal-100' : 'text-slate-400'
                                          }`}
                                        >
                                          {res.batchNumber || res.senasaRegisterNumber || 'SENASA'} · Stock: {res.stock ?? 0}{' '}
                                          {res.unit}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Categoría Insumo *
                                  </label>
                                  <select
                                    value={quickAgroCategory}
                                    onChange={e => handleQuickAgroCategoryChange(e.target.value as AgrochemicalCategory)}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                  >
                                    <option value="Mejorador de Suelo">🌱 Mejorador de Suelo</option>
                                    <option value="Fertilizante Edáfico">🧪 Fertilizante Edáfico</option>
                                    <option value="Fertilizante Foliar">🍃 Fertilizante Foliar</option>
                                    <option value="Bioestimulante">⚡ Bioestimulante</option>
                                    <option value="Insecticida">🐛 Insecticida / Acaricida</option>
                                    <option value="Fungicida">🍄 Fungicida / Biofungicida</option>
                                    <option value="Enmienda Orgánica">♻️ Enmienda Orgánica</option>
                                    <option value="Herbicida">🌾 Herbicida</option>
                                  </select>
                                </div>

                                <div className="sm:col-span-2 min-w-0 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 block">
                                      Producto Comercial Aplicado / Prescripto * ({prescribedProductsByCategory.length} en BD)
                                    </label>
                                    <Link
                                      to="/resources"
                                      className="text-[9px] font-mono font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                    >
                                      Ver Catálogo BD →
                                    </Link>
                                  </div>
                                  <select
                                    value={
                                      isCustomAgroProduct
                                        ? '__CUSTOM__'
                                        : prescribedProductsByCategory.some(r => r.name === quickAgroProduct)
                                        ? quickAgroProduct
                                        : prescribedProductsByCategory[0]?.name || '__CUSTOM__'
                                    }
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val === '__CUSTOM__') {
                                        setIsCustomAgroProduct(true);
                                        setQuickAgroProduct('');
                                      } else {
                                        const found = prescribedProductsByCategory.find(r => r.name === val);
                                        if (found) {
                                          applyCatalogResourceToQuickAgro(found);
                                        }
                                      }
                                    }}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-500/40 dark:border-teal-500/40 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                  >
                                    {prescribedProductsByCategory.map(res => (
                                      <option key={res.id} value={res.name}>
                                        {res.name} — {res.recommendedDosagePerHa ?? 2} {res.dosageUnit || 'L/ha'} ({res.senasaRegisterNumber || 'SENASA'}) [Stock: {res.stock ?? 0} {res.unit}]
                                      </option>
                                    ))}
                                    <option value="__CUSTOM__">
                                      + Otro Producto Comercial (Registrar en Base de Datos)
                                    </option>
                                  </select>

                                  {isCustomAgroProduct && (
                                    <input
                                      type="text"
                                      value={quickAgroProduct}
                                      onChange={e => setQuickAgroProduct(e.target.value)}
                                      placeholder="Escribir nombre del nuevo producto comercial (se vinculará a la BD)..."
                                      className="w-full min-w-0 p-2.5 rounded-xl bg-teal-50/50 dark:bg-slate-950 border border-teal-500/50 text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0">
                                <div className="col-span-2 min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Principio Activo / Composición
                                  </label>
                                  <input
                                    type="text"
                                    value={quickAgroActiveIngredient}
                                    onChange={e => setQuickAgroActiveIngredient(e.target.value)}
                                    placeholder="Ej: Ácidos Húmicos 15% / Azadiractina 1.2%"
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Dosis / ha *
                                  </label>
                                  <div className="flex gap-1 min-w-0">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={quickAgroDosage}
                                      onChange={e => setQuickAgroDosage(e.target.value)}
                                      className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold dark:text-white"
                                    />
                                    <select
                                      value={quickAgroUnit}
                                      onChange={e =>
                                        setQuickAgroUnit(e.target.value as 'L/ha' | 'kg/ha' | 'cc/ha' | 'g/ha')
                                      }
                                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold dark:text-white shrink-0"
                                    >
                                      <option value="L/ha">L/ha</option>
                                      <option value="kg/ha">kg/ha</option>
                                      <option value="cc/ha">cc/ha</option>
                                      <option value="g/ha">g/ha</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-amber-500 block mb-1">
                                    Carencia (días)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quickAgroSafetyDays}
                                    onChange={e => setQuickAgroSafetyDays(e.target.value)}
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 text-xs font-mono font-bold dark:text-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 min-w-0">
                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Método de Aplicación
                                  </label>
                                  <select
                                    value={quickAgroMethod}
                                    onChange={e =>
                                      setQuickAgroMethod(
                                        e.target.value as AgrochemicalApplication['applicationMethod']
                                      )
                                    }
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                  >
                                    <option value="Fertirriego">💧 Fertirriego (Goteo/Venturi)</option>
                                    <option value="Pulverización Terrestre">🚜 Pulverización Terrestre</option>
                                    <option value="Incorporación Edáfica">🌱 Incorporación Edáfica (Suelo)</option>
                                    <option value="Mochila Manual">🎒 Mochila Manual</option>
                                    <option value="Dron Agrícola">🛸 Dron Agrícola</option>
                                  </select>
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Registro Oficial SENASA *
                                  </label>
                                  <input
                                    type="text"
                                    value={quickAgroSenasa}
                                    onChange={e => setQuickAgroSenasa(e.target.value)}
                                    placeholder="SENASA #38.412"
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono dark:text-white"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    N° Lote Recepcionado *
                                  </label>
                                  <input
                                    type="text"
                                    value={quickAgroBatch}
                                    onChange={e => setQuickAgroBatch(e.target.value)}
                                    placeholder="LOT-2026-A"
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono dark:text-white"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                    Blanco MIP / Objetivo
                                  </label>
                                  <input
                                    type="text"
                                    value={quickAgroTarget}
                                    onChange={e => setQuickAgroTarget(e.target.value)}
                                    placeholder="Ej: Arañuela Roja / NPK"
                                    className="w-full min-w-0 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 min-w-0">
                                {(() => {
                                  const totalToApply = Number(
                                    (
                                      Math.max(0.1, Number(quickAgroDosage) || 0) *
                                      Math.max(0.05, currentPlotMetrics.areaHa || 0.1)
                                    ).toFixed(2)
                                  );
                                  const selectedRes = resources.find(
                                    r => r.name.trim().toLowerCase() === quickAgroProduct.trim().toLowerCase()
                                  );
                                  const currentStock = selectedRes?.stock ?? 0;
                                  const remainingStock = Math.max(0, Number((currentStock - totalToApply).toFixed(2)));
                                  return (
                                    <div className="text-[10.5px] font-mono text-teal-700 dark:text-teal-300 bg-teal-500/10 px-3 py-2 rounded-xl border border-teal-500/20 flex-1 min-w-0">
                                      Total en {currentPlotData.plot.name} ({currentPlotMetrics.areaHa} ha):{' '}
                                      <strong>
                                        {totalToApply} {quickAgroUnit.replace('/ha', '')}
                                      </strong>
                                      {selectedRes && (
                                        <>
                                          {' '}
                                          · Stock Galpón: <strong>{currentStock}</strong> → Remanente:{' '}
                                          <strong>{remainingStock} {selectedRes.unit}</strong>
                                        </>
                                      )}{' '}
                                      · Libera Cosecha:{' '}
                                      <strong>
                                        {addDaysToIsoDate(
                                          formData.date || new Date().toISOString().split('T')[0],
                                          Math.max(0, Number(quickAgroSafetyDays) || 0)
                                        )}
                                      </strong>
                                    </div>
                                  );
                                })()}

                                <button
                                  type="button"
                                  onClick={handleQuickSaveAgroOnly}
                                  disabled={isSavingQuickAgro || !quickAgroProduct.trim()}
                                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                                >
                                  {isSavingQuickAgro ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <ShieldCheck size={13} />
                                  )}
                                  <span>Asentar en Cuaderno SENASA</span>
                                </button>
                              </div>
                            </div>

                            {/* Cotejo en vivo con el Cuaderno Fitosanitario SENASA de la Parcela */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-64 overflow-y-auto font-mono min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400">
                                  Cuaderno SENASA de la Parcela ({currentPlotAgroApps.length})
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    currentPlotSafetyStatus.inSafetyPeriod ? 'text-amber-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {currentPlotSafetyStatus.inSafetyPeriod
                                    ? `Carencia: ${currentPlotSafetyStatus.daysRemaining}d`
                                    : '✓ Apto Cosecha'}
                                </span>
                              </div>
                              {currentPlotAgroApps.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-4 text-center font-sans">
                                  Sin aplicaciones registradas en el Cuaderno Fitosanitario para este lote.
                                </p>
                              ) : (
                                currentPlotAgroApps.slice(0, 5).map(app => (
                                  <div
                                    key={app.id}
                                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-teal-600 dark:text-teal-400 truncate">
                                        {app.category} · {app.date}
                                      </span>
                                      <span
                                        className={`text-[9.5px] font-bold shrink-0 ${
                                          app.safetyPeriodDays === 0 ? 'text-emerald-600' : 'text-amber-600'
                                        }`}
                                      >
                                        {app.safetyPeriodDays === 0
                                          ? 'Carencia 0d'
                                          : `Lib: ${app.harvestSafetyDate}`}
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-white truncate">
                                      {app.productName} ({app.dosagePerHa} {app.dosageUnit})
                                    </p>
                                    {app.targetPestOrDisease && (
                                      <span className="text-[9.5px] text-rose-500 block truncate">
                                        🎯 Blanco: {app.targetPestOrDisease}
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ==================================================================== */}
                    {/* SECCIÓN 3: CRONOGRAMA DE COSECHA, PROYECCIÓN PRE-VENTA Y CIERRE      */}
                    {/* ==================================================================== */}
                    {(fieldViewSection === 'all' || fieldViewSection === 'harvest') && (
                      <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 space-y-5 border border-slate-800 shadow-lg min-w-0 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                              Reloj Biológico del Germoplasma · Proyección Comercial de Pre-Venta & Transición de Ciclo
                            </span>
                            <h4 className="text-base md:text-lg font-black uppercase tracking-tight mt-0.5">
                              3. Cronograma Óptimo de Cosecha & Disponibilidad Comercial ({currentPlotData.plot.name})
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-3 py-2 rounded-xl text-[10px] font-mono font-black uppercase border ${
                                currentPlotSafetyStatus.inSafetyPeriod
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              }`}
                            >
                              {currentPlotSafetyStatus.inSafetyPeriod
                                ? `⚠️ En Carencia SENASA hasta ${currentPlotSafetyStatus.releaseDate} (${currentPlotSafetyStatus.daysRemaining}d · ${currentPlotSafetyStatus.productName})`
                                : '✓ Libre de Carencia SENASA (Apto Trilla)'}
                            </span>

                            <button
                              type="button"
                              onClick={() => setIsClosureModalOpen(true)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Award size={14} />
                              <span>Acta Oficial de Cierre / Cosecha GS1</span>
                            </button>
                          </div>
                        </div>

                        {/* PARTE A: LÍNEA DE TIEMPO DESDE SIEMBRA Y VENTANAS ÓPTIMAS POR GERMOPLASMA */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                            <div>
                              <span className="text-slate-400">Germoplasma Declarado:</span>{' '}
                              <strong className="text-white">{variety?.name || 'S/D'}</strong>{' '}
                              <span className="text-emerald-400">
                                ({variety?.usage || 'Dual'} · Ciclo Oficial: {currentPlotMetrics.cycleDays} días ·{' '}
                                {variety?.gddRequirement || 1850} GDD)
                              </span>
                            </div>
                            <div>
                              <span className="text-amber-400 font-bold">
                                {currentPlotMetrics.daysToHarvest > 0
                                  ? `⏳ Faltan ${currentPlotMetrics.daysToHarvest} días para Cosecha Óptima`
                                  : `✅ En Ventana Óptima de Cosecha (+${Math.abs(currentPlotMetrics.daysToHarvest)} días)`}
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso biológico del ciclo */}
                          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                            <div
                              className={`h-full rounded-full transition-all ${
                                currentPlotMetrics.cycleProgressPct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(4, currentPlotMetrics.cycleProgressPct)}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-xs">
                            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 min-w-0">
                              <span className="text-[9px] uppercase text-slate-400 block">Fecha de Siembra</span>
                              <strong className="text-sm text-white block mt-0.5">
                                {currentPlotData.plot.sowingDate}
                              </strong>
                              <span className="text-[10px] text-emerald-400">
                                {currentPlotMetrics.dds} Días Desde Siembra (DDS)
                              </span>
                            </div>

                            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 min-w-0">
                              <span className="text-[9px] uppercase text-slate-400 block">
                                Ventana Óptima Corte Fibra
                              </span>
                              <strong className="text-sm text-indigo-300 block mt-0.5">
                                {currentPlotMetrics.optimalFiberCutDate}
                              </strong>
                              <span className="text-[10px] text-slate-400">
                                Fin Floración (~{Math.max(65, currentPlotMetrics.cycleDays - 18)} DDS)
                              </span>
                            </div>

                            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 min-w-0">
                              <span className="text-[9px] uppercase text-slate-400 block">
                                Fecha Óptima Grano / Ciclo
                              </span>
                              <strong className="text-sm text-amber-400 block mt-0.5">
                                {currentPlotMetrics.optimalBiologicalHarvestDate}
                              </strong>
                              <span className="text-[10px] text-slate-400">
                                Ciclo Germoplasma ({currentPlotMetrics.cycleDays} DDS)
                              </span>
                            </div>

                            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 min-w-0">
                              <span className="text-[9px] uppercase text-emerald-300 block">
                                Disponibilidad Comercial Pre-Venta
                              </span>
                              <strong className="text-sm text-white block mt-0.5">
                                {currentPlotData.plot.isHarvestScheduled
                                  ? `${currentPlotData.plot.scheduledHarvestDate} (Prog.)`
                                  : currentPlotMetrics.targetHarvestDate}
                              </strong>
                              <span className="text-[10px] text-emerald-400">
                                {currentPlotMetrics.daysToHarvest > 0
                                  ? `Entrega en T-${currentPlotMetrics.daysToHarvest} días`
                                  : 'Disponible para trilla inmediata'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* PARTE B: PROYECCIÓN COMERCIAL DE VOLUMEN VENDIBLE + MUESTREO DE PRE-COSECHA */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
                          {/* Tarjetas de Volumen Proyectado para Pre-Venta */}
                          <div className="lg:col-span-5 space-y-3 min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Volumen Estimado en Lote para Pre-Venta ({currentPlotMetrics.areaHa} ha)
                            </span>

                            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between font-mono min-w-0">
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                                  🌾 Grano Seco Comercializable
                                </span>
                                <strong className="text-xl font-black text-white">
                                  {currentPlotMetrics.liveProjectedGrainTotalKg.toLocaleString('es-AR')} kg
                                </strong>
                                <span className="text-[10px] text-slate-300 block truncate">
                                  Rinde proyectado: {currentPlotMetrics.liveProjectedGrainKgHa.toLocaleString('es-AR')}{' '}
                                  kg/ha (
                                  {currentPlotMetrics.usingFieldSampleForGrain
                                    ? 'Por muestreo 1m²'
                                    : `Germoplasma × Vigor ${formData.vigor || 8}/9`}
                                  )
                                </span>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-bold text-emerald-300 block">
                                  {(currentPlotMetrics.liveProjectedGrainTotalKg / 1000).toFixed(2)} Tn
                                </span>
                                <span className="text-[9px] text-slate-400">Lote completo</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between font-mono min-w-0">
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-indigo-300 block">
                                  🌿 Fibra / Tallo Seco Industrial
                                </span>
                                <strong className="text-xl font-black text-white">
                                  {currentPlotMetrics.liveProjectedFiberTotalTn} Tn
                                </strong>
                                <span className="text-[10px] text-slate-300 block truncate">
                                  Rinde proyectado: {currentPlotMetrics.liveProjectedFiberTnHa} Tn/ha (
                                  {currentPlotMetrics.usingFieldSampleForFiber
                                    ? 'Por muestreo 1m²'
                                    : `Germoplasma × Vigor ${formData.vigor || 8}/9`}
                                  )
                                </span>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-bold text-indigo-300 block">
                                  {Math.round(currentPlotMetrics.liveProjectedFiberTotalTn * 1000).toLocaleString(
                                    'es-AR'
                                  )}{' '}
                                  kg
                                </span>
                                <span className="text-[9px] text-slate-400">Biomasa tallo</span>
                              </div>
                            </div>
                          </div>

                          {/* Muestreo de Campo (Marco 1 m²) + Programación Rápida de Cosecha */}
                          <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3.5 min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                              Muestreo Pre-Cosecha en Lote (Marco 1 m²) & Programación de Trilla
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0">
                              <div className="min-w-0">
                                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1 truncate">
                                  Plena Floración (50%)
                                </label>
                                <input
                                  type="date"
                                  className="w-full min-w-0 bg-slate-900 border border-white/15 p-2.5 rounded-xl text-xs font-mono outline-none focus:border-emerald-500"
                                  value={formData.floweringDate}
                                  onChange={e => setFormData({ ...formData, floweringDate: e.target.value })}
                                />
                              </div>

                              <div className="min-w-0">
                                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1 truncate">
                                  Muestra Grano (g/m²)
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="1"
                                  placeholder="0 = Usar genética"
                                  className="w-full min-w-0 bg-slate-900 border border-white/15 p-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500"
                                  value={formData.seedYield || ''}
                                  onChange={e => setFormData({ ...formData, seedYield: Number(e.target.value) })}
                                />
                              </div>

                              <div className="min-w-0">
                                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1 truncate">
                                  Muestra Tallo (g/m²)
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="10"
                                  placeholder="0 = Usar genética"
                                  className="w-full min-w-0 bg-slate-900 border border-white/15 p-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500"
                                  value={formData.stemWeight || ''}
                                  onChange={e => setFormData({ ...formData, stemWeight: Number(e.target.value) })}
                                />
                              </div>

                              <div className="min-w-0">
                                <label className="text-[9px] uppercase font-black text-amber-400 block mb-1 truncate">
                                  Humedad Grano Lote %
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.5"
                                  className="w-full min-w-0 bg-slate-900 border border-amber-500/30 p-2.5 rounded-xl text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                                  value={grainMoistureFieldPct}
                                  onChange={e => setGrainMoistureFieldPct(Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {/* Programación de Fecha de Cosecha sincronizada con la Parcela */}
                            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2.5 min-w-0">
                              <div className="flex-1 min-w-0">
                                <label className="text-[9px] uppercase font-black text-emerald-400 block mb-1">
                                  Fecha Programada de Cosecha / Compromiso Comercial
                                </label>
                                <input
                                  type="date"
                                  value={scheduleHarvestDateInput}
                                  onChange={e => setScheduleHarvestDateInput(e.target.value)}
                                  className="w-full min-w-0 bg-slate-900 border border-emerald-500/40 p-2.5 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-400"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={handleQuickScheduleHarvest}
                                disabled={isSchedulingHarvest || !scheduleHarvestDateInput}
                                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                              >
                                {isSchedulingHarvest ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Calendar size={14} />
                                )}
                                <span>Fijar Fecha de Cosecha en Parcela</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FOOTER DE ACCIONES Y SELLADO INTEGRAL */}
                    <div className="pt-4 border-t dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAdvance}
                          onChange={e => setAutoAdvance(e.target.checked)}
                          className="rounded accent-emerald-600 w-4 h-4"
                        />
                        <span>Avanzar automáticamente al siguiente lote de la cola al sellar</span>
                      </label>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {editingRecordId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecordId(null);
                              setActiveTab('history');
                            }}
                            className="px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer"
                          >
                            Cancelar Edición
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSaving || isFetchingConditions}
                          className={`w-full sm:w-auto px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                            justSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-black dark:hover:bg-emerald-500'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="animate-spin mr-2" size={18} />
                          ) : justSaved ? (
                            <CheckCircle2 className="mr-2" size={18} />
                          ) : (
                            <Save className="mr-2" size={18} />
                          )}
                          {justSaved
                            ? '¡Relevamiento 360° Sellado!'
                            : editingRecordId
                            ? 'Guardar Cambios en Informe'
                            : 'Sellar Relevamiento Integral Nucleus'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* VISTA 2: HISTORIAL COTEJADO 360° (BIOMETRÍA + BITÁCORA + PLUVIÓMETRO + LABORES + FITOSANITARIO) */}
              {activeTab === 'history' && (
                <div className="p-5 md:p-7 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                        Línea de Tiempo & Cotejo 360° de {currentPlotData.plot.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Auditoría unificada de Informes Biométricos + MIP, Bitácora Fotográfica, Pluviómetro/Riego, Labores y Cuaderno Fitosanitario SENASA
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordId(null);
                        setActiveTab('form');
                      }}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-emerald-700 transition cursor-pointer"
                    >
                      + Nuevo Relevamiento
                    </button>
                  </div>

                  {/* Filtros de categoría del historial cotejado */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'all', label: 'Todo el Historial 360°' },
                        { id: 'trials', label: `Biometría & MIP (${plotHistory.length})` },
                        { id: 'phytosanitary', label: `Fitosanitario & Suelo (${currentPlotAgroApps.length})` },
                        { id: 'logs', label: `Bitácora & Fotos (${currentPlotLogs.length})` },
                        { id: 'hydric', label: `Pluviómetro & Riego (${currentPlotHydric.length})` },
                        { id: 'labors', label: `Labores & Suelo (${currentPlotTasks.length})` }
                      ] as const
                    ).map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHistoryFilter(tab.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                          historyFilter === tab.id
                            ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* BLOQUE 1: INFORMES BIOMÉTRICOS NUCLEUS TRACE */}
                  {(historyFilter === 'all' || historyFilter === 'trials') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                        Informes Biométricos & MIP Nucleus Trace ({plotHistory.length})
                      </h4>
                      {plotHistory.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay informes biométricos registrados para este lote.
                        </div>
                      ) : (
                        plotHistory.map(record => {
                          const stageMeta = getStageMeta(record.stage);
                          return (
                            <div
                              key={record.id}
                              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
                            >
                              <div className="flex flex-wrap justify-between items-center gap-2 border-b dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-black text-slate-800 dark:text-white text-sm">
                                    {record.date}{' '}
                                    <span className="text-xs font-normal text-slate-400">{record.time || ''} HS</span>
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1.5 ${stageMeta.badgeClass}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${stageMeta.dotClass}`} />
                                    {record.stage}
                                  </span>
                                  {record.pestThresholdStatus && (
                                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                      MIP: {record.pestThresholdStatus}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase mr-2">
                                    Auditado por: {record.createdByName || 'Técnico Nucleus'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleEditRecord(record)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                                    title="Editar Informe"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  {confirmDeleteRecordId === record.id ? (
                                    <div className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await deleteTrialRecord(record.id);
                                          setConfirmDeleteRecordId(null);
                                        }}
                                        className="text-[9px] font-black uppercase text-red-600 hover:underline cursor-pointer"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteRecordId(null)}
                                        className="text-[9px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRecordId(record.id)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 transition cursor-pointer"
                                      title="Eliminar Informe"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Altura Media</p>
                                  <p className="font-black text-emerald-600 text-sm">{record.plantHeight || 0} cm</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Población</p>
                                  <p className="font-black text-slate-700 dark:text-slate-200 text-sm">
                                    {record.plantsPerMeter || 0} pl/m²
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Vigor / Homog.</p>
                                  <p className="font-black text-emerald-600 text-sm">
                                    {record.vigor || '-'}/9 · {record.uniformity || '-'}/9
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Sanidad (Enf/Plag)</p>
                                  <p className="font-black text-amber-600 text-sm">
                                    {record.diseasesScore || 1}/9 · {record.pestsScore || 1}/9
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Clima / Fotoperiodo</p>
                                  <p className="font-black text-slate-600 dark:text-slate-300 text-sm">
                                    {record.temperature}°C · {record.lightHours || 12}h
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Muestreo Grano/Tallo</p>
                                  <p className="font-black text-slate-700 dark:text-slate-200 text-sm">
                                    {record.seedYield || 0}g · {record.stemWeight || 0}g/m²
                                  </p>
                                </div>
                              </div>

                              {/* Detalle de MIP, Fauna Benéfica y Nutrición/Suelo si están presentes */}
                              {((record.detectedPests && record.detectedPests.length > 0) ||
                                (record.detectedDiseases && record.detectedDiseases.length > 0) ||
                                (record.beneficialFauna && record.beneficialFauna.length > 0) ||
                                record.nutritionalStatus ||
                                record.soilConditionNotes) && (
                                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                                  {record.nutritionalStatus && (
                                    <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold">
                                      🌱 Nutrición: {record.nutritionalStatus}
                                    </span>
                                  )}
                                  {record.detectedPests?.map(p => (
                                    <span
                                      key={p}
                                      className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                                    >
                                      🐛 {p}
                                    </span>
                                  ))}
                                  {record.detectedDiseases?.map(d => (
                                    <span
                                      key={d}
                                      className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                                    >
                                      🍄 {d}
                                    </span>
                                  ))}
                                  {record.beneficialFauna?.map(b => (
                                    <span
                                      key={b}
                                      className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                                    >
                                      🐞 {b}
                                    </span>
                                  ))}
                                  {record.soilConditionNotes && (
                                    <span className="text-slate-500 dark:text-slate-400 italic">
                                      · Suelo: {record.soilConditionNotes}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* BLOQUE 2: CUADERNO FITOSANITARIO SENASA, FERTILIZANTES Y MEJORADORES DE SUELO */}
                  {(historyFilter === 'all' || historyFilter === 'phytosanitary') && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-black uppercase text-teal-600 tracking-wider">
                          Cuaderno Fitosanitario SENASA, Fertilizantes & Mejoradores de Suelo ({currentPlotAgroApps.length})
                        </h4>
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                            currentPlotSafetyStatus.inSafetyPeriod
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {currentPlotSafetyStatus.inSafetyPeriod
                            ? `⚠️ En Carencia Pre-Cosecha (${currentPlotSafetyStatus.daysRemaining}d · Lib: ${currentPlotSafetyStatus.releaseDate})`
                            : '✓ Lote Libre de Carencia SENASA'}
                        </span>
                      </div>

                      {currentPlotAgroApps.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay aplicaciones fitosanitarias, fertilizantes ni mejoradores de suelo registrados en esta parcela.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentPlotAgroApps.map(app => (
                            <div
                              key={app.id}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 font-mono text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                  {app.category}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">
                                    {app.date} {app.time || ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteAgrochemicalApplication(app.id)}
                                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                                    title="Eliminar registro fitosanitario"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm font-black text-slate-900 dark:text-white font-sans">
                                {app.productName}{' '}
                                <span className="text-xs font-normal text-slate-500">({app.activeIngredient})</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                                <span>
                                  Dosis: <strong>{app.dosagePerHa} {app.dosageUnit}</strong> (Total: {app.totalAppliedAmount})
                                </span>
                                <span>·</span>
                                <span>{app.applicationMethod}</span>
                                <span>·</span>
                                <span className={app.safetyPeriodDays === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                  {app.safetyPeriodDays === 0
                                    ? 'Carencia 0d'
                                    : `Carencia ${app.safetyPeriodDays}d (Lib: ${app.harvestSafetyDate})`}
                                </span>
                              </div>
                              {app.targetPestOrDisease && (
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                  🎯 Blanco MIP / Nutrición: {app.targetPestOrDisease}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 3: BITÁCORA MULTIMEDIA Y EVIDENCIA FOTOGRÁFICA */}
                  {(historyFilter === 'all' || historyFilter === 'logs') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-purple-600 tracking-wider">
                        Bitácora Multimedia & Fotografías de Campo ({currentPlotLogs.length})
                      </h4>
                      {currentPlotLogs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay fotografías ni notas de bitácora cargadas para esta parcela.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentPlotLogs.map(lg => (
                            <div
                              key={lg.id}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3"
                            >
                              {lg.photoUrl && (
                                <img
                                  src={lg.photoUrl}
                                  alt="Evidencia"
                                  onClick={() => setPreviewPhotoUrl(lg.photoUrl!)}
                                  className="w-20 h-20 rounded-xl object-cover shrink-0 cursor-pointer border border-purple-500/30"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                                    📷 {lg.date} {lg.time || ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteLog(lg.id)}
                                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                                    title="Eliminar registro de bitácora"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                                  {lg.note}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 4: LABORES CULTURALES Y PREPARACIÓN DE SUELO */}
                  {(historyFilter === 'all' || historyFilter === 'labors') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-amber-600 tracking-wider">
                        Labores Culturales & Preparación de Suelo ({currentPlotTasks.length})
                      </h4>
                      {currentPlotTasks.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay labores registradas para esta parcela.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentPlotTasks.map(tk => (
                            <div
                              key={tk.id}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2 text-xs font-mono">
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    {tk.laborType || 'LABOR'}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-slate-500">{tk.executionDate || tk.dueDate}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-bold text-emerald-600">{tk.status}</span>
                                </div>
                                <p className="text-sm font-black text-slate-800 dark:text-white mt-1">{tk.title}</p>
                                {tk.description && <p className="text-xs text-slate-500">{tk.description}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteTask(tk.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Eliminar labor"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 5: PLUVIÓMETRO Y RIEGO DE LA PARCELA */}
                  {(historyFilter === 'all' || historyFilter === 'hydric') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-sky-600 tracking-wider">
                        Registros de Pluviómetro & Riego en Ciclo ({currentPlotHydric.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
                        {currentPlotHydric.slice(0, 18).map(hr => {
                          const isSat =
                            String(hr.id).startsWith('auto-rain-') || String(hr.notes || '').includes('Open-Meteo');
                          return (
                            <div
                              key={hr.id}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{hr.date}</span>
                                <span
                                  className={`block text-[10px] font-bold ${
                                    hr.type === 'Riego' ? 'text-emerald-600' : 'text-sky-600'
                                  }`}
                                >
                                  {hr.type === 'Riego' ? '💧 Riego Campo' : isSat ? '🛰️ Lluvia ERA5' : '🌧️ Pluviómetro'}
                                </span>
                              </div>
                              <div className="text-right">
                                <strong className="text-sm font-black text-slate-900 dark:text-white">
                                  {hr.amountMm} mm
                                </strong>
                                <span className="block text-[9.5px] text-slate-400">
                                  {(hr.amountMm * 10).toFixed(0)} m³/ha
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center bg-slate-50 dark:bg-slate-950/50">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-full mb-6 shadow-sm">
                <CheckCircle2 size={64} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 mb-2">
                Sin Lotes para el Filtro Seleccionado
              </h3>
              <p className="text-sm font-medium max-w-xs mx-auto text-slate-500">
                Ajustá los filtros de establecimiento, genética o tipo de lote para continuar la recorrida.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL OFICIAL DE ACTA DE CIERRE DE CICLO Y COSECHA HOMOLOGADA (GS1 / QR) */}
      {currentPlotData && (
        <PlotCycleClosureModal
          isOpen={isClosureModalOpen}
          onClose={() => setIsClosureModalOpen(false)}
          plot={currentPlotData.plot}
          location={currentPlotData.location}
          variety={variety}
        />
      )}

      {/* MODAL DE CÁMARA WEBRTC EN VIVO */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Camera size={16} className="text-purple-400" />
                Captura Fotográfica de Evidencia — {currentPlotData?.plot.name}
              </h3>
              <button type="button" onClick={stopWebCamera} className="p-1.5 rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                {cameraError}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={stopWebCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={captureWebCameraFrame}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={14} /> Capturar Fotografía
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA DE FOTOGRAFÍA DE BITÁCORA */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewPhotoUrl}
            alt="Vista ampliada de Bitácora"
            className="max-w-3xl max-h-[85vh] rounded-2xl border border-white/20 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
