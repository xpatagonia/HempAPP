
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User, MembershipLevel } from '../types';
import { 
  Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, 
  Users, Building, Eye, X, Link as LinkIcon, UserCheck, 
  Shield, UserPlus, Star, Loader2, Save, UserMinus, 
  Archive, Sprout, BookOpen, Clock, ClipboardCheck, ArrowUpRight,
  Info, Navigation
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

export default function Clients() {
  const { 
    clients, addClient, updateClient, deleteClient, currentUser, 
    locations, usersList, addUser, updateUser, deleteUser,
    seedMovements, seedBatches, varieties, plots
  } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'team' | 'resources' | 'knowledge'>('team');

  // User Management States
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician' as 'technician' | 'viewer' });

  const [formData, setFormData] = useState<Partial<Client> & { lat: string, lng: string }>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
    isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
    membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
    lat: '', lng: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // --- CALCULATIONS FOR DETAIL VIEW ---
  
  const assignedMovements = useMemo(() => 
    viewClient ? seedMovements.filter(m => m.clientId === viewClient.id) : []
  , [viewClient, seedMovements]);

  const activeGenetics = useMemo(() => {
    if (!viewClient) return [];
    const clientLocations = locations.filter(l => l.clientId === viewClient.id).map(l => l.id);
    const clientPlots = plots.filter(p => clientLocations.includes(p.locationId) && p.status === 'Activa');
    const varIds = Array.from(new Set(clientPlots.map(p => p.varietyId)));
    return varieties.filter(v => varIds.includes(v.id));
  }, [viewClient, plots, locations, varieties]);

  const teamMembers = useMemo(() => 
    viewClient ? usersList.filter(u => u.clientId === viewClient.id) : []
  , [viewClient, usersList]);

  // --- HANDLERS ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    // Construcción de coordenadas
    const finalLat = parseFloat(formData.lat);
    const finalLng = parseFloat(formData.lng);
    const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : undefined;

    const payload = {
        name: formData.name!.trim(),
        type: formData.type,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        email: formData.email,
        isNetworkMember: formData.isNetworkMember,
        membershipLevel: formData.membershipLevel,
        contractDate: formData.contractDate,
        cuit: formData.cuit,
        notes: formData.notes,
        relatedUserId: formData.relatedUserId,
        coordinates,
        id: editingId || Date.now().toString(),
    } as Client;

    if (editingId) {
        updateClient(payload);
    } else {
        await addClient(payload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
        name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
        isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
        membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
        lat: '', lng: ''
    });
    setEditingId(null);
  };

  const handleMapChange = (poly: { lat: number, lng: number }[]) => {
      if (poly.length > 0) {
          setFormData(prev => ({ 
              ...prev, 
              lat: poly[0].lat.toFixed(6), 
              lng: poly[0].lng.toFixed(6) 
          }));
      }
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
          jobTitle: 'Personal de Socio',
          isNetworkMember: viewClient.isNetworkMember,
          avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
      } as User);

      if (success) {
          setNewUser({ name: '', email: '', password: '', role: 'technician' });
          setShowCreateUserForm(false);
      }
      setIsSaving(false);
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Panel de <span className="text-hemp-600">Socios Cooperativos</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de red industrial y distribución de recursos.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Alta de Socio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => {
            const locCount = locations.filter(l => l.clientId === client.id).length;
            const activePlots = plots.filter(p => locations.filter(l => l.clientId === client.id).map(lx => lx.id).includes(p.locationId) && p.status === 'Activa').length;
            
            return (
                <div key={client.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full overflow-hidden">
                  <div className={`absolute top-0 left-0 px-4 py-1 rounded-br-2xl text-[9px] font-black uppercase tracking-widest border-b border-r shadow-sm z-10 ${
                    client.membershipLevel === 'Premium' ? 'bg-amber-500 text-white' : 
                    client.membershipLevel === 'En Observación' ? 'bg-red-500 text-white' : 'bg-hemp-600 text-white'
                  }`}>
                      {client.membershipLevel || 'SOCIO'}
                  </div>
                  
                  <div className="absolute top-6 right-6 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => setViewClient(client)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Eye size={18} /></button>
                      {isAdmin && (
                          <button onClick={() => { 
                              setFormData({
                                  ...client,
                                  lat: client.coordinates?.lat.toString() || '',
                                  lng: client.coordinates?.lng.toString() || ''
                              }); 
                              setEditingId(client.id); 
                              setIsModalOpen(true); 
                            }} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition"><Edit2 size={18} /></button>
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

                  <div className="h-24 bg-gray-50 dark:bg-slate-950 mb-6 rounded-2xl overflow-hidden relative border dark:border-slate-800">
                      {client.coordinates ? (
                          <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?q=${client.coordinates.lat},${client.coordinates.lng}&z=10&output=embed`} className="opacity-50 group-hover:opacity-80 transition-opacity grayscale"></iframe>
                      ) : (
                          <div className="flex items-center justify-center h-full text-slate-300 text-[8px] font-black uppercase tracking-[0.2em] italic">Sin Georreferencia Central</div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Campos</p>
                          <p className="text-lg font-black text-gray-800 dark:text-white">{locCount}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 text-center">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ensayos</p>
                          <p className="text-lg font-black text-hemp-600">{activePlots}</p>
                      </div>
                  </div>

                  <div className="space-y-2 text-sm bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-50 dark:border-blue-900/20">
                      <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-400 uppercase text-[9px]">Titular</span>
                          <span className="font-black text-gray-800 dark:text-gray-200 uppercase truncate max-w-[120px]">{client.contactName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2">
                          <span className="font-bold text-gray-400 uppercase text-[9px]">Ingreso</span>
                          <span className="font-mono font-bold text-gray-600 dark:text-gray-400">{client.contractDate || 'S/D'}</span>
                      </div>
                  </div>
                  
                  <button onClick={() => setViewClient(client)} className="mt-auto pt-6 flex items-center justify-center w-full text-[10px] font-black uppercase text-hemp-600 hover:text-hemp-700 tracking-[0.2em] group/btn">
                      Gestionar Recursos <ArrowUpRight size={14} className="ml-1 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
            );
        })}
      </div>

      {/* --- MASTER DETAIL MODAL --- */}
      {viewClient && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                  <div className="px-10 py-8 bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center space-x-5">
                          <div className="bg-hemp-600 p-4 rounded-3xl text-white shadow-xl shadow-hemp-600/20"><Building size={32}/></div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">{viewClient.name}</h2>
                                  <span className="px-3 py-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-full text-[9px] font-black uppercase tracking-widest text-hemp-600 shadow-sm">{viewClient.membershipLevel}</span>
                              </div>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center">
                                  <Shield size={12} className="mr-1.5 text-blue-500"/> Auditoría de Socio • Miembro desde {viewClient.contractDate}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setViewClient(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition text-slate-400 self-start md:self-center"><X size={32}/></button>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Sub-Tabs */}
                      <div className="px-10 py-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex space-x-8 overflow-x-auto custom-scrollbar">
                          <button onClick={() => setActiveSubTab('resources')} className={`pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center whitespace-nowrap ${activeSubTab === 'resources' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                              <Archive size={14} className="mr-2"/> Recursos Asignados
                          </button>
                          <button onClick={() => setActiveSubTab('team')} className={`pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center whitespace-nowrap ${activeSubTab === 'team' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                              <Users size={14} className="mr-2"/> Equipo de Trabajo
                          </button>
                          <button onClick={() => setActiveSubTab('knowledge')} className={`pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center whitespace-nowrap ${activeSubTab === 'knowledge' ? 'border-hemp-600 text-hemp-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                              <BookOpen size={14} className="mr-2"/> Base de Conocimientos
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                          {/* TAB: RESOURCES (CONTROL ESTRICTO) */}
                          {activeSubTab === 'resources' && (
                              <div className="space-y-8 animate-in fade-in">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border dark:border-slate-800">
                                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Semillas</p>
                                          <p className="text-2xl font-black text-gray-800 dark:text-white">{assignedMovements.reduce((s,m) => s + m.quantity, 0)} kg</p>
                                      </div>
                                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border dark:border-slate-800">
                                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remitos Activos</p>
                                          <p className="text-2xl font-black text-blue-600">{assignedMovements.filter(m => m.status === 'En Tránsito').length}</p>
                                      </div>
                                  </div>

                                  <section>
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                                          <ClipboardCheck size={14} className="mr-2 text-hemp-600"/> Historial de Entrega de Suministros
                                      </h4>
                                      <div className="bg-white dark:bg-slate-950 rounded-3xl border dark:border-slate-800 overflow-hidden">
                                          <table className="min-w-full text-xs text-left">
                                              <thead className="bg-slate-50 dark:bg-slate-900 text-gray-500 uppercase font-black text-[9px] tracking-widest border-b dark:border-slate-800">
                                                  <tr>
                                                      <th className="px-6 py-4">Fecha</th>
                                                      <th className="px-6 py-4">Material / Lote</th>
                                                      <th className="px-6 py-4">Cantidad</th>
                                                      <th className="px-6 py-4">Estado</th>
                                                      <th className="px-6 py-4">Guía</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                  {assignedMovements.length === 0 ? (
                                                      <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No se han asignado recursos aún.</td></tr>
                                                  ) : assignedMovements.map(m => {
                                                      const b = seedBatches.find(bx => bx.id === m.batchId);
                                                      const v = varieties.find(vx => vx.id === b?.varietyId);
                                                      return (
                                                          <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                                              <td className="px-6 py-4 font-bold text-slate-500">{m.date}</td>
                                                              <td className="px-6 py-4">
                                                                  <div className="font-black text-slate-800 dark:text-white uppercase">{v?.name || 'Insumo'}</div>
                                                                  <div className="text-[10px] text-slate-400 font-bold">{b?.batchCode || 'REF-GEN'}</div>
                                                              </td>
                                                              <td className="px-6 py-4 font-black text-hemp-700">{m.quantity} kg</td>
                                                              <td className="px-6 py-4">
                                                                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'Recibido' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                                                              </td>
                                                              <td className="px-6 py-4 font-mono font-bold text-blue-500">{m.transportGuideNumber || '-'}</td>
                                                          </tr>
                                                      )
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>
                                  </section>
                              </div>
                          )}

                          {/* TAB: TEAM */}
                          {activeSubTab === 'team' && (
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in">
                                  <div className="space-y-6">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personal Operativo</h4>
                                      <button onClick={() => setShowCreateUserForm(true)} className="w-full bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                                          <UserPlus size={18} className="mr-2"/> Alta de Técnico
                                      </button>
                                      {showCreateUserForm && (
                                          <form onSubmit={handleQuickAddUser} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2">
                                              <input required className={inputClass} placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                                              <input required type="email" className={inputClass} placeholder="Email corporativo" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                                              <input required type="text" className={inputClass} placeholder="Clave temporal" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center">
                                                  {isSaving ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>}
                                                  Registrar Técnico
                                              </button>
                                          </form>
                                      )}
                                  </div>
                                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {teamMembers.map(member => (
                                          <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 flex items-center justify-between group shadow-sm">
                                              <div className="flex items-center space-x-4">
                                                  <img src={member.avatar} className="w-12 h-12 rounded-2xl border-2 border-white dark:border-slate-700 shadow-sm"/>
                                                  <div>
                                                      <p className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">{member.name}</p>
                                                      <span className="text-[9px] font-black uppercase text-hemp-600 tracking-widest">{member.role}</span>
                                                  </div>
                                              </div>
                                              <button onClick={() => window.confirm("Quitar?") && updateUser({ ...member, clientId: undefined })} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><UserMinus size={18}/></button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* TAB: KNOWLEDGE (ACCESO ESTRATÉGICO) */}
                          {activeSubTab === 'knowledge' && (
                              <div className="space-y-6 animate-in fade-in">
                                  <div className="flex items-start gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                                      <Info size={24} className="text-blue-600 mt-1 flex-shrink-0"/>
                                      <div>
                                          <h4 className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase mb-1">Centro de Asistencia Técnica</h4>
                                          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">Mostrando protocolos exclusivos para las genéticas currently assigned to your fields. This knowledge base is property of the cooperative and restricted for members.</p>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {activeGenetics.length === 0 ? (
                                          <div className="col-span-full py-20 text-center text-gray-400 italic">No hay cultivos activos vinculados para mostrar protocolos.</div>
                                      ) : activeGenetics.map(v => (
                                          <div key={v.id} className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border dark:border-slate-700 shadow-sm flex flex-col h-full">
                                              <div className="flex items-center gap-3 mb-6">
                                                  <div className="bg-hemp-50 dark:bg-hemp-900/30 p-3 rounded-2xl text-hemp-600"><Sprout size={24}/></div>
                                                  <div>
                                                      <h5 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">{v.name}</h5>
                                                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Protocolo Agronómico {v.usage}</p>
                                                  </div>
                                              </div>
                                              <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic border dark:border-slate-800">
                                                  {v.knowledgeBase || "Solicitar protocolos específicos a la central cooperativa."}
                                              </div>
                                              <div className="mt-6 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                  <span className="flex items-center"><Clock size={12} className="mr-1.5"/> Ciclo: {v.cycleDays} días</span>
                                                  <button className="text-hemp-600 hover:underline">Descargar PDF →</button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CREATE / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Gestión de <span className="text-hemp-600">Socio de Red</span></h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
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
                                <input type="date" title="Fecha Alta Contrato" className={inputClass} value={formData.contractDate} onChange={e => setFormData({...formData, contractDate: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as RoleType})}>
                                    <option value="Productor Pequeño (<5 ha)">Escala: Pequeño</option>
                                    <option value="Productor Mediano (5-15 ha)">Escala: Mediano</option>
                                    <option value="Productor Grande (>15 ha)">Escala: Grande</option>
                                    <option value="Empresa Privada">Empresa Privada</option>
                                </select>
                                <input type="text" placeholder="CUIT / ID Fiscal" className={inputClass} value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                        <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-4">Información de Contacto</h3>
                        <div className="space-y-4">
                            <input required type="text" placeholder="Nombre de Persona de Contacto" className={inputClass} value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                    <input type="email" placeholder="Email corporativo" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    <input type="text" placeholder="WhatsApp / Teléfono" className={inputClass} value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col h-full">
                        <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <MapPin size={14} className="mr-2"/> Georreferencia de Sede
                        </h3>
                        <div className="flex-1 min-h-[250px] rounded-2xl overflow-hidden border dark:border-slate-800 shadow-inner mb-4">
                             <MapEditor 
                                initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} 
                                initialPolygon={formData.lat && formData.lng ? [{ lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }] : []} 
                                onPolygonChange={handleMapChange} 
                                height="100%" 
                             />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-black text-emerald-900 dark:text-emerald-400 mb-1 flex items-center uppercase tracking-widest">Latitud <Navigation size={10} className="ml-1" /></label>
                                <input type="text" className={`${inputClass} text-xs h-8`} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-emerald-900 dark:text-emerald-400 mb-1 flex items-center uppercase tracking-widest">Longitud <Navigation size={10} className="ml-1" /></label>
                                <input type="text" className={`${inputClass} text-xs h-8`} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                            </div>
                        </div>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase mt-2 text-center italic">Este punto identifica la base operativa del socio en la red global</p>
                    </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t dark:border-slate-800">
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
