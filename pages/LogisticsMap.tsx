import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import { 
  Building, MapPin, Warehouse, Truck, Activity, Search, Filter, 
  Maximize2, Navigation, Layers, Satellite, ExternalLink, Phone, 
  Mail, CheckCircle2, ChevronRight, X, Compass, Globe, Sprout, 
  FlaskConical, Eye, SlidersHorizontal, RefreshCw, Radio, GitFork,
  ShieldCheck, ShieldAlert, Award, FileCheck2, Thermometer, Droplets,
  Package, ArrowRight, Clock, AlertTriangle, Scale, Check
} from 'lucide-react';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Componente para redimensionar el mapa en cambios de vista / container flex
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const updateSize = () => {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch (e) {}
      });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(map.getContainer());
    updateSize();
    return () => observer.disconnect();
  }, [map]);
  return null;
};

// Componente para centrar el mapa suavemente en nodos válidos
const MapController = ({ 
  targetCoords, 
  targetZoom,
  allCoords,
  fitAllTrigger
}: { 
  targetCoords: { lat: number; lng: number } | null;
  targetZoom?: number;
  allCoords: { lat: number; lng: number }[];
  fitAllTrigger: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (targetCoords && !isNaN(targetCoords.lat) && !isNaN(targetCoords.lng)) {
      map.flyTo([targetCoords.lat, targetCoords.lng], targetZoom || 13, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [targetCoords, targetZoom, map]);

  useEffect(() => {
    if (fitAllTrigger > 0 && allCoords.length > 0) {
      const valid = allCoords.filter(c => c && !isNaN(c.lat) && !isNaN(c.lng));
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(c => [c.lat, c.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
        }
      }
    }
  }, [fitAllTrigger, allCoords, map]);

  return null;
};

// Creador de iconos personalizados con SVG/HTML sin dependencias externas de archivos .png
const createNodeIcon = (type: 'plot' | 'storage' | 'field' | 'supplier', isSelected: boolean) => {
  let bgColor = '#10b981'; // emerald
  let borderColor = '#ffffff';
  let iconSvg = '';

  if (type === 'plot') {
    bgColor = '#059669'; // verde esmeralda
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`;
  } else if (type === 'storage') {
    bgColor = '#f59e0b'; // ámbar
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>`;
  } else if (type === 'field') {
    bgColor = '#0284c7'; // azul cielo
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
  } else if (type === 'supplier') {
    bgColor = '#9333ea'; // púrpura
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  }

  const size = isSelected ? 42 : 34;
  const glow = isSelected ? `box-shadow: 0 0 0 4px rgba(255,255,255,0.8), 0 8px 20px rgba(0,0,0,0.5); transform: scale(1.15);` : `box-shadow: 0 4px 12px rgba(0,0,0,0.35);`;

  return L.divIcon({
    className: 'custom-control-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid ${borderColor};
        cursor: pointer;
        transition: all 0.25s ease-out;
        ${glow}
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export default function LogisticsMap() {
  const { 
    plots, locations, storagePoints, suppliers, varieties, 
    seedBatches, seedMovements, clients, projects 
  } = useAppContext();

  // Modo de visualización de la Torre de Control: 'map' | 'lineage' | 'alerts'
  const [activeMode, setActiveMode] = useState<'map' | 'lineage' | 'alerts'>('map');

  const [mapLayer, setMapLayer] = useState<'hybrid' | 'streets'>('hybrid');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);

  // Lote seleccionado para el Árbol Genealógico de Trazabilidad (Seed-to-Product)
  const [selectedLineageBatchId, setSelectedLineageBatchId] = useState<string>(() => {
    return seedBatches[0]?.id || '';
  });

  // Generación consolidada de Nodos Geoespaciales
  const markers = useMemo(() => {
    const list: any[] = [];

    // 1. Parcelas y Lotes de Cultivo
    plots.forEach(plot => {
      const loc = locations.find(l => l.id === plot.locationId);
      const variety = varieties.find(v => v.id === plot.varietyId);
      const coords = plot.coordinates || loc?.coordinates;

      if (coords && coords.lat && coords.lng && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        list.push({
          id: plot.id,
          name: plot.name,
          category: 'plot',
          typeLabel: `Lote de Cultivo (${plot.type})`,
          city: loc?.city || 'Zona Rural',
          province: loc?.province || 'Argentina',
          address: loc?.name || 'Establecimiento Agropecuario',
          coordinates: { lat: coords.lat, lng: coords.lng },
          polygon: plot.polygon || loc?.polygon,
          surface: `${plot.surfaceArea || 0} ${plot.surfaceUnit || 'ha'}`,
          status: plot.status || 'Activa',
          extra: `Cultivar: ${variety?.name || 'Genética s/d'} (${variety?.usage || 'Fibra'})`,
          link: `/plots/${plot.id}`,
          color: plot.color || '#059669',
          varietyName: variety?.name,
          locationName: loc?.name
        });
      }
    });

    // 2. Establecimientos / Campos Productivos
    locations.forEach(loc => {
      if (loc.coordinates?.lat && loc.coordinates?.lng && !isNaN(loc.coordinates.lat) && !isNaN(loc.coordinates.lng)) {
        list.push({
          id: loc.id,
          name: loc.name,
          category: 'field',
          typeLabel: loc.siteType || 'Campo Extensivo',
          city: loc.city || 'S/D',
          province: loc.province || 'Argentina',
          address: loc.address || 'Predio General',
          coordinates: { lat: loc.coordinates.lat, lng: loc.coordinates.lng },
          polygon: loc.polygon,
          surface: `${loc.capacityHa || 0} ha totales`,
          status: loc.status || 'Activo',
          extra: `Lic. ARICCAME: ${loc.ariccameLicenseNumber || 'En trámite'}`,
          link: `/locations/${loc.id}`,
          color: '#0284c7'
        });
      }
    });

    // 3. Almacenes & Silos de Acopio
    storagePoints.forEach(sp => {
      if (sp.coordinates?.lat && sp.coordinates?.lng && !isNaN(sp.coordinates.lat) && !isNaN(sp.coordinates.lng)) {
        list.push({
          id: sp.id,
          name: sp.name,
          category: 'storage',
          typeLabel: `Nodo de Acopio: ${sp.type || 'Propio'}`,
          city: sp.city || 'Hub Logístico',
          province: sp.province || 'Argentina',
          address: sp.address || 'Planta de Acopio',
          coordinates: { lat: sp.coordinates.lat, lng: sp.coordinates.lng },
          surface: `Cap: ${sp.totalCapacityTn || 450} Tn`,
          status: 'Operativo GACP',
          extra: `Libro ARICCAME: ${sp.ariccameCustodyRegistry || 'N/A'} · Temp: ${sp.tempC || 16}°C`,
          link: `/storage`,
          color: '#f59e0b'
        });
      }
    });

    // 4. Proveedores & Labs
    suppliers.forEach(sup => {
      if (sup.coordinates?.lat && sup.coordinates?.lng && !isNaN(sup.coordinates.lat) && !isNaN(sup.coordinates.lng)) {
        list.push({
          id: sup.id,
          name: sup.name,
          category: 'supplier',
          typeLabel: `Proveedor: ${sup.category || 'Servicios'}`,
          city: sup.city || 'Hub Tecnológico',
          province: sup.province || 'Buenos Aires',
          address: sup.address || 'Polo Industrial',
          coordinates: { lat: sup.coordinates.lat, lng: sup.coordinates.lng },
          surface: sup.isOfficialPartner ? 'Partner Oficial' : 'Homologado',
          status: 'Homologado',
          extra: sup.notes || `Contacto: ${sup.commercialContact || 'Área Técnica'}`,
          link: `/suppliers`,
          color: '#9333ea'
        });
      }
    });

    let filtered = list;
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.category === filterType);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.province.toLowerCase().includes(q) ||
        item.typeLabel.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [plots, locations, storagePoints, suppliers, varieties, filterType, searchTerm]);

  const allCoordinates = useMemo(() => {
    return markers.map(m => m.coordinates);
  }, [markers]);

  const handleSelectNode = (node: any) => {
    setSelectedNode(node);
    setTargetCoords(node.coordinates);
  };

  const handleFitAll = () => {
    setSelectedNode(null);
    setTargetCoords(null);
    setFitAllTrigger(prev => prev + 1);
  };

  // Datos del Lote seleccionado para el Árbol de Trazabilidad
  const currentLineageBatch = useMemo(() => {
    return seedBatches.find(b => b.id === selectedLineageBatchId) || seedBatches[0];
  }, [seedBatches, selectedLineageBatchId]);

  const currentVariety = useMemo(() => {
    return varieties.find(v => v.id === currentLineageBatch?.varietyId);
  }, [varieties, currentLineageBatch]);

  const currentStorage = useMemo(() => {
    return storagePoints.find(s => s.id === currentLineageBatch?.storagePointId);
  }, [storagePoints, currentLineageBatch]);

  const currentOriginPlot = useMemo(() => {
    if (currentLineageBatch?.originPlotId) {
      return plots.find(p => p.id === currentLineageBatch.originPlotId);
    }
    return plots.find(p => p.varietyId === currentLineageBatch?.varietyId);
  }, [plots, currentLineageBatch]);

  const currentOriginLocation = useMemo(() => {
    if (currentOriginPlot) {
      return locations.find(l => l.id === currentOriginPlot.locationId);
    }
    return locations[0];
  }, [locations, currentOriginPlot]);

  const linkedMovements = useMemo(() => {
    if (!currentLineageBatch) return [];
    return seedMovements.filter(m => m.batchId === currentLineageBatch.id);
  }, [seedMovements, currentLineageBatch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-16 font-mono">
      
      {/* 1. CABECERA PRINCIPAL & SELECTOR DE MODO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Torre de Control & Cadena de Custodia
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <Radio size={11} className="text-sky-500" />
                {markers.length} Nodos Geoespaciales
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <Compass className="text-emerald-500" size={32} />
              <span>Torre de Control: Trazabilidad Seed-to-Industry</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Supervisión de la cadena de valor: germoplasma INASE, DDJJ de siembra, monitoreo satelital, acopio GACP y despacho industrial.
            </p>
          </div>

          {/* SELECTOR DE PESTAÑAS DE LA TORRE */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveMode('map')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeMode === 'map'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe size={15} />
              <span>1. Mapa Satelital HD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('lineage')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeMode === 'lineage'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitFork size={15} />
              <span>2. Árbol Genealógico</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('alerts')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeMode === 'alerts'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert size={15} />
              <span>3. Riesgo & Regulatorio</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODO 1: MAPA SATELITAL HD DE LA TORRE DE CONTROL */}
      {activeMode === 'map' && (
        <div className="space-y-4 animate-in fade-in">
          
          {/* BARRA DE FILTROS DEL MAPA */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition ${
                  filterType === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Todos ({markers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('plot')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 ${
                  filterType === 'plot' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Lotes Cultivo
              </button>
              <button
                type="button"
                onClick={() => setFilterType('storage')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 ${
                  filterType === 'storage' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Acopio & Silos
              </button>
              <button
                type="button"
                onClick={() => setFilterType('field')}
                className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 ${
                  filterType === 'field' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Campos / DDJJ
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* CAPA MAPA */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMapLayer('hybrid')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                    mapLayer === 'hybrid' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Satellite size={12} />
                  <span>Satélite HD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('streets')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                    mapLayer === 'streets' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Layers size={12} />
                  <span>Callejero</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleFitAll}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition text-[11px]"
              >
                Vista Nacional
              </button>
            </div>
          </div>

          {/* CONTENEDOR DEL MAPA Y LISTA DE NODOS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[680px]">
            
            {/* LISTA LATERAL DE NODOS */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                  Nodos de Red ({markers.length})
                </span>
                <span className="text-[10px] text-slate-400">Clic para enfocar</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {markers.map(node => (
                  <div
                    key={`${node.category}-${node.id}`}
                    onClick={() => handleSelectNode(node)}
                    className={`p-3 rounded-2xl border transition cursor-pointer text-xs ${
                      selectedNode?.id === node.id 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500' 
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                      <strong className="text-slate-900 dark:text-white uppercase truncate">{node.name}</strong>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{node.typeLabel} · {node.city}</p>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                      <span>{node.surface}</span>
                      <span className="text-emerald-600 font-bold">{node.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MAPA LEAFLET */}
            <div className="lg:col-span-3 bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 relative shadow-sm">
              <MapContainer
                center={[-34.6037, -62.3816]}
                zoom={5}
                className="w-full h-full z-0"
              >
                <MapResizer />
                <MapController 
                  targetCoords={targetCoords}
                  allCoords={allCoordinates}
                  fitAllTrigger={fitAllTrigger}
                />

                {mapLayer === 'hybrid' ? (
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="&copy; Esri World Imagery"
                    maxZoom={19}
                  />
                ) : (
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                    maxZoom={19}
                  />
                )}

                {/* Polígonos de Parcelas */}
                {markers.filter(m => m.polygon && m.polygon.length >= 3).map(m => (
                  <Polygon
                    key={`poly-${m.id}`}
                    positions={m.polygon.map((p: any) => [p.lat, p.lng])}
                    pathOptions={{
                      color: selectedNode?.id === m.id ? '#10b981' : '#059669',
                      fillColor: selectedNode?.id === m.id ? '#34d399' : '#10b981',
                      fillOpacity: selectedNode?.id === m.id ? 0.5 : 0.25,
                      weight: selectedNode?.id === m.id ? 3 : 2
                    }}
                  />
                ))}

                {/* Marcadores */}
                {markers.map(marker => {
                  const isSelected = selectedNode?.id === marker.id;
                  const customIcon = createNodeIcon(marker.category, isSelected);

                  return (
                    <Marker
                      key={`${marker.category}-${marker.id}`}
                      position={[marker.coordinates.lat, marker.coordinates.lng]}
                      icon={customIcon}
                      eventHandlers={{
                        click: () => handleSelectNode(marker)
                      }}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="p-3 min-w-[220px] text-slate-900 font-mono text-xs space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">{marker.typeLabel}</span>
                          <strong className="text-sm uppercase block leading-tight">{marker.name}</strong>
                          <p className="text-[11px] text-slate-600">{marker.address}, {marker.city} ({marker.province})</p>
                          <div className="bg-slate-100 p-2 rounded-lg text-[10px] text-slate-700">
                            {marker.extra}
                          </div>
                          {marker.link && (
                            <Link to={marker.link} className="text-[10px] text-emerald-700 font-bold uppercase hover:underline block pt-1">
                              Ver Ficha Técnica &rarr;
                            </Link>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

          </div>
        </div>
      )}

      {/* MODO 2: ÁRBOL GENEALÓGICO DE TRAZABILIDAD (SEED-TO-INDUSTRY) */}
      {activeMode === 'lineage' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* SELECTOR DE LOTE A AUDITAR */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-sky-600">Auditoría E2E de Cadena de Custodia</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                Linaje Agronómico del Lote: {currentLineageBatch?.batchCode}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Reconstrucción histórica desde el banco de germoplasma y siembra hasta el análisis de laboratorio y acopio.
              </p>
            </div>

            <div className="w-full md:w-80">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Seleccionar Material a Rastrear:</label>
              <select
                value={selectedLineageBatchId}
                onChange={e => setSelectedLineageBatchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold outline-none"
              >
                {seedBatches.map(b => {
                  const v = varieties.find(v => v.id === b.varietyId);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.batchCode} ({v?.name || 'S/D'} · {b.materialType || 'seed'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* DIAGRAMA PIPELINE DEL ÁRBOL GENEALÓGICO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* NODO 1: GENÉTICA & GERMOPLASMA */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">1</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200">
                    Germoplasma
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentVariety?.name || 'Variedad Certificada'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Obtentor: {currentVariety?.breederName || 'Hemp-it / INASE'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">RNC INASE:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{currentVariety?.inaseRncNumber || 'RNC-8492/23'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quimiotipo:</span>
                    <strong className="text-emerald-600">&lt;0.3% THC OK</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ciclo:</span>
                    <strong>{currentVariety?.cycleDays || 120} días ({currentVariety?.photoperiodType || 'Monoica'})</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <Check size={12} />
                <span>Inscripción Oficial Verificada</span>
              </div>
            </div>

            {/* NODO 2: LOTE DE INSUMO FISCALIZADO */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">2</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200">
                    Fiscalización
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentLineageBatch?.labelSerialNumber ? `Rótulo ${currentLineageBatch.labelSerialNumber}` : 'Lote Fiscalizado'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Categoría: {currentLineageBatch?.category || 'Certificada C1'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Poder Germinativo:</span>
                    <strong className="text-blue-600">{currentLineageBatch?.germination || 92}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pureza Físico-Bot:</span>
                    <strong>{currentLineageBatch?.purity || 99.4}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vigencia Análisis:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{currentLineageBatch?.germinationExpiryDate || '2026-08-12'}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                <Check size={12} />
                <span>Rótulo Homologado INASE</span>
              </div>
            </div>

            {/* NODO 3: PARCELA & DDJJ GEODÉSICA */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">3</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                    Suelo & DDJJ
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentOriginPlot?.name || 'Parcela Productiva'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Establecimiento: {currentOriginLocation?.name || 'Río Cuarto'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Superficie:</span>
                    <strong>{currentOriginPlot?.surfaceArea || 25} ha</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DDJJ ARICCAME:</span>
                    <strong className="text-emerald-600">{currentOriginLocation?.sowingDeclarationId || 'DDJJ-SIEMBRA-2025-CBA'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Satélite Sentinel-2:</span>
                    <strong className="text-sky-600">NDVI 0.76 (Óptimo)</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <Check size={12} />
                <span>Geodesia & Polígono Declarado</span>
              </div>
            </div>

            {/* NODO 4: ACOPIO GACP & CERTIFICADO CoA */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">4</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                    Acopio & CoA
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentStorage?.name || 'Centro de Acopio Río Cuarto'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Nodo: {currentStorage?.nodeCode || 'NOD-RC-01'} ({currentStorage?.city || 'CBA'})
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stock en Custodia:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{Number(currentLineageBatch?.remainingQuantity.toFixed(2)).toLocaleString()} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Protocolo HPLC:</span>
                    <strong className="text-emerald-600">{currentLineageBatch?.hplcLabCertificate || 'CoA-HPLC-INTA-2026'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sensores T° / HR:</span>
                    <strong>{currentStorage?.tempC || 17}°C · {currentStorage?.humidityPct || 45}% HR</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                <Check size={12} />
                <span>Libro Guardia ARICCAME Activo</span>
              </div>
            </div>

          </div>

          {/* GUÍAS DE TRÁNSITO ASOCIADAS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
              Guías de Tránsito ARICCAME Vinculadas a este Lote ({linkedMovements.length})
            </h3>
            {linkedMovements.length === 0 ? (
              <p className="text-xs text-slate-400">No se registran despachos logísticos activos para este lote específico.</p>
            ) : (
              <div className="space-y-2">
                {linkedMovements.map(m => (
                  <div key={m.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div>
                      <strong className="text-slate-900 dark:text-white">{m.transportGuideNumber}</strong>
                      <span className="text-slate-400 ml-2">({m.date}) · {m.quantity.toLocaleString()} kg despachados</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Ruta: {m.routeItinerary || 'Tránsito oficial'} · Chofer: {m.driverName} (Pat: {m.vehiclePlate})</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODO 3: CENTRO DE ALERTAS & RIESGO REGULATORIO */}
      {activeMode === 'alerts' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ALERTA 1: CUMPLIMIENTO THC <0.3% */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-emerald-600">Límite Legal ARICCAME</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">THC &lt; 0.3% OK</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                El 100% de los cultivares y lotes de biomasa cuentan con perfil cromatográfico dentro del umbral normativo no psicoactivo.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Variedades Certificadas:</span>
                <strong className="text-emerald-600 font-bold">{varieties.length} / {varieties.length}</strong>
              </div>
            </div>

            {/* ALERTA 2: VIGENCIA ANÁLISIS PODER GERMINATIVO */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-sky-600">Fiscalización INASE</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Semillas Vigentes</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Lotes de semilla para la campaña 2025/2026 cuentan con certificado de poder germinativo vigente y pureza superior al 98.5%.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Vigencia Promedio:</span>
                <strong className="text-sky-600 font-bold">12 meses restantes</strong>
              </div>
            </div>

            {/* ALERTA 3: SENSORES DE ALMACÉN GACP */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Thermometer size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-amber-600">Sensores Higrotérmicos</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Clima en Silos OK</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Ningún silo o cámara fría registra humedad relativa &gt; 55% o temperatura fuera del rango seguro (&lt; 20°C).
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Nodos Auditados:</span>
                <strong className="text-amber-600 font-bold">{storagePoints.length} Nodos GACP</strong>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
