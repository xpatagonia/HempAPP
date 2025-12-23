
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, MapPin, Globe, Droplets, User, Building, ExternalLink, Ruler, Sprout, ChevronRight, Waves, CloudRain, Package, CheckCircle2, Truck, ClipboardCheck, Info, Tag, Activity, Archive, Landmark } from 'lucide-react';
import WeatherWidget from '../components/WeatherWidget';
import MapEditor from '../components/MapEditor';
import HydricBalance from '../components/HydricBalance';

export default function LocationDetails() {
    const { id } = useParams<{ id: string }>();
    const { locations, plots, varieties, clients, seedMovements, seedBatches, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'info' | 'water' | 'stock'>('info');

    const location = locations.find(l => l.id === id);
    const locationPlots = plots.filter(p => p.locationId === id);
    
    // Filtramos movimientos de semillas enviados a este campo
    const receivedMaterials = useMemo(() => {
        return seedMovements.filter(m => m.targetLocationId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [seedMovements, id]);

    const occupiedArea = locationPlots.reduce((sum, p) => {
        let area = p.surfaceArea || 0;
        if(p.surfaceUnit === 'm2') area = area / 10000;
        return sum + area;
    }, 0);
    
    const client = clients.find(c => c.id === location?.clientId);

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
                                    return (
                                        <Link key={p.id} to={`/plots/${p.id}`} className="bg-white dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 hover:border-hemp-500 hover:shadow-lg transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-hemp-50 dark:bg-hemp-900/20 rounded-2xl text-hemp-600"><Sprout size={20}/></div>
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${p.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}>{p.status}</span>
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
                                    <MapEditor initialCenter={location.coordinates} initialPolygon={location.polygon} readOnly={true} height="100%"/>
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
                                <div className="text-gray-400 text-sm italic">Sin socio comercial asignado.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stock' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border dark:border-slate-800 overflow-hidden">
                        <div className="p-10 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
                            <div className="flex items-center space-x-4">
                                <div className="bg-amber-600 p-4 rounded-3xl text-white shadow-lg"><Package size={32}/></div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Inventario en Campo</h2>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Control de remitos y stock disponible para siembra</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">
                             <div className="overflow-x-auto">
                                 <table className="min-w-full text-sm text-left">
                                     <thead className="bg-gray-50 dark:bg-slate-950 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                                         <tr>
                                             <th className="px-8 py-5">Fecha Recepción</th>
                                             <th className="px-8 py-5">Remito / Guía</th>
                                             <th className="px-8 py-5">Material (Lote)</th>
                                             <th className="px-8 py-5 text-center">Cantidad</th>
                                             <th className="px-8 py-5 text-right">Estatus</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                         {receivedMaterials.length === 0 ? (
                                             <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">No se han registrado envíos a este sitio.</td></tr>
                                         ) : receivedMaterials.map(m => {
                                             const batch = seedBatches.find(b => b.id === m.batchId);
                                             const vari = varieties.find(v => v.id === batch?.varietyId);
                                             return (
                                                 <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                     <td className="px-8 py-5 font-black text-gray-800 dark:text-gray-300">{m.date}</td>
                                                     <td className="px-8 py-5 font-mono text-blue-600 font-bold">{m.transportGuideNumber || 'S/N'}</td>
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
