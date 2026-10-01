import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import { 
  Building, MapPin, Warehouse, Truck, Activity, Search, Filter, 
  Maximize2, Navigation, Layers, Satellite, ExternalLink, Phone, 
  Mail, CheckCircle2, ChevronRight, X, Compass, Globe, Sprout, 
  FlaskConical, Eye, SlidersHorizontal, RefreshCw, Radio
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
        ${glow}
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4]
  });
};

export default function LogisticsMap() {
  const { storagePoints, locations, suppliers, plots, appName } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'plot' | 'storage' | 'field' | 'supplier'>('all');
  const [mapLayer, setMapLayer] = useState<'hybrid' | 'streets'>('hybrid');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fitAllTrigger, setFitAllTrigger] = useState(1);

  // Consolidar todos los nodos georreferenciados de la red
  const markers = useMemo(() => {
    const list: any[] = [];

    // 1. Parcelas y Ensayos de Cultivo (Plots)
    plots.forEach(plot => {
      const loc = locations.find(l => l.id === plot.locationId);
      const lat = plot.coordinates?.lat || loc?.coordinates?.lat;
      const lng = plot.coordinates?.lng || loc?.coordinates?.lng;
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        list.push({
          id: plot.id,
          name: plot.name,
          category: 'plot',
          typeLabel: 'Lote de Cultivo',
          city: loc?.city || 'Río Cuarto',
          province: loc?.province || 'Córdoba',
          address: loc?.address || 'Área de Ensayo',
          coordinates: { lat, lng },
          polygon: plot.polygon,
          surface: `${plot.surfaceArea || 12} ${plot.surfaceUnit || 'ha'}`,
          status: plot.status || 'Activa',
          extra: `Variedad ID: ${plot.varietyId} · Riego: ${plot.irrigationType || 'Pivote'}`,
          link: `/plots/${plot.id}`,
          color: '#059669'
        });
      }
    });

    // 2. Centros de Acopio y Secaderos (Storage Points)
    storagePoints.forEach(sp => {
      if (sp.coordinates?.lat && sp.coordinates?.lng && !isNaN(sp.coordinates.lat) && !isNaN(sp.coordinates.lng)) {
        list.push({
          id: sp.id,
          name: sp.name,
          category: 'storage',
          typeLabel: 'Centro de Acopio & Secado',
          city: sp.city || 'Nodo Logístico',
          province: sp.province || 'Córdoba',
          address: sp.address || 'Parque Industrial',
          coordinates: { lat: sp.coordinates.lat, lng: sp.coordinates.lng },
          surface: `${sp.surfaceM2 || 1200} m²`,
          status: sp.type === 'Propio' ? 'Operativo Propio' : 'Tercerizado',
          extra: sp.conditions || 'Control térmico y ventilación forzada para biomasa.',
          nodeCode: sp.nodeCode || 'NOD-01',
          color: '#f59e0b'
        });
      }
    });

    // 3. Estaciones Experimentales y Establecimientos (Locations)
    locations.forEach(loc => {
      if (loc.coordinates?.lat && loc.coordinates?.lng && !isNaN(loc.coordinates.lat) && !isNaN(loc.coordinates.lng)) {
        // Solo agregar si no es idéntico a una parcela ya listada
        list.push({
          id: loc.id,
          name: loc.name,
          category: 'field',
          typeLabel: 'Establecimiento Rural',
          city: loc.city || 'Área Productiva',
          province: loc.province || 'Argentina',
          address: loc.address || 'Ruta de Acceso',
          coordinates: { lat: loc.coordinates.lat, lng: loc.coordinates.lng },
          surface: `${loc.capacityHa || 85} ha`,
          status: 'Activo',
          extra: `Suelo: ${loc.soilType || 'Franco-Limoso'} · Responsable: ${loc.responsiblePerson || 'Ing. Agrónomo'}`,
          link: `/locations`,
          color: '#0284c7'
        });
      }
    });

    // 4. Proveedores de Red & Laboratorios (Suppliers)
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
          email: sup.email,
          phone: sup.whatsapp,
          link: `/suppliers`,
          color: '#9333ea'
        });
      }
    });

    // Filtrado por categoría
    let filtered = list;
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.category === filterType);
    }

    // Filtrado por término de búsqueda
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
  }, [plots, locations, storagePoints, suppliers, filterType, searchTerm]);

  // Coordenadas válidas para centrar
  const allCoordinates = useMemo(() => {
    return markers.map(m => m.coordinates);
  }, [markers]);

  // Al hacer clic en un nodo de la lista
  const handleSelectNode = (node: any) => {
    setSelectedNode(node);
    setTargetCoords(node.coordinates);
  };

  // Re-centrar vista nacional
  const handleFitAll = () => {
    setSelectedNode(null);
    setTargetCoords(null);
    setFitAllTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      
      {/* 1. CABECERA DE LA TORRE DE CONTROL */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Telemetría Geoespacial Activa
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                <Radio size={11} className="text-sky-500" />
                {markers.length} Nodos Monitoreados
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-baseline gap-3">
              <span>Torre de Control & Red Logística</span>
              <span className="text-base sm:text-lg font-mono font-medium text-slate-400 hidden sm:inline">
                | {appName}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
              Monitoreo integral de parcelas de cultivo, secaderos, centros de procesamiento y proveedores homologados en Argentina.
            </p>
          </div>

          {/* Acciones de Control & Capas */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleFitAll}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 border border-slate-200/60 dark:border-slate-700"
            >
              <Compass size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Centrar Red</span>
            </button>

            {/* Alternador de Capa Satelital vs Callejero */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <button
                onClick={() => setMapLayer('hybrid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapLayer === 'hybrid'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Satellite size={13} />
                <span>Satélite HD</span>
              </button>
              <button
                onClick={() => setMapLayer('streets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapLayer === 'streets'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers size={13} />
                <span>Callejero</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Todos ({markers.length})
            </button>
            <button
              onClick={() => setFilterType('plot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === 'plot'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Lotes de Cultivo
            </button>
            <button
              onClick={() => setFilterType('storage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === 'storage'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Acopio & Secado
            </button>
            <button
              onClick={() => setFilterType('field')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === 'field'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Campos Productivos
            </button>
            <button
              onClick={() => setFilterType('supplier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === 'supplier'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Proveedores & Labs
            </button>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por lote, ciudad o nodo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. AREA DEL MAPA Y PANEL LATERAL INDUSTRIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 h-[720px]">
        
        {/* PANEL LATERAL DE NODOS (1/4 WIDTH EN DESKTOP) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600" />
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Nodos ({markers.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Clic para centrar</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {markers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No se encontraron nodos</p>
                <p className="text-[10px] text-slate-500 mt-1">Prueba cambiando el filtro de búsqueda</p>
              </div>
            ) : (
              markers.map(node => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={`${node.category}-${node.id}`}
                    onClick={() => handleSelectNode(node)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: node.color }} 
                        />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          {node.typeLabel}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                        {node.surface}
                      </span>
                    </div>

                    <h4 className="font-mono font-black text-xs text-slate-900 dark:text-white mt-1.5 truncate group-hover:text-emerald-600 transition-colors">
                      {node.name}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                      {node.city}, {node.province}
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                      <span className="font-mono text-slate-400 truncate text-[9px]">
                        GPS: {node.coordinates.lat.toFixed(3)}, {node.coordinates.lng.toFixed(3)}
                      </span>
                      <ChevronRight size={13} className="text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tarjeta de Detalle del Nodo Seleccionado */}
          {selectedNode && (
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-emerald-400">
                  Selección Activa
                </span>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="text-slate-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
              <h5 className="font-mono font-black text-xs truncate uppercase">{selectedNode.name}</h5>
              <p className="text-[10px] text-slate-300 leading-relaxed font-medium line-clamp-2">
                {selectedNode.extra}
              </p>
              <div className="pt-2 flex items-center justify-between gap-2 text-[10px]">
                <a
                  href={`https://www.google.com/maps?q=${selectedNode.coordinates.lat},${selectedNode.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Google Maps</span>
                  <ExternalLink size={11} />
                </a>
                {selectedNode.link && (
                  <Link
                    to={selectedNode.link}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase"
                  >
                    Ver Ficha
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CONTENEDOR DEL MAPA LEAFLET (3/4 WIDTH EN DESKTOP) */}
        <div className="lg:col-span-3 bg-slate-950 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xl relative h-full">
          
          <MapContainer 
            center={[-34.6037, -62.3816]} 
            zoom={6} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
          >
            {/* Observer para resize de contenedor */}
            <MapResizer />

            {/* Controlador de movimiento de cámara */}
            <MapController 
              targetCoords={targetCoords} 
              allCoords={allCoordinates}
              fitAllTrigger={fitAllTrigger}
            />

            {/* Capa Satelital de Alta Definición (Esri World Imagery) */}
            {mapLayer === 'hybrid' && (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; Esri World Imagery & Sentinel-2"
                maxZoom={18}
              />
            )}

            {/* Capa Callejero / Cartográfico OpenStreetMap */}
            {mapLayer === 'streets' && (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
                maxZoom={19}
              />
            )}

            {/* Renderizado de Polígonos de Parcelas */}
            {markers.filter(m => m.polygon && m.polygon.length >= 3).map(m => (
              <Polygon
                key={`poly-${m.id}`}
                positions={m.polygon.map((p: any) => [p.lat, p.lng])}
                pathOptions={{
                  color: selectedNode?.id === m.id ? '#10b981' : '#059669',
                  fillColor: selectedNode?.id === m.id ? '#34d399' : '#10b981',
                  fillOpacity: selectedNode?.id === m.id ? 0.45 : 0.25,
                  weight: selectedNode?.id === m.id ? 3 : 2
                }}
              />
            ))}

            {/* Renderizado de Marcadores de Nodos */}
            {markers.map(marker => {
              const isSelected = selectedNode?.id === marker.id;
              const customIcon = createNodeIcon(marker.category, isSelected);

              return (
                <Marker
                  key={`${marker.category}-${marker.id}`}
                  position={[marker.coordinates.lat, marker.coordinates.lng]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedNode(marker);
                      setTargetCoords(marker.coordinates);
                    }
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-3 min-w-[240px] text-slate-900 space-y-2">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                          {marker.typeLabel}
                        </span>
                        <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {marker.status}
                        </span>
                      </div>

                      <h4 className="font-mono font-black text-sm uppercase text-slate-900 leading-tight">
                        {marker.name}
                      </h4>

                      <p className="text-xs text-slate-600 font-medium">
                        📍 {marker.address}, {marker.city} ({marker.province})
                      </p>

                      <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-700 font-medium leading-relaxed">
                        {marker.extra}
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center text-[10px]">
                        <span className="font-mono text-slate-400">
                          {marker.surface}
                        </span>
                        {marker.link && (
                          <Link 
                            to={marker.link}
                            className="font-bold text-emerald-700 hover:underline uppercase text-[10px] flex items-center gap-1"
                          >
                            <span>Detalles</span>
                            <ChevronRight size={11} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Leyenda Flotante de Alta Precisión */}
          <div className="absolute bottom-5 right-5 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2.5">
            <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider">
              Nomenclatura de Red
            </span>
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm" />
              <span>Lotes de Cultivo ({markers.filter(m => m.category === 'plot').length})</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
              <span>Acopio & Secado ({markers.filter(m => m.category === 'storage').length})</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm" />
              <span>Campos Productivos ({markers.filter(m => m.category === 'field').length})</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-purple-600 shadow-sm" />
              <span>Proveedores & Labs ({markers.filter(m => m.category === 'supplier').length})</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
