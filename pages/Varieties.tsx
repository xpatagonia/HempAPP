import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Variety, UsageType } from '../types';
import { 
  Plus, Search, Tag, Edit2, Trash2, Sprout, AlertCircle, 
  X, Sparkles, BookOpen, Info, Loader2, Save, Archive,
  ShieldCheck, Award, FileCheck2, Droplets, Thermometer,
  Scale, Compass, Filter, CheckCircle2, FlaskConical, Globe2,
  ScanBarcode, QrCode, Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from '../components/BarcodeRenderer';
import { VarietyPassportModal } from '../components/VarietyPassportModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

const HEMPIT_CATALOG: Partial<Variety>[] = [
  { 
    name: 'Fedora 17', 
    usage: 'Dual' as UsageType, 
    cycleDays: 135, 
    expectedThc: 0.12, 
    expectedCbd: 1.4,
    expectedCbg: 0.15,
    chemotype: 'Fibra/Grano (<0.3% THC)',
    photoperiodType: 'Monoica',
    gddRequirement: 1850,
    waterNeedMm: 460,
    optimalSowingDensityKgHa: 45,
    thousandSeedWeightGr: 16.2,
    expectedFiberYieldTnHa: 8.2,
    expectedGrainYieldKgHa: 1100,
    oecdListing: true,
    breederName: 'CCPSC / Hemp-it ADN (Francia)',
    breederCountry: 'Francia',
    knowledgeBase: 'Variedad monoica muy versátil y precoz. Excelente equilibrio entre producción de semilla y fibra de alta calidad. Muy adaptada a latitudes templadas.' 
  },
  { 
    name: 'Felina 32', 
    usage: 'Fibra' as UsageType, 
    cycleDays: 140, 
    expectedThc: 0.14, 
    expectedCbd: 1.6,
    expectedCbg: 0.20,
    chemotype: 'Tipo V (Fibra industrial sin cannabinoides)',
    photoperiodType: 'Monoica',
    gddRequirement: 1950,
    waterNeedMm: 500,
    optimalSowingDensityKgHa: 50,
    thousandSeedWeightGr: 15.8,
    expectedFiberYieldTnHa: 9.1,
    expectedGrainYieldKgHa: 850,
    oecdListing: true,
    breederName: 'CCPSC / Hemp-it ADN (Francia)',
    breederCountry: 'Francia',
    knowledgeBase: 'Variedad monoica de referencia en Europa para fibra textil fina y resistente al encamado.' 
  },
  { 
    name: 'Futura 75', 
    usage: 'Fibra' as UsageType, 
    cycleDays: 155, 
    expectedThc: 0.18, 
    expectedCbd: 1.8,
    expectedCbg: 0.40,
    chemotype: 'Fibra/Grano (<0.3% THC)',
    photoperiodType: 'Monoica',
    gddRequirement: 2100,
    waterNeedMm: 560,
    optimalSowingDensityKgHa: 42,
    thousandSeedWeightGr: 18.0,
    expectedFiberYieldTnHa: 9.8,
    expectedGrainYieldKgHa: 1250,
    oecdListing: true,
    breederName: 'FNPC (Francia)',
    breederCountry: 'Francia',
    knowledgeBase: 'Máximo potencial de biomasa y paja seca (>3.5m de altura). Exige suelos profundos y buena dotación hídrica.' 
  },
  { 
    name: 'Santhica 27', 
    usage: 'Fibra' as UsageType, 
    cycleDays: 145, 
    expectedThc: 0.01, 
    expectedCbd: 0.05,
    expectedCbg: 2.80,
    chemotype: 'Tipo IV (CBG puro)',
    photoperiodType: 'Monoica',
    gddRequirement: 1920,
    waterNeedMm: 510,
    optimalSowingDensityKgHa: 48,
    thousandSeedWeightGr: 15.2,
    expectedFiberYieldTnHa: 7.8,
    expectedGrainYieldKgHa: 750,
    oecdListing: true,
    breederName: 'CCPSC / Hemp-it ADN (Francia)',
    breederCountry: 'Francia',
    knowledgeBase: 'Variedad zero-THC (<0.02%) seleccionada para CBG puro y celulosa de alta blancura. Óptima seguridad regulatoria.' 
  },
  { 
    name: 'Finola', 
    usage: 'Grano' as UsageType, 
    cycleDays: 95, 
    expectedThc: 0.15, 
    expectedCbd: 1.2,
    expectedCbg: 0.15,
    chemotype: 'Fibra/Grano (<0.3% THC)',
    photoperiodType: 'Dioica',
    gddRequirement: 1450,
    waterNeedMm: 380,
    optimalSowingDensityKgHa: 32,
    thousandSeedWeightGr: 13.5,
    expectedFiberYieldTnHa: 3.2,
    expectedGrainYieldKgHa: 1650,
    oecdListing: true,
    breederName: 'Finola Oy (Finlandia)',
    breederCountry: 'Finlandia',
    knowledgeBase: 'Variedad autofloreciente de porte bajo (1.2m) especializada en grano de consumo humano y aceite virgen.' 
  }
];

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export default function Varieties() {
  const { varieties, addVariety, updateVariety, deleteVariety, currentUser, suppliers, seedBatches } = useAppContext();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'regulatory' | 'agronomy'>('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<string>('all');
  const [selectedSupplierForImport, setSelectedSupplierForImport] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const [selectedVarietyForPassport, setSelectedVarietyForPassport] = useState<Variety | null>(null);

  const handleBarcodeScan = (scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();
    const foundVariety = varieties.find(v => 
      v.id.toLowerCase() === clean || 
      v.name.toLowerCase().includes(clean) ||
      (v.inaseRncNumber && v.inaseRncNumber.toLowerCase().includes(clean))
    );

    if (foundVariety) {
      setSearchTerm(foundVariety.name);
    } else {
      const foundBatch = seedBatches.find(b => 
        b.id.toLowerCase() === clean || 
        b.batchCode.toLowerCase().includes(clean) ||
        (b.labelSerialNumber && b.labelSerialNumber.toLowerCase().includes(clean))
      );
      if (foundBatch) {
        const v = varieties.find(va => va.id === foundBatch.varietyId);
        if (v) setSearchTerm(v.name);
      } else {
        setSearchTerm(scannedCode.trim());
      }
    }
  };

  const [formData, setFormData] = useState<Partial<Variety>>({
    name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0.12, 
    expectedCbg: 0.1, expectedCbd: 1.0, chemotype: 'Fibra/Grano (<0.3% THC)',
    photoperiodType: 'Monoica', gddRequirement: 1800, waterNeedMm: 450,
    optimalSowingDensityKgHa: 45, thousandSeedWeightGr: 16.0,
    expectedFiberYieldTnHa: 8.0, expectedGrainYieldKgHa: 900,
    inaseRncNumber: '', oecdListing: true, breederName: '', breederCountry: '',
    thcLabCertificate: '', thcLabName: '', notes: '', knowledgeBase: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.supplierId || isSaving) return;
    
    setIsSaving(true);
    try {
        const payload: Partial<Variety> = {
            name: formData.name.trim(),
            usage: formData.usage as UsageType,
            supplierId: formData.supplierId, 
            cycleDays: Number(formData.cycleDays) || 120,
            expectedThc: Number(formData.expectedThc) || 0,
            expectedCbg: Number(formData.expectedCbg) || 0,
            expectedCbd: Number(formData.expectedCbd) || 0,
            chemotype: formData.chemotype || 'Fibra/Grano (<0.3% THC)',
            photoperiodType: formData.photoperiodType || 'Monoica',
            gddRequirement: Number(formData.gddRequirement) || 1800,
            waterNeedMm: Number(formData.waterNeedMm) || 450,
            optimalSowingDensityKgHa: Number(formData.optimalSowingDensityKgHa) || 45,
            thousandSeedWeightGr: Number(formData.thousandSeedWeightGr) || 16,
            expectedFiberYieldTnHa: Number(formData.expectedFiberYieldTnHa) || 0,
            expectedGrainYieldKgHa: Number(formData.expectedGrainYieldKgHa) || 0,
            inaseRncNumber: formData.inaseRncNumber || '',
            oecdListing: Boolean(formData.oecdListing),
            breederName: formData.breederName || '',
            breederCountry: formData.breederCountry || '',
            thcLabCertificate: formData.thcLabCertificate || '',
            thcLabName: formData.thcLabName || '',
            notes: formData.notes || '',
            knowledgeBase: formData.knowledgeBase || ''
        };

        let success = false;
        if (editingId) {
            success = await updateVariety({ ...payload, id: editingId } as Variety);
        } else {
            success = await addVariety({ ...payload, id: generateId() } as Variety);
        }
        
        if (success) {
            closeModal();
        } else {
            alert("⚠️ Error: No se pudo grabar la variedad en el servidor.");
        }
    } catch (err) {
        alert("Fallo de conexión con el servidor de datos.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleHempITImport = async () => {
    if (!selectedSupplierForImport || isSaving) {
        alert("Selecciona un proveedor para asignar el catálogo.");
        return;
    }
    
    setIsSaving(true);
    let count = 0;
    try {
        for (const v of HEMPIT_CATALOG) {
            const exists = varieties.find(ex => ex.name.toLowerCase() === v.name?.toLowerCase());
            if (!exists) {
                const success = await addVariety({
                    ...v,
                    id: generateId(),
                    supplierId: selectedSupplierForImport,
                    notes: 'Importado de catálogo oficial HempIT France con perfil agronómico y OECD.'
                } as Variety);
                if (success) count++;
            }
        }
        setIsImportModalOpen(false);
        alert(`✅ Importación finalizada: ${count} nuevas genéticas añadidas con estándares internacionales.`);
    } finally {
        setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ 
      name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0.12,
      expectedCbg: 0.1, expectedCbd: 1.0, chemotype: 'Fibra/Grano (<0.3% THC)',
      photoperiodType: 'Monoica', gddRequirement: 1800, waterNeedMm: 450,
      optimalSowingDensityKgHa: 45, thousandSeedWeightGr: 16.0,
      expectedFiberYieldTnHa: 8.0, expectedGrainYieldKgHa: 900,
      inaseRncNumber: '', oecdListing: true, breederName: '', breederCountry: '',
      thcLabCertificate: '', thcLabName: '', notes: '', knowledgeBase: '' 
    });
    setEditingId(null);
    setModalTab('general');
  };

  const handleEdit = (v: Variety) => {
    setFormData(v);
    setEditingId(v.id);
    setModalTab('general');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const hasBatches = seedBatches.some(b => b.varietyId === id);
    if (hasBatches) {
        alert("No se puede eliminar esta variedad porque existen lotes de semillas en inventario vinculados.");
        return;
    }
    if (window.confirm('¿Estás seguro de eliminar esta variedad? Esto podría afectar parcelas y trazabilidad existente.')) {
      deleteVariety(id);
    }
  };

  const filtered = useMemo(() => {
    return varieties.filter(v => {
      const supplierName = suppliers.find(s => s.id === v.supplierId)?.name || '';
      const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (v.inaseRncNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchUsage = usageFilter === 'all' || v.usage === usageFilter;
      return matchSearch && matchUsage;
    });
  }, [varieties, searchTerm, usageFilter, suppliers]);

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Germoplasma & Trazabilidad Varietal
              </span>
              <span className="text-xs font-mono text-slate-400">· INASE / OECD / GACP</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 flex items-center gap-2.5">
              <Sprout className="text-emerald-500" size={28}/> 
              <span>Catálogo Genético & Registro de Cultivares</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Identificación botánica oficial, garantías quimiotípicas (&lt;0.3% THC) y requerimientos ecofisiológicos de cultivo.
            </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button 
                type="button"
                onClick={() => setIsScannerModalOpen(true)} 
                className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
                title="Escanear con Pistola Láser o Colector de Datos"
              >
                <ScanBarcode size={15} /> 
                <span>Escanear Código</span>
              </button>
              {isAdmin && (
                <>
                  <button 
                    type="button"
                    onClick={() => setIsImportModalOpen(true)} 
                    className="bg-sky-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-sky-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
                  >
                    <Sparkles size={15} /> 
                    <span>Importar HempIT</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setEditingId(null); setIsModalOpen(true); }} 
                    className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
                  >
                    <Plus size={15} /> 
                    <span>Nueva Genética</span>
                  </button>
                </>
              )}
          </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cultivar, obtentor, registro INASE o país..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto font-mono text-xs">
          <button
            type="button"
            onClick={() => setUsageFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              usageFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({varieties.length})
          </button>
          <button
            type="button"
            onClick={() => setUsageFilter('Fibra')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              usageFilter === 'Fibra'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            Fibra
          </button>
          <button
            type="button"
            onClick={() => setUsageFilter('Grano')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              usageFilter === 'Grano'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-amber-600'
            }`}
          >
            Grano
          </button>
          <button
            type="button"
            onClick={() => setUsageFilter('Dual')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              usageFilter === 'Dual'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-purple-600'
            }`}
          >
            Dual
          </button>
        </div>
      </div>

      {/* GRILLA DE CULTIVARES ENRIQUECIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
        {filtered.map(v => {
            const supplier = suppliers.find(s => s.id === v.supplierId);
            const linkedBatches = seedBatches.filter(b => b.varietyId === v.id);
            const totalKgInStock = linkedBatches.reduce((acc, b) => acc + (b.remainingQuantity || 0), 0);

            return (
              <div 
                key={v.id} 
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 hover:shadow-lg transition-all relative group flex flex-col justify-between"
              >
                 {isAdmin && (
                   <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => handleEdit(v)} 
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition"
                        title="Editar Cultivar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(v.id)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                   </div>
                 )}

                <div>
                  {/* BADGES REGULATORIOS */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 pr-10 text-[10px]">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold uppercase">
                      {v.usage}
                    </span>
                    {v.inaseRncNumber ? (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold" title="Inscripción INASE RNC">
                        {v.inaseRncNumber}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px]">
                        INASE s/d
                      </span>
                    )}
                    {v.oecdListing && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                        OECD / UE
                      </span>
                    )}
                    {v.photoperiodType && (
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                        {v.photoperiodType}
                      </span>
                    )}
                  </div>

                  {/* TÍTULO Y OBTENTOR */}
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {v.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {v.breederName ? `${v.breederName} (${v.breederCountry || 'INT'})` : supplier?.name || 'Origen Institucional'}
                  </p>

                  {/* MATRIZ DE CANNABINOIDES & CERTIFICACIÓN */}
                  <div className="grid grid-cols-3 gap-2 my-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">THC Límite</span>
                        <strong className="text-xs text-slate-800 dark:text-slate-200">
                          {v.expectedThc !== undefined ? `< ${v.expectedThc}%` : '< 0.3%'}
                        </strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">CBG Nativo</span>
                        <strong className="text-xs text-emerald-600 dark:text-emerald-400">
                          {v.expectedCbg ? `${v.expectedCbg}%` : '-'}
                        </strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">Ciclo Días</span>
                        <strong className="text-xs text-sky-600 dark:text-sky-400">
                          {v.cycleDays} d
                        </strong>
                    </div>
                  </div>

                  {/* PARÁMETROS ECOFISIOLÓGICOS */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Thermometer size={12} className="text-amber-500" />
                        <span>Suma Térmica (GDD):</span>
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200">{v.gddRequirement || 1850} °C d</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Droplets size={12} className="text-sky-500" />
                        <span>Demanda Hídrica:</span>
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200">{v.waterNeedMm || 450} mm/ciclo</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Scale size={12} className="text-purple-500" />
                        <span>Rinde Fibra Proyectado:</span>
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200">{v.expectedFiberYieldTnHa || 7.5} Tn/ha</strong>
                    </div>
                  </div>

                  {/* PROTOCOLO HPLC */}
                  {v.thcLabCertificate && (
                    <div className="mt-3 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-[10px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <FlaskConical size={12} />
                        <span>CoA HPLC: {v.thcLabCertificate}</span>
                      </span>
                      <span className="font-bold">&lt;0.3% OK</span>
                    </div>
                  )}

                  {/* FICHA TÉCNICA RESUMEN */}
                  {v.knowledgeBase && (
                      <div className="mt-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                              "{v.knowledgeBase}"
                          </p>
                      </div>
                  )}
                </div>
                
                {/* FOOTER: STOCK Y ACCESO */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Stock en Nodos</span>
                      <strong className="text-xs text-slate-800 dark:text-slate-200">
                        {totalKgInStock.toLocaleString()} kg ({linkedBatches.length} lotes)
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                          type="button"
                          onClick={() => {
                            setSelectedVarietyForPassport(v);
                            setIsPassportModalOpen(true);
                          }}
                          className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center hover:bg-emerald-100 transition shadow gap-1"
                          title="Emitir Pasaporte Fitotécnico con Barras y QR"
                      >
                          <ScanBarcode size={13} />
                          <span>Pasaporte QR</span>
                      </button>
                      <button 
                          type="button"
                          onClick={() => navigate(`/seed-batches?variety=${v.name}`)}
                          className="bg-slate-900 dark:bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center hover:scale-105 transition shadow gap-1"
                      >
                          <Archive size={12} />
                          <span>Ver Lotes</span>
                      </button>
                    </div>
                </div>
              </div>
            );
        })}
      </div>

      {/* MODAL IMPORTACIÓN HempIT */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 font-mono">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center">
                            <Sparkles size={20}/>
                          </div>
                          <div>
                              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">HempIT France & OECD</h2>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Catálogo Oficial con Rótulo Europeo</p>
                          </div>
                      </div>
                      <button onClick={() => !isSaving && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600" disabled={isSaving}><X size={20}/></button>
                  </div>

                  <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Vincular al Proveedor Homologado *</label>
                          <select 
                            className={inputClass} 
                            value={selectedSupplierForImport} 
                            onChange={e => setSelectedSupplierForImport(e.target.value)}
                            disabled={isSaving}
                          >
                              <option value="">-- Seleccionar Proveedor --</option>
                              {suppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.country || 'ARG'})</option>
                              ))}
                          </select>
                          <p className="text-[9px] text-slate-400 mt-2">
                            * Se importarán Fedora 17, Felina 32, Futura 75, Santhica 27 y Finola con sus fichas técnicas completas y requerimientos ecofisiológicos.
                          </p>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={handleHempITImport}
                        disabled={!selectedSupplierForImport || isSaving}
                        className="w-full bg-sky-600 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-sky-500 transition-all disabled:opacity-30 flex items-center justify-center"
                      >
                          {isSaving ? <Loader2 className="animate-spin mr-2" size={16}/> : null}
                          Confirmar Importación Oficial
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CREAR / EDITAR CULTIVAR ENRIQUECIDO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1">
                  <Sprout size={12} />
                  <span>{editingId ? 'Editar Cultivar' : 'Nueva Variedad Certificada'}</span>
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                  {formData.name || 'Identificación de Germoplasma'}
                </h2>
              </div>
              <button onClick={() => !isSaving && closeModal()} disabled={isSaving} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* PESTAÑAS DEL FORMULARIO */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 text-xs font-bold uppercase">
              <button
                type="button"
                onClick={() => setModalTab('general')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  modalTab === 'general' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1. Datos Básicos
              </button>
              <button
                type="button"
                onClick={() => setModalTab('regulatory')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  modalTab === 'regulatory' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2. Regulación & Quimiotipo
              </button>
              <button
                type="button"
                onClick={() => setModalTab('agronomy')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  modalTab === 'agronomy' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                3. Ecofisiología & Manejo
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* TAB 1: DATOS BÁSICOS */}
              {modalTab === 'general' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial del Cultivar *</label>
                      <input required disabled={isSaving} type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: USO 31" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proveedor / Semillero Homologado *</label>
                      <select required disabled={isSaving} className={inputClass} value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                          <option value="">Seleccionar Proveedor...</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.country || 'ARG'})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Uso Agronómico Principal</label>
                      <select disabled={isSaving} className={inputClass} value={formData.usage} onChange={e => setFormData({...formData, usage: e.target.value as UsageType})}>
                        <option value="Fibra">Fibra Industrial (Tallo)</option>
                        <option value="Grano">Grano (Food / Aceite)</option>
                        <option value="Dual">Doble Propósito (Dual)</option>
                        <option value="Medicinal">Fitoquímicos / CBG</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fotoperíodo / Sexo</label>
                      <select disabled={isSaving} className={inputClass} value={formData.photoperiodType || 'Monoica'} onChange={e => setFormData({...formData, photoperiodType: e.target.value as any})}>
                        <option value="Monoica">Monoica (Flores M y H)</option>
                        <option value="Dioica">Dioica (Plantas separadas)</option>
                        <option value="Autofloreciente">Autofloreciente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Días de Ciclo Estimados</label>
                      <input disabled={isSaving} type="number" className={inputClass} value={formData.cycleDays} onChange={e => setFormData({...formData, cycleDays: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Obtentor / Criadero Original</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.breederName || ''} onChange={e => setFormData({...formData, breederName: e.target.value})} placeholder="Ej: Glukhov Bast Crops Institute" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">País de Origen</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.breederCountry || ''} onChange={e => setFormData({...formData, breederCountry: e.target.value})} placeholder="Ej: Ucrania, Francia, etc." />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REGULACIÓN & QUIMIOTIPO */}
              {modalTab === 'regulatory' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° Registro INASE RNC (Argentina)</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.inaseRncNumber || ''} onChange={e => setFormData({...formData, inaseRncNumber: e.target.value})} placeholder="Ej: INASE-RNC-8492/23" />
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input 
                          type="checkbox" 
                          checked={formData.oecdListing || false} 
                          onChange={e => setFormData({...formData, oecdListing: e.target.checked})} 
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-300">Inscrita en Catálogo Común Europeo / OECD</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">% THC Garantizado (&lt;0.3%)</label>
                      <input disabled={isSaving} type="number" step="0.01" className={inputClass} value={formData.expectedThc} onChange={e => setFormData({...formData, expectedThc: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">% CBG Esperado</label>
                      <input disabled={isSaving} type="number" step="0.01" className={inputClass} value={formData.expectedCbg || 0} onChange={e => setFormData({...formData, expectedCbg: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">% CBD Esperado</label>
                      <input disabled={isSaving} type="number" step="0.01" className={inputClass} value={formData.expectedCbd || 0} onChange={e => setFormData({...formData, expectedCbd: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° Protocolo / Certificado HPLC</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.thcLabCertificate || ''} onChange={e => setFormData({...formData, thcLabCertificate: e.target.value})} placeholder="Ej: HPLC-LAB-INTA-2025-089" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Laboratorio de Cromatografía</label>
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.thcLabName || ''} onChange={e => setFormData({...formData, thcLabName: e.target.value})} placeholder="Ej: Laboratorio INTA / Cannatech" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ECOFISIOLOGÍA & MANEJO */}
              {modalTab === 'agronomy' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Suma Térmica (GDD °C día)</label>
                      <input disabled={isSaving} type="number" className={inputClass} value={formData.gddRequirement || 1850} onChange={e => setFormData({...formData, gddRequirement: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Demanda Hídrica Ciclo (mm)</label>
                      <input disabled={isSaving} type="number" className={inputClass} value={formData.waterNeedMm || 450} onChange={e => setFormData({...formData, waterNeedMm: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Densidad Sugerida (kg/ha)</label>
                      <input disabled={isSaving} type="number" className={inputClass} value={formData.optimalSowingDensityKgHa || 45} onChange={e => setFormData({...formData, optimalSowingDensityKgHa: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Peso Mil Semillas (PMS gr)</label>
                      <input disabled={isSaving} type="number" step="0.1" className={inputClass} value={formData.thousandSeedWeightGr || 16} onChange={e => setFormData({...formData, thousandSeedWeightGr: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rinde Fibra Proyectado (Tn/ha)</label>
                      <input disabled={isSaving} type="number" step="0.1" className={inputClass} value={formData.expectedFiberYieldTnHa || 8.0} onChange={e => setFormData({...formData, expectedFiberYieldTnHa: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rinde Grano Proyectado (kg/ha)</label>
                      <input disabled={isSaving} type="number" className={inputClass} value={formData.expectedGrainYieldKgHa || 1000} onChange={e => setFormData({...formData, expectedGrainYieldKgHa: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base de Conocimiento Agronómico & Protocolos de Manejo</label>
                    <textarea disabled={isSaving} className={inputClass} rows={3} value={formData.knowledgeBase || ''} onChange={e => setFormData({...formData, knowledgeBase: e.target.value})} placeholder="Recomendaciones de profundidad de siembra, rotación edáfica, control de malezas y corte..."></textarea>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">
                  {modalTab === 'general' ? 'Paso 1 de 3: Identificación' : modalTab === 'regulatory' ? 'Paso 2 de 3: Legalidad' : 'Paso 3 de 3: Manejo'}
                </div>
                <div className="flex space-x-2">
                  <button type="button" disabled={isSaving} onClick={closeModal} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow flex items-center hover:bg-emerald-500 transition">
                      {isSaving ? <Loader2 className="animate-spin mr-2" size={15}/> : <Save className="mr-2" size={15}/>}
                      {isSaving ? 'Guardando...' : 'Guardar Cultivar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EMISIÓN DE PASAPORTE FITOTÉCNICO Y RÓTULO QR */}
      {selectedVarietyForPassport && (
        <VarietyPassportModal 
          isOpen={isPassportModalOpen}
          onClose={() => {
            setIsPassportModalOpen(false);
            setSelectedVarietyForPassport(null);
          }}
          variety={selectedVarietyForPassport}
          batches={seedBatches.filter(b => b.varietyId === selectedVarietyForPassport.id)}
        />
      )}

      {/* MODAL DE ESCANEO DE CÓDIGO DE BARRAS / QR */}
      <BarcodeScannerModal 
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSelectBatch={handleBarcodeScan}
      />
    </div>
  );
}
