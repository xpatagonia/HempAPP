import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Resource } from '../types';
import {
  Plus, Trash2, Edit2, Package, Wrench, DollarSign, Archive,
  Search, AlertTriangle, CheckCircle2, X, FlaskConical, Sprout, Check
} from 'lucide-react';

export default function Resources() {
  const { resources, addResource, updateResource, deleteResource, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const [formData, setFormData] = useState<Partial<Resource>>({
    name: '',
    type: 'Insumo',
    unit: 'unidad',
    costPerUnit: 0,
    stock: 0
  });

  const canManage = currentUser?.role !== 'viewer';

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (selectedType !== 'all' && r.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [resources, selectedType, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = resources.length;
    const lowStockCount = resources.filter(r => r.type !== 'Labor' && (r.stock || 0) <= 20).length;
    const totalValuationUsd = resources.reduce((acc, r) => acc + (r.costPerUnit || 0) * (r.stock || 0), 0);
    return { totalItems, lowStockCount, totalValuationUsd };
  }, [resources]);

  const resetForm = () => {
    setFormData({ name: '', type: 'Insumo', unit: 'unidad', costPerUnit: 0, stock: 0 });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (r: Resource) => {
    setFormData({
      name: r.name,
      type: r.type,
      unit: r.unit,
      costPerUnit: r.costPerUnit,
      stock: r.stock || 0
    });
    setEditingId(r.id);
    setIsModalOpen(true);
  };

  const handleQuickAdjustStock = async (r: Resource, delta: number) => {
    const nextStock = Math.max(0, Number(((r.stock || 0) + delta).toFixed(2)));
    await updateResource({ ...r, stock: nextStock });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const payload: Resource = {
      id: editingId || `res-${Date.now()}`,
      name: formData.name.trim(),
      type: (formData.type as Resource['type']) || 'Insumo',
      unit: (formData.unit as Resource['unit']) || 'unidad',
      costPerUnit: Number(formData.costPerUnit) || 0,
      stock: Number(formData.stock) || 0
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
    'w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto pb-12">
      {/* CABECERA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Archive size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Inventario de Insumos, Biofábrica & Recursos
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Control de stock operativo de fertilizantes, fitosanitarios biológicos y servicios de maquinaria agrícola.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <Plus size={16} />
            <span>Nuevo Recurso / Insumo</span>
          </button>
        )}
      </div>

      {/* KPIS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Ítems Registrados</span>
            <span className="text-2xl font-mono font-black text-slate-900 dark:text-white">{stats.totalItems}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Package size={20} />
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

      {/* BARRA DE BÚSQUEDA Y FILTRO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar insumo, fertilizante o labor..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['all', 'Fertilizante', 'Fitosanitario', 'Insumo', 'Labor'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
                selectedType === type
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              {type === 'all' ? 'Todos' : type}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLA DE RECURSOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map(r => {
          const isLowStock = r.type !== 'Labor' && (r.stock || 0) <= 20;
          return (
            <div
              key={r.id}
              className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isLowStock
                  ? 'border-rose-300 dark:border-rose-900/60'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
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
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                        {r.name}
                      </h3>
                      <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-0.5">
                        {r.type}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Editar recurso"
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

                <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Costo Unitario</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                      ${r.costPerUnit} USD <span className="text-[10px] font-normal text-slate-400">/ {r.unit}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Stock Disponible</span>
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

      {/* MODAL CREAR / EDITAR RECURSO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingId ? 'Editar Recurso / Insumo' : 'Registrar Nuevo Recurso'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre del Insumo o Labor *</label>
                <input
                  required
                  type="text"
                  className={inputClass}
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Trichoderma harzianum TH-35"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Categoría</label>
                  <select
                    className={inputClass}
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Resource['type'] })}
                  >
                    <option value="Fertilizante">Fertilizante</option>
                    <option value="Fitosanitario">Fitosanitario</option>
                    <option value="Labor">Labor (Servicio)</option>
                    <option value="Insumo">Insumo General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Unidad de Medida</label>
                  <select
                    className={inputClass}
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as Resource['unit'] })}
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="lts">Litros (lts)</option>
                    <option value="unidad">Unidad</option>
                    <option value="horas">Horas</option>
                    <option value="ha">Hectáreas (ha)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Stock Disponible</label>
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingId ? 'Guardar Cambios' : 'Crear Recurso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
