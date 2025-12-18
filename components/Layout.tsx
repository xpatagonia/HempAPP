
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
  AlertTriangle,
  Briefcase,
  Cloud,
  CloudOff,
  Archive,
  Warehouse,
  Tractor,
  BookOpen,
  RefreshCw,
  Clock
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
  const { currentUser, logout, isEmergencyMode, dbNeedsMigration, theme, toggleTheme, notifications, refreshData, isRefreshing, lastSyncTime } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  if (!currentUser) return <>{children}</>;

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      case 'client': return 'Productor Red';
      default: return 'Visita';
    }
  };

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex transition-colors duration-300 font-sans">
      
      {/* GLOBAL PROGRESS BAR DURING SYNC */}
      {isRefreshing && (
          <div className="fixed top-0 left-0 w-full h-1 z-[200] bg-hemp-100 overflow-hidden">
              <div className="h-full bg-hemp-600 animate-pulse w-full origin-left"></div>
          </div>
      )}

      {/* HEADER DESKTOP */}
      <header className={`hidden lg:flex fixed top-0 right-0 left-64 h-16 bg-white dark:bg-dark-card border-b dark:border-dark-border z-30 px-8 items-center justify-between shadow-sm`}>
          <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">HempC Enterprise System</span>
          </div>
          <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Sincronización</span>
                  <div className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      <Clock size={12} className="mr-1 text-hemp-500"/>
                      {lastSyncTime ? `${lastSyncTime.toLocaleTimeString()}` : 'Pendiente'}
                  </div>
              </div>
              
              <button 
                  onClick={() => refreshData()} 
                  disabled={isRefreshing}
                  className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border ${
                    isRefreshing 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-hemp-600 text-white border-hemp-500 hover:bg-hemp-700 hover:shadow-md active:scale-95'
                  }`}
              >
                  <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Actualizando' : 'Sincronizar'}
              </button>

              <button onClick={toggleTheme} className="p-2 ml-2 rounded-xl bg-gray-50 dark:bg-dark-border text-gray-500 hover:text-hemp-600 transition-colors border border-gray-200 dark:border-transparent">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
      </header>

      {/* MOBILE HEADER */}
      <div className={`lg:hidden fixed top-0 w-full bg-slate-900 text-white z-50 px-4 py-3 flex justify-between items-center shadow-md`}>
        <div className="flex items-center space-x-2">
          <Leaf className="w-6 h-6 text-hemp-500" />
          <span className="font-bold text-lg">HempC</span>
        </div>
        <div className="flex items-center space-x-3">
            <button onClick={() => refreshData()} className={`p-2 rounded-lg bg-slate-800 ${isRefreshing ? 'text-hemp-500 animate-spin' : 'text-gray-300'}`}>
                <RefreshCw size={20} />
            </button>
            <button onClick={toggleMobile} className="p-2 text-gray-300">
              {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-card border-r dark:border-dark-border transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-16 flex items-center px-6 border-b dark:border-dark-border bg-slate-900 text-white lg:bg-white lg:text-gray-800 lg:dark:bg-dark-card lg:dark:text-white">
          <div className="flex items-center">
             <Leaf className="w-8 h-8 text-hemp-500 lg:text-hemp-600 mr-2" />
             <span className="text-xl font-black tracking-tight">HempC <span className="text-hemp-500 text-[10px] bg-hemp-900 lg:bg-hemp-100 px-1.5 py-0.5 rounded ml-1 font-mono">v3.1</span></span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileOpen(false)} />
          <NavItem to="/projects" icon={FolderOpen} label="Proyectos" onClick={() => setIsMobileOpen(false)} />
          <NavItem to="/calendar" icon={CalendarIcon} label="Calendario" onClick={() => setIsMobileOpen(false)} />
          
          <div className="pt-4 pb-2">
              <p className="px-4 text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Operativo</p>
              <NavItem to="/locations" icon={Tractor} label="Campos y Sitios" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/plots" icon={ClipboardList} label="Planilla Global" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/tasks" icon={CheckSquare} label="Tareas" onClick={() => setIsMobileOpen(false)} />
          </div>

          <div className="pt-2 pb-2">
              <p className="px-4 text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Logística & Stock</p>
              <NavItem to="/seed-batches" icon={ScanBarcode} label="Gestión Semillas" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/storage" icon={Warehouse} label="Puntos de Acopio" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/varieties" icon={BookOpen} label="Catálogo Genético" onClick={() => setIsMobileOpen(false)} />
          </div>

          <div className="pt-2">
               <p className="px-4 text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Administración</p>
               <NavItem to="/suppliers" icon={Building} label="Proveedores" onClick={() => setIsMobileOpen(false)} />
               <NavItem to="/clients" icon={Briefcase} label="Clientes Red" onClick={() => setIsMobileOpen(false)} />
               <NavItem to="/resources" icon={Archive} label="Insumos Varios" onClick={() => setIsMobileOpen(false)} />
          </div>
        </nav>

        <div className="border-t dark:border-dark-border bg-gray-50 dark:bg-dark-card p-4">
           <div className="flex items-center space-x-3 mb-3">
               <div className={`p-2 rounded-full ${isEmergencyMode ? 'bg-amber-200 text-amber-700' : 'bg-hemp-100 dark:bg-hemp-900 text-hemp-700 dark:text-hemp-300'}`}>
                   <UserCircle size={24} />
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{currentUser.name}</p>
                   <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate uppercase font-black tracking-tighter">{getRoleLabel(currentUser.role)}</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition font-black uppercase tracking-wider border border-transparent hover:border-red-100">
               <LogOut size={14} />
               <span>Cerrar Sesión</span>
           </button>
        </div>
      </aside>

      <main className={`flex-1 pt-20 lg:pt-16 overflow-y-auto h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300`}>
        <div className="container mx-auto p-4 lg:p-10 max-w-7xl relative">
          {children}
        </div>
      </main>
    </div>
  );
}
