
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Location, SoilType, RoleType, Plot } from '../types';
import { Plus, MapPin, User, Globe, Edit2, Trash2, Keyboard, List, Briefcase, Building, Landmark, GraduationCap, Users, Droplets, Ruler, Navigation, ChevronDown, ChevronUp, Sprout, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Expanded Argentina Database with Rural Hubs
const ARG_GEO: Record<string, string[]> = {
    "Buenos Aires": [
        "La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "Pergamino", "Junín", "Olavarría", "San Nicolás", "Balcarce", "Castelar", "CABA", "San Pedro",
        "Trenque Lauquen", "Pehuajó", "9 de Julio", "Bolívar", "Saladillo", "Lobos", "Chascomús", "Necochea", "Tres Arroyos", 
        "General Villegas", "Lincoln", "Chivilcoy", "Chacabuco", "Bragado", "25 de Mayo", "Azul", "Coronel Suárez", "Pigüé", "Carhué",
        "San Antonio de Areco", "Arrecifes", "Salto", "Rojas", "Mercedes", "Luján", "Cañuelas", "Las Flores"
    ],
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
    "Salta": ["Salta Capital", "Orán", "Tartagal", "General Güemes", "Cafayate", "Metán", "Rosario de la Frontera", "Joaquín V. González", "Las Lajitas", "Embarcación"],
    "San Juan": ["San Juan Capital", "Caucete", "Jáchal", "Pocito", "Rawson", "Rivadavia", "Santa Lucía", "Albardón"],
    "San Luis": ["San Luis Capital", "Villa Mercedes", "Merlo", "Justo Daract", "La Punta", "Quines", "Santa Rosa del Conlara"],
    "Santa Cruz": ["Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Las Heras", "Puerto Deseado", "Río Turbio"],
    "Santa Fe": ["Santa Fe Capital", "Rosario", "Rafaela", "Venado Tuerto", "Reconquista", "Santo Tomé", "Villa Constitución", "San Lorenzo", "Esperanza", "Casilda", "Cañada de Gómez", "Firmat", "Rufino", "Sunchales", "Gálvez", "San Jorge", "Vera", "San Justo"],
    "Santiago del Estero": ["Santiago del Estero Capital", "La Banda", "Termas de Río Hondo", "Frías", "Añatuya", "Fernández", "Quimilí", "Loreto"],
    "Tierra del Fuego": ["Ushuaia", "Río Grande", "Tolhuin"],
    "Tucumán": ["San Miguel de Tucumán", "Tafí Viejo", "Concepción", "Yerba Buena", "Banda del Río Salí", "Aguilares", "Monteros", "Famaillá"]
};

// Helper: Convert DMS to Decimal
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
        
        if (!dir) {
            if (clean.includes('S') || clean.includes('W')) dir = 'S';
        }

        let decimal = deg + (min / 60) + (sec / 3600);
        if (dir === 'S' || dir === 'W' || clean.includes('S') || clean.includes('W')) {
            decimal = decimal * -1;
        }
        return decimal.toFixed(6);
    }
    return input;
};

export default function Locations() {
  const { locations, addLocation, updateLocation, deleteLocation, currentUser, usersList, clients, plots, addPlot, varieties, projects, seedBatches } = useAppContext();
  
  // Location States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isManualCity, setIsManualCity] = useState(false);
  
  // Plot Creation State (Directly from Location)
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [targetLocationId, setTargetLocationId] = useState<string | null>(null);

  // Expanded State for Cards
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

  // Forms
  const [formData, setFormData] = useState<Partial<Location> & { lat: string, lng: string }>({
    name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
    responsiblePerson: '', lat: '', lng: '',
    clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', 
    capacityHa: 0, irrigationSystem: '',
    responsibleIds: []
  });

  const [plotFormData, setPlotFormData] = useState<Partial<Plot>>({
      name: '', type: 'Ensayo', varietyId: '', projectId: '', sowingDate: new Date().toISOString().split('T')[0],
      block: '1', replicate: 1, surfaceArea: 0, surfaceUnit: 'ha', density: 0, status: 'Activa'
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';
  const canManage = isAdmin || isClient;

  // Filter Locations
  const visibleLocations = locations.filter(l => {
      if (isAdmin) return true;
      if (isClient && currentUser.clientId) {
          return l.clientId === currentUser.clientId || l.responsibleIds?.includes(currentUser.id);
      }
      return l.responsibleIds?.includes(currentUser?.id || '');
  });

  const toggleExpand = (id: string) => {
      setExpandedLocations(prev => ({...prev, [id]: !prev[id]}));
  };

  // --- LOCATION HANDLERS ---
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const finalLat = parseFloat(parseCoordinate(formData.lat));
    const finalLng = parseFloat(parseCoordinate(formData.lng));

    const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) 
      ? { lat: finalLat, lng: finalLng }
      : undefined;

    // Resolve client info
    let ownerName = formData.ownerName;
    let ownerType = formData.ownerType;
    let ownerContact = formData.ownerContact;
    let ownerCuit = formData.ownerCuit;
    let clientId = formData.clientId;

    if (isClient && currentUser.clientId) {
        clientId = currentUser.clientId;
        const c = clients.find(cl => cl.id === clientId);
        if (c) {
            ownerName = c.name;
            ownerType = c.type;
            ownerContact = `${c.contactName} (${c.email || c.contactPhone})`;
            ownerCuit = c.cuit;
        }
    } else if (formData.clientId) {
        const client = clients.find(c => c.id === formData.clientId);
        if (client) {
            ownerName = client.name;
            ownerType = client.type;
            ownerContact = `${client.contactName} (${client.email || client.contactPhone})`;
            ownerCuit = client.cuit;
        }
    }

    let finalResponsibles = formData.responsibleIds || [];
    if (isClient && !finalResponsibles.includes(currentUser!.id)) {
        finalResponsibles.push(currentUser!.id);
    }

    const payload: any = {
      name: formData.name!,
      province: formData.province || '',
      city: formData.city || '',
      address: formData.address || '',
      soilType: formData.soilType as SoilType,
      climate: formData.climate || '',
      responsiblePerson: formData.responsiblePerson || '',
      coordinates,
      clientId: clientId || null,
      ownerName: ownerName || '',
      ownerLegalName: formData.ownerLegalName || '',
      ownerCuit: ownerCuit || '',
      ownerContact: ownerContact || '',
      ownerType: ownerType as RoleType,
      capacityHa: Number(formData.capacityHa),
      irrigationSystem: formData.irrigationSystem || '',
      responsibleIds: finalResponsibles
    };

    if (editingId) updateLocation({ ...payload, id: editingId });
    else addLocation({ ...payload, id: Date.now().toString() });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
        responsiblePerson: '', lat: '', lng: '',
        clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', 
        capacityHa: 0, irrigationSystem: '',
        responsibleIds: []
    });
    setEditingId(null);
    setIsManualCity(false);
  };

  const handleEdit = (loc: Location) => {
      const provinceCities = loc.province && ARG_GEO[loc.province] ? ARG_GEO[loc.province] : [];
      const isStandardCity = loc.city && provinceCities.includes(loc.city);
      
      setFormData({
          ...loc,
          lat: loc.coordinates?.lat.toString() || '',
          lng: loc.coordinates?.lng.toString() || '',
          province: loc.province || '',
          city: loc.city || '',
          ownerType: loc.ownerType || 'Empresa Privada',
          ownerLegalName: loc.ownerLegalName || '',
          ownerCuit: loc.ownerCuit || '',
          ownerContact: loc.ownerContact || '',
          clientId: loc.clientId || '',
          capacityHa: loc.capacityHa || 0,
          irrigationSystem: loc.irrigationSystem || ''
      });
      setEditingId(loc.id);
      setIsManualCity(!isStandardCity && !!loc.city);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Estás seguro de eliminar este sitio? Afectará a los ensayos históricos.")) deleteLocation(id);
  };

  // --- PLOT HANDLERS ---
  const openPlotModal = (locId: string) => {
      setTargetLocationId(locId);
      setPlotFormData({
          name: '', type: 'Ensayo', varietyId: '', projectId: '', sowingDate: new Date().toISOString().split('T')[0],
          block: '1', replicate: 1, surfaceArea: 0, surfaceUnit: 'ha', density: 0, status: 'Activa'
      });
      setIsPlotModalOpen(true);
  };

  const handlePlotSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!targetLocationId || !plotFormData.varietyId) return;

      const loc = locations.find(l => l.id === targetLocationId);
      const v = varieties.find(v => v.id === plotFormData.varietyId);
      const varCode = v ? v.name.substring(0, 3).toUpperCase() : 'VAR';
      
      let autoName = '';
      if (plotFormData.type === 'Producción') {
          autoName = `LOTE-${plotFormData.block}-${varCode}`; 
      } else {
          autoName = `${varCode}-B${plotFormData.block}-R${plotFormData.replicate}`; 
      }

      // Default project if not selected (for Clients)
      let finalProjectId = plotFormData.projectId;
      if (!finalProjectId && projects.length > 0) {
          finalProjectId = projects[0].id;
      }

      const newPlot: any = {
          ...plotFormData,
          id: Date.now().toString(),
          locationId: targetLocationId,
          projectId: finalProjectId || '',
          name: plotFormData.name || autoName,
          ownerName: loc?.ownerName || 'Propio',
          responsibleIds: currentUser ? [currentUser.id] : [],
          rowDistance: 0,
          perimeter: 0,
          observations: 'Creado desde gestión de campos.',
          seedBatchId: null // Optional
      };

      addPlot(newPlot);
      setIsPlotModalOpen(false);
      
      // Auto expand location to show new plot
      setExpandedLocations(prev => ({...prev, [targetLocationId]: true}));
  };

  const getClientIcon = (type?: RoleType) => {
      if (type?.includes('Productor')) return <User size={16} className="text-green-600" />;
      switch(type) {
          case 'Empresa Privada': return <Building size={16} className="text-gray-500" />;
          case 'Gobierno': return <Landmark size={16} className="text-blue-500" />;
          case 'Academia': return <GraduationCap size={16} className="text-purple-500" />;
          default: return <Users size={16} className="text-gray-400" />;
      }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Campos y Cultivos</h1>
            <p className="text-sm text-gray-500">Gestión integrada de establecimientos y sus unidades productivas.</p>
        </div>
        {canManage && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-sm">
            <Plus size={20} className="mr-2" /> Nuevo Campo
          </button>
        )}
      </div>

      <div className="space-y-6">
        {visibleLocations.length === 0 && (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed text-gray-500">
                No tienes campos registrados. Comienza agregando uno.
            </div>
        )}
        {visibleLocations.map(loc => {
          const locPlots = plots.filter(p => p.locationId === loc.id);
          const isExpanded = expandedLocations[loc.id];

          return (
            <div key={loc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
              {/* Location Header / Summary */}
              <div className="p-0 md:p-6 flex flex-col md:flex-row gap-6">
                  {/* Map Preview (Smaller) */}
                  <div className="w-full md:w-48 h-32 md:h-auto bg-gray-100 relative flex-shrink-0 md:rounded-lg overflow-hidden border-b md:border border-gray-200">
                    {loc.coordinates ? (
                       <iframe 
                         width="100%" 
                         height="100%" 
                         frameBorder="0" 
                         scrolling="no" 
                         marginHeight={0} 
                         marginWidth={0} 
                         src={`https://maps.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}&z=14&output=embed`}
                         className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                       ></iframe>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                        <Globe size={32} className="mb-2 opacity-50" />
                        <span className="text-[10px]">Sin GPS</span>
                      </div>
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="p-4 md:p-0 flex-1 flex flex-col justify-between">
                      <div>
                          <div className="flex justify-between items-start">
                              <div>
                                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                                      <MapPin size={20} className="mr-2 text-hemp-600" />
                                      {loc.name}
                                  </h3>
                                  <p className="text-gray-500 text-sm ml-7">{loc.city ? `${loc.city}, ` : ''}{loc.province} • {loc.address}</p>
                              </div>
                              {canManage && (
                                  <div className="flex space-x-2">
                                      <button onClick={() => handleEdit(loc)} className="p-1.5 text-gray-400 hover:text-hemp-600 hover:bg-gray-100 rounded">
                                          <Edit2 size={16} />
                                      </button>
                                      <button onClick={() => handleDelete(loc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              )}
                          </div>
                          
                          <div className="mt-3 flex flex-wrap gap-3">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border">
                                  {loc.capacityHa ? <strong>{loc.capacityHa} Ha</strong> : 'Sup. N/A'}
                              </span>
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                  {loc.irrigationSystem || 'Secano/Sin dato'}
                              </span>
                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 flex items-center">
                                  {getClientIcon(loc.ownerType)} <span className="ml-1">{loc.ownerName}</span>
                              </span>
                          </div>
                      </div>

                      {/* Expand/Collapse Plots Section */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                          <div className="text-sm font-medium text-gray-600">
                              {locPlots.length} Cultivos Activos
                          </div>
                          <div className="flex space-x-2">
                              {canManage && (
                                  <button onClick={() => openPlotModal(loc.id)} className="text-xs bg-hemp-50 text-hemp-700 px-3 py-1.5 rounded-lg font-bold hover:bg-hemp-100 flex items-center">
                                      <Plus size={14} className="mr-1"/> Agregar Lote
                                  </button>
                              )}
                              <button onClick={() => toggleExpand(loc.id)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 flex items-center">
                                  {isExpanded ? <ChevronUp size={14} className="mr-1"/> : <ChevronDown size={14} className="mr-1"/>}
                                  {isExpanded ? 'Ocultar' : 'Ver Lotes'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* EXPANDED PLOTS LIST */}
              {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-200 p-4 animate-in slide-in-from-top-2">
                      {locPlots.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm">
                              No hay cultivos registrados en este campo.
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {locPlots.map(p => {
                                  const vari = varieties.find(v => v.id === p.varietyId);
                                  return (
                                      <Link to={`/plots/${p.id}`} key={p.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition flex justify-between items-center group">
                                          <div>
                                              <h4 className="font-bold text-gray-800 text-sm flex items-center">
                                                  {p.type === 'Producción' ? <User size={12} className="text-green-600 mr-1"/> : <Sprout size={12} className="text-blue-600 mr-1"/>}
                                                  {p.name}
                                              </h4>
                                              <p className="text-xs text-gray-500 mt-0.5">{vari?.name} • {p.surfaceArea} {p.surfaceUnit}</p>
                                          </div>
                                          <div className="text-right">
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                  {p.status}
                                              </span>
                                              <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <ArrowRight size={14} className="text-gray-400 ml-auto"/>
                                              </div>
                                          </div>
                                      </Link>
                                  )
                              })}
                          </div>
                      )}
                  </div>
              )}
            </div>
          );
        })}
      </div>

       {/* LOCATION MODAL */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Campo' : 'Nuevo Campo'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                      <MapPin size={12} className="mr-1"/> Ubicación
                  </h3>
                  <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Establecimiento</label>
                        <input required type="text" placeholder="Ej: Campo La Soledad" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                            <select className={inputClass} value={formData.province} onChange={e => setFormData({...formData, province: e.target.value, city: ''})}>
                                <option value="">Seleccionar...</option>
                                {Object.keys(ARG_GEO).sort().map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                Ciudad/Localidad
                                <button type="button" onClick={() => setIsManualCity(!isManualCity)} className="text-hemp-600 text-xs font-semibold hover:underline flex items-center">
                                    {isManualCity ? <List size={12} className="mr-1"/> : <Keyboard size={12} className="mr-1"/>}
                                    {isManualCity ? "Lista" : "Manual"}
                                </button>
                            </label>
                            {isManualCity ? (
                                <input type="text" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}/>
                            ) : (
                                <select className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} disabled={!formData.province}>
                                    <option value="">Seleccionar...</option>
                                    {formData.province && ARG_GEO[formData.province]?.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            )}
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-xs font-medium text-blue-900 mb-1 flex items-center justify-between">
                                    Latitud
                                    <Navigation size={10} className="text-blue-500" />
                                </label>
                                <input type="text" placeholder="-34.5" className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} onBlur={() => handleCoordinateBlur('lat')}/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-blue-900 mb-1 flex items-center justify-between">
                                    Longitud
                                    <Navigation size={10} className="text-blue-500" />
                                </label>
                                <input type="text" placeholder="-58.4" className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} onBlur={() => handleCoordinateBlur('lng')}/>
                             </div>
                         </div>
                  </div>
              </div>

              {/* CLIENTE / TITULAR */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h3 className="text-xs font-bold text-indigo-700 uppercase mb-3 flex items-center">
                      <Briefcase size={12} className="mr-1"/> Titularidad
                  </h3>
                  {isAdmin && (
                      <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Vinculado</label>
                          <select className={inputClass} value={formData.clientId || ''} onChange={e => {
                                const selectedId = e.target.value;
                                if (selectedId) {
                                    const c = clients.find(cl => cl.id === selectedId);
                                    if (c) setFormData({ ...formData, clientId: c.id, ownerName: c.name, ownerType: c.type });
                                } else setFormData({...formData, clientId: ''});
                            }}>
                              <option value="">-- Sin Vincular --</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                  )}
                  {!formData.clientId && (
                      <input type="text" placeholder="Nombre del Propietario" className={inputClass} value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} disabled={isClient} />
                  )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar Campo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PLOT MODAL */}
      {isPlotModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in zoom-in-95">
              <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                      <Sprout size={24} className="mr-2 text-green-600"/>
                      Nuevo Cultivo en {locations.find(l => l.id === targetLocationId)?.name}
                  </h2>
                  <form onSubmit={handlePlotSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Lote (Opcional)</label>
                              <input type="text" placeholder="Generado autom. si vacío" className={inputClass} value={plotFormData.name} onChange={e => setPlotFormData({...plotFormData, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                              <select required className={inputClass} value={plotFormData.varietyId} onChange={e => setPlotFormData({...plotFormData, varietyId: e.target.value})}>
                                  <option value="">Seleccionar...</option>
                                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                              <select className={inputClass} value={plotFormData.type} onChange={e => setPlotFormData({...plotFormData, type: e.target.value as any})}>
                                  <option value="Ensayo">Ensayo I+D</option>
                                  <option value="Producción">Producción</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Superficie</label>
                              <div className="flex">
                                  <input type="number" step="0.1" className={`${inputClass} rounded-r-none border-r-0`} value={plotFormData.surfaceArea || ''} onChange={e => setPlotFormData({...plotFormData, surfaceArea: Number(e.target.value)})} />
                                  <select className="bg-gray-100 border border-l-0 border-gray-300 rounded-r px-2 text-sm" value={plotFormData.surfaceUnit} onChange={e => setPlotFormData({...plotFormData, surfaceUnit: e.target.value as any})}>
                                      <option value="ha">ha</option>
                                      <option value="m2">m²</option>
                                  </select>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Siembra</label>
                              <input type="date" className={inputClass} value={plotFormData.sowingDate} onChange={e => setPlotFormData({...plotFormData, sowingDate: e.target.value})} />
                          </div>
                      </div>
                      
                      {/* Project Context */}
                      {!isClient && (
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto Marco</label>
                              <select className={inputClass} value={plotFormData.projectId} onChange={e => setPlotFormData({...plotFormData, projectId: e.target.value})}>
                                  <option value="">-- Sin Proyecto --</option>
                                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                          </div>
                      )}

                      <div className="pt-4 flex justify-end space-x-3">
                          <button type="button" onClick={() => setIsPlotModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition">Crear Lote</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
