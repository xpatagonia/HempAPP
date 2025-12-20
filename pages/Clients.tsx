
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User } from '../types';
import { Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, Users, Building, AlertCircle, Tractor, Eye, X, Link as LinkIcon, UserCheck, Key, Shield, UserPlus, LogOut } from 'lucide-react';

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient, currentUser, locations, usersList, addUser, updateUser, deleteUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // User Management States
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showLinkUserForm, setShowLinkUserForm] = useState(false);
  
  // Forms
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [selectedExistingUserId, setSelectedExistingUserId] = useState('');

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', isNetworkMember: false, cuit: '', notes: '', relatedUserId: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const availableUsersToLink = viewClient ? usersList.filter(u => 
      u.role !== 'super_admin' && 
      u.role !== 'admin' && 
      u.clientId !== viewClient.id && 
      u.id !== viewClient.relatedUserId
  ) : [];

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
        notes: formData.notes || '',
        relatedUserId: formData.relatedUserId || null
    };

    if (editingId) {
        updateClient({ ...payload, id: editingId } as Client);
    } else {
        const success = await addClient({
            ...payload,
            id: Date.now().toString(),
        });
        if (success && payload.relatedUserId) {
            const user = usersList.find(u => u.id === payload.relatedUserId);
            if (user) updateUser({ ...user, clientId: payload.relatedUserId });
        }
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', isNetworkMember: false, cuit: '', notes: '', relatedUserId: ''
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

  const handleUserLink = (userId: string) => {
      const user = usersList.find(u => u.id === userId);
      if (user) {
          setFormData(prev => ({
              ...prev,
              relatedUserId: userId,
              contactName: user.name,
              contactPhone: user.phone || prev.contactPhone,
              email: user.email || prev.email
          }));
      } else {
          setFormData(prev => ({ ...prev, relatedUserId: '' }));
      }
  };

  const handleQuickAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewClient || !newUser.name || !newUser.email || !newUser.password) return;

      const success = await addUser({
          id: Date.now().toString(),
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: 'client',
          clientId: viewClient.id,
          jobTitle: 'Equipo del Cliente',
          avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
      } as User);

      if (success) {
          alert(`Usuario ${newUser.name} creado y vinculado a ${viewClient.name}.`);
          setNewUser({ name: '', email: '', password: '' });
          setShowCreateUserForm(false);
      }
  };

  const handleLinkExistingUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewClient || !selectedExistingUserId) return;

      const user = usersList.find(u => u.id === selectedExistingUserId);
      if (user) {
          updateUser({
              ...user,
              clientId: viewClient.id,
              role: user.role === 'viewer' ? 'client' : user.role
          });
          alert(`${user.name} ha sido agregado al equipo de ${viewClient.name}.`);
          setShowLinkUserForm(false);
          setSelectedExistingUserId('');
      }
  };

  const handleUnlinkUser = (user: User) => {
      if (window.confirm(`¿Quitar a ${user.name} del equipo?`)) {
          updateUser({ ...user, clientId: undefined });
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <Briefcase className="mr-2 text-hemp-600"/> Gestión de Clientes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Orden Sugerido: 1. Crear Usuario &rarr; 2. Vincular a Entidad.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition shadow-lg font-bold">
            <Plus size={20} className="mr-2" /> Nuevo Cliente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-800">
                <Briefcase size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-gray-500">No hay clientes registrados.</p>
            </div>
        ) : clients.map(client => {
            const locCount = locations.filter(l => l.clientId === client.id || l.ownerName === client.name).length;
            const isProducer = client.type.includes('Productor');
            const linkedUser = usersList.find(u => u.id === client.relatedUserId);
            const totalTeam = usersList.filter(u => u.clientId === client.id).length;
            
            return (
                <div key={client.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition relative group flex flex-col h-full">
                  <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => setViewClient(client)} className="text-gray-400 hover:text-blue-600 p-1 bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700">
                          <Eye size={16} />
                      </button>
                      {isAdmin && (
                          <>
                            <button onClick={() => handleEdit(client)} className="text-gray-400 hover:text-hemp-600 p-1 bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(client.id)} className="text-gray-400 hover:text-red-600 p-1 bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700">
                                <Trash2 size={16} />
                            </button>
                          </>
                      )}
                  </div>

                  <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-3 rounded-full ${isProducer ? 'bg-amber-100 text-amber-700' : client.isNetworkMember ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isProducer ? <Tractor size={20}/> : client.isNetworkMember ? <Globe size={20} /> : <Building size={20} />}
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{client.name}</h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border mt-1 inline-block ${
                              isProducer ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700'
                          }`}>
                              {client.type}
                          </span>
                      </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 p-3 rounded-lg flex-1 border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center">
                              {linkedUser ? <span title="Titular del Sistema"><UserCheck size={14} className="mr-2 text-green-500" /></span> : <Users size={14} className="mr-2 text-gray-400"/>}
                              <span className="font-medium">{client.contactName}</span>
                          </div>
                      </div>
                      {client.email && (
                          <div className="flex items-center">
                              <Mail size={14} className="mr-2 text-gray-400"/>
                              <span className="truncate">{client.email}</span>
                          </div>
                      )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-400">CUIT: {client.cuit || '-'}</span>
                      <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded font-bold flex items-center ${totalTeam > 0 ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
                              <Users size={12} className="mr-1"/> {totalTeam}
                          </span>
                          <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400 font-bold flex items-center">
                              <MapPin size={12} className="mr-1"/> {locCount}
                          </span>
                      </div>
                  </div>
                </div>
            );
        })}
      </div>

      {/* VIEW CLIENT MODAL */}
      {viewClient && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                          <Briefcase className="mr-2 text-hemp-600"/> Ficha de Cliente
                      </h2>
                      <button onClick={() => { setViewClient(null); setShowCreateUserForm(false); setShowLinkUserForm(false); }} className="text-gray-400 hover:text-gray-600 bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <div className="flex items-center mb-6">
                          <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full mr-4 text-blue-700 dark:text-blue-400">
                              <Building size={32}/>
                          </div>
                          <div>
                              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{viewClient.name}</h1>
                              <p className="text-sm text-gray-500">{viewClient.type}</p>
                              {viewClient.cuit && <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">Identificación: {viewClient.cuit}</p>}
                          </div>
                      </div>

                      <div className="mb-6">
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm flex items-center"><Users size={16} className="mr-2"/> Personal Asignado</h4>
                              {isAdmin && !showCreateUserForm && !showLinkUserForm && (
                                  <div className="flex space-x-1">
                                      <button onClick={() => setShowLinkUserForm(true)} className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded transition hover:bg-slate-200">Vincular</button>
                                      <button onClick={() => setShowCreateUserForm(true)} className="text-[10px] font-black uppercase bg-hemp-600 text-white px-3 py-1.5 rounded transition hover:bg-hemp-700">Crear</button>
                                  </div>
                              )}
                          </div>

                          {showCreateUserForm && (
                              <form onSubmit={handleQuickAddUser} className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30 mb-4 animate-in fade-in">
                                  <input required type="text" placeholder="Nombre" className="w-full text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded p-1.5 mb-2" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                                  <input required type="email" placeholder="Email" className="w-full text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded p-1.5 mb-2" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                                  <input required type="password" placeholder="Clave" className="w-full text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded p-1.5 mb-2" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                  <button type="submit" className="w-full bg-green-600 text-white text-xs font-bold py-2 rounded">Crear y Vincular</button>
                              </form>
                          )}

                          {showLinkUserForm && (
                              <form onSubmit={handleLinkExistingUser} className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-200 dark:border-slate-800 mb-4 animate-in fade-in">
                                  <select required className="w-full text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded p-1.5 mb-2" value={selectedExistingUserId} onChange={e => setSelectedExistingUserId(e.target.value)}>
                                      <option value="">Seleccionar Usuario...</option>
                                      {availableUsersToLink.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                  </select>
                                  <button type="submit" className="w-full bg-slate-700 text-white text-xs font-bold py-2 rounded">Asignar al Equipo</button>
                              </form>
                          )}

                          <div className="space-y-2">
                              {usersList.filter(u => u.clientId === viewClient.id).map(u => (
                                  <div key={u.id} className="flex items-center justify-between bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 p-2 rounded-lg shadow-sm group">
                                      <div className="flex items-center">
                                          <img src={u.avatar} className="w-8 h-8 rounded-full mr-2 border dark:border-slate-800"/>
                                          <div><p className="text-xs font-bold text-gray-800 dark:text-gray-200">{u.name}</p><p className="text-[10px] text-gray-500">{u.email}</p></div>
                                      </div>
                                      {isAdmin && u.id !== viewClient.relatedUserId && (
                                          <button onClick={() => handleUnlinkUser(u)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"><LogOut size={14}/></button>
                                      )}
                                  </div>
                              ))}
                              {usersList.filter(u => u.clientId === viewClient.id).length === 0 && (
                                  <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-slate-950 rounded border border-dashed border-gray-200 dark:border-slate-800">No hay equipo asignado.</p>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 text-center">
                              <span className="block text-2xl font-black text-blue-800 dark:text-blue-400">{locations.filter(l => l.clientId === viewClient.id).length}</span>
                              <span className="text-[10px] text-blue-600 font-bold uppercase">Campos</span>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30 text-center">
                              <span className="block text-2xl font-black text-purple-800 dark:text-purple-400">{usersList.filter(u => u.clientId === viewClient.id).length}</span>
                              <span className="text-[10px] text-purple-600 font-bold uppercase">Usuarios</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nombre Comercial / Razón Social</label>
                  <input required type="text" placeholder="Ej: Agrogenetics S.A." className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Categoría</label>
                          <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as RoleType})}>
                              <option value="Productor Pequeño (<5 ha)">Productor Pequeño</option>
                              <option value="Productor Mediano (5-15 ha)">Productor Mediano</option>
                              <option value="Productor Grande (>15 ha)">Productor Grande</option>
                              <option value="Empresa Privada">Empresa Privada</option>
                              <option value="Gobierno">Gobierno</option>
                              <option value="Academia">Universidad</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">CUIT / ID Fiscal</label>
                          <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                      </div>
                  </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                   <label className="block text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center">
                      <LinkIcon size={12} className="mr-1"/> Vincular Titular (Usuario Existente)
                   </label>
                   <select className={`${inputClass} mb-3`} value={formData.relatedUserId || ''} onChange={(e) => handleUserLink(e.target.value)}>
                       <option value="">-- Sin vincular / Contacto Externo --</option>
                       {usersList.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                   </select>
                   <div className="space-y-3">
                       <input required type="text" placeholder="Nombre de Contacto" className={`${inputClass} ${formData.relatedUserId ? 'bg-gray-100 dark:bg-slate-800' : ''}`} value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} readOnly={!!formData.relatedUserId} />
                       <input type="email" placeholder="Email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold uppercase text-[10px]">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-hemp-600 text-white rounded-lg hover:bg-hemp-700 shadow-sm font-black uppercase text-[10px]">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
