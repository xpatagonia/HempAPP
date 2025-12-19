
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User } from '../types';
import { Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, Users, Building, AlertCircle, Tractor, Eye, X, Link as LinkIcon, UserCheck, Key, Shield, UserPlus, LogOut } from 'lucide-react';

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient, currentUser, locations, usersList, addUser, updateUser, deleteUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null); // For View Mode
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

  // Filter users eligible to be linked (Not admins, not already in this team)
  const availableUsersToLink = viewClient ? usersList.filter(u => 
      u.role !== 'super_admin' && 
      u.role !== 'admin' && 
      u.clientId !== viewClient.id && // Not already in this team
      u.id !== viewClient.relatedUserId // Not the owner
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

  // Helper to link user data in Create Form
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

  // 1. Create NEW User and Link
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

  // 2. Link EXISTING User
  const handleLinkExistingUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewClient || !selectedExistingUserId) return;

      const user = usersList.find(u => u.id === selectedExistingUserId);
      if (user) {
          // If the user was a 'viewer' or 'technician', maybe we upgrade them to 'client' or keep 'technician' but assign clientId.
          // Let's keep role but assign clientId. If they had no specific role, default to client scope.
          const newRole = (user.role === 'viewer') ? 'client' : user.role;
          
          updateUser({
              ...user,
              clientId: viewClient.id,
              role: newRole
          });
          alert(`${user.name} ha sido agregado al equipo de ${viewClient.name}.`);
          setShowLinkUserForm(false);
          setSelectedExistingUserId('');
      }
  };

  // Remove user from team (unlink)
  const handleUnlinkUser = (user: User) => {
      if (window.confirm(`¿Quitar a ${user.name} del equipo? Dejará de tener acceso a los campos de este cliente.`)) {
          updateUser({
              ...user,
              clientId: undefined // Remove link
          });
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
            const linkedUser = usersList.find(u => u.id === client.relatedUserId);
            // Count total users linked to this client ID
            const totalTeam = usersList.filter(u => u.clientId === client.id).length;
            
            return (
                <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group flex flex-col h-full">
                  <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => setViewClient(client)} className="text-gray-400 hover:text-blue-600 p-1 bg-white rounded shadow-sm border border-gray-200" title="Ver Detalles y Equipo">
                          <Eye size={16} />
                      </button>
                      {isAdmin && (
                          <>
                            <button onClick={() => handleEdit(client)} className="text-gray-400 hover:text-hemp-600 p-1 bg-white rounded shadow-sm border border-gray-200" title="Editar">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(client.id)} className="text-gray-400 hover:text-red-600 p-1 bg-white rounded shadow-sm border border-gray-200" title="Eliminar">
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

                  <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg flex-1 border border-gray-100">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center">
                              {/* Fixed: Move title prop from icon to wrapping span */}
                              {linkedUser ? <span title="Usuario Vinculado"><UserCheck size={14} className="mr-2 text-green-500" /></span> : <Users size={14} className="mr-2 text-gray-400"/>}
                              <span className="font-medium">{client.contactName}</span>
                          </div>
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
                      <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded font-bold flex items-center ${totalTeam > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400'}`} title="Usuarios con acceso">
                              <Users size={12} className="mr-1"/> {totalTeam}
                          </span>
                          <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold flex items-center">
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
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center">
                          <Briefcase className="mr-2 text-hemp-600"/> Ficha de Cliente
                      </h2>
                      <button onClick={() => { setViewClient(null); setShowCreateUserForm(false); setShowLinkUserForm(false); }} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      {/* Identity Header */}
                      <div className="flex items-center mb-6">
                          <div className="bg-blue-100 p-4 rounded-full mr-4 text-blue-700">
                              <Building size={32}/>
                          </div>
                          <div>
                              <h1 className="text-2xl font-bold text-gray-900">{viewClient.name}</h1>
                              <p className="text-sm text-gray-500">{viewClient.type}</p>
                              {viewClient.cuit && <p className="text-xs font-mono text-gray-400 mt-1">CUIT: {viewClient.cuit}</p>}
                          </div>
                      </div>

                      {/* Linked System User (Primary Contact) */}
                      {viewClient.relatedUserId && (() => {
                          const u = usersList.find(usr => usr.id === viewClient.relatedUserId);
                          if(u) return (
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center relative">
                                  <div className="absolute top-2 right-2 bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">TITULAR</div>
                                  <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm mr-4"/>
                                  <div>
                                      <p className="text-xs font-bold text-blue-800 uppercase mb-1 flex items-center">
                                          <UserCheck size={12} className="mr-1"/> Contacto Principal
                                      </p>
                                      <p className="font-bold text-gray-900">{u.name}</p>
                                      <p className="text-xs text-blue-700">{u.email}</p>
                                  </div>
                              </div>
                          )
                          return null;
                      })()}

                      {/* Team Section (Multiple Users) */}
                      <div className="mb-6">
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-700 text-sm flex items-center"><Users size={16} className="mr-2"/> Equipo de Trabajo</h4>
                              
                              {isAdmin && !showCreateUserForm && !showLinkUserForm && (
                                  <div className="flex space-x-1">
                                      <button onClick={() => setShowLinkUserForm(true)} className="text-xs bg-white text-gray-600 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition flex items-center shadow-sm">
                                          <LinkIcon size={12} className="mr-1"/> Vincular Existente
                                      </button>
                                      <button onClick={() => setShowCreateUserForm(true)} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition flex items-center shadow-sm">
                                          <UserPlus size={12} className="mr-1"/> Crear Nuevo
                                      </button>
                                  </div>
                              )}
                          </div>

                          {/* FORM 1: Create NEW User */}
                          {showCreateUserForm && (
                              <form onSubmit={handleQuickAddUser} className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4 animate-in fade-in">
                                  <div className="flex justify-between items-center mb-2">
                                      <h5 className="text-xs font-bold text-green-800 uppercase">Nuevo Usuario del Cliente</h5>
                                      <button type="button" onClick={() => setShowCreateUserForm(false)} className="text-green-600 hover:text-green-800"><X size={14}/></button>
                                  </div>
                                  <div className="space-y-2">
                                      <input required type="text" placeholder="Nombre Completo" className="w-full text-sm border-green-200 rounded p-1.5 focus:ring-green-500" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                                      <input required type="email" placeholder="Email Corporativo" className="w-full text-sm border-green-200 rounded p-1.5 focus:ring-green-500" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                                      <input required type="password" placeholder="Contraseña Temporal" className="w-full text-sm border-green-200 rounded p-1.5 focus:ring-green-500" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                      <button type="submit" className="w-full bg-green-600 text-white text-xs font-bold py-2 rounded shadow-sm hover:bg-green-700 transition">Crear y Vincular</button>
                                  </div>
                              </form>
                          )}

                          {/* FORM 2: Link EXISTING User */}
                          {showLinkUserForm && (
                              <form onSubmit={handleLinkExistingUser} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-in fade-in">
                                  <div className="flex justify-between items-center mb-2">
                                      <h5 className="text-xs font-bold text-gray-700 uppercase">Vincular Usuario Existente</h5>
                                      <button type="button" onClick={() => setShowLinkUserForm(false)} className="text-gray-500 hover:text-gray-700"><X size={14}/></button>
                                  </div>
                                  <div className="space-y-2">
                                      <select 
                                          required 
                                          className="w-full text-sm border-gray-300 rounded p-1.5 focus:ring-hemp-500"
                                          value={selectedExistingUserId}
                                          onChange={e => setSelectedExistingUserId(e.target.value)}
                                      >
                                          <option value="">Seleccionar Usuario...</option>
                                          {availableUsersToLink.map(u => (
                                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                          ))}
                                      </select>
                                      {availableUsersToLink.length === 0 && <p className="text-[10px] text-orange-500">No hay usuarios disponibles para vincular.</p>}
                                      <button type="submit" className="w-full bg-gray-700 text-white text-xs font-bold py-2 rounded shadow-sm hover:bg-gray-800 transition" disabled={!selectedExistingUserId}>
                                          Asignar al Equipo
                                      </button>
                                  </div>
                              </form>
                          )}

                          {/* Team List */}
                          <div className="space-y-2">
                              {usersList.filter(u => u.clientId === viewClient.id).map(u => (
                                  <div key={u.id} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg shadow-sm group">
                                      <div className="flex items-center">
                                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 mr-2 overflow-hidden border border-gray-100">
                                              {u.avatar ? <img src={u.avatar} alt="av" className="w-full h-full object-cover"/> : u.name.charAt(0)}
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-gray-800 flex items-center">
                                                  {u.name}
                                                  {u.id === viewClient.relatedUserId && <span className="ml-2 text-[9px] bg-blue-100 text-blue-700 px-1 rounded uppercase">Owner</span>}
                                              </p>
                                              <p className="text-[10px] text-gray-500">{u.email} • {u.role}</p>
                                          </div>
                                      </div>
                                      {isAdmin && u.id !== viewClient.relatedUserId && (
                                          <button onClick={() => handleUnlinkUser(u)} className="text-gray-300 hover:text-red-500 p-1 bg-white rounded border border-transparent hover:border-red-100 transition opacity-0 group-hover:opacity-100" title="Quitar del equipo">
                                              <LogOut size={14}/>
                                          </button>
                                      )}
                                  </div>
                              ))}
                              {usersList.filter(u => u.clientId === viewClient.id).length === 0 && !showCreateUserForm && !showLinkUserForm && (
                                  <p className="text-xs text-gray-400 italic text-center py-2 bg-gray-50 rounded border border-dashed border-gray-200">
                                      No hay personal asignado.
                                  </p>
                              )}
                          </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                              <span className="block text-2xl font-bold text-blue-800">
                                  {locations.filter(l => l.clientId === viewClient.id).length}
                              </span>
                              <span className="text-xs text-blue-600 uppercase font-bold">Campos</span>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                              <span className="block text-2xl font-bold text-purple-800">
                                  {usersList.filter(u => u.clientId === viewClient.id).length}
                              </span>
                              <span className="text-xs text-purple-600 uppercase font-bold">Total Usuarios</span>
                          </div>
                      </div>

                      {/* Notes */}
                      {viewClient.notes && (
                          <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded border border-gray-100">
                              "{viewClient.notes}"
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* CREATE / EDIT MODAL */}
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
                      
                      <label className="flex items-center cursor-pointer">
                          <div className="relative">
                              <input type="checkbox" className="sr-only" checked={formData.isNetworkMember} onChange={e => setFormData({...formData, isNetworkMember: e.target.checked})} />
                              <div className={`block w-10 h-6 rounded-full transition ${formData.isNetworkMember ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${formData.isNetworkMember ? 'translate-x-4' : ''}`}></div>
                          </div>
                          <div className="ml-2 text-xs font-bold text-gray-700">Red de Agricultores</div>
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

              {/* SECTION 2: CONTACT & USER LINKING */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <h3 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center">
                      <Phone size={12} className="mr-1"/> Contacto Principal
                   </h3>
                   
                   {/* USER LINK DROPDOWN */}
                   <div className="mb-4 bg-white p-2 rounded border border-blue-200">
                       <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center">
                           <LinkIcon size={12} className="mr-1"/> Vincular Usuario Existente (Opcional)
                       </label>
                       <select 
                           className={`${inputClass} text-sm`} 
                           value={formData.relatedUserId || ''} 
                           onChange={(e) => handleUserLink(e.target.value)}
                       >
                           <option value="">-- Sin vincular / Contacto Externo --</option>
                           {usersList.map(u => (
                               <option key={u.id} value={u.id}>
                                   {u.name} ({u.role}) - {u.email}
                               </option>
                           ))}
                       </select>
                       {formData.relatedUserId && <p className="text-[10px] text-green-600 mt-1">✓ Datos sincronizados con el perfil de usuario.</p>}
                   </div>

                   <div className="space-y-3">
                       <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Contacto</label>
                            <input 
                                required 
                                type="text" 
                                placeholder="Persona de referencia" 
                                className={`${inputClass} ${formData.relatedUserId ? 'bg-gray-100' : ''}`}
                                value={formData.contactName} 
                                onChange={e => setFormData({...formData, contactName: e.target.value})} 
                                readOnly={!!formData.relatedUserId}
                            />
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
