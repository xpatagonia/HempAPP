import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Sprout, CheckSquare, Clock, Plus, X, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CalendarPage() {
  const { plots, tasks, varieties, addTask, currentUser } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Interaction State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Alta'|'Media'|'Baja'>('Media');

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // --- EVENT GENERATION LOGIC ---
  const events: any[] = [];

  // 1. Sowing Events (From Plots)
  plots.forEach(p => {
    if (p.sowingDate) {
        // Event: Sowing
        events.push({
            date: p.sowingDate,
            title: `Siembra: ${p.name}`,
            type: 'sowing',
            id: p.id,
            details: p.name
        });

        // Event: Estimated Harvest
        const variety = varieties.find(v => v.id === p.varietyId);
        if (variety && variety.cycleDays) {
            const parts = p.sowingDate.split('-');
            if(parts.length === 3) {
                const sowingTs = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2])).getTime();
                const harvestDate = new Date(sowingTs + (variety.cycleDays * 24 * 60 * 60 * 1000));
                
                const yyyy = harvestDate.getFullYear();
                const mm = String(harvestDate.getMonth() + 1).padStart(2, '0');
                const dd = String(harvestDate.getDate()).padStart(2, '0');

                events.push({
                    date: `${yyyy}-${mm}-${dd}`,
                    title: `Cosecha Est: ${p.name}`,
                    type: 'harvest_est',
                    id: p.id + '_h',
                    details: `${variety.name} (${variety.cycleDays} días)`
                });
            }
        }
    }
  });

  // 2. Task Events
  tasks.forEach(t => {
      if (t.dueDate && t.status !== 'Completada') {
          events.push({
              date: t.dueDate,
              title: `Tarea: ${t.title}`,
              type: 'task',
              id: t.id,
              details: t.priority
          });
      }
  });

  // --- INTERACTION LOGIC ---
  const handleDayClick = (day: number) => {
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      
      setNewTaskDate(`${yyyy}-${mm}-${dd}`);
      setNewTaskTitle('');
      setNewTaskPriority('Media');
      setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newTaskTitle) return;

      addTask({
          id: Date.now().toString(),
          title: newTaskTitle,
          description: 'Creada desde el Calendario',
          status: 'Pendiente',
          priority: newTaskPriority,
          dueDate: newTaskDate,
          assignedToIds: currentUser ? [currentUser.id] : [],
          createdBy: currentUser?.id || 'system'
      });

      setIsModalOpen(false);
  };

  // --- CALENDAR RENDER ---
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate); 
  
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
             <CalIcon className="text-hemp-600 mr-3" size={32} />
             <div>
                 <h1 className="text-2xl font-bold text-gray-800">Calendario de Cultivo</h1>
                 <p className="text-gray-500 text-sm">Planificación de siembras, cosechas y tareas.</p>
             </div>
        </div>
        
        <div className="flex items-center space-x-2">
            <button onClick={goToToday} className="px-3 py-2 bg-white border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition shadow-sm mr-2">
                Hoy
            </button>
            <div className="flex items-center bg-white rounded-lg shadow-sm border p-1">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded text-gray-600">
                    <ChevronLeft size={20}/>
                </button>
                <span className="px-6 font-bold text-gray-800 capitalize min-w-[180px] text-center">
                    {monthName}
                </span>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded text-gray-600">
                    <ChevronRight size={20}/>
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden select-none">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                  <div key={d} className="py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      {d}
                  </div>
              ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
              {/* Blanks */}
              {blanks.map((_, i) => (
                  <div key={`blank-${i}`} className="bg-white min-h-[120px] p-2 opacity-50"></div>
              ))}

              {/* Days */}
              {days.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                  
                  return (
                      <div 
                        key={day} 
                        onClick={() => handleDayClick(day)}
                        className={`bg-white min-h-[120px] p-2 transition hover:bg-blue-50/50 relative group cursor-pointer ${isToday ? 'bg-blue-50/30' : ''}`}
                      >
                          <div className="flex justify-between items-start mb-2">
                             <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-hemp-600 text-white' : 'text-gray-700'}`}>
                                 {day}
                             </span>
                             {/* Add Button on Hover */}
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus size={16} className="text-hemp-500" />
                             </div>
                          </div>
                          
                          <div className="space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
                              {dayEvents.map((ev, idx) => (
                                  <div 
                                    key={idx}
                                    onClick={(e) => e.stopPropagation()} // Prevent opening "New Task" modal when clicking existing event
                                    className={`text-xs p-1.5 rounded border shadow-sm cursor-pointer transition hover:opacity-80 flex items-center relative
                                        ${ev.type === 'sowing' ? 'bg-green-100 border-green-200 text-green-800' : 
                                          ev.type === 'harvest_est' ? 'bg-amber-100 border-amber-200 text-amber-800' :
                                          'bg-blue-50 border-blue-100 text-blue-700'
                                        }`}
                                    title={ev.details}
                                  >
                                      {ev.type === 'sowing' && <Sprout size={10} className="mr-1 flex-shrink-0" />}
                                      {ev.type === 'harvest_est' && <Clock size={10} className="mr-1 flex-shrink-0" />}
                                      {ev.type === 'task' && <CheckSquare size={10} className="mr-1 flex-shrink-0" />}
                                      <span className="truncate">{ev.title.replace('Siembra: ', '').replace('Tarea: ', '')}</span>
                                      
                                      {/* Links */}
                                      {ev.type === 'sowing' && (
                                          <Link to={`/plots/${ev.id}`} className="absolute inset-0" />
                                      )}
                                      {ev.type === 'task' && (
                                          <Link to={`/tasks`} className="absolute inset-0" />
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 justify-center">
          <div className="flex items-center">
              <span className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></span>
              Siembra Realizada
          </div>
          <div className="flex items-center">
              <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded mr-2"></span>
              Cosecha Estimada
          </div>
          <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-50 border border-blue-100 rounded mr-2"></span>
              Tarea Pendiente
          </div>
      </div>

      {/* QUICK TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <CheckSquare className="mr-2 text-hemp-600" size={20}/>
                        Nueva Tarea
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSaveTask} className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-sm text-center font-medium text-gray-600">
                        Para el: {newTaskDate}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título de la Tarea</label>
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-hemp-500 outline-none"
                            placeholder="Ej: Revisar riego..."
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridad</label>
                        <div className="flex space-x-2">
                            {['Alta', 'Media', 'Baja'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setNewTaskPriority(p as any)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded border ${newTaskPriority === p 
                                        ? 'bg-hemp-600 text-white border-hemp-600' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-hemp-600 text-white py-2 rounded-lg font-bold hover:bg-hemp-700 transition flex items-center justify-center"
                    >
                        <Save size={16} className="mr-2" /> Guardar Tarea
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}