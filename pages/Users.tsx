
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, RoleType, Client } from '../types';
import { Plus, Trash2, Edit2, Shield, Wrench, Eye, AlertCircle, Lock, Key, Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon, UserCheck, Building, X, Sparkles, PlusCircle, Star, Search, Filter, FilterX } from 'lucide-react';

const PRESET_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sawyer&backgroundColor=d1d4f9",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=ffd5dc",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Preston&backgroundColor=c0aede",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lola&backgroundColor=ffdfbf",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper&backgroundColor=d1d4f9"
];

export default function Users() {
  const { usersList, addUser, updateUser, deleteUser, currentUser, clients, addClient } = useAppContext();
  
  // States for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientIsRed, setQuickClientIsRed] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'technician', password: '', jobTitle: '', phone: '', avatar: PRESET_AVATARS[0], clientId: '', isNetworkMember: false
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const filteredUsers = useMemo(() => {
      return usersList.filter(u => {
          const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
          const matchRole = filterRole === 'all' || u.role === filterRole;
          return matchSearch && matchRole;
      });
  }, [usersList, searchTerm, filterRole]);

  const handleEdit = (user: User) => {
    if (!isSuperAdmin && user.role === 'super_admin') {
        alert("Permisos insuficientes para editar un Super Administrador.");
        return;
    }
    setFormData({ ...user, password: '' }); 
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleQuickClientSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!quickClientName.trim()) return;
      
      const newClientId = Date.now().toString();
      const newClient: Client = {
          id: newClientId,
          name: quickClientName.trim(),
          type: 'Empresa Privada',
          contactName: formData.name || 'Titular',
          email: formData.email || '',
          isNetworkMember: quickClientIsRed
      };
      
      setIsSaving(true);
      const success = await addClient(newClient);
      setIsSaving(false);
      
      if (success) {
          setFormData(prev => ({ ...prev, clientId: newClientId, isNetworkMember: quickClientIsRed }));
          setShowQuickClient(false);
          setQuickClientName('');
          setQuickClientIsRed(false);
          alert(`Entidad "${newClient.name}" creada y vinculada.`);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    setIsSaving(true);
    try {
        const payload = {
            name: formData.name!.trim(),
            email: formData.email!.trim(),
            role: formData.role as UserRole,
            jobTitle: formData.jobTitle || '',
            phone: formData.phone || '',
            avatar: formData.avatar || PRESET_AVATARS[0],
            clientId: (formData.role === 'client' || formData.role === 'technician') ? formData.clientId : null,
            isNetworkMember: formData.isNetworkMember || false
        };

        if (editingId) {
            const oldUser = usersList.find(u => u.id === editingId);
            const finalPassword = formData.password ? formData.password : oldUser?.password;
            const success = await updateUser({ ...payload, id: editingId, password: finalPassword } as User);
        } else {
            if (!formData.password) { alert("Asigne una clave."); setIsSaving(false); return; }
            const success = await addUser({ ...payload, id: Date.now().toString(), password: formData.password } as User);
        }
        setIsModalOpen(false);
    } catch (err: any) {
        alert(err.message || "Fallo en la sincronización.");
    } finally { setIsSaving(false); }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Equipo & <span className="text-hemp-600">Roles</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de personal corporativo, técnicos de campo y productores.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', email: '', role: 'technician', password: '', avatar: PRESET_AVATARS[0], clientId: '', isNetworkMember: false }); setIsModalOpen(true); }} className="w-full md:w-auto bg-hemp-600 text-white px-6 py-3 rounded-[20px] flex items-center justify-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
          <Plus size={18} className="mr-2" /> Nuevo Perfil
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[24px] shadow-sm border dark:border-slate-800 flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Buscar por nombre o correo..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border border-transparent focus:bg-white dark:focus:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-2">
              <select className="px-4 py-3 bg-gray-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none dark:text-white" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                  <option value="all">Todos los Roles</option>
                  <option value="admin">Administrador</option>
                  <option value="technician">Técnico de Campo</option>
                  <option value="client">Productor / Socio</option>
                  <option value="viewer">Visor Externo</option>
              </select>
              <button onClick={() => { setSearchTerm(''); setFilterRole('all'); }} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all" title="Limpiar Filtros"><FilterX size={20}/></button>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5">Perfil</th>
                  <th className="px-8 py-5">Rol / Jerarquía</th>
                  <th className="px-8 py-5">Entidad / Organización</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic font-medium">No se encontraron usuarios.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="relative">
                            <img className="h-11 w-11 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm mr-4 object-cover bg-slate-100" src={user.avatar || PRESET_AVATARS[0]} alt="" />
                            {user.isNetworkMember && <div className="absolute -bottom-1 -right-0.5 bg-amber-500 p-0.5 rounded-full border border-white dark:border-slate-900"><Star size={8} className="text-white fill-current"/></div>}
                        </div>
                        <div>
                          <div className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight">{user.name}</div>
                          <div className="text-[10px] text-gray-400 font-bold lowercase tracking-normal">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block ${
                        user.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-100' :
                        user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        user.role === 'client' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {user.role === 'client' ? 'Productor/Socio' : user.role.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       {(user.role === 'client' || user.role === 'technician') && user.clientId ? (
                           <div className="flex items-center text-gray-600 dark:text-gray-300 font-black text-xs uppercase tracking-tight italic">
                               <Building size={14} className="mr-2 text-hemp-600 opacity-50"/>
                               {clients.find(c => c.id === user.clientId)?.name || 'Empresa No Encontrada'}
                           </div>
                       ) : <span className="text-gray-300 dark:text-slate-600 italic text-[10px] uppercase font-black tracking-widest">Sede Central</span>}
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition shadow-sm border border-transparent hover:border-blue-100"><Edit2 size={16} /></button>
                            <button onClick={() => { if(window.confirm("¿Eliminar usuario?")) deleteUser(user.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shadow-sm border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-2xl w-full p-10 my-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><UserIcon size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Ficha de Perfil</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuración de seguridad e identidad</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-3">Seleccionar Avatar</label>
                            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                {PRESET_AVATARS.map((av, idx) => (
                                    <button key={idx} type="button" onClick={() => setFormData({...formData, avatar: av})} className={`w-12 h-12 rounded-xl overflow-hidden transition-all border-2 ${formData.avatar === av ? 'border-hemp-600 scale-110 shadow-md' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                                        <img src={av} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Nombre Completo *</label><input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Especialidad</label><input className={inputClass} value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="Ej: Agrónomo"/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Email de Acceso *</label><input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">{editingId ? 'Cambiar Clave' : 'Clave Inicial *'}</label><input type="text" className={inputClass} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingId ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}/></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Rango Jerárquico</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { val: 'viewer', lab: 'Visor' },
                          { val: 'technician', lab: 'Técnico' },
                          { val: 'client', lab: 'Productor' },
                          { val: 'admin', lab: 'Admin' }
                        ].map((r) => (
                            <button
                                key={r.val}
                                type="button"
                                onClick={() => setFormData({...formData, role: r.val as UserRole})}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
                                    formData.role === r.val 
                                    ? 'bg-hemp-600 text-white border-hemp-600 shadow-lg' 
                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {r.lab}
                            </button>
                        ))}
                    </div>
                </div>

                {(formData.role === 'client' || formData.role === 'technician') && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-4">Entidad Vinculada</label>
                        <select required className={inputClass} value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                            <option value="">Seleccionar entidad...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={20}/> : <Save className="mr-2" size={18}/>}
                        Confirmar Perfil
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
