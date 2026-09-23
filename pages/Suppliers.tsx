import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Supplier, SupplierCategory } from '../types';
import { 
  Plus, Edit2, Trash2, Building, MapPin, Mail, Globe, 
  Search, Save, Loader2, X, Briefcase, Truck, Users, Sprout
} from 'lucide-react';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, currentUser } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState<Partial<Supplier> & { lat: string, lng: string }>({
    name: '', category: 'Insumos', legalName: '', cuit: '', country: '', province: '', city: '', address: '',
    whatsapp: '', email: '', commercialContact: '', logisticsContact: '', website: '', notes: '',
    isOfficialPartner: false, lat: '', lng: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const filteredSuppliers = useMemo(() => {
      return suppliers.filter(s => {
          const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (s.legalName || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchCategory = filterCategory === 'all' || s.category === filterCategory;
          return matchSearch && matchCategory;
      });
  }, [suppliers, searchTerm, filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat.replace(',', '.'));
        const finalLng = parseFloat(formData.lng.replace(',', '.'));
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
            commercialContact: formData.commercialContact,
            logisticsContact: formData.logisticsContact,
            website: formData.website,
            notes: formData.notes,
            isOfficialPartner: formData.isOfficialPartner,
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
            alert("Error al guardar proveedor.");
        }
    } catch (err: any) { 
        alert("ERROR OPERATIVO: " + err.message);
    } finally { 
        setIsSaving(false); 
    }
  };

  const resetForm = () => {
    setFormData({ 
        name: '', category: 'Insumos', legalName: '', cuit: '', country: '', province: '', city: '', address: '',
        whatsapp: '', email: '', commercialContact: '', logisticsContact: '', website: '', notes: '',
        isOfficialPartner: false, lat: '', lng: ''
    });
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
      setFormData({
          ...s,
          lat: s.coordinates?.lat.toString() || '',
          lng: s.coordinates?.lng.toString() || ''
      });
      setEditingId(s.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("¿Está seguro de eliminar este proveedor?")) {
          deleteSupplier(id);
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all placeholder-gray-400";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">
                Red de <span className="text-hemp-600">Proveedores</span>
            </h1>
            <p className="text-sm text-gray-500">Gestión de partners estratégicos y cadena de suministro.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Nuevo Proveedor
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[24px] shadow-sm border dark:border-slate-800 flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Buscar por nombre o razón social..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border border-transparent focus:bg-white dark:focus:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-2">
              <select className="px-4 py-3 bg-gray-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none dark:text-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="all">Todas las Categorías</option>
                  <option value="Semillas">Semillas</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Recursos Humanos">RRHH</option>
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full">
                {isAdmin && (
                    <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={() => handleEdit(s)} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Trash2 size={16} /></button>
                    </div>
                )}

                <div className="flex items-center space-x-4 mb-6">
                    <div className={`p-4 rounded-2xl ${s.isOfficialPartner ? 'bg-hemp-50 text-hemp-600' : 'bg-slate-50 text-slate-500'} dark:bg-slate-800`}>
                        {s.category === 'Semillas' ? <Sprout size={24}/> : 
                         s.category === 'Insumos' ? <Briefcase size={24}/> : 
                         s.category === 'Servicios' ? <Truck size={24}/> : <Users size={24}/>}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white leading-none uppercase tracking-tighter truncate" title={s.name}>{s.name}</h3>
                        <span className="text-[10px] uppercase font-black text-gray-400 mt-1 block tracking-widest">{s.category}</span>
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="flex items-start text-xs text-gray-500">
                        <MapPin size={14} className="mr-2 mt-0.5 text-slate-400 flex-shrink-0"/>
                        <span className="line-clamp-2">{s.city ? `${s.city}, ${s.country}` : 'Ubicación no especificada'}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        <Building size={14} className="mr-2 text-slate-400 flex-shrink-0"/>
                        <span className="truncate">{s.legalName || s.name}</span>
                    </div>
                    {s.email && (
                        <div className="flex items-center text-xs text-gray-500">
                            <Mail size={14} className="mr-2 text-slate-400 flex-shrink-0"/>
                            <a href={`mailto:${s.email}`} className="truncate hover:text-hemp-600">{s.email}</a>
                        </div>
                    )}
                </div>

                {s.isOfficialPartner && (
                    <div className="mt-4 pt-4 border-t dark:border-slate-800">
                        <span className="text-[9px] font-black text-white bg-hemp-600 px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center">
                            Partner Oficial
                        </span>
                    </div>
                )}
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl animate-in zoom-in-95 border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Briefcase size={28}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestión de <span className="text-hemp-600">Proveedor</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Alta de entidad en la cadena de valor</p>
                    </div>
                </div>
                <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-800 pb-2">Datos Comerciales</h3>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nombre Comercial *</label>
                            <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Razón Social</label>
                            <input type="text" className={inputClass} value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Categoría</label>
                                <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as SupplierCategory})}>
                                    <option value="Semillas">Semillas</option>
                                    <option value="Insumos">Insumos</option>
                                    <option value="Servicios">Servicios</option>
                                    <option value="Recursos Humanos">RRHH</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CUIT / ID</label>
                                <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <input type="checkbox" id="isOfficial" className="rounded text-hemp-600 focus:ring-hemp-500" checked={formData.isOfficialPartner} onChange={e => setFormData({...formData, isOfficialPartner: e.target.checked})} />
                            <label htmlFor="isOfficial" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">Proveedor Oficial / Partner Certificado</label>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-800 pb-2">Ubicación y Contacto</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">País</label>
                                <input type="text" className={inputClass} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Ciudad</label>
                                <input type="text" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Email Contacto</label>
                            <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Teléfono / WA</label>
                                <input type="text" className={inputClass} value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Sitio Web</label>
                                <input type="text" className={inputClass} value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t dark:border-slate-800 flex justify-end space-x-3">
                    <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                        Guardar Proveedor
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}