import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Resource, AgrochemicalCategory, ToxicologicalBand, AgrochemicalApplication } from '../types';
import {
  Plus, Trash2, Edit2, Package, Wrench, DollarSign, Archive,
  Search, AlertTriangle, CheckCircle2, X, FlaskConical, Sprout, Check,
  ShieldCheck, Building2, Layers, ArrowUpRight
} from 'lucide-react';

const AGRO_CATEGORIES: AgrochemicalCategory[] = [
  'Mejorador de Suelo',
  'Fertilizante Edáfico',
  'Fertilizante Foliar',
  'Bioestimulante',
  'Insecticida',
  'Fungicida',
  'Enmienda Orgánica',
  'Herbicida'
];

export default function Resources() {
  const { resources, suppliers, addResource, updateResource, deleteResource, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAgroCategory, setSelectedAgroCategory] = useState<string>('all');

  const inputSuppliers = useMemo(() => {
    const filtered = suppliers.filter(
      s =>
        s.category === 'Bioinsumos_Fertilizantes' ||
        s.category === 'Fitosanitarios_Control' ||
        s.category === 'Insumos' ||
        s.category === 'Sustratos_Vivero'
    );
    return filtered.length > 0 ? filtered : suppliers;
  }, [suppliers]);

  const defaultSupplier = inputSuppliers[0] || {
    id: 'sup-biofabrica-patagonia-01',
    name: 'BioFábrica & Insumos Agrícolas Red HempC'
  };

  const [formData, setFormData] = useState<Partial<Resource>>({
    name: '',
    type: 'Fertilizante',
    agroCategory: 'Mejorador de Suelo',
    unit: 'lts',
    costPerUnit: 18,
    stock: 100,
    activeIngredient: '',
    senasaRegisterNumber: '',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    recommendedDosagePerHa: 2.5,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 0,
    applicationMethod: 'Fertirriego',
    batchNumber: '',
    expirationDate: '2027-12-31',
    supplierId: defaultSupplier.id,
    supplierName: defaultSupplier.name,
    manufacturer: 'BioTerra Patagonia Labs',
    targetPestOrDisease: '',
    notes: ''
  });

  const canManage = currentUser?.role !== 'viewer';

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (selectedType !== 'all' && r.type !== selectedType) return false;
      if (selectedAgroCategory !== 'all' && r.agroCategory !== selectedAgroCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.agroCategory || '').toLowerCase().includes(q) ||
          (r.activeIngredient || '').toLowerCase().includes(q) ||
          (r.senasaRegisterNumber || '').toLowerCase().includes(q) ||
          (r.batchNumber || '').toLowerCase().includes(q) ||
          (r.supplierName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resources, selectedType, selectedAgroCategory, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = resources.length;
    const senasaHomologatedCount = resources.filter(r => Boolean(r.senasaRegisterNumber || r.agroCategory)).length;
    const lowStockCount = resources.filter(r => r.type !== 'Labor' && (r.stock || 0) <= 20).length;
    const totalValuationUsd = resources.reduce((acc, r) => acc + (r.costPerUnit || 0) * (r.stock || 0), 0);
    return { totalItems, senasaHomologatedCount, lowStockCount, totalValuationUsd };
  }, [resources]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Fertilizante',
      agroCategory: 'Mejorador de Suelo',
      unit: 'lts',
      costPerUnit: 18,
      stock: 100,
      activeIngredient: '',
      senasaRegisterNumber: '',
      toxicologicalClass: 'Biológico / Orgánico Certificado',
      recommendedDosagePerHa: 2.5,
      dosageUnit: 'L/ha',
      safetyPeriodDays: 0,
      applicationMethod: 'Fertirriego',
      batchNumber: `LOT-${new Date().getFullYear()}-${String(resources.length + 1).padStart(2, '0')}`,
      expirationDate: '2027-12-31',
      supplierId: defaultSupplier.id,
      supplierName: defaultSupplier.name,
      manufacturer: 'BioTerra Patagonia Labs',
      targetPestOrDisease: '',
      notes: ''
    });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (r: Resource) => {
    setFormData({
      ...r,
      name: r.name,
      type: r.type,
      agroCategory: r.agroCategory || (r.type === 'Fertilizante' ? 'Mejorador de Suelo' : 'Bioestimulante'),
      unit: r.unit,
      costPerUnit: r.costPerUnit,
      stock: r.stock || 0,
      activeIngredient: r.activeIngredient || '',
      senasaRegisterNumber: r.senasaRegisterNumber || '',
      toxicologicalClass: r.toxicologicalClass || 'Biológico / Orgánico Certificado',
      recommendedDosagePerHa: r.recommendedDosagePerHa ?? 2,
      dosageUnit: r.dosageUnit || (r.unit === 'kg' ? 'kg/ha' : 'L/ha'),
      safetyPeriodDays: r.safetyPeriodDays ?? 0,
      applicationMethod: r.applicationMethod || 'Fertirriego',
      batchNumber: r.batchNumber || '',
      expirationDate: r.expirationDate || '2027-12-31',
      supplierId: r.supplierId || defaultSupplier.id,
      supplierName: r.supplierName || defaultSupplier.name,
      manufacturer: r.manufacturer || 'Elaborador Homologado GACP',
      targetPestOrDisease: r.targetPestOrDisease || '',
      notes: r.notes || ''
    });
    setEditingId(r.id);
    setIsModalOpen(true);
  };

  const handleQuickAdjustStock = async (r: Resource, delta: number) => {
    const nextStock = Math.max(0, Number(((r.stock || 0) + delta).toFixed(2)));
    await updateResource({ ...r, stock: nextStock });
  };

  const handleCategoryAutoType = (cat: AgrochemicalCategory) => {
    const isFert =
      cat === 'Mejorador de Suelo' ||
      cat === 'Fertilizante Edáfico' ||
      cat === 'Fertilizante Foliar' ||
      cat === 'Enmienda Orgánica';
    setFormData(prev => ({
      ...prev,
      agroCategory: cat,
      type: prev.type === 'Labor' ? 'Labor' : isFert ? 'Fertilizante' : 'Fitosanitario'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const isLabor = formData.type === 'Labor';
    const selectedSup = suppliers.find(s => s.id === formData.supplierId);

    const payload: Resource = {
      id: editingId || `senasa-res-${Date.now()}`,
      name: formData.name.trim(),
      type: (formData.type as Resource['type']) || 'Fertilizante',
      agroCategory: isLabor ? undefined : (formData.agroCategory as AgrochemicalCategory) || 'Mejorador de Suelo',
      unit: (formData.unit as Resource['unit']) || 'lts',
      costPerUnit: Number(formData.costPerUnit) || 0,
      stock: Number(formData.stock) || 0,
      activeIngredient: isLabor ? undefined : formData.activeIngredient?.trim() || 'Insumo Agrícola Homologado',
      senasaRegisterNumber: isLabor ? undefined : formData.senasaRegisterNumber?.trim() || 'SENASA-OFICIAL',
      toxicologicalClass: isLabor ? undefined : (formData.toxicologicalClass as ToxicologicalBand) || 'Biológico / Orgánico Certificado',
      recommendedDosagePerHa: isLabor ? undefined : Number(formData.recommendedDosagePerHa) || 2,
      dosageUnit: isLabor ? undefined : (formData.dosageUnit as AgrochemicalApplication['dosageUnit']) || 'L/ha',
      safetyPeriodDays: isLabor ? undefined : Math.max(0, Number(formData.safetyPeriodDays) || 0),
      applicationMethod: isLabor
        ? undefined
        : (formData.applicationMethod as AgrochemicalApplication['applicationMethod']) || 'Fertirriego',
      batchNumber: isLabor ? undefined : formData.batchNumber?.trim().toUpperCase() || `LOT-${new Date().getFullYear()}-A`,
      expirationDate: isLabor ? undefined : formData.expirationDate || '2027-12-31',
      supplierId: isLabor ? undefined : formData.supplierId || defaultSupplier.id,
      supplierName: isLabor ? undefined : selectedSup?.name || formData.supplierName?.trim() || defaultSupplier.name,
      manufacturer: isLabor ? undefined : formData.manufacturer?.trim() || 'Elaborador Homologado GACP',
      targetPestOrDisease: isLabor ? undefined : formData.targetPestOrDisease?.trim() || undefined,
      notes: formData.notes?.trim() || undefined
    };

    if (editingId) {
      await updateResource(payload);
    } else {
      await addResource(payload);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteResource(id);
    setConfirmDeleteId(null);
  };

  const inputClass =
    'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-[1600px] mx-auto pb-12">
      {/* CABECERA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Archive size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Inventario de Insumos SENASA, Biofábrica & Recursos
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Sincronizado con Monitoreo Rápido & Cuaderno Fitosanitario
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Todo insumo registrado aquí queda inmediatamente disponible por Categoría en Monitoreo Rápido, Parcelas de Cultivo y Cuaderno Fitosanitario SENASA.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/trials-lite"
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
          >
            <span>Ir a Monitoreo Rápido</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            to="/phytosanitary"
            className="px-3.5 py-2.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
          >
            <ShieldCheck size={14} />
            <span>Cuaderno SENASA</span>
          </Link>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Registrar Nuevo Recurso / Insumo SENASA</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Ítems en Catálogo BD</span>
            <span className="text-2xl font-mono font-black text-slate-900 dark:text-white">{stats.totalItems}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Homologados SENASA / MIP</span>
            <span className="text-2xl font-mono font-black text-teal-600 dark:text-teal-400">{stats.senasaHomologatedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Stock Crítico (&le;20 u.)</span>
            <span className={`text-2xl font-mono font-black ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.lowStockCount}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl ${stats.lowStockCount > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
            {stats.lowStockCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Valorización en Stock</span>
            <span className="text-2xl font-mono font-black text-emerald-600">
              ${Math.round(stats.totalValuationUsd).toLocaleString()} USD
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS RELACIONALES */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre comercial, principio activo, registro SENASA, lote o proveedor..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'Fertilizante', 'Fitosanitario', 'Insumo', 'Labor'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
                  selectedType === type
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? 'Todos los Rubros' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro directo por las 8 Categorías de Prescripción SENASA */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
            <Layers size={12} /> Categoría Tratamiento:
          </span>
          <button
            type="button"
            onClick={() => setSelectedAgroCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer shrink-0 ${
              selectedAgroCategory === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Todas ({resources.length})
          </button>
          {AGRO_CATEGORIES.map(cat => {
            const count = resources.filter(r => r.agroCategory === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedAgroCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer shrink-0 ${
                  selectedAgroCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* GRILLA DE RECURSOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map(r => {
          const isLowStock = r.type !== 'Labor' && (r.stock || 0) <= 20;
          return (
            <div
              key={r.id}
              className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isLowStock
                  ? 'border-rose-300 dark:border-rose-900/60'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        r.type === 'Fertilizante'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : r.type === 'Fitosanitario'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : r.type === 'Labor'
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {r.type === 'Labor' ? (
                        <Wrench size={18} />
                      ) : r.type === 'Fitosanitario' ? (
                        <FlaskConical size={18} />
                      ) : r.type === 'Fertilizante' ? (
                        <Sprout size={18} />
                      ) : (
                        <Package size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 dark:text-white text-sm leading-snug truncate" title={r.name}>
                        {r.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {r.type}
                        </span>
                        {r.agroCategory && (
                          <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {r.agroCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Editar ficha técnica y stock"
                      >
                        <Edit2 size={14} />
                      </button>
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(r.id)}
                            className="text-[10px] font-black text-rose-600 uppercase px-1 cursor-pointer"
                          >
                            Borrar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Eliminar recurso"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {r.type !== 'Labor' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] font-mono">
                    {r.activeIngredient && (
                      <p className="text-slate-600 dark:text-slate-300 truncate" title={r.activeIngredient}>
                        🧪 <strong className="text-slate-800 dark:text-slate-200">P. Activo:</strong> {r.activeIngredient}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                      {r.senasaRegisterNumber && (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                          <ShieldCheck size={11} /> {r.senasaRegisterNumber}
                        </span>
                      )}
                      {r.batchNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                          Lote: {r.batchNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>
                        Dosis: <strong className="text-slate-800 dark:text-slate-200">{r.recommendedDosagePerHa ?? 2} {r.dosageUnit || 'L/ha'}</strong>
                      </span>
                      <span>
                        Carencia: <strong className={(r.safetyPeriodDays || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}>{r.safetyPeriodDays ?? 0} días</strong>
                      </span>
                    </div>
                    {r.supplierName && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate pt-0.5">
                        <Building2 size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate">Prov: <strong className="text-slate-700 dark:text-slate-300">{r.supplierName}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Costo Unitario</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                      ${r.costPerUnit} USD <span className="text-[10px] font-normal text-slate-400">/ {r.unit}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Stock en Galpón</span>
                    <div className="flex items-center justify-between">
                      <span className={`font-mono font-black text-sm ${isLowStock ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {r.stock || 0} {r.unit}
                      </span>
                      {canManage && r.type !== 'Labor' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustStock(r, -5)}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-mono font-black text-xs cursor-pointer"
                            title="Restar 5 unidades"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustStock(r, 5)}
                            className="w-6 h-6 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs cursor-pointer"
                            title="Sumar 5 unidades"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR / EDITAR RECURSO HOMOLOGADO CON TRAZABILIDAD SENASA & PROVEEDOR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingId ? 'Editar Insumo Homologado / Recurso' : 'Registrar Nuevo Recurso / Insumo SENASA'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Se vincula automáticamente con Proveedores Homologados, Monitoreo Rápido y Cuaderno Fitosanitario
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* BLOQUE 1: IDENTIFICACIÓN COMERCIAL Y CATEGORÍA SENASA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nombre Comercial del Insumo o Labor *
                  </label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Trichoderma harzianum TH-35 Líquido"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de Rubro</label>
                  <select
                    className={inputClass}
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Resource['type'] })}
                  >
                    <option value="Fertilizante">Fertilizante / Enmienda</option>
                    <option value="Fitosanitario">Fitosanitario / Bioinsumo</option>
                    <option value="Insumo">Insumo General</option>
                    <option value="Labor">Labor (Servicio Maquinaria)</option>
                  </select>
                </div>
              </div>

              {formData.type !== 'Labor' && (
                <>
                  {/* BLOQUE 2: VINCULACIÓN CON PROVEEDOR HOMOLOGADO & LOTE RECEPCIONADO */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-3">
                    <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Building2 size={13} /> Origen: Proveedor Homologado & Lote Recepcionado
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Proveedor Homologado (Base de Datos) *
                        </label>
                        <select
                          className={inputClass}
                          value={formData.supplierId || defaultSupplier.id}
                          onChange={e => {
                            const sup = suppliers.find(s => s.id === e.target.value);
                            setFormData({
                              ...formData,
                              supplierId: e.target.value,
                              supplierName: sup ? sup.name : formData.supplierName
                            });
                          }}
                        >
                          {inputSuppliers.map(sup => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({(sup as any).senasaNumber || sup.cuit || 'Homologado'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Laboratorio / Fabricante Elaborador
                        </label>
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.manufacturer || ''}
                          onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                          placeholder="Ej: BioTerra Patagonia Labs / Yara"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Categoría Insumo (Tratamiento) *
                        </label>
                        <select
                          className={inputClass}
                          value={formData.agroCategory || 'Mejorador de Suelo'}
                          onChange={e => handleCategoryAutoType(e.target.value as AgrochemicalCategory)}
                        >
                          <option value="Mejorador de Suelo">🌱 Mejorador de Suelo</option>
                          <option value="Fertilizante Edáfico">🧪 Fertilizante Edáfico</option>
                          <option value="Fertilizante Foliar">🍃 Fertilizante Foliar</option>
                          <option value="Bioestimulante">⚡ Bioestimulante</option>
                          <option value="Insecticida">🐛 Insecticida / Biocontrol</option>
                          <option value="Fungicida">🍄 Fungicida / Biofungicida</option>
                          <option value="Enmienda Orgánica">♻️ Enmienda Orgánica</option>
                          <option value="Herbicida">🌾 Herbicida</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          N° Lote Recepcionado *
                        </label>
                        <input
                          required
                          type="text"
                          className={inputClass}
                          value={formData.batchNumber || ''}
                          onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                          placeholder="Ej: LOT-BIO-2026-08"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Vencimiento Lote
                        </label>
                        <input
                          type="date"
                          className={inputClass}
                          value={formData.expirationDate || '2027-12-31'}
                          onChange={e => setFormData({ ...formData, expirationDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE 3: REGISTRO SENASA, PRINCIPIO ACTIVO Y DOSIFICACIÓN PRESCRIPTA */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-600" /> Ficha Técnica SENASA & Prescripción Agronómica
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Principio Activo / Composición *
                        </label>
                        <input
                          required
                          type="text"
                          className={inputClass}
                          value={formData.activeIngredient || ''}
                          onChange={e => setFormData({ ...formData, activeIngredient: e.target.value })}
                          placeholder="Ej: Ácidos Húmicos 15% + Fúlvicos 8% / Trichoderma 1x10^9"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Registro Oficial SENASA N° *
                        </label>
                        <input
                          required
                          type="text"
                          className={inputClass}
                          value={formData.senasaRegisterNumber || ''}
                          onChange={e => setFormData({ ...formData, senasaRegisterNumber: e.target.value })}
                          placeholder="Ej: SENASA-REG-BIO-4491-SF"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Dosis Prescripta / ha *
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0.05"
                            className={inputClass}
                            value={formData.recommendedDosagePerHa ?? 2}
                            onChange={e => setFormData({ ...formData, recommendedDosagePerHa: Number(e.target.value) })}
                          />
                          <select
                            className="px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                            value={formData.dosageUnit || 'L/ha'}
                            onChange={e => setFormData({ ...formData, dosageUnit: e.target.value as any })}
                          >
                            <option value="L/ha">L/ha</option>
                            <option value="kg/ha">kg/ha</option>
                            <option value="cc/ha">cc/ha</option>
                            <option value="ml/ha">ml/ha</option>
                            <option value="g/ha">g/ha</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Carencia Pre-Cosecha (días)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className={inputClass}
                          value={formData.safetyPeriodDays ?? 0}
                          onChange={e => setFormData({ ...formData, safetyPeriodDays: Number(e.target.value) })}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Método de Aplicación
                        </label>
                        <select
                          className={inputClass}
                          value={formData.applicationMethod || 'Fertirriego'}
                          onChange={e => setFormData({ ...formData, applicationMethod: e.target.value as any })}
                        >
                          <option value="Fertirriego">Fertirriego</option>
                          <option value="Pulverización Terrestre">Pulverización Terrestre</option>
                          <option value="Incorporación Edáfica">Incorporación Edáfica</option>
                          <option value="Manual / Follaje">Manual / Follaje</option>
                          <option value="Mochila Manual">Mochila Manual</option>
                          <option value="Dron Agrícola">Dron Agrícola</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Clase / Banda Toxicológica SENASA
                        </label>
                        <select
                          className={inputClass}
                          value={formData.toxicologicalClass || 'Biológico / Orgánico Certificado'}
                          onChange={e => setFormData({ ...formData, toxicologicalClass: e.target.value as ToxicologicalBand })}
                        >
                          <option value="Biológico / Orgánico Certificado">Biológico / Orgánico Certificado</option>
                          <option value="Banda Verde (Banda IV - Poco Peligroso)">Banda Verde (Banda IV - Poco Peligroso)</option>
                          <option value="Banda Azul (Banda III - Cuidado)">Banda Azul (Banda III - Cuidado)</option>
                          <option value="Banda Amarilla (Banda II - Moderadamente Peligroso)">Banda Amarilla (Banda II)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Blanco MIP / Objetivo Nutricional
                        </label>
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.targetPestOrDisease || ''}
                          onChange={e => setFormData({ ...formData, targetPestOrDisease: e.target.value })}
                          placeholder="Ej: Estructura edáfica / Control Arañuela Roja / NPK"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* BLOQUE 4: STOCK EN GALPÓN Y VALORIZACIÓN */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Unidad de Stock</label>
                  <select
                    className={inputClass}
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as Resource['unit'] })}
                  >
                    <option value="lts">Litros (lts)</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="unidad">Unidad</option>
                    <option value="horas">Horas</option>
                    <option value="ha">Hectáreas (ha)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Costo Unitario (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    value={formData.costPerUnit}
                    onChange={e => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Stock Recepcionado ({formData.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check size={14} />
                  <span>{editingId ? 'Guardar Cambios en BD' : 'Registrar y Habilitar en Tratamientos'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
