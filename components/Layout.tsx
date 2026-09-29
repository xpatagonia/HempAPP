
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, Menu, Leaf, LogOut, 
  UserCircle, Calendar, Sun, Moon, 
  Tractor, BookOpen, Bot, Settings, 
  FolderKanban, CheckSquare, BarChart3, Users, Warehouse, Package, X, Bell, Globe, Building, ShieldAlert, FileText, BrainCircuit, Activity, FlaskConical, DownloadCloud, Satellite
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, badge, special }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${
        isActive 
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black' 
          : special 
            ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800/60' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
      }`}>
      <div className="flex items-center space-x-3 min-w-0">
        <Icon size={20} className={isActive ? 'text-white' : special ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-400'} />
        <span className={`font-bold text-sm tracking-tight truncate ${special ? 'uppercase text-xs tracking-wider' : ''}`}>{label}</span>
      </div>
      {badge && <span className="text-xs font-mono font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full shrink-0 ml-2">{badge}</span>}
    </Link>
  );
};

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { currentUser, logout, theme, toggleTheme, tasks, appName, appLogo } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <>{children}</>;

  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente').length;
  const isClient = currentUser.role === 'client';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* OVERLAY MOBILE */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}></div>}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-24 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center space-x-3 relative z-10 w-full">
             <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center min-w-[48px] h-[48px]">
                {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-contain" /> : <Leaf size={24} className="text-hemp-600" />}
             </div>
             <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white truncate uppercase italic" title={appName}>{appName}</span>
          </div>
          <button className="lg:hidden relative z-10 p-2 text-slate-400" onClick={() => setIsMobileOpen(false)}><X size={20}/></button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/agro40" icon={Satellite} label="Agro 4.0: NDVI & Suelos" special={true} />
          <NavItem to="/intelligence" icon={BrainCircuit} label="Inteligencia Agrónoma" />
          <NavItem to="/advisor" icon={Bot} label="AI Terminal" />
          
          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manejo Técnico</div>
          <NavItem to="/trials-lite" icon={FlaskConical} label="Gestión Ensayos (Lite)" />
          <NavItem to="/locations" icon={Tractor} label="Campos & Sitios" />
          <NavItem to="/plots" icon={Sprout} label="Unidades Prod." />
          <NavItem to="/tasks" icon={CheckSquare} label="Labores" badge={pendingTasksCount > 0 ? pendingTasksCount : null} />
          <NavItem to="/calendar" icon={Calendar} label="Ciclo Biológico" />
          <NavItem to="/projects" icon={FolderKanban} label="Campañas" />

          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cadena de Valor</div>
          <NavItem to="/logistics-map" icon={Globe} label="Torre de Control" />
          <NavItem to="/storage" icon={Warehouse} label="Almacenes" />
          <NavItem to="/seed-batches" icon={Package} label="Inventario" />
          <NavItem to="/varieties" icon={BookOpen} label="Genética" />
          
          {!isClient && (
            <>
              <NavItem to="/suppliers" icon={Warehouse} label="Proveedores" />
              <NavItem to="/clients" icon={Users} label="Socios de Red" />
            </>
          )}

          {isClient && (
            <NavItem to="/clients" icon={Building} label="Mi Organización" />
          )}

          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistema</div>
          <NavItem to="/analytics" icon={BarChart3} label="Comparativa Genética" />
          <NavItem to="/integrity" icon={ShieldAlert} label="Integridad Datos" />
          
          {!isClient && <NavItem to="/users" icon={Users} label="Equipo" />}
          {currentUser.role === 'super_admin' && <NavItem to="/settings" icon={Settings} label="Admin Server" />}
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
           <div className="mt-3 text-center text-[10px] font-mono text-slate-400">
               Nucleus • v7.0.8 ONLINE
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 md:px-8 flex items-center justify-between z-40 sticky top-0 shadow-sm">
          <div className="flex items-center space-x-4">
              <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"><Menu size={22}/></button>
              <div className="hidden md:flex items-center space-x-3 text-slate-500 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-200 text-xs font-mono font-bold tracking-tight">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    MODO CAMPO ONLINE
                  </span>
              </div>
          </div>
          
          <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 mr-1 md:mr-3 border-r pr-2 md:pr-4 border-slate-200 dark:border-slate-800">
                  <button className="p-3 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all relative">
                      <Bell size={20} />
                      <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  </button>
              </div>
              <button onClick={toggleTheme} className="p-2.5 md:p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center space-x-2 px-4 shadow-sm font-bold text-xs">
                  {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
                  <span className="font-mono text-xs font-bold hidden md:inline">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro (Alto Contraste)'}</span>
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-10 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
