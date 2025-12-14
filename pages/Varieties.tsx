
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Variety, UsageType } from '../types';
import { Plus, Search, Tag, Edit2, Trash2, CloudDownload, Sprout, AlertCircle, Building, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const HEMP_IT_TEMPLATE = {
    name: 'Hemp-it France',
    country: 'Francia',
    varieties: [
        { name: 'USO 31', usage: 'Grano', cycleDays: 100, expectedThc: 0.04, notes: 'Monoica. Ciclo muy temprano.' },
        { name: 'Fedora 17', usage: 'Dual', cycleDays: 130, expectedThc: 0.12, notes: 'Monoica. Ciclo medio-temprano.' },
        { name: 'Felina 32', usage: 'Dual', cycleDays: 135, expectedThc: 0.12, notes: 'Monoica. Ciclo medio.' },
        { name: 'Santhica 27', usage: 'Fibra', cycleDays: 135, expectedThc: 0.00, notes: 'Monoica. Rica en CBG. Libre de THC.' },
        { name: 'Futura 75', usage: 'Dual', cycleDays: 145, expectedThc: 0.12, notes: 'Monoica. Ciclo tardío.' }
    ]
};

export default function Varieties() {
  const { varieties, addVariety, updateVariety, deleteVariety, currentUser, suppliers, addSupplier } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [formData, setFormData] = useState<Partial<Variety>>({
    name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0, notes: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.supplierId) return;
    
    const payload = {
        name: formData.name!,
        usage: formData.usage as UsageType,
        supplierId: formData.supplierId || null, 
        cycleDays: Number(formData.cycleDays),
        expectedThc: Number(formData.expectedThc),
        notes: formData.notes
    };

    if (editingId) {
      updateVariety({ ...payload, id: editingId } as Variety);
    } else {
      addVariety({ ...payload, id: Date.now().toString() } as Variety);
    }
    
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0, notes: '' });
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

  const handleImportCatalog = async () => {
      if(!window.confirm("¿Importar catálogo base de Hemp-it? Se creará el proveedor si no existe.")) return;
      setIsImporting(true);
      
      let supplierId = suppliers.find(s => s.name.toLowerCase().includes('hemp-it'))?.id;
      if (!supplierId) {
          supplierId = await addSupplier({
              id: Date.now().toString(),
              name: HEMP_IT_TEMPLATE.name,
              country: HEMP_IT_TEMPLATE.country,
              legalName: 'Hemp-it Cooperative'
          });
      }

      HEMP_IT_TEMPLATE.varieties.forEach(template => {
          const exists = varieties.some(v => v.name.toLowerCase() === template.name.toLowerCase());
          if (!exists) {
              addVariety({
                  ...template,
                  id: Date.now().toString() + Math.random().toString().slice(2,5),
                  supplierId: supplierId!
              } as Variety);
          }
      });

      setIsImporting(false);
      alert("Catálogo importado correctamente.");
  };

  const filtered = varieties.filter(v => {
      const supplierName = suppliers.find(s => s.id === v.supplierId)?.name || '';
      return v.name.toLowerCase().includes(searchTerm.toLowerCase()) || supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Catálogo de Variedades</h1>
            <p className="text-sm text-gray-500">Gestión de genética vinculada a proveedores.</p>
        </div>
        
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button 
                onClick={handleImportCatalog}
                disabled={isImporting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition w-full md:w-auto justify-center shadow-sm disabled:opacity-70"
              >
                {isImporting ? <span className="animate-spin mr-2">C</span> : <CloudDownload size={20} className="mr-2" />}
                Importar Hemp-it
              </button>
              <button 
                onClick={() => {
                    setEditingId(null);
                    setFormData({ name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0, notes: '' });
                    setIsModalOpen(true);
                }}
                className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition w-full md:w-auto justify-center shadow-sm"
              >
                <Plus size={20} className="mr-2" />
                Nueva Variedad
              </button>
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o proveedor..." 
          className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v => {
            const supplier = suppliers.find(s => s.id === v.supplierId);
            return (
              <div key={v.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
                 {isAdmin && (
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
                  <div className="flex items-center">
                      <Sprout size={18} className="text-hemp-500 mr-2" />
                      <h3 className="text-xl font-bold text-gray-800">{v.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${
                    v.usage === 'Medicinal' ? 'bg-purple-100 text-purple-800' :
                    v.usage === 'Fibra' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {v.usage}
                  </span>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm text-gray-600 mb-3 border border-gray-100">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-semibold text-gray-500">Proveedor:</span> 
                      <span className="font-medium text-gray-900 truncate max-w-[100px]" title={supplier?.name}>{supplier?.name || 'Desconocido'}</span>
                  </div>
                  {/* FIX: Relación explícita con el país del proveedor */}
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-semibold text-gray-500">Origen:</span> 
                      <span className="font-medium text-gray-900 flex items-center">
                          {supplier?.country && <Globe size={10} className="mr-1 text-gray-400"/>}
                          {supplier?.country || 'N/A'}
                      </span>
                  </div>
                  <div className="flex justify-between">
                      <span className="font-semibold text-gray-500">Ciclo / THC:</span> 
                      <span className="font-medium text-gray-900">{v.cycleDays} d / {v.expectedThc}%</span>
                  </div>
                </div>
                
                {v.notes && (
                    <div className="flex items-start text-xs text-gray-500 italic mt-2">
                        <Tag size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                        {v.notes}
                    </div>
                )}
              </div>
            );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Variedad' : 'Registrar Variedad'}</h2>
            
            {suppliers.length === 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-4 flex items-start">
                    <AlertCircle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={18}/>
                    <div>
                        <h4 className="font-bold text-red-800 text-sm">Falta Proveedor</h4>
                        <p className="text-red-700 text-xs mt-1">
                            Debes crear al menos un proveedor antes de registrar variedades.
                        </p>
                        <Link to="/suppliers" className="text-red-900 underline text-xs font-bold mt-2 block">
                            Ir a Proveedores
                        </Link>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uso Principal</label>
                  <select className={inputClass} value={formData.usage} onChange={e => setFormData({...formData, usage: e.target.value as UsageType})}>
                    <option value="Fibra">Fibra</option>
                    <option value="Grano">Grano</option>
                    <option value="Dual">Dual</option>
                    <option value="Medicinal">Medicinal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Building size={12} className="mr-1"/> Proveedor
                  </label>
                  <select 
                    required 
                    className={inputClass} 
                    value={formData.supplierId} 
                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
                    disabled={suppliers.length === 0}
                  >
                      <option value="">Seleccionar...</option>
                      {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días Ciclo</label>
                  <input type="number" className={inputClass} value={formData.cycleDays} onChange={e => setFormData({...formData, cycleDays: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% THC Esperado</label>
                  <input type="number" step="0.01" className={inputClass} value={formData.expectedThc} onChange={e => setFormData({...formData, expectedThc: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas Técnicas</label>
                <textarea className={inputClass} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Monoica/Dioica, características..."></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm" disabled={suppliers.length === 0}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
