import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Sprout, 
  MapPin, 
  ClipboardList, 
  Menu, 
  X, 
  Leaf,
  LogOut,
  UserCircle,
  FolderOpen,
  Users,
  CheckSquare,
  Calculator,
  BarChart2,
  Settings,
  Database,
  Calendar as CalendarIcon,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, onClick }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-hemp-600 text-white shadow-md' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-hemp-50 dark:hover:bg-dark-border hover:text-hemp-800 dark:hover:text-hemp-400'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, isEmergencyMode, theme, toggleTheme } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  if (!currentUser) return <>{children}</>;

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      default: return 'Visita';
    }
  };

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-white dark:bg-dark-card z-50 border-b dark:border-dark-border px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2 text-hemp-800 dark:text-hemp-400">
          <Leaf className="w-6 h-6" />
          <span className="font-bold text-lg">HempAPP</span>
        </div>
        <button onClick={toggleMobile} className="p-2 text-gray-600 dark:text-gray-300">
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-card border-r dark:border-dark-border transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-16 flex items-center px-6 border-b dark:border-dark-border justify-between">
          <div className="flex items-center">
             <Leaf className="w-8 h-8 text-hemp-600 dark:text-hemp-500 mr-2" />
             <span className="text-xl font-bold text-gray-800 dark:text-gray-100">HempAPP</span>
          </div>
          
          {/* Theme Toggle in Header (Desktop) */}
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-gray-400 hover:text-hemp-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileOpen(false)} />
          <NavItem to="/projects" icon={FolderOpen} label="Proyectos" onClick={() => setIsMobileOpen(false)} />
          <NavItem to="/calendar" icon={CalendarIcon} label="Calendario" onClick={() => setIsMobileOpen(false)} />
          
          <div className="pt-2 pb-2">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Operativo</p>
              <NavItem to="/plots" icon={ClipboardList} label="Parcelas / Ensayos" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/tasks" icon={CheckSquare} label="Tareas" onClick={() => setIsMobileOpen(false)} />
          </div>

          <div className="pt-2 pb-2">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Inteligencia</p>
              <NavItem to="/advisor" icon={Sparkles} label="Asistente IA" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/analytics" icon={BarChart2} label="Análisis Comparativo" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/tools" icon={Calculator} label="Herramientas" onClick={() => setIsMobileOpen(false)} />
          </div>

          <div className="pt-2">
               <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Base de Datos</p>
               <NavItem to="/varieties" icon={Sprout} label="Variedades" onClick={() => setIsMobileOpen(false)} />
               <NavItem to="/locations" icon={MapPin} label="Locaciones" onClick={() => setIsMobileOpen(false)} />
          </div>
          
          <div className="pt-4 mt-4 border-t dark:border-dark-border border-gray-100">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Sistema</p>
                {isAdminOrSuper && (
                    <NavItem to="/users" icon={Users} label="Gestión Usuarios" onClick={() => setIsMobileOpen(false)} />
                )}
                {/* Botón de configuración siempre visible para admins O si estamos en modo emergencia */}
                {(isAdminOrSuper || isEmergencyMode) && (
                    <NavItem to="/settings" icon={Database} label="Configuración DB" onClick={() => setIsMobileOpen(false)} />
                )}
            </div>
        </nav>

        {/* User Profile Section & Footer */}
        <div className="border-t dark:border-dark-border bg-gray-50 dark:bg-dark-card">
           <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-full ${isEmergencyMode ? 'bg-amber-100 text-amber-700' : 'bg-hemp-100 dark:bg-hemp-900 text-hemp-700 dark:text-hemp-300'}`}>
                      <UserCircle size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{getRoleLabel(currentUser.role)}</p>
                  </div>
              </div>
              <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition"
              >
                  <LogOut size={16} />
                  <span>Cerrar Sesión</span>
              </button>
           </div>
           {/* Developer Footer */}
           <div className="bg-gray-100 dark:bg-slate-900 py-2 text-center border-t border-gray-200 dark:border-dark-border">
               <p className="text-[10px] text-gray-400 font-mono">Dev gaston.barea.moreno@gmail.com</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 overflow-y-auto h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}