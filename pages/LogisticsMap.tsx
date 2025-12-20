
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Building, MapPin, Warehouse, Truck, Activity, Search, Filter, Maximize2, Navigation } from 'lucide-react';
import L from 'leaflet';

export default function LogisticsMap() {
    const { storagePoints, locations, suppliers, clients } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'storage' | 'field' | 'supplier'>('all');

    const markers = useMemo(() => {
        const all: any[] = [];
        
        if (filterType === 'all' || filterType === 'storage') {
            storagePoints.forEach(sp => {
                if (sp.coordinates?.lat) all.push({ ...sp, mapType: 'storage', iconColor: '#16a34a' });
            });
        }
        
        if (filterType === 'all' || filterType === 'field') {
            locations.forEach(loc => {
                if (loc.coordinates?.lat) all.push({ ...loc, mapType: 'field', iconColor: '#2563eb' });
            });
        }
        
        if (filterType === 'all' || filterType === 'supplier') {
            suppliers.forEach(sup => {
                if (sup.coordinates?.lat) all.push({ ...sup, mapType: 'supplier', iconColor: '#9333ea' });
            });
        }

        return all.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [storagePoints, locations, suppliers, filterType, searchTerm]);

    const MapCenterer = ({ coords }: { coords: {lat: number, lng: number}[] }) => {
        const map = useMap();
        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        return null;
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Torre de <span className="text-hemp-600">Control Logística</span></h1>
                    <p className="text-sm text-slate-500 font-medium">Monitoreo geoespacial de la red agroindustrial.</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar nodo o sitio..." 
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-hemp-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="px-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none dark:text-white"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                    >
                        <option value="all">Ver Todo</option>
                        <option value="storage">Depósitos</option>
                        <option value="field">Campos</option>
                        <option value="supplier">Proveedores</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800 overflow-hidden shadow-2xl relative">
                <MapContainer center={[-34.6, -58.4]} zoom={6} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapCenterer coords={markers.map(m => m.coordinates)} />
                    
                    {markers.map((marker, idx) => (
                        <Marker 
                            key={`${marker.mapType}-${marker.id}`} 
                            position={[marker.coordinates.lat, marker.coordinates.lng]}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        {marker.mapType === 'storage' && <Warehouse className="text-green-600" size={16}/>}
                                        {marker.mapType === 'field' && <Navigation className="text-blue-600" size={16}/>}
                                        {marker.mapType === 'supplier' && <Building className="text-purple-600" size={16}/>}
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{marker.mapType}</span>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-sm uppercase leading-tight mb-1">{marker.name}</h4>
                                    <p className="text-xs text-slate-500 mb-2">{marker.address || marker.city}</p>
                                    <div className="pt-2 border-t flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-slate-400">{marker.nodeCode || marker.id}</span>
                                        <button className="text-hemp-600 font-black text-[9px] uppercase hover:underline">Ver Detalles →</button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border dark:border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                        <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Nodos Logísticos</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                        <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Campos Productivos</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></div>
                        <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Proveedores de Red</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
