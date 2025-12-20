
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, RoleType, Client } from '../types';
import { Plus, Trash2, Edit2, Shield, Wrench, Eye, AlertCircle, Lock, Key, Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon, UserCheck, Building, X, Sparkles, PlusCircle } from 'lucide-react';

const PRESET_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Callie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Dante",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Eliza",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Gizmo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Harley"
];

export default function Users() {
  const { usersList, addUser, updateUser, deleteUser, currentUser, clients, addClient } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Creación rápida de cliente
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');

  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'technician', password: '', jobTitle: '', phone: '', avatar: PRESET_AVATARS[0], clientId: ''
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const handleEdit = (user: User) => {
    if (!isSuperAdmin && user.role === 'super_admin') {
        alert("Acceso denegado.");
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
          isNetworkMember: true
      };
      
      setIsSaving(true);
      const success = await addClient(newClient);
      setIsSaving(false);
      
      if (success) {
          setFormData(prev => ({ ...prev, clientId: newClientId }));
          setShowQuickClient(false);
          setQuickClientName('');
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
            clientId: (formData.role === 'client' || formData.role === 'technician') ? formData.clientId : null
        };

        if (editingId) {
            const oldUser = usersList.find(u => u.id === editingId);
            const finalPassword = formData.password ? formData.password : oldUser?.password;
            await updateUser({ ...payload, id: editingId, password: finalPassword } as User);
        } else {
            if (!formData.password) { alert("Asigne una clave."); setIsSaving(false); return; }
            await addUser({ ...payload, id: Date.now().toString(), password: formData.password } as User);
        }
        setIsModalOpen(false);
    } catch (err: any) {
        alert("Error de persistencia.");
    } finally { setIsSaving(false); }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Personal & Roles</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Trazabilidad de operarios y niveles de acceso.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', email: '', role: 'technician', password: '', avatar: PRESET_AVATARS[0], clientId: '' }); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
          <Plus size={18} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
            <tr>
              <th className="px-8 py-5">Identidad</th>
              <th className="px-8 py-5">Rango / Cargo</th>
              <th className="px-8 py-5">Entidad Vinculada</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {usersList.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm mr-4" src={user.avatar || PRESET_AVATARS[0]} alt="" />
                    <div>
                      <div className="font-black text-gray-900 dark:text-white uppercase text-xs">{user.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                    user.role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-100' :
                    user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    user.role === 'client' ? 'bg-green-50 text-green-700 border-green-100' : 
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {user.role === 'client' ? 'Productor' : user.role.replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{user.jobTitle || '-'}</div>
                </td>
                <td className="px-8 py-5">
                   {(user.role === 'client' || user.role === 'technician') && user.clientId ? (
                       <div className="flex items-center text-gray-600 dark:text-gray-300 font-bold text-xs uppercase">
                           <Building size={14} className="mr-2 text-hemp-600 opacity-50"/>
                           {clients.find(c => c.id === user.clientId)?.name || 'Sin Entidad'}
                       </div>
                   ) : <span className="text-gray-300 dark:text-slate-600 italic text-xs">Interno</span>}
                </td>
                <td className="px-8 py-5 text-right">
                    <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 rounded-xl transition"><Edit2 size={18} /></button>
                        <button onClick={() => deleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-xl transition"><Trash2 size={18} /></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-2xl w-full p-10 overflow-y-auto max-h-[95vh] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Gestión de <span className="text-hemp-600">Usuario</span></h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><UserIcon size={14} className="mr-2"/> Perfil de Identidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="Nombre Completo" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <input placeholder="Cargo (Ej: Ing. Agrónomo)" className={inputClass} value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                        <input required type="email" placeholder="Email Laboral" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input type="text" placeholder={editingId ? 'Nueva Clave (opcional)' : 'Asignar Clave'} className={inputClass} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Nivel de Privilegios (Rol)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['viewer', 'technician', 'client', 'admin'].map((r) => (
                            <button key={r} type="button" onClick={() => setFormData({...formData, role: r as UserRole})} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${formData.role === r ? 'bg-hemp-600 text-white border-hemp-600 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                                {r === 'client' ? 'Productor' : r}
                            </button>
                        ))}
                    </div>
                </div>

                {(formData.role === 'client' || formData.role === 'technician') && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center">
                                <Building size={14} className="mr-2"/> Entidad / Empresa Vinculada
                            </label>
                            <button type="button" onClick={() => setShowQuickClient(!showQuickClient)} className="text-[10px] font-black text-hemp-600 uppercase tracking-widest flex items-center hover:bg-white dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition">
                                {showQuickClient ? 'Cancelar' : '+ Nueva Entidad'}
                            </button>
                        </div>
                        
                        {showQuickClient ? (
                            <div className="flex gap-2 animate-in fade-in">
                                <input autoFocus className={`${inputClass} border-blue-200`} placeholder="Nombre de la nueva empresa..." value={quickClientName} onChange={e => setQuickClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleQuickClientSubmit())} />
                                <button type="button" onClick={handleQuickClientSubmit} className="bg-blue-600 text-white px-4 rounded-2xl hover:bg-blue-700 transition shadow-md"><Sparkles size={18}/></button>
                            </div>
                        ) : (
                            <select required className={inputClass} value={formData.clientId || ''} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                                <option value="">Seleccionar entidad registrada...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                        <p className="text-[9px] text-blue-400 mt-3 italic">El usuario productor solo tendrá visibilidad sobre recursos de su entidad vinculada.</p>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={20}/> : <Save className="mr-2" size={18}/>}
                        {editingId ? 'Actualizar' : 'Registrar'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
