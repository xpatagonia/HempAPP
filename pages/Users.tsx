
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
// Fixed: Added 'Building' to the list of imports from 'lucide-react'
import { Plus, Trash2, Edit2, Shield, Wrench, Eye, AlertCircle, Lock, Key, Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon, UserCheck, Building } from 'lucide-react';

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
  const { usersList, addUser, updateUser, deleteUser, currentUser, clients } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'technician', password: '', jobTitle: '', phone: '', avatar: '', clientId: ''
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const handleEdit = (user: User) => {
    if (!isSuperAdmin && user.role === 'super_admin') {
        alert("No tienes permisos para modificar al Super Administrador.");
        return;
    }
    setFormData({ ...user, password: '' }); 
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) { alert("No puedes eliminar tu propio usuario."); return; }
    if (!isSuperAdmin && (user.role === 'super_admin' || user.role === 'admin')) {
        alert("No tienes permisos para eliminar a otros administradores.");
        return;
    }
    if (window.confirm(`¿Estás seguro de eliminar a ${user.name}?`)) {
      deleteUser(user.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    setIsSaving(true);
    try {
        const payload = {
            name: formData.name!,
            email: formData.email!,
            role: formData.role as UserRole,
            jobTitle: formData.jobTitle || '',
            phone: formData.phone || '',
            avatar: formData.avatar || PRESET_AVATARS[0],
            clientId: formData.role === 'client' ? formData.clientId : null
        };

        if (editingId) {
            const oldUser = usersList.find(u => u.id === editingId);
            const finalPassword = formData.password ? formData.password : oldUser?.password;
            updateUser({ ...payload, id: editingId, password: finalPassword } as User);
        } else {
            if (!formData.password) { alert("Debes asignar una contraseña"); setIsSaving(false); return; }
            await addUser({ ...payload, id: Date.now().toString(), password: formData.password } as User);
        }
        setIsModalOpen(false);
    } finally { setIsSaving(false); }
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 outline-none";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-800">Usuarios & Roles</h1>
            <p className="text-sm text-gray-500">Control de acceso y perfiles del sistema.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', email: '', role: 'technician', password: '', avatar: PRESET_AVATARS[0] }); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-xl flex items-center hover:bg-hemp-700 transition shadow-lg font-bold">
          <Plus size={20} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Rol / Cargo</th>
              <th className="px-6 py-4">Entidad Vinculada</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usersList.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <img className="h-9 w-9 rounded-full border border-gray-200 mr-3" src={user.avatar || PRESET_AVATARS[0]} alt="" />
                    <div>
                      <div className="font-bold text-gray-900">{user.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    user.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'client' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                  <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{user.jobTitle || '-'}</div>
                </td>
                <td className="px-6 py-4">
                   {user.role === 'client' && user.clientId ? (
                       <div className="flex items-center text-gray-600 font-bold">
                           <Building size={14} className="mr-1 text-hemp-600"/>
                           {clients.find(c => c.id === user.clientId)?.name}
                       </div>
                   ) : <span className="text-gray-300 italic">HempC Interno</span>}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(user)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-6">{editingId ? 'Editar Perfil' : 'Nuevo Usuario'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-gray-400 uppercase">Nombre</label><input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black text-gray-400 uppercase">Cargo</label><input className={inputClass} value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black text-gray-400 uppercase">Email</label><input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black text-gray-400 uppercase">{editingId ? 'Cambiar Clave' : 'Clave'}</label><input type="text" className={inputClass} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingId ? 'Vacío para mantener' : ''}/></div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase">Rol de Sistema</label>
                    <select className={inputClass} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                        <option value="viewer">Visita (Solo lectura)</option>
                        <option value="technician">Técnico (Operativo)</option>
                        <option value="client">Productor Red (Alcance limitado)</option>
                        <option value="admin">Administrador (Gestión)</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin (Root)</option>}
                    </select>
                </div>
                {formData.role === 'client' && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-green-700 uppercase">Vincular a Cliente / Titular</label>
                        <select required className={inputClass} value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                            <option value="">Seleccionar entidad...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="bg-hemp-600 text-white px-8 py-2.5 rounded-xl font-black shadow-lg">
                        {isSaving ? <Loader2 className="animate-spin" /> : 'Guardar'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
