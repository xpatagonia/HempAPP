import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap, Tooltip } from 'react-leaflet';
import { Trash2, MapPin, MousePointer, Layers, Satellite, Mountain, Navigation, ShieldCheck, Globe, Target } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Iconos vectoriales SVG sin dependencias de archivos de imagen externos (.png)
const generalVertexIcon = L.divIcon({
    className: 'custom-vertex-general',
    html: `<div style="background-color: #0284c7; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

const sowingVertexIcon = L.divIcon({
    className: 'custom-vertex-sowing',
    html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

const centerPinIcon = L.divIcon({
    className: 'custom-pin-center',
    html: `<div style="display:flex;align-items:center;justify-content:center;background:#10b981;color:#ffffff;width:30px;height:30px;border-radius:50%;border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.5);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

type MapLayerType = 'esri_sat' | 'google_hybrid' | 'terrain' | 'street';

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

// Resizer con ResizeObserver reactivo ante cambios de visibilidad o pestañas
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const trigger = () => {
            requestAnimationFrame(() => {
                try { 
                    map.invalidateSize({ animate: false }); 
                } catch (e) {}
            });
        };

        trigger();
        const t1 = setTimeout(trigger, 50);
        const t2 = setTimeout(trigger, 150);
        const t3 = setTimeout(trigger, 350);
        const t4 = setTimeout(trigger, 700);
        const t5 = setTimeout(trigger, 1200);

        let observer: ResizeObserver | null = null;
        try {
            const container = map.getContainer();
            if (container) {
                observer = new ResizeObserver(trigger);
                observer.observe(container);
            }
        } catch (e) {}

        window.addEventListener('resize', trigger);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
            clearTimeout(t5);
            if (observer) observer.disconnect();
            window.removeEventListener('resize', trigger);
        };
    }, [map]);
    return null;
};

// Eventos de clic para agregar vértices al polígono
const MapEvents = ({ onAddPoint }: { onAddPoint: (e: L.LeafletMouseEvent) => void }) => {
    useMapEvents({ click: onAddPoint });
    return null;
};

// Centrador inicial suave que no bloquea la interacción del usuario
const MapRecenter = ({ 
    center, 
    polygon, 
    fitTrigger 
}: { 
    center: { lat: number, lng: number }, 
    polygon?: { lat: number, lng: number }[],
    fitTrigger: number
}) => {
    const map = useMap();
    const hasAutoFittedRef = useRef(false);

    const fitToData = useCallback(() => {
        if (polygon && polygon.length >= 3) {
            const valid = polygon.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
            if (valid.length >= 3) {
                const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
                if (bounds.isValid()) {
                    try {
                        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
                        return true;
                    } catch (e) {}
                }
            }
        }
        if (center && !isNaN(center.lat) && !isNaN(center.lng) && center.lat !== 0 && center.lng !== 0) {
            try {
                map.setView([center.lat, center.lng], 14);
                return true;
            } catch (e) {}
        }
        return false;
    }, [center, polygon, map]);

    // Centrado inicial una sola vez
    useEffect(() => {
        if (!hasAutoFittedRef.current) {
            const timer = setTimeout(() => {
                const fitted = fitToData();
                if (fitted) hasAutoFittedRef.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fitToData]);

    // Centrado bajo demanda cuando el usuario pulsa el botón "Enfocar"
    useEffect(() => {
        if (fitTrigger > 0) {
            fitToData();
        }
    }, [fitTrigger, fitToData]);

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
    height = "480px" 
}: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number, lng: number }[]>(initialPolygon);
    const [sowingPoly, setSowingPoly] = useState<{ lat: number, lng: number }[]>(sowingPolygon);
    
    // Capa de mapa activa: 'esri_sat' (Satelital HD Esri estable mundial), 'google_hybrid', 'terrain', 'street'
    const [activeLayer, setActiveLayer] = useState<MapLayerType>('esri_sat');
    
    // Si la capa DDJJ de siembra está habilitada:
    // 'general' = Perímetro General del Predio | 'sowing' = DDJJ de Siembra Geodésica
    const [activeEditTarget, setActiveEditTarget] = useState<'general' | 'sowing'>('general');
    const [fitTrigger, setFitTrigger] = useState(0);

    const [center, setCenter] = useState<{ lat: number, lng: number }>(() => {
        if (initialCenter && !isNaN(initialCenter.lat) && !isNaN(initialCenter.lng) && initialCenter.lat !== 0) return initialCenter;
        if (sowingPolygon && sowingPolygon.length > 0 && !isNaN(sowingPolygon[0].lat) && !isNaN(sowingPolygon[0].lng)) return sowingPolygon[0];
        if (initialPolygon && initialPolygon.length > 0 && !isNaN(initialPolygon[0].lat) && !isNaN(initialPolygon[0].lng)) return initialPolygon[0];
        if (referencePolygon && referencePolygon.length > 0 && !isNaN(referencePolygon[0].lat) && !isNaN(referencePolygon[0].lng)) return referencePolygon[0];
        // Centro agrícola Argentina por defecto (Río Cuarto / Pergamino)
        return { lat: -33.1235, lng: -64.3492 };
    });

    useEffect(() => {
        if (initialCenter && !isNaN(initialCenter.lat) && !isNaN(initialCenter.lng) && initialCenter.lat !== 0) {
            setCenter(initialCenter);
        }
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
        const newPoint = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) };

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

    const handleEnfocar = () => {
        setFitTrigger(prev => prev + 1);
    };

    const actualHeight = height || '480px';
    const minH = height === '100%' ? '260px' : '440px';

    return (
        <div 
            className="relative w-full rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner z-0 bg-slate-950 flex flex-col" 
            style={{ height: actualHeight, minHeight: minH }}
        >
            <style>{`
                .leaflet-container {
                    width: 100% !important;
                    height: 100% !important;
                    min-height: ${minH} !important;
                    background-color: #0b1120 !important;
                    font-family: inherit;
                }
                .leaflet-pane {
                    z-index: 400 !important;
                }
                .leaflet-top, .leaflet-bottom {
                    z-index: 900 !important;
                }
            `}</style>
            
            {/* 1. SELECTOR FLOTANTE DE CAPAS DE MAPA (SATÉLITE ESIRI HD / GOOGLE / TERRENO / CALLES) */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/20">
                <button
                    type="button"
                    onClick={() => setActiveLayer('esri_sat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'esri_sat'
                            ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Satélite HD de Alta Precisión (Esri World Imagery / Sentinel-2)"
                >
                    <Globe size={13} />
                    <span>Satélite HD</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveLayer('google_hybrid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'google_hybrid'
                            ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Satélite Google Hybrid con rotulación vial"
                >
                    <Satellite size={13} />
                    <span>Google Sat</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveLayer('terrain')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'terrain'
                            ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Capa de Terreno y Topografía (OpenTopoMap)"
                >
                    <Mountain size={13} />
                    <span>Terreno</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveLayer('street')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        activeLayer === 'street'
                            ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Capa Gráfica Vial y Catastral (OpenStreetMap)"
                >
                    <Navigation size={13} />
                    <span>Calles</span>
                </button>

                <div className="w-px h-4 bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={handleEnfocar}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase text-sky-300 hover:text-white hover:bg-sky-950/40 border border-sky-500/30 transition"
                    title="Enfocar en el predio y coordenadas"
                >
                    <Target size={13} />
                    <span>Enfocar</span>
                </button>
            </div>

            {/* 2. SELECTOR DE POLÍGONO ACTIVO A DIBUJAR (GENERAL VS DDJJ SIEMBRA) */}
            {enableSowingLayer && !readOnly && (
                <div className="absolute top-16 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/20">
                    <button
                        type="button"
                        onClick={() => setActiveEditTarget('general')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                            activeEditTarget === 'general'
                                ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-300'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Dibujar o editar Perímetro General del Predio"
                    >
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
                        <span>1. Predio General ({calculateAreaHa(polygon).toFixed(1)} ha)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveEditTarget('sowing')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                            activeEditTarget === 'sowing'
                                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Dibujar o editar Polígono Geodésico de Siembra (Declaración Jurada ARICCAME/SENASA)"
                    >
                        <ShieldCheck size={13} className="text-emerald-300" />
                        <span>2. DDJJ Siembra Geodésica ({calculateAreaHa(sowingPoly).toFixed(2)} ha)</span>
                    </button>
                </div>
            )}

            {/* 3. BOTÓN LIMPIAR POLÍGONO ACTIVO */}
            {!readOnly && (
                <div className="absolute top-3 right-3 z-[1000] bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/20">
                    <button 
                        onClick={handleClearActiveLayer} 
                        className="flex items-center text-[10px] text-rose-300 hover:text-white font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-colors" 
                        type="button"
                        title={enableSowingLayer && activeEditTarget === 'sowing' ? "Limpiar Polígono DDJJ Siembra" : "Limpiar Perímetro General"}
                    >
                        <Trash2 size={13} className="mr-1"/> 
                        <span>Limpiar {enableSowingLayer && activeEditTarget === 'sowing' ? 'DDJJ' : 'Perímetro'}</span>
                    </button>
                </div>
            )}

            {/* 4. MAPA LEAFLET CON TILE LAYER DINÁMICA */}
            <div className="flex-1 w-full h-full" style={{ minHeight: minH }}>
                <MapContainer 
                    center={[center.lat, center.lng]} 
                    zoom={14}
                    maxZoom={20}
                    style={{ height: "100%", minHeight: minH, width: "100%" }}
                    scrollWheelZoom={true}
                >
                    <MapResizer />

                    {/* 1. Capa Satelital Primaria: Esri World Imagery (Sin restricciones, libre, nítida) */}
                    {activeLayer === 'esri_sat' && (
                        <TileLayer 
                            attribution='Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics' 
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                            maxZoom={19}
                        />
                    )}

                    {/* 2. Capa Google Híbrida */}
                    {activeLayer === 'google_hybrid' && (
                        <TileLayer 
                            attribution='&copy; Google Satellite Imagery' 
                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                            maxZoom={20}
                        />
                    )}

                    {/* 3. Capa OpenTopoMap Terreno */}
                    {activeLayer === 'terrain' && (
                        <TileLayer 
                            attribution='&copy; OpenTopoMap contributors' 
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                            maxZoom={17}
                        />
                    )}

                    {/* 4. Capa OpenStreetMap Calles */}
                    {activeLayer === 'street' && (
                        <TileLayer 
                            attribution='&copy; OpenStreetMap contributors' 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            maxZoom={19}
                        />
                    )}

                    {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                    <MapRecenter 
                        center={center} 
                        polygon={sowingPoly.length > 2 ? sowingPoly : (polygon.length > 2 ? polygon : undefined)} 
                        fitTrigger={fitTrigger}
                    />

                    {referencePolygon.length > 2 && (
                        <Polygon positions={referencePolygon} pathOptions={{ color: '#ef4444', fillColor: 'transparent', weight: 2, dashArray: '5, 10' }} />
                    )}

                    {/* 1. NIVEL GENERAL: Perímetro del Establecimiento (Azul técnico) */}
                    {polygon.length > 1 && (
                        <Polygon 
                            positions={polygon} 
                            pathOptions={{ color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.18, weight: 3 }}
                        >
                             <Tooltip direction="center" offset={[0, 0]} opacity={0.88} permanent>
                                <span className="font-mono font-bold text-[10px] uppercase text-sky-950 bg-sky-200 px-2 py-0.5 rounded shadow">
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
                                fillOpacity: 0.38, 
                                weight: 3.5,
                                dashArray: '6, 6'
                            }}
                        >
                             <Tooltip direction="center" offset={[0, 0]} opacity={0.95} permanent>
                                <span className="font-mono font-black text-[10px] uppercase text-emerald-950 bg-emerald-300 px-2.5 py-0.5 rounded shadow border border-emerald-400">
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
                            pathOptions={{ color: layer.color || '#a855f7', fillColor: layer.color || '#c084fc', fillOpacity: 0.45, weight: 2 }}
                        >
                            {layer.label && (
                                <Tooltip sticky direction="top" className="font-bold text-xs uppercase">
                                    {layer.label}
                                </Tooltip>
                            )}
                        </Polygon>
                    ))}

                    {/* Marcadores SVG de vértices según capa activa que se está editando */}
                    {activeEditTarget === 'general' && !readOnly && polygon.map((pos, idx) => ( 
                        <Marker 
                            key={`gen-marker-${idx}`} 
                            position={[pos.lat, pos.lng]} 
                            icon={generalVertexIcon}
                        /> 
                    ))}

                    {activeEditTarget === 'sowing' && !readOnly && sowingPoly.map((pos, idx) => ( 
                        <Marker 
                            key={`sow-marker-${idx}`} 
                            position={[pos.lat, pos.lng]} 
                            icon={sowingVertexIcon}
                        /> 
                    ))}
                    
                    {/* Pin de centroide cuando no hay polígono trazado aún */}
                    {polygon.length === 0 && sowingPoly.length === 0 && center.lat !== 0 && ( 
                        <Marker position={[center.lat, center.lng]} icon={centerPinIcon} /> 
                    )}
                </MapContainer>
            </div>
            
            {/* Indicador de ayuda al usuario en la base del mapa */}
            {!readOnly && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-4 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider pointer-events-none flex items-center shadow-2xl border border-white/20 backdrop-blur-md">
                    <MousePointer size={12} className="mr-2 animate-pulse text-emerald-400"/> 
                    <span>
                        {enableSowingLayer && activeEditTarget === 'sowing' 
                            ? 'Haz clic en el mapa satelital para trazar el polígono de DDJJ de Siembra' 
                            : 'Haz clic en el mapa satelital para trazar el perímetro general del predio'}
                    </span>
                </div>
            )}
        </div>
    );
}
