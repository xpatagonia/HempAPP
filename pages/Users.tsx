
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { Plus, Trash2, Edit2, Shield, Wrench, Eye, AlertCircle, Lock, Key, Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

// Avatares Predefinidos (DiceBear)
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
  const { usersList, addUser, updateUser, deleteUser, currentUser, isEmergencyMode, clients } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', role: 'technician', password: '', jobTitle: '', phone: '', avatar: '', clientId: ''
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-gray-800">Acceso Denegado</h2>
        <p>Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  const handleEdit = (user: User) => {
    // Permission Check
    if (!isSuperAdmin && (user.role === 'super_admin' || user.role === 'admin')) {
        alert("No tienes permisos para modificar a este usuario.");
        return;
    }

    setFormData({ ...user, password: '' }); 
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    if (!isSuperAdmin && (user.role === 'super_admin' || user.role === 'admin')) {
        alert("No tienes permisos para eliminar a este usuario.");
        return;
    }
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      deleteUser(user.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    // Validate role
    if (!isSuperAdmin && (formData.role === 'super_admin' || formData.role === 'admin')) {
        alert("No tienes permisos para crear o asignar este rol.");
        return;
    }

    setIsSaving(true);
    
    await new Promise(r => setTimeout(r, 500));

    try {
        const payload = {
            name: formData.name!,
            email: formData.email!,
            role: formData.role as UserRole,
            jobTitle: formData.jobTitle || '',
            phone: formData.phone || '',
            avatar: formData.avatar || PRESET_AVATARS[0],
            clientId: formData.role === 'client' ? formData.clientId : null // Only save clientId if role is client
        };

        if (editingId) {
            const oldUser = usersList.find(u => u.id === editingId);
            const finalPassword = formData.password ? formData.password : oldUser?.password;

            updateUser({ 
                ...payload,
                id: editingId,
                password: finalPassword
            } as User);
        } else {
            if (!formData.password) {
                alert("Debes asignar una contraseña inicial");
                setIsSaving(false);
                return;
            }
            const success = await addUser({
                ...payload,
                id: Date.now().toString(),
                password: formData.password
            });
            if (success) {
                alert(`¡Usuario ${payload.name} creado correctamente en la nube! Ya puede iniciar sesión.`);
            }
        }
        closeModal();
    } catch (error) {
        console.error("Error saving user", error);
        alert("Ocurrió un error al guardar. Revisa la consola.");
    } finally {
        setIsSaving(false);
    }
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setFormData({ name: '', email: '', role: 'technician', password: '', jobTitle: '', phone: '', avatar: '', clientId: '' });
      setEditingId(null);
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', email: '', role: 'technician', password: '', avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)] });
            setIsModalOpen(true);
          }} 
          className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition"
        >
          <Plus size={20} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol & Cargo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usersList.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">No hay usuarios registrados.</td></tr>
            ) : usersList.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 relative">
                        {user.avatar ? (
                            <img className="h-10 w-10 rounded-full border border-gray-200" src={user.avatar} alt="" />
                        ) : (
                            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <UserIcon size={20}/>
                            </div>
                        )}
                        {/* Status Dot (Simulated) */}
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">ID: {user.id.substring(0, 6)}...</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col">
                      <span>{user.email}</span>
                      {user.phone && <span className="text-xs text-gray-400 mt-0.5">{user.phone}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col items-start">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full mb-1
                        ${user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                          user.role === 'technician' ? 'bg-blue-100 text-blue-800' : 
                          user.role === 'client' ? 'bg-green-100 text-green-800' :
                          'bg-amber-100 text-amber-800'}`}>
                        {user.role === 'super_admin' ? 'Super Admin' : 
                         user.role === 'technician' ? 'Técnico' : 
                         user.role === 'client' ? 'Cliente Red' :
                         user.role === 'viewer' ? 'Visita' : 'Administrador'}
                      </span>
                      {user.jobTitle && <span className="text-xs text-gray-500 font-medium">{user.jobTitle}</span>}
                      {user.role === 'client' && user.clientId && (
                          <span className="text-[10px] text-gray-400 flex items-center mt-1">
                              <LinkIcon size={8} className="mr-1"/> 
                              {clients.find(c => c.id === user.clientId)?.name || 'Cliente desconocido'}
                          </span>
                      )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Visual check for permissions to gray out buttons */}
                    {(!isSuperAdmin && (user.role === 'super_admin' || user.role === 'admin')) ? (
                        <span className="text-gray-300 italic text-xs">Protegido</span>
                    ) : (
                        <>
                            <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-900">
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Perfil' : 'Nuevo Usuario'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Puesto</label>
                    <input type="text" placeholder="Ej: Ing. Agrónomo" className={inputClass} value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input type="text" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Key size={14} className="mr-1" />
                    {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                </label>
                <input 
                    type="text" 
                    placeholder={editingId ? "Dejar vacío para mantener actual" : "Asignar clave..."}
                    className={inputClass} 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2">Rol & Permisos</label>
                <select className={inputClass} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value="technician">Técnico de Campo (Operativo)</option>
                  <option value="client">Cliente / Productor Red</option>
                  <option value="viewer">Visita (Solo lectura)</option>
                  {(isSuperAdmin || isAdmin) && <option value="admin">Administrador (Gestión)</option>}
                  {isSuperAdmin && <option value="super_admin">Super Admin (Root)</option>}
                </select>
                
                {/* CLIENT LINKER */}
                {formData.role === 'client' && (
                    <div className="mt-3 bg-green-50 p-3 rounded border border-green-100 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-green-800 mb-1 uppercase">Vincular a Entidad Cliente</label>
                        <select 
                            required
                            className="w-full border border-green-300 rounded p-2 text-sm focus:outline-none"
                            value={formData.clientId || ''}
                            onChange={e => setFormData({...formData, clientId: e.target.value})}
                        >
                            <option value="">Seleccionar Entidad...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-green-700 mt-1">
                            Este usuario tendrá permiso para agregar parcelas asociadas a este cliente.
                        </p>
                    </div>
                )}

                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {formData.role === 'client' && "Acceso exclusivo a sus lotes. Puede crear/eliminar sus parcelas."}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm flex items-center disabled:opacity-70"
                >
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                    Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
