
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
  Users,
  Settings,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  ScanBarcode,
  Tractor,
  BookOpen,
  Clock,
  Bot,
  ChevronRight,
  Sparkles,
  Search
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, onClick, highlight = false }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
        isActive 
          ? 'bg-hemp-600 text-white shadow-xl shadow-hemp-900/20 translate-x-1' 
          : highlight 
            ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 font-black border border-purple-100 dark:border-purple-900/30'
            : 'text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-hemp-700 dark:hover:text-hemp-400'
      }`}
    >
      <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
      <span className="font-bold tracking-tight text-sm">{label}</span>
      {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, theme, toggleTheme, lastSyncTime } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <>{children}</>;

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050810] flex transition-colors duration-500 font-sans">
      
      {/* SIDEBAR v4.0 */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white dark:bg-[#0a0f1d] border-r border-slate-200 dark:border-white/5 transform transition-transform duration-500 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center group cursor-pointer">
             <div className="bg-hemp-600 p-2 rounded-xl mr-3 group-hover:rotate-12 transition-transform">
                <Leaf className="w-6 h-6 text-white" />
             </div>
             <span className="text-2xl font-black tracking-tighter dark:text-white uppercase italic">HEMP<span className="text-hemp-600">C</span></span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase mb-4 tracking-[0.2em]">Operación Central</p>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileOpen(false)} />
          <NavItem to="/advisor" icon={Bot} label="Asistente HempAI" highlight={true} onClick={() => setIsMobileOpen(false)} />
          
          <div className="pt-8 pb-2">
              <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase mb-4 tracking-[0.2em]">Ejecución de Campo</p>
              <NavItem to="/locations" icon={Tractor} label="Establecimientos" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/plots" icon={ClipboardList} label="Unidades de Cultivo" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/calendar" icon={CalendarIcon} label="Calendario Agrícola" onClick={() => setIsMobileOpen(false)} />
          </div>

          <div className="pt-6 pb-2">
              <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase mb-4 tracking-[0.2em]">Logística & Stock</p>
              <NavItem to="/seed-batches" icon={ScanBarcode} label="Inventario Semillas" onClick={() => setIsMobileOpen(false)} />
              <NavItem to="/varieties" icon={BookOpen} label="Catálogo Genético" onClick={() => setIsMobileOpen(false)} />
          </div>

          {isAdminOrSuper && (
            <div className="pt-6">
                 <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase mb-4 tracking-[0.2em]">Configuración</p>
                 <NavItem to="/users" icon={Users} label="Gestión de Equipo" onClick={() => setIsMobileOpen(false)} />
                 <NavItem to="/settings" icon={Settings} label="Sistema & Nodo" onClick={() => setIsMobileOpen(false)} />
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 dark:border-white/5 p-6 bg-slate-50/50 dark:bg-black/20">
           <div className="flex items-center space-x-4 mb-6">
               <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-hemp-500 to-hemp-700 flex items-center justify-center text-white shadow-xl">
                   <UserCircle size={28} />
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-black text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{currentUser.role.replace('_', ' ')}</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-4 rounded-2xl transition-all font-black uppercase tracking-widest border border-transparent hover:border-red-200 dark:hover:border-red-900/50">
               <LogOut size={16} />
               <span>Desconectar Nodo</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-[#050810]">
        {/* TOP BAR */}
        <header className="h-20 bg-white/80 dark:bg-[#0a0f1d]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-10 flex items-center justify-between z-30">
          <div className="flex items-center lg:hidden">
            <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-400"><Menu size={28}/></button>
            <span className="ml-3 text-xl font-black dark:text-white tracking-tighter italic">HEMPC</span>
          </div>
          
          <div className="hidden lg:flex items-center space-x-4">
              <div className="h-2.5 w-2.5 rounded-full bg-hemp-500 animate-ping"></div>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.4em]">HempC Intelligence Node 4.0</span>
          </div>

          <div className="flex items-center space-x-6">
              <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sincronización Cloud</span>
                  <div className="flex items-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <Clock size={12} className="mr-1.5 text-hemp-500"/>
                      {lastSyncTime ? `${lastSyncTime.toLocaleTimeString()}` : 'Real-time'}
                  </div>
              </div>
              <button onClick={toggleTheme} className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-hemp-600 transition-all border border-transparent dark:border-white/5 shadow-inner">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
          <div className="container mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
