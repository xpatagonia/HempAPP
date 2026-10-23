import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap, Tooltip, ZoomControl } from 'react-leaflet';
import {
    Trash2, MousePointer, Satellite, Mountain, Navigation, ShieldCheck, Globe, Target,
    Tag, Maximize2, Ruler, Layers, CheckSquare, Square, Download, Camera, FileSpreadsheet,
    FileCode, Eye, ExternalLink, X, ChevronDown, Search
} from 'lucide-react';
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
type FitModeType = 'plot' | 'selected' | 'block' | 'field';
type LabelDisplayMode = 'selected' | 'all' | 'none';

export interface ExtraPolygonItem {
    id: string;
    polygon: { lat: number; lng: number }[];
    label?: string;
    shortLabel?: string;
    subLabel?: string;
    color?: string;
    isCurrent?: boolean;
    varietyName?: string;
    blockName?: string;
    surfaceText?: string;
    soilType?: string;
    irrigationType?: string;
    sowingDate?: string;
    samplingResponsible?: string;
    technicalResponsible?: string;
}

interface MapEditorProps {
    activePlotId?: string;
    initialPolygon?: { lat: number; lng: number }[];
    initialCenter?: { lat: number; lng: number };
    referencePolygon?: { lat: number; lng: number }[];
    referenceLabel?: string;
    polygonLabel?: string;
    polygonShortLabel?: string;
    polygonSubLabel?: string;
    extraPolygons?: ExtraPolygonItem[];
    onExtraPolygonClick?: (id: string) => void;
    selectedPolygonIds?: string[];
    onSelectedPolygonIdsChange?: (ids: string[]) => void;
    onPolygonChange?: (
        polygon: { lat: number; lng: number }[],
        areaHa: number,
        center: { lat: number; lng: number },
        perimeterM: number
    ) => void;
    // Capa Geodésica de Declaración Jurada (DDJJ) de Siembra
    sowingPolygon?: { lat: number; lng: number }[];
    onSowingPolygonChange?: (
        polygon: { lat: number; lng: number }[],
        areaHa: number,
        center: { lat: number; lng: number },
        perimeterM: number
    ) => void;
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

// Centrador inteligente con soporte de aproximación de alta precisión (Parcela / Seleccionadas / Bloque / Predio)
const MapRecenter = ({
    center,
    polygon,
    extraPolygons,
    selectedPolygons,
    referencePolygon,
    fitTrigger,
    fitMode
}: {
    center: { lat: number; lng: number };
    polygon?: { lat: number; lng: number }[];
    extraPolygons?: ExtraPolygonItem[];
    selectedPolygons?: ExtraPolygonItem[];
    referencePolygon?: { lat: number; lng: number }[];
    fitTrigger: number;
    fitMode: FitModeType;
}) => {
    const map = useMap();
    const hasAutoFittedRef = useRef(false);

    const fitToData = useCallback(
        (mode: FitModeType) => {
            try {
                // Modo SELECCIONADAS: encuadra únicamente las parcelas tildadas en el selector
                if (mode === 'selected' && selectedPolygons && selectedPolygons.length > 0) {
                    const selPts: [number, number][] = [];
                    selectedPolygons.forEach(sp => {
                        (sp.polygon || []).forEach(p => {
                            if (p && !isNaN(p.lat) && !isNaN(p.lng)) selPts.push([p.lat, p.lng]);
                        });
                    });
                    if (selPts.length >= 3) {
                        const bounds = L.latLngBounds(selPts);
                        if (bounds.isValid()) {
                            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 20 });
                            return true;
                        }
                    }
                }

                // Modo BLOQUE: encuadra la parcela activa + parcelas vecinas del mismo ensayo
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

                // Modo PREDIO: encuadra el límite general del campo padre
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

                // Modo PARCELA (alta aproximación sobre la parcela activa)
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
        },
        [center, polygon, extraPolygons, selectedPolygons, referencePolygon, map]
    );

    useEffect(() => {
        if (!hasAutoFittedRef.current) {
            const timer = setTimeout(() => {
                const fitted = fitToData(fitMode);
                if (fitted) hasAutoFittedRef.current = true;
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [fitToData, fitMode]);

    useEffect(() => {
        if (fitTrigger > 0) {
            fitToData(fitMode);
        }
    }, [fitTrigger, fitMode, fitToData]);

    return null;
};

export default function MapEditor({
    activePlotId = 'active-main',
    initialPolygon = [],
    initialCenter,
    referencePolygon = [],
    referenceLabel = 'Perímetro Campo Padre',
    polygonLabel = 'Perímetro Parcela',
    polygonShortLabel,
    polygonSubLabel,
    extraPolygons = [],
    onExtraPolygonClick,
    selectedPolygonIds,
    onSelectedPolygonIdsChange,
    onPolygonChange,
    sowingPolygon = [],
    onSowingPolygonChange,
    enableSowingLayer = false,
    initialFitMode,
    readOnly = false,
    height = '480px'
}: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number; lng: number }[]>(initialPolygon);
    const [sowingPoly, setSowingPoly] = useState<{ lat: number; lng: number }[]>(sowingPolygon);

    const [activeLayer, setActiveLayer] = useState<MapLayerType>('google_hybrid');
    // Por defecto 'selected': SOLO muestra etiqueta permanente en la parcela activa o en las seleccionadas
    // evitando que las 12-15 etiquetas se superpongan y tapen los polígonos en el mapa.
    const [labelMode, setLabelMode] = useState<LabelDisplayMode>('selected');
    const [showMeasurements, setShowMeasurements] = useState<boolean>(readOnly);
    const [fitMode, setFitMode] = useState<FitModeType>(() => {
        if (initialFitMode) return initialFitMode;
        if (readOnly && extraPolygons && extraPolygons.length > 0) return 'block';
        return 'plot';
    });

    const [activeEditTarget, setActiveEditTarget] = useState<'general' | 'sowing'>('general');
    const [fitTrigger, setFitTrigger] = useState(0);

    // Estado de selección múltiple de parcelas en el mapa (Select / Checkboxes)
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([activePlotId]);
    const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);
    const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
    const [selectorSearch, setSelectorSearch] = useState('');
    const [inspectedItem, setInspectedItem] = useState<ExtraPolygonItem | null>(null);

    useEffect(() => {
        setInternalSelectedIds(prev => (prev.length === 0 ? [activePlotId] : prev.includes(activePlotId) ? prev : [activePlotId]));
    }, [activePlotId]);

    const effectiveSelectedIds = selectedPolygonIds !== undefined ? selectedPolygonIds : internalSelectedIds;

    const updateSelectedIds = useCallback(
        (nextIds: string[]) => {
            if (onSelectedPolygonIdsChange) {
                onSelectedPolygonIdsChange(nextIds);
            } else {
                setInternalSelectedIds(nextIds);
            }
        },
        [onSelectedPolygonIdsChange]
    );

    const [center, setCenter] = useState<{ lat: number; lng: number }>(() => {
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

    const calculateAreaM2 = useCallback((coords: { lat: number; lng: number }[]) => {
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

    const calculateAreaHa = useCallback(
        (coords: { lat: number; lng: number }[]) => {
            return calculateAreaM2(coords) / 10000;
        },
        [calculateAreaM2]
    );

    const formatSurfaceAuto = useCallback(
        (coords: { lat: number; lng: number }[]) => {
            const m2 = calculateAreaM2(coords);
            if (m2 < 1000) return `${m2.toFixed(1)} m²`;
            return `${(m2 / 10000).toFixed(2)} ha`;
        },
        [calculateAreaM2]
    );

    const calculateCentroid = useCallback(
        (coords: { lat: number; lng: number }[]) => {
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
        },
        [center]
    );

    // Lista unificada de todas las parcelas presentes en el mapa (activa + hermanas)
    const allAvailablePlotItems = useMemo<ExtraPolygonItem[]>(() => {
        const list: ExtraPolygonItem[] = [];
        if (polygon && polygon.length >= 3) {
            list.push({
                id: activePlotId,
                polygon,
                label: polygonLabel,
                shortLabel: polygonShortLabel || polygonLabel,
                subLabel: polygonSubLabel,
                color: '#10b981',
                isCurrent: true
            });
        }
        extraPolygons.forEach(ep => {
            if (ep.id !== activePlotId && ep.polygon && ep.polygon.length >= 3) {
                list.push(ep);
            }
        });
        return list;
    }, [activePlotId, polygon, polygonLabel, polygonShortLabel, polygonSubLabel, extraPolygons]);

    const selectedPlotItems = useMemo(
        () => allAvailablePlotItems.filter(item => effectiveSelectedIds.includes(item.id)),
        [allAvailablePlotItems, effectiveSelectedIds]
    );

    const filteredSelectorItems = useMemo(() => {
        if (!selectorSearch.trim()) return allAvailablePlotItems;
        const q = selectorSearch.toLowerCase();
        return allAvailablePlotItems.filter(
            item =>
                (item.shortLabel || '').toLowerCase().includes(q) ||
                (item.label || '').toLowerCase().includes(q) ||
                (item.subLabel || '').toLowerCase().includes(q)
        );
    }, [allAvailablePlotItems, selectorSearch]);

    const togglePlotSelection = (id: string) => {
        if (effectiveSelectedIds.includes(id)) {
            updateSelectedIds(effectiveSelectedIds.filter(x => x !== id));
        } else {
            updateSelectedIds([...effectiveSelectedIds, id]);
        }
    };

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

    const cycleLabelMode = () => {
        setLabelMode(prev => (prev === 'selected' ? 'all' : prev === 'all' ? 'none' : 'selected'));
    };

    // =========================================================================
    // HERRAMIENTAS DE CAPTURA VISUAL Y DESCARGA GEODÉSICA (PNG, KML, GEOJSON, CSV)
    // =========================================================================
    const itemsToExport = useMemo(
        () => (selectedPlotItems.length > 0 ? selectedPlotItems : allAvailablePlotItems),
        [selectedPlotItems, allAvailablePlotItems]
    );

    const handleDownloadCSV = () => {
        const rows: string[] = [
            ['Parcela', 'Detalle_Cultivar', 'Superficie', 'Perimetro_m', 'Centroide_Lat', 'Centroide_Lng', 'Cant_Vertices', 'Coordenadas_Vertices_WGS84'].join(',')
        ];
        itemsToExport.forEach(item => {
            const c = calculateCentroid(item.polygon);
            const perim = calculatePerimeterMeters(item.polygon);
            const surf = item.surfaceText || formatSurfaceAuto(item.polygon);
            const vertsStr = item.polygon.map((pt, i) => `V${i + 1}(${pt.lat.toFixed(6)};${pt.lng.toFixed(6)})`).join(' | ');
            rows.push(
                [
                    `"${(item.shortLabel || item.label || item.id).replace(/"/g, '""')}"`,
                    `"${(item.subLabel || '').replace(/"/g, '""')}"`,
                    `"${surf}"`,
                    perim,
                    c.lat.toFixed(6),
                    c.lng.toFixed(6),
                    item.polygon.length,
                    `"${vertsStr}"`
                ].join(',')
            );
        });
        const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Geodesia_Parcelas_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloadDropdownOpen(false);
    };

    const handleDownloadGeoJSON = () => {
        const features = itemsToExport.map(item => {
            const closedCoords = [...item.polygon];
            if (
                closedCoords.length > 2 &&
                (closedCoords[0].lat !== closedCoords[closedCoords.length - 1].lat ||
                    closedCoords[0].lng !== closedCoords[closedCoords.length - 1].lng)
            ) {
                closedCoords.push(closedCoords[0]);
            }
            return {
                type: 'Feature',
                properties: {
                    id: item.id,
                    name: item.shortLabel || item.label,
                    detail: item.subLabel || '',
                    surface: item.surfaceText || formatSurfaceAuto(item.polygon),
                    perimeterMeters: calculatePerimeterMeters(item.polygon),
                    color: item.color || '#10b981'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [closedCoords.map(pt => [pt.lng, pt.lat])]
                }
            };
        });

        const geojson = {
            type: 'FeatureCollection',
            name: referenceLabel || 'Geodesia_Parcelas_HempC',
            features
        };

        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Poligonos_Parcelas_${new Date().toISOString().split('T')[0]}.geojson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloadDropdownOpen(false);
    };

    const handleDownloadKML = () => {
        const placemarks = itemsToExport
            .map(item => {
                const closedCoords = [...item.polygon];
                if (
                    closedCoords.length > 2 &&
                    (closedCoords[0].lat !== closedCoords[closedCoords.length - 1].lat ||
                        closedCoords[0].lng !== closedCoords[closedCoords.length - 1].lng)
                ) {
                    closedCoords.push(closedCoords[0]);
                }
                const coordStr = closedCoords.map(pt => `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)},0`).join(' ');
                return `
    <Placemark>
      <name>${(item.shortLabel || item.label || 'Parcela').replace(/[<>&]/g, '')}</name>
      <description>${(item.subLabel || '').replace(/[<>&]/g, '')} | Perímetro: ${calculatePerimeterMeters(item.polygon)} m</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
            })
            .join('\n');

        const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${(referenceLabel || 'Geodesia Parcelas').replace(/[<>&]/g, '')}</name>
    ${placemarks}
  </Document>
</kml>`;

        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Geodesia_Parcelas_${new Date().toISOString().split('T')[0]}.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloadDropdownOpen(false);
    };

    // Generador de Ficha / Captura Cartográfica en PNG de Alta Resolución (1600x1050)
    const handleCaptureCartographicPNG = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1050;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fondo oscuro técnico satelital
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grilla geodésica sutil
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 40; x < 1020; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 90);
            ctx.lineTo(x, 980);
            ctx.stroke();
        }
        for (let y = 90; y < 980; y += 60) {
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(1020, y);
            ctx.stroke();
        }

        // Encabezado oficial
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1600, 76);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 76);
        ctx.lineTo(1600, 76);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('REPORTE CARTOGRÁFICO & GEODESIA SATELITAL WGS84', 36, 34);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px monospace';
        ctx.fillText(
            `${referenceLabel} • ${itemsToExport.length} Parcela(s) Seleccionada(s) • Emitido: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
            36,
            58
        );

        // Marco del visor plano geodésico izquierdo
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(36, 96, 980, 880);

        // Calcular bounding box de los polígonos seleccionados
        const allPts: { lat: number; lng: number }[] = [];
        itemsToExport.forEach(it => {
            it.polygon.forEach(p => allPts.push(p));
        });
        if (allPts.length === 0 && referencePolygon.length > 0) {
            referencePolygon.forEach(p => allPts.push(p));
        }

        if (allPts.length >= 3) {
            const minLat = Math.min(...allPts.map(p => p.lat));
            const maxLat = Math.max(...allPts.map(p => p.lat));
            const minLng = Math.min(...allPts.map(p => p.lng));
            const maxLng = Math.max(...allPts.map(p => p.lng));

            const dLat = Math.max(maxLat - minLat, 0.00015);
            const dLng = Math.max(maxLng - minLng, 0.00015);

            const mapX = 110;
            const mapY = 160;
            const mapW = 830;
            const mapH = 740;

            const project = (pt: { lat: number; lng: number }) => {
                const nx = (pt.lng - minLng) / dLng;
                const ny = 1 - (pt.lat - minLat) / dLat;
                return {
                    x: mapX + nx * mapW,
                    y: mapY + ny * mapH
                };
            };

            // Dibujar cada polígono seleccionado con etiquetas escalonadas sin superposición
            itemsToExport.forEach((it, idx) => {
                if (!it.polygon || it.polygon.length < 3) return;
                ctx.beginPath();
                it.polygon.forEach((pt, i) => {
                    const pos = project(pt);
                    if (i === 0) ctx.moveTo(pos.x, pos.y);
                    else ctx.lineTo(pos.x, pos.y);
                });
                ctx.closePath();
                ctx.fillStyle = (it.color || '#10b981') + '44';
                ctx.fill();
                ctx.strokeStyle = it.color || '#10b981';
                ctx.lineWidth = it.id === activePlotId ? 3.5 : 2.2;
                ctx.stroke();

                // Vértices
                it.polygon.forEach(pt => {
                    const pos = project(pt);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Centroide + línea guía hacia etiqueta sin colisión
                const cGps = calculateCentroid(it.polygon);
                const cPos = project(cGps);
                const offsetY = (idx % 3 - 1) * 22;
                ctx.fillStyle = '#0f172a';
                const tagText = `${it.shortLabel || it.label}`;
                ctx.font = 'bold 12px monospace';
                const tw = ctx.measureText(tagText).width + 16;
                ctx.fillRect(cPos.x - tw / 2, cPos.y + offsetY - 11, tw, 22);
                ctx.strokeStyle = it.color || '#10b981';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cPos.x - tw / 2, cPos.y + offsetY - 11, tw, 22);
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(tagText, cPos.x - tw / 2 + 8, cPos.y + offsetY + 4);
            });

            // Escala y Rosa de los Vientos
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('▲ NORTE GEODÉSICO (WGS84)', 60, 130);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px monospace';
            ctx.fillText(
                `BBOX: [${minLat.toFixed(6)}°, ${minLng.toFixed(6)}°] a [${maxLat.toFixed(6)}°, ${maxLng.toFixed(6)}°]`,
                60,
                952
            );
        }

        // Panel derecho: Tabla Técnica de Parcelas y Vértices
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1040, 96, 524, 880);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(1040, 96, 524, 880);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('FICHA TÉCNICA DE PARCELAS SELECCIONADAS', 1060, 130);

        let curY = 165;
        itemsToExport.slice(0, 12).forEach((it, idx) => {
            const c = calculateCentroid(it.polygon);
            const perim = calculatePerimeterMeters(it.polygon);
            const surf = it.surfaceText || formatSurfaceAuto(it.polygon);

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(1060, curY - 16, 484, 62);
            ctx.fillStyle = it.color || '#10b981';
            ctx.fillRect(1060, curY - 16, 5, 62);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`${idx + 1}. ${it.shortLabel || it.label} (${surf} • Perím: ${perim}m)`, 1076, curY);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px monospace';
            ctx.fillText(`${it.subLabel || 'Polígono Geodésico Activo'}`, 1076, curY + 18);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '11px monospace';
            ctx.fillText(`Centroide: ${c.lat.toFixed(6)}°, ${c.lng.toFixed(6)}° (${it.polygon.length} vértices)`, 1076, curY + 35);

            curY += 68;
        });

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Captura_Geodesica_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsDownloadDropdownOpen(false);
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
                    background: rgba(15, 23, 42, 0.90) !important;
                    border: 1px solid rgba(56, 189, 248, 0.55) !important;
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

            {/* 1. BARRA SUPERIOR DE CAPAS SATELITALES + SELECTOR MULTI-PARCELA + CAPTURA Y DESCARGA */}
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

                {/* Controles de Aproximación, Selector Multi-Parcela (Select), Etiquetas y Descarga */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/20 pointer-events-auto relative">
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
                            title="Encuadrar todo el bloque de parcelas"
                        >
                            <Layers size={12} />
                            <span>Bloque ({allAvailablePlotItems.length})</span>
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

                    {/* SELECTOR MULTI-PARCELA (SELECT / DESELECT UNA O VARIAS PARCELAS) */}
                    {allAvailablePlotItems.length > 1 && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSelectDropdownOpen(prev => !prev);
                                    setIsDownloadDropdownOpen(false);
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                                    isSelectDropdownOpen || effectiveSelectedIds.length > 1
                                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                        : 'bg-slate-800 text-emerald-300 border-emerald-500/40 hover:bg-slate-700'
                                }`}
                                title="Seleccionar o deseleccionar una o varias parcelas para mostrar su etiqueta sin superposición"
                            >
                                <CheckSquare size={12} />
                                <span>
                                    Select Parcelas ({effectiveSelectedIds.length}/{allAvailablePlotItems.length})
                                </span>
                                <ChevronDown size={11} />
                            </button>

                            {isSelectDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl p-3 z-[1200] text-white space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">
                                            Seleccionar / Deseleccionar Parcelas
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsSelectDropdownOpen(false)}
                                            className="text-slate-400 hover:text-white cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {/* Acciones rápidas de selección */}
                                    <div className="grid grid-cols-3 gap-1.5 text-[9.5px] font-mono font-bold">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateSelectedIds(allAvailablePlotItems.map(i => i.id));
                                                setLabelMode('selected');
                                            }}
                                            className="px-2 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 cursor-pointer"
                                        >
                                            ✓ Todas ({allAvailablePlotItems.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateSelectedIds([activePlotId]);
                                                setLabelMode('selected');
                                            }}
                                            className="px-2 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 cursor-pointer"
                                        >
                                            ◎ Solo Activa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateSelectedIds([])}
                                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                                        >
                                            ✕ Limpiar
                                        </button>
                                    </div>

                                    {/* Buscador interno de parcelas */}
                                    <div className="relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={selectorSearch}
                                            onChange={e => setSelectorSearch(e.target.value)}
                                            placeholder="Filtrar por código o cultivar..."
                                            className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-white outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Lista con checkboxes */}
                                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                                        {filteredSelectorItems.map(item => {
                                            const isChecked = effectiveSelectedIds.includes(item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => togglePlotSelection(item.id)}
                                                    className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono text-[10.5px] flex items-center justify-between gap-2 transition cursor-pointer border ${
                                                        isChecked
                                                            ? 'bg-emerald-950/80 border-emerald-500/50 text-white'
                                                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        {isChecked ? (
                                                            <CheckSquare size={13} className="text-emerald-400 shrink-0" />
                                                        ) : (
                                                            <Square size={13} className="text-slate-600 shrink-0" />
                                                        )}
                                                        <span
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: item.color || '#10b981' }}
                                                        />
                                                        <div className="truncate">
                                                            <span className="font-bold block truncate">
                                                                {item.shortLabel || item.label}
                                                            </span>
                                                            {item.subLabel && (
                                                                <span className="text-[9px] text-slate-400 block truncate">
                                                                    {item.subLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.id === activePlotId && (
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8.5px] font-bold shrink-0">
                                                            ACTIVA
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {effectiveSelectedIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                triggerFitMode('selected');
                                                setIsSelectDropdownOpen(false);
                                            }}
                                            className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                                        >
                                            Encuadrar {effectiveSelectedIds.length} Parcela(s) Seleccionada(s)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* MODO INTELIGENTE DE ETIQUETAS SIN SUPERPOSICIÓN */}
                    <button
                        type="button"
                        onClick={cycleLabelMode}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                            labelMode === 'selected'
                                ? 'bg-emerald-600/90 text-white ring-1 ring-emerald-400'
                                : labelMode === 'all'
                                ? 'bg-amber-600 text-white ring-1 ring-amber-400'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Alternar visualización de etiquetas: Solo Seleccionadas (sin superposición) / Todas / Ocultas (solo clic)"
                    >
                        <Tag size={12} />
                        <span>
                            Etiquetas: {labelMode === 'selected' ? 'Seleccionadas' : labelMode === 'all' ? 'Todas' : 'Clic'}
                        </span>
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

                    {/* MENÚ DE CAPTURA Y DESCARGA DE INFORMACIÓN GEODÉSICA */}
                    {allAvailablePlotItems.length > 0 && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDownloadDropdownOpen(prev => !prev);
                                    setIsSelectDropdownOpen(false);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-sm"
                                title="Capturar lámina cartográfica o descargar coordenadas KML, GeoJSON y CSV de las parcelas seleccionadas"
                            >
                                <Download size={12} />
                                <span className="hidden sm:inline">Capturar / Descargar</span>
                                <ChevronDown size={11} />
                            </button>

                            {isDownloadDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl p-2.5 z-[1200] text-white space-y-1.5 font-mono">
                                    <div className="px-2 py-1 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-[9.5px] font-black uppercase text-indigo-400">
                                            Exportar ({itemsToExport.length} parcela{itemsToExport.length === 1 ? '' : 's'})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsDownloadDropdownOpen(false)}
                                            className="text-slate-400 hover:text-white cursor-pointer"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCaptureCartographicPNG}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-600/30 border border-slate-700 hover:border-emerald-500/50 text-left text-[10.5px] flex items-center gap-2.5 transition cursor-pointer"
                                    >
                                        <Camera size={14} className="text-emerald-400 shrink-0" />
                                        <div>
                                            <span className="font-bold block text-white">Capturar Lámina Cartográfica (PNG)</span>
                                            <span className="text-[9px] text-slate-400 block">Plano escalado HD + tabla de vértices</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadKML}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-sky-600/30 border border-slate-700 hover:border-sky-500/50 text-left text-[10.5px] flex items-center gap-2.5 transition cursor-pointer"
                                    >
                                        <Globe size={14} className="text-sky-400 shrink-0" />
                                        <div>
                                            <span className="font-bold block text-white">Descargar KML (Google Earth)</span>
                                            <span className="text-[9px] text-slate-400 block">Polígonos georreferenciados WGS84</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadGeoJSON}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-left text-[10.5px] flex items-center gap-2.5 transition cursor-pointer"
                                    >
                                        <FileCode size={14} className="text-indigo-400 shrink-0" />
                                        <div>
                                            <span className="font-bold block text-white">Descargar GeoJSON (QGIS / GIS)</span>
                                            <span className="text-[9px] text-slate-400 block">Geometría + atributos agronómicos</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadCSV}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-500/50 text-left text-[10.5px] flex items-center gap-2.5 transition cursor-pointer"
                                    >
                                        <FileSpreadsheet size={14} className="text-amber-400 shrink-0" />
                                        <div>
                                            <span className="font-bold block text-white">Descargar Planilla Vértices (CSV)</span>
                                            <span className="text-[9px] text-slate-400 block">Coordenadas GPS, áreas y perímetros</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!readOnly && (
                        <button
                            onClick={handleClearActiveLayer}
                            className="flex items-center text-[10px] text-rose-300 hover:text-white font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 transition-colors cursor-pointer ml-1"
                            type="button"
                            title={enableSowingLayer && activeEditTarget === 'sowing' ? 'Limpiar Polígono DDJJ Siembra' : 'Limpiar Perímetro'}
                        >
                            <Trash2 size={12} className="mr-1" />
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
                {/* Leyenda Inferior Izquierda + Guía Clic para Inspeccionar */}
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
                            <span>
                                {polygonShortLabel || polygonLabel} · {calculatePerimeterMeters(polygon)} m
                            </span>
                        </div>
                    )}
                    {extraPolygons.length > 0 && (
                        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-2xl">
                            <Eye size={12} />
                            <span>Clic en cualquier polígono para inspeccionar sin superposición</span>
                        </div>
                    )}
                </div>

                {/* TARJETA FLOTANTE DE INSPECCIÓN AL HACER CLIC EN UNA PARCELA DEL MAPA */}
                {inspectedItem && (
                    <div className="absolute bottom-14 right-4 z-[1000] w-80 bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3.5 text-white shadow-2xl font-mono space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full shrink-0 border border-white"
                                    style={{ backgroundColor: inspectedItem.color || '#10b981' }}
                                />
                                <div>
                                    <span className="text-[9px] uppercase text-emerald-400 font-bold block">
                                        Inspección Geodésica de Parcela
                                    </span>
                                    <h4 className="text-xs font-black text-white">
                                        {inspectedItem.shortLabel || inspectedItem.label}
                                    </h4>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectedItem(null)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70">
                                <span className="text-[8.5px] text-slate-400 uppercase block">Superficie / Perím.</span>
                                <strong className="text-emerald-300">
                                    {inspectedItem.surfaceText || formatSurfaceAuto(inspectedItem.polygon)} ·{' '}
                                    {calculatePerimeterMeters(inspectedItem.polygon)}m
                                </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/70">
                                <span className="text-[8.5px] text-slate-400 uppercase block">Vértices GPS</span>
                                <strong className="text-sky-300">{inspectedItem.polygon.length} puntos WGS84</strong>
                            </div>
                        </div>

                        {inspectedItem.subLabel && (
                            <div className="text-[10px] text-slate-300 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                {inspectedItem.subLabel}
                            </div>
                        )}

                        <div className="text-[9.5px] text-slate-400 flex items-center justify-between">
                            <span>
                                Centroide: {calculateCentroid(inspectedItem.polygon).lat.toFixed(6)}°,{' '}
                                {calculateCentroid(inspectedItem.polygon).lng.toFixed(6)}°
                            </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => togglePlotSelection(inspectedItem.id)}
                                className={`flex-1 py-1.5 px-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 border cursor-pointer transition ${
                                    effectiveSelectedIds.includes(inspectedItem.id)
                                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                                }`}
                            >
                                <CheckSquare size={12} />
                                <span>
                                    {effectiveSelectedIds.includes(inspectedItem.id) ? 'Deseleccionar' : 'Fijar Etiqueta'}
                                </span>
                            </button>

                            {onExtraPolygonClick && inspectedItem.id !== activePlotId && (
                                <button
                                    type="button"
                                    onClick={() => onExtraPolygonClick(inspectedItem.id)}
                                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                    <span>Abrir Ficha</span>
                                    <ExternalLink size={11} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={19}
                    maxZoom={22}
                    zoomControl={false}
                    style={{ height: '100%', minHeight: minH, width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <ZoomControl position="bottomright" />
                    <MapResizer />

                    {activeLayer === 'esri_sat' && (
                        <>
                            <TileLayer
                                attribution="Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics"
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

                    {activeLayer === 'google_hybrid' && (
                        <TileLayer
                            attribution="&copy; Google Satellite Imagery"
                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            maxNativeZoom={20}
                            maxZoom={22}
                        />
                    )}

                    {activeLayer === 'terrain' && (
                        <TileLayer
                            attribution="&copy; OpenTopoMap contributors"
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                            maxNativeZoom={17}
                            maxZoom={22}
                        />
                    )}

                    {activeLayer === 'street' && (
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxNativeZoom={19}
                            maxZoom={22}
                        />
                    )}

                    {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                    <MapRecenter
                        center={center}
                        polygon={sowingPoly.length > 2 ? sowingPoly : polygon.length > 2 ? polygon : undefined}
                        extraPolygons={extraPolygons}
                        selectedPolygons={selectedPlotItems}
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
                        const isSelected = effectiveSelectedIds.includes(layer.id);
                        const isInspected = inspectedItem?.id === layer.id;
                        const showPermanentTag =
                            labelMode === 'all' || (labelMode === 'selected' && (isSelected || isInspected));
                        const displayTag = layer.shortLabel || layer.label;

                        return (
                            <Polygon
                                key={layer.id}
                                positions={layer.polygon}
                                eventHandlers={{
                                    click: e => {
                                        L.DomEvent.stopPropagation(e);
                                        setInspectedItem(layer);
                                    }
                                }}
                                pathOptions={{
                                    color: isInspected
                                        ? '#38bdf8'
                                        : isSelected
                                        ? '#34d399'
                                        : layer.color || '#a855f7',
                                    fillColor: layer.color || '#c084fc',
                                    fillOpacity: isInspected ? 0.55 : isSelected ? 0.42 : 0.22,
                                    weight: isInspected ? 3.5 : isSelected ? 3 : 1.8
                                }}
                            >
                                {showPermanentTag && displayTag ? (
                                    <Tooltip
                                        permanent
                                        direction="top"
                                        offset={[0, -4]}
                                        className={isInspected ? 'plot-label-active' : 'plot-label-sibling'}
                                    >
                                        <div className="text-center leading-tight">
                                            <div>{displayTag}</div>
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <Tooltip sticky direction="top" offset={[0, -6]}>
                                        <div className="font-mono text-[10px]">
                                            <strong>{displayTag}</strong>
                                            {layer.subLabel && <div className="text-[9px] opacity-80">{layer.subLabel}</div>}
                                            <div className="text-[8.5px] text-emerald-600 font-bold">
                                                Clic para inspeccionar / seleccionar
                                            </div>
                                        </div>
                                    </Tooltip>
                                )}
                            </Polygon>
                        );
                    })}

                    {/* NIVEL 1: POLÍGONO PRINCIPAL DE LA PARCELA ACTIVA */}
                    {polygon.length > 1 && (
                        <Polygon
                            positions={polygon}
                            eventHandlers={{
                                click: e => {
                                    if (!readOnly) return;
                                    L.DomEvent.stopPropagation(e);
                                    setInspectedItem({
                                        id: activePlotId,
                                        polygon,
                                        label: polygonLabel,
                                        shortLabel: polygonShortLabel || polygonLabel,
                                        subLabel: polygonSubLabel,
                                        color: '#10b981',
                                        isCurrent: true
                                    });
                                }
                            }}
                            pathOptions={{
                                color: '#10b981',
                                fillColor: '#10b981',
                                fillOpacity: effectiveSelectedIds.includes(activePlotId) ? 0.38 : 0.22,
                                weight: 3.5
                            }}
                        >
                            {labelMode === 'all' ||
                            (labelMode === 'selected' && effectiveSelectedIds.includes(activePlotId)) ? (
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
                                        {polygonShortLabel || polygonLabel} ({formatSurfaceAuto(polygon)}) — Clic para inspeccionar
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
                            <Tooltip
                                permanent={labelMode !== 'none'}
                                direction="bottom"
                                offset={[0, 10]}
                                opacity={0.95}
                                sticky={labelMode === 'none'}
                            >
                                <span className="font-mono font-black text-[10px] uppercase text-emerald-950 bg-emerald-300 px-2.5 py-0.5 rounded shadow border border-emerald-400 block">
                                    📜 DDJJ Siembra: {formatSurfaceAuto(sowingPoly)}
                                </span>
                            </Tooltip>
                        </Polygon>
                    )}

                    {/* Marcadores SVG de vértices */}
                    {readOnly &&
                        polygon.map((pos, idx) => (
                            <Marker key={`ro-vertex-${idx}`} position={[pos.lat, pos.lng]} icon={readOnlyVertexIcon}>
                                <Tooltip direction="top" offset={[0, -6]}>
                                    <span className="font-mono text-[10px] font-bold">
                                        V{idx + 1}: {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                                    </span>
                                </Tooltip>
                            </Marker>
                        ))}

                    {activeEditTarget === 'general' &&
                        !readOnly &&
                        polygon.map((pos, idx) => (
                            <Marker key={`gen-marker-${idx}`} position={[pos.lat, pos.lng]} icon={generalVertexIcon}>
                                <Tooltip direction="top" offset={[0, -6]}>
                                    <span className="font-mono text-[10px] font-bold">
                                        V{idx + 1}: {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                                    </span>
                                </Tooltip>
                            </Marker>
                        ))}

                    {activeEditTarget === 'sowing' &&
                        !readOnly &&
                        sowingPoly.map((pos, idx) => (
                            <Marker key={`sow-marker-${idx}`} position={[pos.lat, pos.lng]} icon={sowingVertexIcon} />
                        ))}

                    {/* Pin de centroide con etiqueta permanente cuando no hay polígono trazado aún */}
                    {polygon.length === 0 && sowingPoly.length === 0 && center.lat !== 0 && (
                        <Marker position={[center.lat, center.lng]} icon={centerPinIcon}>
                            {labelMode !== 'none' && polygonLabel && (
                                <Tooltip permanent direction="top" offset={[0, -28]} className="plot-label-active">
                                    <span>{polygonShortLabel || polygonLabel}</span>
                                </Tooltip>
                            )}
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {!readOnly && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-4 py-2 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider pointer-events-none flex items-center shadow-2xl border border-white/20 backdrop-blur-md">
                    <MousePointer size={12} className="mr-2 animate-pulse text-emerald-400" />
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
