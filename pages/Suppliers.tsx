import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Supplier } from '../types';
import { Plus, Edit2, Trash2, Building, MapPin, Globe, Phone, Mail, User, UserCheck, Truck } from 'lucide-react';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, currentUser, varieties } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', legalName: '', cuit: '', country: '', province: '', city: '', address: '',
    commercialContact: '', logisticsContact: '', website: '', notes: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const payload = {
        name: formData.name!,
        legalName: formData.legalName || '',
        cuit: formData.cuit || '',
        country: formData.country || 'Argentina',
        province: formData.province || '',
        city: formData.city || '',
        address: formData.address || '',
        commercialContact: formData.commercialContact || '',
        logisticsContact: formData.logisticsContact || '',
        website: formData.website || '',
        notes: formData.notes || ''
    };

    if (editingId) {
        updateSupplier({ ...payload, id: editingId } as Supplier);
    } else {
        addSupplier({
            ...payload,
            id: Date.now().toString(),
        });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', legalName: '', cuit: '', country: '', province: '', city: '', address: '',
        commercialContact: '', logisticsContact: '', website: '', notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
      setFormData(s);
      setEditingId(s.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      // Check if supplier has varieties
      const hasVarieties = varieties.some(v => v.supplierId === id);
      if (hasVarieties) {
          alert("No se puede eliminar este proveedor porque tiene Variedades asociadas.");
          return;
      }

      if(window.confirm("¿Eliminar este proveedor?")) {
          deleteSupplier(id);
      }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Building className="mr-2 text-hemp-600"/> Gestión de Proveedores
            </h1>
            <p className="text-sm text-gray-500">Semilleros y Breeders autorizados.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Nuevo Proveedor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No hay proveedores registrados.</p>
                <p className="text-xs text-gray-400 mt-1">Registra un proveedor antes de crear variedades.</p>
            </div>
        ) : suppliers.map(supplier => (
            <div key={supplier.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group flex flex-col h-full">
              {isAdmin && (
                  <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => handleEdit(supplier)} className="text-gray-400 hover:text-hemp-600 p-1 bg-white rounded shadow-sm border">
                          <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(supplier.id)} className="text-gray-400 hover:text-red-600 p-1 bg-white rounded shadow-sm border">
                          <Trash2 size={16} />
                      </button>
                  </div>
              )}

              <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-purple-100 p-3 rounded-full text-purple-700">
                      <Building size={20} />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-gray-800 leading-tight">{supplier.name}</h3>
                      <span className="text-xs text-gray-500 flex items-center mt-0.5">
                          <Globe size={10} className="mr-1"/> {supplier.city ? `${supplier.city}, ` : ''}{supplier.country}
                      </span>
                  </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg flex-1">
                  {supplier.legalName && (
                      <div className="flex justify-between border-b border-gray-200 pb-1">
                          <span className="font-semibold text-gray-500 text-xs uppercase">Razón Social</span>
                          <span className="truncate max-w-[120px]" title={supplier.legalName}>{supplier.legalName}</span>
                      </div>
                  )}
                  {supplier.cuit && (
                      <div className="flex justify-between border-b border-gray-200 pb-1">
                          <span className="font-semibold text-gray-500 text-xs uppercase">CUIT/Tax ID</span>
                          <span>{supplier.cuit}</span>
                      </div>
                  )}
                  
                  {/* Contact Preview */}
                  {(supplier.commercialContact || supplier.logisticsContact) && (
                      <div className="pt-2 mt-2 border-t border-gray-200 space-y-2">
                          {supplier.commercialContact && (
                              <div className="flex items-start text-xs">
                                  <UserCheck size={12} className="mr-2 text-blue-500 mt-0.5" title="Comercial"/>
                                  <div>
                                      <span className="font-bold block text-gray-700">Comercial:</span>
                                      <span className="text-gray-500">{supplier.commercialContact}</span>
                                  </div>
                              </div>
                          )}
                          {supplier.logisticsContact && (
                              <div className="flex items-start text-xs">
                                  <Truck size={12} className="mr-2 text-green-500 mt-0.5" title="Logística"/>
                                  <div>
                                      <span className="font-bold block text-gray-700">Logística:</span>
                                      <span className="text-gray-500">{supplier.logisticsContact}</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              
              <div className="mt-3 flex justify-between items-center text-xs">
                  {supplier.website ? (
                      <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">
                          {supplier.website}
                      </a>
                  ) : <span></span>}
                  
                  <span className="font-bold text-gray-400" title="Variedades Registradas">
                      {varieties.filter(v => v.supplierId === supplier.id).length} VAR
                  </span>
              </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                      <Building size={12} className="mr-1"/> Identidad
                  </h3>
                  <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial (Fantasía)</label>
                        <input required type="text" placeholder="Ej: Hemp-it" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                            <input type="text" className={inputClass} value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CUIT / ID Fiscal</label>
                            <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label>
                        <input type="text" className={inputClass} value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                      </div>
                  </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <h3 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center">
                      <MapPin size={12} className="mr-1"/> Ubicación
                   </h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                        <input type="text" placeholder="Argentina" className={inputClass} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provincia / Estado</label>
                        <input type="text" className={inputClass} value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                        <input type="text" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Postal</label>
                        <input type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                   </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                   <h3 className="text-xs font-bold text-green-700 uppercase mb-3 flex items-center">
                      <Phone size={12} className="mr-1"/> Contactos
                   </h3>
                   <div className="space-y-3">
                       <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Comercial (Ventas)</label>
                            <input type="text" placeholder="Nombre - Teléfono / Email" className={inputClass} value={formData.commercialContact} onChange={e => setFormData({...formData, commercialContact: e.target.value})} />
                       </div>
                       <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Logística (Despacho)</label>
                            <input type="text" placeholder="Nombre - Teléfono / Email" className={inputClass} value={formData.logisticsContact} onChange={e => setFormData({...formData, logisticsContact: e.target.value})} />
                       </div>
                   </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas</label>
                <textarea rows={2} className={inputClass} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Observaciones sobre la relación comercial..." />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}