
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Supplier, SupplierCategory } from '../types';
import { 
  Plus, Edit2, Trash2, Building, MapPin, Globe, Phone, Mail, 
  UserCheck, Truck, Tag, Wrench, Users, X, MessageCircle, 
  Hash, CheckCircle2, ShieldCheck, ShoppingBag, ArrowRight, Eye,
  // Added Sprout icon
  Sprout
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, currentUser, varieties, seedBatches } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', category: 'Semillas', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '', postalCode: '',
    whatsapp: '', email: '', commercialContact: '', website: '', coordinates: undefined, isOfficialPartner: false
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- CALCULATIONS ---
  const providedVarieties = useMemo(() => 
    viewSupplier ? varieties.filter(v => v.supplierId === viewSupplier.id) : []
  , [viewSupplier, varieties]);

  const totalStockProvided = useMemo(() => {
    if (!viewSupplier) return 0;
    const varIds = varieties.filter(v => v.supplierId === viewSupplier.id).map(v => v.id);
    return seedBatches.filter(b => varIds.includes(b.varietyId)).reduce((s, b) => s + b.initialQuantity, 0);
  }, [viewSupplier, seedBatches, varieties]);

  // --- HANDLERS ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const payload = {
        ...formData,
        name: formData.name!.trim(),
        id: editingId || Date.now().toString(),
    } as Supplier;

    if (editingId) {
        updateSupplier(payload);
    } else {
        addSupplier(payload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', category: 'Semillas', legalName: '', cuit: '', country: 'Argentina', province: '', city: '', address: '', postalCode: '',
        whatsapp: '', email: '', commercialContact: '', website: '', coordinates: undefined, isOfficialPartner: false
    });
    setEditingId(null);
  };

  const handleMapChange = (poly: { lat: number, lng: number }[]) => {
      if (poly.length > 0) {
          setFormData(prev => ({ ...prev, coordinates: poly[0] }));
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

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Administración de <span className="text-hemp-600">Suministros</span></h1>
            <p className="text-sm text-gray-500">Control de proveedores oficiales y trazabilidad de origen.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Nuevo Proveedor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(supplier => (
            <div key={supplier.id} className="bg-white dark:bg-slate-900 p-0 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full overflow-hidden">
              
              <div className="h-32 bg-slate-100 dark:bg-slate-800 relative">
                  {supplier.coordinates ? (
                      <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${supplier.coordinates.lat},${supplier.coordinates.lng}&z=14&output=embed`} className="opacity-80 group-hover:opacity-100 transition-opacity"></iframe>
                  ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-950">
                          <MapPin size={16} className="mr-2 opacity-50"/> Localización S/D
                      </div>
                  )}
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm ${getCategoryColor(supplier.category)}`}>
                      {supplier.category}
                  </div>
                  {supplier.isOfficialPartner && (
                      <div className="absolute top-4 right-4 bg-blue-600 text-white p-1.5 rounded-xl shadow-lg" title="Socio Oficial">
                          <ShieldCheck size={14}/>
                      </div>
                  )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight uppercase tracking-tighter">{supplier.name}</h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{supplier.legalName || 'Persona Jurídica N/A'}</p>
                      </div>
                      {isAdmin && (
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewSupplier(supplier)} className="text-gray-400 hover:text-blue-600 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition"><Eye size={14}/></button>
                              <button onClick={() => { setFormData(supplier); setEditingId(supplier.id); setIsModalOpen(true); }} className="text-gray-400 hover:text-hemp-600 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition"><Edit2 size={14} /></button>
                          </div>
                      )}
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suministros</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{varieties.filter(v => v.supplierId === supplier.id).length} Variedades</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                          {supplier.whatsapp && (
                              <a href={`https://wa.me/${supplier.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center text-[10px] font-black uppercase text-white bg-green-600 px-3 py-1.5 rounded-full hover:bg-green-700 transition">
                                  <MessageCircle size={10} className="mr-1.5"/> Chat
                              </a>
                          )}
                          {supplier.email && (
                              <a href={`mailto:${supplier.email}`} className="flex items-center text-[10px] font-black uppercase text-white bg-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-700 transition">
                                  <Mail size={10} className="mr-1.5"/> Email
                              </a>
                          )}
                      </div>
                  </div>
                  
                  <div className="pt-4 border-t dark:border-slate-800 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center"><MapPin size={10} className="mr-1.5 text-red-500"/> {supplier.city || 'Ubicación S/D'}</span>
                      <button onClick={() => setViewSupplier(supplier)} className="text-hemp-600 hover:underline">Auditoría →</button>
                  </div>
              </div>
            </div>
        ))}
      </div>

      {/* --- SUPPLIER DETAIL MODAL --- */}
      {viewSupplier && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                  <div className="px-10 py-8 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-600/20"><Building size={32}/></div>
                          <div>
                              <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">{viewSupplier.name}</h2>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Auditado bajo protocolo industrial</p>
                          </div>
                      </div>
                      <button onClick={() => setViewSupplier(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={32}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-10">
                      <section>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center"><Tag size={14} className="mr-2 text-hemp-600"/> Catálogo de Suministros (Variedades)</h4>
                          <div className="space-y-3">
                              {providedVarieties.length === 0 ? (
                                  <div className="py-10 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-950 rounded-3xl border border-dashed">Sin variedades registradas de este origen.</div>
                              ) : providedVarieties.map(v => (
                                  <div key={v.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 flex items-center justify-between shadow-sm">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-hemp-50 dark:bg-hemp-900/30 p-2 rounded-xl text-hemp-600"><Sprout size={18}/></div>
                                          <p className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{v.name}</p>
                                      </div>
                                      <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border dark:border-slate-700">{v.usage}</span>
                                  </div>
                              ))}
                          </div>
                      </section>

                      <section className="space-y-8">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center"><ShoppingBag size={14} className="mr-2 text-blue-600"/> Estadísticas de Entrega</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                                    <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Volumen Histórico</p>
                                    <p className="text-2xl font-black text-blue-900 dark:text-blue-100">{totalStockProvided} kg</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Estatus</p>
                                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-100">Certificado</p>
                                </div>
                            </div>
                          </div>

                          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ubicación Logística</h4>
                                <div className="h-40 rounded-2xl overflow-hidden border border-white/10 mb-4">
                                    {viewSupplier.coordinates ? (
                                        <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${viewSupplier.coordinates.lat},${viewSupplier.coordinates.lng}&z=14&output=embed`} className="grayscale"></iframe>
                                    ) : <div className="h-full bg-slate-800 flex items-center justify-center text-xs text-slate-500 uppercase font-black">Sin coordenadas</div>}
                                </div>
                                <p className="text-xs text-slate-300 font-medium"><MapPin size={12} className="inline mr-1 text-red-500"/> {viewSupplier.address}, {viewSupplier.city}, {viewSupplier.province}</p>
                          </div>
                      </section>
                  </div>
              </div>
          </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-5xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <h2 className="text-3xl font-black mb-8 text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestionar <span className="text-hemp-600">Proveedor de Suministros</span></h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center"><Building size={14} className="mr-2"/> Datos Corporativos</h3>
                            <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
                                <input type="checkbox" className="rounded text-blue-500 focus:ring-blue-400" checked={formData.isOfficialPartner} onChange={e => setFormData({...formData, isOfficialPartner: e.target.checked})} />
                                <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-tighter">Socio Oficial de Red</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Nombre Comercial *</label>
                                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Fertilizantes del Norte S.A." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Categoría Rubro</label>
                                <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as SupplierCategory})}>
                                    <option value="Semillas">Semillas (Genética)</option>
                                    <option value="Insumos">Insumos (Fert/Fito)</option>
                                    <option value="Servicios">Servicios (Log/Maq)</option>
                                    <option value="Recursos Humanos">RRHH / Contratistas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">CUIT / Tax ID</label>
                                <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                         <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center"><Phone size={14} className="mr-2"/> Canales de Comunicación</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">Responsable Comercial</label>
                                <input type="text" className={inputClass} value={formData.commercialContact} onChange={e => setFormData({...formData, commercialContact: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5">WhatsApp Logística</label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" size={16}/>
                                    <input type="text" className={`${inputClass} pl-10`} value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="+54 9 11..." />
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30 flex flex-col h-full">
                        <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center"><MapPin size={14} className="mr-2"/> Georreferencia Logística</h3>
                        <div className="space-y-4 mb-4">
                            <input type="text" placeholder="Ciudad / Provincia" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                            <input type="text" placeholder="Dirección Fiscal/Carga" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                        <div className="flex-1 min-h-[200px] rounded-2xl overflow-hidden border dark:border-slate-800 shadow-inner">
                             <MapEditor initialCenter={formData.coordinates} initialPolygon={formData.coordinates ? [formData.coordinates] : []} onPolygonChange={handleMapChange} height="100%" />
                        </div>
                        <p className="text-[9px] font-black text-blue-400 uppercase mt-4 text-center italic">Marque el punto exacto para cálculo de fletes y rutas</p>
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                <button type="submit" className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
