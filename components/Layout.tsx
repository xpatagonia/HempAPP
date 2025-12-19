
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, Menu, Leaf, LogOut, 
  UserCircle, Calendar, Sun, Moon, 
  Tractor, BookOpen, Bot, Settings, 
  FolderKanban, CheckSquare, BarChart3, Users, Warehouse, Package, X, Bell
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, badge }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
        isActive 
          ? 'bg-hemp-600 text-white shadow-lg shadow-hemp-600/20' 
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50'
      }`}>
      <div className="flex items-center space-x-3">
        <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
        <span className="font-bold text-sm tracking-tight">{label}</span>
      </div>
      {badge && <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{badge}</span>}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, theme, toggleTheme, tasks, appName, appLogo } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <>{children}</>;

  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente').length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* OVERLAY MOBILE */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}></div>}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
             <div className="bg-hemp-600 p-2 rounded-xl text-white shadow-lg shadow-hemp-600/30 overflow-hidden flex items-center justify-center min-w-[38px] min-h-[38px]">
                {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-contain" /> : <Leaf size={22} />}
             </div>
             <span className="text-2xl font-black tracking-tighter dark:text-white truncate" title={appName}>{appName}</span>
          </div>
          <button className="lg:hidden" onClick={() => setIsMobileOpen(false)}><X size={20} className="text-slate-400"/></button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/advisor" icon={Bot} label="AI Terminal" />
          
          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manejo Técnico</div>
          <NavItem to="/locations" icon={Tractor} label="Campos & Sitios" />
          <NavItem to="/plots" icon={Sprout} label="Unidades Exp." />
          <NavItem to="/tasks" icon={CheckSquare} label="Labores" badge={pendingTasksCount > 0 ? pendingTasksCount : null} />
          <NavItem to="/calendar" icon={Calendar} label="Ciclo Biológico" />
          <NavItem to="/projects" icon={FolderKanban} label="Campañas" />

          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cadena de Valor</div>
          <NavItem to="/seed-batches" icon={Package} label="Inventario Fiscal" />
          <NavItem to="/varieties" icon={BookOpen} label="Genética" />
          <NavItem to="/suppliers" icon={Warehouse} label="Semilleros" />
          <NavItem to="/clients" icon={Users} label="Socios de Red" />

          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistema</div>
          <NavItem to="/analytics" icon={BarChart3} label="Analítica Avanzada" />
          <NavItem to="/users" icon={Users} label="Equipo" />
          <NavItem to="/settings" icon={Settings} label="Admin Server" />
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
           <div className="flex items-center space-x-4 mb-6">
               <div className="relative">
                    <img className="h-11 w-11 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md" src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}&background=16a34a&color=fff`} alt="Profile" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-black truncate text-slate-900 dark:text-white uppercase tracking-tight">{currentUser.name}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role.replace('_', ' ')}</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-3 rounded-2xl transition-all font-black uppercase tracking-widest border border-transparent hover:border-red-100">
               <LogOut size={16} /> <span>Cerrar Conexión</span>
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between z-40 sticky top-0">
          <div className="flex items-center space-x-4">
              <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><Menu size={24}/></button>
              <div className="hidden md:flex items-center space-x-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <span className="text-hemp-600">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
          </div>
          
          <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 mr-4 border-r pr-4 border-slate-200 dark:border-slate-800">
                  <button className="p-2.5 text-slate-400 hover:text-hemp-600 hover:bg-hemp-50 dark:hover:bg-slate-800 rounded-xl transition-all relative">
                      <Bell size={20} />
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  </button>
              </div>
              <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center space-x-2 px-4 shadow-inner">
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{theme === 'dark' ? 'Ligth' : 'Dark'}</span>
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
