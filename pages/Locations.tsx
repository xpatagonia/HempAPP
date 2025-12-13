import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Location, SoilType, RoleType } from '../types';
import { Plus, MapPin, User, Globe, Edit2, Trash2, Keyboard, List, Briefcase, Building, Landmark, GraduationCap, Users } from 'lucide-react';

// Expanded Argentina Database with Rural Hubs
const ARG_GEO: Record<string, string[]> = {
    "Buenos Aires": [
        "La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "Pergamino", "Junín", "Olavarría", "San Nicolás", "Balcarce", "Castelar", "CABA", "San Pedro",
        "Trenque Lauquen", "Pehuajó", "9 de Julio", "Bolívar", "Saladillo", "Lobos", "Chascomús", "Necochea", "Tres Arroyos", 
        "General Villegas", "Lincoln", "Chivilcoy", "Chacabuco", "Bragado", "25 de Mayo", "Azul", "Coronel Suárez", "Pigüé", "Carhué",
        "San Antonio de Areco", "Arrecifes", "Salto", "Rojas", "Mercedes", "Luján", "Cañuelas", "Las Flores"
    ],
    "Catamarca": [
        "San Fernando del Valle de Catamarca", "Andalgalá", "Tinogasta", "Belén", "Santa María", "Recreo", "Fiambalá"
    ],
    "Chaco": [
        "Resistencia", "Sáenz Peña", "Villa Ángela", "Charata", "Castelli", "San Martín", "Las Breñas", "Quitilipi", "Machagai", "Pampa del Infierno"
    ],
    "Chubut": [
        "Rawson", "Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Esquel", "Trevelin", "Sarmiento", "Gaiman", "Dolavon", "Lago Puelo"
    ],
    "Córdoba": [
        "Córdoba Capital", "Río Cuarto", "Villa María", "San Francisco", "Carlos Paz", "Alta Gracia", "Jesús María", 
        "Río Tercero", "Bell Ville", "Marcos Juárez", "Laboulaye", "La Carlota", "Vicuña Mackenna", "Huinca Renancó", 
        "Villa Dolores", "Cruz del Eje", "Deán Funes", "Morteros", "Las Varillas", "Oncativo", "Oliva"
    ],
    "Corrientes": [
        "Corrientes Capital", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Mercedes", "Bella Vista", "Santo Tomé", "Esquina", "Monte Caseros", "Virasoro"
    ],
    "Entre Ríos": [
        "Paraná", "Concordia", "Gualeguaychú", "Concepción del Uruguay", "Villaguay", "Victoria", "La Paz", "Nogoyá", "Diamante", "Crespo", 
        "Chajarí", "Federación", "San Salvador", "Rosario del Tala", "Gualeguay"
    ],
    "Formosa": [
        "Formosa Capital", "Clorinda", "Pirané", "El Colorado", "Las Lomitas", "Ibarreta"
    ],
    "Jujuy": [
        "San Salvador de Jujuy", "Perico", "San Pedro", "Ledesma", "Libertador Gral. San Martín", "Palpalá", "Humahuaca", "Tilcara", "La Quiaca"
    ],
    "La Pampa": [
        "Santa Rosa", "General Pico", "General Acha", "Eduardo Castex", "Realicó", "Intendente Alvear", "Victorica", "Macachín", "Guatraché"
    ],
    "La Rioja": [
        "La Rioja Capital", "Chilecito", "Aimogasta", "Chamical", "Villa Unión", "Chepes"
    ],
    "Mendoza": [
        "Mendoza Capital", "San Rafael", "Godoy Cruz", "Maipú", "Luján de Cuyo", "San Martín", "General Alvear", "Malargüe", "Tunuyán", "Tupungato", "Rivadavia", "Junín"
    ],
    "Misiones": [
        "Posadas", "Eldorado", "Oberá", "Puerto Iguazú", "Apóstoles", "Leandro N. Alem", "San Vicente", "Montecarlo", "Puerto Rico"
    ],
    "Neuquén": [
        "Neuquén Capital", "San Martín de los Andes", "Zapala", "Cutral Có", "Plaza Huincul", "Centenario", "Villa La Angostura", "Junín de los Andes", "Chos Malal"
    ],
    "Río Negro": [
        "Viedma", "General Roca", "Bariloche", "Cipolletti", "Villa Regina", "Allen", "Cinco Saltos", "Choele Choel", "Río Colorado", "El Bolsón", "San Antonio Oeste"
    ],
    "Salta": [
        "Salta Capital", "Orán", "Tartagal", "General Güemes", "Cafayate", "Metán", "Rosario de la Frontera", "Joaquín V. González", "Las Lajitas", "Embarcación"
    ],
    "San Juan": [
        "San Juan Capital", "Caucete", "Jáchal", "Pocito", "Rawson", "Rivadavia", "Santa Lucía", "Albardón"
    ],
    "San Luis": [
        "San Luis Capital", "Villa Mercedes", "Merlo", "Justo Daract", "La Punta", "Quines", "Santa Rosa del Conlara"
    ],
    "Santa Cruz": [
        "Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Las Heras", "Puerto Deseado", "Río Turbio"
    ],
    "Santa Fe": [
        "Santa Fe Capital", "Rosario", "Rafaela", "Venado Tuerto", "Reconquista", "Santo Tomé", "Villa Constitución", "San Lorenzo", "Esperanza", 
        "Casilda", "Cañada de Gómez", "Firmat", "Rufino", "Sunchales", "Gálvez", "San Jorge", "Vera", "San Justo"
    ],
    "Santiago del Estero": [
        "Santiago del Estero Capital", "La Banda", "Termas de Río Hondo", "Frías", "Añatuya", "Fernández", "Quimilí", "Loreto"
    ],
    "Tierra del Fuego": [
        "Ushuaia", "Río Grande", "Tolhuin"
    ],
    "Tucumán": [
        "San Miguel de Tucumán", "Tafí Viejo", "Concepción", "Yerba Buena", "Banda del Río Salí", "Aguilares", "Monteros", "Famaillá"
    ]
};

export default function Locations() {
  const { locations, addLocation, updateLocation, deleteLocation, currentUser, usersList } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Toggle for manual city entry
  const [isManualCity, setIsManualCity] = useState(false);

  const [formData, setFormData] = useState<Partial<Location> & { lat: string, lng: string }>({
    name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
    responsiblePerson: '', lat: '', lng: '',
    ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', responsibleIds: []
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const coordinates = (formData.lat && formData.lng) 
      ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
      : undefined;

    const payload: any = {
      name: formData.name!,
      province: formData.province || '',
      city: formData.city || '',
      address: formData.address || '',
      soilType: formData.soilType as SoilType,
      climate: formData.climate || '',
      responsiblePerson: formData.responsiblePerson || '', // Legacy support
      coordinates,
      // Client Data
      ownerName: formData.ownerName || '',
      ownerLegalName: formData.ownerLegalName || '',
      ownerCuit: formData.ownerCuit || '',
      ownerContact: formData.ownerContact || '',
      ownerType: formData.ownerType as RoleType,
      
      responsibleIds: formData.responsibleIds || []
    };

    if (editingId) {
        updateLocation({ ...payload, id: editingId });
    } else {
        addLocation({ ...payload, id: Date.now().toString() });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
        responsiblePerson: '', lat: '', lng: '',
        ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', responsibleIds: []
    });
    setEditingId(null);
    setIsManualCity(false);
  };

  const handleEdit = (loc: Location) => {
      // Check if the city is in the standard list
      const provinceCities = loc.province && ARG_GEO[loc.province] ? ARG_GEO[loc.province] : [];
      const isStandardCity = loc.city && provinceCities.includes(loc.city);
      
      setFormData({
          ...loc,
          lat: loc.coordinates?.lat.toString() || '',
          lng: loc.coordinates?.lng.toString() || '',
          province: loc.province || '',
          city: loc.city || '',
          // Fallback defaults if new fields missing
          ownerType: loc.ownerType || 'Empresa Privada',
          ownerLegalName: loc.ownerLegalName || '',
          ownerCuit: loc.ownerCuit || '',
          ownerContact: loc.ownerContact || ''
      });
      setEditingId(loc.id);
      setIsManualCity(!isStandardCity && !!loc.city); // If city exists but not in list, enable manual mode
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Estás seguro de eliminar este sitio? Afectará a los ensayos históricos.")) {
          deleteLocation(id);
      }
  };

  const toggleResponsible = (userId: string) => {
    const current = formData.responsibleIds || [];
    if (current.includes(userId)) {
        setFormData({...formData, responsibleIds: current.filter(id => id !== userId)});
    } else {
        setFormData({...formData, responsibleIds: [...current, userId]});
    }
  };

  const getClientIcon = (type?: RoleType) => {
      switch(type) {
          case 'Empresa Privada': return <Building size={16} className="text-gray-500" />;
          case 'Gobierno': return <Landmark size={16} className="text-blue-500" />;
          case 'Academia': return <GraduationCap size={16} className="text-purple-500" />;
          case 'Particular': return <User size={16} className="text-green-500" />;
          default: return <Users size={16} className="text-gray-400" />;
      }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sitios de Ensayo</h1>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Nuevo Sitio
          </button>
        )}
      </div>

      <div className="space-y-6">
        {locations.map(loc => {
          const responsibles = usersList.filter(u => loc.responsibleIds?.includes(u.id));

          return (
            <div key={loc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row relative group">
              {/* Map Section */}
              <div className="w-full md:w-1/3 bg-gray-200 h-64 md:h-auto min-h-[250px] relative">
                {loc.coordinates ? (
                   <iframe 
                     width="100%" 
                     height="100%" 
                     frameBorder="0" 
                     scrolling="no" 
                     marginHeight={0} 
                     marginWidth={0} 
                     src={`https://maps.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}&z=14&output=embed`}
                     className="absolute inset-0"
                   ></iframe>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                    <Globe size={48} className="mb-2 opacity-50" />
                    <span>Sin coordenadas</span>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="p-6 flex-1 flex flex-col justify-center relative">
                  {isAdmin && (
                      <div className="absolute top-4 right-4 flex space-x-2">
                          <button onClick={() => handleEdit(loc)} className="p-2 text-gray-400 hover:text-hemp-600 bg-white rounded-full shadow-sm border hover:border-hemp-300">
                              <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(loc.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-full shadow-sm border hover:border-red-300">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  )}

                  <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-800 flex items-center">
                              <MapPin size={20} className="mr-2 text-hemp-600" />
                              {loc.name}
                          </h3>
                          {loc.province && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border">
                                  {loc.city ? `${loc.city}, ` : ''}{loc.province}
                              </span>
                          )}
                      </div>
                      <p className="text-gray-500 text-sm ml-7">{loc.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                          <span className="block text-gray-500 text-xs uppercase font-semibold">Suelo & Clima</span>
                          <div className="text-gray-800 text-sm mt-1">
                              {loc.soilType} • {loc.climate || 'No especificado'}
                          </div>
                      </div>
                      
                      {/* CLIENT CARD */}
                      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <span className="text-indigo-800 text-xs uppercase font-bold flex items-center mb-1">
                              {getClientIcon(loc.ownerType)} <span className="ml-1">Cliente / Titular</span>
                          </span>
                          <div className="text-gray-800 font-bold text-sm leading-tight">{loc.ownerName || '-'}</div>
                          {loc.ownerLegalName && loc.ownerLegalName !== loc.ownerName && (
                              <div className="text-xs text-gray-500 mt-0.5 truncate" title={loc.ownerLegalName}>{loc.ownerLegalName}</div>
                          )}
                          <div className="flex justify-between items-center mt-1">
                              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">
                                  {loc.ownerType}
                              </span>
                              {loc.ownerContact && <span className="text-[10px] text-gray-500" title="Contacto">{loc.ownerContact}</span>}
                          </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                           <span className="block text-gray-500 text-xs uppercase font-semibold">Equipo Técnico Local</span>
                           <div className="flex -space-x-2 mt-2 overflow-hidden py-1">
                              {responsibles.length > 0 ? responsibles.map(u => (
                                   <div key={u.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600" title={u.name}>
                                       {u.name.charAt(0)}
                                   </div>
                               )) : (
                                   <span className="text-sm text-gray-400 italic">Sin asignar</span>
                               )}
                           </div>
                      </div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Sitio' : 'Nuevo Sitio'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SECTION 1: UBICACION */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                      <MapPin size={12} className="mr-1"/> Ubicación Geográfica
                  </h3>
                  <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Sitio</label>
                        <input required type="text" placeholder="Ej: Campo Experimental Norte" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
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
                                Ciudad
                                <button 
                                    type="button" 
                                    tabIndex={-1}
                                    onClick={() => setIsManualCity(!isManualCity)} 
                                    className="text-hemp-600 text-xs font-semibold hover:underline flex items-center"
                                >
                                    {isManualCity ? <List size={12} className="mr-1"/> : <Keyboard size={12} className="mr-1"/>}
                                    {isManualCity ? "Lista" : "Manual"}
                                </button>
                            </label>
                            
                            {isManualCity ? (
                                <input 
                                    type="text" 
                                    className={inputClass} 
                                    value={formData.city} 
                                    onChange={e => setFormData({...formData, city: e.target.value})}
                                />
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección / Referencia</label>
                            <input type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                                <input type="number" step="any" placeholder="-34..." className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                                <input type="number" step="any" placeholder="-58..." className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                             </div>
                         </div>
                      </div>
                  </div>
              </div>

              {/* SECTION 2: CLIENTE / TITULAR (REDEFINED) */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h3 className="text-xs font-bold text-indigo-700 uppercase mb-3 flex items-center">
                      <Briefcase size={12} className="mr-1"/> Cliente / Titular del Proyecto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Entidad</label>
                          <select className={inputClass} value={formData.ownerType} onChange={e => setFormData({...formData, ownerType: e.target.value as RoleType})}>
                              <option value="Empresa Privada">Empresa Privada</option>
                              <option value="Gobierno">Gobierno / Estado</option>
                              <option value="Academia">Universidad / Academia</option>
                              <option value="ONG/Cooperativa">ONG / Cooperativa</option>
                              <option value="Particular">Productor Particular</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial (Fantasía)</label>
                          <input type="text" placeholder="Ej: Agrogenetics S.A." required className={inputClass} value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                          <input type="text" placeholder="Nombre Legal" className={inputClass} value={formData.ownerLegalName} onChange={e => setFormData({...formData, ownerLegalName: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CUIT / Tax ID</label>
                          <input type="text" className={inputClass} value={formData.ownerCuit} onChange={e => setFormData({...formData, ownerCuit: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Directo</label>
                          <input type="text" placeholder="Email o Teléfono del responsable del cliente" className={inputClass} value={formData.ownerContact} onChange={e => setFormData({...formData, ownerContact: e.target.value})} />
                      </div>
                  </div>
              </div>

              {/* SECTION 3: DATOS AGRONOMICOS */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Suelo</label>
                  <select className={inputClass} value={formData.soilType} onChange={e => setFormData({...formData, soilType: e.target.value as SoilType})}>
                    <option value="Franco">Franco</option>
                    <option value="Arcilloso">Arcilloso</option>
                    <option value="Arenoso">Arenoso</option>
                    <option value="Limoso">Limoso</option>
                  </select>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Régimen Climático</label>
                  <input type="text" className={inputClass} placeholder="Ej: Templado húmedo" value={formData.climate} onChange={e => setFormData({...formData, climate: e.target.value})} />
                </div>
              </div>

              {/* SECTION 4: EQUIPO */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipo Técnico Asignado</label>
                  <div className="border border-gray-300 bg-white rounded p-2 h-24 overflow-y-auto text-xs">
                    {usersList.map(u => (
                        <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 py-1">
                            <input 
                                type="checkbox" 
                                className="rounded text-hemp-600 focus:ring-hemp-500" 
                                checked={formData.responsibleIds?.includes(u.id)} 
                                onChange={() => toggleResponsible(u.id)} 
                            />
                            <span className="text-gray-900">{u.name} <span className="text-gray-400">({u.role})</span></span>
                        </label>
                    ))}
                  </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar Locación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}