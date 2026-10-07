import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Supplier, SupplierCategory, TechnicalHomologationStatus, SupplierAgronomicAudit 
} from '../types';
import { 
  Plus, Edit2, Trash2, MapPin, Mail, 
  Search, Save, Loader2, X, Briefcase, Truck, Sprout,
  ShieldCheck, CheckCircle2, AlertTriangle, Award, FlaskConical, 
  ExternalLink, Printer, Check, Copy, FileText, ChevronRight,
  Filter, CheckSquare, Phone, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'sup-' + Math.random().toString(36).substring(2, 9);
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

export default function Suppliers() {
  const { 
    suppliers, addSupplier, updateSupplier, deleteSupplier, 
    currentUser, varieties, seedBatches 
  } = useAppContext();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedSupplierForAudit, setSelectedSupplierForAudit] = useState<Supplier | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalTab, setModalTab] = useState<'technical' | 'regulatory' | 'quality' | 'logistics'>('technical');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterHomologation, setFilterHomologation] = useState<string>('all');

  const [formData, setFormData] = useState<Partial<Supplier> & { lat: string; lng: string }>({
    name: '', category: 'Semillero_Criadero', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
    whatsapp: '', email: '', website: '', notes: '', isOfficialPartner: true,
    inaseRncyfsNumber: '', senasaRegisterNumber: '', ariccameLicenseNumber: '',
    homologationStatus: 'Homologado_Conforme',
    technicalSpecialty: '', activeIngredientsProvided: [], batchReturnWarrantyDays: 60,
    lat: '', lng: '',
    audit: {
      technicalAgronomistName: '',
      technicalAgronomistMatricula: '',
      lastAuditDate: new Date().toISOString().split('T')[0],
      auditScore: 95,
      bpaCertified: true,
      gacpCertified: true,
      organicCertified: false,
      zeroResidueGuarantee: true,
      labAccreditationStandard: ''
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
        const finalLat = parseFloat((formData.lat || '').replace(',', '.'));
        const finalLng = parseFloat((formData.lng || '').replace(',', '.'));
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : undefined;

        const payload: Supplier = {
            id: editingId || generateId(),
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

  const resetForm = () => {
    setFormData({ 
        name: '', category: 'Semillero_Criadero', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
        whatsapp: '', email: '', website: '', notes: '', isOfficialPartner: true,
        inaseRncyfsNumber: '', senasaRegisterNumber: '', ariccameLicenseNumber: '',
        homologationStatus: 'Homologado_Conforme',
        technicalSpecialty: '', activeIngredientsProvided: [], batchReturnWarrantyDays: 60,
        lat: '', lng: '',
        audit: {
          technicalAgronomistName: '',
          technicalAgronomistMatricula: '',
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
            technicalAgronomistName: '',
            technicalAgronomistMatricula: '',
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

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-slate-400 disabled:opacity-50";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-mono">
      
      {/* ENCABEZADO AGRONÓMICO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Homologación Técnica & Trazabilidad de Insumos
              </span>
              <span className="text-xs text-slate-400">· INASE / SENASA / GACP</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 flex items-center gap-2.5">
              <Briefcase className="text-emerald-500" size={26}/> 
              <span>Red de Proveedores & Semilleros Homologados</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Calificación fitotécnica, garantías de pureza/germinación y registros sanitarios. <span className="text-slate-400">(Gestión de ventas y compras en Odoo 20)</span>.
            </p>
        </div>
        
        {isAdmin && (
          <button 
            type="button"
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition shadow font-bold text-xs uppercase tracking-wider gap-2 shrink-0"
          >
            <Plus size={16} /> 
            <span>Homologar Proveedor</span>
          </button>
        )}
      </div>

      {/* FILTROS Y BÚSQUEDA AGRONÓMICA */}
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
              </select>
          </div>
      </div>

      {/* GRILLA DE PROVEEDORES HOMOLOGADOS */}
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

                  {/* GARANTÍAS DE CALIDAD & PROTOCOLOS */}
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

                  {/* TRAZABILIDAD CRUZADA EN EL SISTEMA */}
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

                      {linkedAgroApps > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="flex items-center gap-1 text-slate-400">
                              <ShieldCheck size={12} className="text-purple-500" />
                              <span>Tratamientos en Cuaderno SENASA:</span>
                            </span>
                            <span className="font-bold text-purple-600">
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

                {/* FOOTER ACCIONES: FICHA TÉCNICA DE AUDITORÍA */}
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
            );
        })}
      </div>

      {/* MODAL DE DICTAMEN TÉCNICO Y HOMOLOGACIÓN FITOTÉCNICA (IMPRIMIBLE) */}
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

      {/* MODAL DE ALTA / EDICIÓN FITOTÉCNICA DEL PROVEEDOR */}
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
