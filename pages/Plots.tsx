
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord, SeedBatch } from '../types';
import { 
  ChevronRight, LayoutGrid, List, Tag, FlaskConical, 
  Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Activity, Plus, Loader2, Info, FolderKanban, FileUp,
  Link as LinkIcon, Scale, Box, Weight, Archive
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
  const [formData, setFormData] = useState<Partial<Plot> & { lat: string, lng: string, usedSeedValue: number, usedSeedUnit: MassUnit }>({
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

  // --- LÓGICA DE INVENTARIO DISPONIBLE (VISIBILIDAD TOTAL PARA EL CLIENTE) ---
  const availableBatches = useMemo(() => {
      return seedBatches.filter(b => {
          // Requisito básico: Activo y con stock
          if (!b.isActive || b.remainingQuantity <= 0) return false;
          
          // Si el usuario seleccionó una variedad primero, filtramos
          if (formData.varietyId && b.varietyId !== formData.varietyId) return false;

          // Si es un cliente, solo permitimos ver lotes que le pertenezcan 
          // O lotes que estén en almacenes sin cliente asignado (lotes libres/centrales disponibles)
          if (isClient && currentUser?.clientId) {
              const storage = storagePoints.find(s => s.id === b.storagePointId);
              if (storage && storage.clientId && storage.clientId !== currentUser.clientId) return false;
          }
          
          return true;
      });
  }, [seedBatches, isClient, currentUser, storagePoints, formData.varietyId]);

  // Sincronización Batch -> Variety (Si elijo lote, la variedad se pone sola y bloquea)
  useEffect(() => {
    if (formData.seedBatchId) {
        const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
        if (selectedBatch) {
            setFormData(prev => ({ ...prev, varietyId: selectedBatch.varietyId }));
        }
    }
  }, [formData.seedBatchId, seedBatches]);

  // Cálculo de conversión a KG
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
              setFormData(prev => ({ ...prev, polygon: poly, surfaceArea: Number(area.toFixed(2)), surfaceUnit: 'ha', lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) }));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
      setFormData(prev => ({ ...prev, polygon: newPoly, surfaceArea: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.surfaceArea, surfaceUnit: 'ha', lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) }));
  };

  // Added resetForm function to fix "Cannot find name 'resetForm'" error
  const resetForm = () => {
    setFormData({ 
      name: '', type: 'Ensayo', locationId: '', projectId: '', varietyId: '', seedBatchId: '', 
      status: 'Activa', sowingDate: new Date().toISOString().split('T')[0], surfaceArea: 0, 
      surfaceUnit: 'ha', density: 0, lat: '', lng: '', polygon: [], usedSeedValue: 0, usedSeedUnit: 'kg' 
    });
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId || !formData.varietyId || isSaving) {
        alert("Complete campos obligatorios (*)");
        return;
    }

    const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
    if (selectedBatch && calculatedUsedKg > selectedBatch.remainingQuantity) {
        alert(`STOCK INSUFICIENTE: El lote ${selectedBatch.batchCode} posee ${selectedBatch.remainingQuantity} kg. Solicitado: ${calculatedUsedKg.toFixed(2)} kg.`);
        return;
    }

    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat || '0');
        const finalLng = parseFloat(formData.lng || '0');
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

        const payload = {
            ...formData,
            id: Date.now().toString(),
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
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdatePlot = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPlot) {
          setIsSaving(true);
          await updatePlot(editingPlot);
          setEditingPlot(null);
          setIsSaving(false);
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50 font-medium text-sm";
  // Added labelClass to fix "Cannot find name 'labelClass'" errors
  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center uppercase tracking-tighter italic">
                Unidades <span className="text-hemp-600">Productivas</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Lotes de producción y parcelas de ensayo.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="bg-white dark:bg-slate-900 p-1 rounded-xl flex border dark:border-slate-800 shadow-sm">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><List size={20} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
          </div>
          {/* Fixed resetForm call with parentheses */}
          <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="flex-1 sm:flex-none bg-hemp-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-hemp-700 transition shadow-xl flex items-center justify-center">
            <Plus size={18} className="mr-2" /> Nueva Unidad
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] shadow-sm border dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Buscar por identificador..." className="w-full pl-10 pr-4 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none focus:ring-2 focus:ring-hemp-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-white appearance-none" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
              <option value="all">Locaciones</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-white appearance-none" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">Tipo Unidad</option>
              <option value="Ensayo">Ensayo</option>
              <option value="Producción">Producción</option>
          </select>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-white appearance-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Estado</option>
              <option value="Activa">Activa</option>
              <option value="Cosechada">Cosechada</option>
          </select>
          <button onClick={() => { setSearchTerm(''); setFilterLoc('all'); setFilterType('all'); setFilterStatus('all'); }} className="text-[10px] font-black text-hemp-600 hover:text-hemp-700 uppercase tracking-widest text-center">Reset</button>
      </div>

      {viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase font-black text-[10px] tracking-widest border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5">Unidad</th>
                  <th className="px-8 py-5">Sitio / Campaña</th>
                  <th className="px-8 py-5">Genética</th>
                  <th className="px-8 py-5">Estado</th>
                  <th className="px-8 py-5 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {filteredPlots.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">Sin registros.</td></tr>
                ) : filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const proj = projects.find(pr => pr.id === p.projectId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors">
                      <td className="px-8 py-5">
                          <div className="font-black text-gray-900 dark:text-white text-base tracking-tight uppercase">{p.name}</div>
                          <div className="text-[9px] font-black uppercase text-hemp-600 tracking-widest">{p.type}</div>
                      </td>
                      <td className="px-8 py-5">
                          <div className="text-gray-700 dark:text-gray-300 font-bold uppercase tracking-tighter truncate max-w-[150px]">{loc?.name || 'S/D'}</div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{proj?.name || '-'}</div>
                      </td>
                      <td className="px-8 py-5">
                          <div className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{vari?.name || 'N/A'}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{vari?.usage || '-'}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center shadow-sm ${
                            p.status === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {p.status === 'Activa' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>}
                            {p.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setQrPlot(p)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><QrCode size={16}/></button>
                          {isAdmin && <button onClick={() => setEditingPlot(p)} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Edit2 size={16}/></button>}
                          {isSuperAdmin && <button onClick={() => { if(window.confirm("¿Eliminar unidad?")) deletePlot(p.id); }} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Trash2 size={16} /></button>}
                          <Link to={`/plots/${p.id}`} className="p-2 text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><ChevronRight size={18} /></Link>
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
                  <div key={p.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border dark:border-slate-800 hover:shadow-xl transition-all relative group overflow-hidden flex flex-col h-full">
                      <div className="absolute top-0 right-0 p-3 bg-hemp-600 text-white rounded-bl-2xl font-black text-[9px] uppercase tracking-widest">{p.status}</div>
                      <h4 className="font-black text-xl text-gray-800 dark:text-white mb-1 uppercase tracking-tighter">{p.name}</h4>
                      <p className="text-[10px] text-hemp-600 mb-4 font-black uppercase tracking-[0.2em]">{p.type}</p>
                      
                      <div className="space-y-3 mb-6 flex-1">
                          <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 space-y-2">
                             <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase"><MapPin size={12} className="mr-2 text-blue-500"/> {locations.find(l => l.id === p.locationId)?.name}</div>
                             <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase"><FolderKanban size={12} className="mr-2 text-blue-500"/> {projects.find(pr => pr.id === p.projectId)?.name || 'Sin Campaña'}</div>
                          </div>
                          <div className="flex items-center text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter italic">
                              <Sprout size={14} className="mr-2 text-hemp-600 opacity-60"/>
                              {varieties.find(v => v.id === p.varietyId)?.name}
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t dark:border-slate-800">
                          <div className="flex space-x-2">
                             <button onClick={() => setQrPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500 hover:text-blue-600 transition"><QrCode size={16}/></button>
                             {isAdmin && <button onClick={() => setEditingPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500 hover:text-hemp-600 transition"><Edit2 size={16}/></button>}
                             {isSuperAdmin && <button onClick={() => { if(window.confirm("¿Eliminar unidad?")) deletePlot(p.id); }} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500 hover:text-red-600 transition"><Trash2 size={16}/></button>}
                          </div>
                          <Link to={`/plots/${p.id}`} className="bg-slate-900 dark:bg-hemp-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">Entrar Bitácora</Link>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL ALTA NUEVA UNIDAD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Sprout size={28}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Lanzar <span className="text-hemp-600">Unidad Productiva</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planificación de siembra con trazabilidad total</p>
                    </div>
                </div>
                <button onClick={() => !isSaving && setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* DEFINICIÓN */}
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><Info size={14} className="mr-2 text-hemp-500"/> Definición Primaria</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Identificador Único *</label>
                                  <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="EJ: LOTE-A1-TRELEW" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  {['Ensayo', 'Producción'].map(t => (
                                      <button key={t} type="button" onClick={() => setFormData({...formData, type: t as any})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.type === t ? 'bg-hemp-600 text-white border-hemp-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}>{t}</button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                          <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-6 border-b border-blue-100 dark:border-blue-900/30 pb-3 flex items-center"><LinkIcon size={14} className="mr-2"/> Atribución de Campo</h3>
                          <div className="space-y-4">
                              <select required className={inputClass} value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                                  <option value="">-- Seleccionar Campo Receptor --</option>
                                  {locations.filter(l => !isClient || l.clientId === currentUser?.clientId).map(l => (
                                      <option key={l.id} value={l.id}>{l.name} ({l.province})</option>
                                  ))}
                              </select>
                              <select className={inputClass} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                                  <option value="">-- Sin campaña asignada --</option>
                                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>

                  {/* MAPA */}
                  <div className="space-y-6">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col min-h-[400px]">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center"><MapPin size={14} className="mr-2"/> Delimitación GPS</h3>
                              <input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} />
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm flex items-center hover:bg-emerald-50 transition"><FileUp size={14} className="mr-1.5"/> KML</button>
                          </div>
                          <div className="flex-1 min-h-[250px] rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-900/30 mb-4 shadow-inner">
                               <MapEditor 
                                  initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} 
                                  initialPolygon={formData.polygon || []} 
                                  onPolygonChange={handlePolygonChange} 
                                  height="100%" 
                               />
                          </div>
                      </div>
                  </div>
              </div>

              {/* INSUMOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                  <div className="bg-purple-50 dark:bg-purple-900/10 p-8 rounded-[40px] border border-purple-100 dark:border-purple-900/30">
                      <h3 className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-6 flex items-center"><Archive size={14} className="mr-2"/> Insumos de Mi Inventario Local</h3>
                      <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className={labelClass}>Lote Local Certificado *</label>
                                  <select required className={inputClass} value={formData.seedBatchId} onChange={e => setFormData({...formData, seedBatchId: e.target.value})}>
                                      <option value="">-- Seleccionar de mi stock --</option>
                                      {availableBatches.map(b => (
                                          <option key={b.id} value={b.id}>{b.batchCode} ({b.remainingQuantity.toLocaleString()} kg disp.)</option>
                                      ))}
                                  </select>
                              </div>
                              <div>
                                  <label className={labelClass}>Variedad Genética *</label>
                                  <select required className={`${inputClass} ${formData.seedBatchId ? 'bg-slate-100 dark:bg-slate-800 opacity-70 cursor-not-allowed' : ''}`} value={formData.varietyId} onChange={e => setFormData({...formData, varietyId: e.target.value})} disabled={!!formData.seedBatchId}>
                                      <option value="">-- Auto por lote --</option>
                                      {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div className="bg-white/50 dark:bg-slate-900/50 p-6 rounded-[28px] border border-dashed border-purple-200 dark:border-slate-800 shadow-inner">
                                <label className="text-[10px] font-black uppercase text-hemp-600 ml-1 block mb-3 flex items-center"><Scale size={14} className="mr-2"/> Cantidad para siembra</label>
                                <div className="flex gap-3">
                                    <input required type="number" step="0.001" className={`${inputClass} flex-1 text-2xl font-black text-hemp-700 text-center`} value={formData.usedSeedValue} onChange={e => setFormData({...formData, usedSeedValue: Number(e.target.value)})} placeholder="0.000" />
                                    <select className="w-28 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-hemp-600" value={formData.usedSeedUnit} onChange={e => setFormData({...formData, usedSeedUnit: e.target.value as MassUnit})}>
                                        <option value="gr">GR</option>
                                        <option value="kg">KG</option>
                                        <option value="tn">TN</option>
                                    </select>
                                </div>
                                {formData.seedBatchId && (
                                    <div className="mt-4 flex justify-between items-center px-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Impacto en Stock:</span>
                                        <div className="text-right">
                                            <span className={`text-sm font-black ${calculatedUsedKg > (seedBatches.find(b => b.id === formData.seedBatchId)?.remainingQuantity || 0) ? 'text-red-600 animate-pulse' : 'text-hemp-600'}`}>-{calculatedUsedKg.toLocaleString()} KG</span>
                                        </div>
                                    </div>
                                )}
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[40px] border dark:border-slate-800">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Activity size={14} className="mr-2"/> Diseño de Campo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="grid grid-cols-2 gap-2">
                              <div><label className={labelClass}>Superficie</label><input type="number" step="0.01" className={inputClass} value={formData.surfaceArea} onChange={e => setFormData({...formData, surfaceArea: Number(e.target.value)})} /></div>
                              <div><label className={labelClass}>Unidad</label><select className={inputClass} value={formData.surfaceUnit} onChange={e => setFormData({...formData, surfaceUnit: e.target.value as any})}><option value="ha">HA</option><option value="m2">M²</option></select></div>
                          </div>
                          <div><label className={labelClass}>Fecha de Siembra</label><input type="date" className={inputClass} value={formData.sowingDate} onChange={e => setFormData({...formData, sowingDate: e.target.value})} /></div>
                          <div className="md:col-span-2"><label className={labelClass}>Densidad Proyectada (pl/m²)</label><input type="number" className={inputClass} value={formData.density} onChange={e => setFormData({...formData, density: Number(e.target.value)})} placeholder="Ej: 150" /></div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                <button type="button" disabled={isSaving} onClick={() => setIsAddModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {isSaving ? 'Lanzando...' : 'Lanzar Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrPlot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-sm w-full p-10 text-center animate-in zoom-in-95 relative overflow-hidden">
                  <button onClick={() => setQrPlot(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition dark:text-white"><X size={24}/></button>
                  <div className="mb-8">
                    <div className="bg-hemp-50 dark:bg-hemp-900/20 p-4 rounded-3xl inline-block mb-4"><QrCode size={40} className="text-hemp-600"/></div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{qrPlot.name}</h2>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-inner border border-slate-100 mb-8 inline-block mx-auto">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/#/plots/' + qrPlot.id)}`} alt="QR Code" className="w-48 h-48"/>
                  </div>
                  <button onClick={() => window.print()} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                      <Printer size={18} className="mr-2"/> Imprimir Etiqueta
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
