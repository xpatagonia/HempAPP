
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, MapPin, Globe, Droplets, User, Building, ExternalLink, Ruler, Sprout, ChevronRight } from 'lucide-react';
import WeatherWidget from '../components/WeatherWidget';
import MapEditor from '../components/MapEditor';

export default function LocationDetails() {
    const { id } = useParams<{ id: string }>();
    const { locations, plots, varieties, clients } = useAppContext();

    const location = locations.find(l => l.id === id);
    const locationPlots = plots.filter(p => p.locationId === id);
    
    // Stats calculation
    const totalPlots = locationPlots.length;
    const occupiedArea = locationPlots.reduce((sum, p) => {
        let area = p.surfaceArea || 0;
        if(p.surfaceUnit === 'm2') area = area / 10000;
        return sum + area;
    }, 0);
    const occupancyRate = location?.capacityHa ? (occupiedArea / location.capacityHa) * 100 : 0;

    const client = clients.find(c => c.id === location?.clientId);

    if (!location) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Globe size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-bold text-gray-800">Ubicación no encontrada</h2>
                <Link to="/locations" className="text-hemp-600 hover:underline mt-2">Volver al listado</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <Link to="/locations" className="flex items-center text-gray-500 hover:text-gray-800 transition font-medium">
                <ArrowLeft size={18} className="mr-1" /> Volver a Campos
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: INFO & MAP */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Header Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6">
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center mb-2">
                                <MapPin className="mr-3 text-hemp-600" size={32}/>
                                {location.name}
                            </h1>
                            <p className="text-gray-500 flex items-center text-sm ml-11">
                                {location.city}, {location.province} • {location.address}
                            </p>
                            
                            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <span className="text-xs font-bold text-blue-700 uppercase block mb-1">Capacidad</span>
                                    <span className="text-lg font-black text-blue-900">{location.capacityHa || '-'} ha</span>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="text-xs font-bold text-green-700 uppercase block mb-1">Ocupación</span>
                                    <span className="text-lg font-black text-green-900">{occupiedArea.toFixed(1)} ha</span>
                                    <div className="w-full bg-green-200 h-1.5 rounded-full mt-1">
                                        <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${Math.min(occupancyRate, 100)}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Cultivos</span>
                                    <span className="text-lg font-black text-gray-800">{totalPlots}</span>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                    <span className="text-xs font-bold text-indigo-700 uppercase block mb-1">Sistema Riego</span>
                                    <div className="flex items-center text-indigo-900 font-bold text-sm h-full pb-2">
                                        <Droplets size={14} className="mr-1"/> {location.irrigationSystem || 'Secano'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAP */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-800">Ubicación Satelital</div>
                        <div className="h-[400px] w-full">
                            {location.coordinates ? (
                                <MapEditor 
                                    initialCenter={location.coordinates}
                                    // If we had the polygon of the field boundaries, we would pass it here.
                                    // For now, let's visualize active plots centers if available? 
                                    // Simpler: Just center the map.
                                    readOnly={true}
                                    height="100%"
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                    <Globe size={48} className="mb-2 opacity-50"/>
                                    <span>Sin coordenadas GPS</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ACTIVE PLOTS LIST */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center">
                            <span>Cultivos en Curso ({locationPlots.length})</span>
                            <Link to={`/plots?location=${location.id}`} className="text-sm text-hemp-600 hover:underline">Ver todos</Link>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {locationPlots.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 italic">No hay cultivos activos en este momento.</div>
                            ) : locationPlots.map(p => {
                                const vari = varieties.find(v => v.id === p.varietyId);
                                return (
                                    <Link key={p.id} to={`/plots/${p.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                                        <div className="flex items-center">
                                            <div className={`p-2 rounded-full mr-3 ${p.status === 'Activa' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Sprout size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 group-hover:text-hemp-700 transition">{p.name}</h4>
                                                <p className="text-xs text-gray-500">{vari?.name} • {p.surfaceArea} {p.surfaceUnit}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-600"/>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: WEATHER & INFO */}
                <div className="space-y-6">
                    {/* WEATHER CARD */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-800">
                            Pronóstico Agronómico
                        </div>
                        {location.coordinates ? (
                            <WeatherWidget 
                                lat={location.coordinates.lat} 
                                lng={location.coordinates.lng} 
                                showForecast={true} 
                            />
                        ) : (
                            <div className="p-6 text-center text-gray-400 text-sm">Requiere coordenadas GPS.</div>
                        )}
                        <div className="p-4 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
                            * Alertas basadas en modelos GFS/Open-Meteo.
                        </div>
                    </div>

                    {/* OWNER / CLIENT CARD */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Building size={18} className="mr-2 text-gray-400"/> Titular / Cliente
                        </h3>
                        {client ? (
                            <div className="space-y-3">
                                <div className="font-bold text-lg text-indigo-900">{client.name}</div>
                                <div className="text-sm text-gray-600 flex items-center">
                                    <User size={14} className="mr-2"/> {client.contactName}
                                </div>
                                <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded border border-indigo-100 mt-2">
                                    {client.type}
                                </div>
                                {client.email && (
                                    <a href={`mailto:${client.email}`} className="text-xs text-blue-600 hover:underline flex items-center mt-1">
                                        <ExternalLink size={10} className="mr-1"/> Contactar
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm italic">
                                {location.ownerName || 'Sin asignar'}
                            </div>
                        )}
                    </div>

                    {/* SOIL INFO */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Características de Suelo</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Tipo</span>
                                <span className="text-sm font-bold text-gray-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">{location.soilType}</span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Clima</span>
                                <span className="text-sm text-gray-600">{location.climate || 'N/D'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
