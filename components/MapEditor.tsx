import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap, Tooltip } from 'react-leaflet';
import { Trash2, MapPin, MousePointer, Maximize, Layers, Satellite, Mountain, Navigation, ShieldCheck, Check } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

type MapLayerType = 'satellite' | 'terrain' | 'street';

interface MapEditorProps {
    initialPolygon?: { lat: number, lng: number }[];
    initialCenter?: { lat: number, lng: number };
    referencePolygon?: { lat: number, lng: number }[]; 
    extraPolygons?: { id: string, polygon: { lat: number, lng: number }[], label?: string, color?: string }[];
    onPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => void;
    // Capa Geodésica de Declaración Jurada (DDJJ) de Siembra
    sowingPolygon?: { lat: number, lng: number }[];
    onSowingPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => void;
    enableSowingLayer?: boolean;
    readOnly?: boolean;
    height?: string;
    key?: string | number;
}

const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const container = map.getContainer();
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                map.invalidateSize({ animate: false });
            });
        });
        observer.observe(container);
        map.invalidateSize();
        const timer = setTimeout(() => map.invalidateSize(), 500);
        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [map]);
    return null;
};

const MapEvents = ({ onAddPoint }: { onAddPoint: (e: L.LeafletMouseEvent) => void }) => {
    useMapEvents({ click: onAddPoint });
    return null;
};

const MapRecenter = ({ center, polygon }: { center: { lat: number, lng: number }, polygon?: { lat: number, lng: number }[] }) => {
    const map = useMap();
    useEffect(() => {
        if (polygon && polygon.length >= 3) {
            const bounds = L.latLngBounds(polygon.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [25, 25] });
        } else if (center && center.lat !== 0 && center.lng !== 0) {
            map.setView([center.lat, center.lng], 15);
        }
    }, [center, polygon, map]);
    return null;
};

export default function MapEditor({ 
    initialPolygon = [], 
    initialCenter, 
    referencePolygon = [], 
    extraPolygons = [], 
    onPolygonChange, 
    sowingPolygon = [],
    onSowingPolygonChange,
    enableSowingLayer = false,
    readOnly = false, 
    height = "400px" 
}: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number, lng: number }[]>(initialPolygon);
    const [sowingPoly, setSowingPoly] = useState<{ lat: number, lng: number }[]>(sowingPolygon);
    
    // Capa de mapa activa: 'satellite' (satélite de alta definición Esri), 'terrain' (topografía), 'street' (gráfico OSM)
    const [activeLayer, setActiveLayer] = useState<MapLayerType>('satellite');
    
    // Si la capa DDJJ de siembra está habilitada, podemos alternar cuál estamos editando:
    // 'general' = Perímetro General del Establecimiento | 'sowing' = Declaración Jurada de Siembra
    const [activeEditTarget, setActiveEditTarget] = useState<'general' | 'sowing'>('general');

    const [center, setCenter] = useState<{ lat: number, lng: number }>(() => {
        if (initialCenter && initialCenter.lat !== 0) return initialCenter;
        if (sowingPolygon && sowingPolygon.length > 0) return sowingPolygon[0];
        if (initialPolygon && initialPolygon.length > 0) return initialPolygon[0];
        if (referencePolygon && referencePolygon.length > 0) return referencePolygon[0];
        return { lat: -33.8912, lng: -60.5731 };
    });

    useEffect(() => {
        if (initialCenter && initialCenter.lat !== 0) setCenter(initialCenter);
    }, [initialCenter]);

    useEffect(() => {
        if (initialPolygon) setPolygon(initialPolygon);
    }, [initialPolygon]);

    useEffect(() => {
        if (sowingPolygon) setSowingPoly(sowingPolygon);
    }, [sowingPolygon]);

    const toRad = (value: number) => (value * Math.PI) / 180;

    const calculateAreaHa = (coords: { lat: number, lng: number }[]) => {
        if (coords.length < 3) return 0;
        const earthRadius = 6371000;
        let area = 0;
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const p1 = coords[i];
            const p2 = coords[j];
            area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
        }
        area = Math.abs(area * earthRadius * earthRadius / 2);
        return area / 10000;
    };

    const calculateCentroid = (coords: { lat: number, lng: number }[]) => {
        if (coords.length === 0) return center;
        const lats = coords.map(c => c.lat);
        const lngs = coords.map(c => c.lng);
        return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
    };

    const handleAddPoint = (e: L.LeafletMouseEvent) => {
        if (readOnly) return;
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };

        if (enableSowingLayer && activeEditTarget === 'sowing') {
            const newSowing = [...sowingPoly, newPoint];
            setSowingPoly(newSowing);
            if (onSowingPolygonChange) {
                onSowingPolygonChange(newSowing, calculateAreaHa(newSowing), calculateCentroid(newSowing), 0);
            }
        } else {
            const newPoly = [...polygon, newPoint];
            setPolygon(newPoly);
            if (onPolygonChange) {
                onPolygonChange(newPoly, calculateAreaHa(newPoly), calculateCentroid(newPoly), 0);
            }
        }
    };

    const handleClearActiveLayer = () => {
        if (enableSowingLayer && activeEditTarget === 'sowing') {
            setSowingPoly([]);
            if (onSowingPolygonChange) onSowingPolygonChange([], 0, center, 0);
        } else {
            setPolygon([]);
            if (onPolygonChange) onPolygonChange([], 0, center, 0);
        }
    };

    return (
        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner z-0 bg-slate-950" style={{ height, minHeight: '340px' }}>
            
            {/* 1. SELECTOR FLOTANTE DE CAPAS DE MAPA (SATÉLITE / TERRENO / CALLES) */}
            <div className="absolute top-3 left-3 z-[1000] flex items-center bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-xl border border-white/20">
                <button
                    type="button"
                    onClick={() => setActiveLayer('satellite')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'satellite'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Vista Satelital de Alta Definición (Esri World Imagery)"
                >
                    <Satellite size={12} />
                    <span>Satélite HD</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveLayer('terrain')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'terrain'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Capa de Terreno y Topografía (OpenTopoMap)"
                >
                    <Mountain size={12} />
                    <span>Terreno</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveLayer('street')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'street'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Capa Gráfica y Vial (OpenStreetMap)"
                >
                    <Navigation size={12} />
                    <span>Calles</span>
                </button>
            </div>

            {/* 2. SELECTOR DE POLÍGONO ACTIVO A DIBUJAR (GENERAL VS DDJJ SIEMBRA) */}
            {enableSowingLayer && !readOnly && (
                <div className="absolute top-14 left-3 z-[1000] flex items-center bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-xl border border-white/20">
                    <button
                        type="button"
                        onClick={() => setActiveEditTarget('general')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                            activeEditTarget === 'general'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Dibujar Perímetro General del Predio"
                    >
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        <span>1. Perímetro General</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveEditTarget('sowing')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                            activeEditTarget === 'sowing'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Dibujar Polígono Geodésico de Siembra (Declaración Jurada ARICCAME/SENASA)"
                    >
                        <ShieldCheck size={12} className="text-emerald-300" />
                        <span>2. DDJJ Siembra Geodésica</span>
                    </button>
                </div>
            )}

            {/* 3. BOTÓN LIMPIAR POLÍGONO ACTIVO */}
            {!readOnly && (
                <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-white/20">
                    <button 
                        onClick={handleClearActiveLayer} 
                        className="flex items-center text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg hover:bg-rose-950/40 transition-colors" 
                        type="button"
                        title={enableSowingLayer && activeEditTarget === 'sowing' ? "Limpiar Polígono DDJJ Siembra" : "Limpiar Perímetro General"}
                    >
                        <Trash2 size={12} className="mr-1"/> 
                        <span>Limpiar {enableSowingLayer && activeEditTarget === 'sowing' ? 'DDJJ' : 'Perímetro'}</span>
                    </button>
                </div>
            )}

            {/* 4. MAPA LEAFLET CON TILE LAYER DINÁMICA */}
            <MapContainer 
                center={[center.lat, center.lng]} 
                zoom={14}
                maxZoom={25}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                <MapResizer />

                {/* Capas según selección de usuario */}
                {activeLayer === 'satellite' && (
                    <TileLayer 
                        attribution='Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics' 
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                        maxZoom={25}
                        maxNativeZoom={19}
                    />
                )}

                {activeLayer === 'terrain' && (
                    <TileLayer 
                        attribution='&copy; OpenTopoMap contributors' 
                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                        maxZoom={25}
                        maxNativeZoom={17}
                    />
                )}

                {activeLayer === 'street' && (
                    <TileLayer 
                        attribution='&copy; OpenStreetMap contributors' 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                        maxZoom={25}
                        maxNativeZoom={19}
                    />
                )}

                {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                <MapRecenter 
                    center={center} 
                    polygon={sowingPoly.length > 2 ? sowingPoly : (polygon.length > 2 ? polygon : undefined)} 
                />

                {referencePolygon.length > 2 && (
                    <Polygon positions={referencePolygon} pathOptions={{ color: '#ef4444', fillColor: 'transparent', weight: 2, dashArray: '5, 10' }} />
                )}

                {/* 1. NIVEL GENERAL: Perímetro del Establecimiento (Azul técnico) */}
                {polygon.length > 1 && (
                    <Polygon 
                        positions={polygon} 
                        pathOptions={{ color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.15, weight: 3 }}
                    >
                         <Tooltip direction="center" offset={[0, 0]} opacity={0.8} permanent>
                            <span className="font-mono font-bold text-[10px] uppercase text-sky-900 bg-sky-100 px-1 py-0.5 rounded">
                                Predio General ({calculateAreaHa(polygon).toFixed(1)} ha)
                            </span>
                         </Tooltip>
                    </Polygon>
                )}

                {/* 2. NIVEL DDJJ: Polígono Geodésico de Siembra Declarada (Verde esmeralda fluorescente) */}
                {sowingPoly.length > 1 && (
                    <Polygon 
                        positions={sowingPoly} 
                        pathOptions={{ 
                            color: '#10b981', 
                            fillColor: '#10b981', 
                            fillOpacity: 0.35, 
                            weight: 3.5,
                            dashArray: '6, 6'
                        }}
                    >
                         <Tooltip direction="center" offset={[0, 0]} opacity={0.9} permanent>
                            <span className="font-mono font-black text-[10px] uppercase text-emerald-950 bg-emerald-300 px-1.5 py-0.5 rounded shadow">
                                📜 DDJJ Siembra: {calculateAreaHa(sowingPoly).toFixed(2)} Ha
                            </span>
                         </Tooltip>
                    </Polygon>
                )}

                {/* 3. NIVEL PARCELAS: Unidades Productivas dentro del predio */}
                {extraPolygons.map(layer => (
                    <Polygon 
                        key={layer.id} 
                        positions={layer.polygon} 
                        pathOptions={{ color: layer.color || '#a855f7', fillColor: layer.color || '#c084fc', fillOpacity: 0.5, weight: 2 }}
                    >
                        {layer.label && (
                            <Tooltip sticky direction="top" className="font-bold text-xs uppercase">
                                {layer.label}
                            </Tooltip>
                        )}
                    </Polygon>
                ))}

                {/* Marcadores de vértices según capa activa que se está editando */}
                {activeEditTarget === 'general' && !readOnly && polygon.map((pos, idx) => ( 
                    <Marker key={`gen-marker-${idx}`} position={[pos.lat, pos.lng]} /> 
                ))}

                {activeEditTarget === 'sowing' && !readOnly && sowingPoly.map((pos, idx) => ( 
                    <Marker key={`sow-marker-${idx}`} position={[pos.lat, pos.lng]} /> 
                ))}
                
                {readOnly && polygon.length === 0 && sowingPoly.length === 0 && center.lat !== 0 && ( 
                    <Marker position={[center.lat, center.lng]} /> 
                )}
            </MapContainer>
            
            {/* Indicador de ayuda al usuario */}
            {!readOnly && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-4 py-2 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider pointer-events-none flex items-center shadow-2xl border border-white/20 backdrop-blur-md">
                    <MousePointer size={12} className="mr-2 animate-pulse text-emerald-400"/> 
                    <span>
                        {enableSowingLayer && activeEditTarget === 'sowing' 
                            ? 'Haz clic para marcar los vértices de la Declaración Jurada de Siembra' 
                            : 'Haz clic en el mapa satelital para trazar el perímetro general'}
                    </span>
                </div>
            )}
        </div>
    );
}
