import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch, SeedMovement, BiologicalMaterialType, CAMPAIGNS, SupplierLotInspection, LotQualityGrade } from '../types';
import { DEMO_SUPPLIER_INSPECTIONS } from '../src/data/initialDemoData';
import { 
  ScanBarcode, Edit2, Trash2, Tag, Package, Truck, Printer, MapPin, 
  AlertCircle, DollarSign, Archive, Save, X, 
  Loader2, Search, Eye, Info, CheckCircle, Filter, FilterX, ArrowUpRight,
  Building, User, Calendar, FileText, Globe, ClipboardList, ShieldCheck, Warehouse,
  Plus, CheckCircle2, Navigation, Smartphone, UserCheck, Barcode, FlaskConical, Scale, ClipboardCheck,
  Map as MapIcon, Route, Compass, Weight, LayoutGrid, List, Droplets, Sparkles, Sprout,
  FileCheck, ShieldAlert, Layers, QrCode, Users, ChevronRight, Dna, Award
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TraceabilityLabelModal } from '../components/TraceabilityLabelModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

type MassUnit = 'gr' | 'kg' | 'tn';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

const MetricCard = ({ label, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start space-x-4">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600`}>
            <Icon size={22} />
        </div>
        <div>
            <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-mono font-black text-slate-800 dark:text-white leading-none">{value}</p>
            {subtext && <p className="text-[10px] font-mono text-slate-400 mt-1 font-semibold">{subtext}</p>}
        </div>
    </div>
);

export default function SeedBatches() {
  const { 
    seedBatches, seedMovements, addSeedBatch, updateSeedBatch, 
    deleteSeedBatch, addSeedMovement, updateSeedMovement, deleteSeedMovement, varieties, 
    currentUser, clients, storagePoints, suppliers, plots, usersList: users 
  } = useAppContext();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics' | 'inspections'>((searchParams.get('tab') as any) || 'inventory');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'batches' | 'warehouses'>('batches');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('variety') || '');
  const [filterStatus, setFilterStatus] = useState('');

  const addOneYearIso = (dateStr?: string) => {
    const base = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
    if (isNaN(base.getTime())) {
      const fallback = new Date();
      fallback.setFullYear(fallback.getFullYear() + 1);
      return fallback.toISOString().split('T')[0];
    }
    base.setFullYear(base.getFullYear() + 1);
    return base.toISOString().split('T')[0];
  };

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [labelBatch, setLabelBatch] = useState<SeedBatch | null>(null);
  const [showInlineActaCreator, setShowInlineActaCreator] = useState(false);
  const [qaModalBatch, setQaModalBatch] = useState<SeedBatch | null>(null);
  const [qaFormDraft, setQaFormDraft] = useState({
    varietyId: '',
    supplierId: '',
    lotNumber: '',
    guideOrRemitoNumber: '',
    date: new Date().toISOString().split('T')[0],
    breederGerminationPct: 90,
    coopGerminationPct: 92,
    purityPct: 99.8,
    moisturePct: 8.6,
    vigorScore: 9,
    verdict: 'APROBADO_CAMPO' as 'APROBADO_CAMPO' | 'EN_CUARENTENA_OBSERVADO' | 'RECHAZADO_DEVOLUCION',
    sampleCode: `MUE-ISTA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    samplerName: 'Matias QUINTANA',
    samplerDniOrMatricula: 'TEC-MUESTREO-ISTA-108',
    agronomistName: 'Ing. Agr. Julian PIZARRO',
    agronomistMatricula: 'MP-AGRO-1492 CH',
    observations: ''
  });
  const [newActaDraft, setNewActaDraft] = useState({
    varietyId: '',
    supplierId: '',
    lotNumber: '',
    guideOrRemitoNumber: '',
    date: new Date().toISOString().split('T')[0],
    germinationTestedPct: 90,
    purityPct: 100,
    moisturePct: 8.5,
    sampleCode: `MUE-ISTA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    samplerName: 'Matias QUINTANA',
    samplerDniOrMatricula: 'TEC-MUESTREO-ISTA-108',
    agronomistName: 'Ing. Agr. Julian PIZARRO',
    agronomistMatricula: 'MP-AGRO-1492 CH'
  });

  const [supplierInspections, setSupplierInspections] = useState<SupplierLotInspection[]>(() => {
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

  const saveInspectionsToStorage = (updated: SupplierLotInspection[]) => {
    setSupplierInspections(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_supplier_inspections', JSON.stringify(updated));
    }
  };
  
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<SeedBatch | null>(null);
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null);
  const [confirmDeleteMoveId, setConfirmDeleteMoveId] = useState<string | null>(null);

  const [entryUnit, setEntryUnit] = useState<MassUnit>('kg');
  const [moveUnit, setMoveUnit] = useState<MassUnit>('kg');

  const [batchFormData, setBatchFormData] = useState<any>({
    materialType: 'seed' as BiologicalMaterialType,
    varietyId: '', 
    supplierId: '', 
    batchCode: '', 
    initialQuantity: 0, 
    remainingQuantity: 0, 
    inputValue: 0, 
    purchaseDate: new Date().toISOString().split('T')[0], 
    pricePerKg: 0, 
    storagePointId: '', 
    isActive: false,
    qaStatus: 'PENDIENTE_QA',
    breederGerminationPct: 90,
    coopGerminationPct: undefined,
    labelSerialNumber: '', 
    category: 'C1', 
    certificationNumber: '', 
    gs1Code: '', 
    analysisDate: '', 
    germinationExpiryDate: addOneYearIso(new Date().toISOString().split('T')[0]),
    germination: 90, 
    purity: 99, 
    originPlotId: '',
    originInspectionId: '',
    parentSeedBatchId: '',
    qualityGrade: 'GRADO_A_SUPERIOR' as LotQualityGrade,
    qualityScore: 95,
    samplerName: 'Matias QUINTANA',
    samplerMatricula: 'TEC-MUESTREO-ISTA-108',
    sampleCode: '',
    inspectorName: 'Ing. Agr. Julian PIZARRO',
    inspectorMatricula: 'MP-AGRO-1492 CH',
    sowingResponsibleName: 'Matias QUINTANA',
    harvestResponsibleName: 'Ing. Agr. Julian PIZARRO',
    originCampaign: '2025/2026',
    harvestDate: '',
    moisturePct: 8.5,
    oilContentPct: 30,
    aflatoxinFreeCertificate: '',
    baleCount: 0,
    avgBaleWeightKg: 500,
    rettingQuality: 'Óptimo (Gris plateado)',
    hplcThcPct: 0.12,
    hplcCbgPct: 2.5,
    hplcLabCertificate: '',
    hurdGranulometry: 'Media (5-15 mm)',
    dustExtractionPct: 98,
    notes: ''
  });

  const [moveFormData, setMoveFormData] = useState<any>({
    batchId: '', clientId: '', targetLocationId: '', quantity: 0, inputValue: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
    transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
    routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';
  const isTech = currentUser?.role === 'technician';

  const convertToKg = (val: number, unit: MassUnit) => {
      const numericVal = Number(val) || 0;
      switch(unit) {
          case 'gr': return numericVal / 1000;
          case 'tn': return numericVal * 1000;
          default: return numericVal;
      }
  };

  const calculatedEntryKg = useMemo(() => convertToKg(batchFormData.inputValue || 0, entryUnit), [batchFormData.inputValue, entryUnit]);
  const calculatedMoveKg = useMemo(() => convertToKg(moveFormData.inputValue || 0, moveUnit), [moveFormData.inputValue, moveUnit]);

  const filteredBatches = useMemo(() => seedBatches.filter(b => {
      const v = varieties.find(v => v.id === b.varietyId);
      const sp = storagePoints.find(s => s.id === b.storagePointId);
      
      if (isClient && currentUser?.clientId) {
          if (sp?.clientId !== currentUser.clientId) return false;
      }
      if (isTech) {
          if (sp?.responsibleUserId !== currentUser?.id) return false;
      }

      const matchesSearch = b.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (v?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (b.labelSerialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (b.hplcLabCertificate || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMaterial = materialFilter === 'all' || 
                              (b.materialType || 'seed') === materialFilter;

      return matchesSearch && matchesMaterial;
  }), [seedBatches, searchTerm, materialFilter, varieties, isClient, isTech, currentUser, storagePoints]);

  const stockByWarehouse = useMemo(() => {
      const grouped: Record<string, { storage: any, items: Record<string, { remainingKg: number; initialKg: number }>, totalKg: number, totalInitialKg: number }> = {};

      filteredBatches.forEach(b => {
          const sp = storagePoints.find(s => s.id === b.storagePointId);
          const spId = sp ? sp.id : 'unknown';
          const varietyName = varieties.find(v => v.id === b.varietyId)?.name || 'Genética S/D';

          if (!grouped[spId]) {
              grouped[spId] = {
                  storage: sp,
                  items: {},
                  totalKg: 0,
                  totalInitialKg: 0
              };
          }

          if (!grouped[spId].items[varietyName]) {
              grouped[spId].items[varietyName] = { remainingKg: 0, initialKg: 0 };
          }

          grouped[spId].items[varietyName].remainingKg = Number((grouped[spId].items[varietyName].remainingKg + (b.remainingQuantity || 0)).toFixed(3));
          grouped[spId].items[varietyName].initialKg = Number((grouped[spId].items[varietyName].initialKg + (b.initialQuantity || 0)).toFixed(3));
          grouped[spId].totalKg = Number((grouped[spId].totalKg + (b.remainingQuantity || 0)).toFixed(3));
          grouped[spId].totalInitialKg = Number((grouped[spId].totalInitialKg + (b.initialQuantity || 0)).toFixed(3));
      });

      return Object.values(grouped);
  }, [filteredBatches, storagePoints, varieties]);

  const filteredMovements = useMemo(() => seedMovements.filter(m => {
      if (isClient && currentUser?.clientId) {
          if (m.clientId !== currentUser.clientId) return false;
      }
      if (isTech) {
          const sp = storagePoints.find(s => s.id === m.targetLocationId);
          if (sp?.responsibleUserId !== currentUser?.id) return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = (m.recipientName || '').toLowerCase().includes(term) || (m.transportGuideNumber || '').toLowerCase().includes(term);
      const matchesStatus = !filterStatus || m.status === filterStatus;
      return matchesSearch && matchesStatus;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [seedMovements, searchTerm, filterStatus, isClient, isTech, currentUser, storagePoints]);

  // Desglose de Métricas de Stock por Tipo Biológico y Matriz de Conciliación por Variedad
  const stats = useMemo(() => {
      const totalKg = Number(filteredBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(3));
      const seedKg = Number(filteredBatches.filter(b => (b.materialType || 'seed') === 'seed').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(3));
      const grainKg = Number(filteredBatches.filter(b => b.materialType === 'harvested_grain').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(3));
      const fiberBalesKg = Number(filteredBatches.filter(b => b.materialType === 'fiber_bales').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(3));
      const biomassKg = Number(filteredBatches.filter(b => b.materialType === 'biomass_cbg').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0).toFixed(3));
      const activeTransits = filteredMovements.filter(m => m.status === 'En Tránsito').length;
      return { totalKg, seedKg, grainKg, fiberBalesKg, biomassKg, activeTransits };
  }, [filteredBatches, filteredMovements]);

  const varietyReconciliation = useMemo(() => {
      const CENTRAL_STORAGE_ID = '5ceffc58-8219-4774-a340-9e1ac2c8458d'; // BioC Warehousing 1#
      const HILARIO_STORAGE_ID = '35ece4ca-6d58-496d-a045-65fe8c50a216'; // INTA HILARIO
      const LAREGINA_STORAGE_ID = 'fc1fedd0-1404-47a0-89d3-cc5d774ce848'; // Galpon La Regina
      const MADRYN_STORAGE_ID = 'f9235100-cd67-4f65-9ba1-303e7cc5a063'; // CAP Centro Medioambiental

      const seedOnlyBatches = seedBatches.filter(b => !b.materialType || b.materialType === 'seed');

      const rows = varieties.map(v => {
          const sup = suppliers.find(s => s.id === v.supplierId);
          const centralBatches = seedOnlyBatches.filter(b => b.varietyId === v.id && b.storagePointId === CENTRAL_STORAGE_ID);
          const hilarioBatches = seedOnlyBatches.filter(b => b.varietyId === v.id && b.storagePointId === HILARIO_STORAGE_ID);
          const lareginaBatches = seedOnlyBatches.filter(b => b.varietyId === v.id && b.storagePointId === LAREGINA_STORAGE_ID);
          const madrynBatches = seedOnlyBatches.filter(b => b.varietyId === v.id && b.storagePointId === MADRYN_STORAGE_ID);

          const purchasedKg = Number(centralBatches.reduce((s, b) => s + (b.initialQuantity || 0), 0).toFixed(3));
          const centralRemKg = Number(centralBatches.reduce((s, b) => s + (b.remainingQuantity || 0), 0).toFixed(3));

          const hilarioSentKg = Number(hilarioBatches.reduce((s, b) => s + (b.initialQuantity || 0), 0).toFixed(3));
          const hilarioRemKg = Number(hilarioBatches.reduce((s, b) => s + (b.remainingQuantity || 0), 0).toFixed(3));
          const hilarioUsedKg = Number(Math.max(0, hilarioSentKg - hilarioRemKg).toFixed(3));

          const lareginaSentKg = Number(lareginaBatches.reduce((s, b) => s + (b.initialQuantity || 0), 0).toFixed(3));
          const lareginaRemKg = Number(lareginaBatches.reduce((s, b) => s + (b.remainingQuantity || 0), 0).toFixed(3));
          const lareginaUsedKg = Number(Math.max(0, lareginaSentKg - lareginaRemKg).toFixed(3));

          const madrynSentKg = Number(madrynBatches.reduce((s, b) => s + (b.initialQuantity || 0), 0).toFixed(3));
          const madrynRemKg = Number(madrynBatches.reduce((s, b) => s + (b.remainingQuantity || 0), 0).toFixed(3));
          const madrynUsedKg = Number(Math.max(0, madrynSentKg - madrynRemKg).toFixed(3));

          const totalDispatchedKg = Number((hilarioSentKg + lareginaSentKg + madrynSentKg).toFixed(3));
          const totalUsedFieldKg = Number((hilarioUsedKg + lareginaUsedKg + madrynUsedKg).toFixed(3));
          const totalFieldRemKg = Number((hilarioRemKg + lareginaRemKg + madrynRemKg).toFixed(3));
          const totalAvailableKg = Number((centralRemKg + totalFieldRemKg).toFixed(3));

          return {
              varietyId: v.id,
              varietyName: v.name,
              supplierName: sup?.name || (v.name === 'Yuma' ? 'Ananda Pampa' : 'HEMPIT France'),
              purchasedKg,
              totalDispatchedKg,
              centralRemKg,
              hilarioSentKg,
              hilarioUsedKg,
              hilarioRemKg,
              lareginaSentKg,
              lareginaUsedKg,
              lareginaRemKg,
              madrynSentKg,
              madrynUsedKg,
              madrynRemKg,
              totalUsedFieldKg,
              totalFieldRemKg,
              totalAvailableKg
          };
      }).filter(r => r.purchasedKg > 0 || r.totalAvailableKg > 0 || r.totalDispatchedKg > 0);

      const totals = rows.reduce((acc, r) => ({
          purchasedKg: Number((acc.purchasedKg + r.purchasedKg).toFixed(3)),
          totalDispatchedKg: Number((acc.totalDispatchedKg + r.totalDispatchedKg).toFixed(3)),
          centralRemKg: Number((acc.centralRemKg + r.centralRemKg).toFixed(3)),
          hilarioSentKg: Number((acc.hilarioSentKg + r.hilarioSentKg).toFixed(3)),
          hilarioUsedKg: Number((acc.hilarioUsedKg + r.hilarioUsedKg).toFixed(3)),
          hilarioRemKg: Number((acc.hilarioRemKg + r.hilarioRemKg).toFixed(3)),
          lareginaSentKg: Number((acc.lareginaSentKg + r.lareginaSentKg).toFixed(3)),
          lareginaUsedKg: Number((acc.lareginaUsedKg + r.lareginaUsedKg).toFixed(3)),
          lareginaRemKg: Number((acc.lareginaRemKg + r.lareginaRemKg).toFixed(3)),
          madrynSentKg: Number((acc.madrynSentKg + r.madrynSentKg).toFixed(3)),
          madrynUsedKg: Number((acc.madrynUsedKg + r.madrynUsedKg).toFixed(3)),
          madrynRemKg: Number((acc.madrynRemKg + r.madrynRemKg).toFixed(3)),
          totalUsedFieldKg: Number((acc.totalUsedFieldKg + r.totalUsedFieldKg).toFixed(3)),
          totalFieldRemKg: Number((acc.totalFieldRemKg + r.totalFieldRemKg).toFixed(3)),
          totalAvailableKg: Number((acc.totalAvailableKg + r.totalAvailableKg).toFixed(3)),
      }), {
          purchasedKg: 0, totalDispatchedKg: 0, centralRemKg: 0,
          hilarioSentKg: 0, hilarioUsedKg: 0, hilarioRemKg: 0,
          lareginaSentKg: 0, lareginaUsedKg: 0, lareginaRemKg: 0,
          madrynSentKg: 0, madrynUsedKg: 0, madrynRemKg: 0,
          totalUsedFieldKg: 0, totalFieldRemKg: 0, totalAvailableKg: 0
      });

      return { rows, totals };
  }, [seedBatches, varieties, suppliers]);

  const handleOpenDispatch = () => {
    setMoveFormData({
      batchId: '', clientId: '', targetLocationId: '', quantity: 0, inputValue: 0, date: new Date().toISOString().split('T')[0], status: 'En Tránsito', transportType: 'Propio',
      transportGuideNumber: '', driverName: '', driverDni: '', vehiclePlate: '', transportCompany: '', recipientName: '', recipientDni: '',
      routeItinerary: '', estimatedDistanceKm: 0, routeGoogleLink: '', dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    });
    setMoveUnit('kg');
    setIsMoveModalOpen(true);
  };

  const handleOpenView = (batch: SeedBatch) => {
    setSelectedBatch(batch);
    setIsViewModalOpen(true);
  };

  const openCoopQaModal = (batch: SeedBatch) => {
    const matchedInsp = supplierInspections.find(i =>
      i.id === batch.originInspectionId ||
      i.seedBatchId === batch.id ||
      batch.batchCode.toUpperCase() === i.lotNumber.toUpperCase()
    );
    const v = varieties.find(va => va.id === batch.varietyId);
    const supId = batch.supplierId || v?.supplierId || suppliers[0]?.id || '';
    const breederPg = batch.breederGerminationPct || matchedInsp?.germinationDeclaredPct || batch.germination || 90;
    const coopPg = batch.coopGerminationPct || matchedInsp?.germinationTestedPct || batch.germination || 92;

    setQaModalBatch(batch);
    setQaFormDraft({
      varietyId: batch.varietyId || matchedInsp?.varietyId || '',
      supplierId: supId,
      lotNumber: batch.batchCode,
      guideOrRemitoNumber: matchedInsp?.guideOrRemitoNumber || batch.certificationNumber || `INASE-${batch.batchCode}`,
      date: new Date().toISOString().split('T')[0],
      breederGerminationPct: Number(breederPg),
      coopGerminationPct: Number(coopPg),
      purityPct: Number(batch.purity || matchedInsp?.purityPct || 99.8),
      moisturePct: Number(batch.moisturePct || matchedInsp?.moisturePct || 8.6),
      vigorScore: Number(matchedInsp?.vigorScore || 9),
      verdict: 'APROBADO_CAMPO',
      sampleCode: batch.sampleCode || matchedInsp?.sampleCode || `MUE-ISTA-${batch.batchCode}`,
      samplerName: batch.samplerName || matchedInsp?.samplerName || 'Matias QUINTANA',
      samplerDniOrMatricula: batch.samplerMatricula || matchedInsp?.samplerDniOrMatricula || 'TEC-MUESTREO-ISTA-108',
      agronomistName: batch.inspectorName || matchedInsp?.agronomistName || 'Ing. Agr. Julian PIZARRO',
      agronomistMatricula: batch.inspectorMatricula || matchedInsp?.agronomistMatricula || 'MP-AGRO-1492 CH',
      observations: matchedInsp?.observations || ''
    });
  };

  const handleSaveCoopQaAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaModalBatch) return;
    if (!qaFormDraft.varietyId) {
      alert('Por favor seleccione la Genética / Cultivar que pasó la inspección.');
      return;
    }

    setIsSubmitting(true);
    try {
      const v = varieties.find(va => va.id === qaFormDraft.varietyId);
      const supId = qaFormDraft.supplierId || qaModalBatch.supplierId || v?.supplierId || suppliers[0]?.id || '';
      const sup = suppliers.find(s => s.id === supId);
      const cleanLot = (qaFormDraft.lotNumber || qaModalBatch.batchCode).trim().toUpperCase();
      const breederPg = Number(qaFormDraft.breederGerminationPct) || 90;
      const coopPg = Number(qaFormDraft.coopGerminationPct) || 92;
      const purity = Number(qaFormDraft.purityPct) || 99.5;
      const grade: LotQualityGrade =
        qaFormDraft.verdict === 'RECHAZADO_DEVOLUCION'
          ? 'NO_CONFORME'
          : coopPg >= 90 && purity >= 98.5
          ? 'GRADO_A_SUPERIOR'
          : coopPg >= 80
          ? 'GRADO_B_ESTANDAR'
          : 'GRADO_C_CONDICIONAL';
      const score =
        qaFormDraft.verdict === 'RECHAZADO_DEVOLUCION'
          ? 45
          : coopPg >= 90 && purity >= 98.5
          ? 96
          : coopPg >= 80
          ? 86
          : 75;
      const isApprovedForStockActivo = qaFormDraft.verdict === 'APROBADO_CAMPO' && grade !== 'NO_CONFORME';

      const existingInsp = supplierInspections.find(
        i => i.id === qaModalBatch.originInspectionId || i.seedBatchId === qaModalBatch.id || i.lotNumber.toUpperCase() === cleanLot
      );
      const actaId = existingInsp?.id || `insp-qa-${Date.now()}`;

      const emittedActa: SupplierLotInspection = {
        id: actaId,
        supplierId: supId,
        supplierName: sup?.name || 'Semillero Homologado',
        date: qaFormDraft.date || new Date().toISOString().split('T')[0],
        inputCategory: 'Semilla C1/C2',
        lotNumber: cleanLot,
        guideOrRemitoNumber: qaFormDraft.guideOrRemitoNumber.trim() || undefined,
        germinationDeclaredPct: breederPg,
        germinationTestedPct: coopPg,
        purityPct: purity,
        moisturePct: Number(qaFormDraft.moisturePct) || 8.5,
        vigorScore: Number(qaFormDraft.vigorScore) || 9,
        weedSeedsFound: false,
        pathogenScreeningResult: 'Negativo (Conforme)',
        residueStatus: 'Cero Residuos / Orgánico',
        qualityGrade: grade,
        qualityScore: score,
        verdict: qaFormDraft.verdict,
        varietyId: v?.id || qaFormDraft.varietyId,
        varietyName: v?.name || 'Genética Homologada',
        seedBatchId: qaModalBatch.id,
        initialQuantityKg: qaModalBatch.initialQuantity,
        storagePointId: qaModalBatch.storagePointId,
        sampleCode: qaFormDraft.sampleCode.trim() || `MUE-ISTA-${cleanLot}`,
        samplingDate: qaFormDraft.date || new Date().toISOString().split('T')[0],
        samplingMethod: 'Calador ISTA Compuesto (3 Submuestras Precintadas)',
        samplerName: qaFormDraft.samplerName.trim() || 'Matias QUINTANA',
        samplerDniOrMatricula: qaFormDraft.samplerDniOrMatricula.trim() || 'TEC-MUESTREO-ISTA-108',
        agronomistName: qaFormDraft.agronomistName.trim() || 'Ing. Agr. Julian PIZARRO',
        agronomistMatricula: qaFormDraft.agronomistMatricula.trim() || 'MP-AGRO-1492 CH',
        receptionResponsibleName: currentUser?.name || 'Gastón BAREA M.',
        observations:
          qaFormDraft.observations.trim() ||
          `2° PG Cooperativa QA (${coopPg}%) contrastado con PG Obtentor (${breederPg}%). Acta vinculada a la variedad genética ${v?.name || ''}.`,
        createdAt: existingInsp?.createdAt || new Date().toISOString()
      };

      const nextInspections = existingInsp
        ? supplierInspections.map(i => (i.id === existingInsp.id ? emittedActa : i))
        : [emittedActa, ...supplierInspections];
      saveInspectionsToStorage(nextInspections);

      const updatedBatch: SeedBatch = {
        ...qaModalBatch,
        varietyId: v?.id || qaFormDraft.varietyId,
        supplierId: supId,
        batchCode: cleanLot,
        breederGerminationPct: breederPg,
        coopGerminationPct: coopPg,
        germination: coopPg,
        purity,
        moisturePct: Number(qaFormDraft.moisturePct) || 8.5,
        analysisDate: qaFormDraft.date,
        originInspectionId: actaId,
        qualityGrade: grade,
        qualityScore: score,
        sampleCode: emittedActa.sampleCode,
        samplerName: emittedActa.samplerName,
        samplerMatricula: emittedActa.samplerDniOrMatricula,
        inspectorName: emittedActa.agronomistName,
        inspectorMatricula: emittedActa.agronomistMatricula,
        qaStatus: isApprovedForStockActivo ? 'APROBADO_QA' : 'OBSERVADO_QA',
        isActive: isApprovedForStockActivo
      };

      await updateSeedBatch(updatedBatch);
      setQaModalBatch(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInlineActa = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newActaDraft.varietyId || !newActaDraft.lotNumber.trim()) {
      alert('Por favor seleccione la Genética inspeccionada e indique el N° de Lote / Acta.');
      return;
    }
    const v = varieties.find(va => va.id === newActaDraft.varietyId);
    const supId = newActaDraft.supplierId || v?.supplierId || suppliers[0]?.id || '';
    const sup = suppliers.find(s => s.id === supId);
    const cleanLot = newActaDraft.lotNumber.trim().toUpperCase();
    const pg = Number(newActaDraft.germinationTestedPct) || 90;
    const purity = Number(newActaDraft.purityPct) || 99;
    const grade: LotQualityGrade = pg >= 90 && purity >= 98.5 ? 'GRADO_A_SUPERIOR' : pg >= 80 ? 'GRADO_B_ESTANDAR' : 'GRADO_C_CONDICIONAL';
    const score = pg >= 90 && purity >= 98.5 ? 96 : pg >= 80 ? 86 : 75;

    const createdActa: SupplierLotInspection = {
      id: `insp-${Date.now()}`,
      supplierId: supId,
      supplierName: sup?.name || 'Semillero Homologado',
      date: newActaDraft.date || new Date().toISOString().split('T')[0],
      inputCategory: 'Semilla C1/C2',
      lotNumber: cleanLot,
      guideOrRemitoNumber: newActaDraft.guideOrRemitoNumber.trim() || undefined,
      germinationDeclaredPct: Number(batchFormData.breederGerminationPct || batchFormData.germination || 90),
      germinationTestedPct: pg,
      purityPct: purity,
      moisturePct: Number(newActaDraft.moisturePct) || 8.5,
      vigorScore: 9,
      weedSeedsFound: false,
      pathogenScreeningResult: 'Negativo (Conforme)',
      residueStatus: 'Cero Residuos / Orgánico',
      qualityGrade: grade,
      qualityScore: score,
      verdict: 'APROBADO_CAMPO',
      varietyId: v?.id || newActaDraft.varietyId,
      varietyName: v?.name || 'Genética Homologada',
      sampleCode: newActaDraft.sampleCode.trim() || `MUE-ISTA-${cleanLot}`,
      samplingDate: newActaDraft.date || new Date().toISOString().split('T')[0],
      samplingMethod: 'Calador ISTA Compuesto (3 Submuestras Precintadas)',
      samplerName: newActaDraft.samplerName.trim() || 'Matias QUINTANA',
      samplerDniOrMatricula: newActaDraft.samplerDniOrMatricula.trim() || 'TEC-MUESTREO-ISTA-108',
      agronomistName: newActaDraft.agronomistName.trim() || 'Ing. Agr. Julian PIZARRO',
      agronomistMatricula: newActaDraft.agronomistMatricula.trim() || 'MP-AGRO-1492 CH',
      receptionResponsibleName: currentUser?.name || 'Gastón BAREA M.',
      observations: `Acta de recepción e inspección técnica emitida para la genética ${v?.name || ''} (Lote ${cleanLot}).`,
      createdAt: new Date().toISOString()
    };

    const updatedList = [createdActa, ...supplierInspections];
    saveInspectionsToStorage(updatedList);

    setBatchFormData((prev: any) => ({
      ...prev,
      originInspectionId: createdActa.id,
      varietyId: createdActa.varietyId || prev.varietyId,
      supplierId: createdActa.supplierId || prev.supplierId,
      batchCode: prev.batchCode || createdActa.lotNumber,
      coopGerminationPct: createdActa.germinationTestedPct || 90,
      germination: createdActa.germinationTestedPct || 90,
      purity: createdActa.purityPct || 100,
      moisturePct: createdActa.moisturePct || 8.5,
      analysisDate: createdActa.date,
      qualityGrade: createdActa.qualityGrade || 'GRADO_A_SUPERIOR',
      qualityScore: createdActa.qualityScore || 96,
      sampleCode: createdActa.sampleCode || `MUE-${createdActa.lotNumber}`,
      samplerName: createdActa.samplerName || 'Matias QUINTANA',
      samplerMatricula: createdActa.samplerDniOrMatricula || 'TEC-MUESTREO-ISTA-108',
      inspectorName: createdActa.agronomistName || 'Ing. Agr. Julian PIZARRO',
      inspectorMatricula: createdActa.agronomistMatricula || 'MP-AGRO-1492 CH',
      qaStatus: 'APROBADO_QA',
      isActive: true
    }));

    setShowInlineActaCreator(false);
  };

  const handleBatchSubmit = async (e: React.FormEvent, openQaModalAfterSave = false) => {
      e.preventDefault();
      const isSeedMaterial = (batchFormData.materialType || 'seed') === 'seed';
      if (!batchFormData.varietyId || !batchFormData.batchCode || !batchFormData.storagePointId || (calculatedEntryKg <= 0.000001 && !editingBatchId) || isSubmitting) {
          alert("Por favor complete: 1) Proveedor y Galpón de Almacenamiento, 2) Variedad Genética, Fecha de Alta y Vencimiento, Código de Lote y Masa mayor a 0.");
          return;
      }
      setIsSubmitting(true);
      try {
          const { inputValue, ...baseData } = batchFormData;
          const selectedVar = varieties.find(v => v.id === batchFormData.varietyId);
          const breederPg = Number(batchFormData.breederGerminationPct ?? batchFormData.germination ?? 90);
          const hasCompletedCoopQa = Boolean(
            editingBatchId
              ? batchFormData.isActive
              : !isSeedMaterial || (batchFormData.originInspectionId && batchFormData.qaStatus === 'APROBADO_QA')
          );

          const payload: SeedBatch = { 
            ...baseData, 
            id: editingBatchId || generateId(), 
            supplierId: batchFormData.supplierId || selectedVar?.supplierId,
            breederGerminationPct: isSeedMaterial ? breederPg : undefined,
            coopGerminationPct: isSeedMaterial ? batchFormData.coopGerminationPct : undefined,
            germination: isSeedMaterial ? Number(batchFormData.coopGerminationPct || breederPg) : Number(batchFormData.germination || 90),
            germinationExpiryDate: batchFormData.germinationExpiryDate || addOneYearIso(batchFormData.purchaseDate),
            initialQuantity: Number(calculatedEntryKg.toFixed(3)),
            remainingQuantity: editingBatchId 
                ? Number(Number(batchFormData.remainingQuantity || 0).toFixed(3)) 
                : Number(calculatedEntryKg.toFixed(3)), 
            pricePerKg: Number(batchFormData.pricePerKg || 0), 
            qaStatus: isSeedMaterial ? (hasCompletedCoopQa ? 'APROBADO_QA' : 'PENDIENTE_QA') : 'APROBADO_QA',
            isActive: hasCompletedCoopQa, 
            createdAt: batchFormData.createdAt || new Date().toISOString() 
          };
          
          let success = editingBatchId ? await updateSeedBatch(payload) : await addSeedBatch(payload);
          if (success) { 
              setIsBatchModalOpen(false); 
              setEditingBatchId(null); 
              if (openQaModalAfterSave && isSeedMaterial) {
                openCoopQaModal(payload);
              }
          }
      } finally { setIsSubmitting(false); }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!moveFormData.batchId || !moveFormData.targetLocationId || calculatedMoveKg <= 0.000001 || isSubmitting) {
          alert("Por favor complete los datos obligatorios del despacho.");
          return;
      }

      const sourceBatch = seedBatches.find(b => b.id === moveFormData.batchId);
      if (!sourceBatch) return;

      const usage = calculatedMoveKg;
      if (sourceBatch.remainingQuantity < usage) {
          alert(`Stock insuficiente en el lote de origen. Disponible: ${sourceBatch.remainingQuantity.toFixed(3)} kg.`);
          return;
      }

      setIsSubmitting(true);
      try {
          const movePayload: SeedMovement = {
              ...moveFormData,
              id: generateId(),
              quantity: Number(usage.toFixed(3)),
              originStorageId: sourceBatch.storagePointId,
              status: 'En Tránsito'
          };

          const moveSuccess = await addSeedMovement(movePayload);
          if (moveSuccess) {
              const updatedRemaining = Number((sourceBatch.remainingQuantity - usage).toFixed(3));
              await updateSeedBatch({
                  ...sourceBatch,
                  remainingQuantity: Math.max(0, updatedRemaining)
              });
              
              setIsMoveModalOpen(false);
              alert(`✅ Despacho registrado con Guía oficial. Se han descontado ${usage.toFixed(3)} kg del lote.`);
          }
      } catch (err) {
          alert("Error de comunicación logística.");
      } finally { setIsSubmitting(false); }
  };

  const getMaterialLabel = (type?: BiologicalMaterialType) => {
    switch(type) {
      case 'harvested_grain': return { label: 'Grano Acopiado', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300' };
      case 'fiber_bales': return { label: 'Fardos Fibra Tech', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300' };
      case 'biomass_cbg': return { label: 'Biomasa CBG (HPLC)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' };
      case 'hurds': return { label: 'Cañamiza / Hurds', color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300' };
      default: return { label: 'Semilla Fiscalizada', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300' };
    }
  };

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all";
  const labelClass = "text-[9px] font-mono font-black uppercase text-slate-500 ml-1 mb-1 block tracking-wider";

  const destinationStorages = useMemo(() => {
      if (!moveFormData.clientId || moveFormData.clientId === 'INTERNAL') return storagePoints.filter(sp => !sp.clientId);
      return storagePoints.filter(sp => sp.clientId === moveFormData.clientId);
  }, [moveFormData.clientId, storagePoints]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-20">
      
      {/* HEADER DE INVENTARIO BIOLÓGICO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm font-mono">
        <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Cadena de Custodia & Almacenamiento
              </span>
              <span className="text-xs font-mono text-slate-400">· INASE / GACP / SENASA</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 flex items-center gap-2.5">
              <Package className="text-emerald-500" size={28}/> 
              <span>Inventario Biológico & Derivados Industriales</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Trazabilidad integral: 1° Ingreso a Galpón con PG Obtentor ➔ 2° Variedad Genética y Vto. Manual (1 Año) ➔ 3° PG Cooperativa QA + Acta = Stock Activo.
            </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button 
                type="button"
                onClick={() => navigate('/suppliers?tab=inspections&newInspection=1')} 
                className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-purple-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
                title="Ir al Área Oficial de Emisión de Actas de Inspección de Recepción & Calidad (Proveedores & Laboratorio)"
              >
                <ClipboardCheck size={15} /> 
                <span>Emitir Acta QA</span>
              </button>
              <button 
                type="button"
                onClick={() => setIsScannerModalOpen(true)} 
                className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
                title="Escanear con lector láser o QR"
              >
                <ScanBarcode size={15} /> 
                <span>Escanear Lote</span>
              </button>
              <button 
                type="button"
                onClick={handleOpenDispatch} 
                className="bg-sky-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-sky-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <ArrowUpRight size={15} /> 
                <span>Despachar Carga</span>
              </button>
              <button 
                type="button"
                onClick={() => { 
                  const todayIso = new Date().toISOString().split('T')[0];
                  setEditingBatchId(null); 
                  setEntryUnit('kg'); 
                  setShowInlineActaCreator(false);
                  setBatchFormData({ 
                    materialType: 'seed',
                    varietyId: '', 
                    supplierId: suppliers[0]?.id || '', 
                    batchCode: '', 
                    initialQuantity: 0, 
                    inputValue: 0, 
                    purchaseDate: todayIso, 
                    germinationExpiryDate: addOneYearIso(todayIso),
                    pricePerKg: 0, 
                    storagePointId: storagePoints[0]?.id || '', 
                    isActive: false,
                    qaStatus: 'PENDIENTE_QA',
                    breederGerminationPct: 90,
                    coopGerminationPct: undefined,
                    labelSerialNumber: '00000012',
                    certificationNumber: '',
                    category: 'C1',
                    germination: 90,
                    purity: 99.8,
                    originInspectionId: '',
                    originCampaign: '2025/2026'
                  }); 
                  setIsBatchModalOpen(true); 
                }} 
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <Plus size={15} /> 
                <span>Nuevo Lote Biológico</span>
              </button>
          </div>
        )}
      </div>

      {/* METRIC CARDS POR TIPO BIOLÓGICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Semilla Disponible (Red)" 
            value={`${stats.seedKg.toLocaleString('es-AR', {minimumFractionDigits: 3, maximumFractionDigits: 3})} kg`} 
            subtext={`Compra: ${varietyReconciliation.totals.purchasedKg.toFixed(1)} kg · Sembrado: ${varietyReconciliation.totals.totalUsedFieldKg.toFixed(3)} kg`}
            icon={Sprout} 
            colorClass="bg-blue-500" 
          />
          <MetricCard 
            label="Grano Acopiado" 
            value={`${(stats.grainKg / 1000).toFixed(1)} Tn`} 
            subtext="Grado Alimento / Hum. <9%"
            icon={Package} 
            colorClass="bg-amber-500" 
          />
          <MetricCard 
            label="Fardos Fibra / Paja" 
            value={`${(stats.fiberBalesKg / 1000).toFixed(1)} Tn`} 
            subtext="Enriado Óptimo en Playa"
            icon={Layers} 
            colorClass="bg-purple-500" 
          />
          <MetricCard 
            label="Biomasa CBG / CoA" 
            value={`${stats.biomassKg.toLocaleString()} kg`} 
            subtext="THC <0.04% Protocolo HPLC"
            icon={FlaskConical} 
            colorClass="bg-emerald-500" 
          />
      </div>

      {/* BARRA DE FILTROS & BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 font-mono">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              
              {/* PESTAÑAS PRINCIPALES */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold uppercase w-full lg:w-auto overflow-x-auto">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('inventory')} 
                    className={`px-4 py-2 rounded-xl transition ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    1. Stock en Nodos ({filteredBatches.length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('logistics')} 
                    className={`px-4 py-2 rounded-xl transition ${activeTab === 'logistics' ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    2. Guías de Tránsito & Remitos ({filteredMovements.length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('inspections')} 
                    className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${activeTab === 'inspections' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-purple-600'}`}
                  >
                    <ClipboardCheck size={14} />
                    <span>3. Actas de Inspección & Calidad INASE ({supplierInspections.length})</span>
                  </button>
              </div>

              {/* BUSCADOR */}
              <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                  <input 
                    type="text" 
                    placeholder="Buscar lote, rótulo o genética..." 
                    className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white font-mono" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
              </div>
          </div>

          {/* SUB-FILTRO POR CATEGORÍA BIOLÓGICA (SOLO EN INVENTARIO) */}
          {activeTab === 'inventory' && (
            <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto text-[11px]">
              <span className="text-slate-400 uppercase font-bold text-[10px] mr-1">Filtro Material:</span>
              <button
                type="button"
                onClick={() => setMaterialFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                  materialFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({seedBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter('seed')}
                className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                  materialFilter === 'seed' ? 'bg-blue-600 text-white' : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50'
                }`}
              >
                Semilla Fiscalizada
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter('harvested_grain')}
                className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                  materialFilter === 'harvested_grain' ? 'bg-amber-600 text-white' : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50'
                }`}
              >
                Grano Acopiado
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter('fiber_bales')}
                className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                  materialFilter === 'fiber_bales' ? 'bg-purple-600 text-white' : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50'
                }`}
              >
                Fardos Fibra
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter('biomass_cbg')}
                className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                  materialFilter === 'biomass_cbg' ? 'bg-emerald-600 text-white' : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                }`}
              >
                Biomasa CBG (CoA)
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter('hurds')}
                className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                  materialFilter === 'hurds' ? 'bg-sky-600 text-white' : 'text-sky-700 dark:text-sky-300 hover:bg-sky-50'
                }`}
              >
                Cañamiza (Hurds)
              </button>
            </div>
          )}
      </div>

      {/* CONTENIDO TAB 1: INVENTARIO BIOLÓGICO */}
      {activeTab === 'inventory' ? (
          <div className="space-y-5 font-mono">
              {/* MATRIZ DE CONCILIACIÓN AUDITADA POR VARIEDAD Y ESTABLECIMIENTO (CAMPAÑA 25/26) */}
              {!isClient && varietyReconciliation.rows.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Auditoría & Conciliación Real de Semillas · Campaña 2025/2026</span>
                      </span>
                      <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                        Balance por Variedad, Proveedor y Establecimiento (Compras vs. Envíos vs. Siembra vs. Remanente)
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        Compra Total: <strong>{varietyReconciliation.totals.purchasedKg.toFixed(3)} kg</strong> (6 kg Ananda + 3 kg HEMPIT)
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300">
                        Enviado a Campos: <strong>{varietyReconciliation.totals.totalDispatchedKg.toFixed(3)} kg</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white shadow-xs">
                        Stock Total Disponible: <strong>{varietyReconciliation.totals.totalAvailableKg.toFixed(3)} kg</strong>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[11px] text-left tabular-nums">
                      <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase text-[9px] font-black border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Variedad & Proveedor</th>
                          <th className="px-3 py-3 text-right">Compra Inicial</th>
                          <th className="px-3 py-3 text-right bg-slate-100/70 dark:bg-slate-800/40">Planta Central (Trelew)</th>
                          <th className="px-3 py-3 text-right bg-amber-50/50 dark:bg-amber-950/20">INTA Hilario Ascasubi (12 Parc.)</th>
                          <th className="px-3 py-3 text-right bg-purple-50/50 dark:bg-purple-950/20">Chacra La Regina (12 Parc.)</th>
                          <th className="px-3 py-3 text-right bg-sky-50/50 dark:bg-sky-950/20">CAP Puerto Madryn (30 Parc.)</th>
                          <th className="px-3 py-3 text-right">Total Sembrado</th>
                          <th className="px-4 py-3 text-right bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">Stock Disponible Hoy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                        {varietyReconciliation.rows.map(row => (
                          <tr key={row.varietyId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <div className="font-black text-slate-900 dark:text-white uppercase">{row.varietyName}</div>
                              <div className="text-[9px] text-slate-400 font-normal">{row.supplierName}</div>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-800 dark:text-slate-200">
                              <div>{row.purchasedKg.toFixed(3)} kg</div>
                              <div className="text-[9px] text-slate-400 font-normal">{Math.round(row.purchasedKg * 1000)} gr</div>
                            </td>
                            <td className="px-3 py-3 text-right bg-slate-50/60 dark:bg-slate-800/20">
                              <div className="text-slate-900 dark:text-white font-black">{row.centralRemKg.toFixed(3)} kg</div>
                              <div className="text-[9px] text-slate-400 font-normal">
                                {Math.round(row.centralRemKg * 1000)} gr en BioC #1
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right bg-amber-50/20 dark:bg-amber-950/10">
                              <div className="text-amber-700 dark:text-amber-300 font-black">
                                Quedan {row.hilarioRemKg.toFixed(3)} kg ({Math.round(row.hilarioRemKg * 1000)} gr)
                              </div>
                              <div className="text-[9px] text-slate-500 font-normal">
                                Env: {row.hilarioSentKg.toFixed(3)} kg · Usado: {row.hilarioUsedKg.toFixed(3)} kg
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right bg-purple-50/20 dark:bg-purple-950/10">
                              <div className="text-purple-700 dark:text-purple-300 font-black">
                                Quedan {row.lareginaRemKg.toFixed(3)} kg (0 gr)
                              </div>
                              <div className="text-[9px] text-slate-500 font-normal">
                                Env: {row.lareginaSentKg.toFixed(3)} kg · Usado: 100% ({Math.round(row.lareginaUsedKg * 1000)} gr)
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right bg-sky-50/20 dark:bg-sky-950/10">
                              <div className="text-sky-700 dark:text-sky-300 font-black">
                                Quedan {row.madrynRemKg.toFixed(3)} kg ({Math.round(row.madrynRemKg * 1000)} gr)
                              </div>
                              <div className="text-[9px] text-slate-500 font-normal">
                                Env: {row.madrynSentKg.toFixed(3)} kg · Usado: {row.madrynUsedKg.toFixed(3)} kg
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                              <div>{row.totalUsedFieldKg.toFixed(3)} kg</div>
                              <div className="text-[9px] text-slate-400 font-normal">{Math.round(row.totalUsedFieldKg * 1000)} gr</div>
                            </td>
                            <td className="px-4 py-3 text-right bg-emerald-50/40 dark:bg-emerald-950/20">
                              <div className="text-emerald-700 dark:text-emerald-300 font-black text-xs">
                                {row.totalAvailableKg.toFixed(3)} kg ({Math.round(row.totalAvailableKg * 1000)} gr)
                              </div>
                              <div className="text-[9px] text-emerald-600/80 font-normal">
                                Central {row.centralRemKg.toFixed(3)} + Campos {row.totalFieldRemKg.toFixed(3)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-900 text-white text-[10px] font-black uppercase">
                        <tr>
                          <td className="px-4 py-3">TOTAL CONCILIADO CAMPAÑA 25/26</td>
                          <td className="px-3 py-3 text-right">{varietyReconciliation.totals.purchasedKg.toFixed(3)} kg</td>
                          <td className="px-3 py-3 text-right text-emerald-300">{varietyReconciliation.totals.centralRemKg.toFixed(3)} kg</td>
                          <td className="px-3 py-3 text-right text-amber-300">
                            {varietyReconciliation.totals.hilarioRemKg.toFixed(3)} kg (Env: {varietyReconciliation.totals.hilarioSentKg.toFixed(3)} / Uso: {varietyReconciliation.totals.hilarioUsedKg.toFixed(3)})
                          </td>
                          <td className="px-3 py-3 text-right text-purple-300">
                            {varietyReconciliation.totals.lareginaRemKg.toFixed(3)} kg (Env: {varietyReconciliation.totals.lareginaSentKg.toFixed(3)} / Uso: {varietyReconciliation.totals.lareginaUsedKg.toFixed(3)})
                          </td>
                          <td className="px-3 py-3 text-right text-sky-300">
                            {varietyReconciliation.totals.madrynRemKg.toFixed(3)} kg (Env: {varietyReconciliation.totals.madrynSentKg.toFixed(3)} / Uso: {varietyReconciliation.totals.madrynUsedKg.toFixed(3)})
                          </td>
                          <td className="px-3 py-3 text-right">{varietyReconciliation.totals.totalUsedFieldKg.toFixed(3)} kg</td>
                          <td className="px-4 py-3 text-right text-emerald-400 text-xs">
                            {varietyReconciliation.totals.totalAvailableKg.toFixed(3)} kg ({Math.round(varietyReconciliation.totals.totalAvailableKg * 1000)} gr)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">
                    Mostrando <strong>{filteredBatches.length}</strong> lotes biológicos activos en red
                  </span>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 flex">
                      <button onClick={() => setViewMode('batches')} className={`p-1.5 rounded-lg transition ${viewMode === 'batches' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'text-slate-400'}`} title="Vista Lista"><List size={16}/></button>
                      <button onClick={() => setViewMode('warehouses')} className={`p-1.5 rounded-lg transition ${viewMode === 'warehouses' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'text-slate-400'}`} title="Vista Almacén"><LayoutGrid size={16}/></button>
                  </div>
              </div>

              {viewMode === 'batches' ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden overflow-x-auto">
                      <table className="min-w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase text-[9px] font-black tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                  <th className="px-6 py-4">Lote & Calidad Homologada</th>
                                  <th className="px-6 py-4">Genética & Circuito Trazabilidad</th>
                                  <th className="px-6 py-4">Nodo de Custodia</th>
                                  <th className="px-6 py-4">Parámetros & Personal Interviniente</th>
                                  <th className="px-6 py-4 text-right">Ingreso Inicial</th>
                                  <th className="px-6 py-4 text-right">Stock Remanente</th>
                                  <th className="px-6 py-4 text-right">Acción & QR</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                              {filteredBatches.length === 0 ? (
                                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No se hallaron materiales biológicos con los filtros seleccionados.</td></tr>
                              ) : filteredBatches.map(batch => {
                                  const v = varieties.find(v => v.id === batch.varietyId);
                                  const sp = storagePoints.find(s => s.id === batch.storagePointId);
                                  const matMeta = getMaterialLabel(batch.materialType);
                                  const displayQty = Number((batch.remainingQuantity || 0).toFixed(3));
                                  const initialQty = Number((batch.initialQuantity || 0).toFixed(3));
                                  const matchedInsp = supplierInspections.find(i =>
                                    i.id === batch.originInspectionId ||
                                    i.seedBatchId === batch.id ||
                                    batch.batchCode.toUpperCase().includes(i.lotNumber.toUpperCase())
                                  );
                                  const qGrade = batch.qualityGrade || matchedInsp?.qualityGrade || 'GRADO_A_SUPERIOR';
                                  const linkedPlotsCount = plots.filter(p => p.seedBatchId === batch.id).length;
                                  const originPlot = batch.originPlotId ? plots.find(p => p.id === batch.originPlotId) : undefined;

                                  return (
                                      <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition group">
                                          <td className="px-6 py-4">
                                              <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{batch.batchCode}</div>
                                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${matMeta.color}`}>
                                                  {matMeta.label}
                                                </span>
                                                {(!batch.materialType || batch.materialType === 'seed') && (
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                                                    batch.isActive
                                                      ? 'bg-emerald-600 text-white border-emerald-700'
                                                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                                  }`}>
                                                    {batch.isActive
                                                      ? '● STOCK ACTIVO · QA COOPERATIVA OK'
                                                      : '⏳ EN GALPÓN · PENDIENTE 2° PG COOPERATIVA (QA)'}
                                                  </span>
                                                )}
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                                                  qGrade === 'GRADO_A_SUPERIOR'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : qGrade === 'GRADO_B_ESTANDAR'
                                                    ? 'bg-sky-50 text-sky-700 border-sky-300'
                                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                                }`}>
                                                  {qGrade === 'GRADO_A_SUPERIOR' ? 'Grado A Élite' : qGrade === 'GRADO_B_ESTANDAR' ? 'Grado B' : 'Grado C'}
                                                </span>
                                                {batch.labelSerialNumber && (
                                                  <span className="text-[9px] text-slate-400">Rót: {batch.labelSerialNumber}</span>
                                                )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-slate-800 dark:text-slate-200">{v?.name || 'S/D'}</div>
                                              <div className="text-[9px] text-slate-400">
                                                {v?.usage || 'Fibra'} · {v?.breederCountry || 'ARG'}
                                                {batch.purchaseDate ? ` · Alta: ${batch.purchaseDate}` : ''}
                                                {batch.germinationExpiryDate ? ` · Vto: ${batch.germinationExpiryDate}` : ''}
                                              </div>
                                              <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px]">
                                                {matchedInsp && (
                                                  <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                                    Acta QA: {matchedInsp.lotNumber}
                                                  </span>
                                                )}
                                                {(!batch.materialType || batch.materialType === 'seed') && linkedPlotsCount > 0 && (
                                                  <span className="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                                                    {linkedPlotsCount} Parcelas Sembradas
                                                  </span>
                                                )}
                                                {originPlot && (
                                                  <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                    Origen: {originPlot.name}
                                                  </span>
                                                )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="text-slate-700 dark:text-slate-300 uppercase truncate max-w-[180px]">{sp?.name || 'ALMACÉN CENTRAL'}</div>
                                              <div className="text-[9px] text-slate-400">{sp?.city || '-'}</div>
                                          </td>
                                          <td className="px-6 py-4 text-[10px]">
                                              {batch.materialType === 'harvested_grain' ? (
                                                <span className="text-amber-600 dark:text-amber-400 block">
                                                  Hum: {batch.moisturePct || 8.5}% · PG: {batch.germination || 92}%
                                                </span>
                                              ) : batch.materialType === 'fiber_bales' ? (
                                                <span className="text-purple-600 dark:text-purple-400 block">
                                                  {batch.baleCount || 200} Fardos ({batch.avgBaleWeightKg || 500}kg) · Enriado {batch.rettingQuality || 'Óptimo'}
                                                </span>
                                              ) : batch.materialType === 'biomass_cbg' ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                                                  THC: {batch.hplcThcPct || 0.04}% · CBG: {batch.hplcCbgPct || 2.7}% (CoA OK)
                                                </span>
                                              ) : (
                                                <span className="text-blue-600 dark:text-blue-400 block">
                                                  1° PG Obtentor: <strong>{batch.breederGerminationPct || matchedInsp?.germinationDeclaredPct || batch.germination || 90}%</strong>
                                                  {' ➔ '}
                                                  2° PG Coop (QA): <strong>{batch.isActive ? `${batch.coopGerminationPct || matchedInsp?.germinationTestedPct || batch.germination || 90}%` : 'Pendiente'}</strong>
                                                  {' · '}Pureza: {batch.purity || 99}%
                                                </span>
                                              )}
                                              <span className="text-[9px] text-slate-500 block mt-0.5">
                                                Muestreo: <strong>{batch.samplerName || matchedInsp?.samplerName || 'Matias QUINTANA'}</strong> · Aud: <strong>{batch.inspectorName || matchedInsp?.agronomistName || 'Ing. J. PIZARRO'}</strong>
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right tabular-nums">
                                              <div className="text-slate-700 dark:text-slate-300 font-bold">{initialQty.toFixed(3)} kg</div>
                                              <div className="text-[9px] text-slate-400">{Math.round(initialQty * 1000)} gr</div>
                                          </td>
                                          <td className="px-6 py-4 text-right tabular-nums">
                                              <span className={`px-3 py-1 rounded-xl text-xs font-black inline-block ${
                                                batch.remainingQuantity <= 0.0001 
                                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700' 
                                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                              }`}>
                                                {displayQty.toFixed(3)} kg ({Math.round(displayQty * 1000)} gr)
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end items-center space-x-1">
                                                  {isAdmin && (!batch.materialType || batch.materialType === 'seed') && (
                                                    <button
                                                      type="button"
                                                      onClick={() => openCoopQaModal(batch)}
                                                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition flex items-center gap-1 shadow-xs ${
                                                        batch.isActive
                                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                                                      }`}
                                                      title="Paso 3: Realizar 2° PG en Laboratorio de la Cooperativa (QA Calidad), emitir Nueva Acta vinculada a la Genética y pasar a STOCK ACTIVO"
                                                    >
                                                      <FlaskConical size={12} />
                                                      <span>{batch.isActive ? '2° PG / Acta QA' : 'Realizar 2° PG & Acta QA'}</span>
                                                    </button>
                                                  )}
                                                  <button 
                                                    type="button"
                                                    onClick={() => handleOpenView(batch)} 
                                                    className="p-1.5 text-slate-500 hover:text-sky-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                                                    title="Ver Ficha Técnica y Circuito de Trazabilidad"
                                                  >
                                                    <Eye size={14}/>
                                                  </button>
                                                  <button 
                                                    type="button"
                                                    onClick={() => {
                                                      setLabelBatch(batch);
                                                      setIsLabelModalOpen(true);
                                                    }} 
                                                    className="p-1.5 text-purple-600 hover:bg-purple-100 bg-purple-50 dark:bg-purple-950/60 rounded-lg transition"
                                                    title="Emitir Rótulo Oficial & QR Activo"
                                                  >
                                                    <QrCode size={14}/>
                                                  </button>
                                                  {isAdmin && (
                                                    <>
                                                      <button 
                                                        type="button"
                                                        onClick={() => { setBatchFormData({...batch, inputValue: batch.initialQuantity, breederGerminationPct: batch.breederGerminationPct || batch.germination || 90, germinationExpiryDate: batch.germinationExpiryDate || addOneYearIso(batch.purchaseDate)}); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} 
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                                                        title="Editar Lote"
                                                      >
                                                        <Edit2 size={14}/>
                                                      </button>
                                                      {confirmDeleteBatchId === batch.id ? (
                                                        <div className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800">
                                                          <button
                                                            type="button"
                                                            onClick={async () => {
                                                              await deleteSeedBatch(batch.id);
                                                              setConfirmDeleteBatchId(null);
                                                            }}
                                                            className="text-[9px] font-black uppercase text-red-600 hover:underline"
                                                          >
                                                            Borrar
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={() => setConfirmDeleteBatchId(null)}
                                                            className="text-[9px] font-bold text-slate-400 hover:text-slate-600"
                                                          >
                                                            No
                                                          </button>
                                                        </div>
                                                      ) : (
                                                        <button 
                                                          type="button"
                                                          onClick={() => setConfirmDeleteBatchId(batch.id)} 
                                                          className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                                                          title="Eliminar Lote"
                                                        >
                                                          <Trash2 size={14}/>
                                                        </button>
                                                      )}
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
              ) : (
                  /* VISTA AGRUPADA POR ALMACÉN */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      {stockByWarehouse.map(({ storage, items, totalKg, totalInitialKg }, idx) => (
                          <div key={storage?.id || idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                              <div>
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                          <Warehouse size={18} />
                                      </div>
                                      <div className="text-right font-mono tabular-nums">
                                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                                              {totalKg.toFixed(3)} kg ({Math.round(totalKg * 1000)} gr)
                                          </span>
                                          <span className="text-[9px] text-slate-400 block">
                                              Ingresado: {totalInitialKg.toFixed(3)} kg
                                          </span>
                                      </div>
                                  </div>
                                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                      {storage?.name || 'Almacén Central'}
                                  </h3>
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                      {storage?.address || 'Ubicación registrada'} · {storage?.city || ''}
                                  </p>

                                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs tabular-nums">
                                      {Object.entries(items).map(([name, info]) => (
                                          <div key={name} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                              <span className="truncate max-w-[130px] font-bold">{name}:</span>
                                              <div className="text-right">
                                                  <strong className="text-slate-900 dark:text-white block">
                                                      {info.remainingKg.toFixed(3)} kg ({Math.round(info.remainingKg * 1000)} gr)
                                                  </strong>
                                                  <span className="text-[9px] text-slate-400 block">
                                                      de {info.initialKg.toFixed(3)} kg ({Math.round(info.initialKg * 1000)} gr)
                                                  </span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                                  <span>Nodo: {storage?.nodeCode || 'OFICIAL'}</span>
                                  <span className="text-emerald-500 font-bold">Auditado 25/26</span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      ) : activeTab === 'logistics' ? (
          /* CONTENIDO TAB 2: LOGÍSTICA & HOJA DE REMITOS */
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden font-mono">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Guías Oficiales de Transporte ARICCAME & SENASA ({filteredMovements.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Cadena de custodia de materiales biológicos en tránsito
                  </span>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase text-[9px] font-black tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <tr>
                              <th className="px-6 py-4">Guía / Remito</th>
                              <th className="px-6 py-4">Fecha y Hora</th>
                              <th className="px-6 py-4">Carga Despachada</th>
                              <th className="px-6 py-4">Itinerario & Destino</th>
                              <th className="px-6 py-4">Transportista & Patente</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                              <th className="px-6 py-4 text-right">Acción</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredMovements.length === 0 ? (
                              <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No hay guías de tránsito registradas.</td></tr>
                          ) : filteredMovements.map(m => (
                              <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                      {m.transportGuideNumber}
                                  </td>
                                  <td className="px-6 py-4 text-slate-500">
                                      {m.date} {m.dispatchTime && `· ${m.dispatchTime} hs`}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-sky-600 dark:text-sky-400">
                                      {m.quantity.toLocaleString()} kg
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                      {m.routeItinerary || 'Tránsito directo'}
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                      <div>{m.driverName || 'Chofer Asignado'}</div>
                                      <div className="text-[9px] text-slate-400">Pat: {m.vehiclePlate || 'S/D'} · {m.vehicleModel || ''}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => updateSeedMovement({
                                          ...m,
                                          status: m.status === 'En Tránsito' ? 'Recibido' : 'En Tránsito'
                                        })}
                                        title="Clic para alternar recepción"
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition ${
                                          m.status === 'En Tránsito' 
                                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300' 
                                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        }`}
                                      >
                                        {m.status}
                                      </button>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end items-center gap-1.5">
                                          {m.status === 'En Tránsito' && (
                                              <button
                                                type="button"
                                                onClick={() => updateSeedMovement({ ...m, status: 'Recibido' })}
                                                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase hover:bg-emerald-100 transition"
                                                title="Confirmar Recepción en Destino"
                                              >
                                                Recibir
                                              </button>
                                          )}
                                          {isAdmin && (
                                              confirmDeleteMoveId === m.id ? (
                                                <div className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800">
                                                  <button
                                                    type="button"
                                                    onClick={async () => {
                                                      await deleteSeedMovement(m.id);
                                                      setConfirmDeleteMoveId(null);
                                                    }}
                                                    className="text-[9px] font-black uppercase text-red-600 hover:underline"
                                                  >
                                                    Borrar
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteMoveId(null)}
                                                    className="text-[9px] font-bold text-slate-400 hover:text-slate-600"
                                                  >
                                                    No
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => setConfirmDeleteMoveId(m.id)}
                                                  className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                                                  title="Anular Remito"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              )
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : (
          /* CONTENIDO TAB 3: ACTAS DE INSPECCIÓN & CALIDAD INASE */
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden font-mono">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs bg-purple-50/40 dark:bg-purple-950/20">
                  <div>
                    <span className="font-black text-purple-800 dark:text-purple-300 uppercase flex items-center gap-1.5">
                      <ShieldCheck size={15} /> Actas Oficiales de Inspección Técnica de Lote & Recepción INASE / ISTA ({supplierInspections.length})
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Al emitir el dictamen <strong className="text-emerald-700 dark:text-emerald-300">APROBADO CAMPO</strong> en <strong className="text-slate-700 dark:text-slate-300">Proveedores & Insumos ➔ Control de Lotes & Ensayos</strong>, el lote queda en el <strong className="text-emerald-700 dark:text-emerald-300">Stock como ACTIVO (Pasó Calidad)</strong>, listo para seleccionarse al crear el Lote o Parcela de Cultivo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/suppliers?tab=inspections&newInspection=1')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Plus size={12} /> Emitir Nueva Acta y Activar Lote en Stock
                    </button>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase text-[9px] font-black tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <tr>
                              <th className="px-5 py-3.5">Acta / Lote Origen</th>
                              <th className="px-5 py-3.5">Genética Inspeccionada</th>
                              <th className="px-5 py-3.5">Semillero / Proveedor</th>
                              <th className="px-5 py-3.5 text-center">Calidad ISTA (PG / Pureza)</th>
                              <th className="px-5 py-3.5">Muestreador & Certificador</th>
                              <th className="px-5 py-3.5 text-center">Dictamen & Estado Stock</th>
                              <th className="px-5 py-3.5 text-right">Disponibilidad p/ Parcelas</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {supplierInspections.length === 0 ? (
                              <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No hay actas de inspección registradas.</td></tr>
                          ) : supplierInspections.map(insp => {
                              const vName = varieties.find(v => v.id === insp.varietyId)?.name || insp.varietyName || 'Sin asignar';
                              const linkedBatch = seedBatches.find(b => b.originInspectionId === insp.id || b.batchCode.toUpperCase() === insp.lotNumber.toUpperCase());
                              const isApproved = insp.verdict === 'APROBADO_CAMPO';
                              return (
                                  <tr key={insp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                      <td className="px-5 py-4">
                                          <div className="font-black text-slate-900 dark:text-white">{insp.lotNumber}</div>
                                          <div className="text-[10px] text-slate-400">Muestra: {insp.sampleCode || 'S/D'} · {insp.date}</div>
                                      </td>
                                      <td className="px-5 py-4">
                                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-[11px] inline-flex items-center gap-1">
                                              <Dna size={12} /> {vName}
                                          </span>
                                      </td>
                                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                                          <div>{insp.supplierName}</div>
                                          <div className="text-[10px] text-slate-400 font-normal">Remito/Guía: {insp.guideOrRemitoNumber || 'Oficial INASE'}</div>
                                      </td>
                                      <td className="px-5 py-4 text-center">
                                          <div className="font-bold text-blue-600 dark:text-blue-400">PG: {insp.germinationTestedPct}% · Pureza: {insp.purityPct}%</div>
                                          <div className="text-[9px] text-slate-400 uppercase">{insp.qualityGrade?.replace(/_/g, ' ') || 'GRADO A'} (Score {insp.qualityScore || 96}/100)</div>
                                      </td>
                                      <td className="px-5 py-4 text-[10px] text-slate-600 dark:text-slate-400">
                                          <div><strong>Muestreador:</strong> {insp.samplerName || 'Matias QUINTANA'}</div>
                                          <div><strong>Ing. Certificador:</strong> {insp.agronomistName || 'Ing. Agr. Julian PIZARRO'}</div>
                                      </td>
                                      <td className="px-5 py-4 text-center">
                                          <div className="flex flex-col items-center gap-1">
                                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                                                isApproved
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                              }`}>
                                                  {insp.verdict?.replace(/_/g, ' ') || 'APROBADO CAMPO'}
                                              </span>
                                              <span className={`text-[9px] font-black uppercase ${
                                                linkedBatch?.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                                              }`}>
                                                  {linkedBatch?.isActive ? '● EN STOCK ACTIVO (CALIDAD OK)' : '○ Pendiente Activar en Stock'}
                                              </span>
                                          </div>
                                      </td>
                                      <td className="px-5 py-4 text-right">
                                          <div className="flex justify-end items-center gap-2">
                                              {linkedBatch && linkedBatch.isActive ? (
                                                  <>
                                                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                          Activo: {Number(linkedBatch.remainingQuantity || 0).toFixed(3)} kg disp.
                                                      </span>
                                                      <button
                                                          type="button"
                                                          onClick={() => navigate('/plots')}
                                                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase transition shadow-sm"
                                                          title="Ir a Unidades Productivas para sembrar parcelas con este lote activo"
                                                      >
                                                          Sembrar en Parcela
                                                      </button>
                                                  </>
                                              ) : (
                                                  <button
                                                      type="button"
                                                      onClick={async () => {
                                                          if (linkedBatch) {
                                                              await updateSeedBatch({ ...linkedBatch, isActive: true });
                                                          } else {
                                                              await addSeedBatch({
                                                                  id: generateId(),
                                                                  varietyId: insp.varietyId || varieties[0]?.id || '',
                                                                  supplierId: insp.supplierId,
                                                                  batchCode: insp.lotNumber,
                                                                  labelSerialNumber: `ROT-INASE-${insp.lotNumber}`,
                                                                  category: 'C1',
                                                                  materialType: 'seed',
                                                                  analysisDate: insp.date,
                                                                  purity: insp.purityPct || 99.5,
                                                                  germination: insp.germinationTestedPct || 90,
                                                                  moisturePct: insp.moisturePct || 8.5,
                                                                  certificationNumber: insp.guideOrRemitoNumber || `INASE-${insp.lotNumber}`,
                                                                  purchaseDate: insp.date || new Date().toISOString().split('T')[0],
                                                                  pricePerKg: 0,
                                                                  initialQuantity: insp.initialQuantityKg || 1,
                                                                  remainingQuantity: insp.initialQuantityKg || 1,
                                                                  storagePointId: insp.storagePointId || storagePoints[0]?.id,
                                                                  originInspectionId: insp.id,
                                                                  qualityGrade: insp.qualityGrade || 'GRADO_A_SUPERIOR',
                                                                  qualityScore: insp.qualityScore || 96,
                                                                  samplerName: insp.samplerName || 'Matias QUINTANA',
                                                                  samplerMatricula: insp.samplerDniOrMatricula || 'TEC-MUESTREO-ISTA-108',
                                                                  sampleCode: insp.sampleCode || `MUE-${insp.lotNumber}`,
                                                                  inspectorName: insp.agronomistName || 'Ing. Agr. Julian PIZARRO',
                                                                  inspectorMatricula: insp.agronomistMatricula || 'MP-AGRO-1492 CH',
                                                                  isActive: true,
                                                                  createdAt: new Date().toISOString()
                                                              });
                                                          }
                                                      }}
                                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition shadow-sm"
                                                  >
                                                      Activar en Stock
                                                  </button>
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
      )}

      {/* MODAL ALTA / EDICIÓN DE MATERIAL BIOLÓGICO (PASO 1: PROVEEDOR + GALPÓN + PG OBTENTOR -> PASO 2: VARIEDAD GENÉTICA + ALTA Y VENCIMIENTO 1 AÑO -> PASO 3: PG COOPERATIVA QA + ACTA = STOCK ACTIVO) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1">
                  <Package size={12} />
                  <span>
                    {editingBatchId
                      ? 'Modificar Lote Biológico'
                      : batchFormData.materialType === 'seed'
                      ? 'Semilla Fiscalizada / Nuevo Lote Biológico (Circuito de 3 Pasos)'
                      : 'Ingreso de Material a Custodia'}
                  </span>
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                  {batchFormData.batchCode || 'Nuevo Lote Biológico'}
                </h2>
              </div>
              <button onClick={() => !isSubmitting && setIsBatchModalOpen(false)} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <form onSubmit={(e) => handleBatchSubmit(e, false)} className="space-y-4">
              
              {/* TIPO DE MATERIAL */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Categoría Biológica del Material *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBatchFormData({ ...batchFormData, materialType: 'seed' })}
                    className={`p-2 rounded-xl border text-center transition font-bold ${
                      batchFormData.materialType === 'seed' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Semilla Fiscalizada
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFormData({ ...batchFormData, materialType: 'harvested_grain' })}
                    className={`p-2 rounded-xl border text-center transition font-bold ${
                      batchFormData.materialType === 'harvested_grain' 
                        ? 'bg-amber-600 text-white border-amber-600 shadow' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Grano Cosechado
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFormData({ ...batchFormData, materialType: 'fiber_bales' })}
                    className={`p-2 rounded-xl border text-center transition font-bold ${
                      batchFormData.materialType === 'fiber_bales' 
                        ? 'bg-purple-600 text-white border-purple-600 shadow' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Fardos de Fibra
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFormData({ ...batchFormData, materialType: 'biomass_cbg' })}
                    className={`p-2 rounded-xl border text-center transition font-bold ${
                      batchFormData.materialType === 'biomass_cbg' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Biomasa CBG
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFormData({ ...batchFormData, materialType: 'hurds' })}
                    className={`p-2 rounded-xl border text-center transition font-bold ${
                      batchFormData.materialType === 'hurds' 
                        ? 'bg-sky-600 text-white border-sky-600 shadow' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Cañamiza
                  </button>
                </div>
              </div>

              {batchFormData.materialType === 'seed' ? (
                <>
                  {/* PASO 1: INGRESO DE NUEVO LOTE BIOLÓGICO AL ALMACENAMIENTO (PROVEEDOR VERIFICADO + GALPÓN DE ALMACENAMIENTO + 1° PRUEBA DE PG DEL OBTENTOR) */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/25 p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-800/70 space-y-3.5">
                    <div className="border-b border-blue-200/70 dark:border-blue-800/60 pb-2.5 flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Warehouse size={15} className="text-blue-600" />
                          <span>PASO 1: Ingreso a Almacenamiento · Proveedor Verificado, Galpón Destino & 1° PG del Obtentor</span>
                        </h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Seleccione el <strong>Proveedor Verificado</strong>, el <strong>Galpón de Almacenamiento</strong> donde ingresa el lote y registre la <strong>1° Prueba de PG por parte del Obtentor</strong>.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase">
                        1° Etapa: Custodia en Galpón
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase mb-1">
                          1.1 Proveedor / Obtentor Verificado (Dado de Alta) *
                        </label>
                        <select
                          required
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={batchFormData.supplierId || ''}
                          onChange={e => setBatchFormData({ ...batchFormData, supplierId: e.target.value })}
                        >
                          <option value="">Seleccionar Proveedor Verificado...</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.country || 'ARG'} · {s.homologationStatus === 'Homologado_Conforme' ? 'Verificado OK' : 'Homologado'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase mb-1">
                          1.2 Galpón de Almacenamiento Destino (Custodia Física) *
                        </label>
                        <select
                          required
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={batchFormData.storagePointId || ''}
                          onChange={e => setBatchFormData({ ...batchFormData, storagePointId: e.target.value })}
                        >
                          <option value="">Seleccionar Galpón de Almacenamiento...</option>
                          {storagePoints.map(sp => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name} ({sp.city}) — Nodo {sp.nodeCode}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                      <div>
                        <label className={labelClass}>1.3 Código del Lote / Marbete *</label>
                        <input
                          required
                          disabled={isSubmitting}
                          type="text"
                          className={inputClass}
                          value={batchFormData.batchCode}
                          onChange={e => setBatchFormData({ ...batchFormData, batchCode: e.target.value.toUpperCase() })}
                          placeholder="Ej: YUM-501-L125"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Serie Rótulo INASE</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={batchFormData.labelSerialNumber || ''}
                          onChange={e => setBatchFormData({ ...batchFormData, labelSerialNumber: e.target.value })}
                          placeholder="ROT-INASE-2025-..."
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono font-black uppercase text-blue-700 dark:text-blue-300 ml-1 mb-1 block tracking-wider">
                          1.4 Prueba PG del Obtentor (%) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          className="w-full border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-200 p-2.5 rounded-xl font-mono text-xs font-black focus:ring-2 focus:ring-blue-500 outline-none"
                          value={batchFormData.breederGerminationPct ?? batchFormData.germination ?? 90}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setBatchFormData({
                              ...batchFormData,
                              breederGerminationPct: val,
                              germination: batchFormData.coopGerminationPct || val
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Pureza de Origen (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          className={inputClass}
                          value={batchFormData.purity || 99.8}
                          onChange={e => setBatchFormData({ ...batchFormData, purity: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* PASO 2: SELECCIÓN DE VARIEDAD (GENÉTICA · 1 VARIEDAD PUEDE TENER MUCHOS LOTES), FECHA DE ALTA, VENCIMIENTO MANUAL (1 AÑO) Y MASA */}
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/25 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70 space-y-3.5">
                    <div className="border-b border-emerald-200/70 dark:border-emerald-800/60 pb-2.5 flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <Dna size={15} className="text-emerald-600" />
                          <span>PASO 2: Variedad (Genética), Fecha de Alta del Lote, Vencimiento Manual (1 Año) & Masa</span>
                        </h4>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Seleccione la <strong>Variedad dada de alta en GENÉTICA</strong> (una variedad puede tener múltiples lotes) e ingrese manualmente la <strong>Fecha de Alta</strong> y la <strong>Fecha de Vencimiento</strong> (por lo general 1 año).
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-[9px] font-black uppercase">
                        Relación 1 Variedad : N Lotes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase mb-1">
                          2.1 Variedad / Cultivar (Dada de Alta en GENÉTICA) *
                        </label>
                        <select
                          required
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={batchFormData.varietyId || ''}
                          onChange={e => {
                            const selectedVarietyId = e.target.value;
                            const v = varieties.find(va => va.id === selectedVarietyId);
                            setBatchFormData({
                              ...batchFormData,
                              varietyId: selectedVarietyId,
                              supplierId: batchFormData.supplierId || v?.supplierId || ''
                            });
                          }}
                        >
                          <option value="">Seleccionar Variedad de GENÉTICA...</option>
                          {varieties.map(v => {
                            const lotCount = seedBatches.filter(b => b.varietyId === v.id && (!b.materialType || b.materialType === 'seed')).length;
                            const supName = suppliers.find(s => s.id === v.supplierId)?.name || '';
                            return (
                              <option key={v.id} value={v.id}>
                                {v.name} ({v.usage}){supName ? ` · ${supName}` : ''} — [{lotCount} lotes registrados]
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                          2.2 Fecha de Alta del Lote (Manual) *
                        </label>
                        <input
                          required
                          type="date"
                          className={inputClass}
                          value={batchFormData.purchaseDate || ''}
                          onChange={e => {
                            const newPurchaseDate = e.target.value;
                            setBatchFormData({
                              ...batchFormData,
                              purchaseDate: newPurchaseDate,
                              germinationExpiryDate: addOneYearIso(newPurchaseDate)
                            });
                          }}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">
                            2.3 Fecha de Vencimiento (Manual · Gral. 1 Año) *
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setBatchFormData({
                                ...batchFormData,
                                germinationExpiryDate: addOneYearIso(batchFormData.purchaseDate)
                              })
                            }
                            className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-600"
                            title="Calcular exactamente +1 año desde la Fecha de Alta"
                          >
                            +1 Año
                          </button>
                        </div>
                        <input
                          required
                          type="date"
                          className="w-full border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                          value={batchFormData.germinationExpiryDate || ''}
                          onChange={e => setBatchFormData({ ...batchFormData, germinationExpiryDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className={labelClass}>2.4 Masa a Ingresar al Galpón *</label>
                        <div className="flex gap-2">
                          <input
                            required
                            type="number"
                            step="any"
                            min="0"
                            className={`${inputClass} text-lg font-black`}
                            value={batchFormData.inputValue}
                            onChange={e => setBatchFormData({ ...batchFormData, inputValue: Number(e.target.value) })}
                          />
                          <select
                            className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase text-center"
                            value={entryUnit}
                            onChange={e => setEntryUnit(e.target.value as MassUnit)}
                          >
                            <option value="kg">KG</option>
                            <option value="gr">GR</option>
                            <option value="tn">TN</option>
                          </select>
                        </div>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block mt-1">
                          Masa Equivalente: {calculatedEntryKg.toFixed(3)} kg ({Math.round(calculatedEntryKg * 1000)} gr)
                        </span>
                      </div>

                      <div>
                        <label className={labelClass}>Categoría Fiscal INASE</label>
                        <select
                          className={inputClass}
                          value={batchFormData.category || 'C1'}
                          onChange={e => setBatchFormData({ ...batchFormData, category: e.target.value })}
                        >
                          <option value="Original">Original / Básica</option>
                          <option value="Base">Base / Prebásica</option>
                          <option value="C1">Certificada 1° (C1)</option>
                          <option value="C2">Certificada 2° (C2)</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Condiciones de Almacenamiento en Galpón</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={batchFormData.storageConditions || ''}
                          onChange={e => setBatchFormData({ ...batchFormData, storageConditions: e.target.value })}
                          placeholder="Ej: Cámara seca 15°C / 45% HR"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PASO 3 RESUMEN EXPLICATIVO: 2° PG REALIZADO POR LA COOPERATIVA (QA CALIDAD) + NUEVA ACTA = PASE A STOCK ACTIVO */}
                  <div className="bg-purple-50/80 dark:bg-purple-950/30 p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-800/70 space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h4 className="text-[11px] font-black uppercase text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <FlaskConical size={15} className="text-purple-600" />
                        <span>PASO 3 (Siguiente Etapa): 2° PG por la Cooperativa (QA Calidad) + Emisión de Nueva Acta ➔ Pase a STOCK ACTIVO</span>
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                        editingBatchId && batchFormData.isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200'
                      }`}>
                        {editingBatchId && batchFormData.isActive
                          ? '● Lote Ya en STOCK ACTIVO (QA Aprobado)'
                          : '⏳ Ingresa en Galpón como PENDIENTE 2° PG COOPERATIVA'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Una vez que el lote ingresa a nuestro <strong>Galpón de Almacenamiento</strong> con el PG del Obtentor, <strong>la Cooperativa realiza otro PG (2° Prueba de Poder Germinativo)</strong> para determinar <strong>QA Calidad</strong>. Realizado ese PG, se emite una <strong>Nueva Acta (Genética / Cultivar que Pasó la Inspección vinculada al Acta)</strong> y recién cumplidos estos pasos el lote pasa a <strong>STOCK ACTIVO</strong>.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* IDENTIFICACIÓN OPERATIVA PARA DERIVADOS COSECHADOS (GRANO / FIBRA / BIOMASA / CAÑAMIZA) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Código del Lote *</label>
                      <input required disabled={isSubmitting} type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value.toUpperCase()})} placeholder="Ej: GRN-YUM-2026" />
                    </div>
                    <div>
                      <label className={labelClass}>Genética / Cultivar *</label>
                      <select required disabled={isSubmitting} className={inputClass} value={batchFormData.varietyId} onChange={e => setBatchFormData({...batchFormData, varietyId: e.target.value})}>
                        <option value="">Seleccionar Genética...</option>
                        {varieties.map(v => <option key={v.id} value={v.id}>{v.name} ({v.usage})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Nodo de Acopio Destino *</label>
                      <select required disabled={isSubmitting} className={inputClass} value={batchFormData.storagePointId} onChange={e => setBatchFormData({...batchFormData, storagePointId: e.target.value})}>
                        <option value="">Seleccionar Depósito...</option>
                        {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name} ({sp.city})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                      Origen de Trazabilidad del Material Obtenido (Parcela ➔ Lote Siembra ➔ Homologación)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Parcela de Cultivo Origen *</label>
                        <select
                          className={inputClass}
                          value={batchFormData.originPlotId || ''}
                          onChange={e => {
                            const p = plots.find(pl => pl.id === e.target.value);
                            const parentBatch = p?.seedBatchId ? seedBatches.find(b => b.id === p.seedBatchId) : undefined;
                            const originInsp = parentBatch
                              ? supplierInspections.find(i => i.id === parentBatch.originInspectionId || i.seedBatchId === parentBatch.id || parentBatch.batchCode.includes(i.lotNumber))
                              : undefined;
                            setBatchFormData({
                              ...batchFormData,
                              originPlotId: e.target.value,
                              varietyId: p?.varietyId || batchFormData.varietyId,
                              parentSeedBatchId: parentBatch?.id || batchFormData.parentSeedBatchId,
                              originInspectionId: originInsp?.id || parentBatch?.originInspectionId || batchFormData.originInspectionId,
                              qualityGrade: parentBatch?.qualityGrade || originInsp?.qualityGrade || 'GRADO_A_SUPERIOR',
                              sowingResponsibleName: p?.sowingResponsibleName || p?.ownerName || 'Matias QUINTANA'
                            });
                          }}
                        >
                          <option value="">Seleccionar Parcela Cosechada...</option>
                          {plots.map(p => <option key={p.id} value={p.id}>{p.name} ({p.surfaceArea} {p.surfaceUnit})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Lote de Siembra Madre</label>
                        <select
                          className={inputClass}
                          value={batchFormData.parentSeedBatchId || ''}
                          onChange={e => setBatchFormData({ ...batchFormData, parentSeedBatchId: e.target.value })}
                        >
                          <option value="">Asociado por parcela...</option>
                          {seedBatches.filter(b => (b.materialType || 'seed') === 'seed').map(b => (
                            <option key={b.id} value={b.id}>{b.batchCode}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Calidad Determinada del Material</label>
                        <select
                          className={inputClass}
                          value={batchFormData.qualityGrade || 'GRADO_A_SUPERIOR'}
                          onChange={e => setBatchFormData({ ...batchFormData, qualityGrade: e.target.value })}
                        >
                          <option value="GRADO_A_SUPERIOR">Grado A · Calidad Superior</option>
                          <option value="GRADO_B_ESTANDAR">Grado B · Estándar Fiscalizado</option>
                          <option value="GRADO_C_CONDICIONAL">Grado C · Condicional</option>
                        </select>
                      </div>
                    </div>

                    {batchFormData.materialType === 'harvested_grain' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className={labelClass}>% Humedad de Recibo (&lt;9%)</label>
                          <input type="number" step="0.1" className={inputClass} value={batchFormData.moisturePct || 8.4} onChange={e => setBatchFormData({...batchFormData, moisturePct: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={labelClass}>% Poder Germinativo Grano</label>
                          <input type="number" step="0.5" className={inputClass} value={batchFormData.germination || 92} onChange={e => setBatchFormData({...batchFormData, germination: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={labelClass}>Certificado Inocuidad SENASA</label>
                          <input type="text" className={inputClass} value={batchFormData.aflatoxinFreeCertificate || ''} onChange={e => setBatchFormData({...batchFormData, aflatoxinFreeCertificate: e.target.value})} placeholder="SENASA-INOC-2026-8812" />
                        </div>
                      </div>
                    )}

                    {batchFormData.materialType === 'fiber_bales' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className={labelClass}>Cantidad de Fardos</label>
                          <input type="number" className={inputClass} value={batchFormData.baleCount || 200} onChange={e => setBatchFormData({...batchFormData, baleCount: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={labelClass}>Peso Medio por Fardo (kg)</label>
                          <input type="number" className={inputClass} value={batchFormData.avgBaleWeightKg || 500} onChange={e => setBatchFormData({...batchFormData, avgBaleWeightKg: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={labelClass}>Calidad de Enriado en Campo</label>
                          <select className={inputClass} value={batchFormData.rettingQuality || 'Óptimo (Gris plateado)'} onChange={e => setBatchFormData({...batchFormData, rettingQuality: e.target.value})}>
                            <option value="Óptimo (Gris plateado)">Óptimo (Gris plateado)</option>
                            <option value="Medio (Amarillo tostado)">Medio (Amarillo tostado)</option>
                            <option value="Verde (Sin enriar)">Verde (Sin enriar)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {batchFormData.materialType === 'biomass_cbg' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className={labelClass}>% THC Certificado (&lt;0.3%) *</label>
                          <input type="number" step="0.001" className={inputClass} value={batchFormData.hplcThcPct || 0.038} onChange={e => setBatchFormData({...batchFormData, hplcThcPct: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={labelClass}>% CBG Analizado</label>
                          <input type="number" step="0.01" className={inputClass} value={batchFormData.hplcCbgPct || 2.72} onChange={e => setBatchFormData({...batchFormData, hplcCbgPct: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className={labelClass}>N° Protocolo CoA Oficial</label>
                          <input type="text" className={inputClass} value={batchFormData.hplcLabCertificate || ''} onChange={e => setBatchFormData({...batchFormData, hplcLabCertificate: e.target.value})} placeholder="CoA-HPLC-CANNATECH-2026-0419" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MASA Y UNIDADES PARA DERIVADOS */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Masa a Ingresar *</label>
                        <div className="flex gap-2">
                          <input required type="number" step="any" min="0" className={`${inputClass} text-xl font-bold`} value={batchFormData.inputValue} onChange={e => setBatchFormData({...batchFormData, inputValue: Number(e.target.value)})} />
                          <select className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase text-center" value={entryUnit} onChange={e => setEntryUnit(e.target.value as MassUnit)}>
                            <option value="kg">KG</option>
                            <option value="tn">TN</option>
                            <option value="gr">GR</option>
                          </select>
                        </div>
                        <span className="text-[10px] text-emerald-600 block mt-1">Cálculo Real: {calculatedEntryKg.toLocaleString()} KG</span>
                      </div>

                      <div>
                        <label className={labelClass}>Condiciones de Guarda / Almacenamiento</label>
                        <input type="text" className={inputClass} value={batchFormData.storageConditions || ''} onChange={e => setBatchFormData({...batchFormData, storageConditions: e.target.value})} placeholder="Ej: Cámara fría 15°C / 45% HR" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" disabled={isSubmitting} onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600">
                  Cancelar
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {batchFormData.materialType === 'seed' && !editingBatchId && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={(e) => handleBatchSubmit(e as any, true)}
                      className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow flex items-center hover:bg-purple-500 transition"
                    >
                      <FlaskConical className="mr-1.5" size={14} />
                      <span>Guardar en Galpón y Realizar 2° PG Cooperativa Ahora</span>
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow flex items-center hover:bg-emerald-500 transition">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" size={15}/> : <Save className="mr-2" size={15}/>}
                    {editingBatchId
                      ? 'Actualizar Lote'
                      : batchFormData.materialType === 'seed'
                      ? 'Guardar Ingreso en Galpón (Pendiente 2° PG)'
                      : 'Ingresar a Inventario'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PASO 3: SEGUNDO PG REALIZADO POR LA COOPERATIVA (QA CALIDAD) + EMISIÓN DE NUEVA ACTA (GENÉTICA VINCULADA) ➔ PASE A STOCK ACTIVO */}
      {qaModalBatch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[75] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border-2 border-purple-300 dark:border-purple-800 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <FlaskConical size={14} />
                  <span>PASO 3: Laboratorio QA de la Cooperativa · 2° Prueba de PG & Emisión de Nueva Acta</span>
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                  Determinación QA Calidad y Pase a STOCK ACTIVO · Lote {qaModalBatch.batchCode}
                </h2>
              </div>
              <button onClick={() => !isSubmitting && setQaModalBatch(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCoopQaAndActivate} className="space-y-4">
              {/* RESUMEN DEL PASO 1 Y PASO 2 (LOTE EN GALPÓN) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Galpón de Custodia</span>
                  <strong className="text-slate-900 dark:text-white block">
                    {storagePoints.find(s => s.id === qaModalBatch.storagePointId)?.name || 'Almacén Central'}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Proveedor / Obtentor</span>
                  <strong className="text-slate-900 dark:text-white block">
                    {suppliers.find(s => s.id === qaModalBatch.supplierId)?.name || 'Proveedor Verificado'}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Alta y Vencimiento</span>
                  <strong className="text-slate-900 dark:text-white block">
                    {qaModalBatch.purchaseDate || '-'} ➔ {qaModalBatch.germinationExpiryDate || addOneYearIso(qaModalBatch.purchaseDate)}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Masa en Galpón</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 block">
                    {Number(qaModalBatch.remainingQuantity || 0).toFixed(3)} kg ({Math.round((qaModalBatch.remainingQuantity || 0) * 1000)} gr)
                  </strong>
                </div>
              </div>

              {/* CONTRASTE DE DOBLE PG (1° PG OBTENTOR VS 2° PG COOPERATIVA QA) */}
              <div className="bg-purple-50/60 dark:bg-purple-950/25 p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-800/70 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-purple-800 dark:text-purple-300">
                    1. Contraste de Poder Germinativo: 1° PG del Obtentor vs. 2° PG Realizado por la Cooperativa (QA Calidad)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[9px] font-mono font-black uppercase text-blue-700 dark:text-blue-300 ml-1 mb-1 block">
                      1° PG del Obtentor (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      className={inputClass}
                      value={qaFormDraft.breederGerminationPct}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, breederGerminationPct: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-black uppercase text-purple-700 dark:text-purple-300 ml-1 mb-1 block">
                      2° PG Cooperativa QA (%) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-full border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-200 p-2.5 rounded-xl font-mono text-sm font-black focus:ring-2 focus:ring-purple-500 outline-none"
                      value={qaFormDraft.coopGerminationPct}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, coopGerminationPct: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Pureza Analizada QA (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={inputClass}
                      value={qaFormDraft.purityPct}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, purityPct: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Humedad de Grano (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={inputClass}
                      value={qaFormDraft.moisturePct}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, moisturePct: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* EMISIÓN DE LA NUEVA ACTA (GENÉTICA / CULTIVAR QUE PASÓ LA INSPECCIÓN VINCULADA AL ACTA) */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/25 p-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800/70 space-y-3">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                  2. Emisión de Nueva Acta de Inspección QA · Genética / Cultivar que Pasó la Inspección (Vinculada al Acta)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase mb-1">
                      Genética / Cultivar que Pasó la Inspección (Vinculada al Acta) *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={qaFormDraft.varietyId}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, varietyId: e.target.value })}
                    >
                      <option value="">Seleccionar Variedad de GENÉTICA...</option>
                      {varieties.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.usage})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase mb-1">
                      Dictamen QA Cooperativa (Define Pase a STOCK ACTIVO) *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                      value={qaFormDraft.verdict}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, verdict: e.target.value as any })}
                    >
                      <option value="APROBADO_CAMPO">APROBADO QA CALIDAD ➔ PASA A STOCK ACTIVO</option>
                      <option value="EN_CUARENTENA_OBSERVADO">OBSERVADO EN CUARENTENA (No pasa a Stock Activo)</option>
                      <option value="RECHAZADO_DEVOLUCION">RECHAZADO (No Apto)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Código de Muestra ISTA</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={qaFormDraft.sampleCode}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, sampleCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Responsable Toma de Muestra</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={qaFormDraft.samplerName}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, samplerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ing. Agrónomo Certificador QA</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={qaFormDraft.agronomistName}
                      onChange={e => setQaFormDraft({ ...qaFormDraft, agronomistName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQaModalBatch(null)}
                  className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow flex items-center gap-2 transition"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={16} />}
                  <span>Emitir Nueva Acta QA y Pasar Lote a STOCK ACTIVO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW / AUDITORÍA TÉCNICA + CIRCUITO COMPLETO DE TRAZABILIDAD */}
      {isViewModalOpen && selectedBatch && (() => {
        const matchedInsp = supplierInspections.find(i =>
          i.id === selectedBatch.originInspectionId ||
          i.seedBatchId === selectedBatch.id ||
          selectedBatch.batchCode.toUpperCase().includes(i.lotNumber.toUpperCase())
        );
        const linkedPlots = plots.filter(p => p.seedBatchId === selectedBatch.id || p.id === selectedBatch.originPlotId);
        const obtainedFromThisSeed = seedBatches.filter(b =>
          b.materialType && b.materialType !== 'seed' && (
            b.parentSeedBatchId === selectedBatch.id ||
            (b.originPlotId && linkedPlots.some(p => p.id === b.originPlotId))
          )
        );
        const qGrade = selectedBatch.qualityGrade || matchedInsp?.qualityGrade || 'GRADO_A_SUPERIOR';

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 font-mono">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600">
                    Certificado Técnico de Material & Trazabilidad QR Activa
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedBatch.batchCode}</h2>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Genética</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{varieties.find(v => v.id === selectedBatch.varietyId)?.name || 'S/D'}</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Calidad Lote</span>
                  <strong className="text-purple-600 dark:text-purple-400">
                    {qGrade === 'GRADO_A_SUPERIOR' ? 'Grado A Élite' : qGrade === 'GRADO_B_ESTANDAR' ? 'Grado B' : 'Grado C'}
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Existencia Real</span>
                  <strong className="text-slate-900 dark:text-white">{Number((selectedBatch.remainingQuantity || 0).toFixed(3))} kg ({Math.round((selectedBatch.remainingQuantity || 0) * 1000)} gr)</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Almacén</span>
                  <strong className="text-sky-600 dark:text-sky-400">{storagePoints.find(s => s.id === selectedBatch.storagePointId)?.name || 'Central'}</strong>
                </div>
              </div>

              {/* PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-xs space-y-2 mb-4">
                <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 block">
                  Personal Interviniente en Toma de Muestras y Custodia
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-slate-800">
                    <span className="text-[8px] text-slate-400 uppercase block">Toma de Muestra</span>
                    <strong className="text-slate-900 dark:text-white block">{selectedBatch.samplerName || matchedInsp?.samplerName || 'Matias QUINTANA'}</strong>
                    <span className="text-[9px] text-amber-600 font-mono block">{selectedBatch.sampleCode || matchedInsp?.sampleCode || `MUE-${selectedBatch.batchCode}`}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-slate-800">
                    <span className="text-[8px] text-slate-400 uppercase block">Auditoría Laboratorio</span>
                    <strong className="text-slate-900 dark:text-white block">{selectedBatch.inspectorName || matchedInsp?.agronomistName || 'Ing. Agr. Julian PIZARRO'}</strong>
                    <span className="text-[9px] text-purple-600 font-mono block">{selectedBatch.inspectorMatricula || matchedInsp?.agronomistMatricula || 'MP-AGRO-1492 CH'}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-slate-800">
                    <span className="text-[8px] text-slate-400 uppercase block">Custodia / Campo</span>
                    <strong className="text-slate-900 dark:text-white block">{selectedBatch.harvestResponsibleName || selectedBatch.logisticsResponsible || 'Gastón BAREA M.'}</strong>
                    <span className="text-[9px] text-emerald-600 block">Trazabilidad Verificada</span>
                  </div>
                </div>
              </div>

              {/* CIRCUITO DE TRAZABILIDAD DE 4 ETAPAS */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 mb-4">
                <span className="text-[9px] font-black uppercase text-emerald-600 block">
                  Circuito Completo de Trazabilidad Asociado
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[8px] font-bold text-purple-600 uppercase block">1. Inspección Recepción</span>
                    <strong className="text-slate-800 dark:text-slate-200 block truncate">
                      {matchedInsp ? `${matchedInsp.lotNumber} (${matchedInsp.supplierName})` : 'Homologado INASE'}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[8px] font-bold text-sky-600 uppercase block">2. Parcelas Asociadas ({linkedPlots.length})</span>
                    <strong className="text-slate-800 dark:text-slate-200 block truncate">
                      {linkedPlots.length > 0 ? linkedPlots.map(p => p.name).join(', ') : 'Disponible en Almacén'}
                    </strong>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[8px] font-bold text-amber-600 uppercase block">3. Material Obtenido ({obtainedFromThisSeed.length})</span>
                    <strong className="text-slate-800 dark:text-slate-200 block truncate">
                      {obtainedFromThisSeed.length > 0 ? obtainedFromThisSeed.map(m => m.batchCode).join(', ') : (selectedBatch.materialType !== 'seed' ? selectedBatch.batchCode : 'En ciclo agrícola')}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    navigate(`/trace/${selectedBatch.id}`);
                  }}
                  className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-1.5"
                >
                  <QrCode size={14} />
                  <span>Abrir Portal Público QR</span>
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setLabelBatch(selectedBatch);
                      setIsLabelModalOpen(true);
                    }} 
                    className="bg-purple-600 text-white hover:bg-purple-500 px-5 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-1.5 shadow"
                  >
                    <QrCode size={14} />
                    <span>Emitir Rótulo & QR</span>
                  </button>
                  <button type="button" onClick={() => setIsViewModalOpen(false)} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 py-2 rounded-xl font-bold text-xs uppercase">
                    Cerrar Ficha
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DESPACHO / GUÍA DE TRÁNSITO */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 font-mono">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-500 flex items-center justify-center">
                          <Truck size={20}/>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Emisión de Guía de Tránsito ARICCAME</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Trazabilidad oficial de carga hacia nodos o socios</p>
                        </div>
                    </div>
                    <button onClick={() => setIsMoveModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                <form onSubmit={handleMoveSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <h3 className="text-[10px] font-bold uppercase text-slate-500">1. Material y Carga</h3>
                            <div>
                                <label className={labelClass}>Lote de Origen *</label>
                                <select required className={inputClass} value={moveFormData.batchId} onChange={e => setMoveFormData({...moveFormData, batchId: e.target.value})}>
                                    <option value="">Seleccione lote disponible...</option>
                                    {seedBatches.filter(b => b.remainingQuantity > 0.001).map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.batchCode} ({Number(b.remainingQuantity.toFixed(2))} kg) - {storagePoints.find(s => s.id === b.storagePointId)?.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Masa a Despachar *</label>
                                <div className="flex gap-2">
                                    <input required type="number" step="any" min="0" className={`${inputClass} text-lg font-bold`} value={moveFormData.inputValue} onChange={e => setMoveFormData({...moveFormData, inputValue: Number(e.target.value)})} />
                                    <select className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase text-center" value={moveUnit} onChange={e => setMoveUnit(e.target.value as MassUnit)}>
                                        <option value="kg">KG</option>
                                        <option value="tn">TN</option>
                                        <option value="gr">GR</option>
                                    </select>
                                </div>
                                <span className="text-[10px] text-sky-600 font-bold block mt-1">Carga Neta: {calculatedMoveKg.toLocaleString()} kg</span>
                            </div>
                            <div>
                                <label className={labelClass}>Destino de Recepción *</label>
                                <select required className={inputClass} value={moveFormData.targetLocationId} onChange={e => setMoveFormData({...moveFormData, targetLocationId: e.target.value})}>
                                    <option value="">Seleccione depósito destino...</option>
                                    {storagePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name} ({sp.city})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <h3 className="text-[10px] font-bold uppercase text-slate-500">2. Transporte & Custodia</h3>
                            <div>
                                <label className={labelClass}>N° Guía de Tránsito ARICCAME / Remito *</label>
                                <input required type="text" className={inputClass} value={moveFormData.transportGuideNumber} onChange={e => setMoveFormData({...moveFormData, transportGuideNumber: e.target.value.toUpperCase()})} placeholder="GT-ARICCAME-2026-0099" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Chofer / Conductor</label>
                                    <input type="text" className={inputClass} value={moveFormData.driverName} onChange={e => setMoveFormData({...moveFormData, driverName: e.target.value})} placeholder="Nombre completo" />
                                </div>
                                <div>
                                    <label className={labelClass}>Patente Vehicular</label>
                                    <input type="text" className={inputClass} value={moveFormData.vehiclePlate} onChange={e => setMoveFormData({...moveFormData, vehiclePlate: e.target.value.toUpperCase()})} placeholder="AA 123 BB" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Itinerario de Ruta</label>
                                <input type="text" className={inputClass} value={moveFormData.routeItinerary} onChange={e => setMoveFormData({...moveFormData, routeItinerary: e.target.value})} placeholder="Ruta Nacional y paradas intermedias" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={() => setIsMoveModalOpen(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="bg-sky-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow flex items-center hover:bg-sky-500 transition">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={15}/> : <Truck className="mr-2" size={15}/>}
                            Emitir Guía y Despachar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL EMISIÓN DE RÓTULO CON CÓDIGO DE BARRAS & QR */}
      {labelBatch && (
        <TraceabilityLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => {
            setIsLabelModalOpen(false);
            setLabelBatch(null);
          }}
          batch={labelBatch}
          variety={varieties.find(v => v.id === labelBatch.varietyId)}
          storagePoint={storagePoints.find(s => s.id === labelBatch.storagePointId)}
        />
      )}

      {/* MODAL LECTURA / ESCÁNER ÓPTICO Y LÁSER */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSelectBatch={(id) => {
          const b = seedBatches.find(x => x.id === id);
          if (b) {
            handleOpenView(b);
          }
        }}
      />

    </div>
  );
}
