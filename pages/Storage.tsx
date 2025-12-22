
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { StoragePoint } from '../types';
import { 
  Plus, Warehouse, Edit2, Trash2, MapPin, User, 
  Maximize, X, Building, ShieldCheck, Truck, 
  Package, Search, Filter, FilterX, Save, Loader2, Info, ChevronRight, ScanBarcode, RefreshCw, Navigation
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

// Helper: Convertidor robusto de DMS a Decimal
const parseCoordinate = (input: string): string => {
    if (!input) return '';
    const clean = input.trim().toUpperCase();
    
    // Si ya es decimal, lo devolvemos limpio
    const isDecimal = /^-?[\d.]+$/.test(clean);
    if (isDecimal) return clean;

    // Regex para capturar Grados° Minutos' Segundos" Hemisferio
    // Soporta formatos como 43°15'23"S, 43 15 23 S, 43:15:23 S
    const dmsRegex = /(\d+)[°\s:]+(\d+)['\s:]+(\d+(?:\.\d+)?)["\s]*([NSEW])?/i;
    const match = clean.match(dmsRegex);

    if (match) {
        let deg = parseFloat(match[1]);
        let min = parseFloat(match[2]);
        let sec = parseFloat(match[3]);
        let dir = match[4] || '';
        
        // Si no hay dirección explícita pero hay un signo menos o letras específicas
        if (!dir) {
            if (clean.includes('S') || clean.includes('W') || clean.startsWith('-')) dir = 'S';
        }

        let decimal = deg + (min / 60) + (sec / 3600);
        if (dir === 'S' || dir === 'W' || clean.includes('S') || clean.includes('W')) {
            decimal = decimal * -1;
        }
        return decimal.toFixed(7);
    }
    return input;
};

export default function Storage() {
  const { 
    storagePoints, addStoragePoint, updateStoragePoint, deleteStoragePoint, 
    currentUser, usersList, clients, seedBatches 
  } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [renderMap, setRenderMap] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState<'all' | 'central' | 'client'>('all');

  const [formData, setFormData] = useState<Partial<StoragePoint> & { lat: string, lng: string }>({
    name: '', nodeCode: '', type: 'Propio', address: '', city: '', province: '',
    clientId: '', responsibleUserId: '', surfaceM2: 0, conditions: '', notes: '',
    lat: '', lng: ''
  });

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => setRenderMap(true), 400);
      return () => clearTimeout(timer);
    } else {
      setRenderMap(false);
    }
  }, [isModalOpen]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const generateAutoCode = () => {
      const prefix = "HNC";
      const random = Math.floor(1000 + Math.random() * 9000);
      setFormData(prev => ({ ...prev, nodeCode: `${prefix}-${random}` }));
  };

  const handleCoordinateBlur = (field: 'lat' | 'lng') => {
      const val = formData[field];
      if (val) {
          const parsed = parseCoordinate(val);
          setFormData(prev => ({ ...prev, [field]: parsed }));
      }
  };

  const filteredPoints = useMemo(() => {
    return storagePoints.filter(sp => {
        const matchesSearch = sp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             sp.city?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (sp.nodeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
        let matchesOwner = true;
        if (filterOwner === 'central') matchesOwner = !sp.clientId;
        if (filterOwner === 'client') matchesOwner = !!sp.clientId;
        return matchesSearch && matchesOwner;
    });
  }, [storagePoints, searchTerm, filterOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nodeCode || isSaving) return;
    
    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat);
        const finalLng = parseFloat(formData.lng);
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : undefined;

        const payload = { 
            id: editingId || crypto.randomUUID(),
            name: formData.name.trim(),
            nodeCode: formData.nodeCode.trim().toUpperCase(),
            type: formData.type,
            address: formData.address || '',
            city: formData.city || '',
            province: formData.province || '',
            clientId: formData.clientId || null,
            responsibleUserId: formData.responsibleUserId || null,
            surfaceM2: Number(formData.surfaceM2),
            conditions: formData.conditions,
            notes: formData.notes,
            coordinates
        } as StoragePoint;

        let success = false;
        if (editingId) {
            success = await updateStoragePoint(payload);
        } else {
            success = await addStoragePoint(payload);
        }
        
        if(success) {
            setIsModalOpen(false);
            resetForm();
        }
    } catch (err) {
        console.error(err);
        alert("Error al procesar el registro.");
    } finally {
        setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
        name: '', nodeCode: '', type: 'Propio', address: '', city: '', province: '',
        clientId: '', responsibleUserId: '', surfaceM2: 0, conditions: '', notes: '',
        lat: '', lng: ''
    });
    setEditingId(null);
  };

  const handleEdit = (sp: StoragePoint) => { 
      setFormData({
          ...sp,
          clientId: sp.clientId || '',
          responsibleUserId: sp.responsibleUserId || '',
          lat: sp.coordinates?.lat.toString() || '',
          lng: sp.coordinates?.lng.toString() || ''
      }); 
      setEditingId(sp.id); 
      setIsModalOpen(true); 
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Nodos <span className="text-hemp-600">Logísticos</span></h1>
            <p className="text-sm text-gray-500">Gestión de acopio con precisión geográfica DMS.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Nuevo Nodo
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border dark:border-slate-800 flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Buscar por código, nombre o dirección..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-hemp-500 transition-all font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-2">
              <button onClick={() => setFilterOwner('all')} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterOwner === 'all' ? 'bg-hemp-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-gray-600'}`}>Todos</button>
              <button onClick={() => setFilterOwner('central')} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterOwner === 'central' ? 'bg-hemp-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-gray-600'}`}>Propios</button>
              <button onClick={() => setFilterOwner('client')} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterOwner === 'client' ? 'bg-hemp-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-gray-600'}`}>Socios</button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPoints.map(sp => {
              const stockKg = seedBatches.filter(b => b.storagePointId === sp.id).reduce((s,b) => s + b.remainingQuantity, 0);
              return (
                  <div key={sp.id} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden relative group flex flex-col h-full hover:shadow-xl transition-all">
                      <div className="h-40 bg-gray-100 dark:bg-slate-800 relative">
                          {sp.coordinates && sp.coordinates.lat ? (
                              <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${sp.coordinates.lat},${sp.coordinates.lng}&z=14&output=embed`} className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none border-none"></iframe>
                          ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 flex-col bg-slate-50 dark:bg-slate-800"><MapPin size={32} className="mb-2 opacity-30"/><span className="text-[10px] font-black uppercase tracking-widest">Sin GPS</span></div>
                          )}
                          <div className="absolute top-4 left-4 flex gap-2">
                             <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-white/20 text-white ${sp.clientId ? 'bg-blue-600' : 'bg-hemp-600'}`}>
                                 {sp.clientId ? 'Socio' : 'Central'}
                             </div>
                          </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                              <div className="min-w-0">
                                  <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter truncate leading-tight">{sp.name}</h3>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center mt-1">
                                      <ScanBarcode size={10} className="mr-1.5 text-hemp-600"/> {sp.nodeCode}
                                  </p>
                              </div>
                              {isAdmin && (
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                      <button onClick={() => handleEdit(sp)} className="p-2 bg-white dark:bg-slate-800 text-gray-400 hover:text-hemp-600 rounded-xl shadow-sm border dark:border-slate-700 transition"><Edit2 size={16}/></button>
                                      <button onClick={() => { if(window.confirm("¿Eliminar nodo?")) deleteStoragePoint(sp.id); }} className="p-2 bg-white dark:bg-slate-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border dark:border-slate-700 transition"><Trash2 size={16}/></button>
                                  </div>
                              )}
                          </div>

                          <div className="space-y-3 mb-6 flex-1">
                              <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección Postal</p>
                                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start">
                                      <MapPin size={14} className="mr-2 mt-0.5 text-red-500 flex-shrink-0"/>
                                      <span>{sp.address || 'No declarada'}<br/><span className="text-xs text-slate-400">{sp.city}, {sp.province}</span></span>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center px-2">
                                  <span className="text-[10px] font-black text-gray-400 uppercase">Stock Actual</span>
                                  <span className="text-sm font-black text-hemp-600">{stockKg.toLocaleString()} kg</span>
                              </div>
                          </div>

                          <div className="pt-4 border-t dark:border-slate-800 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                             Node Code: {sp.nodeCode} | {sp.type}
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Warehouse size={28}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Configurar <span className="text-hemp-600">Nodo Logístico</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Soporte para coordenadas 43°15'23" y dirección postal</p>
                    </div>
                </div>
                <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><ScanBarcode size={14} className="mr-2 text-hemp-500"/> Registro Maestro</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Código HNC *</label>
                                        <div className="flex gap-2">
                                            <input required type="text" className={`${inputClass} font-mono uppercase text-hemp-600`} value={formData.nodeCode} onChange={e => setFormData({...formData, nodeCode: e.target.value})} placeholder="HNC-XXXX" />
                                            <button type="button" onClick={generateAutoCode} className="p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl hover:bg-hemp-50 dark:hover:bg-hemp-900/20 transition shadow-sm"><RefreshCw size={18} className="text-hemp-600"/></button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Nombre del Nodo *</label>
                                        <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Silo Central Rosario" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Dirección Postal Exacta *</label>
                                    <input required type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ej: Ruta 9 Km 285, Parque Industrial" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Ciudad</label>
                                        <input type="text" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Rosario" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1 mb-1 block">Provincia</label>
                                        <input type="text" className={inputClass} value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} placeholder="Santa Fe" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center"><Building size={14} className="mr-2"/> Atribución de Nodo</h3>
                            <div className="space-y-4">
                                <select className={inputClass} value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                                    <option value="">-- Nodo de Gestión Central --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select className={inputClass} value={formData.responsibleUserId || ''} onChange={e => setFormData({...formData, responsibleUserId: e.target.value})}>
                                    <option value="">Sin responsable asignado</option>
                                    {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col">
                        <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center"><Navigation size={14} className="mr-2"/> Georreferencia de Precisión</h3>
                        <div className="flex-1 rounded-2xl overflow-hidden border dark:border-slate-800 shadow-inner group/map relative bg-slate-200 dark:bg-slate-950 mb-6 min-h-[250px]">
                            {renderMap ? (
                                <MapEditor 
                                    key={`map-storage-${editingId || 'new'}`}
                                    initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} 
                                    initialPolygon={formData.lat && formData.lng ? [{ lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }] : []} 
                                    onPolygonChange={(poly) => {
                                        if (poly.length > 0) {
                                            setFormData(prev => ({ ...prev, lat: poly[0].lat.toFixed(7), lng: poly[0].lng.toFixed(7) }));
                                        }
                                    }} 
                                    height="100%" 
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 uppercase text-[10px] font-black tracking-widest flex-col gap-3">
                                    <RefreshCw className="animate-spin" size={32}/>
                                    Sincronizando Cartografía...
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase ml-1 block">Latitud (DMS o Decimal)</label>
                                <input 
                                    type="text" 
                                    className={`${inputClass} font-mono`} 
                                    value={formData.lat} 
                                    onChange={e => setFormData({...formData, lat: e.target.value})} 
                                    onBlur={() => handleCoordinateBlur('lat')}
                                    placeholder="43°15'23'S" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase ml-1 block">Longitud (DMS o Decimal)</label>
                                <input 
                                    type="text" 
                                    className={`${inputClass} font-mono`} 
                                    value={formData.lng} 
                                    onChange={e => setFormData({...formData, lng: e.target.value})} 
                                    onBlur={() => handleCoordinateBlur('lng')}
                                    placeholder="58°12'45'W" 
                                />
                            </div>
                        </div>
                        <p className="mt-4 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase italic">* Tip: Puedes ingresar 43°15'23'S y el sistema lo convertirá automáticamente.</p>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                    <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                        {editingId ? 'Actualizar Nodo' : 'Finalizar Registro'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
