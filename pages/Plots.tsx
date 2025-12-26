
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord, SeedBatch } from '../types';
import { 
  ChevronRight, LayoutGrid, List, Tag, FlaskConical, 
  Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Activity, Plus, Loader2, Info, FolderKanban, FileUp,
  Link as LinkIcon, Scale, Box, Weight, Archive, Globe, LayoutDashboard, Eye
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

const parseKML = (kmlText: string): { lat: number, lng: number }[] | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const allCoords = Array.from(xmlDoc.querySelectorAll("*")).filter(el => el.tagName.toLowerCase().endsWith('coordinates'));
        if (allCoords.length === 0) return null;
        allCoords.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
        const targetNode = allCoords[0];
        const text = targetNode.textContent || "";
        const rawPoints = text.trim().split(/\s+/);
        const latLngs = rawPoints.map(point => {
            const parts = point.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
            }
            return null;
        }).filter((p): p is { lat: number, lng: number } => p !== null);
        return latLngs.length >= 3 ? latLngs : null;
    } catch (e) {
        console.error("Error parsing KML", e);
        return null;
    }
};

type MassUnit = 'gr' | 'kg' | 'tn';

export default function Plots() {
  const { 
    plots, locations, varieties, projects, currentUser, 
    seedBatches, deletePlot, updatePlot, 
    addPlot, updateSeedBatch, storagePoints 
  } = useAppContext();
  
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [qrPlot, setQrPlot] = useState<Plot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State para Alta
  const [formData, setFormData] = useState<any>({
      name: '',
      type: 'Ensayo',
      locationId: '',
      projectId: '',
      varietyId: '',
      seedBatchId: '',
      status: 'Activa',
      sowingDate: new Date().toISOString().split('T')[0],
      surfaceArea: 0,
      surfaceUnit: 'ha',
      density: 0,
      observations: '',
      lat: '',
      lng: '',
      polygon: [],
      usedSeedValue: 0,
      usedSeedUnit: 'kg'
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';

  const resetForm = () => {
    setFormData({ 
      name: '', type: 'Ensayo', locationId: '', projectId: '', varietyId: '', seedBatchId: '', 
      status: 'Activa', sowingDate: new Date().toISOString().split('T')[0], surfaceArea: 0, 
      surfaceUnit: 'ha', density: 0, lat: '', lng: '', polygon: [], usedSeedValue: 0, usedSeedUnit: 'kg' 
    });
  };

  // --- LÓGICA DE INVENTARIO LOCAL (SINCRO AUTOMÁTICA) ---
  const availableBatches = useMemo(() => {
      return seedBatches.filter(b => {
          if (!b.isActive || b.remainingQuantity <= 0) return false;
          if (isClient && currentUser?.clientId) {
              const storage = storagePoints.find(s => s.id === b.storagePointId);
              if (storage && storage.clientId && storage.clientId !== currentUser.clientId) return false;
          }
          return true;
      });
  }, [seedBatches, isClient, currentUser, storagePoints]);

  useEffect(() => {
    if (formData.seedBatchId) {
        const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
        if (selectedBatch && selectedBatch.varietyId !== formData.varietyId) {
            setFormData(prev => ({ ...prev, varietyId: selectedBatch.varietyId }));
        }
    }
  }, [formData.seedBatchId, seedBatches]);

  const calculatedUsedKg = useMemo(() => {
      const val = Number(formData.usedSeedValue || 0);
      switch(formData.usedSeedUnit) {
          case 'gr': return val / 1000;
          case 'tn': return val * 1000;
          default: return val;
      }
  }, [formData.usedSeedValue, formData.usedSeedUnit]);

  const filteredPlots = useMemo(() => plots.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      
      let hasAccess = isAdmin;
      if (isClient && currentUser?.clientId) {
          const loc = locations.find(l => l.id === p.locationId);
          hasAccess = loc?.clientId === currentUser.clientId;
      }
      
      return matchSearch && matchLoc && matchType && matchStatus && (hasAccess || p.responsibleIds?.includes(currentUser?.id || ''));
  }), [plots, searchTerm, filterLoc, filterType, filterStatus, isAdmin, isClient, currentUser, locations]);

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId || !formData.varietyId || isSaving) {
        alert("Campos requeridos: Nombre, Campo y Variedad Genética.");
        return;
    }

    const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
    if (selectedBatch && calculatedUsedKg > selectedBatch.remainingQuantity) {
        alert(`STOCK INSUFICIENTE: El lote posee ${selectedBatch.remainingQuantity} kg.`);
        return;
    }

    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat || '0');
        const finalLng = parseFloat(formData.lng || '0');
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

        const payload = {
            ...formData,
            id: crypto.randomUUID(),
            responsibleIds: [currentUser?.id || ''],
            surfaceArea: Number(formData.surfaceArea),
            density: Number(formData.density),
            coordinates,
            polygon: formData.polygon || []
        } as Plot;

        const success = await addPlot(payload);
        
        if (success && selectedBatch && calculatedUsedKg > 0) {
            await updateSeedBatch({
                ...selectedBatch,
                remainingQuantity: selectedBatch.remainingQuantity - calculatedUsedKg
            });
        }

        if (success) {
            setIsAddModalOpen(false);
            resetForm();
            alert("✅ Unidad Productiva Registrada.");
        }
    } finally {
        setIsSaving(false);
    }
  };

  // Fix: Adding handleKMLUpload to fix reference error on line 408
  const handleKMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const poly = parseKML(text);
          if (poly && poly.length > 2) {
              const R = 6371000;
              const toRad = (x: number) => x * Math.PI / 180;
              let area = 0;
              const lats = poly.map(p => p.lat);
              const lngs = poly.map(p => p.lng);
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
              for (let i = 0; i < poly.length; i++) {
                  const j = (i + 1) % poly.length;
                  const p1 = poly[i];
                  const p2 = poly[j];
                  area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
              }
              area = Math.abs(area * R * R / 2) / 10000;
              setFormData((prev: any) => ({ ...prev, polygon: poly, surfaceArea: Number(area.toFixed(2)), lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) }));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  // Fix: Adding handlePolygonChange to fix reference error on line 417
  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
      setFormData((prev: any) => ({ ...prev, polygon: newPoly, surfaceArea: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.surfaceArea, lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) }));
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50 font-medium text-sm";
  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Unidades <span className="text-hemp-600">Productivas</span></h1>
            <p className="text-sm text-gray-500">Gestión técnica de parcelas, ensayos y lotes comerciales.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-800 shadow-sm">
                <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-hemp-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><List size={20}/></button>
                <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-hemp-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={20}/></button>
            </div>
            <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="flex-1 md:flex-none bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
                <Plus size={18} className="mr-2" /> Nueva Unidad
            </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
              <input type="text" placeholder="Buscar por nombre..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-2 focus:ring-hemp-500 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-xs font-black uppercase dark:text-white" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
              <option value="all">Todos los Campos</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-xs font-black uppercase dark:text-white" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">Tipos (Todos)</option>
              <option value="Ensayo">Solo Ensayos</option>
              <option value="Producción">Solo Producción</option>
          </select>
          <select className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border-none rounded-xl text-xs font-black uppercase dark:text-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Estados (Todos)</option>
              <option value="Activa">Activas</option>
              <option value="Cosechada">Cosechadas</option>
          </select>
      </div>

      {/* LISTADO */}
      {viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest border-b dark:border-slate-800">
                      <tr>
                          <th className="px-8 py-5">Nombre / Identificador</th>
                          <th className="px-8 py-5">Campo / Sitio</th>
                          <th className="px-8 py-5">Genética</th>
                          <th className="px-8 py-5 text-center">Superficie</th>
                          <th className="px-8 py-5 text-right">Estatus</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-bold uppercase text-[11px]">
                      {filteredPlots.length === 0 ? (
                          <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic font-bold">Sin unidades detectadas.</td></tr>
                      ) : filteredPlots.map(p => {
                          const loc = locations.find(l => l.id === p.locationId);
                          const vari = varieties.find(v => v.id === p.varietyId);
                          return (
                              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group" onClick={() => window.location.hash = `#/plots/${p.id}`}>
                                  <td className="px-8 py-6">
                                      <div className="font-black text-gray-800 dark:text-white tracking-tighter text-sm">{p.name}</div>
                                      <div className="text-[9px] text-gray-400 font-black flex items-center mt-1"><Tag size={10} className="mr-1.5 text-hemp-600"/> {p.type}</div>
                                  </td>
                                  <td className="px-8 py-6">
                                      <div className="text-gray-600 dark:text-gray-300 font-bold">{loc?.name || 'S/D'}</div>
                                      <div className="text-[8px] text-slate-400">{loc?.city}</div>
                                  </td>
                                  <td className="px-8 py-6">
                                      <span className="px-2 py-1 bg-hemp-50 dark:bg-hemp-900/20 text-hemp-700 dark:text-hemp-400 rounded-lg text-[9px] font-black border border-hemp-100 dark:border-hemp-900/30">{vari?.name || 'Sin Genética'}</span>
                                  </td>
                                  <td className="px-8 py-6 text-center text-slate-500">{p.surfaceArea} {p.surfaceUnit}</td>
                                  <td className="px-8 py-6 text-right">
                                      <div className="flex items-center justify-end">
                                          <span className={`px-3 py-1 rounded-full text-[8px] font-black shadow-sm border ${p.status === 'Activa' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                                          <ChevronRight size={16} className="ml-3 text-slate-300 group-hover:text-hemp-600 transition-colors"/>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlots.map(p => (
                  <Link key={p.id} to={`/plots/${p.id}`} className="bg-white dark:bg-slate-900 p-6 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all group flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                          <div className="p-4 bg-hemp-50 dark:bg-hemp-900/20 rounded-2xl text-hemp-600"><Sprout size={24}/></div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{p.status}</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic group-hover:text-hemp-600 transition-colors">{p.name}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2 flex items-center"><MapPin size={12} className="mr-1.5 text-blue-500"/> {locations.find(l => l.id === p.locationId)?.name}</p>
                      
                      <div className="mt-auto pt-6 grid grid-cols-2 gap-2 border-t dark:border-slate-800 mt-6">
                          <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-xl text-center"><p className="text-[8px] font-black text-gray-400 uppercase">Superficie</p><p className="text-xs font-black dark:text-white">{p.surfaceArea} {p.surfaceUnit}</p></div>
                          <div className="bg-gray-50 dark:bg-slate-950 p-2 rounded-xl text-center"><p className="text-[8px] font-black text-gray-400 uppercase">Genética</p><p className="text-xs font-black text-hemp-600 truncate px-1">{varieties.find(v => v.id === p.varietyId)?.name}</p></div>
                      </div>
                  </Link>
              ))}
          </div>
      )}

      {/* MODAL ALTA DE UNIDAD */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-4">
                          <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Sprout size={28}/></div>
                          <div>
                              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Lanzar <span className="text-hemp-600">Unidad Productiva</span></h2>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocolo de alta técnica y trazabilidad de siembra</p>
                          </div>
                      </div>
                      <button onClick={() => !isSaving && setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
                  </div>

                  <form onSubmit={handleSubmitAdd} className="space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Columna 1: Ubicación y Campaña */}
                          <div className="space-y-6">
                              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><MapPin size={14} className="mr-2 text-hemp-500"/> Atribución Territorial</h3>
                                  <div className="space-y-4">
                                      <div>
                                          <label className={labelClass}>Identificador Parcela *</label>
                                          <input required placeholder="Ej: LOTE-01 / SECTOR-A" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                                      </div>
                                      <div>
                                          <label className={labelClass}>Campo / Establecimiento *</label>
                                          <select required className={inputClass} value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                                              <option value="">Seleccionar sitio...</option>
                                              {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.city})</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label className={labelClass}>Campaña / Proyecto</label>
                                          <select className={inputClass} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                                              <option value="">Sin proyecto vinculado</option>
                                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                          </select>
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                                  <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-6 border-b border-emerald-100 dark:border-emerald-900/30 pb-3 flex items-center"><FlaskConical size={14} className="mr-2"/> Trazabilidad Genética</h3>
                                  <div className="space-y-4">
                                      <div>
                                          <label className={labelClass}>Lote Maestro de Semilla</label>
                                          <select className={inputClass} value={formData.seedBatchId} onChange={e => setFormData({...formData, seedBatchId: e.target.value})}>
                                              <option value="">Seleccione stock disponible...</option>
                                              {availableBatches.map(b => (
                                                  <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity} kg restantes)</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div>
                                          <label className={labelClass}>Variedad *</label>
                                          <select required className={inputClass} value={formData.varietyId} onChange={e => setFormData({...formData, varietyId: e.target.value})}>
                                              <option value="">Seleccionar genética...</option>
                                              {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                          </select>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Columna 2: Datos de Siembra */}
                          <div className="space-y-6">
                              <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                                  <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-6 border-b border-blue-100 dark:border-blue-800 pb-3 flex items-center"><Calendar size={14} className="mr-2"/> Protocolo de Siembra</h3>
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="col-span-2">
                                          <label className={labelClass}>Fecha de Siembra</label>
                                          <input type="date" className={inputClass} value={formData.sowingDate} onChange={e => setFormData({...formData, sowingDate: e.target.value})} />
                                      </div>
                                      <div>
                                          <label className={labelClass}>Superficie</label>
                                          <input type="number" step="0.01" className={inputClass} value={formData.surfaceArea} onChange={e => setFormData({...formData, surfaceArea: Number(e.target.value)})} />
                                      </div>
                                      <div>
                                          <label className={labelClass}>Unidad</label>
                                          <select className={inputClass} value={formData.surfaceUnit} onChange={e => setFormData({...formData, surfaceUnit: e.target.value as any})}>
                                              <option value="ha">Hectáreas (Ha)</option>
                                              <option value="m2">Metros² (M2)</option>
                                          </select>
                                      </div>
                                  </div>
                                  <div>
                                      <label className={labelClass}>Dosis Real Utilizada</label>
                                      <div className="flex gap-2">
                                          <input type="number" step="0.1" className={`${inputClass} flex-1 font-black text-blue-700`} value={formData.usedSeedValue} onChange={e => setFormData({...formData, usedSeedValue: Number(e.target.value)})} />
                                          <select className="w-20 bg-white dark:bg-slate-800 border rounded-xl text-[10px] font-black uppercase" value={formData.usedSeedUnit} onChange={e => setFormData({...formData, usedSeedUnit: e.target.value as any})}>
                                              <option value="kg">KG</option>
                                              <option value="gr">GR</option>
                                              <option value="tn">TN</option>
                                          </select>
                                      </div>
                                      <p className="text-[9px] text-blue-500 font-bold mt-2 uppercase">Equivalente: {calculatedUsedKg.toFixed(2)} KG</p>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                                  <label className={labelClass}>Observaciones Iniciales</label>
                                  <textarea className={inputClass} rows={3} value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Estado del suelo, pre-siembra, condiciones..."></textarea>
                              </div>
                          </div>

                          {/* Columna 3: Cartografía GPS */}
                          <div className="bg-slate-900 rounded-[32px] p-6 flex flex-col h-full border border-slate-800 relative overflow-hidden">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                                  <div className="flex items-center"><Globe size={14} className="mr-2 text-blue-500"/> Polígono de la Parcela</div>
                                  <div className="flex gap-2">
                                      <input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} />
                                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition"><FileUp size={14}/></button>
                                  </div>
                              </h3>
                              
                              <div className="flex-1 rounded-[24px] overflow-hidden mb-6 bg-slate-800 shadow-inner min-h-[300px]">
                                  <MapEditor 
                                      initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} 
                                      initialPolygon={formData.polygon || []} 
                                      onPolygonChange={handlePolygonChange} 
                                      height="100%" 
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <input placeholder="Latitud" className="bg-white/5 border-none p-3 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-hemp-500" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                                  <input placeholder="Longitud" className="bg-white/5 border-none p-3 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-hemp-500" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                              </div>
                              <Activity className="absolute -bottom-10 -right-10 w-48 h-48 text-hemp-600 opacity-5 pointer-events-none" />
                          </div>
                      </div>

                      <div className="flex justify-end pt-8 border-t dark:border-slate-800">
                          <button type="button" disabled={isSaving} onClick={() => setIsAddModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                          <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                              {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                              Registrar y Confirmar Siembra
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
