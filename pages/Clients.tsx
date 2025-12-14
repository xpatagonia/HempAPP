
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType } from '../types';
import { Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, Users, Building, AlertCircle, Tractor } from 'lucide-react';

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient, currentUser, locations } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', isNetworkMember: false, cuit: '', notes: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const payload = {
        name: formData.name!,
        type: formData.type as RoleType,
        contactName: formData.contactName || '',
        contactPhone: formData.contactPhone || '',
        email: formData.email || '',
        isNetworkMember: formData.isNetworkMember || false,
        cuit: formData.cuit || '',
        notes: formData.notes || ''
    };

    if (editingId) {
        updateClient({ ...payload, id: editingId } as Client);
    } else {
        await addClient({
            ...payload,
            id: Date.now().toString(),
        });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', isNetworkMember: false, cuit: '', notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (c: Client) => {
      setFormData(c);
      setEditingId(c.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Eliminar este cliente? Las locaciones asociadas perderán el enlace directo.")) {
          deleteClient(id);
      }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Briefcase className="mr-2 text-hemp-600"/> Gestión de Clientes / Productores
            </h1>
            <p className="text-sm text-gray-500">Administración de titulares y clasificación por escala.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Nuevo Cliente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <Briefcase size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-gray-500">No hay clientes registrados.</p>
            </div>
        ) : clients.map(client => {
            const locCount = locations.filter(l => l.clientId === client.id || l.ownerName === client.name).length;
            const isProducer = client.type.includes('Productor');
            
            return (
                <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group flex flex-col h-full">
                  {isAdmin && (
                      <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button onClick={() => handleEdit(client)} className="text-gray-400 hover:text-hemp-600 p-1 bg-white rounded shadow-sm border">
                              <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(client.id)} className="text-gray-400 hover:text-red-600 p-1 bg-white rounded shadow-sm border">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  )}

                  <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-3 rounded-full ${isProducer ? 'bg-amber-100 text-amber-700' : client.isNetworkMember ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isProducer ? <Tractor size={20}/> : client.isNetworkMember ? <Globe size={20} /> : <Building size={20} />}
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-800 leading-tight">{client.name}</h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border mt-1 inline-block ${
                              isProducer ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                              {client.type}
                          </span>
                      </div>
                  </div>

                  {client.isNetworkMember && (
                      <div className="mb-3">
                          <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide inline-flex items-center">
                              <Users size={10} className="mr-1"/> Red de Agricultores
                          </span>
                      </div>
                  )}

                  <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg flex-1">
                      <div className="flex items-center">
                          <Users size={14} className="mr-2 text-gray-400"/>
                          <span className="font-medium">{client.contactName}</span>
                      </div>
                      {client.contactPhone && (
                          <div className="flex items-center">
                              <Phone size={14} className="mr-2 text-gray-400"/>
                              <span>{client.contactPhone}</span>
                          </div>
                      )}
                      {client.email && (
                          <div className="flex items-center">
                              <Mail size={14} className="mr-2 text-gray-400"/>
                              <span className="truncate">{client.email}</span>
                          </div>
                      )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-500">CUIT: {client.cuit || '-'}</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold flex items-center">
                          <MapPin size={12} className="mr-1"/> {locCount} Locaciones
                      </span>
                  </div>
                </div>
            );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SECTION 1: IDENTITY */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center">
                          <Briefcase size={12} className="mr-1"/> Identidad y Clasificación
                      </h3>
                      
                      {/* RED SWITCH */}
                      <label className="flex items-center cursor-pointer">
                          <div className="relative">
                              <input type="checkbox" className="sr-only" checked={formData.isNetworkMember} onChange={e => setFormData({...formData, isNetworkMember: e.target.checked})} />
                              <div className={`block w-10 h-6 rounded-full transition ${formData.isNetworkMember ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${formData.isNetworkMember ? 'translate-x-4' : ''}`}></div>
                          </div>
                          <div className="ml-2 text-xs font-bold text-gray-700">Miembro Red de Agricultores</div>
                      </label>
                  </div>

                  <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial / Razón Social</label>
                        <input required type="text" placeholder="Ej: Agrogenetics S.A." className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría / Tipo de Entidad</label>
                            <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as RoleType})}>
                                <optgroup label="Productores">
                                    <option value="Productor Pequeño (<5 ha)">Productor Pequeño (&lt;5 ha)</option>
                                    <option value="Productor Mediano (5-15 ha)">Productor Mediano (5-15 ha)</option>
                                    <option value="Productor Grande (>15 ha)">Productor Grande (&gt;15 ha)</option>
                                </optgroup>
                                <optgroup label="Institucional">
                                    <option value="Empresa Privada">Empresa Privada</option>
                                    <option value="Gobierno">Gobierno / Estado</option>
                                    <option value="Academia">Universidad / Academia</option>
                                    <option value="ONG/Cooperativa">ONG / Cooperativa</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">CUIT / ID Fiscal</label>
                            <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                        </div>
                      </div>
                  </div>
              </div>

              {/* SECTION 2: CONTACT */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <h3 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center">
                      <Phone size={12} className="mr-1"/> Contacto Principal
                   </h3>
                   <div className="space-y-3">
                       <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Contacto</label>
                            <input required type="text" placeholder="Persona de referencia" className={inputClass} value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input type="text" className={inputClass} value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                           </div>
                       </div>
                   </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas</label>
                <textarea rows={2} className={inputClass} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Observaciones adicionales..." />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
