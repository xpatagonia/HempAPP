
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User, MembershipLevel } from '../types';
import { 
  Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, 
  Users, Building, Eye, X, Link as LinkIcon, UserCheck, 
  Shield, UserPlus, Star, Loader2, Save, UserMinus, 
  Archive, Sprout, BookOpen, Clock, ClipboardCheck, ArrowUpRight,
  Info, Navigation, CheckCircle2
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

export default function Clients() {
  const { 
    clients, addClient, updateClient, deleteClient, currentUser, 
    usersList, seedMovements
  } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Client> & { lat: string, lng: string, teamUserIds: string[] }>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
    isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
    membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
    lat: '', lng: '', teamUserIds: []
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- FILTROS DE USUARIOS ---
  const eligibleUsers = useMemo(() => {
      return usersList.filter(u => u.role === 'client' || u.role === 'technician');
  }, [usersList]);

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
        } else {
            throw new Error("El servidor rechazó la operación.");
        }
    } catch (err: any) {
        alert("ERROR: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
        name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
        isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
        membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
        lat: '', lng: '', teamUserIds: []
    });
    setEditingId(null);
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
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Panel de <span className="text-hemp-600">Socios Cooperativos</span></h1>
            <p className="text-sm text-gray-500">Gestión de organizaciones y equipos de trabajo.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Alta de Socio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => {
            const team = usersList.filter(u => u.clientId === client.id);
            const owner = usersList.find(u => u.id === client.relatedUserId);

            return (
                <div key={client.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full overflow-hidden">
                    <div className={`absolute top-0 left-0 px-4 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-widest border-b border-r shadow-sm z-10 ${
                        client.membershipLevel === 'Premium' ? 'bg-amber-500 text-white' : 
                        client.membershipLevel === 'En Observación' ? 'bg-red-500 text-white' : 'bg-hemp-600 text-white'
                      }`}>
                        {client.membershipLevel || 'SOCIO'}
                    </div>
                    
                    <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        {isAdmin && (
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
                              }} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Edit2 size={18} /></button>
                        )}
                        <button onClick={() => { if(window.confirm("¿Eliminar socio?")) deleteClient(client.id); }} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Trash2 size={18} /></button>
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
                        <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800">
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Equipo de Trabajo</p>
                             <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {team.slice(0, 5).map(u => (
                                        <img key={u.id} title={u.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 object-cover" src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`}/>
                                    ))}
                                    {team.length > 5 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-black">+{team.length - 5}</div>
                                    )}
                                    {team.length === 0 && <span className="text-[10px] text-slate-400 italic">Sin equipo asignado</span>}
                                </div>
                                <span className="text-xs font-black text-hemp-600">{team.length} Integrantes</span>
                             </div>
                        </div>

                        <div className="space-y-2 text-sm bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-50 dark:border-blue-900/20">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-400 uppercase text-[9px]">Titular de Cuenta</span>
                                <span className="font-black text-gray-800 dark:text-gray-200 uppercase truncate max-w-[120px]">{owner?.name || client.contactName}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2">
                                <span className="font-bold text-gray-400 uppercase text-[9px]">CUIT / ID Fiscal</span>
                                <span className="font-mono font-bold text-gray-600 dark:text-gray-400">{client.cuit || 'S/D'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-5xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestionar <span className="text-hemp-600">Socio de Red</span></h2>
                <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Perfil Cooperativo</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <input required type="text" placeholder="Razón Social / Nombre Comercial" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <select className={inputClass} value={formData.membershipLevel} onChange={e => setFormData({...formData, membershipLevel: e.target.value as MembershipLevel})}>
                                    <option value="Activo">Estado: Activo</option>
                                    <option value="Premium">Estado: Premium (I+D)</option>
                                    <option value="En Observación">En Observación</option>
                                </select>
                                <input type="date" className={inputClass} value={formData.contractDate} onChange={e => setFormData({...formData, contractDate: e.target.value})} />
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
                                <label className="block text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase mb-2">Vincular Titular de Cuenta *</label>
                                <select 
                                    className={inputClass} 
                                    value={formData.relatedUserId || ''} 
                                    onChange={e => {
                                        const userId = e.target.value;
                                        const user = usersList.find(u => u.id === userId);
                                        setFormData({
                                            ...formData, 
                                            relatedUserId: userId,
                                            contactName: user ? user.name : formData.contactName,
                                            email: user ? user.email : formData.email
                                        });
                                    }}
                                >
                                    <option value="">-- Sin cuenta asignada --</option>
                                    {eligibleUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role === 'client' ? 'Productor' : 'Técnico'})</option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-amber-600 mt-2 font-bold italic">Este usuario será el "dueño" de la organización.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                        <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center"><Users size={14} className="mr-2"/> Gestión de Equipo de Trabajo</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {eligibleUsers.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No hay usuarios disponibles para asignar.</p>
                            ) : eligibleUsers.map(u => {
                                const isSelected = formData.teamUserIds?.includes(u.id);
                                return (
                                    <div 
                                        key={u.id} 
                                        onClick={() => toggleTeamUser(u.id)}
                                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                            isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white' 
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white/20"/>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight">{u.name}</p>
                                                <p className={`text-[9px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{u.jobTitle || u.role}</p>
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle2 size={16}/>}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[9px] text-blue-400 mt-4 italic font-bold">Marque a los técnicos o colaboradores que pertenecen a esta empresa.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col h-full">
                        <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <MapPin size={14} className="mr-2"/> Georreferencia de Sede
                        </h3>
                        <div className="flex-1 min-h-[250px] rounded-2xl overflow-hidden border dark:border-slate-800 shadow-inner mb-4 relative">
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
                            <div>
                                <label className="block text-[9px] font-black text-emerald-900 dark:text-emerald-400 mb-1 flex items-center uppercase tracking-widest">Latitud</label>
                                <input type="text" className={`${inputClass} text-xs h-9 bg-white/50`} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} placeholder="-34.0000" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-emerald-900 dark:text-emerald-400 mb-1 flex items-center uppercase tracking-widest">Longitud</label>
                                <input type="text" className={`${inputClass} text-xs h-9 bg-white/50`} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} placeholder="-58.0000" />
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t dark:border-slate-800">
                <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {editingId ? 'Actualizar Socio' : 'Finalizar Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
