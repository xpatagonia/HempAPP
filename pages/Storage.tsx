import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { StoragePoint, StorageZone } from '../types';
import { 
  Plus, Warehouse, Edit2, Trash2, MapPin, User, 
  Maximize, X, Building, ShieldCheck, Truck, 
  Package, Search, Filter, FilterX, Save, Loader2, Info, ChevronRight, ScanBarcode, RefreshCw, Navigation,
  Thermometer, Droplets, ShieldAlert, Award, FileCheck2, Layers, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

// Helper: Convertidor robusto de DMS a Decimal
const parseCoordinate = (input: string): string => {
    if (!input) return '';
    const clean = input.trim().toUpperCase();
    const isDecimal = /^-?[\d.]+$/.test(clean);
    if (isDecimal) return clean;
    const dmsRegex = /(\d+)[°\s:]+(\d+)['\s:]+(\d+(?:\.\d+)?)["\s]*([NSEW])?/i;
    const match = clean.match(dmsRegex);
    if (match) {
        let deg = parseFloat(match[1]);
        let min = parseFloat(match[2]);
        let sec = parseFloat(match[3]);
        let dir = match[4] || '';
        if (!dir) { if (clean.includes('S') || clean.includes('W') || clean.startsWith('-')) dir = 'S'; }
        let decimal = deg + (min / 60) + (sec / 3600);
        if (dir === 'S' || dir === 'W' || clean.includes('S') || clean.includes('W')) {
            decimal = decimal * -1;
        }
        return decimal.toFixed(7);
    }
    return input;
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
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
    totalCapacityTn: 500, tempC: 16.5, humidityPct: 45, securityLevel: 'GACP Alta Seguridad',
    ariccameCustodyRegistry: '', responsibleAgronomistMatricula: '',
    lat: '', lng: '', zones: []
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
      const prefix = "NOD";
      const random = Math.floor(100 + Math.random() * 900);
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
                             (sp.nodeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (sp.ariccameCustodyRegistry || '').toLowerCase().includes(searchTerm.toLowerCase());
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

        const payload: StoragePoint = { 
            id: editingId || generateId(),
            name: formData.name.trim(),
            nodeCode: formData.nodeCode.trim().toUpperCase(),
            type: formData.type || 'Propio',
            address: formData.address || '',
            city: formData.city || '',
            province: formData.province || '',
            clientId: formData.clientId || undefined,
            responsibleUserId: formData.responsibleUserId || undefined,
            surfaceM2: Number(formData.surfaceM2) || 0,
            totalCapacityTn: Number(formData.totalCapacityTn) || 500,
            conditions: formData.conditions || '',
            notes: formData.notes || '',
            coordinates,
            tempC: Number(formData.tempC) || 16,
            humidityPct: Number(formData.humidityPct) || 45,
            tempStatus: (Number(formData.tempC) > 24) ? 'alerta' : 'normal',
            humidityStatus: (Number(formData.humidityPct) > 65) ? 'alerta' : 'normal',
            securityLevel: formData.securityLevel || 'GACP Alta Seguridad',
            ariccameCustodyRegistry: formData.ariccameCustodyRegistry || '',
            responsibleAgronomistMatricula: formData.responsibleAgronomistMatricula || '',
            zones: formData.zones || [
              { id: generateId(), name: 'Cámara Semilla Fiscalizada INASE', type: 'Camara_Semilla_INASE', capacityTn: 150, currentOccupancyTn: 45, targetTempC: 15, maxHumidityPct: 45 },
              { id: generateId(), name: 'Silos Grano Alimento', type: 'Silo_Grano_Alimento', capacityTn: 200, currentOccupancyTn: 80, targetTempC: 18, maxHumidityPct: 50 },
              { id: generateId(), name: 'Playa Estiba Fardos Fibra', type: 'Playa_Estiba_Fardos', capacityTn: 150, currentOccupancyTn: 60, targetTempC: 22, maxHumidityPct: 60 }
            ]
        };

        const success = editingId ? await updateStoragePoint(payload) : await addStoragePoint(payload);
        if (success) {
            setIsModalOpen(false);
            setEditingId(null);
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleEdit = (sp: StoragePoint) => {
      setEditingId(sp.id);
      setFormData({
          ...sp,
          lat: sp.coordinates ? sp.coordinates.lat.toString() : '',
          lng: sp.coordinates ? sp.coordinates.lng.toString() : '',
          totalCapacityTn: sp.totalCapacityTn || 500,
          tempC: sp.tempC || 17,
          humidityPct: sp.humidityPct || 45,
          securityLevel: sp.securityLevel || 'GACP Alta Seguridad',
          ariccameCustodyRegistry: sp.ariccameCustodyRegistry || '',
          responsibleAgronomistMatricula: sp.responsibleAgronomistMatricula || '',
          zones: sp.zones || []
      });
      setIsModalOpen(true);
  };

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all";
  const labelClass = "text-[9px] font-mono font-black uppercase text-slate-500 ml-1 mb-1 block tracking-wider";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-mono">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Nodos de Custodia & Bioseguridad GACP
              </span>
              <span className="text-xs font-mono text-slate-400">· SENASA / ARICCAME</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 flex items-center gap-2.5">
              <Warehouse className="text-emerald-500" size={28}/> 
              <span>Almacenes, Silos & Cámaras Frías</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Infraestructura física de acopio con monitoreo higrotérmico continuo y libro de guardia de custodia regulada.
            </p>
        </div>
        {isAdmin && (
          <button 
            type="button"
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '', nodeCode: '', type: 'Propio', address: '', city: '', province: '',
                clientId: '', responsibleUserId: '', surfaceM2: 0, conditions: '', notes: '',
                totalCapacityTn: 500, tempC: 16.5, humidityPct: 45, securityLevel: 'GACP Alta Seguridad',
                ariccameCustodyRegistry: '', responsibleAgronomistMatricula: '', lat: '', lng: '', zones: []
              });
              generateAutoCode();
              setIsModalOpen(true);
            }} 
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition shadow font-mono font-bold text-xs uppercase tracking-wider gap-1.5"
          >
            <Plus size={15} /> 
            <span>Nuevo Nodo de Custodia</span>
          </button>
        )}
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, código HNC, ciudad o libro ARICCAME..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterOwner('all')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              filterOwner === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({storagePoints.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOwner('central')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              filterOwner === 'central'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            Planta Central
          </button>
          <button
            type="button"
            onClick={() => setFilterOwner('client')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition text-[11px] ${
              filterOwner === 'client'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-sky-600'
            }`}
          >
            Socios de Red
          </button>
        </div>
      </div>

      {/* GRILLA DE ALMACENES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPoints.map(sp => {
              const batchesInThisNode = seedBatches.filter(b => b.storagePointId === sp.id);
              const totalStockKg = batchesInThisNode.reduce((s,b) => s + (b.remainingQuantity || 0), 0);
              const capacityTn = sp.totalCapacityTn || 450;
              const occupancyPct = Math.min(100, Math.round((totalStockKg / 1000 / capacityTn) * 100));

              return (
                  <div key={sp.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden relative group flex flex-col justify-between hover:shadow-lg transition-all">
                      <div>
                        {/* MAPA O ESTADO */}
                        <div className="h-36 bg-slate-100 dark:bg-slate-800 relative">
                            {sp.coordinates && sp.coordinates.lat ? (
                                <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${sp.coordinates.lat},${sp.coordinates.lng}&z=14&output=embed`} className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none border-none"></iframe>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 flex-col bg-slate-100 dark:bg-slate-800">
                                  <MapPin size={28} className="mb-1 opacity-40"/>
                                  <span className="text-[10px] uppercase font-bold">Sin Georreferencia</span>
                                </div>
                            )}
                            
                            {/* BADGE DE SEGURIDAD / CENTRAL */}
                            <div className="absolute top-3 left-3 flex gap-1.5">
                               <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow tracking-wider text-white ${sp.clientId ? 'bg-sky-600' : 'bg-emerald-600'}`}>
                                   {sp.clientId ? 'Socio Red' : 'Central Nucleus'}
                               </span>
                               {sp.securityLevel && (
                                 <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-900/80 text-white backdrop-blur-sm">
                                   {sp.securityLevel}
                                 </span>
                               )}
                            </div>
                        </div>

                        {/* CONTENIDO INTERIOR */}
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate leading-tight">{sp.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                      <span>Código: <strong className="text-emerald-600 dark:text-emerald-400">{sp.nodeCode}</strong></span>
                                      {sp.ariccameCustodyRegistry && (
                                        <span>· Lib: {sp.ariccameCustodyRegistry}</span>
                                      )}
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                        <button onClick={() => handleEdit(sp)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 rounded-lg transition"><Edit2 size={13}/></button>
                                        <button onClick={() => { if(window.confirm("¿Eliminar nodo de custodia?")) deleteStoragePoint(sp.id); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg transition"><Trash2 size={13}/></button>
                                    </div>
                                )}
                            </div>

                            {/* SENSORES DE TELEMETRÍA HIGROTÉRMICA */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Thermometer size={14} />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase block">Temperatura</span>
                                    <strong className="text-slate-800 dark:text-slate-200">{sp.tempC !== undefined ? `${sp.tempC} °C` : '16 °C'}</strong>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                                    <Droplets size={14} />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase block">Humedad (HR)</span>
                                    <strong className="text-slate-800 dark:text-slate-200">{sp.humidityPct !== undefined ? `${sp.humidityPct} %` : '45 %'}</strong>
                                  </div>
                                </div>
                            </div>

                            {/* BARRA DE CAPACIDAD */}
                            <div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                                  <span>Ocupación de Almacén:</span>
                                  <strong>{(totalStockKg / 1000).toFixed(1)} / {capacityTn} Tn ({occupancyPct}%)</strong>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${occupancyPct > 85 ? 'bg-rose-500' : occupancyPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${occupancyPct}%` }}
                                  />
                                </div>
                            </div>

                            {/* ZONAS DE CUSTODIA */}
                            {sp.zones && sp.zones.length > 0 && (
                              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                                <span className="text-slate-400 uppercase font-bold block mb-1">Zonas de Custodia:</span>
                                <div className="flex flex-wrap gap-1">
                                  {sp.zones.map(z => (
                                    <span key={z.id} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                      {z.name} ({z.currentOccupancyTn}/{z.capacityTn}Tn)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* RESPONSABLE AGRÓNOMO */}
                            {sp.responsibleAgronomistMatricula && (
                              <div className="text-[10px] text-slate-400">
                                Resp. Técnico: <strong className="text-slate-600 dark:text-slate-300">{sp.responsibleAgronomistMatricula}</strong>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* PIE DEL NODO */}
                      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block">Existencias Totales</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">{totalStockKg.toLocaleString()} kg</strong>
                          </div>
                          <span className="text-[10px] text-slate-400">{batchesInThisNode.length} lotes guardados</span>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* MODAL CONFIGURAR NODO LOGÍSTICO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <Warehouse size={20}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Nodo de Custodia & Almacén GACP</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Habilitación higrotérmica y libro de guardia</p>
                    </div>
                </div>
                <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* SECCIÓN 1: DATOS MAESTROS */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500">1. Identificación del Nodo</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Código del Nodo *</label>
                        <div className="flex gap-1.5">
                          <input required type="text" className={`${inputClass} uppercase text-emerald-600 font-bold`} value={formData.nodeCode} onChange={e => setFormData({...formData, nodeCode: e.target.value})} placeholder="NOD-01" />
                          <button type="button" onClick={generateAutoCode} className="p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl hover:bg-emerald-50 transition"><RefreshCw size={14} className="text-emerald-600"/></button>
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Nombre Comercial *</label>
                        <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Silo Central Rosario" />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Dirección Postal Exacta *</label>
                      <input required type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ruta 9 Km 285" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Ciudad</label>
                        <input type="text" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Rosario" />
                      </div>
                      <div>
                        <label className={labelClass}>Provincia</label>
                        <input type="text" className={inputClass} value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} placeholder="Santa Fe" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Capacidad Total (Tn)</label>
                        <input type="number" className={inputClass} value={formData.totalCapacityTn || 500} onChange={e => setFormData({...formData, totalCapacityTn: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClass}>Superficie (m²)</label>
                        <input type="number" className={inputClass} value={formData.surfaceM2 || 0} onChange={e => setFormData({...formData, surfaceM2: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: REGULACIÓN GACP & SENSORES */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase text-slate-500">2. Custodia Legal & Sensores</h3>

                    <div>
                      <label className={labelClass}>Nivel de Seguridad GACP</label>
                      <select className={inputClass} value={formData.securityLevel || 'GACP Alta Seguridad'} onChange={e => setFormData({...formData, securityLevel: e.target.value as any})}>
                        <option value="Custodia Fiscal">Custodia Fiscal (Libro ARICCAME)</option>
                        <option value="GACP Alta Seguridad">GACP Alta Seguridad (Acceso Restringido)</option>
                        <option value="Estándar">Estándar (Depósito Agronómico)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>N° Libro Guardia ARICCAME</label>
                        <input type="text" className={inputClass} value={formData.ariccameCustodyRegistry || ''} onChange={e => setFormData({...formData, ariccameCustodyRegistry: e.target.value})} placeholder="ARICCAME-LIB-001" />
                      </div>
                      <div>
                        <label className={labelClass}>Matrícula Ing. Agrónomo</label>
                        <input type="text" className={inputClass} value={formData.responsibleAgronomistMatricula || ''} onChange={e => setFormData({...formData, responsibleAgronomistMatricula: e.target.value})} placeholder="MP-AGRO-7814" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Temperatura Actual (°C)</label>
                        <input type="number" step="0.1" className={inputClass} value={formData.tempC || 16.5} onChange={e => setFormData({...formData, tempC: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClass}>Humedad Relativa (HR %)</label>
                        <input type="number" step="1" className={inputClass} value={formData.humidityPct || 45} onChange={e => setFormData({...formData, humidityPct: Number(e.target.value)})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Latitud GPS (Decimal / DMS)</label>
                        <input type="text" className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} onBlur={() => handleCoordinateBlur('lat')} placeholder="-33.1350" />
                      </div>
                      <div>
                        <label className={labelClass}>Longitud GPS (Decimal / DMS)</label>
                        <input type="text" className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} onBlur={() => handleCoordinateBlur('lng')} placeholder="-64.3350" />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow flex items-center hover:bg-emerald-500 transition">
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={15}/> : <Save className="mr-2" size={15}/>}
                        Guardar Nodo de Custodia
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
