import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap, Tooltip, ZoomControl } from 'react-leaflet';
import { Trash2, MousePointer, Satellite, Mountain, Navigation, ShieldCheck, Globe, Target, Tag, Maximize2, Ruler, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Iconos vectoriales SVG sin dependencias de archivos de imagen externos (.png)
const generalVertexIcon = L.divIcon({
    className: 'custom-vertex-general',
    html: `<div style="background-color: #0284c7; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.6);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const sowingVertexIcon = L.divIcon({
    className: 'custom-vertex-sowing',
    html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.6);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const readOnlyVertexIcon = L.divIcon({
    className: 'custom-vertex-readonly',
    html: `<div style="background-color: #38bdf8; width: 9px; height: 9px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.7);"></div>`,
    iconSize: [9, 9],
    iconAnchor: [4.5, 4.5]
});

const centerPinIcon = L.divIcon({
    className: 'custom-pin-center',
    html: `<div style="display:flex;align-items:center;justify-content:center;background:#10b981;color:#ffffff;width:30px;height:30px;border-radius:50%;border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.5);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

type MapLayerType = 'google_hybrid' | 'esri_sat' | 'terrain' | 'street';
type FitModeType = 'plot' | 'block' | 'field';

export interface ExtraPolygonItem {
    id: string;
    polygon: { lat: number; lng: number }[];
    label?: string;
    shortLabel?: string;
    subLabel?: string;
    color?: string;
    isCurrent?: boolean;
}

interface MapEditorProps {
    initialPolygon?: { lat: number, lng: number }[];
    initialCenter?: { lat: number, lng: number };
    referencePolygon?: { lat: number, lng: number }[]; 
    referenceLabel?: string;
    polygonLabel?: string;
    polygonShortLabel?: string;
    polygonSubLabel?: string;
    extraPolygons?: ExtraPolygonItem[];
    onExtraPolygonClick?: (id: string) => void;
    onPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => void;
    // Capa Geodésica de Declaración Jurada (DDJJ) de Siembra
    sowingPolygon?: { lat: number, lng: number }[];
    onSowingPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => void;
    enableSowingLayer?: boolean;
    initialFitMode?: FitModeType;
    readOnly?: boolean;
    height?: string;
    key?: string | number;
}

// Distancia geodésica Haversine en metros entre 2 puntos GPS
export const haversineMeters = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number => {
    const R = 6378137;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) *
            Math.cos((p2.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const calculatePerimeterMeters = (coords: { lat: number; lng: number }[]): number => {
    if (!coords || coords.length < 2) return 0;
    let perim = 0;
    // Si el último punto repite el primero (polígono cerrado), no duplicar
    const closed =
        coords.length > 2 &&
        Math.abs(coords[0].lat - coords[coords.length - 1].lat) < 1e-8 &&
        Math.abs(coords[0].lng - coords[coords.length - 1].lng) < 1e-8;
    const pts = closed ? coords.slice(0, -1) : coords;
    for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        perim += haversineMeters(pts[i], next);
    }
    return Number(perim.toFixed(2));
};

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

// Centrador inteligente con soporte de aproximación de alta precisión (Parcela 20x / Bloque / Predio)
const MapRecenter = ({ 
    center, 
    polygon, 
    extraPolygons,
    referencePolygon,
    fitTrigger,
    fitMode
}: { 
    center: { lat: number, lng: number }, 
    polygon?: { lat: number, lng: number }[],
    extraPolygons?: ExtraPolygonItem[],
    referencePolygon?: { lat: number, lng: number }[],
    fitTrigger: number,
    fitMode: FitModeType
}) => {
    const map = useMap();
    const hasAutoFittedRef = useRef(false);

    const fitToData = useCallback((mode: FitModeType) => {
        try {
            // 1. Modo BLOQUE: encuadra la parcela activa + parcelas vecinas del mismo ensayo
            if (mode === 'block') {
                const allPts: [number, number][] = [];
                if (polygon && polygon.length >= 3) {
                    polygon.forEach(p => {
                        if (p && !isNaN(p.lat) && !isNaN(p.lng)) allPts.push([p.lat, p.lng]);
                    });
                }
                if (extraPolygons && extraPolygons.length > 0) {
                    extraPolygons.forEach(ep => {
                        (ep.polygon || []).forEach(p => {
                            if (p && !isNaN(p.lat) && !isNaN(p.lng)) allPts.push([p.lat, p.lng]);
                        });
                    });
                }
                if (allPts.length >= 3) {
                    const bounds = L.latLngBounds(allPts);
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 20 });
                        return true;
                    }
                }
            }

            // 2. Modo PREDIO: encuadra el límite general del campo padre
            if (mode === 'field' && referencePolygon && referencePolygon.length >= 3) {
                const validRef = referencePolygon.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
                if (validRef.length >= 3) {
                    const bounds = L.latLngBounds(validRef.map(p => [p.lat, p.lng]));
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 19 });
                        return true;
                    }
                }
            }

            // 3. Modo PARCELA (alta aproximación sobre la parcela activa)
            if (polygon && polygon.length >= 3) {
                const valid = polygon.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
                if (valid.length >= 3) {
                    const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [65, 65], maxZoom: 20 });
                        return true;
                    }
                }
            }

            // Fallback si no hay polígono propio pero sí parcelas del bloque o predio
            if (extraPolygons && extraPolygons.length > 0) {
                const pts: [number, number][] = [];
                extraPolygons.forEach(ep => {
                    (ep.polygon || []).forEach(p => {
                        if (p && !isNaN(p.lat) && !isNaN(p.lng)) pts.push([p.lat, p.lng]);
                    });
                });
                if (pts.length >= 3) {
                    const bounds = L.latLngBounds(pts);
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 20 });
                        return true;
                    }
                }
            }

            if (referencePolygon && referencePolygon.length >= 3) {
                const validRef = referencePolygon.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
                if (validRef.length >= 3) {
                    const bounds = L.latLngBounds(validRef.map(p => [p.lat, p.lng]));
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 19 });
                        return true;
                    }
                }
            }

            if (center && !isNaN(center.lat) && !isNaN(center.lng) && center.lat !== 0 && center.lng !== 0) {
                map.setView([center.lat, center.lng], 19);
                return true;
            }
        } catch (e) {}
        return false;
    }, [center, polygon, extraPolygons, referencePolygon, map]);

    // Centrado inicial una sola vez
    useEffect(() => {
        if (!hasAutoFittedRef.current) {
            const timer = setTimeout(() => {
                const fitted = fitToData(fitMode);
                if (fitted) hasAutoFittedRef.current = true;
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [fitToData, fitMode]);

    // Centrado bajo demanda cuando el usuario pulsa un botón de aproximación
    useEffect(() => {
        if (fitTrigger > 0) {
            fitToData(fitMode);
        }
    }, [fitTrigger, fitMode, fitToData]);

    return null;
};

export default function MapEditor({ 
    initialPolygon = [], 
    initialCenter, 
    referencePolygon = [], 
    referenceLabel = "Perímetro Campo Padre",
    polygonLabel = "Perímetro Parcela",
    polygonShortLabel,
    polygonSubLabel,
    extraPolygons = [], 
    onExtraPolygonClick,
    onPolygonChange, 
    sowingPolygon = [],
    onSowingPolygonChange,
    enableSowingLayer = false,
    initialFitMode,
    readOnly = false, 
    height = "480px" 
}: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number, lng: number }[]>(initialPolygon);
    const [sowingPoly, setSowingPoly] = useState<{ lat: number, lng: number }[]>(sowingPolygon);
    
    // Por defecto usamos 'google_hybrid' o 'esri_sat' con zoom extendido hasta nivel 22
    const [activeLayer, setActiveLayer] = useState<MapLayerType>('google_hybrid');
    const [showLabels, setShowLabels] = useState<boolean>(true);
    const [showMeasurements, setShowMeasurements] = useState<boolean>(readOnly);
    const [fitMode, setFitMode] = useState<FitModeType>(() => {
        if (initialFitMode) return initialFitMode;
        if (readOnly && extraPolygons && extraPolygons.length > 0) return 'block';
        return 'plot';
    });
    
    const [activeEditTarget, setActiveEditTarget] = useState<'general' | 'sowing'>('general');
    const [fitTrigger, setFitTrigger] = useState(0);

    const [center, setCenter] = useState<{ lat: number, lng: number }>(() => {
        if (initialCenter && !isNaN(initialCenter.lat) && !isNaN(initialCenter.lng) && initialCenter.lat !== 0) return initialCenter;
        if (sowingPolygon && sowingPolygon.length > 0 && !isNaN(sowingPolygon[0].lat) && !isNaN(sowingPolygon[0].lng)) return sowingPolygon[0];
        if (initialPolygon && initialPolygon.length > 0 && !isNaN(initialPolygon[0].lat) && !isNaN(initialPolygon[0].lng)) return initialPolygon[0];
        if (referencePolygon && referencePolygon.length > 0 && !isNaN(referencePolygon[0].lat) && !isNaN(referencePolygon[0].lng)) return referencePolygon[0];
        return { lat: -39.393075, lng: -62.621037 };
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

    const calculateAreaM2 = useCallback((coords: { lat: number, lng: number }[]) => {
        if (!coords || coords.length < 3) return 0;
        const earthRadius = 6378137;
        let area = 0;
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const p1 = coords[i];
            const p2 = coords[j];
            area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
        }
        return Math.abs((area * earthRadius * earthRadius) / 2);
    }, []);

    const calculateAreaHa = useCallback((coords: { lat: number, lng: number }[]) => {
        return calculateAreaM2(coords) / 10000;
    }, [calculateAreaM2]);

    const formatSurfaceAuto = useCallback((coords: { lat: number, lng: number }[]) => {
        const m2 = calculateAreaM2(coords);
        if (m2 < 1000) return `${m2.toFixed(1)} m²`;
        return `${(m2 / 10000).toFixed(2)} ha`;
    }, [calculateAreaM2]);

    const calculateCentroid = useCallback((coords: { lat: number, lng: number }[]) => {
        if (!coords || coords.length === 0) return center;
        const closed =
            coords.length > 2 &&
            Math.abs(coords[0].lat - coords[coords.length - 1].lat) < 1e-8 &&
            Math.abs(coords[0].lng - coords[coords.length - 1].lng) < 1e-8;
        const pts = closed ? coords.slice(0, -1) : coords;
        const lats = pts.map(c => c.lat);
        const lngs = pts.map(c => c.lng);
        return {
            lat: Number(((Math.min(...lats) + Math.max(...lats)) / 2).toFixed(6)),
            lng: Number(((Math.min(...lngs) + Math.max(...lngs)) / 2).toFixed(6))
        };
    }, [center]);

    // Segmentos con distancia en metros para cotas perimetrales de la parcela activa
    const activeEdgeMeasurements = useMemo(() => {
        if (!showMeasurements || !polygon || polygon.length < 3) return [];
        const closed =
            polygon.length > 2 &&
            Math.abs(polygon[0].lat - polygon[polygon.length - 1].lat) < 1e-8 &&
            Math.abs(polygon[0].lng - polygon[polygon.length - 1].lng) < 1e-8;
        const pts = closed ? polygon.slice(0, -1) : polygon;
        if (pts.length < 3 || pts.length > 12) return [];
        return pts.map((p1, idx) => {
            const p2 = pts[(idx + 1) % pts.length];
            const distM = haversineMeters(p1, p2);
            const mid = {
                lat: (p1.lat + p2.lat) / 2,
                lng: (p1.lng + p2.lng) / 2
            };
            return {
                id: `edge-${idx}`,
                mid,
                distFormatted: distM < 100 ? `${distM.toFixed(1)} m` : `${Math.round(distM)} m`
            };
        });
    }, [showMeasurements, polygon]);

    const handleAddPoint = (e: L.LeafletMouseEvent) => {
        if (readOnly) return;
        const newPoint = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) };

        if (enableSowingLayer && activeEditTarget === 'sowing') {
            const newSowing = [...sowingPoly, newPoint];
            setSowingPoly(newSowing);
            if (onSowingPolygonChange) {
                onSowingPolygonChange(
                    newSowing,
                    calculateAreaHa(newSowing),
                    calculateCentroid(newSowing),
                    calculatePerimeterMeters(newSowing)
                );
            }
        } else {
            const newPoly = [...polygon, newPoint];
            setPolygon(newPoly);
            if (onPolygonChange) {
                onPolygonChange(
                    newPoly,
                    calculateAreaHa(newPoly),
                    calculateCentroid(newPoly),
                    calculatePerimeterMeters(newPoly)
                );
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

    const triggerFitMode = (mode: FitModeType) => {
        setFitMode(mode);
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
                .leaflet-tooltip.plot-label-active {
                    background: rgba(6, 78, 59, 0.94) !important;
                    border: 1.5px solid #34d399 !important;
                    color: #ffffff !important;
                    border-radius: 8px !important;
                    padding: 3px 8px !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-weight: 800 !important;
                    font-size: 10.5px !important;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.65) !important;
                    white-space: nowrap !important;
                }
                .leaflet-tooltip.plot-label-active::before {
                    border-top-color: #34d399 !important;
                }
                .leaflet-tooltip.plot-label-sibling {
                    background: rgba(15, 23, 42, 0.88) !important;
                    border: 1px solid rgba(255, 255, 255, 0.35) !important;
                    color: #f8fafc !important;
                    border-radius: 6px !important;
                    padding: 2px 6px !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-weight: 700 !important;
                    font-size: 9.5px !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55) !important;
                    white-space: nowrap !important;
                }
                .leaflet-tooltip.plot-label-sibling::before {
                    display: none !important;
                }
            `}</style>
            
            {/* 1. BARRA SUPERIOR DE CAPAS SATELITALES + APROXIMACIÓN + ETIQUETAS */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                {/* Selector de Capas Base */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/20 pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => setActiveLayer('google_hybrid')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            activeLayer === 'google_hybrid'
                                ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Satélite Ultra-Zoom Híbrido (Zoom 22x)"
                    >
                        <Satellite size={13} />
                        <span>Satélite 22x</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveLayer('esri_sat')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            activeLayer === 'esri_sat'
                                ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Satélite Esri World Imagery + Referencias"
                    >
                        <Globe size={13} />
                        <span>Esri HD</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveLayer('terrain')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            activeLayer === 'terrain'
                                ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Capa de Terreno y Topografía"
                    >
                        <Mountain size={13} />
                        <span className="hidden sm:inline">Terreno</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveLayer('street')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            activeLayer === 'street'
                                ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Capa Catastral y Vial"
                    >
                        <Navigation size={13} />
                        <span className="hidden sm:inline">Catastro</span>
                    </button>
                </div>

                {/* Controles de Aproximación (Zoom Parcela / Bloque / Predio) y Etiquetas */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/20 pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => triggerFitMode('plot')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            fitMode === 'plot'
                                ? 'bg-sky-600 text-white ring-1 ring-sky-400'
                                : 'text-sky-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Aproximación máxima sobre la parcela activa"
                    >
                        <Target size={12} />
                        <span>Parcela</span>
                    </button>

                    {extraPolygons.length > 0 && (
                        <button
                            type="button"
                            onClick={() => triggerFitMode('block')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                                fitMode === 'block'
                                    ? 'bg-sky-600 text-white ring-1 ring-sky-400'
                                    : 'text-sky-300 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Ver el bloque completo de parcelas del ensayo con sus etiquetas"
                        >
                            <Layers size={12} />
                            <span>Bloque ({extraPolygons.length + (polygon.length >= 3 ? 1 : 0)})</span>
                        </button>
                    )}

                    {referencePolygon && referencePolygon.length >= 3 && (
                        <button
                            type="button"
                            onClick={() => triggerFitMode('field')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                                fitMode === 'field'
                                    ? 'bg-amber-600 text-white ring-1 ring-amber-400'
                                    : 'text-amber-300 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Encuadrar el perímetro completo del establecimiento"
                        >
                            <Maximize2 size={12} />
                            <span>Predio</span>
                        </button>
                    )}

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    <button
                        type="button"
                        onClick={() => setShowLabels(prev => !prev)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            showLabels
                                ? 'bg-emerald-600/90 text-white ring-1 ring-emerald-400'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Mostrar u ocultar etiquetas permanentes de las parcelas"
                    >
                        <Tag size={12} />
                        <span>Etiquetas</span>
                    </button>

                    {polygon.length >= 3 && (
                        <button
                            type="button"
                            onClick={() => setShowMeasurements(prev => !prev)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                                showMeasurements
                                    ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Mostrar u ocultar cotas en metros de los lados del polígono"
                        >
                            <Ruler size={12} />
                            <span className="hidden md:inline">Cotas</span>
                        </button>
                    )}

                    {!readOnly && (
                        <button 
                            onClick={handleClearActiveLayer} 
                            className="flex items-center text-[10px] text-rose-300 hover:text-white font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 transition-colors cursor-pointer ml-1" 
                            type="button"
                            title={enableSowingLayer && activeEditTarget === 'sowing' ? "Limpiar Polígono DDJJ Siembra" : "Limpiar Perímetro"}
                        >
                            <Trash2 size={12} className="mr-1"/> 
                            <span>Limpiar</span>
                        </button>
                    )}
                </div>
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
                    >
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
                        <span>1. Predio General ({formatSurfaceAuto(polygon)})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveEditTarget('sowing')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                            activeEditTarget === 'sowing'
                                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <ShieldCheck size={13} className="text-emerald-300" />
                        <span>2. DDJJ Siembra Geodésica ({formatSurfaceAuto(sowingPoly)})</span>
                    </button>
                </div>
            )}

            {/* 3. MAPA LEAFLET CON TILE LAYER DE ULTRA-APROXIMACIÓN (MAX ZOOM 22) */}
            <div className="flex-1 w-full h-full relative" style={{ minHeight: minH }}>
                {/* Leyenda Inferior Izquierda */}
                <div className="absolute bottom-4 left-4 z-[900] pointer-events-none flex flex-wrap items-center gap-2">
                    {referencePolygon && referencePolygon.length > 2 && (
                        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-2 shadow-2xl">
                            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-amber-400 shrink-0" />
                            <span>{referenceLabel}</span>
                        </div>
                    )}
                    {polygon && polygon.length > 2 && (
                        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-2 shadow-2xl">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-white shrink-0" />
                            <span>{polygonShortLabel || polygonLabel} · Perímetro: {calculatePerimeterMeters(polygon)} m</span>
                        </div>
                    )}
                </div>

                <MapContainer 
                    center={[center.lat, center.lng]} 
                    zoom={19}
                    maxZoom={22}
                    zoomControl={false}
                    style={{ height: "100%", minHeight: minH, width: "100%" }}
                    scrollWheelZoom={true}
                >
                    <ZoomControl position="bottomright" />
                    <MapResizer />

                    {/* 1. Capa Satelital Esri World Imagery + Etiquetas Híbridas (Escalado nativo 19 -> 22) */}
                    {activeLayer === 'esri_sat' && (
                        <>
                            <TileLayer 
                                attribution='Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics' 
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                                maxNativeZoom={19}
                                maxZoom={22}
                            />
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                                maxNativeZoom={19}
                                maxZoom={22}
                                opacity={0.75}
                            />
                        </>
                    )}

                    {/* 2. Capa Google Híbrida de Alta Resolución (Escalado nativo 20 -> 22) */}
                    {activeLayer === 'google_hybrid' && (
                        <TileLayer 
                            attribution='&copy; Google Satellite Imagery' 
                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                            maxNativeZoom={20}
                            maxZoom={22}
                        />
                    )}

                    {/* 3. Capa OpenTopoMap Terreno */}
                    {activeLayer === 'terrain' && (
                        <TileLayer 
                            attribution='&copy; OpenTopoMap contributors' 
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                            maxNativeZoom={17}
                            maxZoom={22}
                        />
                    )}

                    {/* 4. Capa OpenStreetMap Calles */}
                    {activeLayer === 'street' && (
                        <TileLayer 
                            attribution='&copy; OpenStreetMap contributors' 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            maxNativeZoom={19}
                            maxZoom={22}
                        />
                    )}

                    {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                    <MapRecenter 
                        center={center} 
                        polygon={sowingPoly.length > 2 ? sowingPoly : (polygon.length > 2 ? polygon : undefined)} 
                        extraPolygons={extraPolygons}
                        referencePolygon={referencePolygon}
                        fitTrigger={fitTrigger}
                        fitMode={fitMode}
                    />

                    {/* PERÍMETRO DE REFERENCIA DEL CAMPO PADRE */}
                    {referencePolygon && referencePolygon.length > 2 && (
                        <Polygon 
                            positions={referencePolygon.map(p => [p.lat, p.lng])} 
                            interactive={false}
                            pathOptions={{ 
                                color: '#f59e0b', 
                                fillColor: '#f59e0b', 
                                fillOpacity: 0.03, 
                                weight: 2.2, 
                                dashArray: '6, 8' 
                            }} 
                        />
                    )}

                    {/* PARCELAS VECINAS / HERMANAS DENTRO DEL MISMO PREDIO */}
                    {extraPolygons.map(layer => {
                        if (!layer.polygon || layer.polygon.length < 2) return null;
                        const isHighlighted = Boolean(layer.isCurrent);
                        const displayTag = layer.shortLabel || layer.label;
                        return (
                            <Polygon 
                                key={layer.id} 
                                positions={layer.polygon} 
                                eventHandlers={
                                    onExtraPolygonClick
                                        ? {
                                              click: () => onExtraPolygonClick(layer.id)
                                          }
                                        : undefined
                                }
                                pathOptions={{ 
                                    color: isHighlighted ? '#34d399' : (layer.color || '#a855f7'), 
                                    fillColor: layer.color || '#c084fc', 
                                    fillOpacity: isHighlighted ? 0.48 : 0.32, 
                                    weight: isHighlighted ? 3.5 : 2 
                                }}
                            >
                                {showLabels && displayTag && (
                                    <Tooltip 
                                        permanent 
                                        direction="center" 
                                        className={isHighlighted ? 'plot-label-active' : 'plot-label-sibling'}
                                    >
                                        <div className="text-center leading-tight">
                                            <div>{displayTag}</div>
                                            {layer.subLabel && (
                                                <div className="text-[8.5px] opacity-85 font-normal">{layer.subLabel}</div>
                                            )}
                                        </div>
                                    </Tooltip>
                                )}
                                {!showLabels && layer.label && (
                                    <Tooltip sticky direction="top">
                                        <span className="font-mono font-bold text-xs uppercase">{layer.label}</span>
                                    </Tooltip>
                                )}
                            </Polygon>
                        );
                    })}

                    {/* NIVEL 1: POLÍGONO PRINCIPAL DE LA PARCELA ACTIVA */}
                    {polygon.length > 1 && (
                        <Polygon 
                            positions={polygon} 
                            pathOptions={{ 
                                color: '#10b981', 
                                fillColor: '#10b981', 
                                fillOpacity: 0.35, 
                                weight: 3.5 
                            }}
                        >
                            {showLabels ? (
                                <Tooltip permanent direction="top" offset={[0, -6]} className="plot-label-active">
                                    <div className="text-center leading-tight">
                                        <div>{polygonShortLabel || polygonLabel}</div>
                                        {polygonSubLabel && (
                                            <div className="text-[9px] text-emerald-200 font-normal mt-0.5">
                                                {polygonSubLabel}
                                            </div>
                                        )}
                                    </div>
                                </Tooltip>
                            ) : (
                                <Tooltip direction="top" offset={[0, -10]} opacity={0.95} sticky>
                                    <span className="font-mono font-bold text-[10px] uppercase text-emerald-950 bg-emerald-200 px-2 py-0.5 rounded shadow block">
                                        {polygonLabel} ({formatSurfaceAuto(polygon)})
                                    </span>
                                </Tooltip>
                            )}
                        </Polygon>
                    )}

                    {/* COTAS EN METROS DE CADA LADO DEL POLÍGONO ACTIVO */}
                    {activeEdgeMeasurements.map(edge => (
                        <Marker
                            key={edge.id}
                            position={[edge.mid.lat, edge.mid.lng]}
                            interactive={false}
                            icon={L.divIcon({
                                className: 'edge-meter-label',
                                html: `<div style="background:rgba(15,23,42,0.88);color:#38bdf8;border:1px solid rgba(56,189,248,0.5);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:9px;font-weight:800;white-space:nowrap;transform:translate(-50%,-50%);box-shadow:0 1px 4px rgba(0,0,0,0.6);">${edge.distFormatted}</div>`,
                                iconSize: [0, 0]
                            })}
                        />
                    ))}

                    {/* NIVEL 2: Polígono Geodésico de Siembra Declarada DDJJ */}
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
                            <Tooltip permanent={showLabels} direction="bottom" offset={[0, 10]} opacity={0.95} sticky={!showLabels}>
                                <span className="font-mono font-black text-[10px] uppercase text-emerald-950 bg-emerald-300 px-2.5 py-0.5 rounded shadow border border-emerald-400 block">
                                    📜 DDJJ Siembra: {formatSurfaceAuto(sowingPoly)}
                                </span>
                            </Tooltip>
                        </Polygon>
                    )}

                    {/* Marcadores SVG de vértices */}
                    {readOnly && polygon.map((pos, idx) => (
                        <Marker
                            key={`ro-vertex-${idx}`}
                            position={[pos.lat, pos.lng]}
                            icon={readOnlyVertexIcon}
                        >
                            <Tooltip direction="top" offset={[0, -6]}>
                                <span className="font-mono text-[10px] font-bold">
                                    V{idx + 1}: {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                                </span>
                            </Tooltip>
                        </Marker>
                    ))}

                    {activeEditTarget === 'general' && !readOnly && polygon.map((pos, idx) => ( 
                        <Marker 
                            key={`gen-marker-${idx}`} 
                            position={[pos.lat, pos.lng]} 
                            icon={generalVertexIcon}
                        >
                            <Tooltip direction="top" offset={[0, -6]}>
                                <span className="font-mono text-[10px] font-bold">
                                    V{idx + 1}: {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                                </span>
                            </Tooltip>
                        </Marker>
                    ))}

                    {activeEditTarget === 'sowing' && !readOnly && sowingPoly.map((pos, idx) => ( 
                        <Marker 
                            key={`sow-marker-${idx}`} 
                            position={[pos.lat, pos.lng]} 
                            icon={sowingVertexIcon}
                        /> 
                    ))}
                    
                    {/* Pin de centroide con etiqueta permanente cuando no hay polígono trazado aún */}
                    {polygon.length === 0 && sowingPoly.length === 0 && center.lat !== 0 && ( 
                        <Marker position={[center.lat, center.lng]} icon={centerPinIcon}>
                            {showLabels && polygonLabel && (
                                <Tooltip permanent direction="top" offset={[0, -28]} className="plot-label-active">
                                    <span>{polygonShortLabel || polygonLabel}</span>
                                </Tooltip>
                            )}
                        </Marker>
                    )}
                </MapContainer>
            </div>
            
            {/* Indicador de ayuda al usuario en la base del mapa en modo edición */}
            {!readOnly && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-4 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider pointer-events-none flex items-center shadow-2xl border border-white/20 backdrop-blur-md">
                    <MousePointer size={12} className="mr-2 animate-pulse text-emerald-400"/> 
                    <span>
                        {enableSowingLayer && activeEditTarget === 'sowing' 
                            ? 'Haz clic en el mapa satelital para trazar el polígono de DDJJ de Siembra' 
                            : 'Haz clic en el mapa satelital para trazar los vértices de la parcela'}
                    </span>
                </div>
            )}
        </div>
    );
}
