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
  Moon,
  Bell,
  ScanBarcode,
  Building,
  AlertTriangle
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
  const { currentUser, logout, isEmergencyMode, dbNeedsMigration, theme, toggleTheme, notifications } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
  const isSuperAdmin = currentUser.role === 'super_admin';
  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex transition-colors duration-300">
      
      {/* DB MIGRATION WARNING BANNER */}
      {dbNeedsMigration && (
          <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white px-4 py-2 flex justify-between items-center shadow-md animate-pulse">
              <div className="flex items-center text-xs md:text-sm font-bold">
                  <AlertTriangle className="mr-2" size={18}/>
                  <span>ATENCIÓN: Base de datos desactualizada. Ejecuta el script SQL en Configuración.</span>
              </div>
              <Link to="/settings" className="bg-white text-red-600 text-xs px-3 py-1 rounded font-bold hover:bg-gray-100">
                  SOLUCIONAR
              </Link>
          </div>
      )}

      {/* Mobile Header (Dark Style to confirm update) */}
      <div className={`lg:hidden fixed top-0 w-full bg-slate-900 text-white z-50 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-md ${dbNeedsMigration ? 'mt-10' : ''}`}>
        <div className="flex items-center space-x-2">
          <Leaf className="w-6 h-6 text-hemp-500" />
          <span className="font-bold text-lg">HempC v2.6</span>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 relative text-gray-300 hover:text-white">
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
                )}
            </button>
            <button onClick={toggleMobile} className="p-2 text-gray-300 hover:text-white">
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Notifications Dropdown */}
      {isNotifOpen && (
        <div className={`fixed right-4 lg:right-10 z-50 w-80 bg-white dark:bg-dark-card rounded-xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden animate-in fade-in slide-in-from-top-2 ${dbNeedsMigration ? 'top-24' : 'top-16'}`}>
            <div className="px-4 py-3 border-b dark:border-dark-border bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Notificaciones ({unreadCount})</h3>
                <button onClick={() => setIsNotifOpen(false)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {unreadCount === 0 ? (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                        <Bell size={32} className="mb-2 opacity-30" />
                        <p className="text-sm">Todo al día. ¡Buen trabajo!</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <Link 
                            key={n.id} 
                            to={n.link || '#'} 
                            onClick={() => setIsNotifOpen(false)}
                            className="block px-4 py-3 border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                        >
                            <div className="flex items-start">
                                <div className={`w-2 h-2 mt-1.5 rounded-full mr-3 flex-shrink-0 ${
                                    n.type === 'alert' ? 'bg-red-500' : 
                                    n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                }`}></div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                                    <span className="text-[10px] text-gray-400 mt-1 block">{n.date}</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-card border-r dark:border-dark-border transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${dbNeedsMigration ? 'mt-10 lg:mt-10' : ''}
      `}>
        <div className="h-16 flex items-center px-6 border-b dark:border-dark-border justify-between bg-slate-900 text-white lg:bg-white lg:text-gray-800 lg:dark:bg-dark-card lg:dark:text-white">
          <div className="flex items-center">
             <Leaf className="w-8 h-8 text-hemp-500 lg:text-hemp-600 mr-2" />
             <span className="text-xl font-bold">HempC <span className="text-hemp-500 text-sm bg-hemp-900 lg:bg-hemp-100 px-1 rounded ml-1">v2.6</span></span>
          </div>
          
          <div className="flex items-center space-x-1">
              {/* Notification Bell (Desktop) */}
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                className="hidden lg:block p-2 rounded-full text-gray-400 hover:text-hemp-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors relative"
              >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                     <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
              </button>

              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full text-gray-400 hover:text-hemp-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
          </div>
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
               <NavItem to="/suppliers" icon={Building} label="Proveedores" onClick={() => setIsMobileOpen(false)} />
               <NavItem to="/varieties" icon={Sprout} label="Variedades" onClick={() => setIsMobileOpen(false)} />
               <NavItem to="/seed-batches" icon={ScanBarcode} label="Stock Semillas" onClick={() => setIsMobileOpen(false)} />
               <NavItem to="/locations" icon={MapPin} label="Locaciones" onClick={() => setIsMobileOpen(false)} />
          </div>
          
          <div className="pt-4 mt-4 border-t dark:border-dark-border border-gray-100">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Sistema</p>
                {isAdminOrSuper && (
                    <NavItem to="/users" icon={Users} label="Gestión Usuarios" onClick={() => setIsMobileOpen(false)} />
                )}
                {isSuperAdmin && (
                    <NavItem to="/settings" icon={Database} label="Configuración DB" onClick={() => setIsMobileOpen(false)} />
                )}
            </div>
        </nav>

        {/* User Profile Section & Footer */}
        <div className="border-t dark:border-dark-border bg-gray-50 dark:bg-dark-card">
           <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                  {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                  ) : (
                      <div className={`p-2 rounded-full ${isEmergencyMode ? 'bg-amber-100 text-amber-700' : 'bg-hemp-100 dark:bg-hemp-900 text-hemp-700 dark:text-hemp-300'}`}>
                          <UserCircle size={24} />
                      </div>
                  )}
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{currentUser.jobTitle || getRoleLabel(currentUser.role)}</p>
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
           <div className="bg-gray-100 dark:bg-slate-900 py-3 text-center border-t border-gray-200 dark:border-dark-border">
               <p className="text-[10px] text-gray-400 font-mono leading-tight">Dev gaston.barea.moreno@gmail.com</p>
               <div className="flex items-center justify-center space-x-2 mt-1">
                   <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold">v2.6</span>
                   <a href="https://xpatagonia.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-hemp-600 dark:text-hemp-500 font-bold font-mono hover:underline">
                       xpatagonia.com
                   </a>
               </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 lg:ml-0 pt-16 lg:pt-0 overflow-y-auto h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300 ${dbNeedsMigration ? 'mt-10 lg:mt-10' : ''}`}>
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}