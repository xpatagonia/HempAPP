
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Resource } from '../types';
import { Plus, Trash2, Edit2, Package, Truck, Wrench, DollarSign, Archive } from 'lucide-react';

export default function Resources() {
  const { resources, addResource, updateResource, deleteResource, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Resource>>({
    name: '', type: 'Insumo', unit: 'unidad', costPerUnit: 0, stock: 0, notes: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (editingId) {
        updateResource({ ...formData, id: editingId } as Resource);
    } else {
        addResource({
            ...formData as Resource,
            id: Date.now().toString(),
        });
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'Insumo', unit: 'unidad', costPerUnit: 0, stock: 0, notes: '' });
    setEditingId(null);
  };

  const handleEdit = (r: Resource) => { setFormData(r); setEditingId(r.id); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if(window.confirm("¿Eliminar recurso?")) deleteResource(id); };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Archive className="mr-2 text-hemp-600"/> Gestión de Recursos
            </h1>
            <p className="text-sm text-gray-500">Insumos, Fertilizantes y Labores para el Plan Agrícola.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Nuevo Recurso
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(r => (
              <div key={r.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative group">
                  {isAdmin && (
                      <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(r)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                      </div>
                  )}
                  <div className="flex items-center mb-3">
                      <div className={`p-2 rounded-full mr-3 ${r.type === 'Fertilizante' ? 'bg-green-100 text-green-700' : r.type === 'Labor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {r.type === 'Labor' ? <Wrench size={20}/> : <Package size={20}/>}
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-800">{r.name}</h3>
                          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border">{r.type}</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t pt-3">
                      <div>
                          <span className="text-gray-400 text-xs uppercase font-bold">Costo Unitario</span>
                          <div className="font-mono font-bold text-gray-800 flex items-center"><DollarSign size={12}/>{r.costPerUnit} / {r.unit}</div>
                      </div>
                      <div>
                          <span className="text-gray-400 text-xs uppercase font-bold">Stock Disp.</span>
                          <div className="font-bold text-gray-800">{r.stock || 0} {r.unit}</div>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Recurso' : 'Nuevo Recurso'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Urea Granulada"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                            <option value="Fertilizante">Fertilizante</option>
                            <option value="Fitosanitario">Fitosanitario</option>
                            <option value="Labor">Labor (Servicio)</option>
                            <option value="Insumo">Insumo General</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Unidad</label>
                        <select className={inputClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                            <option value="kg">Kilogramos</option>
                            <option value="lts">Litros</option>
                            <option value="unidad">Unidad</option>
                            <option value="horas">Horas</option>
                            <option value="ha">Hectáreas</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Costo Unitario ($)</label>
                        <input type="number" step="0.01" className={inputClass} value={formData.costPerUnit} onChange={e => setFormData({...formData, costPerUnit: Number(e.target.value)})}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Stock Actual</label>
                        <input type="number" step="0.01" className={inputClass} value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})}/>
                    </div>
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded font-bold">Guardar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
