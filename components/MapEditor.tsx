
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Trash2, MapPin, MousePointer, Maximize } from 'lucide-react';
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

interface MapEditorProps {
    initialPolygon?: { lat: number, lng: number }[];
    initialCenter?: { lat: number, lng: number };
    referencePolygon?: { lat: number, lng: number }[]; 
    onPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => void;
    readOnly?: boolean;
    height?: string;
    key?: string | number;
}

// FIX FINAL: Componente que reacciona a cualquier cambio de tamaño del contenedor del mapa
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
        
        // Ejecución inmediata y retardada para mayor seguridad
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
    useMapEvents({
        click: onAddPoint,
    });
    return null;
};

const MapRecenter = ({ center }: { center: { lat: number, lng: number } }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat !== 0 && center.lng !== 0) {
            map.setView([center.lat, center.lng], map.getZoom() || 15);
        }
    }, [center, map]);
    return null;
};

export default function MapEditor({ initialPolygon = [], initialCenter, referencePolygon = [], onPolygonChange, readOnly = false, height = "400px" }: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number, lng: number }[]>(initialPolygon);
    
    const [center, setCenter] = useState<{ lat: number, lng: number }>(() => {
        if (initialCenter && initialCenter.lat !== 0) return initialCenter;
        if (initialPolygon && initialPolygon.length > 0) return initialPolygon[0];
        if (referencePolygon && referencePolygon.length > 0) return referencePolygon[0];
        return { lat: -34.6037, lng: -58.3816 };
    });

    useEffect(() => {
        if (initialCenter && initialCenter.lat !== 0) setCenter(initialCenter);
    }, [initialCenter]);

    useEffect(() => {
        if (initialPolygon) {
            setPolygon(initialPolygon);
        }
    }, [initialPolygon]);

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
        const newPoly = [...polygon, { lat: e.latlng.lat, lng: e.latlng.lng }];
        setPolygon(newPoly);
        if (onPolygonChange) {
            onPolygonChange(newPoly, calculateAreaHa(newPoly), calculateCentroid(newPoly), 0);
        }
    };

    return (
        <div className="relative w-full rounded-2xl overflow-hidden border border-gray-300 dark:border-slate-800 shadow-inner z-0 bg-slate-100" style={{ height, minHeight: '300px' }}>
            {!readOnly && (
                <div className="absolute top-2 right-2 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border dark:border-slate-700">
                    <button onClick={() => { setPolygon([]); if(onPolygonChange) onPolygonChange([], 0, center, 0); }} className="flex items-center text-[10px] text-red-600 font-black uppercase tracking-widest bg-red-50 dark:bg-red-900/20 p-2 rounded-lg hover:bg-red-100 transition-colors" type="button">
                        <Trash2 size={12} className="mr-1"/> Limpiar
                    </button>
                </div>
            )}

            <MapContainer 
                center={[center.lat, center.lng]} 
                zoom={15} 
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={!readOnly}
            >
                <MapResizer />
                <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                <MapRecenter center={center} />

                {referencePolygon.length > 2 && (
                    <Polygon positions={referencePolygon} pathOptions={{ color: '#ef4444', fillColor: 'transparent', weight: 2, dashArray: '5, 10' }} />
                )}

                {polygon.length > 1 && !readOnly && (
                    <Polygon positions={polygon} pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.3, weight: 3 }} />
                )}

                {polygon.length > 0 && polygon.map((pos, idx) => ( 
                    <Marker key={`marker-${idx}`} position={[pos.lat, pos.lng]} interactive={!readOnly} /> 
                ))}
                
                {readOnly && polygon.length === 0 && center.lat !== 0 && ( 
                    <Marker position={[center.lat, center.lng]} /> 
                )}
            </MapContainer>
            
            {!readOnly && polygon.length === 0 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] pointer-events-none flex items-center shadow-2xl border border-white/20 backdrop-blur-md">
                    <MousePointer size={12} className="mr-2 animate-pulse text-hemp-400"/> Haz clic para marcar la ubicación
                </div>
            )}
        </div>
    );
}
