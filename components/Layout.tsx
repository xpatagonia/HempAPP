
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, Menu, Leaf, LogOut, 
  UserCircle, Calendar, Sun, Moon, ScanBarcode, 
  Tractor, BookOpen, Bot, Shield, Settings, 
  FolderKanban, CheckSquare, BarChart3, Users, Warehouse, Package
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all ${
        isActive 
          ? 'bg-hemp-600 text-white shadow-md' 
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}>
      <Icon size={20} />
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, theme, toggleTheme } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
             <div className="bg-hemp-600 p-1.5 rounded-lg text-white"><Leaf size={20} /></div>
             <span className="text-xl font-extrabold tracking-tight dark:text-white">Hemp<span className="text-hemp-600">C</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Panel Principal" />
          <NavItem to="/advisor" icon={Bot} label="Asistente IA" />
          
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operaciones</div>
          <NavItem to="/locations" icon={Tractor} label="Campos" />
          <NavItem to="/plots" icon={Sprout} label="Parcelas" />
          <NavItem to="/calendar" icon={Calendar} label="Calendario" />
          <NavItem to="/tasks" icon={CheckSquare} label="Tareas" />
          <NavItem to="/projects" icon={FolderKanban} label="Proyectos" />

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logística</div>
          <NavItem to="/seed-batches" icon={Package} label="Inventario" />
          <NavItem to="/varieties" icon={BookOpen} label="Genética" />
          <NavItem to="/storage" icon={Warehouse} label="Depósitos" />
          <NavItem to="/suppliers" icon={Warehouse} label="Proveedores" />
          <NavItem to="/clients" icon={Users} label="Clientes" />

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema</div>
          <NavItem to="/analytics" icon={BarChart3} label="Analítica" />
          <NavItem to="/users" icon={Users} label="Equipo" />
          <NavItem to="/settings" icon={Settings} label="Configuración" />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center space-x-3 mb-4 p-2">
               <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><UserCircle size={24} /></div>
               <div className="flex-1 min-w-0">
                   <p className="text-xs font-bold truncate dark:text-white">{currentUser.name}</p>
                   <p className="text-[10px] text-slate-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-2.5 rounded-xl transition-all font-bold">
               <LogOut size={16} /> <span>Cerrar Sesión</span>
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-40">
          <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="lg:hidden text-slate-500"><Menu size={24}/></button>
          
          <div className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              <div className="h-1.5 w-1.5 rounded-full bg-hemp-500"></div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sistema Online</span>
          </div>

          <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
