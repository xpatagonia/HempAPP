
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User } from '../types';
import { Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, Users, Building, AlertCircle, Tractor, Eye, X, Link as LinkIcon, UserCheck, Key, Shield, UserPlus, LogOut, Star, Loader2, Save, UserMinus } from 'lucide-react';

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient, currentUser, locations, usersList, addUser, updateUser, deleteUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // User Management States
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showLinkUserForm, setShowLinkUserForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Forms
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician' as 'technician' | 'viewer' });
  const [selectedExistingUserId, setSelectedExistingUserId] = useState('');

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', isNetworkMember: false, cuit: '', notes: '', relatedUserId: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const teamMembers = viewClient ? usersList.filter(u => u.clientId === viewClient.id) : [];

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
        name: formData.name!.trim(),
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
            if (user) updateUser({ ...user, clientId: payload.relatedUserId, isNetworkMember: payload.isNetworkMember });
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

  const handleQuickAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewClient || !newUser.name || !newUser.email || !newUser.password) return;

      setIsSaving(true);
      const success = await addUser({
          id: Date.now().toString(),
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          clientId: viewClient.id,
          jobTitle: 'Equipo Operativo',
          isNetworkMember: viewClient.isNetworkMember,
          avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
      } as User);

      if (success) {
          setNewUser({ name: '', email: '', password: '', role: 'technician' });
          setShowCreateUserForm(false);
      }
      setIsSaving(false);
  };

  const handleLinkExistingUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!viewClient || !selectedExistingUserId) return;

      setIsSaving(true);
      const user = usersList.find(u => u.id === selectedExistingUserId);
      if (user) {
          updateUser({
              ...user,
              clientId: viewClient.id,
              isNetworkMember: viewClient.isNetworkMember,
              role: user.role === 'viewer' ? 'viewer' : 'technician'
          });
          setShowLinkUserForm(false);
          setSelectedExistingUserId('');
      }
      setIsSaving(false);
  };

  const handleUnlinkUser = (user: User) => {
      if (window.confirm(`¿Quitar a ${user.name} del equipo de trabajo?`)) {
          updateUser({ ...user, clientId: undefined });
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Socios de la <span className="text-hemp-600">Red</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gestión de establecimientos y sus equipos operativos.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Nuevo Socio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => {
            const totalTeam = usersList.filter(u => u.clientId === client.id).length;
            const locCount = locations.filter(l => l.clientId === client.id).length;
            
            return (
                <div key={client.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full overflow-hidden">
                  {client.isNetworkMember && (
                      <div className="absolute top-0 left-0 bg-amber-500 text-white text-[9px] font-black uppercase px-8 py-1 -rotate-45 -translate-x-8 translate-y-2 shadow-sm z-10">
                          SOCIO RED
                      </div>
                  )}
                  
                  <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => setViewClient(client)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition" title="Ver Detalles y Equipo"><Eye size={18} /></button>
                      {isAdmin && (
                          <button onClick={() => { setFormData(client); setEditingId(client.id); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Edit2 size={18} /></button>
                      )}
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                      <div className={`p-4 rounded-2xl ${client.isNetworkMember ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {client.isNetworkMember ? <Star size={24} className="fill-current" /> : <Building size={24} />}
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-gray-800 dark:text-white leading-none uppercase tracking-tighter">{client.name}</h3>
                          <span className="text-[10px] uppercase font-black text-gray-400 mt-1 block tracking-widest">{client.type}</span>
                      </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl flex-1 border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between border-b dark:border-slate-800 border-gray-200 pb-2">
                          <span className="font-bold text-gray-400 text-[10px] uppercase">Titular</span>
                          <span className="font-black text-xs text-gray-800 dark:text-gray-200 uppercase">{client.contactName}</span>
                      </div>
                      <div className="flex items-center text-xs py-1">
                          <Mail size={14} className="mr-2 text-gray-400"/>
                          <span className="truncate font-medium">{client.email || 'Sin correo'}</span>
                      </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex space-x-3">
                          <div className="flex items-center" title="Personal de Trabajo">
                              <Users size={16} className="mr-1.5 text-purple-500"/>
                              <span className="text-xs font-black text-gray-700 dark:text-gray-300">{totalTeam}</span>
                          </div>
                          <div className="flex items-center" title="Establecimientos">
                              <MapPin size={16} className="mr-1.5 text-blue-500"/>
                              <span className="text-xs font-black text-gray-700 dark:text-gray-300">{locCount}</span>
                          </div>
                      </div>
                      <button onClick={() => setViewClient(client)} className="text-[10px] font-black uppercase text-hemp-600 hover:underline tracking-widest">Gestionar Equipo &rarr;</button>
                  </div>
                </div>
            );
        })}
      </div>

      {/* VIEW / MANAGE TEAM MODAL */}
      {viewClient && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                  <div className="px-10 py-8 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                          <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Users size={28}/></div>
                          <div>
                              <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Equipo de Trabajo: {viewClient.name}</h2>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Gestión de roles operativos y técnicos</p>
                          </div>
                      </div>
                      <button onClick={() => { setViewClient(null); setShowCreateUserForm(false); setShowLinkUserForm(false); }} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition"><X size={28}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          {/* Sidebar: Add Team Member */}
                          <div className="space-y-6">
                              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Acciones de Personal</h3>
                              <button onClick={() => { setShowCreateUserForm(true); setShowLinkUserForm(false); }} className="w-full bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                                  <UserPlus size={18} className="mr-2"/> Crear Nuevo Técnico
                              </button>
                              <button onClick={() => { setShowLinkUserForm(true); setShowCreateUserForm(false); }} className="w-full bg-white dark:bg-slate-800 text-gray-700 dark:text-white border border-gray-200 dark:border-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center justify-center hover:bg-gray-50 transition-all">
                                  <LinkIcon size={18} className="mr-2"/> Vincular Existente
                              </button>

                              {/* Form: Create User */}
                              {showCreateUserForm && (
                                  <form onSubmit={handleQuickAddUser} className="bg-gray-50 dark:bg-slate-950 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 space-y-4 animate-in fade-in">
                                      <h4 className="font-black text-xs uppercase tracking-tight text-gray-800 dark:text-white">Alta de Técnico/Visor</h4>
                                      <input required className={inputClass} placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                                      <input required type="email" className={inputClass} placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                                      <input required type="text" className={inputClass} placeholder="Contraseña Temporal" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                      <select className={inputClass} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                                          <option value="technician">Rol: Técnico (Carga datos)</option>
                                          <option value="viewer">Rol: Visor (Solo lectura)</option>
                                      </select>
                                      <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center">
                                          {isSaving ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>}
                                          Registrar
                                      </button>
                                  </form>
                              )}

                              {/* Form: Link User */}
                              {showLinkUserForm && (
                                  <form onSubmit={handleLinkExistingUser} className="bg-gray-50 dark:bg-slate-950 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 space-y-4 animate-in fade-in">
                                      <h4 className="font-black text-xs uppercase tracking-tight text-gray-800 dark:text-white">Asignar a este socio</h4>
                                      <select required className={inputClass} value={selectedExistingUserId} onChange={e => setSelectedExistingUserId(e.target.value)}>
                                          <option value="">Seleccionar usuario...</option>
                                          {availableUsersToLink.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                      </select>
                                      <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center">
                                          {isSaving ? <Loader2 size={16} className="animate-spin mr-2"/> : <LinkIcon size={16} className="mr-2"/>}
                                          Vincular
                                      </button>
                                  </form>
                              )}
                          </div>

                          {/* Team List */}
                          <div className="lg:col-span-2 space-y-4">
                              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Miembros Activos ({teamMembers.length})</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {teamMembers.length === 0 ? (
                                      <div className="col-span-full py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-slate-950 rounded-3xl border border-dashed">Aún no hay miembros asignados a este equipo.</div>
                                  ) : teamMembers.map(member => (
                                      <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between group">
                                          <div className="flex items-center space-x-3">
                                              <img src={member.avatar} className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-700 shadow-sm"/>
                                              <div>
                                                  <p className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">{member.name}</p>
                                                  <span className="text-[9px] font-black uppercase text-hemp-600 tracking-widest">{member.role === 'client' ? 'Titular Secundario' : member.role}</span>
                                              </div>
                                          </div>
                                          <button onClick={() => handleUnlinkUser(member)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition opacity-0 group-hover:opacity-100"><UserMinus size={18}/></button>
                                      </div>
                                  ))}
                              </div>

                              <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex items-start">
                                  <Shield size={24} className="text-amber-600 mr-4 mt-1 flex-shrink-0"/>
                                  <div className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                                      <p className="font-black uppercase tracking-widest mb-1">Nota de Privacidad</p>
                                      <p>Los miembros del equipo solo podrán visualizar y editar datos vinculados exclusivamente a <strong>{viewClient.name}</strong>. No tienen acceso a la configuración global del sistema ni a otros socios de la red.</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CREATE / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-xl w-full p-10 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <h2 className="text-3xl font-black mb-8 text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestionar <span className="text-hemp-600">Socio de Red</span></h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Identidad del Socio</label>
                      <label className="flex items-center space-x-2 cursor-pointer bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800">
                          <input type="checkbox" className="rounded text-amber-500" checked={formData.isNetworkMember} onChange={e => setFormData({...formData, isNetworkMember: e.target.checked})} />
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tighter">Miembro de la Red</span>
                      </label>
                  </div>
                  <input required type="text" placeholder="Razón Social / Nombre Comercial" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Escala / Tipo</label>
                          <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as RoleType})}>
                              <option value="Productor Pequeño (<5 ha)">Productor Pequeño</option>
                              <option value="Productor Mediano (5-15 ha)">Productor Mediano</option>
                              <option value="Productor Grande (>15 ha)">Productor Grande</option>
                              <option value="Empresa Privada">Empresa Privada</option>
                              <option value="Gobierno">Gobierno</option>
                              <option value="Academia">Universidad/Academia</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">CUIT / ID Fiscal</label>
                          <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                      </div>
                  </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                   <label className="block text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                      <LinkIcon size={14} className="mr-2"/> Vinculación con Usuario Maestro
                   </label>
                   <select className={`${inputClass} mb-4`} value={formData.relatedUserId || ''} onChange={(e) => {
                       const user = usersList.find(u => u.id === e.target.value);
                       if (user) setFormData({ ...formData, relatedUserId: user.id, contactName: user.name, email: user.email });
                       else setFormData({...formData, relatedUserId: ''});
                   }}>
                       <option value="">-- Sin vinculación / Usuario nuevo --</option>
                       {usersList.filter(u => !u.clientId || u.clientId === editingId).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                   </select>
                   <div className="space-y-4">
                       <input required type="text" placeholder="Nombre de Persona de Contacto" className={inputClass} value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                       <input type="email" placeholder="Email de Contacto" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                <button type="submit" className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all">Guardar Socio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
