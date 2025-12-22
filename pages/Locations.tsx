
import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Location, SoilType, RoleType, Plot } from '../types';
import { Plus, MapPin, User, Globe, Edit2, Trash2, Briefcase, Building, Landmark, GraduationCap, Users, Droplets, Navigation, X, ScanBarcode, Loader2, Save, Search, Filter, ExternalLink, FileUp, LayoutDashboard } from 'lucide-center';
import { Link } from 'react-router-dom';
import WeatherWidget from '../components/WeatherWidget';
import MapEditor from '../components/MapEditor';

const ARG_GEO: Record<string, string[]> = {
    "Buenos Aires": ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "Pergamino", "Junín", "Olavarría", "San Nicolás", "Balcarce", "Castelar", "CABA", "San Pedro", "Trenque Lauquen", "Pehuajó", "9 de Julio", "Bolívar", "Saladillo", "Lobos", "Chascomús", "Necochea", "Tres Arroyos", "General Villegas", "Lincoln", "Chivilcoy", "Chacabuco", "Bragado", "25 de Mayo", "Azul", "Coronel Suárez", "Pigüé", "Carhué", "San Antonio de Areco", "Arrecifes", "Salto", "Rojas", "Mercedes", "Luján", "Cañuelas", "Las Flores"],
    "Catamarca": ["San Fernando del Valle de Catamarca", "Andalgalá", "Tinogasta", "Belén", "Santa María", "Recreo", "Fiambalá"],
    "Chaco": ["Resistencia", "Sáenz Peña", "Villa Ángela", "Charata", "Castelli", "San Martín", "Las Breñas", "Quitilipi", "Machagai", "Pampa del Infierno"],
    "Chubut": ["Rawson", "Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Esquel", "Trevelin", "Sarmiento", "Gaiman", "Dolavon", "Lago Puelo"],
    "Córdoba": ["Córdoba Capital", "Río Cuarto", "Villa María", "San Francisco", "Carlos Paz", "Alta Gracia", "Jesús María", "Río Tercero", "Bell Ville", "Marcos Juárez", "Laboulaye", "La Carlota", "Vicuña Mackenna", "Huinca Renancó", "Villa Dolores", "Cruz del Eje", "Deán Funes", "Morteros", "Las Varillas", "Oncativo", "Oliva"],
    "Corrientes": ["Corrientes Capital", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Mercedes", "Bella Vista", "Santo Tomé", "Esquina", "Monte Caseros", "Virasoro"],
    "Entre Ríos": ["Paraná", "Concordia", "Gualeguaychú", "Concepción del Uruguay", "Villaguay", "Victoria", "La Paz", "Nogoyá", "Diamante", "Crespo", "Chajarí", "Federación", "San Salvador", "Rosario del Tala", "Gualeguay"],
    "Formosa": ["Formosa Capital", "Clorinda", "Pirané", "El Colorado", "Las Lomitas", "Ibarreta"],
    "Jujuy": ["San Salvador de Jujuy", "Perico", "San Pedro", "Ledesma", "Libertador Gral. San Martín", "Palpalá", "Humahuaca", "Tilcara", "La Quiaca"],
    "La Pampa": ["Santa Rosa", "General Pico", "General Acha", "Eduardo Castex", "Realicó", "Intendente Alvear", "Victorica", "Macachín", "Guatraché"],
    "La Rioja": ["La Rioja Capital", "Chilecito", "Aimogasta", "Chamical", "Villa Unión", "Chepes"],
    "Mendoza": ["Mendoza Capital", "San Rafael", "Godoy Cruz", "Maipú", "Luján de Cuyo", "San Martín", "General Alvear", "Malargüe", "Tunuyán", "Tupungato", "Rivadavia", "Junín"],
    "Misiones": ["Posadas", "Eldorado", "Oberá", "Puerto Iguazú", "Apóstoles", "Leandro N. Alem", "San Vicente", "Montecarlo", "Puerto Rico"],
    "Neuquén": ["Neuquén Capital", "San Martín de los Andes", "Zapala", "Cutral Có", "Plaza Huincul", "Centenario", "Villa La Angostura", "Junín de los Andes", "Chos Malal"],
    "Río Negro": ["Viedma", "General Roca", "Bariloche", "Cipolletti", "Villa Regina", "Allen", "Cinco Saltos", "Choele Choel", "Río Colorado", "El Bolsón", "San Antonio Oeste"],
    "Salta": ["Salta Capital", "Orán", "Tartagal", "General Güemes", "Cafayate", "Metán", "Rosario de la Frontier", "Joaquín V. González", "Las Lajitas", "Embarcación"],
    "San Juan": ["San Juan Capital", "Caucete", "Jáchal", "Pocito", "Rawson", "Rivadavia", "Santa Lucía", "Albardón"],
    "San Luis": ["San Luis Capital", "Villa Mercedes", "Merlo", "Justo Daract", "La Punta", "Quines", "Santa Rosa del Conlara"],
    "Santa Cruz": ["Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Las Heras", "Puerto Deseado", "Río Turbio"],
    "Santa Fe": ["Santa Fe Capital", "Rosario", "Rafaela", "Venado Tuerto", "Reconquista", "Santo Tomé", "Villa Constitución", "San Lorenzo", "Esperanza", "Casilda", "Cañada de Gómez", "Firmat", "Rufino", "Sunchales", "Gálvez", "San Jorge", "Vera", "San Justo"],
    "Santiago del Estero": ["Santiago del Estero Capital", "La Banda", "Termas de Río Hondo", "Frías", "Añatuya", "Fernández", "Quimilí", "Loreto"],
    "Tierra del Fuego": ["Ushuaia", "Río Grande", "Tolhuin"],
    "Tucumán": ["San Miguel de Tucumán", "Tafí Viejo", "Concepción", "Yerba Buena", "Banda del Río Salí", "Aguilares", "Monteros", "Famaillá"]
};

const parseKML = (kmlText: string): { lat: number, lng: number }[] | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const allCoords = Array.from(xmlDoc.querySelectorAll("*")).filter(el => el.tagName.toLowerCase().endsWith('coordinates'));
        if (allCoords.length === 0) return null;
        allCoords.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
        const targetNode = allCoords[0];
        const text = targetNode.textContent || "";
        const rawPoints = text.trim().split(/\s+/);
        const latLngs = rawPoints.map(point => {
            const parts = point.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
            }
            return null;
        }).filter((p): p is { lat: number, lng: number } => p !== null);
        return latLngs.length >= 3 ? latLngs : null;
    } catch (e) {
        console.error("Error parsing KML", e);
        return null;
    }
};

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
        if (dir === 'S' || dir === 'W' || clean.includes('S') || clean.includes('W')) decimal = decimal * -1;
        return decimal.toFixed(6);
    }
    return input;
};

export default function Locations() {
  const { locations, addLocation, updateLocation, deleteLocation, currentUser, clients, plots } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<Partial<Location> & { lat: string, lng: string }>({
    name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
    responsiblePerson: '', lat: '', lng: '',
    clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', 
    capacityHa: 0, irrigationSystem: '',
    responsibleIds: [],
    polygon: []
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';
  const canManage = isAdmin || isClient;

  const visibleLocations = locations.filter(l => {
      let matches = true;
      if (isClient && currentUser.clientId) matches = (l.clientId === currentUser.clientId || l.responsibleIds?.includes(currentUser.id));
      else if (!isAdmin) matches = l.responsibleIds?.includes(currentUser?.id || '');
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          matches = matches && (l.name.toLowerCase().includes(lowerTerm) || l.city?.toLowerCase().includes(lowerTerm));
      }
      if (filterProvince) matches = matches && l.province === filterProvince;
      return matches;
  });

  const stats = useMemo(() => {
      const totalLocs = visibleLocations.length;
      const totalHa = visibleLocations.reduce((sum, l) => sum + (l.capacityHa || 0), 0);
      const activePlots = plots.filter(p => p.status === 'Activa' && visibleLocations.some(l => l.id === p.locationId));
      const occupiedHa = activePlots.reduce((sum, p) => {
          let area = p.surfaceArea || 0;
          if (p.surfaceUnit === 'm2') area = area / 10000;
          if (p.surfaceUnit === 'ac') area = area * 0.404686;
          return sum + area;
      }, 0);
      return { totalLocs, totalHa, occupiedHa, occupancyRate: totalHa > 0 ? (occupiedHa / totalHa) * 100 : 0, activePlotsCount: activePlots.length };
  }, [visibleLocations, plots]);

  const handleKMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const poly = parseKML(text);
          if (poly && poly.length > 2) {
              const R = 6371000;
              const toRad = (x: number) => x * Math.PI / 180;
              let area = 0;
              const lats = poly.map(p => p.lat);
              const lngs = poly.map(p => p.lng);
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
              for (let i = 0; i < poly.length; i++) {
                  const j = (i + 1) % poly.length;
                  const p1 = poly[i];
                  const p2 = poly[j];
                  area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
              }
              area = Math.abs(area * R * R / 2) / 10000;
              setFormData(prev => ({ ...prev, polygon: poly, capacityHa: Number(area.toFixed(2)), lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) }));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
      setFormData(prev => ({ ...prev, polygon: newPoly, capacityHa: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.capacityHa, lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    const finalLat = parseFloat(parseCoordinate(formData.lat || '0'));
    const finalLng = parseFloat(parseCoordinate(formData.lng || '0'));
    const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

    const payload: any = {
      name: formData.name!.trim(), 
      province: formData.province || '', 
      city: formData.city || '', 
      address: formData.address || '', 
      soilType: formData.soilType || 'Franco', 
      climate: formData.climate || '', 
      responsiblePerson: formData.responsiblePerson || '',
      coordinates, 
      polygon: (Array.isArray(formData.polygon) && formData.polygon.length > 0) ? formData.polygon : [], 
      clientId: formData.clientId || null, 
      ownerName: formData.ownerName || '', 
      ownerLegalName: formData.ownerLegalName || '', 
      ownerCuit: formData.ownerCuit || '', 
      ownerContact: formData.ownerContact || '', 
      ownerType: formData.ownerType as RoleType, 
      capacityHa: Number(formData.capacityHa || 0), 
      irrigationSystem: formData.irrigationSystem || '', 
      responsibleIds: Array.isArray(formData.responsibleIds) ? formData.responsibleIds : []
    };

    try {
        let success = false;
        if (editingId) success = await updateLocation({ ...payload, id: editingId });
        else success = await addLocation({ ...payload, id: Date.now().toString() });
        if (success) { setIsModalOpen(false); resetForm(); }
    } finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setFormData({ name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', responsiblePerson: '', lat: '', lng: '', clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', capacityHa: 0, irrigationSystem: '', responsibleIds: [], polygon: [] });
    setEditingId(null);
  };

  const handleEdit = (loc: Location) => {
      setFormData({ 
          ...loc, 
          lat: loc.coordinates?.lat.toString() || '', 
          lng: loc.coordinates?.lng.toString() || '', 
          polygon: loc.polygon || [], 
          province: loc.province || '', 
          city: loc.city || '', 
          ownerType: loc.ownerType || 'Empresa Privada', 
          ownerLegalName: loc.ownerLegalName || '', 
          ownerCuit: loc.ownerCuit || '', 
          ownerContact: loc.ownerContact || '', 
          clientId: loc.clientId || '', 
          capacityHa: loc.capacityHa || 0, 
          irrigationSystem: loc.irrigationSystem || '',
          responsibleIds: Array.isArray(loc.responsibleIds) ? loc.responsibleIds : []
      });
      setEditingId(loc.id);
      setIsModalOpen(true);
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
              <div>
                  <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center uppercase tracking-tight italic">
                      <LayoutDashboard className="mr-2 text-hemp-600"/> Gestión de Campos
                  </h1>
                  <p className="text-sm text-gray-500">Centro de control de establecimientos productivos.</p>
              </div>
              {canManage && (
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-sm font-bold text-sm">
                  <Plus size={18} className="mr-2" /> Nuevo Campo
                </button>
              )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-slate-950 rounded-lg p-4 border border-gray-100 dark:border-slate-800"><div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Total Establecimientos</div><div className="text-2xl font-black text-gray-800 dark:text-white">{stats.totalLocs}</div></div>
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-900/20"><div className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1 tracking-widest">Capacidad Total</div><div className="text-2xl font-black text-blue-900 dark:text-blue-300">{stats.totalHa.toFixed(1)} ha</div></div>
              <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-100 dark:border-green-900/20"><div className="flex justify-between items-center mb-1"><div className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Ocupación Activa</div><span className="text-xs font-bold text-green-600">{stats.occupancyRate.toFixed(1)}%</span></div><div className="w-full bg-green-200 dark:bg-slate-800 rounded-full h-2 mb-2"><div className="bg-green-600 h-2 rounded-full" style={{width: `${Math.min(stats.occupancyRate, 100)}%`}}></div></div><div className="text-xs text-green-800 dark:text-green-500 font-bold">{stats.occupiedHa.toFixed(1)} ha en {stats.activePlotsCount} cultivos</div></div>
          </div>
      </div>

      <div className="flex flex-col sm:row gap-4 mb-6">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar campo..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none text-sm dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="relative w-full sm:w-64"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><select className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-hemp-500 outline-none text-sm appearance-none bg-white dark:bg-slate-900 dark:text-white" value={filterProvince} onChange={e => setFilterProvince(e.target.value)}><option value="">Todas las Provincias</option>{Object.keys(ARG_GEO).sort().map(p => ( <option key={p} value={p}>{p}</option> ))}</select></div>
      </div>

      <div className="space-y-6">
        {visibleLocations.map(loc => (
          <div key={loc.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 h-32 md:h-auto bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden border dark:border-slate-700">{loc.coordinates ? <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}&z=14&output=embed`} className="opacity-80"></iframe> : <div className="flex items-center justify-center h-full text-gray-400"><Globe size={32} /></div>}</div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div><h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase">{loc.name}</h3><p className="text-gray-500 text-sm">{loc.city}, {loc.province}</p></div>
                        <div className="flex space-x-2">
                            <Link to={`/locations/${loc.id}`} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-xs font-black uppercase rounded-lg">Auditoría</Link>
                            {canManage && <button onClick={() => handleEdit(loc)} className="p-1.5 text-gray-400 hover:text-hemp-600"><Edit2 size={16} /></button>}
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <span className="text-[10px] font-black uppercase bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{loc.capacityHa} Ha</span>
                        <span className="text-[10px] font-black uppercase bg-blue-50 dark:bg-blue-900/20 text-blue-700 px-2 py-1 rounded">{loc.irrigationSystem}</span>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black dark:text-white uppercase italic">Gestionar <span className="text-hemp-600">Establecimiento</span></h2>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="p-2 text-slate-400"><X size={28}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Datos Maestros</label>
                          <div className="space-y-4">
                              <input required placeholder="Nombre Fantasía *" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                              <div className="grid grid-cols-2 gap-4">
                                  <select className={inputClass} value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})}><option value="">Provincia...</option>{Object.keys(ARG_GEO).sort().map(p => ( <option key={p} value={p}>{p}</option> ))}</select>
                                  <input placeholder="Ciudad" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                              </div>
                              <input placeholder="Dirección / Acceso Rural" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                          </div>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[32px] border dark:border-indigo-900/30">
                          <select className={inputClass} value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})}><option value="">Socio Responsable...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                  </div>
                  <div className="flex flex-col">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border dark:border-blue-900/30 flex-1">
                          <div className="flex justify-between mb-4"><h3 className="text-[10px] font-black uppercase text-blue-700">Georreferencia</h3><input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} /><button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black uppercase text-blue-600 bg-white px-3 py-1 rounded-lg border shadow-sm flex items-center"><FileUp size={12} className="mr-1"/> KML</button></div>
                          <div className="h-64 border dark:border-slate-800 rounded-[24px] overflow-hidden mb-4"><MapEditor initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} initialPolygon={formData.polygon || []} onPolygonChange={handlePolygonChange} height="100%" /></div>
                          <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Lat" className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                                <input placeholder="Lng" className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-end pt-8 border-t dark:border-slate-800">
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {editingId ? 'Actualizar' : 'Finalizar Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
