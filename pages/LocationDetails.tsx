
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, MapPin, Globe, Droplets, User, Building, ExternalLink, Ruler, Sprout, ChevronRight, Waves, CloudRain, Package, CheckCircle2, Truck, ClipboardCheck, Info, Tag, Activity, Archive, Landmark, Warehouse, AlertCircle, AlertTriangle } from 'lucide-react';
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
    const { id } = useParams<{ id: string }>();
    const { locations, plots, varieties, clients, seedMovements, seedBatches, currentUser, storagePoints } = useAppContext();
    const [activeTab, setActiveTab] = useState<'info' | 'water' | 'stock'>('info');

    const location = locations.find(l => l.id === id);
    const locationPlots = plots.filter(p => p.locationId === id);
    
    // --- LÓGICA CORREGIDA DE INVENTARIO ---
    // 1. Identificamos los depósitos vinculados a este campo (mismo dueño)
    const linkedStorages = useMemo(() => {
        if (!location) return [];
        // Normalizamos: null, undefined y "" son tratados como "Sin Cliente" (Propio/Interno)
        const ownerClientId = location.clientId || null;
        
        return storagePoints.filter(sp => {
            const spOwnerId = sp.clientId || null;
            return spOwnerId === ownerClientId;
        });
    }, [location, storagePoints]);

    // 2. Filtramos movimientos hacia cualquiera de esos depósitos vinculados
    const receivedMaterials = useMemo(() => {
        const linkedIds = linkedStorages.map(s => s.id);
        return seedMovements
            .filter(m => linkedIds.includes(m.targetLocationId))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [seedMovements, linkedStorages]);

    // 3. Balance Global del Propietario (Recibido en sus depósitos - Usado en TODOS sus campos)
    const stockBalance = useMemo(() => {
        const balance: Record<string, { variety: string, received: number, used: number }> = {};
        const ownerClientId = location?.clientId || null;

        // A. Sumar Recepciones (Stock Entrante en depósitos del dueño)
        receivedMaterials.forEach(m => {
            if(m.status !== 'Recibido') return; // Solo contar lo que ya llegó físicamente
            const batch = seedBatches.find(b => b.id === m.batchId);
            const varId = batch?.varietyId || 'unknown';
            const varName = varieties.find(v => v.id === varId)?.name || 'Desconocida';

            if (!balance[varId]) balance[varId] = { variety: varName, received: 0, used: 0 };
            balance[varId].received += m.quantity;
        });

        // B. Restar Uso (Siembra) en TODOS los campos del mismo dueño
        const ownerPlots = plots.filter(p => {
            const plotLoc = locations.find(l => l.id === p.locationId);
            const plotOwnerId = plotLoc?.clientId || null;
            return plotOwnerId === ownerClientId;
        });

        ownerPlots.forEach(p => {
            if (p.usedSeedValue && p.varietyId) {
                const varId = p.varietyId;
                // Solo restamos si tenemos registro de esa variedad en el balance (o si queremos mostrar negativo)
                if (!balance[varId]) {
                     const varName = varieties.find(v => v.id === varId)?.name || 'Desconocida';
                     balance[varId] = { variety: varName, received: 0, used: 0 };
                }
                
                let usedKg = Number(p.usedSeedValue);
                if (p.usedSeedUnit === 'gr') usedKg = usedKg / 1000;
                if (p.usedSeedUnit === 'tn') usedKg = usedKg * 1000;
                
                balance[varId].used += usedKg;
            }
        });

        return Object.values(balance);
    }, [receivedMaterials, plots, varieties, seedBatches, location, locations]);

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
                    {/* PANEL DE BALANCE (NUEVO) */}
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center">
                                    <Package size={20} className="mr-2 text-amber-600"/> Stock Disponible para Uso
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Consolidado de depósitos del titular: {ownerLabel}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {linkedStorages.length > 0 ? (
                                    linkedStorages.map(sp => (
                                        <div key={sp.id} className="bg-gray-50 dark:bg-slate-950 px-3 py-1 rounded-full border dark:border-slate-800 flex items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            <Warehouse size={10} className="mr-1.5 text-hemp-500"/> {sp.name}
                                        </div>
                                    ))
                                ) : (
                                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100 flex items-center">
                                        <AlertTriangle size={12} className="mr-1"/> Sin Depósitos Vinculados
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {linkedStorages.length === 0 && (
                            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
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
                        
                        {stockBalance.length === 0 ? (
                            <div className="p-12 text-center bg-gray-50 dark:bg-slate-950 rounded-3xl border border-dashed dark:border-slate-800 flex flex-col items-center">
                                <Package size={32} className="text-gray-300 mb-2"/>
                                <p className="text-gray-400 italic font-medium">No se detectaron existencias ni movimientos en los depósitos vinculados.</p>
                                {linkedStorages.length > 0 && <Link to="/seed-batches" className="mt-4 text-[10px] font-black text-hemp-600 uppercase tracking-widest hover:underline">Gestionar Inventario Logístico</Link>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {stockBalance.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.variety}</p>
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{(item.received - item.used).toFixed(1)} <span className="text-sm">kg</span></p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">En Depósito</p>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <p className="text-[10px] font-black text-green-600 flex items-center justify-end"><ArrowLeft size={10} className="mr-1 rotate-45"/> {item.received} kg Ingresados</p>
                                                    <p className="text-[10px] font-black text-red-500 flex items-center justify-end"><Sprout size={10} className="mr-1"/> {item.used.toFixed(1)} kg Sembrados</p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-500" 
                                                    style={{ width: `${Math.min(100, Math.max(0, ((item.received - item.used) / item.received) * 100))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                        <div className="p-8 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Historial de Remitos (Entrantes a Depósitos Vinculados)</h3>
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
                                                     <td className="px-8 py-5 text-center font-black text-hemp-600 text-base">{m.quantity} kg</td>
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
