
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Variety, UsageType } from '../types';
import { 
  Plus, Search, Tag, Edit2, Trash2, Sprout, AlertCircle, 
  X, Sparkles, BookOpen, Info, Loader2, Save, Archive 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HEMPIT_CATALOG = [
    { 
      name: 'Fedora 17', 
      usage: 'Dual' as UsageType, 
      cycleDays: 135, 
      expectedThc: 0.12, 
      knowledgeBase: 'Variedad monoica muy versátil y precoz. Excelente equilibrio entre producción de semilla y fibra de alta calidad. Muy adaptada a latitudes medias y septentrionales.' 
    },
    { 
      name: 'Felina 32', 
      usage: 'Fibra' as UsageType, 
      cycleDays: 140, 
      expectedThc: 0.15, 
      knowledgeBase: 'Variedad monoica de referencia en Europa. Destaca por la finura y tenacidad de su fibra textil. Muy estable fenotípicamente y resistente al encamado.' 
    },
    { 
      name: 'Ferimon', 
      usage: 'Grano' as UsageType, 
      cycleDays: 130, 
      expectedThc: 0.10, 
      knowledgeBase: 'Especializada en producción de grano para alimentación. Porte medio-bajo que facilita la cosecha mecanizada directa con cosechadora de cereales.' 
    },
    { 
      name: 'Futura 75', 
      usage: 'Fibra' as UsageType, 
      cycleDays: 155, 
      expectedThc: 0.18, 
      knowledgeBase: 'Variedad monoica de ciclo tardío. Máximo potencial de biomasa y producción de paja/fibra técnica. Requiere suelos profundos y buena disponibilidad hídrica para expresar su altura (>3.5m).' 
    },
    { 
      name: 'Santhica 27', 
      usage: 'Fibra' as UsageType, 
      cycleDays: 145, 
      expectedThc: 0.01, 
      knowledgeBase: 'Variedad monoica única: selección libre de THC. Orientada a la producción de CBG y fibra de alta calidad. Ideal para mercados con regulaciones de THC extremadamente estrictas.' 
    },
    { 
      name: 'Muka 76', 
      usage: 'Fibra' as UsageType, 
      cycleDays: 160, 
      expectedThc: 0.12, 
      knowledgeBase: 'Fenotipo de gran altura y riqueza en fibra excepcional (Fibre-Oriented). Ciclo muy largo, maximiza el rendimiento de paja seca por hectárea.' 
    },
    { 
      name: 'Nashinoïde 15', 
      usage: 'Fibra' as UsageType, 
      cycleDays: 140, 
      expectedThc: 0.10, 
      knowledgeBase: 'Variedad seleccionada por su alta riqueza en fibra y facilidad de desfibrado industrial. Monoica, ciclo medio.' 
    },
    { 
      name: 'Ostara 9', 
      usage: 'Grano' as UsageType, 
      cycleDays: 125, 
      expectedThc: 0.08, 
      knowledgeBase: 'Línea específica para Food & Cosmetic. Grano con perfil lipídico óptimo y alta tasa de germinación para brotes.' 
    },
    { 
      name: 'Mona 16', 
      usage: 'Dual' as UsageType, 
      cycleDays: 135, 
      expectedThc: 0.10, 
      knowledgeBase: 'Variedad monoica equilibrada para usos alimentarios y cosméticos. Buena resistencia a enfermedades fúngicas en la semilla.' 
    },
    { 
      name: 'Djumbo 20', 
      usage: 'Medicinal' as UsageType, 
      cycleDays: 150, 
      expectedThc: 0.18, 
      knowledgeBase: 'Variedad Dioica (Plantas Macho y Hembra separadas). Orientada a Food & Cosmetic con potencial interesante en biomasa floral.' 
    },
    { 
      name: 'Futura 83', 
      usage: 'Fibra' as UsageType, 
      cycleDays: 158, 
      expectedThc: 0.15, 
      knowledgeBase: 'Especializada en producción de "Shive" (cañamiza/madera). Estructura de tallo muy robusta con alto contenido de celulosa para aplicaciones en construcción.' 
    },
    { 
      name: 'Earlina 08', 
      usage: 'Grano' as UsageType, 
      cycleDays: 120, 
      expectedThc: 0.05, 
      knowledgeBase: 'La más precoz del catálogo. Ideal para siembras tardías o zonas con veranos muy cortos. Cosecha de grano garantizada antes de las lluvias otoñales.' 
    }
];

export default function Varieties() {
  const { varieties, addVariety, updateVariety, deleteVariety, currentUser, suppliers, seedBatches } = useAppContext();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierForImport, setSelectedSupplierForImport] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Variety>>({
    name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0, notes: '', knowledgeBase: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.supplierId || isSaving) return;
    
    setIsSaving(true);
    try {
        const payload = {
            name: formData.name!.trim(),
            usage: formData.usage as UsageType,
            supplierId: formData.supplierId!, 
            cycleDays: Number(formData.cycleDays),
            expectedThc: Number(formData.expectedThc),
            notes: formData.notes || '',
            knowledgeBase: formData.knowledgeBase || ''
        };

        let success = false;
        if (editingId) {
            success = await updateVariety({ ...payload, id: editingId } as Variety);
        } else {
            success = await addVariety({ ...payload, id: crypto.randomUUID() } as Variety);
        }
        
        if (success) {
            closeModal();
        } else {
            alert("⚠️ Error: No se pudo grabar en el servidor.");
        }
    } catch (err) {
        alert("Fallo de conexión con el servidor de datos.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleHempITImport = async () => {
    if (!selectedSupplierForImport || isSaving) {
        alert("Selecciona un proveedor para asignar el catálogo.");
        return;
    }
    
    setIsSaving(true);
    let count = 0;
    try {
        for (const v of HEMPIT_CATALOG) {
            const exists = varieties.find(ex => ex.name.toLowerCase() === v.name.toLowerCase());
            if (!exists) {
                const success = await addVariety({
                    ...v,
                    id: crypto.randomUUID(),
                    supplierId: selectedSupplierForImport,
                    notes: 'Importado de catálogo oficial HempIT France 2024.'
                } as Variety);
                if (success) count++;
            }
        }
        setIsImportModalOpen(false);
        alert(`✅ Importación finalizada: ${count} nuevas variedades añadidas.`);
    } finally {
        setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', usage: 'Fibra', supplierId: '', cycleDays: 120, expectedThc: 0, notes: '', knowledgeBase: '' });
    setEditingId(null);
  };

  const handleEdit = (v: Variety) => {
    setFormData(v);
    setEditingId(v.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const hasStock = seedBatches.some(b => b.varietyId === id);
    if (hasStock) {
        alert("No se puede eliminar esta variedad porque existen lotes de semillas en inventario vinculados.");
        return;
    }
    if (window.confirm('¿Estás seguro de eliminar esta variedad? Esto podría afectar parcelas existentes.')) {
      deleteVariety(id);
    }
  };

  const filtered = varieties.filter(v => {
      const supplierName = suppliers.find(s => s.id === v.supplierId)?.name || '';
      return v.name.toLowerCase().includes(searchTerm.toLowerCase()) || supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Genética <span className="text-hemp-600">& Biodiversidad</span></h1>
            <p className="text-sm text-gray-500">Gestión de variedades autorizadas y protocolos de manejo técnico.</p>
        </div>
        
        {isAdmin && (
          <div className="flex space-x-2 w-full md:w-auto">
              <button onClick={() => setIsImportModalOpen(true)} className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition shadow-lg font-black text-xs uppercase tracking-widest">
                <Sparkles size={18} className="mr-2" /> Importar HempIT
              </button>
              <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="flex-1 bg-hemp-600 text-white px-5 py-2.5 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-lg font-black text-xs uppercase tracking-widest">
                <Plus size={18} className="mr-2" /> Nueva Variedad
              </button>
          </div>
        )}
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre de genética o proveedor..." 
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-[24px] border border-gray-200 dark:border-slate-800 focus:ring-2 focus:ring-hemp-500 outline-none shadow-sm transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(v => {
            const supplier = suppliers.find(s => s.id === v.supplierId);
            return (
              <div key={v.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full">
                 {isAdmin && (
                   <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(v)} className="p-2 text-gray-400 hover:text-hemp-600 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition"><Trash2 size={16} /></button>
                   </div>
                 )}

                <div className="flex justify-between items-start mb-4 pr-10">
                  <div className="flex items-center">
                      <div className="bg-hemp-50 dark:bg-hemp-900/20 p-3 rounded-2xl mr-3">
                        <Sprout size={24} className="text-hemp-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">{v.name}</h3>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{supplier?.name || 'Origen Desconocido'}</p>
                      </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-xl text-center border dark:border-slate-800">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Uso</p>
                        <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{v.usage}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-xl text-center border dark:border-slate-800">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ciclo</p>
                        <p className="text-xs font-black text-gray-700 dark:text-gray-300">{v.cycleDays}d</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-xl text-center border dark:border-slate-800">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">THC</p>
                        <p className="text-xs font-black text-gray-700 dark:text-gray-300">{v.expectedThc}%</p>
                    </div>
                </div>

                {v.knowledgeBase && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 mb-4 flex-1">
                        <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center mb-2">
                            <BookOpen size={12} className="mr-1.5"/> Ficha de Inteligencia
                        </h4>
                        <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed font-medium italic">
                            {v.knowledgeBase}
                        </p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 gap-2 mt-auto pt-4 border-t dark:border-slate-800">
                    <button 
                        onClick={() => navigate(`/seed-batches?variety=${v.name}`)}
                        className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:scale-[1.02] transition-all shadow-md group"
                    >
                        <Archive size={14} className="mr-2 text-hemp-400 group-hover:scale-110 transition-transform" />
                        Ver Inventario Lotes
                    </button>
                </div>
              </div>
            );
        })}
      </div>

      {/* MODAL IMPORTACIÓN HempIT */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-lg w-full p-10 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Sparkles size={24}/></div>
                          <div>
                              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">HempIT France</h2>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Importador de Catálogo Oficial</p>
                          </div>
                      </div>
                      <button onClick={() => !isSaving && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled={isSaving}><X size={28}/></button>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Vincular al Proveedor</label>
                          <select 
                            className={inputClass} 
                            value={selectedSupplierForImport} 
                            onChange={e => setSelectedSupplierForImport(e.target.value)}
                            disabled={isSaving}
                          >
                              <option value="">-- Seleccionar Proveedor --</option>
                              {suppliers.filter(s => s.category === 'Semillas').map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                              ))}
                          </select>
                          <p className="text-[9px] text-slate-400 mt-3 italic">* Se cargarán Fedora 17, Felina 32, Futura 75/83, Santhica, Muka y más con sus fichas técnicas.</p>
                      </div>
                      
                      <button 
                        onClick={handleHempITImport}
                        disabled={!selectedSupplierForImport || isSaving}
                        className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all disabled:opacity-30 flex items-center justify-center"
                      >
                          {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
                          Confirmar Importación Catálogo
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CREAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-2xl w-full p-10 shadow-2xl animate-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestionar <span className="text-hemp-600">Genética</span></h2>
              <button onClick={() => !isSaving && closeModal()} disabled={isSaving} className="text-slate-400 hover:text-slate-600"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center"><Sprout size={14} className="mr-2"/> Datos Básicos</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Nombre Comercial *</label>
                      <input required disabled={isSaving} type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Fedora 17" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Uso Principal</label>
                        <select disabled={isSaving} className={inputClass} value={formData.usage} onChange={e => setFormData({...formData, usage: e.target.value as UsageType})}>
                          <option value="Fibra">Fibra</option>
                          <option value="Grano">Grano</option>
                          <option value="Dual">Dual</option>
                          <option value="Medicinal">Medicinal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Proveedor *</label>
                        <select required disabled={isSaving} className={inputClass} value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Días de Ciclo</label>
                        <input disabled={isSaving} type="number" className={inputClass} value={formData.cycleDays} onChange={e => setFormData({...formData, cycleDays: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">% THC Esperado</label>
                        <input disabled={isSaving} type="number" step="0.01" className={inputClass} value={formData.expectedThc} onChange={e => setFormData({...formData, expectedThc: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/20">
                   <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center"><BookOpen size={14} className="mr-2"/> Base de Conocimiento (Protocolos)</h3>
                   <textarea disabled={isSaving} className={`${inputClass} border-blue-100`} rows={4} value={formData.knowledgeBase || ''} onChange={e => setFormData({...formData, knowledgeBase: e.target.value})} placeholder="Instrucciones especiales de siembra, fertilización o cosecha para esta variedad..."></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t dark:border-slate-800">
                <button type="button" disabled={isSaving} onClick={closeModal} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {isSaving ? 'Guardando...' : 'Guardar Genética'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
