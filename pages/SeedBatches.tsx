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
  FileCheck, ShieldAlert, Layers, QrCode, Users, ChevronRight
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics'>((searchParams.get('tab') as any) || 'inventory');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'batches' | 'warehouses'>('batches');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('variety') || '');
  const [filterStatus, setFilterStatus] = useState('');

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [labelBatch, setLabelBatch] = useState<SeedBatch | null>(null);

  const supplierInspections = useMemo<SupplierLotInspection[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ht_supplier_inspections');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return DEMO_SUPPLIER_INSPECTIONS;
  }, [isBatchModalOpen, isViewModalOpen]);
  
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
    isActive: true,
    labelSerialNumber: '', 
    category: 'C1', 
    certificationNumber: '', 
    gs1Code: '', 
    analysisDate: '', 
    germinationExpiryDate: '',
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
      const grouped: Record<string, { storage: any, items: Record<string, number>, totalKg: number }> = {};

      filteredBatches.forEach(b => {
          if (b.remainingQuantity <= 0.001) return;
          
          const sp = storagePoints.find(s => s.id === b.storagePointId);
          const spId = sp ? sp.id : 'unknown';
          const varietyName = varieties.find(v => v.id === b.varietyId)?.name || 'Genética S/D';

          if (!grouped[spId]) {
              grouped[spId] = {
                  storage: sp,
                  items: {},
                  totalKg: 0
              };
          }

          if (!grouped[spId].items[varietyName]) {
              grouped[spId].items[varietyName] = 0;
          }

          grouped[spId].items[varietyName] += b.remainingQuantity;
          grouped[spId].totalKg += b.remainingQuantity;
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

  // Desglose de Métricas de Stock por Tipo Biológico
  const stats = useMemo(() => {
      const totalKg = filteredBatches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const seedKg = filteredBatches.filter(b => (b.materialType || 'seed') === 'seed').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const grainKg = filteredBatches.filter(b => b.materialType === 'harvested_grain').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const fiberBalesKg = filteredBatches.filter(b => b.materialType === 'fiber_bales').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const biomassKg = filteredBatches.filter(b => b.materialType === 'biomass_cbg').reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);
      const activeTransits = filteredMovements.filter(m => m.status === 'En Tránsito').length;
      return { totalKg, seedKg, grainKg, fiberBalesKg, biomassKg, activeTransits };
  }, [filteredBatches, filteredMovements]);

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

  const handleBatchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchFormData.varietyId || !batchFormData.batchCode || (calculatedEntryKg <= 0.000001 && !editingBatchId) || isSubmitting) {
          alert("Por favor complete los campos obligatorios y asegure que la masa sea mayor a 0.");
          return;
      }
      setIsSubmitting(true);
      try {
          const { inputValue, supplierId, ...baseData } = batchFormData;
          
          const payload: SeedBatch = { 
            ...baseData, 
            id: editingBatchId || generateId(), 
            initialQuantity: Number(calculatedEntryKg.toFixed(3)),
            remainingQuantity: editingBatchId 
                ? Number(Number(batchFormData.remainingQuantity || 0).toFixed(3)) 
                : Number(calculatedEntryKg.toFixed(3)), 
            pricePerKg: Number(batchFormData.pricePerKg || 0), 
            isActive: true, 
            createdAt: batchFormData.createdAt || new Date().toISOString() 
          };
          
          let success = editingBatchId ? await updateSeedBatch(payload) : await addSeedBatch(payload);
          if (success) { 
              setIsBatchModalOpen(false); 
              setEditingBatchId(null); 
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
              Trazabilidad integral: desde el lote de semilla fiscalizada hasta el grano, fibra en fardos y biomasa acopiada.
            </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                  setEditingBatchId(null); 
                  setEntryUnit('kg'); 
                  setBatchFormData({ 
                    materialType: 'seed',
                    varietyId: '', 
                    supplierId: '', 
                    batchCode: '', 
                    initialQuantity: 0, 
                    inputValue: 0, 
                    purchaseDate: new Date().toISOString().split('T')[0], 
                    pricePerKg: 0, 
                    storagePointId: '', 
                    isActive: true,
                    labelSerialNumber: '',
                    category: 'C1',
                    germination: 90,
                    purity: 99,
                    originCampaign: '2025/2026'
                  }); 
                  setIsBatchModalOpen(true); 
                }} 
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <Plus size={15} /> 
                <span>Ingresar Material</span>
              </button>
          </div>
        )}
      </div>

      {/* METRIC CARDS POR TIPO BIOLÓGICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Semilla Fiscalizada" 
            value={`${stats.seedKg.toLocaleString(undefined, {maximumFractionDigits: 0})} kg`} 
            subtext="Rótulo INASE / Germ. >85%"
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
          <div className="space-y-4 font-mono">
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
                                  <th className="px-6 py-4 text-right">Existencias</th>
                                  <th className="px-6 py-4 text-right">Acción & QR</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                              {filteredBatches.length === 0 ? (
                                  <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">No se hallaron materiales biológicos con los filtros seleccionados.</td></tr>
                              ) : filteredBatches.map(batch => {
                                  const v = varieties.find(v => v.id === batch.varietyId);
                                  const sp = storagePoints.find(s => s.id === batch.storagePointId);
                                  const matMeta = getMaterialLabel(batch.materialType);
                                  const displayQty = Number(batch.remainingQuantity.toFixed(2));
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
                                              <div className="text-[9px] text-slate-400">{v?.usage || 'Fibra'} · {v?.breederCountry || 'ARG'}</div>
                                              <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px]">
                                                {matchedInsp && (
                                                  <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                                    Inspección: {matchedInsp.lotNumber}
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
                                                  PG: {batch.germination || 90}% · Pureza: {batch.purity || 99}% · Cat {batch.category || 'C1'}
                                                </span>
                                              )}
                                              <span className="text-[9px] text-slate-500 block mt-0.5">
                                                Muestreo: <strong>{batch.samplerName || matchedInsp?.samplerName || 'Matias QUINTANA'}</strong> · Aud: <strong>{batch.inspectorName || matchedInsp?.agronomistName || 'Ing. J. PIZARRO'}</strong>
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <span className={`px-3 py-1 rounded-xl text-xs font-black inline-block ${
                                                batch.remainingQuantity <= 0.001 
                                                  ? 'bg-slate-100 text-slate-400' 
                                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                              }`}>
                                                {displayQty.toLocaleString()} kg
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end space-x-1">
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
                                                        onClick={() => { setBatchFormData({...batch, inputValue: batch.initialQuantity}); setEditingBatchId(batch.id); setIsBatchModalOpen(true); }} 
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {stockByWarehouse.map(({ storage, items, totalKg }, idx) => (
                          <div key={storage?.id || idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                              <div>
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                          <Warehouse size={18} />
                                      </div>
                                      <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                                          {totalKg.toLocaleString()} kg
                                      </span>
                                  </div>
                                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                      {storage?.name || 'Almacén Central'}
                                  </h3>
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                      {storage?.address || 'Ubicación registrada'} · {storage?.city || ''}
                                  </p>

                                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                      {Object.entries(items).map(([name, qty]) => (
                                          <div key={name} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                              <span className="truncate max-w-[180px]">{name}:</span>
                                              <strong className="text-slate-900 dark:text-white">{qty.toLocaleString()} kg</strong>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                                  <span>Capacidad: {storage?.totalCapacityTn || 450} Tn</span>
                                  <span className="text-emerald-500 font-bold">GACP Aprobado</span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      ) : (
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
      )}

      {/* MODAL ALTA / EDICIÓN DE MATERIAL BIOLÓGICO */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1">
                  <Package size={12} />
                  <span>{editingBatchId ? 'Modificar Material' : 'Ingreso de Material a Custodia'}</span>
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                  {batchFormData.batchCode || 'Nuevo Lote Biológico'}
                </h2>
              </div>
              <button onClick={() => !isSubmitting && setIsBatchModalOpen(false)} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4">
              
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

              {/* IDENTIFICACIÓN DEL LOTE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Código del Lote *</label>
                  <input required disabled={isSubmitting} type="text" className={inputClass} value={batchFormData.batchCode} onChange={e => setBatchFormData({...batchFormData, batchCode: e.target.value.toUpperCase()})} placeholder="Ej: USO31-C1-2025-01" />
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

              {/* PARÁMETROS ESPECÍFICOS SEGÚN MATERIAL */}
              {batchFormData.materialType === 'seed' && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h4 className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">Certificación INASE, Inspección de Recepción & Calidad</h4>
                    <select
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] font-bold text-purple-700 dark:text-purple-300"
                      value={batchFormData.originInspectionId || ''}
                      onChange={e => {
                        const insp = supplierInspections.find(i => i.id === e.target.value);
                        if (insp) {
                          setBatchFormData({
                            ...batchFormData,
                            originInspectionId: insp.id,
                            batchCode: batchFormData.batchCode || insp.lotNumber,
                            varietyId: insp.varietyId || batchFormData.varietyId,
                            supplierId: insp.supplierId || batchFormData.supplierId,
                            germination: insp.germinationTestedPct || batchFormData.germination,
                            purity: insp.purityPct || batchFormData.purity,
                            qualityGrade: insp.qualityGrade || 'GRADO_A_SUPERIOR',
                            qualityScore: insp.qualityScore || 96,
                            samplerName: insp.samplerName || 'Matias QUINTANA',
                            samplerMatricula: insp.samplerDniOrMatricula || 'TEC-MUESTREO-ISTA-108',
                            sampleCode: insp.sampleCode || `MUE-${insp.lotNumber}`,
                            inspectorName: insp.agronomistName || 'Ing. Agr. Julian PIZARRO',
                            inspectorMatricula: insp.agronomistMatricula || 'MP-AGRO-1492 CH'
                          });
                        } else {
                          setBatchFormData({ ...batchFormData, originInspectionId: '' });
                        }
                      }}
                    >
                      <option value="">Vincular Acta de Inspección Técnica de Lote...</option>
                      {supplierInspections.map(i => (
                        <option key={i.id} value={i.id}>
                          Acta {i.lotNumber} · {i.supplierName} ({i.qualityGrade || 'Grado A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelClass}>Serie Rótulo INASE</label>
                      <input type="text" className={inputClass} value={batchFormData.labelSerialNumber || ''} onChange={e => setBatchFormData({...batchFormData, labelSerialNumber: e.target.value})} placeholder="INASE-ROT-8921-A" />
                    </div>
                    <div>
                      <label className={labelClass}>Categoría Fiscal</label>
                      <select className={inputClass} value={batchFormData.category || 'C1'} onChange={e => setBatchFormData({...batchFormData, category: e.target.value})}>
                        <option value="Original">Original</option>
                        <option value="Base">Base / Prebásica</option>
                        <option value="C1">Certificada 1° (C1)</option>
                        <option value="C2">Certificada 2° (C2)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Poder Germinativo (%)</label>
                      <input type="number" className={inputClass} value={batchFormData.germination || 90} onChange={e => setBatchFormData({...batchFormData, germination: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className={labelClass}>Pureza Físico-Botánica (%)</label>
                      <input type="number" step="0.1" className={inputClass} value={batchFormData.purity || 99} onChange={e => setBatchFormData({...batchFormData, purity: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              )}

              {batchFormData.materialType !== 'seed' && (
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
              )}

              {/* PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD */}
              <div className="bg-purple-50/40 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Users size={13} />
                  <span>Personal Interviniente en Toma de Muestras y Cadena de Custodia</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={labelClass}>Responsable Toma de Muestra</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={batchFormData.samplerName || ''}
                      onChange={e => setBatchFormData({ ...batchFormData, samplerName: e.target.value })}
                      placeholder="Matias QUINTANA"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Código Muestra / Precinto</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={batchFormData.sampleCode || ''}
                      onChange={e => setBatchFormData({ ...batchFormData, sampleCode: e.target.value })}
                      placeholder="MUE-ISTA-2026-01"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Agrónomo Certificante</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={batchFormData.inspectorName || ''}
                      onChange={e => setBatchFormData({ ...batchFormData, inspectorName: e.target.value })}
                      placeholder="Ing. Agr. Julian PIZARRO"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Responsable Siembra / Cosecha</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={batchFormData.harvestResponsibleName || batchFormData.sowingResponsibleName || ''}
                      onChange={e => setBatchFormData({ ...batchFormData, harvestResponsibleName: e.target.value, sowingResponsibleName: e.target.value })}
                      placeholder="Gastón BAREA M."
                    />
                  </div>
                </div>
              </div>

              {/* MASA Y UNIDADES */}
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

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" disabled={isSubmitting} onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow flex items-center hover:bg-emerald-500 transition">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" size={15}/> : <Save className="mr-2" size={15}/>}
                  {editingBatchId ? 'Actualizar Material' : 'Ingresar a Inventario'}
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
                  <strong className="text-slate-900 dark:text-white">{Number(selectedBatch.remainingQuantity.toFixed(2)).toLocaleString()} kg</strong>
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
