
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Trash2, MapPin, MousePointer, Ruler, Route, Layers } from 'lucide-react';
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
    referencePolygon?: { lat: number, lng: number }[]; // Límite del campo padre
    onPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => void;
    readOnly?: boolean;
    height?: string;
}

// Component to handle map clicks
const MapEvents = ({ onAddPoint }: { onAddPoint: (e: L.LeafletMouseEvent) => void }) => {
    useMapEvents({
        click: onAddPoint,
    });
    return null;
};

// Component to center map dynamically
const MapRecenter = ({ center }: { center: { lat: number, lng: number } }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat !== 0 && center.lng !== 0) {
            map.flyTo(center, 18, { duration: 1.5 }); // Zoom más profundo para parcelas
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
            if((!initialCenter || initialCenter.lat === 0) && initialPolygon.length > 0) {
                 setCenter(initialPolygon[0]);
            }
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

    const calculatePerimeterMeters = (coords: { lat: number, lng: number }[]) => {
        if (coords.length < 2) return 0;
        let perimeter = 0;
        const R = 6371000;
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const dLat = toRad(coords[j].lat - coords[i].lat);
            const dLon = toRad(coords[j].lng - coords[i].lng);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(coords[i].lat)) * Math.cos(toRad(coords[j].lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            perimeter += R * c;
        }
        return perimeter;
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
            onPolygonChange(newPoly, calculateAreaHa(newPoly), calculateCentroid(newPoly), calculatePerimeterMeters(newPoly));
        }
    };

    const handleClear = () => {
        setPolygon([]);
        if (onPolygonChange) onPolygonChange([], 0, center, 0);
    };

    return (
        <div className="relative rounded-2xl overflow-hidden border border-gray-300 shadow-inner z-0" style={{ height }}>
            {!readOnly && (
                <div className="absolute top-2 right-2 z-[400] bg-white p-2 rounded-xl shadow-lg flex flex-col gap-2 border">
                    <button onClick={handleClear} className="flex items-center text-[10px] text-red-600 font-black uppercase tracking-widest bg-red-50 p-2 rounded-lg hover:bg-red-100" type="button">
                        <Trash2 size={12} className="mr-1"/> Borrar Polígono
                    </button>
                    <div className="text-[10px] font-black text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200 space-y-1">
                        <div className="flex items-center uppercase tracking-tighter"><Ruler size={10} className="mr-1 text-hemp-600"/> {calculateAreaHa(polygon).toFixed(4)} ha</div>
                        <div className="flex items-center uppercase tracking-tighter"><Layers size={10} className="mr-1 text-blue-600"/> {(calculateAreaHa(polygon) * 10000).toFixed(0)} m²</div>
                    </div>
                </div>
            )}

            <MapContainer center={center} zoom={18} style={{ height: "100%", width: "100%" }}>
                <TileLayer attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                <TileLayer url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png" opacity={0.5} />

                {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                <MapRecenter center={center} />

                {/* Polígono de Referencia (Límite del Campo) */}
                {referencePolygon.length > 2 && (
                    <Polygon positions={referencePolygon} pathOptions={{ color: '#ef4444', fillColor: 'transparent', weight: 2, dashArray: '5, 10' }} />
                )}

                {/* Polígono de la Parcela */}
                {polygon.length > 0 && (
                    <Polygon positions={polygon} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.5, weight: 3 }} />
                )}

                {!readOnly && polygon.map((pos, idx) => ( <Marker key={idx} position={pos} opacity={0.8} /> ))}
                {readOnly && polygon.length === 0 && center.lat !== 0 && ( <Marker position={center} opacity={1.0} /> )}
            </MapContainer>
            
            {!readOnly && polygon.length === 0 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[400] bg-black/70 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest pointer-events-none flex items-center shadow-2xl border border-white/20">
                    <MousePointer size={12} className="mr-2 animate-bounce"/> Haz clic para delimitar la parcela dentro del campo
                </div>
            )}
        </div>
    );
}
