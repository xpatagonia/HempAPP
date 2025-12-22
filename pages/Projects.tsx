
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Project } from '../types';
import { Plus, Folder, Calendar, Edit2, Users, Trash2, UserCheck, Star, X, Save, Loader2, Activity, CheckSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject, plots, currentUser, usersList } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '', description: '', startDate: new Date().toISOString().split('T')[0], status: 'Planificación', responsibleIds: [], directorId: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
        const payload = {
            id: editingId || Date.now().toString(),
            name: formData.name.trim(),
            description: formData.description || '',
            startDate: formData.startDate || new Date().toISOString().split('T')[0],
            status: formData.status as any,
            directorId: formData.directorId || null,
            responsibleIds: formData.responsibleIds || []
        } as Project;

        let success = false;
        if (editingId) {
            success = await updateProject(payload);
        } else {
            success = await addProject(payload);
        }

        if (success) {
            setIsModalOpen(false);
            resetForm();
        } else {
            alert("Error al guardar el proyecto. Verifique su conexión o esquema SQL.");
        }
    } catch (error) {
        console.error("Project Save Error:", error);
        alert("Fallo crítico al intentar registrar la campaña.");
    } finally {
        setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', startDate: new Date().toISOString().split('T')[0], status: 'Planificación', responsibleIds: [], directorId: '' });
    setEditingId(null);
  };

  const handleEdit = (p: Project) => {
      setFormData({
          ...p,
          directorId: p.directorId || '',
          responsibleIds: p.responsibleIds || []
      });
      setEditingId(p.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Estás seguro de eliminar este proyecto? Esto NO elimina las parcelas asociadas, pero quedarán sin proyecto asignado.")) {
          deleteProject(id);
      }
  };

  const toggleResponsible = (userId: string) => {
    if (isSaving) return;
    setFormData(prev => {
        const current = prev.responsibleIds || [];
        const isSelected = current.includes(userId);
        const next = isSelected 
            ? current.filter(id => id !== userId) 
            : [...current, userId];
        return { ...prev, responsibleIds: next };
    });
  };

  const getPlotCount = (projectId: string) => plots.filter(p => p.projectId === projectId).length;

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-2.5 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">Proyectos & <span className="text-hemp-600">Campañas</span></h1>
            <p className="text-sm text-gray-500">Gestión de objetivos anuales y equipos de trabajo.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-slate-900 dark:bg-hemp-600 text-white px-6 py-3 rounded-2xl flex items-center hover:scale-[1.02] transition-all shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Nueva Campaña
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => {
          const responsibles = usersList.filter(u => project.responsibleIds?.includes(u.id));
          const director = usersList.find(u => u.id === project.directorId);

          return (
            <div key={project.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all relative group flex flex-col h-full">
              {isAdmin && (
                  <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(project)} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition">
                          <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition">
                          <Trash2 size={16} />
                      </button>
                  </div>
              )}

              <div className="flex justify-between items-start mb-6 pr-12">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600">
                    <Folder size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter leading-tight">{project.name}</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      project.status === 'En Curso' ? 'bg-green-50 text-green-700 border-green-100' :
                      project.status === 'Finalizado' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 min-h-[40px] font-medium leading-relaxed">{project.description}</p>
              
              <div className="space-y-4 mb-6 flex-1">
                  {director && (
                      <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800 flex items-center">
                          <div className="mr-3 relative">
                              <img 
                                src={director.avatar || `https://ui-avatars.com/api/?name=${director.name}`} 
                                alt={director.name} 
                                className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-amber-500 p-0.5 rounded-full border border-white dark:border-slate-900">
                                  <Star size={8} className="text-white fill-current" />
                              </div>
                          </div>
                          <div>
                              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">Director</p>
                              <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">{director.name}</p>
                          </div>
                      </div>
                  )}

                  <div>
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Equipo Operativo</p>
                     <div className="flex items-center space-x-2">
                        {responsibles.length > 0 ? (
                            <div className="flex -space-x-2 overflow-hidden pl-1">
                               {responsibles.map(u => (
                                   <img 
                                    key={u.id}
                                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`}
                                    alt={u.name}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                                    title={`${u.name} (${u.jobTitle || u.role})`} 
                                   />
                               ))}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 italic font-medium ml-1">Sin personal asignado</span>
                        )}
                     </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-t dark:border-slate-800 pt-4">
                <div className="flex items-center">
                  <Calendar size={14} className="mr-2 text-hemp-600" />
                  {project.startDate}
                </div>
                <div className="text-right">
                  <span className="text-hemp-600">{getPlotCount(project.id)}</span> Parcelas vinculadas
                </div>
              </div>

              <div className="mt-6 pt-2">
                 <Link to={`/plots?project=${project.id}`} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-hemp-50 dark:hover:bg-hemp-900/20 text-slate-700 dark:text-slate-300 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all">
                   Auditar Parcelas <ArrowRight size={14} className="ml-2" />
                 </Link>
              </div>
            </div>
          );
        })}
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-2xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Folder size={28}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Configurar <span className="text-hemp-600">Campaña</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planificación estratégica y atribución de recursos</p>
                    </div>
                </div>
                <button onClick={() => { if(!isSaving) setIsModalOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><UserCheck size={14} className="mr-2 text-hemp-500"/> Registro de Proyecto</h3>
                  <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Nombre de la Campaña *</label>
                        <input required type="text" placeholder="Ej: Campaña Fibra 2024" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={isSaving} />
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1 flex items-center">
                              <Star size={12} className="mr-1.5 text-amber-500 fill-amber-500"/> Director Responsable
                          </label>
                          <select 
                            className={inputClass} 
                            value={formData.directorId || ''} 
                            onChange={e => setFormData({...formData, directorId: e.target.value})}
                            disabled={isSaving}
                          >
                              <option value="">-- Sin Director Asignado --</option>
                              {usersList.map(u => (
                                  <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>
                              ))}
                          </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-widest ml-1">Objetivos & Descripción</label>
                        <textarea className={inputClass} rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} disabled={isSaving} placeholder="Detalle los alcances de esta campaña..."></textarea>
                      </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                  <label className="block text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center">
                    <Calendar size={14} className="mr-2" /> Fecha Lanzamiento
                  </label>
                  <input type="date" required className={`${inputClass} border-blue-100 dark:border-blue-900/50`} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} disabled={isSaving}/>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                  <label className="block text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center">
                    <Activity size={14} className="mr-2"/> Estado Actual
                  </label>
                  <select className={`${inputClass} border-emerald-100 dark:border-emerald-900/50`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} disabled={isSaving}>
                    <option value="Planificación">Planificación / Diseño</option>
                    <option value="En Curso">Ejecución Activa</option>
                    <option value="Finalizado">Cierre / Auditoría</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-1 flex items-center">
                      <Users size={14} className="mr-2"/> Equipo Operativo Seleccionado
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {usersList.map(u => {
                        const isSelected = (formData.responsibleIds || []).includes(u.id);
                        return (
                            <div 
                                key={u.id} 
                                onClick={(e) => { e.preventDefault(); toggleResponsible(u.id); }}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                                    isSelected 
                                    ? 'bg-hemp-600 border-hemp-500 text-white shadow-md' 
                                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:border-hemp-600'
                                }`}
                            >
                                <div className="flex items-center space-x-3 pointer-events-none">
                                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full border border-white/20 object-cover" alt="avatar"/>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-tight truncate leading-tight">{u.name}</p>
                                        <p className={`text-[9px] font-bold ${isSelected ? 'text-hemp-100' : 'text-gray-400'}`}>{u.jobTitle || u.role}</p>
                                    </div>
                                </div>
                                {isSelected ? <CheckSquare size={16}/> : <Plus size={14} className="text-gray-300 group-hover:text-hemp-600 opacity-0 group-hover:opacity-100"/>}
                            </div>
                        );
                    })}
                  </div>
              </div>

              <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {editingId ? 'Actualizar Campaña' : 'Lanzar Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
