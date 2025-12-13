import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Trash2, MapPin, MousePointer, Ruler } from 'lucide-react';
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
    onPolygonChange?: (polygon: { lat: number, lng: number }[], areaHa: number) => void;
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
        if (center) map.setView(center, 16);
    }, [center, map]);
    return null;
};

export default function MapEditor({ initialPolygon = [], initialCenter, onPolygonChange, readOnly = false, height = "400px" }: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number, lng: number }[]>(initialPolygon);
    
    // Default center (Argentina Central approx) or specific
    const [center, setCenter] = useState<{ lat: number, lng: number }>(
        initialCenter || (initialPolygon.length > 0 ? initialPolygon[0] : { lat: -34.6037, lng: -58.3816 })
    );

    // Calculate Area simple (Shoelace formula approx for small areas)
    const calculateAreaHa = (coords: { lat: number, lng: number }[]) => {
        if (coords.length < 3) return 0;
        const earthRadius = 6371000; // meters
        
        let area = 0;
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const p1 = coords[i];
            const p2 = coords[j];
            
            // Convert to radians
            const lat1 = p1.lat * Math.PI / 180;
            const lat2 = p2.lat * Math.PI / 180;
            const lng1 = p1.lng * Math.PI / 180;
            const lng2 = p2.lng * Math.PI / 180;

            area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        }
        
        area = Math.abs(area * earthRadius * earthRadius / 2);
        return area / 10000; // Convert m2 to hectares
    };

    const handleAddPoint = (e: L.LeafletMouseEvent) => {
        if (readOnly) return;
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        const newPoly = [...polygon, newPoint];
        setPolygon(newPoly);
        
        if (onPolygonChange) {
            onPolygonChange(newPoly, calculateAreaHa(newPoly));
        }
    };

    const handleClear = () => {
        setPolygon([]);
        if (onPolygonChange) onPolygonChange([], 0);
    };

    const currentArea = calculateAreaHa(polygon);

    return (
        <div className="relative rounded-lg overflow-hidden border border-gray-300 shadow-inner" style={{ height }}>
            {/* Controls Overlay */}
            {!readOnly && (
                <div className="absolute top-2 right-2 z-[1000] bg-white p-2 rounded shadow flex flex-col gap-2">
                    <button 
                        onClick={handleClear} 
                        className="flex items-center text-xs text-red-600 font-bold bg-red-50 p-2 rounded hover:bg-red-100"
                        title="Borrar Polígono"
                        type="button"
                    >
                        <Trash2 size={14} className="mr-1"/> Borrar
                    </button>
                    <div className="text-xs font-bold text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                        {polygon.length < 3 ? 'Marca 3+ puntos' : `${currentArea.toFixed(2)} ha`}
                    </div>
                </div>
            )}

            {readOnly && polygon.length >= 3 && (
                 <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur p-2 rounded shadow border border-gray-200">
                     <span className="text-sm font-bold text-gray-800 flex items-center">
                         <Ruler size={14} className="mr-1 text-hemp-600"/>
                         {currentArea.toFixed(2)} ha
                     </span>
                 </div>
            )}

            <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
                {/* Esri Satellite Imagery (Free, no API Key needed) */}
                <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                
                {/* Labels overlay for better orientation */}
                <TileLayer
                    url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
                    opacity={0.7}
                />

                {!readOnly && <MapEvents onAddPoint={handleAddPoint} />}
                
                {/* Dynamic Recenter if props change */}
                <MapRecenter center={center} />

                {/* Drawn Polygon */}
                {polygon.length > 0 && (
                    <Polygon 
                        positions={polygon} 
                        pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.4, weight: 3 }} 
                    />
                )}

                {/* Points markers while drawing */}
                {!readOnly && polygon.map((pos, idx) => (
                    <Marker key={idx} position={pos} opacity={0.8} />
                ))}
            </MapContainer>
            
            {!readOnly && polygon.length === 0 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold pointer-events-none flex items-center">
                    <MousePointer size={14} className="mr-2 animate-bounce"/> Haz clic en el mapa para marcar los vértices
                </div>
            )}
        </div>
    );
}