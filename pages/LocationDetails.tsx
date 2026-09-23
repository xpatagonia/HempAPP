
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, MapPin, Globe, Droplets, User, Building, ExternalLink, Ruler, Sprout, ChevronRight, Waves, CloudRain, Package, CheckCircle2, Truck, ClipboardCheck, Info, Tag, Activity, Archive, Landmark, Warehouse, AlertCircle, AlertTriangle, LayoutGrid, Box, TrendingDown } from 'lucide-react';
import WeatherWidget from '../components/WeatherWidget';
import MapEditor from '../components/MapEditor';
import HydricBalance from '../components/HydricBalance';

// Función auxiliar para generar colores consistentes basados en texto (nombre de la parcela)
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Colores vibrantes pero legibles (HSL)
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 45%)`;
};

export default function LocationDetails() {
    const { id } = useParams();
    const { locations, plots, varieties, clients, seedMovements, seedBatches, currentUser, storagePoints } = useAppContext();
    const [activeTab, setActiveTab] = useState<'info' | 'water' | 'stock'>('info');

    const location = locations.find(l => l.id === id);
    const locationPlots = plots.filter(p => p.locationId === id);
    
    // --- LÓGICA DE INVENTARIO ---
    
    // 1. Identificamos los depósitos vinculados a este campo (mismo dueño)
    const linkedStorages = useMemo(() => {
        if (!location) return [];
        // Normalizamos: null, undefined y "" son tratados como "Sin Cliente" (Propio/Interno)
        // Usamos un string mágico 'INTERNAL' para poder comparar nulls de forma segura
        const ownerClientId = location.clientId || 'INTERNAL';
        
        return storagePoints.filter(sp => {
            const spOwnerId = sp.clientId || 'INTERNAL';
            return spOwnerId === ownerClientId;
        });
    }, [location, storagePoints]);

    // 2. STOCK REAL (Basado en Lotes actuales, no en histórico de movimientos)
    // Esto corrige el error de "Sin Datos" si el stock se cargó por inventario inicial.
    const stockInventory = useMemo(() => {
        const linkedIds = linkedStorages.map(s => s.id);
        
        // Filtramos lotes que estén físicamente en los depósitos vinculados
        const batchesInScope = seedBatches.filter(b => 
            linkedIds.includes(b.storagePointId || '') && b.remainingQuantity > 0
        );

        // Agrupación por Variedad (Consolidado)
        const consolidated: Record<string, { variety: string, totalKg: number, count: number }> = {};
        
        batchesInScope.forEach(b => {
            const varId = b.varietyId;
            const varName = varieties.find(v => v.id === varId)?.name || 'Desconocida';
            
            if (!consolidated[varId]) {
                consolidated[varId] = { variety: varName, totalKg: 0, count: 0 };
            }
            consolidated[varId].totalKg += b.remainingQuantity;
            consolidated[varId].count += 1;
        });

        // Agrupación por Depósito (Desglose)
        const byStorage: Record<string, { name: string, city: string, items: { variety: string, kg: number, batchCode: string }[] }> = {};
        
        batchesInScope.forEach(b => {
            const sp = storagePoints.find(s => s.id === b.storagePointId);
            if (!sp) return;
            
            const varName = varieties.find(v => v.id === b.varietyId)?.name || 'Desconocida';
            
            if (!byStorage[sp.id]) {
                byStorage[sp.id] = { name: sp.name, city: sp.city || '', items: [] };
            }
            byStorage[sp.id].items.push({ 
                variety: varName, 
                kg: b.remainingQuantity,
                batchCode: b.batchCode 
            });
        });

        return {
            consolidated: Object.values(consolidated),
            byStorage: Object.values(byStorage),
            hasStock: batchesInScope.length > 0
        };
    }, [seedBatches, linkedStorages, varieties, storagePoints]);

    // 3. Consumo en Campo (Lo que ya se sembró)
    const consumedStock = useMemo(() => {
        return locationPlots.reduce((acc, p) => {
            let usedKg = Number(p.usedSeedValue || 0);
            if(p.usedSeedUnit === 'gr') usedKg /= 1000;
            if(p.usedSeedUnit === 'tn') usedKg *= 1000;
            
            const varName = varieties.find(v => v.id === p.varietyId)?.name || 'Genética S/D';
            
            if (!acc[varName]) acc[varName] = 0;
            acc[varName] += usedKg;
            return acc;
        }, {} as Record<string, number>);
    }, [locationPlots, varieties]);

    // 4. Historial de Movimientos (Solo informativo/auditoría)
    const receivedMaterials = useMemo(() => {
        const linkedIds = linkedStorages.map(s => s.id);
        return seedMovements
            .filter(m => linkedIds.includes(m.targetLocationId))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [seedMovements, linkedStorages]);

    const activePlotLayers = useMemo(() => {
        return locationPlots
            .filter(p => p.status === 'Activa' && p.polygon && p.polygon.length > 2)
            .map(p => ({
                id: p.id,
                polygon: p.polygon!,
                label: `${p.name} (${p.surfaceArea} ${p.surfaceUnit})`,
                color: p.color || stringToColor(p.name)
            }));
    }, [locationPlots]);
    
    const client = clients.find(c => c.id === location?.clientId);
    const ownerLabel = client ? client.name : 'Planta Central (Propio)';

    if (!location) return <div className="p-10 text-center">Establecimiento no encontrado.</div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <Link to="/locations" className="flex items-center text-gray-500 hover:text-gray-800 transition font-black uppercase text-[10px] tracking-widest group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Volver al Listado
                </Link>
                <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border dark:border-slate-800 shadow-sm overflow-x-auto">
                    <button onClick={() => setActiveTab('info')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'info' ? 'bg-hemp-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Auditoría Agrónoma</button>
                    <button onClick={() => setActiveTab('stock')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'stock' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Insumos & Semillas</button>
                    <button onClick={() => setActiveTab('water')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'water' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Recurso Hídrico</button>
                </div>
            </div>

            {activeTab === 'info' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-200 dark:border-slate-800 p-10 relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <MapPin className="text-hemp-600" size={18}/>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Establecimiento</span>
                                    </div>
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4 italic leading-tight">{location.name}</h1>
                                    <p className="text-gray-500 font-bold text-sm max-w-md">{location.city}, {location.province} • {location.address}</p>
                                    
                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <div className="flex items-center bg-gray-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border dark:border-slate-800">
                                            <Archive size={14} className="text-hemp-600 mr-2"/>
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Suelo</p>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300">{location.soilType || 'Franco'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-gray-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border dark:border-slate-800">
                                            <Waves size={14} className="text-blue-600 mr-2"/>
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Riego</p>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300">{location.irrigationSystem || 'Secano'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-3xl border dark:border-slate-800 text-center w-32 flex flex-col justify-center">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Superficie</p>
                                        <p className="text-xl font-black text-gray-800 dark:text-white">{location.capacityHa || 0} <span className="text-[10px] font-bold">HA</span></p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-3xl border dark:border-slate-800 text-center w-32 flex flex-col justify-center">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Cultivos</p>
                                        <p className="text-xl font-black text-hemp-600">{locationPlots.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                            <div className="px-8 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] dark:text-white flex items-center"><Activity size={16} className="mr-2 text-hemp-600"/> Unidades Productivas en Campo</h3>
                                <Link to={`/plots?locationId=${location.id}`} className="text-[10px] font-black uppercase text-hemp-600 hover:underline tracking-widest">Gestionar Todos →</Link>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {locationPlots.length === 0 ? (
                                    <div className="col-span-2 p-12 text-center text-gray-400 italic font-medium">No hay cultivos asignados a este sitio.</div>
                                ) : locationPlots.map(p => {
                                    const vari = varieties.find(v => v.id === p.varietyId);
                                    const plotColor = p.color || stringToColor(p.name);
                                    
                                    return (
                                        <Link key={p.id} to={`/plots/${p.id}`} className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 hover:border-hemp-500 hover:shadow-lg transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-xl" style={{ backgroundColor: plotColor }}></div>
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 rounded-2xl text-white" style={{ backgroundColor: plotColor }}>
                                                    <Sprout size={20}/>
                                                </div>
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${p.status === 'Activa' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}>{p.status}</span>
                                            </div>
                                            <h4 className="font-black text-gray-800 dark:text-white uppercase tracking-tighter text-lg leading-tight group-hover:text-hemp-600 transition-colors">{p.name}</h4>
                                            <div className="mt-2 flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <Tag size={10} className="mr-1.5"/> {vari?.name}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                            <div className="px-8 py-6 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 font-black text-xs uppercase tracking-widest dark:text-white flex items-center">
                                <Globe size={16} className="mr-2 text-blue-600"/> Cartografía de Precisión
                            </div>
                            <div className="h-80 w-full bg-slate-100">
                                {location.polygon && location.polygon.length > 2 ? (
                                    <MapEditor 
                                        initialCenter={location.coordinates} 
                                        initialPolygon={location.polygon} 
                                        extraPolygons={activePlotLayers}
                                        readOnly={true} 
                                        height="100%"
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 italic text-xs">Sin delimitación perimetral configurada.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                            <div className="px-8 py-6 border-b dark:border-slate-800 font-black text-xs uppercase tracking-widest dark:text-white">Pronóstico Local</div>
                            <WeatherWidget lat={location.coordinates?.lat || 0} lng={location.coordinates?.lng || 0} showForecast={true} />
                            <div className="p-4 bg-gray-50 dark:bg-slate-950 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">* Alertas basadas en Red Open-Meteo</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 p-8">
                            <h3 className="font-black text-gray-800 dark:text-white mb-6 uppercase text-xs tracking-[0.2em] flex items-center"><Building size={16} className="mr-2 text-gray-400"/> Socio Propietario</h3>
                            {client ? (
                                <div className="space-y-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                                        <p className="text-xl font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tighter italic">{client.name}</p>
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1 flex items-center"><User size={12} className="mr-1.5"/> {client.contactName}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a href={`mailto:${client.email}`} className="py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-center hover:bg-hemp-50 transition">Email</a>
                                        <a href={`tel:${client.contactPhone}`} className="py-2.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-center hover:bg-hemp-50 transition">Llamar</a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm italic">Sin socio comercial asignado (Propio).</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stock' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-8">
                    {/* ENCABEZADO Y ALERTAS */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center italic">
                                <Package size={24} className="mr-2 text-amber-600"/> Inventario & Stock
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Recursos disponibles en depósitos del titular: {ownerLabel}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            {linkedStorages.length > 0 ? (
                                linkedStorages.map(sp => (
                                    <div key={sp.id} className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border dark:border-slate-800 flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                                        <Warehouse size={12} className="mr-2 text-hemp-500"/> {sp.name}
                                    </div>
                                ))
                            ) : (
                                <span className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center">
                                    <AlertTriangle size={14} className="mr-2"/> Sin Depósitos Vinculados
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {linkedStorages.length === 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                            <AlertCircle className="text-amber-600 flex-shrink-0" size={20}/>
                            <div>
                                <p className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-1">Error de Vinculación Logística</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                    Este campo pertenece a <strong>{ownerLabel}</strong>, pero no se encontraron depósitos asignados a este mismo propietario. 
                                    Para ver el stock, asegúrese de que el Depósito tenga asignado el mismo "Socio Propietario" que este Campo en la sección de Configuración de Nodos.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {!stockInventory.hasStock && linkedStorages.length > 0 && (
                        <div className="p-12 text-center bg-gray-50 dark:bg-slate-950 rounded-[40px] border border-dashed dark:border-slate-800 flex flex-col items-center">
                            <Package size={32} className="text-gray-300 mb-2"/>
                            <p className="text-gray-400 italic font-medium">No hay stock de semillas disponible en los depósitos vinculados.</p>
                            <Link to="/seed-batches" className="mt-4 text-[10px] font-black text-hemp-600 uppercase tracking-widest hover:underline">Gestionar Inventario Logístico</Link>
                        </div>
                    )}

                    {/* SECCIÓN 1: STOCK CONSOLIDADO */}
                    {stockInventory.hasStock && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {stockInventory.consolidated.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600">
                                            <Sprout size={24}/>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Variedad</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{item.variety}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{item.totalKg.toLocaleString()} <span className="text-lg text-slate-400">kg</span></p>
                                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center">
                                            <CheckCircle2 size={10} className="mr-1"/> Disponible para siembra
                                        </p>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t dark:border-slate-800">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.count} Lotes identificados</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* SECCIÓN 2: INSUMOS YA APLICADOS */}
                    {Object.keys(consumedStock).length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[40px] border border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center mb-6">
                                <TrendingDown size={16} className="mr-2"/> Insumos Aplicados (Consumo Histórico)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(consumedStock).map(([variety, kg]) => (
                                    <div key={variety} className="bg-white/60 dark:bg-slate-900/50 p-4 rounded-3xl flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semilla</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">{variety}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-blue-600">{(kg as number).toFixed(1)} <span className="text-xs">kg</span></p>
                                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Usado</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 3: DESGLOSE POR ALMACÉN */}
                    {stockInventory.hasStock && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <LayoutGrid size={16} className="mr-2"/> Desglose por Almacén
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {stockInventory.byStorage.map((store, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col">
                                        <div className="flex items-center justify-between mb-4 pb-4 border-b dark:border-slate-800">
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">{store.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center"><MapPin size={10} className="mr-1"/> {store.city}</p>
                                            </div>
                                            <Warehouse size={20} className="text-slate-300"/>
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            {store.items.map((it, i) => (
                                                <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{it.variety}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lote: {it.batchCode}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-hemp-600">{it.kg.toLocaleString()} kg</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 4: HISTORIAL DE REMITOS */}
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                        <div className="p-8 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Box size={16} className="mr-2"/> Historial de Ingresos (Remitos)
                            </h3>
                        </div>
                        <div className="p-8">
                             <div className="overflow-x-auto">
                                 <table className="min-w-full text-sm text-left">
                                     <thead className="bg-gray-50 dark:bg-slate-950 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                                         <tr>
                                             <th className="px-8 py-5">Fecha Recepción</th>
                                             <th className="px-8 py-5">Remito / Guía</th>
                                             <th className="px-8 py-5">Depósito Destino</th>
                                             <th className="px-8 py-5">Material (Lote)</th>
                                             <th className="px-8 py-5 text-center">Cantidad</th>
                                             <th className="px-8 py-5 text-right">Estatus</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                         {receivedMaterials.length === 0 ? (
                                             <tr><td colSpan={6} className="p-12 text-center text-gray-400 italic">No hay remitos vinculados a los depósitos de este campo.</td></tr>
                                         ) : receivedMaterials.map(m => {
                                             const batch = seedBatches.find(b => b.id === m.batchId);
                                             const vari = varieties.find(v => v.id === batch?.varietyId);
                                             const storage = storagePoints.find(s => s.id === m.targetLocationId);
                                             return (
                                                 <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                     <td className="px-8 py-5 font-black text-gray-800 dark:text-gray-300">{m.date}</td>
                                                     <td className="px-8 py-5 font-mono text-blue-600 font-bold">{m.transportGuideNumber || 'S/N'}</td>
                                                     <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">{storage?.name || 'Desc.'}</td>
                                                     <td className="px-8 py-5">
                                                         <div className="font-black text-gray-800 dark:text-white uppercase tracking-tighter">{vari?.name}</div>
                                                         <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Lote: {batch?.batchCode}</div>
                                                     </td>
                                                     <td className="px-8 py-5 text-center font-black text-hemp-600 text-base">{m.quantity.toLocaleString()} kg</td>
                                                     <td className="px-8 py-5 text-right">
                                                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center shadow-sm ${m.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {m.status === 'Recibido' ? <CheckCircle2 size={10} className="mr-1.5"/> : <Truck size={10} className="mr-1.5"/>}
                                                            {m.status}
                                                         </span>
                                                     </td>
                                                 </tr>
                                             );
                                         })}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'water' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center space-x-4 mb-10">
                            <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg"><Waves size={32}/></div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Monitoreo Hídrico de Campo</h2>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Balance pluviométrico satelital vs manual del establecimiento</p>
                            </div>
                        </div>
                        <HydricBalance 
                            locationId={location.id} 
                            startDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
