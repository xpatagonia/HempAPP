
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole, RoleType, Client } from '../types';
import { Plus, Trash2, Edit2, Shield, Wrench, Eye, AlertCircle, Lock, Key, Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon, UserCheck, Building, X, Sparkles, PlusCircle, Star } from 'lucide-react';

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

  // Estado para creación rápida de entidad
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientIsRed, setQuickClientIsRed] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'technician', password: '', jobTitle: '', phone: '', avatar: PRESET_AVATARS[0], clientId: '', isNetworkMember: false
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const handleEdit = (user: User) => {
    if (!isSuperAdmin && user.role === 'super_admin') {
        alert("Permisos insuficientes.");
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
            if (!success) throw new Error("Error en servidor. ¿Se ejecutó el script de reparación?");
        } else {
            if (!formData.password) { alert("Asigne una clave."); setIsSaving(false); return; }
            const success = await addUser({ ...payload, id: Date.now().toString(), password: formData.password } as User);
            if (!success) throw new Error("Error al crear usuario en la nube. Verifique el SQL Cloud.");
        }
        setIsModalOpen(false);
    } catch (err: any) {
        alert(err.message || "Fallo en la sincronización.");
    } finally { setIsSaving(false); }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">Control de <span className="text-hemp-600">Acceso</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de personal operativo y socios de la red.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', email: '', role: 'technician', password: '', avatar: PRESET_AVATARS[0], clientId: '', isNetworkMember: false }); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-6 py-3 rounded-[20px] flex items-center hover:bg-hemp-700 transition shadow-xl font-black text-xs uppercase tracking-widest">
          <Plus size={18} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
            <tr>
              <th className="px-8 py-5">Perfil</th>
              <th className="px-8 py-5">Identificación</th>
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
                      <div className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight flex items-center">
                          {user.name}
                          {user.isNetworkMember && <Star size={12} className="ml-1.5 text-amber-500 fill-amber-500" title="Socio de la Red"/>}
                      </div>
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
                  {user.isNetworkMember && <div className="text-[9px] text-amber-600 font-black uppercase mt-1 tracking-tighter">Miembro de la Red</div>}
                </td>
                <td className="px-8 py-5">
                   {(user.role === 'client' || user.role === 'technician') && user.clientId ? (
                       <div className="flex items-center text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-tight">
                           <Building size={14} className="mr-2 text-hemp-600 opacity-50"/>
                           {clients.find(c => c.id === user.clientId)?.name || 'Cargando...'}
                       </div>
                   ) : <span className="text-gray-300 dark:text-slate-600 italic text-xs">Administración Interna</span>}
                </td>
                <td className="px-8 py-5 text-right">
                    <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"><Edit2 size={18} /></button>
                        <button onClick={() => { if(window.confirm("¿Eliminar usuario?")) deleteUser(user.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"><Trash2 size={18} /></button>
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
                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Gestionar <span className="text-hemp-600">Usuario</span></h2>
                <button onClick={() => { setIsModalOpen(false); setShowQuickClient(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center"><UserIcon size={14} className="mr-2"/> Identidad del Perfil</h3>
                        <label className="flex items-center space-x-2 cursor-pointer bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800">
                            <input type="checkbox" className="rounded text-amber-500 focus:ring-amber-400" checked={formData.isNetworkMember} onChange={e => setFormData({...formData, isNetworkMember: e.target.checked})} />
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tighter">Miembro de la Red</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Nombre Completo *</label><input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Especialidad</label><input className={inputClass} value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="Ej: Ing. Agrónomo"/></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Email Laboral *</label><input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">{editingId ? 'Nueva Clave' : 'Clave de Acceso *'}</label><input type="text" className={inputClass} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingId ? 'Mantener actual' : 'Mínimo 6 caracteres'}/></div>
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
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center">
                                <Building size={14} className="mr-2"/> Entidad / Cliente Vinculado
                            </label>
                            <button 
                                type="button" 
                                onClick={() => { setShowQuickClient(!showQuickClient); setQuickClientName(''); }} 
                                className="text-[10px] font-black text-hemp-600 uppercase tracking-widest flex items-center hover:bg-white dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition"
                            >
                                {showQuickClient ? <X size={12} className="mr-1"/> : <PlusCircle size={12} className="mr-1"/>}
                                {showQuickClient ? 'Cancelar' : 'Nueva Entidad'}
                            </button>
                        </div>
                        
                        {showQuickClient ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex gap-2">
                                    <input 
                                        autoFocus
                                        className={`${inputClass} border-blue-200 focus:ring-blue-500/20`} 
                                        placeholder="Nombre de la nueva empresa..." 
                                        value={quickClientName}
                                        onChange={e => setQuickClientName(e.target.value)}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleQuickClientSubmit}
                                        className="bg-blue-600 text-white px-5 rounded-2xl hover:bg-blue-700 transition shadow-md"
                                    >
                                        <Sparkles size={18}/>
                                    </button>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" className="rounded text-hemp-600" checked={quickClientIsRed} onChange={e => setQuickClientIsRed(e.target.checked)} />
                                        <span className="text-[10px] font-black text-slate-500 uppercase">¿Esta entidad pertenece a la RED?</span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <select required className={inputClass} value={formData.clientId || ''} onChange={e => {
                                const sel = clients.find(c => c.id === e.target.value);
                                setFormData({...formData, clientId: e.target.value, isNetworkMember: sel ? sel.isNetworkMember : formData.isNetworkMember});
                            }}>
                                <option value="">Seleccionar entidad registrada...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.isNetworkMember ? '(SOCIO RED)' : ''}</option>)}
                            </select>
                        )}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                    <button type="button" onClick={() => { setIsModalOpen(false); setShowQuickClient(false); }} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={20}/> : <Save className="mr-2" size={18}/>}
                        {editingId ? 'Actualizar Perfil' : 'Finalizar Registro'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
