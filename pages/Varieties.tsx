
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Variety, UsageType } from '../types';
import { Plus, Search, Tag, Edit2, Trash2, CloudDownload, Sprout, AlertCircle, Building, Globe, Archive, Truck, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Varieties() {
  const { varieties, addVariety, updateVariety, deleteVariety, currentUser, suppliers } = useAppContext();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filtered = varieties.filter(v => {
      const supplierName = suppliers.find(s => s.id === v.supplierId)?.name || '';
      return v.name.toLowerCase().includes(searchTerm.toLowerCase()) || supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none transition-colors";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800">Catálogo Genético</h1>
            <p className="text-sm text-gray-500">Gestión de variedades autorizadas y trazabilidad de origen.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
                setEditingId(null);
                setFormData({ name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0, notes: '' });
                setIsModalOpen(true);
            }}
            className="bg-hemp-600 text-white px-5 py-2.5 rounded-xl flex items-center hover:bg-hemp-700 transition w-full md:w-auto justify-center shadow-lg font-bold"
          >
            <Plus size={20} className="mr-2" />
            Nueva Variedad
          </button>
        )}
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre de genética o semillero..." 
          className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-hemp-500 outline-none shadow-sm transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(v => {
            const supplier = suppliers.find(s => s.id === v.supplierId);
            return (
              <div key={v.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all relative group flex flex-col h-full">
                 {isAdmin && (
                   <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(v)} className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-gray-100"><Trash2 size={16} /></button>
                   </div>
                 )}

                <div className="flex justify-between items-start mb-4 pr-10">
                  <div className="flex items-center">
                      <div className="bg-hemp-50 p-2.5 rounded-xl mr-3">
                        <Sprout size={20} className="text-hemp-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-800">{v.name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    v.usage === 'Medicinal' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    v.usage === 'Fibra' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    v.usage === 'Grano' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {v.usage}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="font-bold text-gray-400 text-xs uppercase tracking-tighter">Semillero</span> 
                      <span className="font-black text-gray-800 truncate max-w-[140px]" title={supplier?.name}>{supplier?.name || 'S/D'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="font-bold text-gray-400 text-xs uppercase tracking-tighter">Ciclo Est.</span> 
                      <span className="font-black text-gray-800">{v.cycleDays} días</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-400 text-xs uppercase tracking-tighter">THC Ref.</span> 
                      <span className="font-black text-gray-800">{v.expectedThc}%</span>
                  </div>
                </div>
                
                {v.notes && (
                    <p className="text-xs text-gray-500 italic mb-6 flex-1 line-clamp-3 leading-relaxed">
                        "{v.notes}"
                    </p>
                )}

                {/* STOCK ACTION BUTTONS */}
                <div className="grid grid-cols-1 gap-2 mt-auto">
                    <button 
                        onClick={() => navigate(`/seed-batches?variety=${v.name}`)}
                        className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-black transition shadow-sm group"
                    >
                        <Archive size={14} className="mr-2 text-hemp-400 group-hover:scale-110 transition-transform" />
                        Ver Inventario
                    </button>
                    <button 
                        onClick={() => navigate(`/seed-batches?tab=logistics&variety=${v.name}`)}
                        className="w-full bg-white text-gray-700 border border-gray-200 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-gray-50 transition shadow-sm group"
                    >
                        <Truck size={14} className="mr-2 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        Despachar (Logística)
                    </button>
                </div>
              </div>
            );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-6 text-gray-900">{editingId ? 'Editar Genética' : 'Registrar Nueva Genética'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Nombre Comercial *</label>
                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Fedora 17" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Uso Principal</label>
                  <select className={inputClass} value={formData.usage} onChange={e => setFormData({...formData, usage: e.target.value as UsageType})}>
                    <option value="Fibra">Fibra</option>
                    <option value="Grano">Grano</option>
                    <option value="Dual">Dual</option>
                    <option value="Medicinal">Medicinal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Proveedor *</label>
                  <select 
                    required 
                    className={inputClass} 
                    value={formData.supplierId} 
                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
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
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Días de Ciclo</label>
                  <input type="number" className={inputClass} value={formData.cycleDays} onChange={e => setFormData({...formData, cycleDays: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">% THC Esperado</label>
                  <input type="number" step="0.01" className={inputClass} value={formData.expectedThc} onChange={e => setFormData({...formData, expectedThc: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Notas Técnicas</label>
                <textarea className={inputClass} rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Características agronómicas destacadas..."></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                <button type="submit" className="px-8 py-2.5 bg-hemp-600 text-white rounded-xl font-black shadow-lg shadow-hemp-900/20 hover:bg-hemp-700 transition">Guardar Genética</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
