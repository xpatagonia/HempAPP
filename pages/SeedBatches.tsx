import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { SeedBatch } from '../types';
import { Plus, ScanBarcode, Edit2, Trash2, Tag, Calendar, Package, AlertTriangle } from 'lucide-react';

export default function SeedBatches() {
  const { seedBatches, addSeedBatch, updateSeedBatch, deleteSeedBatch, varieties, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<SeedBatch>>({
    varietyId: '',
    supplierName: '',
    batchCode: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    initialQuantity: 0,
    remainingQuantity: 0,
    notes: '',
    isActive: true
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.varietyId || !formData.batchCode || !formData.supplierName) return;

    const payload = {
        varietyId: formData.varietyId!,
        supplierName: formData.supplierName!,
        batchCode: formData.batchCode!,
        purchaseDate: formData.purchaseDate!,
        initialQuantity: Number(formData.initialQuantity),
        remainingQuantity: Number(formData.remainingQuantity),
        notes: formData.notes,
        isActive: formData.isActive ?? true
    };

    if (editingId) {
        updateSeedBatch({ ...payload, id: editingId });
    } else {
        addSeedBatch({ ...payload, id: Date.now().toString() });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
        varietyId: '',
        supplierName: '',
        batchCode: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        initialQuantity: 0,
        remainingQuantity: 0,
        notes: '',
        isActive: true
    });
    setEditingId(null);
  };

  const handleEdit = (batch: SeedBatch) => {
      setFormData(batch);
      setEditingId(batch.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Eliminar este lote de semillas? Si hay parcelas vinculadas, perderán la trazabilidad.")) {
          deleteSeedBatch(id);
      }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <ScanBarcode className="mr-2 text-hemp-600"/> Stock de Semillas
            </h1>
            <p className="text-sm text-gray-500">Gestión de lotes, proveedores y trazabilidad de origen.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-sm">
            <Plus size={20} className="mr-2" /> Nuevo Lote
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Lote / Etiqueta</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Proveedor</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fecha Compra</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Stock (kg)</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {seedBatches.length === 0 ? (
                      <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                              <Package size={32} className="mx-auto mb-2 opacity-50"/>
                              <p>No hay lotes de semillas registrados.</p>
                          </td>
                      </tr>
                  ) : seedBatches.map(batch => {
                      const variety = varieties.find(v => v.id === batch.varietyId);
                      return (
                          <tr key={batch.id} className="hover:bg-gray-50 group">
                              <td className="px-6 py-4">
                                  <div className="flex items-center">
                                      <Tag size={16} className="text-gray-400 mr-2" />
                                      <span className="font-mono font-bold text-gray-800">{batch.batchCode}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-hemp-700 font-medium">{variety?.name || 'Desconocida'}</td>
                              <td className="px-6 py-4 text-gray-600">{batch.supplierName}</td>
                              <td className="px-6 py-4 text-gray-500">{batch.purchaseDate}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-1 rounded font-bold ${
                                      batch.remainingQuantity === 0 ? 'bg-red-100 text-red-700' :
                                      batch.remainingQuantity < (batch.initialQuantity * 0.2) ? 'bg-amber-100 text-amber-700' :
                                      'bg-green-100 text-green-700'
                                  }`}>
                                      {batch.remainingQuantity} / {batch.initialQuantity}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  {isAdmin && (
                                      <div className="flex justify-end space-x-2">
                                          <button onClick={() => handleEdit(batch)} className="text-gray-400 hover:text-hemp-600 p-1">
                                              <Edit2 size={16} />
                                          