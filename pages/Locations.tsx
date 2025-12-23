
import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Location, SoilType, RoleType, Plot } from '../types';
import { Plus, MapPin, User, Globe, Edit2, Trash2, Briefcase, Building, Landmark, GraduationCap, Users, Droplets, Navigation, X, ScanBarcode, Loader2, Save, Search, Filter, ExternalLink, FileUp, LayoutDashboard, Map as MapIcon, ChevronRight, Info, Eye, Waves } from 'lucide-react';
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

const SOIL_TYPES = ["Franco", "Franco Arenoso", "Franco Arcilloso", "Arenoso", "Arcilloso", "Limoso", "Sustrato Controlado"];
const IRRIGATION_SYSTEMS = ["Secano (Lluvia)", "Pivot Central", "Goteo", "Aspersión", "Gravedad / Surcos", "Microaspersión"];

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

export default function Locations() {
  const { locations, addLocation, updateLocation, deleteLocation, currentUser, clients, plots } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState('');

  const [formData, setFormData] = useState<Partial<Location> & { lat: string, lng: string }>({
    name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
    responsiblePerson: '', lat: '', lng: '',
    clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', 
    capacityHa: 0, irrigationSystem: 'Secano (Lluvia)',
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
    const finalLat = parseFloat(formData.lat || '0');
    const finalLng = parseFloat(formData.lng || '0');
    const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

    const payload: any = {
      ...formData,
      coordinates, 
      id: editingId || Date.now().toString()
    };

    try {
        let success = false;
        if (editingId) success = await updateLocation(payload);
        else success = await addLocation(payload);
        if (success) { setIsModalOpen(false); resetForm(); }
    } finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setFormData({ name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', responsiblePerson: '', lat: '', lng: '', clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', capacityHa: 0, irrigationSystem: 'Secano (Lluvia)', responsibleIds: [], polygon: [] });
    setEditingId(null);
  };

  const handleEdit = (loc: Location) => {
      setFormData({ 
          ...loc, 
          lat: loc.coordinates?.lat.toString() || '', 
          lng: loc.coordinates?.lng.toString() || '', 
          polygon: loc.polygon || [], 
          responsibleIds: Array.isArray(loc.responsibleIds) ? loc.responsibleIds : []
      });
      setEditingId(loc.id);
      setIsModalOpen(true);
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50 text-sm";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-gray-200 dark:border-slate-800 p-8 mb-8">
          <div className="flex justify-between items-start mb-8">
              <div>
                  <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center uppercase tracking-tighter italic">
                      <LayoutDashboard className="mr-3 text-hemp-600" size={32}/> Gestión de Campos
                  </h1>
                  <p className="text-sm text-gray-500">Centro de control de establecimientos productivos.</p>
              </div>
              {canManage && (
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
                  <Plus size={18} className="mr-2" /> Nuevo Campo
                </button>
              )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-slate-950 rounded-2xl p-5 border border-gray-100 dark:border-slate-800"><div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Establecimientos</div><div className="text-3xl font-black text-gray-800 dark:text-white">{stats.totalLocs}</div></div>
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/20"><div className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1 tracking-widest">Superficie Declarada</div><div className="text-3xl font-black text-blue-900 dark:text-blue-300">{stats.totalHa.toFixed(1)} ha</div></div>
              <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-5 border border-green-100 dark:border-green-900/20"><div className="flex justify-between items-center mb-1"><div className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Ocupación Activa</div><span className="text-xs font-bold text-green-600">{stats.occupancyRate.toFixed(1)}%</span></div><div className="w-full bg-green-200 dark:bg-slate-800 rounded-full h-2 mb-2"><div className="bg-green-600 h-2 rounded-full" style={{width: `${Math.min(stats.occupancyRate, 100)}%`}}></div></div><div className="text-xs text-green-800 dark:text-green-500 font-bold">{stats.occupiedHa.toFixed(1)} ha sembradas</div></div>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Buscar campo por nombre o ciudad..." className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none text-sm dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="relative w-full sm:w-72"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><select className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none text-xs font-black uppercase appearance-none bg-white dark:bg-slate-900 dark:text-white tracking-widest" value={filterProvince} onChange={e => setFilterProvince(e.target.value)}><option value="">Todas las Provincias</option>{Object.keys(ARG_GEO).sort().map(p => ( <option key={p} value={p}>{p}</option> ))}</select></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleLocations.map(loc => (
          <div key={loc.id} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all flex flex-col h-full group">
            <div className="h-44 relative bg-gray-100 dark:bg-slate-800 border-b dark:border-slate-800">
                {loc.coordinates ? (
                  <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}&z=14&output=embed`} className="opacity-80 group-hover:opacity-100 transition-opacity"></iframe>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 opacity-30"><Globe size={48} /></div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border dark:border-slate-800">
                    <WeatherWidget lat={loc.coordinates?.lat || 0} lng={loc.coordinates?.lng || 0} compact={true}/>
                </div>
                <div className="absolute bottom-4 right-4 flex space-x-1">
                    <button onClick={() => handleEdit(loc)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-gray-500 hover:text-hemp-600 shadow-lg border dark:border-slate-700 transition"><Edit2 size={16} /></button>
                    <button onClick={() => { if(window.confirm("¿Eliminar sitio?")) deleteLocation(loc.id); }} className="p-2.5 bg-white dark:bg-slate-800 text-gray-500 hover:text-red-600 shadow-lg border dark:border-slate-700 transition"><Trash2 size={16} /></button>
                </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-hemp-600 transition-colors">{loc.name}</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{loc.city}, {loc.province}</p>
                    </div>
                    <Link to={`/locations/${loc.id}`} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-hemp-600 transition-all"><Eye size={18}/></Link>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Capacidad</p>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{loc.capacityHa || 0} Ha</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Riego</p>
                        <p className="text-sm font-black text-blue-600 truncate px-1" title={loc.irrigationSystem}>{loc.irrigationSystem?.split(' ')[0] || 'Secano'}</p>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t dark:border-slate-800">
                    <Link to={`/locations/${loc.id}`} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:scale-[1.02] transition-all shadow-lg">
                        Entrar al Establecimiento <ChevronRight size={14} className="ml-2"/>
                    </Link>
                </div>
            </div>
          </div>
        ))}
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-5xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Globe size={28}/></div>
                    <div>
                        <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter italic">Lanzar <span className="text-hemp-600">Establecimiento</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocolo de alta georreferenciada para establecimientos</p>
                    </div>
                </div>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><Info size={14} className="mr-2 text-hemp-500"/> Ficha Primaria</h3>
                          <div className="space-y-4">
                              <div>
                                <label className="text-[9px] font-black uppercase text-gray-400 ml-1 mb-1 block">Nombre Comercial / Fantasía *</label>
                                <input required placeholder="Ej: Don Pedro / Campo Norte" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 mb-1 block">Provincia *</label>
                                    <select required className={inputClass} value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})}><option value="">Seleccionar...</option>{Object.keys(ARG_GEO).sort().map(p => ( <option key={p} value={p}>{p}</option> ))}</select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 mb-1 block">Localidad / Ciudad</label>
                                    <input placeholder="Ej: Trelew" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                  </div>
                              </div>
                              <input placeholder="Dirección / Acceso Rural" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                          </div>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                          <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-6 border-b border-emerald-100 dark:border-emerald-900/30 pb-3 flex items-center"><Waves size={14} className="mr-2"/> Especificaciones Técnicas</h3>
                          <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 ml-1 mb-1 block">Tipo de Suelo Principal</label>
                                    <select className={inputClass} value={formData.soilType} onChange={e => setFormData({...formData, soilType: e.target.value})}>
                                        {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 ml-1 mb-1 block">Sistema de Riego</label>
                                    <select className={inputClass} value={formData.irrigationSystem} onChange={e => setFormData({...formData, irrigationSystem: e.target.value})}>
                                        {IRRIGATION_SYSTEMS.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                          </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                          <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center"><Building size={14} className="mr-2"/> Atribución de Propiedad</h3>
                          <div className="space-y-4">
                            <input placeholder="Nombre Propietario / Titular" className={inputClass} value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                            <select className={inputClass} value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})}><option value="">Asignar a Socio de Red...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                          </div>
                      </div>
                  </div>

                  <div className="flex flex-col h-full">
                      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800 flex-1 flex flex-col min-h-[400px]">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-400 tracking-widest flex items-center"><MapIcon size={14} className="mr-2"/> Perímetro General</h3>
                              <div className="flex gap-2">
                                  <input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} />
                                  <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border dark:border-slate-700 shadow-sm flex items-center hover:bg-slate-50 transition">
                                      <FileUp size={14} className="mr-1.5"/> Importar KML
                                  </button>
                              </div>
                          </div>
                          <div className="flex-1 min-h-[250px] border dark:border-slate-800 rounded-[24px] overflow-hidden mb-4 bg-slate-200 shadow-inner">
                            <MapEditor 
                                initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} 
                                initialPolygon={formData.polygon || []} 
                                onPolygonChange={handlePolygonChange} 
                                height="100%" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Latitud GPS" className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                                <input placeholder="Longitud GPS" className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-end pt-8 border-t dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest mr-2">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {editingId ? 'Actualizar Campo' : 'Lanzar Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
