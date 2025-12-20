
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Supplier, SupplierCategory } from '../types';
import { Plus, Edit2, Trash2, Building, MapPin, Globe, Phone, Mail, User, UserCheck, Truck, Tag, Wrench, Users, X, Navigation } from 'lucide-react';
import MapEditor from '../components/MapEditor';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, currentUser, varieties } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', category: 'Semillas', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
    commercialContact: '', logisticsContact: '', website: '', notes: '', coordinates: undefined
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const payload = {
        ...formData,
        name: formData.name!.trim(),
        category: formData.category as SupplierCategory,
    } as Supplier;

    if (editingId) {
        updateSupplier({ ...payload, id: editingId });
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
        name: '', category: 'Semillas', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '',
        commercialContact: '', logisticsContact: '', website: '', notes: '', coordinates: undefined
    });
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
      setFormData(s);
      setEditingId(s.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      const hasVarieties = varieties.some(v => v.supplierId === id);
      if (hasVarieties) {
          alert("No se puede eliminar este proveedor porque tiene Variedades asociadas. Elimine primero la genética vinculada.");
          return;
      }
      if(window.confirm("¿Eliminar este proveedor?")) deleteSupplier(id);
  };

  const getCategoryIcon = (cat: SupplierCategory) => {
      switch(cat) {
          case 'Semillas': return <Tag size={16} />;
          case 'Insumos': return <Truck size={16} />;
          case 'Servicios': return <Wrench size={16} />;
          case 'Recursos Humanos': return <Users size={16} />;
          default: return <Building size={16} />;
      }
  };

  const getCategoryColor = (cat: SupplierCategory) => {
      switch(cat) {
          case 'Semillas': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
          case 'Insumos': return 'bg-amber-50 text-amber-700 border-amber-100';
          case 'Servicios': return 'bg-blue-50 text-blue-700 border-blue-100';
          case 'Recursos Humanos': return 'bg-purple-50 text-purple-700 border-purple-100';
          default: return 'bg-gray-50 text-gray-700 border-gray-100';
      }
  };

  const handleMapChange = (poly: { lat: number, lng: number }[]) => {
      if (poly.length > 0) {
          setFormData(prev => ({ ...prev, coordinates: poly[0] }));
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Gestión de <span className="text-hemp-600">Proveedores</span></h1>
            <p className="text-sm text-gray-500">Georreferenciación y logística de suministros.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Nuevo Proveedor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-gray-300 dark:border-slate-800">
                <Building size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-bold">No hay proveedores registrados.</p>
                <p className="text-xs text-gray-400 mt-1">Haga clic en 'Nuevo Proveedor' para comenzar.</p>
            </div>
        ) : suppliers.map(supplier => (
            <div key={supplier.id} className="bg-white dark:bg-slate-900 p-0 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full overflow-hidden">
              
              <div className="h-32 bg-slate-100 dark:bg-slate-800 relative">
                  {supplier.coordinates ? (
                      <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${supplier.coordinates.lat},${supplier.coordinates.lng}&z=14&output=embed`} className="opacity-80"></iframe>
                  ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-950">
                          <MapPin size={16} className="mr-2 opacity-50"/> Sin ubicación GPS
                      </div>
                  )}
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm ${getCategoryColor(supplier.category)}`}>
                      {getCategoryIcon(supplier.category)}
                      {supplier.category}
                  </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight uppercase tracking-tighter">{supplier.name}</h3>
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center mt-1">
                              <Globe size={10} className="mr-1 text-blue-500"/> {supplier.city ? `${supplier.city}, ` : ''}{supplier.country}
                          </span>
                      </div>
                      {isAdmin && (
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(supplier)} className="text-gray-400 hover:text-hemp-600 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition"><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete(supplier.id)} className="text-gray-400 hover:text-red-600 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition"><Trash2 size={14} /></button>
                          </div>
                      )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl flex-1 border border-gray-100 dark:border-slate-800">
                      <div className="flex justify-between border-b dark:border-slate-800 border-gray-200 pb-2">
                          <span className="font-bold text-gray-400 text-[10px] uppercase">Razón Social</span>
                          <span className="font-black text-xs text-gray-700 dark:text-gray-200 truncate max-w-[140px] uppercase">{supplier.legalName || 'N/A'}</span>
                      </div>
                      
                      <div className="pt-2 space-y-2">
                          {supplier.commercialContact && (
                              <div className="flex items-center text-xs">
                                  <UserCheck size={14} className="mr-2 text-blue-500" />
                                  <span className="font-medium text-gray-500">{supplier.commercialContact}</span>
                              </div>
                          )}
                          {supplier.address && (
                              <div className="flex items-center text-[10px] text-gray-500">
                                  <MapPin size={12} className="mr-2 text-red-400" />
                                  <span className="truncate">{supplier.address}</span>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  {supplier.category === 'Semillas' && (
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Variedades Registradas</span>
                          <span className="text-hemp-600 bg-hemp-50 dark:bg-hemp-900/20 px-2 py-0.5 rounded-full">{varieties.filter(v => v.supplierId === supplier.id).length}</span>
                      </div>
                  )}
              </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestionar <span className="text-hemp-600">Proveedor</span></h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <Building size={14} className="mr-2"/> Identidad Corporativa
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Nombre de Fantasía *</label>
                                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Categoría</label>
                                    <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as SupplierCategory})}>
                                        <option value="Semillas">Semillas (Genética)</option>
                                        <option value="Insumos">Insumos (Fert/Fito)</option>
                                        <option value="Servicios">Servicios (Log/Maq)</option>
                                        <option value="Recursos Humanos">RRHH / Contratistas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">CUIT / ID Fiscal</label>
                                    <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                         <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <Phone size={14} className="mr-2"/> Contactos
                         </h3>
                         <div className="space-y-4">
                            <input type="text" placeholder="Responsable Comercial" className={inputClass} value={formData.commercialContact} onChange={e => setFormData({...formData, commercialContact: e.target.value})} />
                            <input type="text" placeholder="Sitio Web (url)" className={inputClass} value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                         </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30 flex flex-col h-full">
                        <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <MapPin size={14} className="mr-2"/> Localización Geográfica
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <input type="text" placeholder="País" className={inputClass} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                            <input type="text" placeholder="Ciudad" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                        </div>
                        <div className="flex-1 min-h-[250px] rounded-2xl overflow-hidden border dark:border-slate-800">
                             <MapEditor 
                                initialCenter={formData.coordinates} 
                                initialPolygon={formData.coordinates ? [formData.coordinates] : []} 
                                onPolygonChange={handleMapChange} 
                                height="100%" 
                             />
                        </div>
                        <p className="text-[10px] font-black text-blue-400 uppercase mt-4 text-center">Marque el punto exacto para trazabilidad de ruta</p>
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                <button type="submit" className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {editingId ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
