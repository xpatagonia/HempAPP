
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { StoragePoint } from '../types';
import { Plus, Warehouse, Edit2, Trash2, MapPin, User, Package, Map } from 'lucide-react';
import MapEditor from '../components/MapEditor';

export default function Storage() {
  const { storagePoints, addStoragePoint, updateStoragePoint, deleteStoragePoint, currentUser, usersList } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<StoragePoint>>({
    name: '', type: 'Propio', address: '', city: '', province: '',
    coordinates: undefined, responsibleUserId: '', capacityKg: 0, conditions: '', notes: ''
  });

  // Helper for map state inside modal
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const payload = { ...formData } as StoragePoint;

    if (editingId) {
        updateStoragePoint({ ...payload, id: editingId });
    } else {
        addStoragePoint({
            ...payload,
            id: Date.now().toString(),
        });
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', type: 'Propio', address: '', city: '', province: '',
        coordinates: undefined, responsibleUserId: '', capacityKg: 0, conditions: '', notes: '' 
    });
    setEditingId(null);
    setMapCenter(undefined);
  };

  const handleEdit = (sp: StoragePoint) => { 
      setFormData(sp); 
      setEditingId(sp.id); 
      if(sp.coordinates) setMapCenter(sp.coordinates);
      setIsModalOpen(true); 
  };
  
  const handleDelete = (id: string) => { if(window.confirm("¿Eliminar punto de almacenamiento?")) deleteStoragePoint(id); };

  // Handle Polygon Change actually handles single point logic in this case for map editor reuse
  const handleMapChange = (poly: { lat: number, lng: number }[]) => {
      if (poly.length > 0) {
          setFormData(prev => ({ ...prev, coordinates: poly[0] }));
      }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Warehouse className="mr-2 text-hemp-600"/> Puntos de Almacenamiento
            </h1>
            <p className="text-sm text-gray-500">Depósitos, galpones y centros de distribución.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Nuevo Depósito
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storagePoints.map(sp => {
              const responsible = usersList.find(u => u.id === sp.responsibleUserId);
              return (
                  <div key={sp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative group flex flex-col h-full">
                      {/* Map Preview */}
                      <div className="h-40 bg-gray-100 relative">
                          {sp.coordinates ? (
                              <iframe 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                scrolling="no" 
                                marginHeight={0} 
                                marginWidth={0} 
                                src={`https://maps.google.com/maps?q=${sp.coordinates.lat},${sp.coordinates.lng}&z=14&output=embed`}
                                className="absolute inset-0 opacity-80 hover:opacity-100 transition-opacity"
                              ></iframe>
                          ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                                  <MapPin size={32} className="mb-2 opacity-50"/>
                                  <span className="text-xs">Sin ubicación GPS</span>
                              </div>
                          )}
                          <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow text-gray-600 uppercase">
                              {sp.type}
                          </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                          {isAdmin && (
                              <div className="absolute top-44 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEdit(sp)} className="text-gray-400 hover:text-blue-600 p-1 bg-white rounded border shadow-sm"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDelete(sp.id)} className="text-gray-400 hover:text-red-600 p-1 bg-white rounded border shadow-sm"><Trash2 size={16}/></button>
                              </div>
                          )}
                          
                          <h3 className="font-bold text-gray-800 text-lg mb-1">{sp.name}</h3>
                          <p className="text-xs text-gray-500 flex items-start mb-4 h-8 overflow-hidden">
                              <MapPin size={12} className="mr-1 mt-0.5 flex-shrink-0"/>
                              {sp.address}, {sp.city}
                          </p>

                          <div className="mt-auto space-y-2 text-sm">
                              <div className="flex justify-between border-b border-gray-100 pb-1">
                                  <span className="text-gray-500">Capacidad:</span>
                                  <span className="font-bold">{sp.capacityKg ? `${sp.capacityKg} kg` : '-'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-500">Responsable:</span>
                                  {responsible ? (
                                      <div className="flex items-center" title={responsible.email}>
                                          {responsible.avatar ? (
                                              <img src={responsible.avatar} className="w-5 h-5 rounded-full mr-1"/>
                                          ) : <User size={14} className="mr-1"/>}
                                          <span className="truncate max-w-[100px]">{responsible.name}</span>
                                      </div>
                                  ) : <span className="text-gray-400 italic">Sin asignar</span>}
                              </div>
                          </div>
                      </div>
                  </div>
              );
          })}
          
          {storagePoints.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                  <Warehouse size={48} className="mx-auto mb-3 opacity-50"/>
                  <p>No hay puntos de almacenamiento registrados.</p>
              </div>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Depósito' : 'Nuevo Depósito'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Información General</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Nombre del Depósito</label>
                            <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Galpón Norte"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo</label>
                            <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                <option value="Propio">Propio</option>
                                <option value="Tercerizado">Tercerizado</option>
                                <option value="Transitorio">Transitorio (Logística)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Capacidad Estimada (kg)</label>
                            <input type="number" className={inputClass} value={formData.capacityKg} onChange={e => setFormData({...formData, capacityKg: Number(e.target.value)})}/>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center">
                        <MapPin size={12} className="mr-1"/> Ubicación
                    </h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Dirección</label>
                                <input type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ciudad</label>
                                <input type="text" className={inputClass} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}/>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Geolocalización (Marcar en mapa)</label>
                            <MapEditor 
                                initialCenter={mapCenter}
                                initialPolygon={formData.coordinates ? [formData.coordinates] : []}
                                onPolygonChange={handleMapChange}
                                height="200px"
                            />
                            <p className="text-xs text-gray-500 mt-1">Haz clic en el mapa para marcar la ubicación exacta.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Responsable de Logística/Llaves</label>
                    <select className={inputClass} value={formData.responsibleUserId} onChange={e => setFormData({...formData, responsibleUserId: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {usersList.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded font-bold">Guardar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
