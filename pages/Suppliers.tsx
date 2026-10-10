import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Supplier, SupplierCategory, TechnicalHomologationStatus, 
  SupplierLotInspection, AgronomicInspectionVerdict 
} from '../types';
import { DEMO_SUPPLIER_INSPECTIONS } from '../src/data/initialDemoData';
import { 
  Plus, Edit2, Trash2, MapPin, Mail, 
  Search, Save, Loader2, X, Briefcase, Truck, Sprout,
  ShieldCheck, CheckCircle2, AlertTriangle, Award, FlaskConical, 
  ExternalLink, Printer, Check, Copy, FileText, ChevronRight,
  Filter, CheckSquare, Phone, Globe, Microscope, Droplets,
  Scale, ClipboardCheck, ArrowUpDown, Sparkles, Building2,
  Calendar, UserCheck, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from '../components/BarcodeRenderer';

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
    currentUser, varieties, seedBatches 
  } = useAppContext();
  const navigate = useNavigate();

  // Tabs de navegación de la sección agronómica
  const [activeMainTab, setActiveMainTab] = useState<'suppliers' | 'inspections' | 'vademecum'>('suppliers');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedSupplierForAudit, setSelectedSupplierForAudit] = useState<Supplier | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalTab, setModalTab] = useState<'technical' | 'regulatory' | 'quality' | 'logistics'>('technical');

  // Modal para Inspecciones de Lotes
  const [isNewInspectionModalOpen, setIsNewInspectionModalOpen] = useState(false);
  const [selectedInspectionForView, setSelectedInspectionForView] = useState<SupplierLotInspection | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterHomologation, setFilterHomologation] = useState<string>('all');
  const [filterVerdict, setFilterVerdict] = useState<string>('all');

  // Inspecciones de Lote con persistencia en localStorage
  const [lotInspections, setLotInspections] = useState<SupplierLotInspection[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ht_supplier_inspections');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
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
    inaseRncyfsNumber: '', senasaRegisterNumber: '', ariccameLicenseNumber: '',
    homologationStatus: 'Homologado_Conforme',
    technicalSpecialty: '', activeIngredientsProvided: [], batchReturnWarrantyDays: 60,
    lat: '', lng: '',
    audit: {
      technicalAgronomistName: 'Ing. Agr. Lucas Berardi',
      technicalAgronomistMatricula: 'MP-AGRO-3321 MZA',
      lastAuditDate: new Date().toISOString().split('T')[0],
      auditScore: 95,
      bpaCertified: true,
      gacpCertified: true,
      organicCertified: false,
      zeroResidueGuarantee: true,
      labAccreditationStandard: ''
    }
  });

  // Formulario de Nueva Inspección de Lote
  const [newInspectionData, setNewInspectionData] = useState<Partial<SupplierLotInspection>>({
    supplierId: suppliers[0]?.id || 'sup-1',
    supplierName: suppliers[0]?.name || 'BioGenética Andina & Semillas Certificadas',
    date: new Date().toISOString().split('T')[0],
    inputCategory: 'Semilla C1/C2',
    lotNumber: '',
    guideOrRemitoNumber: '',
    germinationDeclaredPct: 90,
    germinationTestedPct: 92,
    purityPct: 99.5,
    moisturePct: 9.0,
    weedSeedsFound: false,
    pathogenScreeningResult: 'Negativo (Conforme)',
    residueStatus: 'Cero Residuos / Orgánico',
    verdict: 'APROBADO_CAMPO',
    agronomistName: currentUser?.name || 'Ing. Agr. Lucas Berardi',
    agronomistMatricula: 'MP-AGRO-3321 MZA',
    observations: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

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

  // Proveedores filtrados
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.legalName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.inaseRncyfsNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.senasaRegisterNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.technicalSpecialty || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'all' || s.category === filterCategory;
      const matchHomologation = filterHomologation === 'all' || (s.homologationStatus || 'Homologado_Conforme') === filterHomologation;
      return matchSearch && matchCategory && matchHomologation;
    });
  }, [suppliers, searchTerm, filterCategory, filterHomologation]);

  // Inspecciones filtradas
  const filteredInspections = useMemo(() => {
    return lotInspections.filter(i => {
      const matchSearch = i.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.guideOrRemitoNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.agronomistName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchVerdict = filterVerdict === 'all' || i.verdict === filterVerdict;
      return matchSearch && matchVerdict;
    });
  }, [lotInspections, searchTerm, filterVerdict]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
      const finalLat = parseFloat((formData.lat || '').replace(',', '.'));
      const finalLng = parseFloat((formData.lng || '').replace(',', '.'));
      const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : undefined;

      const payload: Supplier = {
        id: editingId || generateId('sup'),
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

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspectionData.lotNumber || !newInspectionData.supplierId) {
      alert("Por favor indique el N° de Lote y seleccione un proveedor homologado.");
      return;
    }

    const matchedSup = suppliers.find(s => s.id === newInspectionData.supplierId);

    const inspection: SupplierLotInspection = {
      id: generateId('insp'),
      supplierId: newInspectionData.supplierId!,
      supplierName: matchedSup?.name || newInspectionData.supplierName || 'Proveedor Homologado',
      date: newInspectionData.date || new Date().toISOString().split('T')[0],
      inputCategory: newInspectionData.inputCategory || 'Semilla C1/C2',
      lotNumber: newInspectionData.lotNumber!.trim().toUpperCase(),
      guideOrRemitoNumber: newInspectionData.guideOrRemitoNumber?.trim() || undefined,
      germinationDeclaredPct: Number(newInspectionData.germinationDeclaredPct) || undefined,
      germinationTestedPct: Number(newInspectionData.germinationTestedPct) || undefined,
      purityPct: Number(newInspectionData.purityPct) || undefined,
      moisturePct: Number(newInspectionData.moisturePct) || undefined,
      weedSeedsFound: Boolean(newInspectionData.weedSeedsFound),
      pathogenScreeningResult: newInspectionData.pathogenScreeningResult || 'Negativo (Conforme)',
      residueStatus: newInspectionData.residueStatus || 'Cero Residuos / Orgánico',
      verdict: newInspectionData.verdict || 'APROBADO_CAMPO',
      agronomistName: newInspectionData.agronomistName?.trim() || 'Ing. Agr. Lucas Berardi',
      agronomistMatricula: newInspectionData.agronomistMatricula?.trim() || 'MP-AGRO-3321 MZA',
      observations: newInspectionData.observations?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    setLotInspections(prev => [inspection, ...prev]);
    setIsNewInspectionModalOpen(false);

    // Reset inspection modal form
    setNewInspectionData({
      supplierId: suppliers[0]?.id || 'sup-1',
      supplierName: suppliers[0]?.name || '',
      date: new Date().toISOString().split('T')[0],
      inputCategory: 'Semilla C1/C2',
      lotNumber: '',
      guideOrRemitoNumber: '',
      germinationDeclaredPct: 90,
      germinationTestedPct: 92,
      purityPct: 99.5,
      moisturePct: 9.0,
      weedSeedsFound: false,
      pathogenScreeningResult: 'Negativo (Conforme)',
      residueStatus: 'Cero Residuos / Orgánico',
      verdict: 'APROBADO_CAMPO',
      agronomistName: currentUser?.name || 'Ing. Agr. Lucas Berardi',
      agronomistMatricula: 'MP-AGRO-3321 MZA',
      observations: ''
    });
  };

  const resetForm = () => {
    setFormData({ 
      name: '', category: 'Semillero_Criadero', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
      whatsapp: '', email: '', website: '', notes: '', isOfficialPartner: true,
      inaseRncyfsNumber: '', senasaRegisterNumber: '', ariccameLicenseNumber: '',
      homologationStatus: 'Homologado_Conforme',
      technicalSpecialty: '', activeIngredientsProvided: [], batchReturnWarrantyDays: 60,
      lat: '', lng: '',
      audit: {
        technicalAgronomistName: 'Ing. Agr. Lucas Berardi',
        technicalAgronomistMatricula: 'MP-AGRO-3321 MZA',
        lastAuditDate: new Date().toISOString().split('T')[0],
        auditScore: 95,
        bpaCertified: true,
        gacpCertified: true,
        organicCertified: false,
        zeroResidueGuarantee: true,
        labAccreditationStandard: ''
      }
    });
    setEditingId(null);
    setModalTab('technical');
  };

  const handleEdit = (s: Supplier) => {
    setFormData({
      ...s,
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
            onClick={() => setIsNewInspectionModalOpen(true)}
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
                        title="Editar Ficha Técnica"
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
                            {linkedVarieties.length} Genéticas
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

                  {/* FOOTER ACCIONES: DICTAMEN TÉCNICO */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      {s.audit?.technicalAgronomistName ? (
                        <span className="text-[9px] text-slate-400 block truncate" title={s.audit.technicalAgronomistName}>
                          Auditor: {s.audit.technicalAgronomistName}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 block">
                          Garantía Lote: {s.batchReturnWarrantyDays || 60} días
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedSupplierForAudit(s);
                          setIsAuditModalOpen(true);
                        }}
                        className="bg-slate-900 dark:bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center hover:scale-105 transition shadow gap-1"
                      >
                        <FileText size={12} />
                        <span>Dictamen Técnico</span>
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
                placeholder="Buscar por lote, proveedor, N° remito o agrónomo..." 
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
                onClick={() => setIsNewInspectionModalOpen(true)}
                className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-purple-500 transition shadow font-bold text-xs uppercase tracking-wider gap-1.5"
              >
                <Plus size={15} />
                <span>Registrar Ensayo de Lote</span>
              </button>
            </div>
          </div>

          {/* TABLA AGRONÓMICA DE INSPECCIONES */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Microscope size={18} className="text-purple-600" />
                  <span>Ensayos Fisiológicos & Control Fitosanitario a la Recepción</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Comparación marbete INASE vs test en cámara, screening de patógenos y verificación de LMR SENASA.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {filteredInspections.length} ensayos registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Lote / Insumo</th>
                    <th className="py-3 px-4">Proveedor Homologado</th>
                    <th className="py-3 px-4 text-center">P. Germinativo (Real vs Marbete)</th>
                    <th className="py-3 px-4 text-center">Pureza / Humedad</th>
                    <th className="py-3 px-4">Sanidad & Residuos</th>
                    <th className="py-3 px-4 text-center">Veredicto Fitosanitario</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInspections.map(insp => {
                    const verdictCfg = VERDICT_CONFIG[insp.verdict] || VERDICT_CONFIG['APROBADO_CAMPO'];
                    const VIcon = verdictCfg.icon;

                    const pgDiff = (insp.germinationTestedPct && insp.germinationDeclaredPct)
                      ? insp.germinationTestedPct - insp.germinationDeclaredPct
                      : null;

                    return (
                      <tr key={insp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <strong className="font-mono text-slate-900 dark:text-white font-black block">
                            {insp.lotNumber}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">
                            {insp.inputCategory} · {insp.date}
                          </span>
                          {insp.guideOrRemitoNumber && (
                            <span className="text-[9px] text-purple-600 font-mono block">
                              Remito: {insp.guideOrRemitoNumber}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <strong className="text-slate-800 dark:text-slate-200 block text-xs">
                            {insp.supplierName}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">
                            Auditor: {insp.agronomistName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {insp.germinationTestedPct ? (
                            <div>
                              <div className="flex items-center justify-center gap-1.5 font-bold">
                                <span className="text-sm font-black text-emerald-600 font-mono">
                                  {insp.germinationTestedPct}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  / {insp.germinationDeclaredPct || 90}%
                                </span>
                              </div>
                              {pgDiff !== null && (
                                <span className={`text-[9px] font-bold ${pgDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {pgDiff >= 0 ? `+${pgDiff}% vigor extra` : `${pgDiff}% bajo marbete`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">No aplica (Insumo)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          {insp.purityPct ? (
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {insp.purityPct}% Pureza
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {insp.moisturePct ? `${insp.moisturePct}% H°` : 'H° standard'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Conforme</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>{insp.pathogenScreeningResult || 'Negativo (Limpio)'}</span>
                          </span>
                          <span className="text-[10px] text-purple-600 block">
                            {insp.residueStatus || 'Cero Residuos'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${verdictCfg.bg} ${verdictCfg.text} ${verdictCfg.border}`}>
                            <VIcon size={12} />
                            <span>{verdictCfg.label}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedInspectionForView(insp)}
                              className="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 dark:bg-slate-800 dark:hover:bg-purple-950/60 dark:text-slate-300 dark:hover:text-purple-300 px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase transition flex items-center gap-1"
                              title="Ver Acta Fitosanitaria Imprimible"
                            >
                              <FileText size={12} />
                              <span>Acta Técnica</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteInspection(insp.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition"
                                title="Eliminar Ensayo"
                              >
                                <Trash2 size={13} />
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
        </div>
      )}

      {/* VISTA 3: VADEMÉCUM AGRONÓMICO & PROTOCOLO SENASA */}
      {activeMainTab === 'vademecum' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Protocolo Fitosanitario & GACP Oficial
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <span>Vademécum Agronómico de Insumos Homologados SENASA</span>
                </h3>
              </div>
              <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800">
                Límites Máximos de Residuos (LMR = Cero en Inflorescencia & Grano)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AGRONOMIC_VADEMECUM.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {item.category}
                      </span>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        Registro: {item.senasaReg}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Tiempo de Carencia</span>
                      <strong className="text-xs font-black text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                        {item.withholdingDays === 0 ? '0 Días (Inocuo)' : `${item.withholdingDays} Días`}
                      </strong>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Principio Activo:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.activeSubstance}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Objetivo / Blanco:</span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">{item.target}</p>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <span>Dosis recomendada: <strong>{item.dose}</strong></span>
                      <span className="text-emerald-600 font-bold">✓ Cero Residuos Químicos</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                    <span>Proveedor Homologado: <strong className="text-slate-700 dark:text-slate-300">{item.supplierName}</strong></span>
                    {item.certifiedOrganic && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-bold">
                        Orgánico Acreditado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: NUEVA INSPECCIÓN FITOSANITARIA DE LOTE */}
      {isNewInspectionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">
                    Control Fitosanitario en Recepción
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Nueva Inspección Técnica de Lote
                  </h2>
                </div>
              </div>
              <button onClick={() => setIsNewInspectionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22}/></button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría del Insumo</label>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° de Lote / Marbete *</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="Ej: LOT-INASE-2025-C1-884"
                    value={newInspectionData.lotNumber}
                    onChange={e => setNewInspectionData({ ...newInspectionData, lotNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° Remito / Guía Tránsito</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ej: REM-0004-00018422"
                    value={newInspectionData.guideOrRemitoNumber || ''}
                    onChange={e => setNewInspectionData({ ...newInspectionData, guideOrRemitoNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Recepción</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={newInspectionData.date}
                    onChange={e => setNewInspectionData({ ...newInspectionData, date: e.target.value })}
                  />
                </div>
              </div>

              {/* ENSAYOS FISIOLÓGICOS (PARA SEMILLAS O SUSTRATOS) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-black uppercase text-purple-600 block tracking-wider">
                  Ensayos de Cámara & Laboratorio (ISTA / INASE)
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">% Germinación Medido</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className={inputClass}
                      placeholder="Ej: 94"
                      value={newInspectionData.germinationTestedPct || ''}
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
                      value={newInspectionData.germinationDeclaredPct || ''}
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
                      value={newInspectionData.purityPct || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, purityPct: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">% Humedad Semilla</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      className={inputClass}
                      placeholder="Ej: 8.8"
                      value={newInspectionData.moisturePct || ''}
                      onChange={e => setNewInspectionData({ ...newInspectionData, moisturePct: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Detección de Patógenos (Fusarium, Botrytis)</label>
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
                </div>
              </div>

              {/* VEREDICTO FINAL AGRONÓMICO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Veredicto Fitosanitario Oficial *</label>
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

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agrónomo Responsable & MP *</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    value={newInspectionData.agronomistName}
                    onChange={e => setNewInspectionData({ ...newInspectionData, agronomistName: e.target.value })}
                    placeholder="Ing. Agr. Lucas Berardi - MP-AGRO-3321"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones Técnicas del Ensayo</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Detallar vigor, comportamiento en cámara germinadora o condiciones de transporte..."
                  value={newInspectionData.observations || ''}
                  onChange={e => setNewInspectionData({ ...newInspectionData, observations: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">
                  Acta de custodia agronómica según Ley 27.669.
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
                    <span>Emitir Dictamen de Lote</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTA OFICIAL DE INSPECCIÓN TÉCNICA Y RECEPCIÓN (IMPRIMIBLE) */}
      {selectedInspectionForView && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[85] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Microscope size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">
                    Cadena de Custodia & Control de Entrada
                  </span>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Acta Técnica de Inspección Fitosanitaria
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
                    <span>NUCLEUS QUALITY · ACTA TÉCNICA DE RECEPCIÓN DE LOTE</span>
                  </div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                    Estándares ISTA / INASE / SENASA · Ley 27.669 & Res. ARICCAME
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                    selectedInspectionForView.verdict === 'APROBADO_CAMPO'
                      ? 'bg-emerald-600 text-white'
                      : selectedInspectionForView.verdict === 'EN_CUARENTENA_OBSERVADO'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {selectedInspectionForView.verdict === 'APROBADO_CAMPO' ? 'CONFORME PARA CAMPO' : selectedInspectionForView.verdict}
                  </span>
                </div>
              </div>

              {/* DATOS DE LA ENTIDAD OPERADORA (PATAGONIANC LTDA) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                      Titular & Entidad Fiscal
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

              {/* DATOS DEL LOTE Y PROVEEDOR */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Lote Inspeccionado:</span>
                  <strong className="text-base font-black font-mono text-slate-900 block leading-tight">
                    {selectedInspectionForView.lotNumber}
                  </strong>
                  <span className="text-[10px] text-slate-600 block mt-0.5">
                    Categoría: {selectedInspectionForView.inputCategory}
                  </span>
                  {selectedInspectionForView.guideOrRemitoNumber && (
                    <span className="text-[10px] font-mono text-purple-700 block">
                      Remito Oficial: {selectedInspectionForView.guideOrRemitoNumber}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Proveedor Remitente:</span>
                  <strong className="text-sm font-black text-slate-900 block">
                    {selectedInspectionForView.supplierName}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">
                    Fecha de Ensayo: {selectedInspectionForView.date}
                  </span>
                </div>
              </div>

              {/* MATRIZ DE MEDICIÓN TÉCNICA */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                  Resultados Fisiológicos & Sanitarios
                </span>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[8px] text-slate-400 uppercase block">PG Real en Cámara</span>
                    <strong className="text-emerald-700 text-sm font-black font-mono">
                      {selectedInspectionForView.germinationTestedPct ? `${selectedInspectionForView.germinationTestedPct}%` : 'N/A'}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[8px] text-slate-400 uppercase block">PG Marbete INASE</span>
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
                    <span className="text-slate-400 block font-bold">Observaciones del Agrónomo:</span>
                    <p className="text-slate-700 italic">{selectedInspectionForView.observations}</p>
                  </div>
                )}
              </div>

              {/* FIRMA Y AUDITORÍA PROFESIONAL */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 flex justify-between items-center">
                <div>
                  <span className="text-[8px] text-purple-800 uppercase block font-bold">Responsable Técnico Firmante</span>
                  <strong className="text-slate-900 text-xs block">
                    {selectedInspectionForView.agronomistName}
                  </strong>
                  <span className="text-[9px] text-slate-500">
                    Matrícula Profesional: {selectedInspectionForView.agronomistMatricula}
                  </span>
                </div>
                <div className="text-right">
                  <BarcodeRenderer value={selectedInspectionForView.lotNumber} width={1} height={26} displayValue={false} />
                  <span className="text-[8px] font-mono text-slate-400 block">ID: {selectedInspectionForView.id}</span>
                </div>
              </div>

              {/* PIE INSTITUCIONAL */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
                <span>Válido para fiscalización INASE / SENASA / ARICCAME</span>
                <span>Cooperativa PatagonianC LTDA · Trazabilidad Inmutable</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400">
                Impresión térmica o formato A4 para archivo de campo.
              </span>
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
                  <span>Imprimir Acta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {/* AUDITOR MATRICULADO */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-[8px] text-emerald-800 uppercase block font-bold">Agrónomo Auditor Responsable</span>
                  <strong className="text-slate-900 text-xs block">
                    {selectedSupplierForAudit.audit?.technicalAgronomistName || 'Ing. Agr. Lucas Berardi'}
                  </strong>
                  <span className="text-[9px] text-slate-500">
                    Matrícula: {selectedSupplierForAudit.audit?.technicalAgronomistMatricula || 'MP-AGRO-3321 MZA'}
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <span>Fecha de Dictamen: <strong>{selectedSupplierForAudit.audit?.lastAuditDate || '2025-08-10'}</strong></span>
                </div>
              </div>

              {/* PIE INSTITUCIONAL */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-500">
                <span>Operador Fiscal: Cooperativa PatagonianC LTDA · CUIT 30-71816113-0</span>
                <span>Lic. Agrícola EX-2024-134354227 · Lic. Industrial EX-2025-119427833</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400">
                Gestión contable y órdenes de compra en Odoo 20
              </span>
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
                  <span>Imprimir Dictamen</span>
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
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 mb-6 pb-2 text-xs">
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
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* TAB 1: CLASIFICACIÓN TÉCNICA */}
              {modalTab === 'technical' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial / Semillero *</label>
                      <input required disabled={isSaving} type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: BioGenética Andina & Semillas" />
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
                      <input disabled={isSaving} type="text" className={inputClass} value={formData.audit?.technicalAgronomistMatricula || ''} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), technicalAgronomistMatricula: e.target.value}})} placeholder="Ej: MP-AGRO-3321 MZA" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calificación Técnica (0-100)</label>
                      <input disabled={isSaving} type="number" min={0} max={100} className={inputClass} value={formData.audit?.auditScore || 95} onChange={e => setFormData({...formData, audit: {...(formData.audit || {}), auditScore: Number(e.target.value)}})} />
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Técnico / Calidad</label>
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

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">
                  Homologación fitotécnica estricta (no CRM).
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
                    <span>{editingId ? 'Actualizar Ficha' : 'Homologar Proveedor'}</span>
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
