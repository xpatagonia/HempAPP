
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Location, SoilType } from '../types';
import { Plus, MapPin, User, Globe } from 'lucide-react';

export default function Locations() {
  const { locations, addLocation, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Location> & { lat: string, lng: string }>({
    name: '', address: '', soilType: 'Franco', climate: '', responsiblePerson: '', lat: '', lng: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const coordinates = (formData.lat && formData.lng) 
      ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
      : undefined;

    addLocation({
      id: Date.now().toString(),
      name: formData.name!,
      address: formData.address || '',
      soilType: formData.soilType as SoilType,
      climate: formData.climate || '',
      responsiblePerson: formData.responsiblePerson || '',
      coordinates
    });
    setIsModalOpen(false);
    setFormData({ name: '', address: '', soilType: 'Franco', climate: '', responsiblePerson: '', lat: '', lng: '' });
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sitios de Ensayo</h1>
        {currentUser?.role === 'admin' && (
          <button onClick={() => setIsModalOpen(true)} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Agregar Sitio
          </button>
        )}
      </div>

      <div className="space-y-6">
        {locations.map(loc => (
          <div key={loc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
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
            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center mb-1">
                            <MapPin size={20} className="mr-2 text-hemp-600" />
                            {loc.name}
                        </h3>
                        <p className="text-gray-500 text-sm ml-7">{loc.address}</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-gray-500 text-xs uppercase font-semibold">Suelo</span>
                        <span className="text-gray-800">{loc.soilType}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="block text-gray-500 text-xs uppercase font-semibold">Clima</span>
                        <span className="text-gray-800">{loc.climate}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                         <span className="block text-gray-500 text-xs uppercase font-semibold">Responsable Local</span>
                         <div className="flex items-center mt-1">
                            <User size={16} className="mr-2 text-gray-400" />
                            <span className="text-gray-800">{loc.responsiblePerson}</span>
                         </div>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Nuevo Sitio</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Sitio</label>
                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                    <input type="number" step="any" placeholder="-34.6037" className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                    <input type="number" step="any" placeholder="-58.3816" className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suelo</label>
                  <select className={inputClass} value={formData.soilType} onChange={e => setFormData({...formData, soilType: e.target.value as SoilType})}>
                    <option value="Franco">Franco</option>
                    <option value="Arcilloso">Arcilloso</option>
                    <option value="Arenoso">Arenoso</option>
                    <option value="Limoso">Limoso</option>
                  </select>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clima</label>
                  <input type="text" className={inputClass} placeholder="Ej: Templado húmedo" value={formData.climate} onChange={e => setFormData({...formData, climate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable Local</label>
                <input type="text" className={inputClass} value={formData.responsiblePerson} onChange={e => setFormData({...formData, responsiblePerson: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
