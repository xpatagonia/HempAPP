
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Variety, UsageType } from '../types';
import { Plus, Search, Tag, Edit2, Trash2 } from 'lucide-react';

export default function Varieties() {
  const { varieties, addVariety, updateVariety, deleteVariety, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Variety>>({
    name: '', usage: 'Fibra', genetics: '', cycleDays: 120, expectedThc: 0, notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (editingId) {
      updateVariety({
        ...formData,
        id: editingId,
        name: formData.name!,
        usage: formData.usage as UsageType,
        genetics: formData.genetics || '',
        cycleDays: Number(formData.cycleDays),
        expectedThc: Number(formData.expectedThc),
        notes: formData.notes
      } as Variety);
    } else {
      addVariety({
        id: Date.now().toString(),
        name: formData.name!,
        usage: formData.usage as UsageType,
        genetics: formData.genetics || '',
        cycleDays: Number(formData.cycleDays),
        expectedThc: Number(formData.expectedThc),
        notes: formData.notes
      });
    }
    
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', usage: 'Fibra', genetics: '', cycleDays: 120, expectedThc: 0, notes: '' });
    setEditingId(null);
  };

  const handleEdit = (v: Variety) => {
    setFormData(v);
    setEditingId(v.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta variedad? Esto podría afectar parcelas existentes.')) {
      deleteVariety(id);
    }
  };

  const filtered = varieties.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.genetics.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Catálogo de Variedades</h1>
        {currentUser?.role === 'admin' && (
          <button 
            onClick={() => {
                setEditingId(null);
                setFormData({ name: '', usage: 'Fibra', genetics: '', cycleDays: 120, expectedThc: 0, notes: '' });
                setIsModalOpen(true);
            }}
            className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition w-full sm:w-auto justify-center"
          >
            <Plus size={20} className="mr-2" />
            Nueva Variedad
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o genética..." 
          className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v => (
          <div key={v.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
             {currentUser?.role === 'admin' && (
               <div className="absolute top-3 right-3 flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(v)} className="p-1 text-gray-400 hover:text-hemp-600 hover:bg-gray-100 rounded">
                      <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded">
                      <Trash2 size={16} />
                  </button>
               </div>
             )}

            <div className="flex justify-between items-start mb-2 pr-12">
              <h3 className="text-xl font-bold text-gray-800">{v.name}</h3>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                v.usage === 'Medicinal' ? 'bg-purple-100 text-purple-800' :
                v.usage === 'Fibra' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {v.usage}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-semibold">Genética:</span> {v.genetics}</p>
              <p><span className="font-semibold">Ciclo:</span> {v.cycleDays} días</p>
              <p><span className="font-semibold">THC Esp:</span> {v.expectedThc}%</p>
            </div>
            {v.notes && <p className="mt-3 text-xs text-gray-500 italic border-t pt-2">{v.notes}</p>}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Variedad' : 'Registrar Variedad'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uso</label>
                  <select className={inputClass} value={formData.usage} onChange={e => setFormData({...formData, usage: e.target.value as UsageType})}>
                    <option value="Fibra">Fibra</option>
                    <option value="Grano">Grano</option>
                    <option value="Dual">Dual</option>
                    <option value="Medicinal">Medicinal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genética</label>
                  <input type="text" className={inputClass} value={formData.genetics} onChange={e => setFormData({...formData, genetics: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días Ciclo</label>
                  <input type="number" className={inputClass} value={formData.cycleDays} onChange={e => setFormData({...formData, cycleDays: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% THC</label>
                  <input type="number" step="0.01" className={inputClass} value={formData.expectedThc} onChange={e => setFormData({...formData, expectedThc: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea className={inputClass} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
