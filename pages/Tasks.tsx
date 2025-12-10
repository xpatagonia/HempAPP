
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { Plus, CheckSquare, Clock, User, CheckCircle, Circle, AlertCircle, Calendar } from 'lucide-react';

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, currentUser, usersList, plots, projects } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', status: 'Pendiente', priority: 'Media', assignedToIds: [], 
    dueDate: new Date().toISOString().split('T')[0], plotId: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    if (editingId) {
        updateTask({ ...formData, id: editingId } as Task);
    } else {
        addTask({
            id: Date.now().toString(),
            title: formData.title!,
            description: formData.description || '',
            status: formData.status as any,
            priority: formData.priority as any,
            assignedToIds: formData.assignedToIds || [],
            dueDate: formData.dueDate!,
            plotId: formData.plotId,
            createdBy: currentUser?.id || 'unknown'
        });
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', status: 'Pendiente', priority: 'Media', assignedToIds: [], dueDate: new Date().toISOString().split('T')[0], plotId: '' });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("¿Eliminar tarea?")) deleteTask(id);
  };

  const toggleStatus = (task: Task) => {
      const newStatus = task.status === 'Completada' ? 'Pendiente' : 'Completada';
      updateTask({ ...task, status: newStatus });
  };

  const toggleAssignee = (userId: string) => {
    const current = formData.assignedToIds || [];
    if (current.includes(userId)) {
        setFormData({...formData, assignedToIds: current.filter(id => id !== userId)});
    } else {
        setFormData({...formData, assignedToIds: [...current, userId]});
    }
  };

  const filteredTasks = tasks.filter(t => {
      // 1. Filter by Status Tab
      if (filterStatus === 'pending' && t.status === 'Completada') return false;
      if (filterStatus === 'completed' && t.status !== 'Completada') return false;

      // 2. Filter by User (If not admin, show only assigned tasks)
      if (!isAdmin && !t.assignedToIds.includes(currentUser?.id || '')) return false;

      return true;
  }).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Tareas</h1>
        {isAdmin && (
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-hemp-700 transition">
                <Plus size={20} className="mr-2" /> Nueva Tarea
            </button>
        )}
      </div>

      <div className="flex space-x-2 mb-6 border-b">
          <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${filterStatus === 'pending' ? 'border-hemp-600 text-hemp-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Pendientes</button>
          <button onClick={() => setFilterStatus('completed')} className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${filterStatus === 'completed' ? 'border-hemp-600 text-hemp-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Completadas</button>
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${filterStatus === 'all' ? 'border-hemp-600 text-hemp-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Todas</button>
      </div>

      <div className="space-y-3">
          {filteredTasks.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                  <CheckSquare size={48} className="mx-auto mb-2 opacity-50"/>
                  <p>No hay tareas {filterStatus === 'pending' ? 'pendientes' : 'para mostrar'}.</p>
              </div>
          ) : filteredTasks.map(task => {
              const assignedUsers = usersList.filter(u => task.assignedToIds.includes(u.id));
              const relatedPlot = plots.find(p => p.id === task.plotId);

              return (
                  <div key={task.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${task.status === 'Completada' ? 'opacity-75 bg-gray-50' : ''}`}>
                      <div className="flex items-start space-x-3 flex-1">
                          <button onClick={() => toggleStatus(task)} className={`mt-1 flex-shrink-0 ${task.status === 'Completada' ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>
                              {task.status === 'Completada' ? <CheckCircle size={24} /> : <Circle size={24} />}
                          </button>
                          <div>
                              <h3 className={`font-bold text-gray-800 ${task.status === 'Completada' ? 'line-through text-gray-500' : ''}`}>{task.title}</h3>
                              <p className="text-sm text-gray-600 mb-1">{task.description}</p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                  {relatedPlot && (
                                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center">
                                          <Clock size={12} className="mr-1" /> {relatedPlot.name}
                                      </span>
                                  )}
                                  <span className={`px-2 py-1 rounded border flex items-center ${
                                      task.priority === 'Alta' ? 'bg-red-50 text-red-700 border-red-100' : 
                                      task.priority === 'Media' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                                      'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}>
                                      <AlertCircle size={12} className="mr-1" /> {task.priority}
                                  </span>
                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 flex items-center">
                                      <Calendar size={12} className="mr-1" /> Vence: {task.dueDate}
                                  </span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                          <div className="flex -space-x-2">
                              {assignedUsers.map(u => (
                                  <div key={u.id} className="h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center text-xs font-bold text-gray-600" title={u.name}>
                                      {u.name.charAt(0)}
                                  </div>
                              ))}
                              {assignedUsers.length === 0 && <span className="text-xs text-gray-400 italic">Sin asignar</span>}
                          </div>
                          {isAdmin && (
                              <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-600 p-2">
                                  <AlertCircle size={18} />
                              </button>
                          )}
                      </div>
                  </div>
              )
          })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input required type="text" className={inputClass} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea className={inputClass} rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                    <select className={inputClass} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                    <input type="date" className={`${inputClass} cursor-pointer`} value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} onClick={(e) => {try{e.currentTarget.showPicker()}catch(err){}}} />
                  </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a Parcela (Opcional)</label>
                  <select className={inputClass} value={formData.plotId} onChange={e => setFormData({...formData, plotId: e.target.value})}>
                      <option value="">-- General --</option>
                      {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a:</label>
                  <div className="border border-gray-300 bg-white rounded p-2 h-32 overflow-y-auto text-xs">
                    {usersList.map(u => (
                        <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 py-1">
                            <input 
                                type="checkbox" 
                                className="rounded text-hemp-600 focus:ring-hemp-500" 
                                checked={formData.assignedToIds?.includes(u.id)} 
                                onChange={() => toggleAssignee(u.id)} 
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
