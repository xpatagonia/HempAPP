
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Trash2, MapPin, MousePointer, Ruler, Route } from 'lucide-react';
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
        if (center) {
            map.flyTo(center, 16, { duration: 1.5 }); // Smooth fly animation
        }
    }, [center, map]);
    return null;
};

export default function MapEditor({ initialPolygon = [], initialCenter, onPolygonChange, readOnly = false, height = "400px" }: MapEditorProps) {
    const [polygon, setPolygon] = useState<{ lat: number, lng: number }[]>(initialPolygon);
    
    // Default center (Argentina Central approx)
    const [center, setCenter] = useState<{ lat: number, lng: number }>(
        initialCenter || (initialPolygon.length > 0 ? initialPolygon[0] : { lat: -34.6037, lng: -58.3816 })
    );

    // React to prop changes for center (Critical for Location selection)
    useEffect(() => {
        if (initialCenter) {
            setCenter(initialCenter);
        }
    }, [initialCenter]);

    // React to prop changes for polygon (Critical for Edit mode)
    useEffect(() => {
        if (initialPolygon && initialPolygon.length > 0) {
            setPolygon(initialPolygon);
            if(!initialCenter) {
                 setCenter(initialPolygon[0]);
            }
        }
    }, [initialPolygon]);

    // --- MATH HELPERS ---

    const toRad = (value: number) => (value * Math.PI) / 180;

    // Calculate Area (Shoelace formula approx for small areas + Earth Radius adjustment)
    const calculateAreaHa = (coords: { lat: number, lng: number }[]) => {
        if (coords.length < 3) return 0;
        const earthRadius = 6371000; // meters
        
        let area = 0;
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const p1 = coords[i];
            const p2 = coords[j];
            
            area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
        }
        
        area = Math.abs(area * earthRadius * earthRadius / 2);
        return area / 10000; // Convert m2 to hectares
    };

    // Calculate Perimeter (Sum of Haversine distances)
    const calculatePerimeterMeters = (coords: { lat: number, lng: number }[]) => {
        if (coords.length < 2) return 0;
        let perimeter = 0;
        const R = 6371000; // Earth radius in meters

        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            // If it's not a closed polygon (drawing in progress), don't calculate last segment closure yet unless desired.
            // But usually for "polygon" we imply closure. Let's calculate closed loop.
            
            const lat1 = coords[i].lat;
            const lon1 = coords[i].lng;
            const lat2 = coords[j].lat;
            const lon2 = coords[j].lng;

            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;
            
            perimeter += d;
        }
        return perimeter;
    };

    const calculateCentroid = (coords: { lat: number, lng: number }[]) => {
        if (coords.length === 0) return center;
        const lats = coords.map(c => c.lat);
        const lngs = coords.map(c => c.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
    };

    const handleAddPoint = (e: L.LeafletMouseEvent) => {
        if (readOnly) return;
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        const newPoly = [...polygon, newPoint];
        setPolygon(newPoly);
        
        if (onPolygonChange) {
            const area = calculateAreaHa(newPoly);
            const perimeter = calculatePerimeterMeters(newPoly);
            const newCenter = calculateCentroid(newPoly);
            onPolygonChange(newPoly, area, newCenter, perimeter);
        }
    };

    const handleClear = () => {
        setPolygon([]);
        if (onPolygonChange) onPolygonChange([], 0, center, 0);
    };

    const currentArea = calculateAreaHa(polygon);
    const currentPerimeter = calculatePerimeterMeters(polygon);

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
                        <div className="flex items-center mb-1"><Ruler size={10} className="mr-1"/> {currentArea.toFixed(2)} ha</div>
                        <div className="flex items-center"><Route size={10} className="mr-1"/> {Math.round(currentPerimeter)} m</div>
                    </div>
                </div>
            )}

            {readOnly && polygon.length >= 3 && (
                 <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur p-2 rounded shadow border border-gray-200 text-xs">
                     <span className="font-bold text-gray-800 flex items-center mb-1">
                         <Ruler size={12} className="mr-1 text-hemp-600"/> {currentArea.toFixed(2)} ha
                     </span>
                     <span className="font-bold text-gray-600 flex items-center">
                         <Route size={12} className="mr-1 text-blue-600"/> {Math.round(currentPerimeter)} m
                     </span>
                 </div>
            )}

            <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
                {/* Esri Satellite Imagery */}
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
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold pointer-events-none flex items-center shadow-lg border border-white/20 whitespace-nowrap">
                    <MousePointer size={14} className="mr-2 animate-bounce"/> Haz clic en el mapa para delimitar la parcela
                </div>
            )}
        </div>
    );
}
