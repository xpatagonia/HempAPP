
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
  Settings,
  Database,
  Calendar as CalendarIcon,
  Sparkles,
  Sun,
  Moon,
  ScanBarcode,
  Building,
  Briefcase,
  Archive,
  Warehouse,
  Tractor,
  BookOpen,
  RefreshCw,
  Clock,
  Bot
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, onClick, highlight = false }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-hemp-600 text-white shadow-lg shadow-hemp-900/20 translate-x-1' 
          : highlight 
            ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-bold'
            : 'text-gray-600 dark:text-gray-400 hover:bg-hemp-50 dark:hover:bg-dark-border hover:text-hemp-800 dark:hover:text-hemp-400'
      }`}
    >
      <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
      <span className="font-semibold tracking-tight">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, isEmergencyMode, theme, toggleTheme, refreshData, isRefreshing, lastSyncTime } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <>{children}</>;

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'super_admin': return 'Root Admin';
      case 'admin': return 'Administrador';
      case 'technician': return 'Ingeniero';
      case 'client': return 'Productor';
      default: return 'Visita';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050810] flex transition-colors duration-500 font-sans">
      
      {/* HEADER DESKTOP */}
      <header className="hidden lg:flex fixed top-0 right-0 left-64 h-16 bg-white/80 dark:bg-[#0a0f1d]/80 backdrop-blur-md border-b dark:border-white/5 z-30 px-8 items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
              <div className="h-2 w-2 rounded-full bg-hemp-500 animate-pulse"></div>
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">HempC Core Interface</span>
          </div>
          <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end mr-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sync Status</span>
                  <div className="flex items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Clock size={12} className="mr-1 text-hemp-500"/>
                      {lastSyncTime ? `${lastSyncTime.toLocaleTimeString()}` : 'Real-time'}
                  </div>
              </div>
              
              <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-hemp-600 transition-all border border-transparent dark:border-white/5">
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
          </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0a0f1d] border-r dark:border-white/5 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-16 flex items-center px-6 border-b dark:border-white/5">
          <div className="flex items-center group cursor-pointer">
             <Leaf className="w-8 h-8 text-hemp-600 mr-2 group-hover:rotate-12 transition-transform" />
             <span className="text-2xl font-black tracking-tighter dark:text-white">HEMP<span className="text-hemp-600">C</span></span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileOpen(false)} />
          <NavItem to="/advisor" icon={Sparkles} label="Asistente IA" highlight={true} onClick={() => setIsMobileOpen(false)} />
          
          <div className="pt-6 pb-2">
              <p className="px-4 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-3 tracking-[0.2em]">Operaciones</p>
              <NavItem to="/locations" icon={Tractor} label="Campos" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/plots" icon={ClipboardList} label="Planilla Global" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/calendar" icon={CalendarIcon} label="Calendario" onClick={() => setIsMobileOpen(false)} />
          </div>

          <div className="pt-4 pb-2">
              <p className="px-4 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-3 tracking-[0.2em]">Logística</p>
              <NavItem to="/seed-batches" icon={ScanBarcode} label="Inventario" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/varieties" icon={BookOpen} label="Genética" onClick={() => setIsMobileOpen(false)} />
          </div>

          {isAdminOrSuper && (
            <div className="pt-4">
                 <p className="px-4 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase mb-3 tracking-[0.2em]">Sistema</p>
                 <NavItem to="/users" icon={Users} label="Equipo" onClick={() => setIsMobileOpen(false)} />
                 <NavItem to="/settings" icon={Settings} label="Config" onClick={() => setIsMobileOpen(false)} />
            </div>
          )}
        </nav>

        <div className="border-t dark:border-white/5 p-5 bg-slate-50/50 dark:bg-black/20">
           <div className="flex items-center space-x-3 mb-4">
               <div className="h-10 w-10 rounded-xl bg-hemp-600 flex items-center justify-center text-white shadow-lg shadow-hemp-900/20">
                   <UserCircle size={24} />
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-black text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{getRoleLabel(currentUser.role)}</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-2.5 rounded-xl transition-all font-black uppercase tracking-widest border border-transparent hover:border-red-200 dark:hover:border-red-900/50">
               <LogOut size={14} />
               <span>Desconectar</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 pt-20 lg:pt-16 overflow-y-auto h-screen bg-slate-50 dark:bg-[#050810]">
        <div className="container mx-auto p-4 lg:p-10 max-w-7xl relative animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
