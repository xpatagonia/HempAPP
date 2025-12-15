
import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot } from '../types';
import { Plus, ChevronRight, CheckCircle, FileSpreadsheet, Edit2, Calendar, UserCheck, MapPin, Box, Trash2, LayoutGrid, List, Image as ImageIcon, Ruler, Droplets, FlaskConical, Tractor, Tag, Sprout, Map as MapIcon, Navigation, FileUp, AlertTriangle, X, Eye, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import MapEditor from '../components/MapEditor';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper: Convert DMS (Degrees Minutes Seconds) to Decimal
const parseCoordinate = (input: string): string => {
    if (!input) return '';
    const clean = input.trim().toUpperCase();
    const isDecimal = /^-?[\d.]+$/.test(clean);
    if (isDecimal) return clean;

    const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEW])?/i;
    const match = clean.match(dmsRegex);

    if (match) {
        let deg = parseFloat(match[1]);
        let min = parseFloat(match[2]);
        let sec = parseFloat(match[3]);
        let dir = match[4] || '';
        if (!dir && (clean.includes('S') || clean.includes('W'))) dir = 'S';
        let decimal = deg + (min / 60) + (sec / 3600);
        if (dir === 'S' || dir === 'W' || clean.includes('S') || clean.includes('W')) {
            decimal = decimal * -1;
        }
        return decimal.toFixed(6);
    }
    return input; 
};

// Helper: Robust KML Parser
const parseKML = (kmlText: string): { lat: number, lng: number }[] | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const allCoords = Array.from(xmlDoc.getElementsByTagName("coordinates"));
        
        if (allCoords.length === 0) return null;

        // Sort desc by length to find polygon first
        allCoords.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
        
        const targetNode = allCoords[0];
        const text = targetNode.textContent || "";
        const rawPoints = text.replace(/\s+/g, ' ').trim().split(' ');
        
        const latLngs = rawPoints.map(point => {
            const parts = point.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { lat, lng };
                }
            }
            return null;
        }).filter((p): p is { lat: number, lng: number } => p !== null);

        return latLngs.length >= 3 ? latLngs : null;
    } catch (e) {
        console.error("Error parsing KML", e);
        return null;
    }
};

// Component to auto-zoom map to fit bounds
const MapFitter = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && (bounds as any).length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

export default function Plots() {
  const { plots, locations, varieties, projects, usersList, addPlot, updatePlot, deletePlot, currentUser, getLatestRecord, logs, seedBatches } = useAppContext();
  const [searchParams] = useSearchParams();
  const initialProjectFilter = searchParams.get('project') || 'all';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewPlot, setViewPlot] = useState<Plot | null>(null); // Legacy for modal view
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // View Mode: 'map' is default now for Dashboard feel
  const [viewMode, setViewMode] = useState<'map' | 'table' | 'gallery'>('map');
  const [mapColorMode, setMapColorMode] = useState<'status' | 'type'>('status');

  const [filterLoc, setFilterLoc] = useState('all');
  const [filterProj, setFilterProj] = useState(initialProjectFilter);
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Plot> & { lat?: string, lng?: string }>({
    projectId: '', locationId: '', varietyId: '', seedBatchId: '',
    type: 'Ensayo', block: '1', replicate: 1,
    ownerName: '', responsibleIds: [],
    sowingDate: '', rowDistance: 0, density: 0, 
    surfaceArea: 0, surfaceUnit: 'm2', perimeter: 0,
    status: 'Activa', observations: '', irrigationType: '',
    lat: '', lng: '', polygon: []
  });

  // AUTO-FILL COORDINATES FROM LOCATION
  useEffect(() => {
      if (formData.locationId && !formData.lat && !formData.lng && (!formData.polygon || formData.polygon.length === 0)) {
          const loc = locations.find(l => l.id === formData.locationId);
          if (loc && loc.coordinates) {
              setFormData(prev => ({
                  ...prev,
                  lat: loc.coordinates?.lat.toString(),
                  lng: loc.coordinates?.lng.toString()
              }));
          }
      }
  }, [formData.locationId]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';
  const canManagePlots = isAdmin || isClient;

  const availableLocations = locations.filter(l => {
      if (isAdmin) return true;
      if (isClient && currentUser.clientId) {
          return l.clientId === currentUser.clientId || l.responsibleIds?.includes(currentUser.id);
      }
      return l.responsibleIds?.includes(currentUser?.id || '');
  });

  const availableBatches = seedBatches.filter(b => b.varietyId === formData.varietyId);
  const selectedLocation = locations.find(l => l.id === formData.locationId);

  const mapCenter = (formData.lat && formData.lng && !isNaN(parseFloat(formData.lat))) 
      ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
      : selectedLocation?.coordinates 
        ? { lat: selectedLocation.coordinates.lat, lng: selectedLocation.coordinates.lng } 
        : undefined;

  const handleCoordinateBlur = (field: 'lat' | 'lng') => {
      if (field === 'lat' && formData.lat) {
          const parsed = parseCoordinate(formData.lat);
          setFormData(prev => ({ ...prev, lat: parsed }));
      }
      if (field === 'lng' && formData.lng) {
          const parsed = parseCoordinate(formData.lng);
          setFormData(prev => ({ ...prev, lng: parsed }));
      }
  };

  const handleKMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const poly = parseKML(text);
          
          if (poly && poly.length > 2) {
              const lats = poly.map(p => p.lat);
              const lngs = poly.map(p => p.lng);
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

              const R = 6371000;
              const toRad = (x: number) => x * Math.PI / 180;
              let area = 0;
              let perimeter = 0;
              for (let i = 0; i < poly.length; i++) {
                  const j = (i + 1) % poly.length;
                  const p1 = poly[i];
                  const p2 = poly[j];
                  area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
                  const dLat = toRad(p2.lat - p1.lat);
                  const dLon = toRad(p2.lng - p1.lng);
                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  perimeter += R * c;
              }
              area = Math.abs(area * R * R / 2) / 10000;

              // Explicitly create new object to force React state update
              const newState = {
                  ...formData,
                  polygon: poly,
                  lat: centerLat.toFixed(6),
                  lng: centerLng.toFixed(6),
                  surfaceArea: Number(area.toFixed(2)),
                  surfaceUnit: 'ha' as any,
                  perimeter: Math.round(perimeter)
              };
              setFormData(newState);
              alert("✅ KML Importado. El polígono se ha cargado en el mapa y los datos se actualizaron.");
          } else {
              alert("⚠️ No se encontró un polígono válido en el archivo KML.");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => alert("Error al leer el archivo.");
      reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId || !formData.varietyId) return;
    
    let finalProjectId = formData.projectId;
    if (!finalProjectId && isClient) {
        const defaultProj = projects.find(p => p.responsibleIds?.includes(currentUser!.id)) || projects[0];
        finalProjectId = defaultProj?.id || '';
    }

    if (!finalProjectId) {
        alert("Debe seleccionar un proyecto.");
        return;
    }

    const v = varieties.find(v => v.id === formData.varietyId);
    const varCode = v ? v.name.substring(0, 3).toUpperCase() : 'VAR';
    
    let autoName = '';
    if (formData.type === 'Producción') {
        autoName = `LOTE-${formData.block}-${varCode}`; 
    } else {
        autoName = `${varCode}-B${formData.block}-R${formData.replicate}`; 
    }

    let finalLat = parseFloat(parseCoordinate(formData.lat || '0'));
    let finalLng = parseFloat(parseCoordinate(formData.lng || '0'));

    if ((!finalLat || finalLat === 0) && formData.polygon && formData.polygon.length > 0) {
        finalLat = formData.polygon[0].lat;
        finalLng = formData.polygon[0].lng;
    }

    const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && (finalLat !== 0 || finalLng !== 0)) 
      ? { lat: finalLat, lng: finalLng }
      : undefined;

    let finalResponsibles = formData.responsibleIds || [];
    if (isClient && !finalResponsibles.includes(currentUser!.id)) {
        finalResponsibles.push(currentUser!.id);
    }

    // Ensure polygon is passed correctly
    const plotPayload = {
      type: formData.type || 'Ensayo',
      locationId: formData.locationId!,
      varietyId: formData.varietyId!,
      seedBatchId: formData.seedBatchId || null, 
      projectId: finalProjectId,
      block: formData.block!,
      replicate: Number(formData.replicate),
      ownerName: formData.ownerName || 'No especificado',
      responsibleIds: finalResponsibles,
      sowingDate: formData.sowingDate!,
      rowDistance: Number(formData.rowDistance),
      density: Number(formData.density),
      surfaceArea: Number(formData.surfaceArea || 0),
      surfaceUnit: formData.surfaceUnit || 'm2',
      perimeter: Number(formData.perimeter || 0),
      status: formData.status || 'Activa',
      observations: formData.observations,
      irrigationType: formData.irrigationType,
      coordinates,
      polygon: formData.polygon || [] 
    } as any;

    if (editingId) {
        updatePlot({ ...plotPayload, id: editingId, name: plots.find(p => p.id === editingId)?.name || autoName } as Plot);
    } else {
        addPlot({
            ...plotPayload,
            id: Date.now().toString(),
            name: autoName,
        } as Plot);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
        projectId: '', locationId: '', varietyId: '', seedBatchId: '', type: 'Ensayo', block: '1', replicate: 1,
        ownerName: '', responsibleIds: [], sowingDate: '', rowDistance: 0, density: 0, 
        surfaceArea: 0, surfaceUnit: 'm2', perimeter: 0,
        status: 'Activa', observations: '', irrigationType: '',
        lat: '', lng: '', polygon: []
    });
    setEditingId(null);
  };

  const openNew = () => {
      if (availableLocations.length === 0) {
          alert("No tienes locaciones disponibles. Crea una locación primero.");
          return;
      }
      resetForm();
      setIsModalOpen(true);
  };

  const handleEdit = (p: Plot) => {
      setFormData({
        ...p,
        lat: p.coordinates?.lat.toString() || '',
        lng: p.coordinates?.lng.toString() || '',
        surfaceArea: p.surfaceArea || 0,
        surfaceUnit: p.surfaceUnit || 'm2',
        perimeter: p.perimeter || 0,
        type: p.type || 'Ensayo',
        seedBatchId: p.seedBatchId || '',
        polygon: p.polygon || []
      });
      setEditingId(p.id);
      setIsModalOpen(true);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }, perimeterM: number) => {
      setFormData(prev => ({
          ...prev,
          polygon: newPoly,
          surfaceArea: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.surfaceArea,
          surfaceUnit: areaHa > 0 ? 'ha' : prev.surfaceUnit,
          perimeter: Math.round(perimeterM),
          lat: center.lat.toString(),
          lng: center.lng.toString()
      }));
  };

  const handleDelete = async (id?: string) => {
      const targetId = id || editingId;
      if (targetId && window.confirm("¡ATENCIÓN! ¿Estás seguro de eliminar esta parcela y TODOS sus registros históricos? Esta acción no se puede deshacer.")) {
        await deletePlot(targetId);
        setIsModalOpen(false);
      }
  };

  const handleExport = () => {
    const exportData = filteredPlots.map(p => {
        const l = locations.find(l => l.id === p.locationId);
        const v = varieties.find(v => v.id === p.varietyId);
        const pr = projects.find(proj => proj.id === p.projectId);
        const sb = seedBatches.find(b => b.id === p.seedBatchId);
        const d = getLatestRecord(p.id);

        return {
            'Tipo': p.type || 'Ensayo',
            'Proyecto': pr?.name,
            'Locación': l?.name,
            'Variedad': v?.name,
            'Lote Semilla': sb ? sb.batchCode : '-',
            'Bloque/Lote': p.block,
            'Repetición': p.replicate,
            'Latitud': p.coordinates?.lat || l?.coordinates?.lat || '-',
            'Longitud': p.coordinates?.lng || l?.coordinates?.lng || '-',
            'Sup. Siembra': p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-',
            'Perímetro (m)': p.perimeter || '-',
            'Fecha Siembra': p.sowingDate,
            'Último Reg': d?.date || '-',
            'Etapa': d?.stage || '-',
            'Altura Planta': d?.plantHeight || '-',
            'Rendimiento': d?.yield || '-',
            'Observaciones': p.observations || '-',
            'Riego': p.irrigationType || '-'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registro_Cultivos");
    XLSX.writeFile(workbook, "HempAPP_Registro_Cultivos.xlsx");
  };

  const toggleResponsible = (userId: string) => {
    const current = formData.responsibleIds || [];
    if (current.includes(userId)) {
        setFormData({...formData, responsibleIds: current.filter(id => id !== userId)});
    } else {
        setFormData({...formData, responsibleIds: [...current, userId]});
    }
  };

  const filteredPlots = plots.filter(p => {
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchProj = filterProj === 'all' || p.projectId === filterProj;
      const matchType = filterType === 'all' || p.type === filterType;
      
      let hasAccess = false;
      if (isAdmin) hasAccess = true;
      else if (isClient && currentUser.clientId) {
          const loc = locations.find(l => l.id === p.locationId);
          hasAccess = (loc?.clientId === currentUser.clientId) || (p.responsibleIds?.includes(currentUser.id));
      } else {
          hasAccess = p.responsibleIds?.includes(currentUser?.id || '');
      }

      return matchLoc && matchProj && matchType && hasAccess;
  });

  const getLatestPhoto = (plotId: string) => {
      const plotLogs = logs.filter(l => l.plotId === plotId && l.photoUrl).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return plotLogs.length > 0 ? plotLogs[0].photoUrl : null;
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";
  const assignableUsers = usersList.filter(u => u.role === 'admin' || u.role === 'technician' || u.role === 'viewer');

  // --- MAP DASHBOARD LOGIC ---
  
  // Calculate map bounds based on all filtered plots
  const mapBounds = React.useMemo(() => {
      if (filteredPlots.length === 0) return null;
      const latLngs: [number, number][] = [];
      filteredPlots.forEach(p => {
          if (p.polygon && p.polygon.length > 0) {
              p.polygon.forEach(pt => latLngs.push([pt.lat, pt.lng]));
          } else if (p.coordinates && p.coordinates.lat) {
              latLngs.push([p.coordinates.lat, p.coordinates.lng]);
          }
      });
      return latLngs.length > 0 ? L.latLngBounds(latLngs) : null;
  }, [filteredPlots]);

  const getPlotColor = (p: Plot) => {
      if (mapColorMode === 'status') {
          return p.status === 'Cosechada' ? '#eab308' : '#22c55e'; // Gold vs Green
      } else {
          return p.type === 'Producción' ? '#3b82f6' : '#a855f7'; // Blue vs Purple
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 flex-shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard de Lotes</h1>
            <p className="text-sm text-gray-500">Visualización geoespacial y gestión de cultivos.</p>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
              <button onClick={() => setViewMode('map')} className={`p-2 rounded-md transition ${viewMode === 'map' ? 'bg-white shadow text-hemp-600' : 'text-gray-400 hover:text-gray-600'}`} title="Mapa Interactivo"><MapIcon size={18} /></button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`} title="Vista Lista"><List size={18} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-md transition ${viewMode === 'gallery' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`} title="Vista Galería"><LayoutGrid size={18} /></button>
          </div>
          <button onClick={handleExport} className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center transition" title="Exportar Excel"><FileSpreadsheet size={18} /></button>
          {canManagePlots && (
            <button onClick={openNew} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-hemp-700 transition flex-1 sm:flex-none font-medium">
                <Plus size={20} className="mr-2" /> Nueva
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE: MAP (DASHBOARD) */}
      {viewMode === 'map' && (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200 relative">
              {/* Map Controls Overlay */}
              <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                  <div className="bg-white p-2 rounded-lg shadow-md border border-gray-200">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 flex items-center">
                          <Layers size={12} className="mr-1"/> Organizar Por
                      </label>
                      <select 
                        className="text-sm bg-gray-50 border border-gray-200 rounded p-1 w-full outline-none focus:ring-1 focus:ring-hemp-500"
                        value={mapColorMode}
                        onChange={(e) => setMapColorMode(e.target.value as any)}
                      >
                          <option value="status">Estado (Activo/Cosecha)</option>
                          <option value="type">Tipo (Prod/Ensayo)</option>
                      </select>
                  </div>
                  
                  {/* Legend */}
                  <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-md border border-gray-200 text-xs">
                      {mapColorMode === 'status' ? (
                          <>
                              <div className="flex items-center mb-1"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> Activa</div>
                              <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span> Cosechada</div>
                          </>
                      ) : (
                          <>
                              <div className="flex items-center mb-1"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span> Producción</div>
                              <div className="flex items-center"><span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span> Ensayo I+D</div>
                          </>
                      )}
                  </div>
              </div>

              <MapContainer center={[-34.6037, -58.3816]} zoom={5} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                      attribution='&copy; Esri World Imagery'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <TileLayer url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png" opacity={0.7} />
                  
                  {mapBounds && <MapFitter bounds={mapBounds} />}

                  {filteredPlots.map(p => {
                      const color = getPlotColor(p);
                      const loc = locations.find(l => l.id === p.locationId);
                      const vari = varieties.find(v => v.id === p.varietyId);

                      // Popup Content
                      const PopupContent = (
                          <div className="p-1 min-w-[200px]">
                              <h3 className="font-bold text-gray-800 text-base">{p.name}</h3>
                              <div className="text-xs text-gray-500 mb-2">{loc?.name}</div>
                              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  <div className="bg-gray-50 p-1 rounded border">
                                      <span className="block text-gray-400">Variedad</span>
                                      <span className="font-bold text-gray-700">{vari?.name}</span>
                                  </div>
                                  <div className="bg-gray-50 p-1 rounded border">
                                      <span className="block text-gray-400">Sup.</span>
                                      <span className="font-bold text-gray-700">{p.surfaceArea} {p.surfaceUnit}</span>
                                  </div>
                              </div>
                              <Link to={`/plots/${p.id}`} className="block w-full text-center bg-hemp-600 text-white py-1.5 rounded text-xs font-bold hover:bg-hemp-700">
                                  Ver Detalle Completo
                              </Link>
                          </div>
                      );

                      if (p.polygon && p.polygon.length > 0) {
                          return (
                              <Polygon 
                                  key={p.id} 
                                  positions={p.polygon} 
                                  pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 2 }}
                              >
                                  <LeafletTooltip direction="center" opacity={1} permanent>
                                      <span className="text-xs font-bold">{p.name}</span>
                                  </LeafletTooltip>
                                  <Popup>{PopupContent}</Popup>
                              </Polygon>
                          );
                      } else if (p.coordinates) {
                          return (
                              <Marker key={p.id} position={p.coordinates}>
                                  <Popup>{PopupContent}</Popup>
                              </Marker>
                          );
                      }
                      return null;
                  })}
              </MapContainer>
          </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">ID / Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase hidden md:table-cell">Bloque</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden md:table-cell">Locación</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase hidden sm:table-cell">Superficie</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlots.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                            {isAdmin ? "No se encontraron parcelas." : "No tienes parcelas asignadas."}
                        </td>
                    </tr>
                ) : filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium text-gray-900">
                          {p.name}
                          <div className="sm:hidden text-xs text-gray-500 mt-1">{loc?.name}</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                          {p.type === 'Producción' ? (
                              <span className="flex items-center text-green-700 text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100 w-fit"><Tractor size={10} className="mr-1"/> Prod.</span>
                          ) : (
                              <span className="flex items-center text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit"><FlaskConical size={10} className="mr-1"/> I+D</span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-hemp-800 font-semibold">{vari?.name}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">{p.block}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{loc?.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {p.status === 'Activa' && <CheckCircle size={10} className="mr-1"/>}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {canManagePlots && (
                            <>
                                <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-hemp-600 hover:bg-gray-100 inline-block align-middle p-1.5 rounded transition"><Edit2 size={18} /></button>
                                <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 inline-block align-middle p-1.5 rounded transition"><Trash2 size={18} /></button>
                            </>
                        )}
                        <Link to={`/plots/${p.id}`} className="text-gray-400 hover:text-hemp-900 font-medium inline-block align-middle p-1.5 rounded hover:bg-gray-100 transition"><ChevronRight size={20} /></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      )}

      {/* GALLERY VIEW */}
      {viewMode === 'gallery' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
              {filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const latestPhoto = getLatestPhoto(p.id);
                  const latestData = getLatestRecord(p.id);

                  return (
                      <Link to={`/plots/${p.id}`} key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group flex flex-col h-full relative">
                          <div className="absolute top-2 left-2 z-10">
                              {p.type === 'Producción' ? (
                                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center"><Tractor size={10} className="mr-1"/> COMERCIAL</span>
                              ) : (
                                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center"><FlaskConical size={10} className="mr-1"/> ENSAYO</span>
                              )}
                          </div>
                          <div className="h-48 bg-gray-100 relative overflow-hidden">
                              {latestPhoto ? (
                                  <img src={latestPhoto} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50 pattern-grid-lg">
                                      {p.coordinates || (p.polygon && p.polygon.length > 0) ? (
                                          <><MapIcon size={32} className="mb-2 opacity-50" /><span className="text-xs font-medium">Ubicada</span></>
                                      ) : (
                                          <><ImageIcon size={32} className="mb-2 opacity-50" /><span className="text-xs font-medium">Sin datos</span></>
                                      )}
                                  </div>
                              )}
                              <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase ${p.status === 'Activa' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>{p.status}</span>
                              </div>
                              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                                  <h3 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{p.name}</h3>
                                  <p className="text-gray-200 text-xs">{vari?.name} • {loc?.name}</p>
                              </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Altura</span>
                                      <div className="text-sm font-bold text-gray-800 flex items-center"><Ruler size={14} className="mr-1 text-blue-500"/> {latestData?.plantHeight ? `${latestData.plantHeight} cm` : '-'}</div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Superficie</span>
                                      <div className="text-sm font-bold text-gray-800 truncate">{p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-'}</div>
                                  </div>
                              </div>
                              <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                  <div className="flex items-center"><Calendar size={12} className="mr-1" /> Siembra: {p.sowingDate}</div>
                                  {p.irrigationType && <div className="flex items-center"><Droplets size={12} className="mr-1 text-blue-400" /> {p.irrigationType}</div>}
                              </div>
                          </div>
                      </Link>
                  );
              })}
          </div>
      )}

       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Unidad' : 'Nueva Unidad de Cultivo'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: BASIC INFO */}
                  <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center uppercase"><Box size={14} className="mr-2"/> Identidad y Propósito</h3>
                          <div className="grid grid-cols-1 gap-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">Proyecto Marco</label>
                                    <select required className={inputClass} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                                        <option value="">Seleccionar Proyecto...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-purple-900 mb-1">Tipo de Cultivo</label>
                                     <select className={inputClass} value={formData.type || 'Ensayo'} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                         <option value="Ensayo">I+D (Ensayo Experimental)</option>
                                         <option value="Producción">Producción (Lote Comercial)</option>
                                     </select>
                                 </div>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-purple-900 mb-1">Variedad</label>
                                <select required className={inputClass} value={formData.varietyId} onChange={e => setFormData({...formData, varietyId: e.target.value, seedBatchId: ''})}>
                                  <option value="">Seleccionar...</option>
                                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-purple-900 mb-1 flex items-center"><Tag size={12} className="mr-1"/> Lote de Semilla (Trazabilidad)</label>
                                <select className={inputClass} value={formData.seedBatchId || ''} onChange={e => setFormData({...formData, seedBatchId: e.target.value})} disabled={!formData.varietyId}>
                                  <option value="">-- Origen Genérico --</option>
                                  {availableBatches.map(b => (<option key={b.id} value={b.id}>{b.batchCode} ({b.supplierName})</option>))}
                                </select>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">Bloque / Lote</label>
                                    <input required type="text" className={inputClass} placeholder="1" value={formData.block} onChange={e => setFormData({...formData, block: e.target.value})} />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">{formData.type === 'Producción' ? 'Sector' : 'Rep (R)'}</label>
                                    <input required type="number" className={inputClass} placeholder="1" value={formData.replicate} onChange={e => setFormData({...formData, replicate: Number(e.target.value)})} />
                                 </div>
                             </div>
                          </div>
                      </div>

                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center uppercase"><Sprout size={14} className="mr-2"/> Manejo Agronómico</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Fecha Siembra</label>
                                <input type="date" className={`${inputClass} cursor-pointer`} value={formData.sowingDate} onChange={e => setFormData({...formData, sowingDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Riego</label>
                                <select className={inputClass} value={formData.irrigationType || ''} onChange={e => setFormData({...formData, irrigationType: e.target.value})}>
                                    <option value="">-</option>
                                    <option value="Goteo">Goteo</option>
                                    <option value="Aspersión">Aspersión</option>
                                    <option value="Surco">Surco</option>
                                    <option value="Secano">Secano</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Densidad (pl/m2)</label>
                                <input type="number" className={inputClass} value={formData.density} onChange={e => setFormData({...formData, density: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Distancia (cm)</label>
                                <input type="number" className={inputClass} value={formData.rowDistance} onChange={e => setFormData({...formData, rowDistance: Number(e.target.value)})} />
                            </div>
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">Superficie Total</label>
                                    <div className="flex">
                                        <input type="number" step="any" placeholder="0" className={`${inputClass} rounded-r-none border-r-0`} value={formData.surfaceArea || ''} onChange={e => setFormData({...formData, surfaceArea: Number(e.target.value)})} />
                                        <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-r px-1 focus:outline-none" value={formData.surfaceUnit} onChange={e => setFormData({...formData, surfaceUnit: e.target.value as any})}>
                                            <option value="m2">m²</option>
                                            <option value="ha">ha</option>
                                            <option value="ac">acres</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Calculada automáticamente.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">Perímetro (m)</label>
                                    <input type="number" step="1" placeholder="0" className={inputClass} value={formData.perimeter || ''} onChange={e => setFormData({...formData, perimeter: Number(e.target.value)})} />
                                    <p className="text-xs text-gray-500 mt-1">Metros lineales.</p>
                                </div>
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* RIGHT COLUMN: MAPS & LOCATION */}
                  <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 h-full flex flex-col">
                          <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center uppercase"><MapPin size={14} className="mr-2"/> Georreferenciación</h3>
                          
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-blue-900 mb-1">Locación (Establecimiento)</label>
                            <select required className={inputClass} value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {availableLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            {availableLocations.length === 0 && <p className="text-xs text-red-500 mt-1">No tienes locaciones registradas. Crea una primero.</p>}
                          </div>

                          <div className="flex-1 flex flex-col">
                              <div className="flex justify-between items-center mb-2">
                                  <label className="block text-sm font-medium text-blue-900">Dibujar o Importar</label>
                                  {/* KML IMPORT BUTTON */}
                                  <div className="relative">
                                      <input 
                                        type="file" 
                                        accept=".kml" 
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleKMLUpload}
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                                        title="Importar polígono desde Google Earth (.kml)"
                                      >
                                          <FileUp size={12} className="mr-1"/> Importar KML
                                      </button>
                                  </div>
                              </div>
                              
                              {/* MAP EDITOR COMPONENT */}
                              {formData.locationId ? (
                                  <MapEditor 
                                    initialCenter={mapCenter}
                                    initialPolygon={formData.polygon || []}
                                    onPolygonChange={handlePolygonChange}
                                    height="300px"
                                  />
                              ) : (
                                  <div className="bg-gray-200 rounded h-64 flex items-center justify-center text-gray-500 text-sm border-2 border-dashed border-gray-300">
                                      Selecciona una locación para ver el mapa
                                  </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                  <div>
                                      <label className="block text-xs font-medium text-blue-900 mb-1 flex items-center justify-between">
                                          Latitud (Centro)
                                          <Navigation size={10} className="text-blue-500" />
                                      </label>
                                      {/* Changed to text for DMS parsing */}
                                      <input 
                                        type="text" 
                                        placeholder="-34.56 o 34°S" 
                                        className={inputClass} 
                                        value={formData.lat} 
                                        onChange={e => setFormData({...formData, lat: e.target.value})} 
                                        onBlur={() => handleCoordinateBlur('lat')}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-blue-900 mb-1 flex items-center justify-between">
                                          Longitud (Centro)
                                          <Navigation size={10} className="text-blue-500" />
                                      </label>
                                      {/* Changed to text for DMS parsing */}
                                      <input 
                                        type="text" 
                                        placeholder="-58.44 o 58°W" 
                                        className={inputClass} 
                                        value={formData.lng} 
                                        onChange={e => setFormData({...formData, lng: e.target.value})} 
                                        onBlur={() => handleCoordinateBlur('lng')}
                                      />
                                  </div>
                              </div>
                              <p className="text-[10px] text-blue-700 mt-1">
                                  Soporta Grados Decimales (-34.5) o DMS (34°30'S). Se convierte automáticamente.
                              </p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><UserCheck size={14} className="mr-1" /> Responsables Asignados</label>
                    <div className="border border-gray-300 bg-white rounded p-2 h-24 overflow-y-auto text-xs grid grid-cols-2 gap-1">
                      {assignableUsers.map(u => (
                          <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input type="checkbox" className="rounded text-hemp-600 focus:ring-hemp-500" checked={formData.responsibleIds?.includes(u.id)} onChange={() => toggleResponsible(u.id)} />
                              <span className="text-gray-900">{u.name}</span>
                          </label>
                      ))}
                   </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
                    <textarea className={`${inputClass} h-24`} value={formData.observations || ''} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Notas sobre el suelo, condiciones iniciales, etc."></textarea>
                  </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                {editingId && canManagePlots ? (
                     <button type="button" onClick={() => handleDelete()} className="text-red-500 hover:text-red-700 text-sm flex items-center px-2 py-1 hover:bg-red-50 rounded transition"><Trash2 size={16} className="mr-1"/> Eliminar Parcela</button>
                ) : <div></div>}
                
                <div className="flex space-x-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
