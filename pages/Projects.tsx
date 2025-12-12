import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Project } from '../types';
import { Plus, Folder, Calendar, Edit2, Users, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject, plots, currentUser, usersList } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '', description: '', startDate: '', status: 'Planificación', responsibleIds: []
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (editingId) {
        updateProject({ ...formData, id: editingId } as Project);
    } else {
        addProject({
            id: Date.now().toString(),
            name: formData.name!,
            description: formData.description || '',
            startDate: formData.startDate || new Date().toISOString().split('T')[0],
            status: formData.status as any,
            responsibleIds: formData.responsibleIds || []
        });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', startDate: '', status: 'Planificación', responsibleIds: [] });
    setEditingId(null);
  };

  const handleEdit = (p: Project) => {
      setFormData(p);
      setEditingId(p.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Estás seguro de eliminar este proyecto? Esto NO elimina las parcelas asociadas, pero quedarán sin proyecto asignado.")) {
          deleteProject(id);
      }
  };

  const openNew = () => {
      resetForm();
      setIsModalOpen(true);
  };

  const toggleResponsible = (userId: string) => {
    const current = formData.responsibleIds || [];
    if (current.includes(userId)) {
        setFormData({...formData, responsibleIds: current.filter(id => id !== userId)});
    } else {
        setFormData({...formData, responsibleIds: [...current, userId]});
    }
  };

  const getPlotCount = (projectId: string) => plots.filter(p => p.projectId === projectId).length;

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Proyectos y Campañas</h1>
        {isAdmin && (
          <button onClick={openNew} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
            <Plus size={20} className="mr-2" /> Nuevo Proyecto
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map(project => {
          const responsibles = usersList.filter(u => project.responsibleIds?.includes(u.id));
          return (
            <div key={project.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
              {isAdmin && (
                  <div className="absolute top-4 right-4 flex space-x-1">
                      <button onClick={() => handleEdit(project)} className="text-gray-400 hover:text-hemp-600 p-1">
                          <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="text-gray-400 hover:text-red-600 p-1">
                          <Trash2 size={18} />
                      </button>
                  </div>
              )}

              <div className="flex justify-between items-start mb-4 pr-16">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-lg text-blue-700">
                    <Folder size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.status === 'En Curso' ? 'bg-green-100 text-green-800' :
                      project.status === 'Finalizado' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 min-h-[40px]">{project.description}</p>
              
              {/* Responsibles Display */}
              <div className="mb-4">
                 <div className="flex items-center text-xs font-semibold text-gray-500 mb-2">
                    <Users size={14} className="mr-1" /> Coordinadores / Responsables
                 </div>
                 <div className="flex items-center space-x-2">
                    {responsibles.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                           {responsibles.map(u => (
                               <div key={u.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600" title={`${u.name} (${u.role})`}>
                                   {u.name.charAt(0)}
                               </div>
                           ))}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Sin asignar</span>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 border-t pt-4">
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2" />
                  {project.startDate}
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-800">{getPlotCount(project.id)}</span> Parcelas
                </div>
              </div>

              <div className="mt-4 pt-4 flex justify-end">
                 <Link to={`/plots?project=${project.id}`} className="text-hemp-600 font-medium hover:text-hemp-800 text-sm">
                   Ver Parcelas &rarr;
                 </Link>
              </div>
            </div>
          );
        })}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto</label>
                <input required type="text" placeholder="Ej: Campaña Fibra 2024" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea className={inputClass} rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar size={14} className="mr-1 text-hemp-600" /> Fecha Inicio
                  </label>
                  <input 
                    type="date" 
                    required 
                    className={`${inputClass} cursor-pointer`} 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (error) {
                        // Ignore if not supported
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select className={inputClass} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="Planificación">Planificación</option>
                    <option value="En Curso">En Curso</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsables / Coordinadores</label>
                  <div className="border border-gray-300 bg-white rounded p-2 h-24 overflow-y-auto text-xs">
                    {usersList.map(u => (
                        <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 py-1">
                            <input 
                                type="checkbox" 
                                className="rounded text-hemp-600 focus:ring-hemp-500" 
                                checked={formData.responsibleIds?.includes(u.id)} 
                                onChange={() => toggleResponsible(u.id)} 
                            />
                            <span className="text-gray-900">{u.name} <span className="text-gray-400">({u.role})</span></span>
                        </label>
                    ))}
                  </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}