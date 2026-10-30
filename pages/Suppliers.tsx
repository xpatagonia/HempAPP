import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Supplier, SupplierCategory, TechnicalHomologationStatus, 
  SupplierLotInspection, AgronomicInspectionVerdict, LotQualityGrade, SeedBatch,
  SupplierHumanActor, SupplierActorRole, User
} from '../types';
import { DEMO_SUPPLIER_INSPECTIONS } from '../src/data/initialDemoData';
import { 
  Plus, Edit2, Trash2, MapPin, Mail, 
  Search, Save, Loader2, X, Briefcase, Truck, Sprout,
  ShieldCheck, CheckCircle2, AlertTriangle, Award, FlaskConical, 
  ExternalLink, Printer, Check, Copy, FileText, ChevronRight,
  Filter, CheckSquare, Phone, Globe, Microscope, Droplets,
  Scale, ClipboardCheck, ArrowUpDown, Sparkles, Building2,
  Calendar, UserCheck, AlertCircle, QrCode, Users, Layers, PackageCheck,
  Send, Eye, Lock
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from '../components/BarcodeRenderer';
import { sendUserProfileWelcomeEmail } from '../src/services/emailNotificationService';
import {
  SUPPLIER_ACTOR_ROLES,
  SUPPLIER_ACTOR_ROLES_INFO,
  doesPlotBelongToSupplier
} from '../src/utils/structurePermissions';

const generateId = (prefix = 'sup') => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-` + Math.random().toString(36).substring(2, 9);
};

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  'Semillero_Criadero': { label: 'Semillero & Criadero INASE', icon: Sprout, color: 'emerald' },
  'Bioinsumos_Fertilizantes': { label: 'Bioinsumos & Fertilizantes SENASA', icon: Briefcase, color: 'purple' },
  'Fitosanitarios_Control': { label: 'Fitosanitarios & Biológicos SENASA', icon: ShieldCheck, color: 'amber' },
  'Mecanizacion_Servicios': { label: 'Mecanización, Siembra & Cosecha', icon: Truck, color: 'sky' },
  'Laboratorio_Analitica': { label: 'Laboratorio HPLC & Analítica', icon: FlaskConical, color: 'blue' },
  'Sustratos_Vivero': { label: 'Sustratos & Propagación Agámica', icon: Sprout, color: 'teal' },
  // Compatibilidad legada
  'Semillas': { label: 'Semillas & Germoplasma', icon: Sprout, color: 'emerald' },
  'Insumos': { label: 'Insumos Agrícolas', icon: Briefcase, color: 'purple' },
  'Servicios': { label: 'Servicios de Campo', icon: Truck, color: 'sky' },
  'Recursos Humanos': { label: 'Servicios Técnicos Especializados', icon: Briefcase, color: 'slate' }
};

const HOMOLOGATION_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  'Homologado_Conforme': { 
    label: 'Homologado Conforme', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/60', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    border: 'border-emerald-300 dark:border-emerald-800' 
  },
  'En_Auditoria_Tecnica': { 
    label: 'En Auditoría Técnica', 
    bg: 'bg-amber-50 dark:bg-amber-950/60', 
    text: 'text-amber-700 dark:text-amber-300', 
    border: 'border-amber-300 dark:border-amber-800' 
  },
  'Cuarentena_Tecnica': { 
    label: 'Cuarentena Técnica', 
    bg: 'bg-rose-50 dark:bg-rose-950/60', 
    text: 'text-rose-700 dark:text-rose-300', 
    border: 'border-rose-300 dark:border-rose-800' 
  },
  'No_Apto_Restringido': { 
    label: 'No Apto / Restringido', 
    bg: 'bg-slate-100 dark:bg-slate-800', 
    text: 'text-slate-600 dark:text-slate-400', 
    border: 'border-slate-300 dark:border-slate-700' 
  }
};

const VERDICT_CONFIG: Record<AgronomicInspectionVerdict, { label: string; bg: string; text: string; border: string; icon: any }> = {
  'APROBADO_CAMPO': {
    label: 'Aprobado para Campo',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2
  },
  'EN_CUARENTENA_OBSERVADO': {
    label: 'Cuarentena / Observado',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    icon: AlertTriangle
  },
  'RECHAZADO_DEVOLUCION': {
    label: 'Rechazado Fitosanitario',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800',
    icon: AlertCircle
  }
};

export const QUALITY_GRADE_CONFIG: Record<LotQualityGrade, { label: string; shortLabel: string; bg: string; text: string; border: string; description: string }> = {
  'GRADO_A_SUPERIOR': {
    label: 'Grado A · Calidad Superior (Semilla Élite)',
    shortLabel: 'GRADO A · ÉLITE',
    bg: 'bg-emerald-100 dark:bg-emerald-950/80',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-400 dark:border-emerald-700',
    description: 'PG ≥ 90%, Pureza ≥ 99%, Libre de Patógenos y Cero Residuos. Apta para multiplicación y siembra de alta precisión.'
  },
  'GRADO_B_ESTANDAR': {
    label: 'Grado B · Estándar Fiscalizado INASE',
    shortLabel: 'GRADO B · ESTÁNDAR',
    bg: 'bg-sky-100 dark:bg-sky-950/80',
    text: 'text-sky-800 dark:text-sky-300',
    border: 'border-sky-400 dark:border-sky-700',
    description: 'PG 80–89%, Pureza ≥ 98%, Dentro de tolerancia sanitaria SENASA. Apta para siembra extensiva industrial.'
  },
  'GRADO_C_CONDICIONAL': {
    label: 'Grado C · Condicional (Ajuste de Densidad)',
    shortLabel: 'GRADO C · CONDICIONAL',
    bg: 'bg-amber-100 dark:bg-amber-950/80',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-400 dark:border-amber-700',
    description: 'PG 70–79% o humedad observada. Requiere corrección de densidad de siembra (+15% kg/ha) y monitoreo temprano.'
  },
  'NO_CONFORME': {
    label: 'No Conforme · Rechazo Técnico / Bloqueado',
    shortLabel: 'NO CONFORME',
    bg: 'bg-rose-100 dark:bg-rose-950/80',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-400 dark:border-rose-700',
    description: 'PG < 70%, presencia de patógenos cuarentenarios o exceso de LMR. Lote bloqueado para implantación.'
  }
};

export function calculateLotQuality(data: Partial<SupplierLotInspection>): { grade: LotQualityGrade; score: number; recommendedVerdict: AgronomicInspectionVerdict } {
  if (
    data.pathogenScreeningResult === 'Positivo Cuarentenario (Alerta)' ||
    data.residueStatus === 'Excede LMR' ||
    data.weedSeedsFound
  ) {
    return { grade: 'NO_CONFORME', score: 35, recommendedVerdict: 'RECHAZADO_DEVOLUCION' };
  }

  const pg = Number(data.germinationTestedPct ?? 90);
  const purity = Number(data.purityPct ?? 99);
  const moisture = Number(data.moisturePct ?? 9);
  const vigor = Number(data.vigorScore ?? 8);

  if (pg < 70 || purity < 95 || moisture > 14) {
    return { grade: 'NO_CONFORME', score: Math.max(40, Math.round(pg * 0.6)), recommendedVerdict: 'RECHAZADO_DEVOLUCION' };
  }

  // Ponderación técnica ISTA: PG (45%), Pureza (25%), Humedad óptima 7-10% (15%), Vigor 1-9 (15%)
  const pgScore = Math.min(100, (pg / 95) * 100);
  const purityScore = Math.min(100, (purity / 99.8) * 100);
  const moistureScore = moisture >= 7 && moisture <= 10 ? 100 : moisture <= 12 ? 82 : 60;
  const vigorScorePct = Math.min(100, (vigor / 9) * 100);

  let rawScore = Math.round(pgScore * 0.45 + purityScore * 0.25 + moistureScore * 0.15 + vigorScorePct * 0.15);
  if (data.pathogenScreeningResult === 'Presencia Aislada No Cuarentenaria') rawScore -= 12;
  if (data.residueStatus === 'Dentro de LMR SENASA') rawScore -= 5;
  const finalScore = Math.max(10, Math.min(100, rawScore));

  if (pg >= 90 && purity >= 98.5 && moisture <= 10.5 && data.pathogenScreeningResult === 'Negativo (Conforme)') {
    return { grade: 'GRADO_A_SUPERIOR', score: finalScore, recommendedVerdict: 'APROBADO_CAMPO' };
  }
  if (pg >= 80 && purity >= 97 && moisture <= 12) {
    return { grade: 'GRADO_B_ESTANDAR', score: finalScore, recommendedVerdict: 'APROBADO_CAMPO' };
  }
  return { grade: 'GRADO_C_CONDICIONAL', score: finalScore, recommendedVerdict: 'EN_CUARENTENA_OBSERVADO' };
}

// Vademécum agronómico de insumos autorizados bajo protocolo GACP / SENASA
const AGRONOMIC_VADEMECUM = [
  {
    name: 'Glomus intraradices / intraradices (Micorrizas)',
    category: 'Biofertilizante & Simbiosis Radicular',
    senasaReg: 'SENASA-REG-BIO-4491-SF',
    activeSubstance: 'Esporas y propágulos viables (1.5 x 10^4 / g)',
    target: 'Promoción de biomasa radicular, tolerancia a estrés hídrico y solubilización de fósforo',
    dose: '1.5 - 2.5 kg/ha en línea de siembra',
    withholdingDays: 0, // Días de carencia
    zeroResidue: true,
    supplierName: 'AgroInsumos Biológicos del Litoral',
    certifiedOrganic: true
  },
  {
    name: 'Trichoderma harzianum (Cepa TH-35)',
    category: 'Biocontrolador Fúngico Preventivo',
    senasaReg: 'SENASA-REG-BIO-3820-BA',
    activeSubstance: 'Conidios viables 1 x 10^9 UFC/ml',
    target: 'Prevención biológica de Fusarium spp., Rhizoctonia y Pythium en implantación',
    dose: '1.0 - 2.0 L/ha en drench o tratamiento de semilla',
    withholdingDays: 0,
    zeroResidue: true,
    supplierName: 'AgroInsumos Biológicos del Litoral',
    certifiedOrganic: true
  },
  {
    name: 'Bacillus thuringiensis var. kurstaki',
    category: 'Bioinsecticida Biológico Específico',
    senasaReg: 'SENASA-REG-INS-11204',
    activeSubstance: 'Cristales proteicos delta-endotoxinas',
    target: 'Control selectivo de orugas desfoliadoras (Helicoverpa spp., Spodoptera)',
    dose: '0.8 - 1.2 kg/ha pulverización foliar temprana',
    withholdingDays: 3,
    zeroResidue: true,
    supplierName: 'AgroInsumos Biológicos del Litoral',
    certifiedOrganic: true
  },
  {
    name: 'Extracto Puro de Azadiractina (Aceite de Neem 10.000 ppm)',
    category: 'Repelente & Regulador de Crecimiento',
    senasaReg: 'SENASA-REG-FIT-7740',
    activeSubstance: 'Azadiractina A + B prensada en frío',
    target: 'Manejo de mosca blanca, pulgón y trips en fase vegetativa',
    dose: '1.5 - 2.0 L/ha',
    withholdingDays: 5,
    zeroResidue: true,
    supplierName: 'BioGenética Andina & Semillas Certificadas',
    certifiedOrganic: true
  },
  {
    name: 'Jabón Potásico con Sales de Ácidos Grasos 40%',
    category: 'Lavador de Melazas & Dispersante',
    senasaReg: 'SENASA-REG-BIO-9011',
    activeSubstance: 'Sales potásicas de ácidos grasos vegetales',
    target: 'Disolución de cutículas cerosas de insectos blandos y limpieza de negrilla',
    dose: '10 - 15 cc / litro de caldo',
    withholdingDays: 1,
    zeroResidue: true,
    supplierName: 'AgroInsumos Biológicos del Litoral',
    certifiedOrganic: true
  }
];

export default function Suppliers() {
  const { 
    suppliers, addSupplier, updateSupplier, deleteSupplier, 
    currentUser, varieties, seedBatches, addSeedBatch, updateSeedBatch,
    resources, addResource, updateResource,
    plots, allPlots, storagePoints, usersList: users,
    addUser, updateUser, startImpersonation
  } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tabs de navegación de la sección agronómica
  const [activeMainTab, setActiveMainTab] = useState<'suppliers' | 'inspections' | 'vademecum'>(
    (searchParams.get('tab') as any) === 'inspections' ? 'inspections' : 'suppliers'
  );

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedSupplierForAudit, setSelectedSupplierForAudit] = useState<Supplier | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalTab, setModalTab] = useState<'technical' | 'regulatory' | 'quality' | 'logistics' | 'humanTeam'>('technical');
  const [dispatchingActorId, setDispatchingActorId] = useState<string | null>(null);
  const [emailToast, setEmailToast] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);
  const [newActorDraft, setNewActorDraft] = useState<{
    name: string;
    actorRole: SupplierActorRole;
    jobTitle: string;
    email: string;
    phone: string;
    dniOrMatricula: string;
    isAccessActive: boolean;
  }>({
    name: '',
    actorRole: 'director_tecnico_obtentor',
    jobTitle: '',
    email: '',
    phone: '',
    dniOrMatricula: '',
    isAccessActive: true
  });

  // Modal para Inspecciones de Lotes
  const [isNewInspectionModalOpen, setIsNewInspectionModalOpen] = useState(searchParams.get('newInspection') === '1');
  const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
  const [selectedInspectionForView, setSelectedInspectionForView] = useState<SupplierLotInspection | null>(null);
  const [syncWithSeedBatch, setSyncWithSeedBatch] = useState<boolean>(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterHomologation, setFilterHomologation] = useState<string>('all');
  const [filterVerdict, setFilterVerdict] = useState<string>('all');

  // Inspecciones de Lote con persistencia en localStorage y fusión garantizada de las 4 Actas Oficiales 25/26
  const [lotInspections, setLotInspections] = useState<SupplierLotInspection[]>(() => {
    const purgedIds = new Set(['insp-1', 'insp-2', 'insp-3', 'insp-4']);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ht_supplier_inspections');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const validCustom = parsed.filter((i: any) => i && i.id && !purgedIds.has(String(i.id)));
            const existingIds = new Set(validCustom.map((i: any) => i.id));
            const merged = [...validCustom];
            DEMO_SUPPLIER_INSPECTIONS.forEach(demoInsp => {
              if (!existingIds.has(demoInsp.id)) {
                merged.push(demoInsp);
              }
            });
            if (merged.length > 0) return merged;
          }
        } catch (e) {}
      }
    }
    return DEMO_SUPPLIER_INSPECTIONS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_supplier_inspections', JSON.stringify(lotInspections));
    }
  }, [lotInspections]);

  // Formulario de Homologación de Proveedor
  const [formData, setFormData] = useState<Partial<Supplier> & { lat: string; lng: string }>({
    name: '', category: 'Semillero_Criadero', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
    whatsapp: '', email: '', website: '', notes: '', isOfficialPartner: true,
    commercialContact: '', logisticsContact: '', humanTeam: [],
    inaseRncyfsNumber: '', senasaRegisterNumber: '', ariccameLicenseNumber: '',
    homologationStatus: 'Homologado_Conforme',
    technicalSpecialty: '', activeIngredientsProvided: [], batchReturnWarrantyDays: 60,
    lat: '', lng: '',
    audit: {
      technicalAgronomistName: 'Ing. Agr. Julian PIZARRO',
      technicalAgronomistMatricula: 'MP-AGRO-1492 CH',
      samplerName: 'Matias QUINTANA',
      samplerMatricula: 'TEC-MUESTREO-ISTA-108',
      lastAuditDate: new Date().toISOString().split('T')[0],
      auditScore: 95,
      bpaCertified: true,
      gacpCertified: true,
      organicCertified: false,
      zeroResidueGuarantee: true,
      labAccreditationStandard: 'ISTA / ISO 17025 & Red ARICCAME'
    }
  });

  // Formulario de Nueva Inspección de Lote
  const [newInspectionData, setNewInspectionData] = useState<Partial<SupplierLotInspection>>({
    supplierId: suppliers[0]?.id || '3bfc9bcd-4ab1-4149-b46a-1a5d1e3392cd',
    supplierName: suppliers[0]?.name || 'HEMPIT France',
    date: new Date().toISOString().split('T')[0],
    inputCategory: 'Semilla C1/C2',
    lotNumber: '',
    guideOrRemitoNumber: '',
    germinationDeclaredPct: 90,
    germinationTestedPct: 93,
    purityPct: 99.7,
    moisturePct: 8.8,
    vigorScore: 9,
    thousandSeedWeightGr: 18.5,
    weedSeedsFound: false,
    pathogenScreeningResult: 'Negativo (Conforme)',
    residueStatus: 'Cero Residuos / Orgánico',
    qualityGrade: 'GRADO_A_SUPERIOR',
    qualityScore: 96,
    verdict: 'APROBADO_CAMPO',
    varietyId: varieties[0]?.id || 'ce04b1d9-bde3-4040-94f3-3b57599ad4e7',
    varietyName: varieties[0]?.name || 'Futura 75',
    seedBatchId: '',
    initialQuantityKg: 1.0,
    storagePointId: storagePoints[0]?.id || '5ceffc58-8219-4774-a340-9e1ac2c8458d',
    samplerUserId: '1766450364369',
    samplerName: 'Matias QUINTANA',
    samplerRole: 'Responsable de Muestreo en Recepción',
    samplerDniOrMatricula: 'TEC-MUESTREO-ISTA-108',
    sampleCode: `MUE-ISTA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    samplingDate: new Date().toISOString().split('T')[0],
    samplingMethod: 'Calador ISTA Compuesto (3 Submuestras Precintadas)',
    agronomistUserId: '1766683825719',
    agronomistName: currentUser?.name || 'Ing. Agr. Julian PIZARRO',
    agronomistMatricula: 'MP-AGRO-1492 CH',
    receptionResponsibleName: 'Gastón BAREA M.',
    observations: ''
  });

  // Cálculo dinámico de calidad del lote a medida que cambian los parámetros de laboratorio
  const liveQualityEvaluation = useMemo(() => {
    return calculateLotQuality(newInspectionData);
  }, [
    newInspectionData.germinationTestedPct,
    newInspectionData.purityPct,
    newInspectionData.moisturePct,
    newInspectionData.vigorScore,
    newInspectionData.pathogenScreeningResult,
    newInspectionData.residueStatus,
    newInspectionData.weedSeedsFound
  ]);

  // Helper para resolver la cadena de trazabilidad completa de una inspección de lote
  const getInspectionTraceabilityChain = (insp: SupplierLotInspection) => {
    const linkedSeedBatches = seedBatches.filter(b =>
      (b.materialType || 'seed') === 'seed' && (
        b.id === insp.seedBatchId ||
        b.originInspectionId === insp.id ||
        b.batchCode.toUpperCase().includes(insp.lotNumber.toUpperCase())
      )
    );
    const seedBatchIds = new Set(linkedSeedBatches.map(b => b.id));
    if (insp.seedBatchId) seedBatchIds.add(insp.seedBatchId);

    const linkedPlots = plots.filter(p =>
      (p.seedBatchId && seedBatchIds.has(p.seedBatchId)) ||
      p.originInspectionId === insp.id
    );
    const plotIds = new Set(linkedPlots.map(p => p.id));

    const obtainedMaterials = seedBatches.filter(b =>
      b.materialType && b.materialType !== 'seed' && (
        b.originInspectionId === insp.id ||
        (b.originPlotId && plotIds.has(b.originPlotId)) ||
        (b.parentSeedBatchId && seedBatchIds.has(b.parentSeedBatchId))
      )
    );

    return { linkedSeedBatches, linkedPlots, obtainedMaterials };
  };

  const buildTraceUrl = (id: string, params: Record<string, string | number | undefined>) => {
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        sp.set(k, String(v));
      }
    });
    return `${baseUrl}#/trace/${encodeURIComponent(id)}?${sp.toString()}`;
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'technician';

  // Insumos y aplicaciones fitosanitarias almacenadas
  const agroAppsCountBySupplier = useMemo(() => {
    let apps: any[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_agrochemical_apps');
      if (stored) {
        try { apps = JSON.parse(stored); } catch (e) {}
      }
    }
    const counts: Record<string, number> = {};
    for (const app of apps) {
      if (app.supplierName) {
        counts[app.supplierName.toLowerCase()] = (counts[app.supplierName.toLowerCase()] || 0) + 1;
      }
    }
    return counts;
  }, []);

  // Métricas agronómicas consolidadas
  const agronomicStats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const compliantSuppliers = suppliers.filter(s => (s.homologationStatus || 'Homologado_Conforme') === 'Homologado_Conforme').length;
    const totalInspections = lotInspections.length;
    const approvedInspections = lotInspections.filter(i => i.verdict === 'APROBADO_CAMPO').length;
    
    const seedInspections = lotInspections.filter(i => typeof i.germinationTestedPct === 'number');
    const avgTestedGermination = seedInspections.length > 0
      ? Math.round(seedInspections.reduce((acc, i) => acc + (i.germinationTestedPct || 0), 0) / seedInspections.length)
      : 92;

    const zeroResidueCount = lotInspections.filter(i => i.residueStatus === 'Cero Residuos / Orgánico').length;
    const zeroResiduePct = totalInspections > 0 ? Math.round((zeroResidueCount / totalInspections) * 100) : 100;

    return {
      totalSuppliers,
      compliantSuppliers,
      totalInspections,
      approvedInspections,
      avgTestedGermination,
      zeroResiduePct
    };
  }, [suppliers, lotInspections]);

  // Proveedores filtrados (respeta aislamiento si el usuario logueado es un Proveedor Homologado)
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (currentUser?.supplierId && !currentUser?.clientId && String(s.id) !== String(currentUser.supplierId)) {
        return false;
      }
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.legalName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.inaseRncyfsNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.senasaRegisterNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.technicalSpecialty || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'all' || s.category === filterCategory;
      const matchHomologation = filterHomologation === 'all' || (s.homologationStatus || 'Homologado_Conforme') === filterHomologation;
      return matchSearch && matchCategory && matchHomologation;
    });
  }, [suppliers, searchTerm, filterCategory, filterHomologation, currentUser]);

  // Inspecciones filtradas
  const filteredInspections = useMemo(() => {
    return lotInspections.filter(i => {
      if (currentUser?.supplierId && !currentUser?.clientId && String(i.supplierId) !== String(currentUser.supplierId)) {
        return false;
      }
      const matchSearch = i.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.guideOrRemitoNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.agronomistName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchVerdict = filterVerdict === 'all' || i.verdict === filterVerdict;
      return matchSearch && matchVerdict;
    });
  }, [lotInspections, searchTerm, filterVerdict, currentUser]);

  // Alta / vinculación de un humano del proveedor como usuario del sistema + envío de credenciales por email
  const provisionOrNotifySupplierActor = async (
    supplier: Supplier,
    actor: SupplierHumanActor,
    sendWelcomeEmail = true
  ): Promise<{ linkedUserId: string; userRecord: User } | null> => {
    if (!actor.email || !actor.email.trim()) {
      alert('El actor humano debe poseer un correo electrónico válido para habilitar su usuario y enviar credenciales.');
      return null;
    }
    const cleanEmail = actor.email.trim().toLowerCase();
    const existingUser = users.find(
      u => (actor.linkedUserId && String(u.id) === String(actor.linkedUserId)) || u.email.toLowerCase() === cleanEmail
    );

    const roleMeta = SUPPLIER_ACTOR_ROLES_INFO[actor.actorRole] || SUPPLIER_ACTOR_ROLES_INFO.director_tecnico_obtentor;
    const tempPassword = existingUser?.password || `HempC-${Math.floor(1000 + Math.random() * 9000)}!`;
    const userId = existingUser?.id || `user-sup-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

    const userPayload: User = {
      id: userId,
      name: actor.name.trim(),
      email: actor.email.trim(),
      role: actor.actorRole === 'director_tecnico_obtentor' ? 'technician' : 'viewer',
      structureRole: actor.actorRole === 'director_tecnico_obtentor' ? 'agronomo' : 'monitoreador',
      supplierId: supplier.id,
      supplierActorRole: actor.actorRole,
      clientId: null,
      isNetworkMember: true,
      memberType: 'Proveedor_Homologado',
      organizationName: `${supplier.name} · Proveedor Homologado`,
      jobTitle: actor.jobTitle?.trim() || roleMeta.label,
      phone: actor.phone?.trim() || supplier.whatsapp || '',
      password: tempPassword,
      avatar: existingUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sawyer&backgroundColor=d1d4f9'
    };

    if (existingUser) {
      await updateUser(userPayload);
    } else {
      await addUser(userPayload);
    }

    if (sendWelcomeEmail) {
      try {
        const dispatch = await sendUserProfileWelcomeEmail({
          toEmail: userPayload.email,
          toName: userPayload.name,
          roleName: `${roleMeta.label} (Acceso Exclusivo a Parcelas con Semilla ${supplier.name})`,
          organizationName: `${supplier.name} · Semillero / Proveedor Homologado`,
          tempPassword,
          actionUrl: window.location.origin
        });
        setEmailToast({
          show: true,
          success: dispatch.success,
          message: dispatch.message,
          sentTo: userPayload.email,
          via: dispatch.deliveredVia
        });
      } catch (e) {
        console.warn('Error al despachar email de bienvenida al proveedor:', e);
      }
    }

    return { linkedUserId: userId, userRecord: userPayload };
  };

  const handleEnableOrNotifyCardActor = async (supplier: Supplier, actor: SupplierHumanActor) => {
    setDispatchingActorId(actor.id);
    try {
      const res = await provisionOrNotifySupplierActor(supplier, actor, true);
      if (res) {
        const updatedTeam = (supplier.humanTeam || []).map(a =>
          a.id === actor.id ? { ...a, linkedUserId: res.linkedUserId, isAccessActive: true } : a
        );
        await updateSupplier({
          ...supplier,
          humanTeam: updatedTeam
        });
      }
    } finally {
      setDispatchingActorId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
      const finalLat = parseFloat((formData.lat || '').replace(',', '.'));
      const finalLng = parseFloat((formData.lng || '').replace(',', '.'));
      const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : undefined;
      const supplierId = editingId || generateId('sup');

      // Procesar equipo humano y dar de alta / actualizar usuarios con notificación por email
      const rawTeam: SupplierHumanActor[] = Array.isArray(formData.humanTeam) ? [...formData.humanTeam] : [];
      const syncedTeam: SupplierHumanActor[] = [];

      const baseSupplierForProvision: Supplier = {
        id: supplierId,
        name: formData.name!.trim(),
        category: formData.category as SupplierCategory,
        whatsapp: formData.whatsapp
      };

      for (const actor of rawTeam) {
        if (actor.isAccessActive && actor.email && actor.email.trim()) {
          const alreadyLinked = actor.linkedUserId && users.some(u => String(u.id) === String(actor.linkedUserId));
          const provisioned = await provisionOrNotifySupplierActor(
            baseSupplierForProvision,
            actor,
            !alreadyLinked // envía email de alta automáticamente cuando es nuevo acceso
          );
          if (provisioned) {
            syncedTeam.push({
              ...actor,
              linkedUserId: provisioned.linkedUserId,
              isAccessActive: true
            });
            continue;
          }
        }
        syncedTeam.push(actor);
      }

      const directorOrCommercial = syncedTeam.find(a => a.actorRole === 'responsable_comercial' || a.actorRole === 'director_tecnico_obtentor');
      const logisticsActor = syncedTeam.find(a => a.actorRole === 'responsable_logistica');

      const payload: Supplier = {
        id: supplierId,
        name: formData.name!.trim(),
        category: formData.category as SupplierCategory,
        legalName: formData.legalName,
        cuit: formData.cuit,
        country: formData.country,
        province: formData.province,
        city: formData.city,
        address: formData.address,
        whatsapp: formData.whatsapp,
        email: formData.email,
        website: formData.website,
        commercialContact: formData.commercialContact || (directorOrCommercial ? `${directorOrCommercial.name} (${directorOrCommercial.jobTitle || 'Responsable'})` : undefined),
        logisticsContact: formData.logisticsContact || (logisticsActor ? `${logisticsActor.name} (${logisticsActor.jobTitle || 'Logística'})` : undefined),
        humanTeam: syncedTeam,
        notes: formData.notes,
        isOfficialPartner: formData.isOfficialPartner,
        inaseRncyfsNumber: formData.inaseRncyfsNumber,
        senasaRegisterNumber: formData.senasaRegisterNumber,
        ariccameLicenseNumber: formData.ariccameLicenseNumber,
        homologationStatus: formData.homologationStatus as TechnicalHomologationStatus,
        technicalSpecialty: formData.technicalSpecialty,
        activeIngredientsProvided: formData.activeIngredientsProvided,
        batchReturnWarrantyDays: Number(formData.batchReturnWarrantyDays) || undefined,
        audit: formData.audit,
        coordinates
      };

      let success = false;
      if (editingId) {
        success = await updateSupplier(payload);
      } else {
        const res = await addSupplier(payload);
        success = !!res;
      }

      if (success) {
        setIsModalOpen(false);
        resetForm();
      } else {
        alert("Error al grabar el proveedor en la base de datos.");
      }
    } catch (err: any) { 
      alert("ERROR OPERATIVO: " + err.message);
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspectionData.lotNumber || !newInspectionData.supplierId) {
      alert("Por favor indique el N° de Lote y seleccione un proveedor homologado.");
      return;
    }

    const matchedSup = suppliers.find(s => s.id === newInspectionData.supplierId);
    const matchedVar = varieties.find(v => v.id === newInspectionData.varietyId);
    const evalResult = calculateLotQuality(newInspectionData);
    const inspectionId = editingInspectionId || generateId('insp');
    const cleanLotNumber = newInspectionData.lotNumber!.trim().toUpperCase();

    const finalVerdict = newInspectionData.verdict || evalResult.recommendedVerdict;
    const isQualityApprovedActive = finalVerdict === 'APROBADO_CAMPO' && evalResult.grade !== 'NO_CONFORME';
    let linkedBatchId = newInspectionData.seedBatchId || undefined;

    // Al emitir el dictamen de Semilla Fiscalizada, se da de alta o actualiza automáticamente en el Stock como ACTIVO (si aprobó Calidad)
    if (newInspectionData.inputCategory === 'Semilla C1/C2') {
      const existingBatch = seedBatches.find(b =>
        (linkedBatchId && b.id === linkedBatchId) ||
        b.originInspectionId === inspectionId ||
        b.batchCode.toUpperCase() === cleanLotNumber
      );

      if (existingBatch) {
        linkedBatchId = existingBatch.id;
        const canUpdateQty = Math.abs((existingBatch.initialQuantity || 0) - (existingBatch.remainingQuantity || 0)) < 0.0001;
        const nextInitialQty = Number(newInspectionData.initialQuantityKg) || existingBatch.initialQuantity || 1;
        await updateSeedBatch({
          ...existingBatch,
          supplierId: matchedSup?.id || existingBatch.supplierId,
          varietyId: matchedVar?.id || existingBatch.varietyId,
          germination: Number(newInspectionData.germinationTestedPct) || existingBatch.germination,
          purity: Number(newInspectionData.purityPct) || existingBatch.purity,
          moisturePct: Number(newInspectionData.moisturePct) || existingBatch.moisturePct,
          analysisDate: newInspectionData.date || existingBatch.analysisDate,
          originInspectionId: inspectionId,
          qualityGrade: evalResult.grade,
          qualityScore: evalResult.score,
          initialQuantity: canUpdateQty ? nextInitialQty : existingBatch.initialQuantity,
          remainingQuantity: canUpdateQty ? nextInitialQty : existingBatch.remainingQuantity,
          storagePointId: newInspectionData.storagePointId || existingBatch.storagePointId,
          samplerName: newInspectionData.samplerName?.trim() || existingBatch.samplerName,
          samplerMatricula: newInspectionData.samplerDniOrMatricula?.trim() || existingBatch.samplerMatricula,
          sampleCode: newInspectionData.sampleCode?.trim() || existingBatch.sampleCode,
          inspectorName: newInspectionData.agronomistName?.trim() || existingBatch.inspectorName,
          inspectorMatricula: newInspectionData.agronomistMatricula?.trim() || existingBatch.inspectorMatricula,
          logisticsResponsible: newInspectionData.receptionResponsibleName?.trim() || existingBatch.logisticsResponsible,
          isActive: isQualityApprovedActive
        });
      } else {
        const newBatchId = generateId('batch');
        linkedBatchId = newBatchId;
        const createdBatch: SeedBatch = {
          id: newBatchId,
          varietyId: matchedVar?.id || varieties[0]?.id || 'ce04b1d9-bde3-4040-94f3-3b57599ad4e7',
          supplierId: matchedSup?.id,
          batchCode: cleanLotNumber,
          labelSerialNumber: `INASE-${Math.floor(100000 + Math.random() * 900000)}`,
          category: 'C1_CERTIFICADA_1',
          materialType: 'seed',
          analysisDate: newInspectionData.date || new Date().toISOString().split('T')[0],
          purity: Number(newInspectionData.purityPct) || 99.5,
          germination: Number(newInspectionData.germinationTestedPct) || 92,
          moisturePct: Number(newInspectionData.moisturePct) || 8.8,
          certificationNumber: newInspectionData.guideOrRemitoNumber || `CERT-${cleanLotNumber}`,
          purchaseDate: newInspectionData.date || new Date().toISOString().split('T')[0],
          pricePerKg: 0,
          initialQuantity: Number(newInspectionData.initialQuantityKg) || 1,
          remainingQuantity: Number(newInspectionData.initialQuantityKg) || 1,
          storagePointId: newInspectionData.storagePointId || storagePoints[0]?.id,
          logisticsResponsible: newInspectionData.receptionResponsibleName?.trim() || 'Gastón BAREA M.',
          originInspectionId: inspectionId,
          qualityGrade: evalResult.grade,
          qualityScore: evalResult.score,
          samplerName: newInspectionData.samplerName?.trim() || 'Matias QUINTANA',
          samplerMatricula: newInspectionData.samplerDniOrMatricula?.trim() || 'TEC-MUESTREO-ISTA-108',
          sampleCode: newInspectionData.sampleCode?.trim() || `MUE-${cleanLotNumber}`,
          inspectorName: newInspectionData.agronomistName?.trim() || 'Ing. Agr. Julian PIZARRO',
          inspectorMatricula: newInspectionData.agronomistMatricula?.trim() || 'MP-AGRO-1492 CH',
          notes: `Lote de siembra dado de alta en Stock como ${isQualityApprovedActive ? 'ACTIVO (Aprobado por Calidad)' : 'OBSERVADO / CUARENTENA'} desde Inspección Técnica #${inspectionId} (${QUALITY_GRADE_CONFIG[evalResult.grade].shortLabel}).`,
          isActive: isQualityApprovedActive,
          createdAt: new Date().toISOString()
        };
        await addSeedBatch(createdBatch);
      }
    } else if (
      syncWithSeedBatch &&
      (newInspectionData.inputCategory === 'Bioinsumo / Enmienda' ||
        newInspectionData.inputCategory === 'Fitosanitario / Biológico') &&
      evalResult.grade !== 'NO_CONFORME'
    ) {
      const isBio = newInspectionData.inputCategory === 'Bioinsumo / Enmienda';
      const existingRes = resources.find(
        r =>
          (r.batchNumber && r.batchNumber.toLowerCase() === cleanLotNumber.toLowerCase()) ||
          r.name.toLowerCase() === (newInspectionData.varietyName || cleanLotNumber).toLowerCase()
      );
      if (existingRes) {
        await updateResource({
          ...existingRes,
          batchNumber: cleanLotNumber,
          supplierId: matchedSup?.id || existingRes.supplierId,
          supplierName: matchedSup?.name || existingRes.supplierName,
          stock: (existingRes.stock || 0) + (Number(newInspectionData.initialQuantityKg) || 20)
        });
      } else {
        await addResource({
          id: `senasa-insp-${Date.now()}`,
          name: newInspectionData.varietyName?.trim() || `${newInspectionData.inputCategory} (${cleanLotNumber})`,
          type: isBio ? 'Fertilizante' : 'Fitosanitario',
          agroCategory: isBio ? 'Mejorador de Suelo' : 'Insecticida',
          activeIngredient: matchedSup?.technicalSpecialty || 'Insumo Biológico Homologado GACP',
          senasaRegisterNumber: matchedSup?.senasaRegisterNumber || `SENASA-LOTE-${cleanLotNumber}`,
          toxicologicalClass: 'Biológico / Orgánico Certificado',
          recommendedDosagePerHa: 2,
          dosageUnit: 'L/ha',
          safetyPeriodDays: 0,
          applicationMethod: isBio ? 'Fertirriego' : 'Pulverización Terrestre',
          supplierId: matchedSup?.id,
          supplierName: matchedSup?.name || 'Proveedor Homologado',
          manufacturer: matchedSup?.legalName || matchedSup?.name || 'Laboratorio Homologado',
          batchNumber: cleanLotNumber,
          unit: 'lts',
          costPerUnit: 18,
          stock: Number(newInspectionData.initialQuantityKg) || 50
        });
      }
    }

    const inspection: SupplierLotInspection = {
      id: inspectionId,
      supplierId: newInspectionData.supplierId!,
      supplierName: matchedSup?.name || newInspectionData.supplierName || 'Proveedor Homologado',
      date: newInspectionData.date || new Date().toISOString().split('T')[0],
      inputCategory: newInspectionData.inputCategory || 'Semilla C1/C2',
      lotNumber: cleanLotNumber,
      guideOrRemitoNumber: newInspectionData.guideOrRemitoNumber?.trim() || undefined,
      germinationDeclaredPct: Number(newInspectionData.germinationDeclaredPct) || undefined,
      germinationTestedPct: Number(newInspectionData.germinationTestedPct) || undefined,
      purityPct: Number(newInspectionData.purityPct) || undefined,
      moisturePct: Number(newInspectionData.moisturePct) || undefined,
      vigorScore: Number(newInspectionData.vigorScore) || 8,
      thousandSeedWeightGr: Number(newInspectionData.thousandSeedWeightGr) || undefined,
      weedSeedsFound: Boolean(newInspectionData.weedSeedsFound),
      pathogenScreeningResult: newInspectionData.pathogenScreeningResult || 'Negativo (Conforme)',
      residueStatus: newInspectionData.residueStatus || 'Cero Residuos / Orgánico',
      qualityGrade: evalResult.grade,
      qualityScore: evalResult.score,
      verdict: newInspectionData.verdict || evalResult.recommendedVerdict,
      varietyId: matchedVar?.id || newInspectionData.varietyId,
      varietyName: matchedVar?.name || newInspectionData.varietyName,
      seedBatchId: linkedBatchId,
      initialQuantityKg: Number(newInspectionData.initialQuantityKg) || undefined,
      storagePointId: newInspectionData.storagePointId || undefined,
      samplerUserId: newInspectionData.samplerUserId,
      samplerName: newInspectionData.samplerName?.trim() || 'Matias QUINTANA',
      samplerRole: newInspectionData.samplerRole?.trim() || 'Responsable de Muestreo en Recepción',
      samplerDniOrMatricula: newInspectionData.samplerDniOrMatricula?.trim() || 'TEC-MUESTREO-ISTA-108',
      sampleCode: newInspectionData.sampleCode?.trim() || `MUE-${cleanLotNumber}`,
      samplingDate: newInspectionData.samplingDate || newInspectionData.date,
      samplingMethod: newInspectionData.samplingMethod || 'Calador ISTA Compuesto (3 Submuestras Precintadas)',
      agronomistUserId: newInspectionData.agronomistUserId,
      agronomistName: newInspectionData.agronomistName?.trim() || 'Ing. Agr. Julian PIZARRO',
      agronomistMatricula: newInspectionData.agronomistMatricula?.trim() || 'MP-AGRO-1492 CH',
      receptionResponsibleName: newInspectionData.receptionResponsibleName?.trim() || 'Gastón BAREA M.',
      observations: newInspectionData.observations?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    if (editingInspectionId) {
      setLotInspections(prev => prev.map(i => i.id === editingInspectionId ? inspection : i));
    } else {
      setLotInspections(prev => [inspection, ...prev]);
    }

    setIsNewInspectionModalOpen(false);
    setEditingInspectionId(null);
  };

  const openNewInspectionModal = (inspToEdit?: SupplierLotInspection) => {
    if (inspToEdit) {
      setEditingInspectionId(inspToEdit.id);
      setNewInspectionData({ ...inspToEdit });
      setSyncWithSeedBatch(Boolean(inspToEdit.seedBatchId || inspToEdit.inputCategory === 'Semilla C1/C2'));
    } else {
      setEditingInspectionId(null);
      setNewInspectionData({
        supplierId: suppliers[0]?.id || '3bfc9bcd-4ab1-4149-b46a-1a5d1e3392cd',
        supplierName: suppliers[0]?.name || 'HEMPIT France',
        date: new Date().toISOString().split('T')[0],
        inputCategory: 'Semilla C1/C2',
        lotNumber: '',
        guideOrRemitoNumber: '',
        germinationDeclaredPct: 90,
        germinationTestedPct: 93,
        purityPct: 99.7,
        moisturePct: 8.8,
        vigorScore: 9,
        thousandSeedWeightGr: 18.5,
        weedSeedsFound: false,
        pathogenScreeningResult: 'Negativo (Conforme)',
        residueStatus: 'Cero Residuos / Orgánico',
        qualityGrade: 'GRADO_A_SUPERIOR',
        qualityScore: 96,
        verdict: 'APROBADO_CAMPO',
        varietyId: varieties[0]?.id || 'ce04b1d9-bde3-4040-94f3-3b57599ad4e7',
        varietyName: varieties[0]?.name || 'Futura 75',
        seedBatchId: '',
        initialQuantityKg: 1.0,
        storagePointId: storagePoints[0]?.id || '5ceffc58-8219-4774-a340-9e1ac2c8458d',
        samplerUserId: '1766450364369',
        samplerName: 'Matias QUINTANA',
        samplerRole: 'Responsable de Muestreo en Recepción',
        samplerDniOrMatricula: 'TEC-MUESTREO-ISTA-108',
        sampleCode: `MUE-ISTA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        samplingDate: new Date().toISOString().split('T')[0],
        samplingMethod: 'Calador ISTA Compuesto (3 Submuestras Precintadas)',
        agronomistUserId: '1766683825719',
        agronomistName: currentUser?.name || 'Ing. Agr. Julian PIZARRO',
        agronomistMatricula: 'MP-AGRO-1492 CH',
        receptionResponsibleName: 'Gastón BAREA M.',
        observations: ''
      });
      setSyncWithSeedBatch(true);
    }
    setIsNewInspectionModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', category: 'Semillero_Criadero', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
      whatsapp: '', email: '', website: '', notes: '', isOfficialPartner: true,
      commercialContact: '', logisticsContact: '', humanTeam: [],
      inaseRncyfsNumber: '', senasaRegisterNumber: '', ariccameLicenseNumber: '',
      homologationStatus: 'Homologado_Conforme',
      technicalSpecialty: '', activeIngredientsProvided: [], batchReturnWarrantyDays: 60,
      lat: '', lng: '',
      audit: {
        technicalAgronomistName: 'Ing. Agr. Julian PIZARRO',
        technicalAgronomistMatricula: 'MP-AGRO-1492 CH',
        samplerName: 'Matias QUINTANA',
        samplerMatricula: 'TEC-MUESTREO-ISTA-108',
        lastAuditDate: new Date().toISOString().split('T')[0],
        auditScore: 95,
        bpaCertified: true,
        gacpCertified: true,
        organicCertified: false,
        zeroResidueGuarantee: true,
        labAccreditationStandard: 'ISTA / ISO 17025 & Red ARICCAME'
      }
    });
    setNewActorDraft({
      name: '',
      actorRole: 'director_tecnico_obtentor',
      jobTitle: '',
      email: '',
      phone: '',
      dniOrMatricula: '',
      isAccessActive: true
    });
    setEditingId(null);
    setModalTab('technical');
  };

  const handleEdit = (s: Supplier) => {
    setFormData({
      ...s,
      commercialContact: s.commercialContact || '',
      logisticsContact: s.logisticsContact || '',
      humanTeam: Array.isArray(s.humanTeam) ? s.humanTeam : [],
      lat: s.coordinates?.lat?.toString() || '',
      lng: s.coordinates?.lng?.toString() || '',
      audit: s.audit || {
        technicalAgronomistName: 'Ing. Agr. Lucas Berardi',
        technicalAgronomistMatricula: 'MP-AGRO-3321 MZA',
        lastAuditDate: new Date().toISOString().split('T')[0],
        auditScore: 95,
        bpaCertified: true,
        gacpCertified: true,
        organicCertified: false,
        zeroResidueGuarantee: true
      }
    });
    setEditingId(s.id);
    setModalTab('technical');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este proveedor de la cadena agronómica?")) {
      deleteSupplier(id);
    }
  };

  const handleDeleteInspection = (id: string) => {
    if (window.confirm("¿Desea eliminar esta acta de inspección de lote?")) {
      setLotInspections(prev => prev.filter(i => i.id !== id));
    }
  };

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 disabled:opacity-50";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-mono">
      
      {/* ENCABEZADO AGRONÓMICO PRINCIPAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <Microscope size={12} className="text-emerald-500" />
              <span>Gestión Fitotécnica & Sanitaria de Insumos</span>
            </span>
            <span className="text-xs text-slate-400">· INASE / SENASA / GACP</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 flex items-center gap-2.5">
            <Briefcase className="text-emerald-500" size={26}/> 
            <span>Red de Proveedores & Semilleros Homologados</span>
          </h1>

          {/* RECORDATORIO ESTRICTO DE ALCANCE (NO CRM / ODOO 20) */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span>Homologación agronómica, calidad fisiológica de semillas y control de residuos.</span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              Gestión comercial, compras y ERP en Odoo 20
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openNewInspectionModal()}
            className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-purple-500 transition shadow font-bold text-xs uppercase tracking-wider gap-2"
          >
            <ClipboardCheck size={16} />
            <span>Nueva Inspección de Lote</span>
          </button>

          {isAdmin && (
            <button 
              type="button"
              onClick={() => { resetForm(); setIsModalOpen(true); }} 
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition shadow font-bold text-xs uppercase tracking-wider gap-2"
            >
              <Plus size={16} /> 
              <span>Homologar Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* TOAST DE NOTIFICACIÓN DE CREDENCIALES POR EMAIL AL PROVEEDOR */}
      {emailToast && emailToast.show && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">
                Usuario de Proveedor Habilitado & Credenciales Despachadas por Email
              </p>
              <p className="text-xs opacity-90">{emailToast.message}</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Destino: <strong>{emailToast.sentTo}</strong> · Vía: {emailToast.via} · Aislamiento Estricto por Semilla Activo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEmailToast(null)}
            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* BANNER DE KPIS AGRONÓMICOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Sprout size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Proveedores Aptos</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {agronomicStats.compliantSuppliers} <span className="text-xs text-slate-400 font-normal">/ {agronomicStats.totalSuppliers}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Ensayos de Recepción</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {agronomicStats.totalInspections} <span className="text-xs text-emerald-500 font-bold">({agronomicStats.approvedInspections} OK)</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">P. Germinativo Real</span>
            <span className="text-xl font-black text-emerald-600">
              {agronomicStats.avgTestedGermination}% <span className="text-xs text-slate-400 font-normal">ISTA</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Inocuidad & Cero Residuo</span>
            <span className="text-xl font-black text-purple-600">
              {agronomicStats.zeroResiduePct}% <span className="text-xs text-slate-400 font-normal">GACP</span>
            </span>
          </div>
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES DE LA SECCIÓN */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveMainTab('suppliers')}
          className={`px-4 py-2 rounded-xl font-bold uppercase transition flex items-center gap-2 ${
            activeMainTab === 'suppliers'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sprout size={15} />
          <span>Fichas de Proveedores ({suppliers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('inspections')}
          className={`px-4 py-2 rounded-xl font-bold uppercase transition flex items-center gap-2 ${
            activeMainTab === 'inspections'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-400'
          }`}
        >
          <ClipboardCheck size={15} />
          <span>Control de Lotes & Ensayos ({lotInspections.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('vademecum')}
          className={`px-4 py-2 rounded-xl font-bold uppercase transition flex items-center gap-2 ${
            activeMainTab === 'vademecum'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Vademécum & Carencias SENASA</span>
        </button>
      </div>

      {/* VISTA 1: CATÁLOGO DE PROVEEDORES HOMOLOGADOS */}
      {activeMainTab === 'suppliers' && (
        <div className="space-y-6">
          {/* FILTROS Y BÚSQUEDA */}
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input 
                type="text" 
                placeholder="Buscar por semillero, registro INASE, N° SENASA o especialidad técnica..." 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select 
                className="px-3.5 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none" 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="all">Todas las Categorías ({suppliers.length})</option>
                <option value="Semillero_Criadero">Semilleros & Criaderos INASE</option>
                <option value="Bioinsumos_Fertilizantes">Bioinsumos & Fertilizantes SENASA</option>
                <option value="Fitosanitarios_Control">Fitosanitarios & Biológicos</option>
                <option value="Mecanizacion_Servicios">Mecanización & Cosecha</option>
                <option value="Laboratorio_Analitica">Laboratorios HPLC & Analítica</option>
                <option value="Sustratos_Vivero">Sustratos & Viveros</option>
              </select>

              <select 
                className="px-3.5 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none" 
                value={filterHomologation} 
                onChange={e => setFilterHomologation(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="Homologado_Conforme">Homologado Conforme</option>
                <option value="En_Auditoria_Tecnica">En Auditoría Técnica</option>
                <option value="Cuarentena_Tecnica">Cuarentena Técnica</option>
                <option value="No_Apto_Restringido">No Apto / Restringido</option>
              </select>
            </div>
          </div>

          {/* GRILLA DE TARJETAS DE PROVEEDORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map(s => {
              const catConfig = CATEGORY_LABELS[s.category] || CATEGORY_LABELS['Insumos'];
              const CatIcon = catConfig.icon;
              const homologation = HOMOLOGATION_BADGES[s.homologationStatus || 'Homologado_Conforme'] || HOMOLOGATION_BADGES['Homologado_Conforme'];

              // Trazabilidad cruzada con el sistema
              const linkedVarieties = varieties.filter(v => v.supplierId === s.id);
              const linkedSeedBatches = seedBatches.filter(b => b.supplierId === s.id);
              const totalKgSupplied = linkedSeedBatches.reduce((acc, b) => acc + (b.remainingQuantity || 0), 0);
              const avgGermination = linkedSeedBatches.length > 0
                ? Math.round(linkedSeedBatches.reduce((acc, b) => acc + (b.germination || 90), 0) / linkedSeedBatches.length)
                : undefined;

              const linkedAgroApps = agroAppsCountBySupplier[s.name.toLowerCase()] || 0;
              const supplierInspectionsCount = lotInspections.filter(i => i.supplierId === s.id).length;
              const globalPlotPool = allPlots && allPlots.length > 0 ? allPlots : plots;
              const plotsWithSupplierSeed = globalPlotPool.filter(p =>
                doesPlotBelongToSupplier(s.id, p, varieties, seedBatches)
              );
              const directSupplierUsers = users.filter(u => String(u.supplierId) === String(s.id));

              return (
                <div 
                  key={s.id} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 hover:shadow-lg transition-all relative group flex flex-col justify-between"
                >
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button 
                        type="button"
                        onClick={() => handleEdit(s)} 
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition"
                        title="Editar Ficha Técnica & Equipo Humano"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(s.id)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <div>
                    {/* BADGES SUPERIORES: CATEGORÍA & HOMOLOGACIÓN */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 pr-10 text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1">
                        <CatIcon size={12} />
                        <span>{catConfig.label}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-lg font-bold border ${homologation.bg} ${homologation.text} ${homologation.border}`}>
                        {homologation.label}
                      </span>
                    </div>

                    {/* NOMBRE COMERCIAL Y RAZÓN SOCIAL */}
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight" title={s.name}>
                      {s.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      {s.legalName ? `${s.legalName} · CUIT: ${s.cuit || 'S/D'}` : s.city || 'Operador Registrado'}
                    </p>

                    {/* MATRIZ DE REGISTROS SANITARIOS (INASE / SENASA / ARICCAME) */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-[10px]">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] text-slate-400 uppercase block font-bold">Registro INASE / RNCyFS</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-mono block truncate">
                          {s.inaseRncyfsNumber || 'No aplica'}
                        </strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] text-slate-400 uppercase block font-bold">Registro SENASA Insumo</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-mono block truncate">
                          {s.senasaRegisterNumber || (s.ariccameLicenseNumber ? 'ARICCAME OK' : 'En trámite')}
                        </strong>
                      </div>
                    </div>

                    {/* ESPECIALIDAD TÉCNICA AGRONÓMICA */}
                    {s.technicalSpecialty && (
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] mb-3">
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase block tracking-wider mb-0.5">
                          Especialidad Homologada:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                          {s.technicalSpecialty}
                        </p>
                      </div>
                    )}

                    {/* PROTOCOLOS & CALIFICACIÓN */}
                    <div className="flex flex-wrap gap-1 mb-3 text-[9px] font-bold uppercase">
                      {s.audit?.gacpCertified && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ GACP
                        </span>
                      )}
                      {s.audit?.bpaCertified && (
                        <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          ✓ BPA
                        </span>
                      )}
                      {s.audit?.zeroResidueGuarantee && (
                        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          ✓ Cero Residuos
                        </span>
                      )}
                      {s.audit?.organicCertified && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          ✓ Orgánico SENASA
                        </span>
                      )}
                      {s.audit?.auditScore && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono ml-auto">
                          Score: {s.audit.auditScore}/100
                        </span>
                      )}
                    </div>

                    {/* EQUIPO HUMANO DEL PROVEEDOR & ACCESO AISLADO POR SEMILLA */}
                    <div className="mb-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/70 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Users size={12} className="text-emerald-600" />
                          <span>Equipo Humano & Usuarios ({(s.humanTeam || []).length || directSupplierUsers.length})</span>
                        </span>
                        {plotsWithSupplierSeed.length > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase">
                            {plotsWithSupplierSeed.length} Parcelas con su Semilla
                          </span>
                        )}
                      </div>

                      {(s.humanTeam && s.humanTeam.length > 0) ? (
                        <div className="space-y-1.5">
                          {s.humanTeam.map(actor => {
                            const roleMeta = SUPPLIER_ACTOR_ROLES_INFO[actor.actorRole] || SUPPLIER_ACTOR_ROLES_INFO.director_tecnico_obtentor;
                            const linkedUser = users.find(
                              u => (actor.linkedUserId && String(u.id) === String(actor.linkedUserId)) ||
                                   (actor.email && u.email.toLowerCase() === actor.email.toLowerCase())
                            );
                            const isBusy = dispatchingActorId === actor.id;

                            return (
                              <div
                                key={actor.id}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-slate-800 flex flex-col gap-1.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <strong className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                                        {actor.name}
                                      </strong>
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {roleMeta.shortLabel}
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate">
                                      {actor.jobTitle || roleMeta.label} {actor.email ? `· ${actor.email}` : ''}
                                    </span>
                                  </div>

                                  {linkedUser ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[8px] font-black uppercase flex items-center gap-1 shrink-0 border border-emerald-300 dark:border-emerald-800">
                                      <Lock size={9} /> Usuario Activo
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[8px] font-bold uppercase shrink-0">
                                      Contacto Registrado
                                    </span>
                                  )}
                                </div>

                                {isAdmin && (
                                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                    {linkedUser && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          startImpersonation(linkedUser.id);
                                          navigate('/plots');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase flex items-center gap-1 transition cursor-pointer"
                                        title={`Simular vista aislada de ${actor.name} (${plotsWithSupplierSeed.length} parcelas con genética ${s.name})`}
                                      >
                                        <Eye size={10} />
                                        <span>Simular Vista ({plotsWithSupplierSeed.length})</span>
                                      </button>
                                    )}
                                    {actor.email && (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleEnableOrNotifyCardActor(s, actor)}
                                        className="px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-purple-600 text-white text-[9px] font-bold uppercase flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                                        title={linkedUser ? 'Reenviar credenciales de acceso por correo electrónico' : 'Dar de alta como usuario aislado y notificar acceso por email'}
                                      >
                                        {isBusy ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                        <span>{linkedUser ? 'Notificar Email' : 'Dar Alta & Email'}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 space-y-1">
                          {s.commercialContact && (
                            <p className="truncate"><strong>Resp. Comercial:</strong> {s.commercialContact}</p>
                          )}
                          {s.logisticsContact && (
                            <p className="truncate"><strong>Logística:</strong> {s.logisticsContact}</p>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                handleEdit(s);
                                setModalTab('humanTeam');
                              }}
                              className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 pt-0.5"
                            >
                              <Plus size={11} />
                              <span>Cargar humanos responsables y habilitar usuario</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* TRAZABILIDAD CRUZADA CON EL SISTEMA */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {linkedVarieties.length > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Sprout size={12} className="text-emerald-500" />
                            <span>Cultivares Provistos:</span>
                          </span>
                          <button 
                            type="button" 
                            onClick={() => navigate(`/varieties`)}
                            className="font-bold text-emerald-600 hover:underline"
                          >
                            {linkedVarieties.map(v => v.name).join(', ')} ({linkedVarieties.length})
                          </button>
                        </div>
                      )}

                      {plotsWithSupplierSeed.length > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Layers size={12} className="text-emerald-600" />
                            <span>Parcelas con su Semilla:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/plots`)}
                            className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            {plotsWithSupplierSeed.length} Parcelas Activas
                          </button>
                        </div>
                      )}

                      {linkedSeedBatches.length > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Briefcase size={12} className="text-sky-500" />
                            <span>Stock Activo en Nodos:</span>
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {totalKgSupplied.toLocaleString()} kg ({avgGermination ? `${avgGermination}% PG` : 'Lotes'})
                          </span>
                        </div>
                      )}

                      {supplierInspectionsCount > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400">
                            <ClipboardCheck size={12} className="text-purple-500" />
                            <span>Ensayos de Recepción:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm(s.name);
                              setActiveMainTab('inspections');
                            }}
                            className="font-bold text-purple-600 hover:underline"
                          >
                            {supplierInspectionsCount} Lotes Auditados
                          </button>
                        </div>
                      )}

                      {linkedAgroApps > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400">
                            <ShieldCheck size={12} className="text-amber-500" />
                            <span>Tratamientos en Cuaderno SENASA:</span>
                          </span>
                          <span className="font-bold text-amber-600">
                            {linkedAgroApps} Aplicaciones
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.city ? `${s.city}, ${s.province || s.country}` : 'Argentina'}</span>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER ACCIONES: DICTAMEN TÉCNICO + QR ACTIVO */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block truncate" title={s.audit?.technicalAgronomistName || 'Ing. Agr. Julian PIZARRO'}>
                        Auditor: {s.audit?.technicalAgronomistName || 'Ing. Agr. Julian PIZARRO'}
                      </span>
                      <span className="text-[8px] text-emerald-600 font-bold block truncate">
                        Muestreo: {s.audit?.samplerName || 'Matias QUINTANA'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/trace/${s.id}?type=supplier&name=${encodeURIComponent(s.name)}&cuit=${encodeURIComponent(s.cuit || '')}&inase=${encodeURIComponent(s.inaseRncyfsNumber || '')}`)}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                        title="Abrir Trazabilidad Pública QR de Homologación"
                      >
                        <QrCode size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedSupplierForAudit(s);
                          setIsAuditModalOpen(true);
                        }}
                        className="bg-slate-900 dark:bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center hover:scale-105 transition shadow gap-1"
                      >
                        <FileText size={12} />
                        <span>Dictamen & QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: CONTROL DE CALIDAD & RECEPCIÓN DE LOTES */}
      {activeMainTab === 'inspections' && (
        <div className="space-y-6">
          {/* BARRA DE FILTRO Y ACCIÓN */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input 
                type="text" 
                placeholder="Buscar por lote, proveedor, muestra, tomador de muestra o agrónomo..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none"
                value={filterVerdict}
                onChange={e => setFilterVerdict(e.target.value)}
              >
                <option value="all">Todos los Veredictos ({lotInspections.length})</option>
                <option value="APROBADO_CAMPO">Aprobado para Campo</option>
                <option value="EN_CUARENTENA_OBSERVADO">En Cuarentena Técnica</option>
                <option value="RECHAZADO_DEVOLUCION">Rechazado Fitosanitario</option>
              </select>

              <button
                type="button"
                onClick={() => openNewInspectionModal()}
                className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-purple-500 transition shadow font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <Plus size={15} />
                <span>Nueva Inspección Técnica de Lote</span>
              </button>
            </div>
          </div>

          {/* TABLA AGRONÓMICA DE INSPECCIONES Y TRAZABILIDAD ACTIVA */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Microscope size={18} className="text-purple-600" />
                  <span>Determinación de Calidad de Lotes, Muestreo & Circuito de Trazabilidad QR</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calificación ISTA/INASE (Grado A/B/C), personal interviniente en toma de muestras y vinculación con lotes de siembra, parcelas y material obtenido.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                {filteredInspections.length} lotes inspeccionados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Lote / Calidad Determinada</th>
                    <th className="py-3 px-4">Proveedor & Genética</th>
                    <th className="py-3 px-4 text-center">Parámetros ISTA (PG / Pureza / H°)</th>
                    <th className="py-3 px-4">Personal Interviniente (Muestreo & Auditoría)</th>
                    <th className="py-3 px-4">Circuito de Trazabilidad Activo</th>
                    <th className="py-3 px-4 text-center">Veredicto</th>
                    <th className="py-3 px-4 text-right">Acciones & QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInspections.map(insp => {
                    const verdictCfg = VERDICT_CONFIG[insp.verdict] || VERDICT_CONFIG['APROBADO_CAMPO'];
                    const VIcon = verdictCfg.icon;
                    const calcQ = calculateLotQuality(insp);
                    const qGrade = insp.qualityGrade || calcQ.grade;
                    const qScore = insp.qualityScore || calcQ.score;
                    const gradeCfg = QUALITY_GRADE_CONFIG[qGrade] || QUALITY_GRADE_CONFIG['GRADO_A_SUPERIOR'];

                    const pgDiff = (insp.germinationTestedPct && insp.germinationDeclaredPct)
                      ? insp.germinationTestedPct - insp.germinationDeclaredPct
                      : null;

                    const chain = getInspectionTraceabilityChain(insp);

                    return (
                      <tr key={insp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <strong className="font-mono text-slate-900 dark:text-white font-black text-xs">
                              {insp.lotNumber}
                            </strong>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${gradeCfg.bg} ${gradeCfg.text} ${gradeCfg.border}`}>
                              {gradeCfg.shortLabel} ({qScore} pts)
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {insp.inputCategory} · {insp.date}
                          </span>
                          {insp.guideOrRemitoNumber && (
                            <span className="text-[9px] text-purple-600 font-mono block">
                              Guía/Remito: {insp.guideOrRemitoNumber}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <strong className="text-slate-800 dark:text-slate-200 block text-xs">
                            {insp.supplierName}
                          </strong>
                          {insp.varietyName && (
                            <span className="text-[10px] text-emerald-600 font-bold block flex items-center gap-1 mt-0.5">
                              <Sprout size={11} />
                              <span>Cultivar: {insp.varietyName}</span>
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 block">
                            {insp.residueStatus || 'Cero Residuos GACP'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {insp.germinationTestedPct ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-center gap-1 font-bold">
                                <span className="text-sm font-black text-emerald-600 font-mono">
                                  {insp.germinationTestedPct}% PG
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  (Marbete {insp.germinationDeclaredPct || 90}%)
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                {insp.purityPct || 99.5}% Pur. · {insp.moisturePct || 8.8}% H° · Vigor {insp.vigorScore || 8}/9
                              </div>
                              {pgDiff !== null && (
                                <span className={`text-[9px] font-bold block ${pgDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {pgDiff >= 0 ? `+${pgDiff}% sobre marbete` : `${pgDiff}% bajo marbete`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Insumo Verificado</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[8px] uppercase">
                                Toma Muestra
                              </span>
                              <strong className="text-slate-800 dark:text-slate-200">
                                {insp.samplerName || 'Matias QUINTANA'}
                              </strong>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 block">
                              Muestra: {insp.sampleCode || `MUE-${insp.lotNumber}`} · {insp.samplerDniOrMatricula || 'ISTA'}
                            </span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[8px] uppercase">
                                Auditor Lab
                              </span>
                              <strong className="text-slate-700 dark:text-slate-300">
                                {insp.agronomistName}
                              </strong>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold">
                            <button
                              type="button"
                              onClick={() => navigate(`/seed-batches`)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1"
                              title="Ver Lotes de Siembra Asociados"
                            >
                              <Sprout size={11} />
                              <span>{chain.linkedSeedBatches.length} Lotes Siembra</span>
                            </button>

                            <ChevronRight size={11} className="text-slate-400" />

                            <button
                              type="button"
                              onClick={() => navigate(`/plots`)}
                              className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition flex items-center gap-1"
                              title="Ver Parcelas Implantadas con este Lote"
                            >
                              <Layers size={11} />
                              <span>{chain.linkedPlots.length} Parcelas</span>
                            </button>

                            <ChevronRight size={11} className="text-slate-400" />

                            <button
                              type="button"
                              onClick={() => navigate(`/seed-batches`)}
                              className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
                              title="Ver Material Obtenido de la Cosecha"
                            >
                              <PackageCheck size={11} />
                              <span>{chain.obtainedMaterials.length} Mat. Obtenido</span>
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${verdictCfg.bg} ${verdictCfg.text} ${verdictCfg.border}`}>
                              <VIcon size={12} />
                              <span>{verdictCfg.label}</span>
                            </span>
                            {insp.inputCategory === 'Semilla C1/C2' && (
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase border ${
                                insp.verdict === 'APROBADO_CAMPO'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              }`}>
                                {insp.verdict === 'APROBADO_CAMPO' ? '● En Stock Activo (Calidad OK)' : '○ No Activo p/ Siembra'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/trace/${insp.id}?type=inspection&lot=${encodeURIComponent(insp.lotNumber)}&sup=${encodeURIComponent(insp.supplierName)}&grade=${qGrade}&score=${qScore}&sampler=${encodeURIComponent(insp.samplerName || 'Matias QUINTANA')}&sampleCode=${encodeURIComponent(insp.sampleCode || '')}&agro=${encodeURIComponent(insp.agronomistName)}`)}
                              className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition"
                              title="Abrir Trazabilidad QR Pública de la Inspección"
                            >
                              <QrCode size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedInspectionForView(insp)}
                              className="bg-slate-900 hover:bg-purple-600 text-white px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase transition flex items-center gap-1 shadow-sm"
                              title="Ver Acta Fitosanitaria, QR y Circuito de Trazabilidad"
                            >
                              <FileText size={12} />
                              <span>Acta & QR</span>
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openNewInspectionModal(insp)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition"
                                  title="Editar Inspección y Asociaciones"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInspection(insp.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition"
                                  title="Eliminar Ensayo"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: VADEMÉCUM AGRONÓMICO & PROTOCOLO SENASA (CONECTADO EN VIVO CON INVENTARIO BD) */}
      {activeMainTab === 'vademecum' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Protocolo Fitosanitario & GACP Oficial · Sincronizado con Inventario BD ({resources.filter(r => r.type !== 'Labor').length} Insumos)
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <span>Vademécum Agronómico de Insumos Homologados SENASA</span>
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800">
                  LMR = Cero Residuos en Inflorescencia & Grano
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/resources')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Gestionar / Cargar Insumo SENASA</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources
                .filter(r => r.type !== 'Labor')
                .map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {item.agroCategory || item.type}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1 leading-snug">
                            {item.name}
                          </h4>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                            {item.senasaRegisterNumber || 'SENASA Homologado'} · Lote: {item.batchNumber || 'S/N'}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[8px] text-slate-400 uppercase font-bold block">Carencia</span>
                          <strong className="text-[11px] font-black text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded inline-block">
                            {(item.safetyPeriodDays ?? 0) === 0 ? '0 Días (Inocuo)' : `${item.safetyPeriodDays} Días`}
                          </strong>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Principio Activo:</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            {item.activeIngredient || 'Composición Biológica / Nutricional Homologada'}
                          </p>
                        </div>
                        {item.targetPestOrDisease && (
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Objetivo / Blanco MIP:</span>
                            <p className="text-slate-600 dark:text-slate-400 text-[10px]">{item.targetPestOrDisease}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono">
                          <span>
                            Dosis: <strong>{item.recommendedDosagePerHa ?? 2} {item.dosageUnit || 'L/ha'}</strong>
                          </span>
                          <span className="text-emerald-600 font-bold">
                            Stock: {item.stock ?? 0} {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                      <span className="truncate">
                        Prov: <strong className="text-slate-700 dark:text-slate-300">{item.supplierName || 'Red Homologada'}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-bold shrink-0">
                        SENASA OK
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: NUEVA INSPECCIÓN FITOSANITARIA DE LOTE + CALIDAD + TRAZABILIDAD + PERSONAL INTERVINIENTE */}
      {isNewInspectionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">
                    Determinación de Calidad del Lote & Vinculación de Trazabilidad QR
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingInspectionId ? 'Editar Inspección Técnica de Lote' : 'Nueva Inspección Técnica de Lote'}
                  </h2>
                </div>
              </div>
              <button onClick={() => setIsNewInspectionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22}/></button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-5">
              {/* BLOQUE 1: ORIGEN DEL LOTE, GENÉTICA INSPECCIONADA Y ALTA EN STOCK ACTIVO POR CALIDAD */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1.5">
                    <Sprout size={14} />
                    <span>1. Identificación del Lote, Genética Evaluada & Alta Automática en Stock por Calidad</span>
                  </span>
                  {newInspectionData.inputCategory === 'Semilla C1/C2' && (
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1.5 ${
                      newInspectionData.verdict === 'APROBADO_CAMPO'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}>
                      <ShieldCheck size={13} />
                      <span>
                        {newInspectionData.verdict === 'APROBADO_CAMPO'
                          ? 'Dictamen Aprobado ➔ Queda en Stock como ACTIVO (Pasó Calidad)'
                          : 'Lote Observado / Rechazado ➔ Bloqueado para Siembra'}
                      </span>
                    </span>
                  )}
                </div>

                {newInspectionData.inputCategory === 'Semilla C1/C2' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/70 text-[10px] text-emerald-900 dark:text-emerald-200">
                    <strong>Regla de Calidad & Stock:</strong> Al emitir este Dictamen Técnico con veredicto <strong>APROBADO PARA CAMPO</strong>, el lote de semilla ingresa o se actualiza automáticamente en el <strong>Stock Biológico como ACTIVO</strong>, quedando habilitado para ser tomado directamente al crear el Lote o Parcela de Cultivo.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proveedor Homologado *</label>
                    <select
                      required
                      className={inputClass}
                      value={newInspectionData.supplierId}
                      onChange={e => {
                        const sup = suppliers.find(s => s.id === e.target.value);
                        setNewInspectionData({
                          ...newInspectionData,
                          supplierId: e.target.value,
                          supplierName: sup?.name || ''
                        });
                      }}
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría del Insumo *</label>
                    <select
                      className={inputClass}
                      value={newInspectionData.inputCategory}
                      onChange={e => setNewInspectionData({ ...newInspectionData, inputCategory: e.target.value as any })}
                    >
                      <option value="Semilla C1/C2">Semilla Fiscalizada C1 / C2</option>
                      <option value="Bioinsumo / Enmienda">Bioinsumo / Biofertilizante SENASA</option>
                      <option value="Fitosanitario / Biológico">Fitosanitario / Control Biológico</option>
                      <option value="Sustrato / Enraizante">Sustrato / Propagación</option>
                      <option value="Servicio Mecanización">Servicio Mecanizado de Campo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase mb-1">
                      Genética / Variedad Evaluada en Inspección *
                    </label>
                    <select
                      required={newInspectionData.inputCategory === 'Semilla C1/C2'}
                      className="w-full p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newInspectionData.varietyId || ''}
                      onChange={e => {
                        const v = varieties.find(va => va.id === e.target.value);
                        setNewInspectionData({
                          ...newInspectionData,
                          varietyId: e.target.value,
                          varietyName: v?.name || ''
                        });
                      }}
                    >
                      <option value="">Seleccionar Genética Inspeccionada...</option>
                      {varieties.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.usage})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° de Lote / Marbete Oficial INASE *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      placeholder="Ej: FUT-75-25-HEM"
                      value={newInspectionData.lotNumber}
                      onChange={e => setNewInspectionData({ ...newInspectionData, lotNumber: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° Remito / Guía ARICCAME</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Ej: RE-2026-04104588-APN"
                      value={newInspectionData.guideOrRemitoNumber || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, guideOrRemitoNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Recepción / Ensayo</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={newInspectionData.date}
                      onChange={e => setNewInspectionData({ ...newInspectionData, date: e.target.value })}
                    />
                  </div>
                </div>

                {newInspectionData.inputCategory === 'Semilla C1/C2' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Cantidad Habilitada en Stock Activo (Kg) *</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        className={inputClass}
                        value={newInspectionData.initialQuantityKg || 1}
                        onChange={e => setNewInspectionData({ ...newInspectionData, initialQuantityKg: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Nodo de Almacenamiento Destino (Stock) *</label>
                      <select
                        className={inputClass}
                        value={newInspectionData.storagePointId || ''}
                        onChange={e => setNewInspectionData({ ...newInspectionData, storagePointId: e.target.value })}
                      >
                        {storagePoints.map(sp => (
                          <option key={sp.id} value={sp.id}>{sp.name} ({sp.city})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 2: ENSAYOS FISIOLÓGICOS Y DETERMINACIÓN AUTOMÁTICA DE CALIDAD DEL LOTE */}
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-purple-200/60 dark:border-purple-800/60 pb-2.5">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-600 block tracking-wider">
                      2. Determinación de Calidad del Lote (Laboratorio ISTA / INASE)
                    </span>
                    <p className="text-[10px] text-slate-500">
                      La calificación de calidad se asocia automáticamente al lote de siembra, parcelas y material cosechado.
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl border text-right ${QUALITY_GRADE_CONFIG[liveQualityEvaluation.grade].bg} ${QUALITY_GRADE_CONFIG[liveQualityEvaluation.grade].text} ${QUALITY_GRADE_CONFIG[liveQualityEvaluation.grade].border}`}>
                    <span className="text-[8px] font-black uppercase block opacity-80">Calidad Calculada del Lote</span>
                    <strong className="text-xs font-black uppercase">
                      {QUALITY_GRADE_CONFIG[liveQualityEvaluation.grade].shortLabel} · Score {liveQualityEvaluation.score}/100
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">% Germinación Real</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className={inputClass}
                      placeholder="Ej: 94"
                      value={newInspectionData.germinationTestedPct ?? ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, germinationTestedPct: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">% Germinación Marbete</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className={inputClass}
                      placeholder="Ej: 90"
                      value={newInspectionData.germinationDeclaredPct ?? ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, germinationDeclaredPct: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">% Pureza Física</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className={inputClass}
                      placeholder="Ej: 99.8"
                      value={newInspectionData.purityPct ?? ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, purityPct: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">% Humedad Grano</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      className={inputClass}
                      placeholder="Ej: 8.8"
                      value={newInspectionData.moisturePct ?? ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, moisturePct: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Índice Vigor (1-9)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="9"
                      className={inputClass}
                      placeholder="Ej: 9"
                      value={newInspectionData.vigorScore ?? 8}
                      onChange={e => setNewInspectionData({ ...newInspectionData, vigorScore: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Screening Patógenos (Fusarium / Botrytis)</label>
                    <select
                      className={inputClass}
                      value={newInspectionData.pathogenScreeningResult}
                      onChange={e => setNewInspectionData({ ...newInspectionData, pathogenScreeningResult: e.target.value as any })}
                    >
                      <option value="Negativo (Conforme)">Negativo (Conforme / Libre)</option>
                      <option value="Presencia Aislada No Cuarentenaria">Presencia Aislada No Cuarentenaria</option>
                      <option value="Positivo Cuarentenario (Alerta)">Positivo Cuarentenario (Alerta Fitosanitaria)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Estatus de Residuos Químicos</label>
                    <select
                      className={inputClass}
                      value={newInspectionData.residueStatus}
                      onChange={e => setNewInspectionData({ ...newInspectionData, residueStatus: e.target.value as any })}
                    >
                      <option value="Cero Residuos / Orgánico">Cero Residuos / Orgánico (Protocolo GACP)</option>
                      <option value="Dentro de LMR SENASA">Dentro de LMR SENASA Tolerado</option>
                      <option value="Excede LMR">Excede LMR (No Apto)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Veredicto Fitosanitario Oficial *</label>
                    <select
                      required
                      className={inputClass}
                      value={newInspectionData.verdict}
                      onChange={e => setNewInspectionData({ ...newInspectionData, verdict: e.target.value as any })}
                    >
                      <option value="APROBADO_CAMPO">APROBADO PARA CAMPO (Conforme)</option>
                      <option value="EN_CUARENTENA_OBSERVADO">EN CUARENTENA TÉCNICA (Lote Observado)</option>
                      <option value="RECHAZADO_DEVOLUCION">RECHAZADO FITOSANITARIAMENTE (Devolución)</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span><strong>Dictamen Automático de Calidad:</strong> {QUALITY_GRADE_CONFIG[liveQualityEvaluation.grade].description}</span>
                </div>
              </div>

              {/* BLOQUE 3: PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD */}
              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Users size={14} />
                    <span>3. Personal Interviniente en Toma de Muestras, Laboratorio y Recepción</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    Integridad de Cadena de Custodia QR
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Operador Toma de Muestra (Staff)</label>
                    <select
                      className={inputClass}
                      value={newInspectionData.samplerUserId || ''}
                      onChange={e => {
                        const u = users.find(usr => usr.id === e.target.value);
                        if (u) {
                          setNewInspectionData({
                            ...newInspectionData,
                            samplerUserId: u.id,
                            samplerName: u.name,
                            samplerRole: u.jobTitle || 'Responsable de Muestreo en Recepción'
                          });
                        } else {
                          setNewInspectionData({ ...newInspectionData, samplerUserId: '' });
                        }
                      }}
                    >
                      <option value="">Seleccionar Personal Activo...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Nombre Tomador de Muestra *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      value={newInspectionData.samplerName || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, samplerName: e.target.value })}
                      placeholder="Ej: Matias QUINTANA"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Matrícula / Legajo Muestreador *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      value={newInspectionData.samplerDniOrMatricula || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, samplerDniOrMatricula: e.target.value })}
                      placeholder="Ej: TEC-MUESTREO-ISTA-108"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Código de Muestra Precintada *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      value={newInspectionData.sampleCode || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, sampleCode: e.target.value })}
                      placeholder="Ej: MUE-ISTA-2026-001"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Método de Toma de Muestra</label>
                    <select
                      className={inputClass}
                      value={newInspectionData.samplingMethod || 'Calador ISTA Compuesto (3 Submuestras Precintadas)'}
                      onChange={e => setNewInspectionData({ ...newInspectionData, samplingMethod: e.target.value as any })}
                    >
                      <option value="Calador ISTA Compuesto (3 Submuestras Precintadas)">Calador ISTA Compuesto (3 Submuestras Precintadas)</option>
                      <option value="Cuarteo Oficial INASE en Bóveda Central">Cuarteo Oficial INASE en Bóveda Central</option>
                      <option value="Muestreo Sistemático en Línea de Recepción">Muestreo Sistemático en Línea de Recepción</option>
                      <option value="Contramuestra Precintada de Semillero">Contramuestra Precintada de Semillero</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Responsable Custodia / Recepción</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={newInspectionData.receptionResponsibleName || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, receptionResponsibleName: e.target.value })}
                      placeholder="Ej: Gastón BAREA M."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Ingeniero Agrónomo Certificante *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      value={newInspectionData.agronomistName || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, agronomistName: e.target.value })}
                      placeholder="Ing. Agr. Julian PIZARRO"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Matrícula Profesional (MP) *</label>
                    <input
                      required
                      type="text"
                      className={inputClass}
                      value={newInspectionData.agronomistMatricula || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, agronomistMatricula: e.target.value })}
                      placeholder="MP-AGRO-1492 CH"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones Técnicas del Ensayo y Trazabilidad</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Detallar energía germinativa, homogeneidad de calibre, estado de precintos INASE y aptitud para siembra..."
                  value={newInspectionData.observations || ''}
                  onChange={e => setNewInspectionData({ ...newInspectionData, observations: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">
                  El dictamen impacta automáticamente en la trazabilidad QR de lotes de siembra, parcelas y cosecha.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewInspectionModalOpen(false)}
                    className="px-4 py-2 text-slate-400 font-bold uppercase hover:text-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-2xl font-bold uppercase tracking-wider shadow flex items-center hover:bg-purple-500 transition"
                  >
                    <Save className="mr-2" size={16}/>
                    <span>{editingInspectionId ? 'Guardar Cambios y Actualizar QR' : 'Emitir Dictamen y Vincular Trazabilidad'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTA OFICIAL DE INSPECCIÓN TÉCNICA Y RECEPCIÓN (IMPRIMIBLE + QR + CIRCUITO TRAZABILIDAD) */}
      {selectedInspectionForView && (() => {
        const calcQ = calculateLotQuality(selectedInspectionForView);
        const qGrade = selectedInspectionForView.qualityGrade || calcQ.grade;
        const qScore = selectedInspectionForView.qualityScore || calcQ.score;
        const gradeCfg = QUALITY_GRADE_CONFIG[qGrade] || QUALITY_GRADE_CONFIG['GRADO_A_SUPERIOR'];
        const chain = getInspectionTraceabilityChain(selectedInspectionForView);
        const qrUrl = buildTraceUrl(selectedInspectionForView.id, {
          type: 'inspection',
          lot: selectedInspectionForView.lotNumber,
          sup: selectedInspectionForView.supplierName,
          grade: qGrade,
          score: qScore,
          pg: selectedInspectionForView.germinationTestedPct,
          purity: selectedInspectionForView.purityPct,
          sampler: selectedInspectionForView.samplerName || 'Matias QUINTANA',
          sampleCode: selectedInspectionForView.sampleCode || `MUE-${selectedInspectionForView.lotNumber}`,
          agro: selectedInspectionForView.agronomistName,
          mp: selectedInspectionForView.agronomistMatricula
        });

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[85] p-4 font-mono">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Microscope size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">
                      Certificado de Calidad de Lote, Toma de Muestras & Trazabilidad QR
                    </span>
                    <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Acta Técnica de Inspección Fitosanitaria · Lote {selectedInspectionForView.lotNumber}
                    </h2>
                  </div>
                </div>
                <button onClick={() => setSelectedInspectionForView(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>

              {/* DOCUMENTO IMPRIMIBLE */}
              <div id="printable-lot-inspection" className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 space-y-4 my-2 text-xs">
                {/* CABECERA FITOTÉCNICA */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-900">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      <span>NUCLEUS QUALITY · ACTA DE DETERMINACIÓN DE CALIDAD DE LOTE</span>
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                      Protocolo ISTA / INASE / SENASA · Ley 27.669 & Trazabilidad QR ARICCAME
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase block ${
                      selectedInspectionForView.verdict === 'APROBADO_CAMPO'
                        ? 'bg-emerald-600 text-white'
                        : selectedInspectionForView.verdict === 'EN_CUARENTENA_OBSERVADO'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    }`}>
                      {selectedInspectionForView.verdict === 'APROBADO_CAMPO' ? 'APROBADO PARA SIEMBRA' : selectedInspectionForView.verdict}
                    </span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-900 text-white block">
                      {gradeCfg.shortLabel} ({qScore}/100)
                    </span>
                  </div>
                </div>

                {/* DATOS DE LA ENTIDAD OPERADORA (PATAGONIANC LTDA) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <div>
                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                        Titular & Entidad Fiscal Homologadora
                      </span>
                      <strong className="text-sm font-black uppercase text-slate-900">
                        Cooperativa PatagonianC LTDA
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black uppercase text-slate-400 block">CUIT</span>
                      <span className="text-xs font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        30-71816113-0
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[8px] font-black text-emerald-700 uppercase block">Licencia Agrícola ARICCAME</span>
                      <strong className="font-mono text-slate-900 text-[9px] block truncate">
                        EX-2024-134354227--APN-ARICCAME#MEC
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[8px] font-black text-sky-700 uppercase block">Licencia Industrial ARICCAME</span>
                      <strong className="font-mono text-slate-900 text-[9px] block truncate">
                        EX-2025-119427833--APN-ARICCAME#MEC
                      </strong>
                    </div>
                  </div>
                </div>

                {/* DATOS DEL LOTE Y PROVEEDOR + QR DE TRAZABILIDAD */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Lote Inspeccionado:</span>
                    <strong className="text-base font-black font-mono text-slate-900 block leading-tight">
                      {selectedInspectionForView.lotNumber}
                    </strong>
                    <span className="text-[10px] text-slate-600 block mt-0.5">
                      Categoría: {selectedInspectionForView.inputCategory}
                    </span>
                    {selectedInspectionForView.varietyName && (
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        Genética: {selectedInspectionForView.varietyName}
                      </span>
                    )}
                    {selectedInspectionForView.guideOrRemitoNumber && (
                      <span className="text-[10px] font-mono text-purple-700 block">
                        Remito Oficial: {selectedInspectionForView.guideOrRemitoNumber}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Proveedor Homologado:</span>
                    <strong className="text-sm font-black text-slate-900 block">
                      {selectedInspectionForView.supplierName}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      Fecha Ensayo: {selectedInspectionForView.date}
                    </span>
                    <span className="text-[10px] font-bold text-slate-800 block mt-0.5">
                      Calidad: {gradeCfg.label}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <QRCodeSVG value={qrUrl} size={78} level="M" includeMargin={false} />
                    <span className="text-[8px] font-black uppercase text-slate-600 mt-1">
                      QR Activo · Escaneo Público
                    </span>
                  </div>
                </div>

                {/* MATRIZ DE MEDICIÓN TÉCNICA */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                    Resultados Fisiológicos, Sanitarios & Determinación de Calidad
                  </span>

                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-400 uppercase block">PG Real Cámara</span>
                      <strong className="text-emerald-700 text-sm font-black font-mono">
                        {selectedInspectionForView.germinationTestedPct ? `${selectedInspectionForView.germinationTestedPct}%` : 'N/A'}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-400 uppercase block">PG Marbete</span>
                      <strong className="text-slate-800 text-sm font-bold font-mono">
                        {selectedInspectionForView.germinationDeclaredPct ? `${selectedInspectionForView.germinationDeclaredPct}%` : 'N/A'}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-400 uppercase block">Pureza Física</span>
                      <strong className="text-slate-800 text-sm font-bold font-mono">
                        {selectedInspectionForView.purityPct ? `${selectedInspectionForView.purityPct}%` : 'OK'}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-400 uppercase block">Humedad Lote</span>
                      <strong className="text-slate-800 text-sm font-bold font-mono">
                        {selectedInspectionForView.moisturePct ? `${selectedInspectionForView.moisturePct}%` : '≤9%'}
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-400 uppercase block">Vigor ISTA</span>
                      <strong className="text-purple-700 text-sm font-black font-mono">
                        {selectedInspectionForView.vigorScore || 9} / 9
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[10px]">
                    <div>
                      <span className="text-slate-400 block font-bold">Screening Patógenos:</span>
                      <strong className="text-emerald-700">{selectedInspectionForView.pathogenScreeningResult}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Residuos Químicos:</span>
                      <strong className="text-purple-700">{selectedInspectionForView.residueStatus}</strong>
                    </div>
                  </div>

                  {selectedInspectionForView.observations && (
                    <div className="pt-2 border-t border-slate-200 text-[10px]">
                      <span className="text-slate-400 block font-bold">Observaciones Técnicas:</span>
                      <p className="text-slate-700 italic">{selectedInspectionForView.observations}</p>
                    </div>
                  )}
                </div>

                {/* PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y AUDITORÍA */}
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-2">
                  <span className="text-[8px] font-black uppercase text-amber-900 block tracking-wider">
                    Personal Interviniente en Toma de Muestras y Cadena de Custodia
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-white p-2 rounded-lg border border-amber-200">
                      <span className="text-[8px] text-amber-700 uppercase font-black block">Toma de Muestras</span>
                      <strong className="text-slate-900 block">{selectedInspectionForView.samplerName || 'Matias QUINTANA'}</strong>
                      <span className="text-[9px] text-slate-500 block">{selectedInspectionForView.samplerDniOrMatricula || 'TEC-MUESTREO-ISTA-108'}</span>
                      <span className="text-[8px] font-mono text-amber-800 block mt-0.5">
                        Muestra: {selectedInspectionForView.sampleCode || `MUE-${selectedInspectionForView.lotNumber}`}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-amber-200">
                      <span className="text-[8px] text-purple-700 uppercase font-black block">Auditoría Fitotécnica</span>
                      <strong className="text-slate-900 block">{selectedInspectionForView.agronomistName}</strong>
                      <span className="text-[9px] text-slate-500 block">MP: {selectedInspectionForView.agronomistMatricula}</span>
                      <span className="text-[8px] text-slate-500 block mt-0.5">
                        Método: {selectedInspectionForView.samplingMethod || 'Calador ISTA Compuesto'}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-amber-200">
                      <span className="text-[8px] text-emerald-700 uppercase font-black block">Custodia & Recepción</span>
                      <strong className="text-slate-900 block">{selectedInspectionForView.receptionResponsibleName || 'Gastón BAREA M.'}</strong>
                      <span className="text-[9px] text-slate-500 block">Bóveda & Almacén Central</span>
                      <BarcodeRenderer value={selectedInspectionForView.lotNumber} width={0.9} height={18} displayValue={false} />
                    </div>
                  </div>
                </div>

                {/* CIRCUITO DE TRAZABILIDAD CONTINUA (4 ESLABONES) */}
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-2">
                  <span className="text-[8px] font-black uppercase text-emerald-800 block tracking-wider">
                    Circuito de Trazabilidad Activo Asociado a este Lote
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-[8px] font-black text-emerald-700 uppercase block">1. Lotes de Siembra ({chain.linkedSeedBatches.length})</span>
                      {chain.linkedSeedBatches.length > 0 ? (
                        chain.linkedSeedBatches.slice(0, 2).map(b => (
                          <span key={b.id} className="font-mono text-[9px] text-slate-800 block truncate">• {b.batchCode}</span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400">Listo para asignar a siembra</span>
                      )}
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-[8px] font-black text-sky-700 uppercase block">2. Parcelas Implantadas ({chain.linkedPlots.length})</span>
                      {chain.linkedPlots.length > 0 ? (
                        chain.linkedPlots.slice(0, 2).map(p => (
                          <span key={p.id} className="font-mono text-[9px] text-slate-800 block truncate">• {p.name}</span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400">Sin parcelas vinculadas aún</span>
                      )}
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-[8px] font-black text-amber-700 uppercase block">3. Material Obtenido ({chain.obtainedMaterials.length})</span>
                      {chain.obtainedMaterials.length > 0 ? (
                        chain.obtainedMaterials.slice(0, 2).map(m => (
                          <span key={m.id} className="font-mono text-[9px] text-slate-800 block truncate">• {m.batchCode} ({m.remainingQuantity} kg)</span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400">En ciclo de cultivo</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PIE INSTITUCIONAL */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
                  <span>Válido para fiscalización INASE / SENASA / ARICCAME</span>
                  <span>Cooperativa PatagonianC LTDA · Trazabilidad QR Inmutable</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInspectionForView(null);
                    navigate(`/trace/${selectedInspectionForView.id}?type=inspection&lot=${encodeURIComponent(selectedInspectionForView.lotNumber)}&sup=${encodeURIComponent(selectedInspectionForView.supplierName)}&grade=${qGrade}&score=${qScore}&sampler=${encodeURIComponent(selectedInspectionForView.samplerName || 'Matias QUINTANA')}&sampleCode=${encodeURIComponent(selectedInspectionForView.sampleCode || '')}&agro=${encodeURIComponent(selectedInspectionForView.agronomistName)}`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold uppercase text-[10px] flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                >
                  <QrCode size={14} />
                  <span>Abrir Portal Público QR</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInspectionForView(null)}
                    className="px-4 py-2 text-slate-400 font-bold uppercase hover:text-slate-600"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-bold uppercase shadow flex items-center gap-1.5 hover:bg-purple-500 transition"
                  >
                    <Printer size={15} />
                    <span>Imprimir Acta & QR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: DICTAMEN DE HOMOLOGACIÓN DEL PROVEEDOR (IMPRIMIBLE) */}
      {isAuditModalOpen && selectedSupplierForAudit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                    Certificado de Homologación Agronómica
                  </span>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Dictamen Fitosanitario de Proveedor
                  </h2>
                </div>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* CONTENEDOR DEL DICTAMEN IMPRIMIBLE */}
            <div id="printable-supplier-audit" className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 space-y-4 my-2 text-xs">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-900">
                    <Sprout size={16} className="text-emerald-600" />
                    <span>NUCLEUS SUPPLY · DICTAMEN TÉCNICO DE PROVEEDOR</span>
                  </div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                    Cadena de Valor Agronómica · INASE / SENASA / ARICCAME
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-slate-900 text-white">
                    {selectedSupplierForAudit.homologationStatus || 'Homologado Conforme'}
                  </span>
                </div>
              </div>

              {/* DATOS DE LA COOPERATIVA Y LICENCIAS */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                      Titular & Operador Oficial
                    </span>
                    <strong className="text-sm font-black uppercase text-slate-900">
                      Cooperativa PatagonianC LTDA
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">CUIT</span>
                    <span className="text-xs font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      30-71816113-0
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[8px] font-black text-emerald-700 uppercase block">Licencia Agrícola ARICCAME</span>
                    <strong className="font-mono text-slate-900 text-[9px] block truncate">
                      EX-2024-134354227--APN-ARICCAME#MEC
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[8px] font-black text-sky-700 uppercase block">Licencia Industrial ARICCAME</span>
                    <strong className="font-mono text-slate-900 text-[9px] block truncate">
                      EX-2025-119427833--APN-ARICCAME#MEC
                    </strong>
                  </div>
                </div>
              </div>

              {/* DATOS DEL PROVEEDOR */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Razón Social / Entidad:</span>
                  <strong className="text-base font-black uppercase text-slate-900 block leading-tight">
                    {selectedSupplierForAudit.legalName || selectedSupplierForAudit.name}
                  </strong>
                  <span className="text-[10px] text-slate-600 block mt-0.5">
                    CUIT: {selectedSupplierForAudit.cuit || 'S/D'} · {selectedSupplierForAudit.city}, {selectedSupplierForAudit.province}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Registros Oficiales:</span>
                  <span className="block text-[10px] font-bold text-slate-800">
                    INASE RNCyFS: {selectedSupplierForAudit.inaseRncyfsNumber || 'No aplica'}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-800">
                    SENASA / ARICCAME: {selectedSupplierForAudit.senasaRegisterNumber || selectedSupplierForAudit.ariccameLicenseNumber || 'Acreditado'}
                  </span>
                </div>
              </div>

              {/* ESPECIALIDAD & AUDITORÍA */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-bold">Especialidad Agronómica Dictaminada:</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">
                    {selectedSupplierForAudit.technicalSpecialty || 'Suministro de insumos y materiales conforme a protocolo técnico.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">Calificación Técnica</span>
                    <strong className="text-emerald-700 text-sm font-black">
                      {selectedSupplierForAudit.audit?.auditScore || 95} / 100
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">Inocuidad & Residuos</span>
                    <strong className="text-slate-900 text-sm font-bold">
                      {selectedSupplierForAudit.audit?.zeroResidueGuarantee ? 'Cero Residuos OK' : 'Estándar BPA'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">Garantía de Lote</span>
                    <strong className="text-slate-900 text-sm font-bold">
                      {selectedSupplierForAudit.batchReturnWarrantyDays || 60} días
                    </strong>
                  </div>
                </div>
              </div>

              {/* PERSONAL INTERVINIENTE Y QR DE HOMOLOGACIÓN */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="space-y-1 flex-1">
                  <div>
                    <span className="text-[8px] text-emerald-800 uppercase block font-bold">Agrónomo Auditor Responsable</span>
                    <strong className="text-slate-900 text-xs block">
                      {selectedSupplierForAudit.audit?.technicalAgronomistName || 'Ing. Agr. Julian PIZARRO'}
                    </strong>
                    <span className="text-[9px] text-slate-500">
                      Matrícula: {selectedSupplierForAudit.audit?.technicalAgronomistMatricula || 'MP-AGRO-1492 CH'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-emerald-200/60">
                    <span className="text-[8px] text-amber-800 uppercase block font-bold">Responsable Toma de Muestras & Custodia</span>
                    <strong className="text-slate-900 text-[11px] block">
                      {selectedSupplierForAudit.audit?.samplerName || 'Matias QUINTANA'} ({selectedSupplierForAudit.audit?.samplerMatricula || 'TEC-MUESTREO-ISTA-108'})
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-200">
                  <QRCodeSVG
                    value={buildTraceUrl(selectedSupplierForAudit.id, {
                      type: 'supplier',
                      name: selectedSupplierForAudit.name,
                      cuit: selectedSupplierForAudit.cuit,
                      inase: selectedSupplierForAudit.inaseRncyfsNumber,
                      agro: selectedSupplierForAudit.audit?.technicalAgronomistName || 'Ing. Agr. Julian PIZARRO',
                      sampler: selectedSupplierForAudit.audit?.samplerName || 'Matias QUINTANA'
                    })}
                    size={70}
                    level="M"
                  />
                  <div className="text-[9px] text-slate-600">
                    <strong className="text-slate-900 uppercase block">QR Homologación</strong>
                    <span>Fecha: {selectedSupplierForAudit.audit?.lastAuditDate || '2025-12-20'}</span>
                    <span className="block text-[8px] text-emerald-700 font-bold mt-0.5">Verificación Pública</span>
                  </div>
                </div>
              </div>

              {/* PIE INSTITUCIONAL */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-500">
                <span>Operador Fiscal: Cooperativa PatagonianC LTDA · CUIT 30-71816113-0</span>
                <span>Lic. Agrícola EX-2024-134354227 · Lic. Industrial EX-2025-119427833</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsAuditModalOpen(false);
                  navigate(`/trace/${selectedSupplierForAudit.id}?type=supplier&name=${encodeURIComponent(selectedSupplierForAudit.name)}&cuit=${encodeURIComponent(selectedSupplierForAudit.cuit || '')}&inase=${encodeURIComponent(selectedSupplierForAudit.inaseRncyfsNumber || '')}`);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold uppercase text-[10px] flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
              >
                <QrCode size={14} />
                <span>Abrir Trazabilidad QR</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-2 text-slate-400 font-bold uppercase hover:text-slate-600"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold uppercase shadow flex items-center gap-1.5 hover:bg-emerald-500 transition"
                >
                  <Printer size={15} />
                  <span>Imprimir Dictamen & QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ALTA / EDICIÓN FITOTÉCNICA DEL PROVEEDOR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Briefcase size={22}/>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                    Homologación Técnica de Proveedores
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingId ? 'Editar Proveedor Agronómico' : 'Homologar Nuevo Proveedor'}
                  </h2>
                </div>
              </div>
              <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600"><X size={22}/></button>
            </div>

            {/* TABS DEL FORMULARIO */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 mb-6 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('technical')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
                  modalTab === 'technical'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1. Clasificación Técnica
              </button>
              <button
                type="button"
                onClick={() => setModalTab('regulatory')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
                  modalTab === 'regulatory'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                2. Registros INASE / SENASA
              </button>
              <button
                type="button"
                onClick={() => setModalTab('quality')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
                  modalTab === 'quality'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-purple-600'
                }`}
              >
                3. Auditoría & Calidad
              </button>
              <button
                type="button"
                onClick={() => setModalTab('logistics')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
                  modalTab === 'logistics'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-sky-600'
                }`}
              >
                4. Ubicación & Contacto
              </button>
              <button
                type="button"
                onClick={() => setModalTab('humanTeam')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] flex items-center gap-1.5 ${
                  modalTab === 'humanTeam'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Users size={13} />
                <span>5. Equipo Humano & Usuarios ({(formData.humanTeam || []).length})</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* TAB 1: CLASIFICACIÓN TÉCNICA */}
              {modalTab === 'technical' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial / Semillero *</label>
                      <input required disabled={isSaving} type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Ananda Pampa / BioGenética Andina" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría Agronómica *</label>
                      <select disabled={isSaving} className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as SupplierCategory})}>
                        <option value="Semillero_Criadero">Semillero & Criadero INASE</option>
                        <option value="Bioinsumos_Fertilizantes">Bioinsumos & Fertilizantes SENASA</option>
                        <option value="Fitosanitarios_Control">Fitosanitarios & Biológicos SENASA</option>
                        <option value="Mecanizacion_Servicios">Mecanización, Siembra & Cosecha</option>
                        <option value="Laboratorio_Analitica">Laboratorio HPLC & Analítica</option>
                        <option value="Sustratos_Vivero">Sustratos & Propagación Agámica</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estado de Homologación Técnica</label>
                      <select disabled={isSaving} className={inputClass} value={formData.homologationStatus} onChange={e => setFormData({...formData, homologationStatus: e.target.value as TechnicalHomologationStatus})}>
                        <option value="Homologado_Conforme">Homologado Conforme (Apto para cultivo)</option>
                        <option value="En_Auditoria_Tecnica">En Auditoría Técnica (En evaluación)</option>
                        <option value="Cuarentena_Tecnica">Cuarentena Técnica (Lotes observados)</option>
                        <option value="No_Apto_Restringido">No Apto / Restringido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Garantía Técnica de Lote (Días)</label>
                      <input disabled={isSaving} type="number" className={inputClass} value={formData.batchReturnWarrantyDays || 60} onChange={e => setFormData({...formData, batchReturnWarrantyDays: Number(e.target.value)})} placeholder="Ej: 60 días" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Especialidad Agronómica & Aptitud Productiva</label>
                    <textarea disabled={isSaving} rows={2} className={inputClass} value={formData.technicalSpecialty || ''} onChange={e => setFormData({...formData, technicalSpecialty: e.target.value})} placeholder="Ej: Multiplicador fiscalizado de genéticas monoicas para fibra C1/C2 con poder germinativo auditado..." />
                  </div>
                </div>
              )}

              {/* TAB 2: REGISTROS INASE / SENASA */}
              {modalTab === 'regulatory' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Razón Social</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.legalName || ''} onChange={e => setFormData({...formData, legalName: e.target.value})} placeholder="Razón Social Legal" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CUIT / Identificación Fiscal</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.cuit || ''} onChange={e => setFormData({...formData, cuit: e.target.value})} placeholder="Ej: 30-71654321-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registro INASE (RNCyFS)</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.inaseRncyfsNumber || ''} onChange={e => setFormData({...formData, inaseRncyfsNumber: e.target.value})} placeholder="Ej: RNCyFS-INASE-9842-K" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registro SENASA Insumo</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.senasaRegisterNumber || ''} onChange={e => setFormData({...formData, senasaRegisterNumber: e.target.value})} placeholder="Ej: SENASA-REG-BIO-4491" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Licencia / Expte ARICCAME</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.ariccameLicenseNumber || ''} onChange={e => setFormData({...formData, ariccameLicenseNumber: e.target.value})} placeholder="Ej: EX-2024-11882200-ARICCAME" />
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <strong>Validación Regulatoria:</strong> Los insumos y semillas cargados bajo este proveedor heredarán automáticamente estos registros en las guías de tránsito y en el Cuaderno Fitosanitario digital.
                  </div>
                </div>
              )}

              {/* TAB 3: AUDITORÍA & CALIDAD */}
              {modalTab === 'quality' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agrónomo Auditor Evaluador</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.audit?.technicalAgronomistName || ''} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), technicalAgronomistName: e.target.value}})} placeholder="Nombre del profesional" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Matrícula Profesional (MP)</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.audit?.technicalAgronomistMatricula || ''} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), technicalAgronomistMatricula: e.target.value}})} placeholder="Ej: MP-AGRO-1492 CH" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calificación Técnica (0-100)</label>
                      <input disabled={isSaving} type="number" min={0} max={100} className={inputClass} value={formData.audit?.auditScore || 95} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), auditScore: Number(e.target.value)}})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsable Toma de Muestras en Homologación</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.audit?.samplerName || ''} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), samplerName: e.target.value}})} placeholder="Ej: Matias QUINTANA" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Legajo / Matrícula Muestreador ISTA</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.audit?.samplerMatricula || ''} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), samplerMatricula: e.target.value}})} placeholder="Ej: TEC-MUESTREO-ISTA-108" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.audit?.gacpCertified || false} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), gacpCertified: e.target.checked}})} className="rounded text-emerald-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Norma GACP</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.audit?.bpaCertified || false} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), bpaCertified: e.target.checked}})} className="rounded text-emerald-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">BPA Oficiales</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.audit?.zeroResidueGuarantee || false} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), zeroResidueGuarantee: e.target.checked}})} className="rounded text-emerald-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Cero Residuos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.audit?.organicCertified || false} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), organicCertified: e.target.checked}})} className="rounded text-emerald-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Orgánico SENASA</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Acreditación de Laboratorio / Ensayos (si aplica)</label>
                    <input disabled={isSaving} type="text" className={inputClass} value={formData.audit?.labAccreditationStandard || ''} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), labAccreditationStandard: e.target.value}})} placeholder="Ej: ISO/IEC 17025:2017 & Red Laboratorios ARICCAME" />
                  </div>
                </div>
              )}

              {/* TAB 4: UBICACIÓN & CONTACTO */}
              {modalTab === 'logistics' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Provincia</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} placeholder="Ej: Mendoza, Buenos Aires" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ciudad / Localidad</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ej: Luján de Cuyo" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dirección / Predio</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ruta, Parque Industrial o Predio" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsable Comercial / Dirección</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.commercialContact || ''} onChange={e => setFormData({...formData, commercialContact: e.target.value})} placeholder="Ej: Gabriel Blocki (Director Semillero)" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsable de Logística & Despacho de Lotes</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.logisticsContact || ''} onChange={e => setFormData({...formData, logisticsContact: e.target.value})} placeholder="Ej: Hernán Villalba (Despacho & Guías)" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Institucional / Calidad</label>
                      <input disabled={isSaving} type="email" className={inputClass} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="calidad@proveedor.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono / WhatsApp Logístico</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="+54 9 261 455-8890" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Latitud GPS</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.lat || ''} onChange={e => setFormData({...formData, lat: e.target.value})} placeholder="-33.0035" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitud GPS</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.lng || ''} onChange={e => setFormData({...formData, lng: e.target.value})} placeholder="-68.8680" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: EQUIPO HUMANO & USUARIOS VINCULADOS AL PROVEEDOR */}
              {modalTab === 'humanTeam' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-black uppercase flex items-center gap-1.5">
                      <Lock size={14} className="text-amber-600" />
                      <span>Candado de Aislamiento por Semilla & Notificación de Acceso por Email</span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      Declare aquí las personas humanas del proveedor (Director Técnico/Obtentor, Comercial, Logística, Calidad ISTA). Si activa <strong>"Habilitar como Usuario del Sistema"</strong>, al guardar se creará su perfil en <strong>Equipos & Accesos</strong>, se le enviará automáticamente un correo con sus credenciales y <strong>solo podrá acceder a las parcelas implantadas con semillas de este proveedor</strong>.
                    </p>
                  </div>

                  {/* FORMULARIO RÁPIDO PARA AGREGAR ACTOR HUMANO */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                      + Incorporar Persona Humana al Proveedor
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre y Apellido *</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={newActorDraft.name}
                          onChange={e => setNewActorDraft({ ...newActorDraft, name: e.target.value })}
                          placeholder="Ej: Ing. Agr. Gabriel Blocki"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Función en el Proveedor *</label>
                        <select
                          className={inputClass}
                          value={newActorDraft.actorRole}
                          onChange={e => setNewActorDraft({ ...newActorDraft, actorRole: e.target.value as SupplierActorRole })}
                        >
                          {SUPPLIER_ACTOR_ROLES.map(r => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cargo / Especialidad</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={newActorDraft.jobTitle}
                          onChange={e => setNewActorDraft({ ...newActorDraft, jobTitle: e.target.value })}
                          placeholder="Ej: Director Obtentor / Logística"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email (Para Usuario & Notificación) *</label>
                        <input
                          type="email"
                          className={inputClass}
                          value={newActorDraft.email}
                          onChange={e => setNewActorDraft({ ...newActorDraft, email: e.target.value })}
                          placeholder="actor@semillero.com.ar"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">WhatsApp / Teléfono Directo</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={newActorDraft.phone}
                          onChange={e => setNewActorDraft({ ...newActorDraft, phone: e.target.value })}
                          placeholder="+54 9 11 5555-0000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Matrícula Profesional / DNI</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={newActorDraft.dniOrMatricula}
                          onChange={e => setNewActorDraft({ ...newActorDraft, dniOrMatricula: e.target.value })}
                          placeholder="Ej: MP-AGRO-4102"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newActorDraft.isAccessActive}
                          onChange={e => setNewActorDraft({ ...newActorDraft, isAccessActive: e.target.checked })}
                          className="rounded text-emerald-600 w-4 h-4"
                        />
                        <span>Habilitar como Usuario del Sistema (acceso exclusivo a sus semillas) y notificar por Email</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          if (!newActorDraft.name.trim()) {
                            alert('Ingrese el nombre y apellido de la persona responsable.');
                            return;
                          }
                          if (newActorDraft.isAccessActive && !newActorDraft.email.trim()) {
                            alert('Ingrese el correo electrónico para poder crear el usuario y enviarle las credenciales.');
                            return;
                          }
                          const createdActor: SupplierHumanActor = {
                            id: generateId('actor'),
                            name: newActorDraft.name.trim(),
                            actorRole: newActorDraft.actorRole,
                            jobTitle: newActorDraft.jobTitle.trim() || SUPPLIER_ACTOR_ROLES_INFO[newActorDraft.actorRole].label,
                            email: newActorDraft.email.trim(),
                            phone: newActorDraft.phone.trim() || undefined,
                            dniOrMatricula: newActorDraft.dniOrMatricula.trim() || undefined,
                            isAccessActive: newActorDraft.isAccessActive
                          };
                          setFormData(prev => ({
                            ...prev,
                            humanTeam: [...(prev.humanTeam || []), createdActor]
                          }));
                          setNewActorDraft({
                            name: '',
                            actorRole: 'responsable_logistica',
                            jobTitle: '',
                            email: '',
                            phone: '',
                            dniOrMatricula: '',
                            isAccessActive: true
                          });
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Agregar al Equipo del Proveedor</span>
                      </button>
                    </div>
                  </div>

                  {/* LISTADO DE ACTORES HUMANOS CARGADOS EN EL PROVEEDOR */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Personas Humanas Vinculadas a {formData.name || 'este Proveedor'} ({(formData.humanTeam || []).length})
                    </span>

                    {(formData.humanTeam || []).length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        Aún no se han registrado personas humanas en el equipo de este proveedor.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(formData.humanTeam || []).map(actor => {
                          const roleMeta = SUPPLIER_ACTOR_ROLES_INFO[actor.actorRole] || SUPPLIER_ACTOR_ROLES_INFO.director_tecnico_obtentor;
                          return (
                            <div
                              key={actor.id}
                              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                    {actor.name}
                                  </strong>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {roleMeta.label}
                                  </span>
                                  {actor.isAccessActive && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      ✉️ Usuario Activo + Notificación Email
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {actor.jobTitle} · Email: <strong>{actor.email || 'Sin email'}</strong> {actor.phone ? `· Tel: ${actor.phone}` : ''} {actor.dniOrMatricula ? `· Matrícula/DNI: ${actor.dniOrMatricula}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(actor.isAccessActive)}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      setFormData(prev => ({
                                        ...prev,
                                        humanTeam: (prev.humanTeam || []).map(a =>
                                          a.id === actor.id ? { ...a, isAccessActive: checked } : a
                                        )
                                      }));
                                    }}
                                    className="rounded text-emerald-600"
                                  />
                                  <span>Acceso Sistema</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      humanTeam: (prev.humanTeam || []).filter(a => a.id !== actor.id)
                                    }));
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="Quitar persona"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">
                  Homologación fitotécnica + Alta de usuarios del proveedor con notificación por email.
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    disabled={isSaving} 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-4 py-2 text-slate-400 font-bold uppercase hover:text-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold uppercase tracking-wider shadow flex items-center hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={16}/> : <Save className="mr-2" size={16}/>}
                    <span>{editingId ? 'Actualizar Ficha & Accesos' : 'Homologar & Notificar'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
