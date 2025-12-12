import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Sprout, CheckSquare, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CalendarPage() {
  const { plots, tasks, varieties } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

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
        // Logic: Sowing Date + Variety Cycle Days
        const variety = varieties.find(v => v.id === p.varietyId);
        if (variety && variety.cycleDays) {
            const sowing = new Date(p.sowingDate);
            // Add cycle days (UTC safe approx)
            const harvest = new Date(sowing.getTime() + (variety.cycleDays * 24 * 60 * 60 * 1000));
            events.push({
                date: harvest.toISOString().split('T')[0],
                title: `Cosecha Est: ${p.name}`,
                type: 'harvest_est',
                id: p.id + '_h',
                details: `${variety.name} (${variety.cycleDays} días)`
            });
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

  // --- CALENDAR RENDER ---
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate); // 0 = Sunday
  
  // Adjust for Monday start if needed (optional, keeping Sunday start for standard view)
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                      <div key={day} className={`bg-white min-h-[120px] p-2 transition hover:bg-gray-50 relative ${isToday ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex justify-between items-start mb-2">
                             <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-hemp-600 text-white' : 'text-gray-700'}`}>
                                 {day}
                             </span>
                          </div>
                          
                          <div className="space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
                              {dayEvents.map((ev, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`text-xs p-1.5 rounded border shadow-sm cursor-pointer transition hover:opacity-80 flex items-center
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
                                      {ev.type === 'sowing' && (
                                          <Link to={`/plots/${ev.id}`} className="absolute inset-0" />
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      <div className="flex space-x-6 text-sm text-gray-600 justify-center">
          <div className="flex items-center">
              <span className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></span>
              Siembra Realizada
          </div>
          <div className="flex items-center">
              <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded mr-2"></span>
              Cosecha Estimada (Calculada)
          </div>
          <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-50 border border-blue-100 rounded mr-2"></span>
              Tarea Pendiente
          </div>
      </div>
    </div>
  );
}