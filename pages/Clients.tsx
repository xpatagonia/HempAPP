
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User, MembershipLevel, UserRole } from '../types';
import { 
  Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, 
  Users, Building, Eye, X, Link as LinkIcon, UserCheck, 
  Shield, UserPlus, Star, Loader2, Save, UserMinus, 
  Archive, Sprout, BookOpen, Clock, ClipboardCheck, ArrowUpRight,
  Info, Navigation, CheckCircle2, Key, LayoutGrid, Activity
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

export default function Clients() {
  const { 
    clients, addClient, updateClient, deleteClient, currentUser, 
    usersList, addUser, varieties, plots
  } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showStaffCreator, setShowStaffCreator] = useState(false);

  // Estados de Formulario de Socio
  const [formData, setFormData] = useState<Partial<Client> & { lat: string, lng: string, teamUserIds: string[] }>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
    address: '', totalHectares: 0,
    isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
    membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
    lat: '', lng: '', teamUserIds: []
  });

  // Estados de Formulario de Personal (Nuevo Usuario)
  const [staffData, setStaffData] = useState({ name: '', email: '', password: '', role: 'technician' as UserRole, jobTitle: '' });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';

  // --- FILTROS DE VISTA SAAS ---
  const myClients = useMemo(() => {
      if (isAdmin) return clients;
      if (isClient && currentUser?.clientId) return clients.filter(c => c.id === currentUser.clientId);
      return [];
  }, [clients, isAdmin, isClient, currentUser]);

  const eligibleUsers = useMemo(() => {
      return usersList.filter(u => 
        (u.role === 'client' || u.role === 'technician' || u.role === 'viewer') && 
        (!u.clientId || u.clientId === editingId)
      );
  }, [usersList, editingId]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat.replace(',', '.'));
        const finalLng = parseFloat(formData.lng.replace(',', '.'));
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : null;

        const clientPayload = {
            id: editingId || crypto.randomUUID(),
            name: formData.name!.trim(),
            type: formData.type,
            contactName: formData.contactName?.trim(),
            contactPhone: formData.contactPhone?.trim(),
            email: formData.email?.trim(),
            address: formData.address?.trim(), // Dirección Postal
            totalHectares: Number(formData.totalHectares || 0), // Hectáreas socio
            isNetworkMember: formData.isNetworkMember,
            membershipLevel: formData.membershipLevel,
            contractDate: formData.contractDate,
            cuit: formData.cuit?.trim(),
            notes: formData.notes,
            relatedUserId: formData.relatedUserId || null,
            coordinates
        } as Client;

        let success = false;
        if (editingId) {
            success = await updateClient(clientPayload, formData.teamUserIds);
        } else {
            success = await addClient(clientPayload, formData.teamUserIds);
        }

        if (success) {
            setIsModalOpen(false);
            resetForm();
        } else throw new Error("Fallo en sincronización central.");
    } catch (err: any) { alert("ERROR OPERATIVO: " + err.message);
    } finally { setIsSaving(false); }
  };

  const handleCreateStaff = async () => {
      if (!staffData.name || !staffData.email || !staffData.password) return;
      setIsSaving(true);
      const newUser: User = {
          id: Date.now().toString(),
          ...staffData,
          clientId: editingId || undefined,
          isNetworkMember: formData.isNetworkMember || false
      };
      const success = await addUser(newUser);
      if (success) {
          setFormData(prev => ({ ...prev, teamUserIds: [...(prev.teamUserIds || []), newUser.id] }));
          setShowStaffCreator(false);
          setStaffData({ name: '', email: '', password: '', role: 'technician', jobTitle: '' });
          alert("Miembro de equipo creado exitosamente.");
      }
      setIsSaving(false);
  };

  const resetForm = () => {
    setFormData({ 
        name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
        address: '', totalHectares: 0,
        isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
        membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
        lat: '', lng: '', teamUserIds: []
    });
    setEditingId(null);
    setShowStaffCreator(false);
  };

  const toggleTeamUser = (userId: string) => {
      const current = formData.teamUserIds || [];
      if (current.includes(userId)) {
          setFormData({ ...formData, teamUserIds: current.filter(id => id !== userId) });
      } else {
          setFormData({ ...formData, teamUserIds: [...current, userId] });
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">
                {isClient ? 'Mi' : 'Socios de'} <span className="text-hemp-600">Organización</span>
            </h1>
            <p className="text-sm text-gray-500">Gestión de recursos humanos y perfiles corporativos.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Alta de Socio
          </button>
        )}
      </div>

      {myClients.length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-dashed text-center">
              <Building size={48} className="mx-auto text-slate-300 mb-4"/>
              <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Sin Entidad Vinculada</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Contacta al Administrador Master para que vincule tu usuario a una organización socio.</p>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myClients.map(client => {
            const team = usersList.filter(u => u.clientId === client.id);
            const owner = usersList.find(u => u.id === client.relatedUserId);
            const locCount = plots.filter(p => p.locationId && team.some(u => u.id === p.responsibleIds?.[0])).length;

            return (
                <div key={client.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full overflow-hidden">
                    <div className={`absolute top-0 left-0 px-4 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-widest border-b border-r shadow-sm z-10 ${
                        client.membershipLevel === 'Premium' ? 'bg-amber-50 text-white' : 
                        client.membershipLevel === 'En Observación' ? 'bg-red-50 text-white' : 'bg-hemp-600 text-white'
                      }`}>
                        {client.membershipLevel || 'SOCIO'}
                    </div>
                    
                    <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={() => { 
                            setFormData({
                                ...client,
                                relatedUserId: client.relatedUserId || '',
                                lat: client.coordinates?.lat.toString() || '',
                                lng: client.coordinates?.lng.toString() || '',
                                teamUserIds: team.map(u => u.id)
                            }); 
                            setEditingId(client.id); 
                            setIsModalOpen(true); 
                          }} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition">
                             <Edit2 size={18} />
                        </button>
                        {isAdmin && (
                           <button onClick={() => { if(window.confirm("¿Eliminar socio?")) deleteClient(client.id); }} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Trash2 size={18} /></button>
                        )}
                    </div>

                    <div className="flex items-center space-x-4 mb-6 mt-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-slate-600 dark:text-slate-400">
                            <Building size={24} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-black text-gray-800 dark:text-white leading-none uppercase tracking-tighter truncate">{client.name}</h3>
                            <span className="text-[10px] uppercase font-black text-gray-400 mt-2 block tracking-widest">{client.type}</span>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        {client.address && (
                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center">
                                <MapPin size={10} className="mr-1.5 text-hemp-500"/> {client.address}
                            </div>
                        )}
                        <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800">
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Equipo Operativo</p>
                             <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {team.map(u => (
                                        <img key={u.id} title={u.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 object-cover" src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`}/>
                                    ))}
                                    {team.length === 0 && <span className="text-[10px] text-slate-400 italic">Sin personal asignado</span>}
                                </div>
                                <span className="text-xs font-black text-hemp-600">{team.length} Miembros</span>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-center">
                                 <p className="text-[8px] font-black text-blue-400 uppercase">Superficie</p>
                                 <p className="text-sm font-black text-blue-900">{client.totalHectares || 0} Ha</p>
                             </div>
                             <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-center">
                                 <p className="text-[8px] font-black text-emerald-400 uppercase">Labor Activa</p>
                                 <p className="text-sm font-black text-emerald-900">{locCount} Parcelas</p>
                             </div>
                        </div>
                    </div>
                    
                    <button onClick={() => { 
                        setFormData({
                            ...client,
                            relatedUserId: client.relatedUserId || '',
                            lat: client.coordinates?.lat.toString() || '',
                            lng: client.coordinates?.lng.toString() || '',
                            teamUserIds: team.map(u => u.id)
                        }); 
                        setEditingId(client.id); 
                        setIsModalOpen(true); 
                    }} className="mt-4 w-full py-3 bg-slate-900 dark:bg-hemp-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:scale-[1.02] transition-all">
                        <Users size={14} className="mr-2"/> Gestionar Estructura
                    </button>
                </div>
            );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-6xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Administrar <span className="text-hemp-600">Mi Organización</span></h2>
                <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLUMNA 1: DATOS CORPORATIVOS */}
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Perfil Cooperativo</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Razón Social *</label>
                                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Dirección Postal de Oficina</label>
                                <input type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ej: Av. Rural 1234, Rosario" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Escala Productiva</label>
                                    <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as RoleType})}>
                                        <option value="Productor Pequeño (0-5 ha)">Pequeño (0-5)</option>
                                        <option value="Productor Mediano (5-15 ha)">Mediano (5-15)</option>
                                        <option value="Productor Grande (>20 ha)">Grande (+20)</option>
                                        <option value="Empresa Privada">Empresa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Ha Totales</label>
                                    <input type="number" className={inputClass} value={formData.totalHectares} onChange={e => setFormData({...formData, totalHectares: Number(e.target.value)})} placeholder="0" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">CUIT Fiscal</label>
                                <input type="text" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30 flex flex-col">
                        <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <Navigation size={14} className="mr-2"/> Georreferencia Central
                        </h3>
                        <div className="h-48 rounded-2xl overflow-hidden border dark:border-slate-800 mb-4">
                             <MapEditor 
                                initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat.replace(',','.')), lng: parseFloat(formData.lng.replace(',','.')) } : undefined} 
                                initialPolygon={formData.lat && formData.lng ? [{ lat: parseFloat(formData.lat.replace(',','.')), lng: parseFloat(formData.lng.replace(',','.')) }] : []} 
                                onPolygonChange={(poly) => {
                                    if(poly.length > 0) setFormData({...formData, lat: poly[0].lat.toFixed(7), lng: poly[0].lng.toFixed(7)});
                                }} 
                                height="100%" 
                             />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" className={`${inputClass} text-xs`} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} placeholder="Latitud" />
                            <input type="text" className={`${inputClass} text-xs`} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} placeholder="Longitud" />
                        </div>
                    </div>
                </div>

                {/* COLUMNA 2: GESTION DE EQUIPO */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center uppercase tracking-tighter">
                                    <Users size={24} className="mr-2 text-hemp-500"/> Equipo de Trabajo
                                </h3>
                                <p className="text-xs text-slate-400 font-bold">Gestiona quiénes operan en tu organización.</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowStaffCreator(!showStaffCreator)}
                                className="bg-hemp-600 hover:bg-hemp-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition shadow-lg"
                            >
                                {showStaffCreator ? <X size={14} className="mr-2"/> : <UserPlus size={14} className="mr-2"/>}
                                {showStaffCreator ? 'Cerrar Alta' : 'Dar de Alta Personal'}
                            </button>
                        </div>

                        {showStaffCreator ? (
                            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 animate-in slide-in-from-top-4 mb-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Nombre Completo" className={inputClass} value={staffData.name} onChange={e => setStaffData({...staffData, name: e.target.value})} />
                                    <input type="email" placeholder="Email (Login)" className={inputClass} value={staffData.email} onChange={e => setStaffData({...staffData, email: e.target.value})} />
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                        <input type="password" placeholder="Contraseña Inicial" className={`${inputClass} pl-10`} value={staffData.password} onChange={e => setStaffData({...staffData, password: e.target.value})} />
                                    </div>
                                    <select className={inputClass} value={staffData.role} onChange={e => setStaffData({...staffData, role: e.target.value as any})}>
                                        <option value="technician">Rol: Técnico de Campo</option>
                                        <option value="viewer">Rol: Solo Lectura</option>
                                    </select>
                                    <button 
                                        type="button" 
                                        onClick={handleCreateStaff}
                                        disabled={!staffData.name || !staffData.email || !staffData.password || isSaving}
                                        className="md:col-span-2 bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-30"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'Finalizar Alta de Empleado'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar relative z-10 text-white">
                                {eligibleUsers.length === 0 ? (
                                    <div className="col-span-2 py-10 text-center text-slate-500 italic">No hay personal libre para asignar. Crea uno nuevo arriba.</div>
                                ) : eligibleUsers.map(u => {
                                    const isSelected = formData.teamUserIds?.includes(u.id);
                                    return (
                                        <div 
                                            key={u.id} 
                                            onClick={() => toggleTeamUser(u.id)}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                                isSelected 
                                                    ? 'bg-hemp-600 border-hemp-500 text-white shadow-lg scale-[1.02]' 
                                                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="relative">
                                                    <img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white/10"/>
                                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${u.role === 'technician' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight leading-none">{u.name}</p>
                                                    <p className={`text-[9px] font-bold mt-1 uppercase ${isSelected ? 'text-hemp-100' : 'text-slate-500'}`}>{u.jobTitle || u.role}</p>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle2 size={18}/>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Decoración Background */}
                        <Activity className="absolute -bottom-10 -right-10 text-white opacity-5 w-64 h-64" />
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                        <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4">Información de Contacto Organizacional</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input required type="text" placeholder="Nombre de Enlace Principal" className={inputClass} value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                            <input type="text" placeholder="WhatsApp Corporativo" className={inputClass} value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
                        </div>
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800">
                <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cerrar sin guardar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {editingId ? 'Actualizar Estructura' : 'Guardar y Finalizar Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
