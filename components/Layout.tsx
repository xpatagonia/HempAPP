
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, Menu, Leaf, LogOut, 
  UserCircle, Calendar, Sun, Moon, 
  Tractor, BookOpen, Bot, Settings, 
  FolderKanban, CheckSquare, BarChart3, Users, Warehouse, Package, X, Bell, Globe, Building, ShieldAlert, FileText, BrainCircuit, Activity, FlaskConical, DownloadCloud, Satellite,
  PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight, ShieldCheck, DollarSign,
  Calculator, Truck, UserCheck, ClipboardList, Radio, Archive
} from 'lucide-react';
import NotificationCenterModal from './NotificationCenterModal';
import SeedingProtocolModal from './SeedingProtocolModal';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { 
  registerServiceWorker, 
  getStoredNotifications, 
  getNotificationPermissionStatus,
  evaluateCriticalPlotAlerts,
  evaluateUpcomingTasksReminders
} from '../src/services/pushNotificationService';

const NavItem = ({ to, icon: Icon, label, badge, special, isCollapsed }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  if (isCollapsed) {
    return (
      <Link 
        to={to} 
        title={label}
        className={`flex items-center justify-center h-12 w-12 mx-auto rounded-2xl transition-all duration-200 relative group ${
          isActive 
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
            : special 
              ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800/60' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Icon size={22} className={isActive ? 'text-white' : special ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-300'} />
        {badge && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-mono font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
            {badge}
          </span>
        )}
        
        {/* Floating Tooltip on Hover */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {label}
        </div>
      </Link>
    );
  }

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
  const navigate = useNavigate();
  const { currentUser, logout, theme, toggleTheme, tasks, plots, locations, appName, appLogo } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(() => {
    return getStoredNotifications().filter(n => !n.read).length;
  });
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  useEffect(() => {
    // 1. Inicializar Service Worker
    registerServiceWorker().then(() => {
      setPushStatus(getNotificationPermissionStatus());
    });

    // 2. Escuchar cambios de notificaciones
    const handleNotifChange = () => {
      setUnreadAlertsCount(getStoredNotifications().filter(n => !n.read).length);
      setPushStatus(getNotificationPermissionStatus());
    };
    window.addEventListener('nucleus:push-notification-change', handleNotifChange);

    // 3. Escuchar navegación disparada desde clics en el Service Worker
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE' && event.data.path) {
        setIsNotificationsOpen(false);
        navigate(event.data.path);
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // 4. Evaluar alertas críticas de parcelas y tareas próximas
    if (plots && plots.length > 0) {
      evaluateCriticalPlotAlerts(plots, locations || []);
    }
    if (tasks && tasks.length > 0) {
      evaluateUpcomingTasksReminders(tasks);
    }

    return () => {
      window.removeEventListener('nucleus:push-notification-change', handleNotifChange);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [plots, locations, tasks, navigate]);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ht_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ht_sidebar_collapsed', String(next));
      }
      return next;
    });
  };
  
  if (!currentUser) return <>{children}</>;

  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente').length;
  const isClient = currentUser.role === 'client';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* OVERLAY MOBILE */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}></div>}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'} border-b border-slate-100 dark:border-slate-800 relative overflow-hidden shrink-0`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} relative z-10 w-full`}>
             <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center min-w-[44px] h-[44px]">
                {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-contain" /> : <Leaf size={24} className="text-hemp-600" />}
             </div>
             {!isCollapsed && (
               <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white truncate uppercase italic" title={appName}>{appName}</span>
             )}
          </div>
          <button className="lg:hidden relative z-10 p-2 text-slate-400" onClick={() => setIsMobileOpen(false)}><X size={20}/></button>
        </div>

        <nav className={`flex-1 ${isCollapsed ? 'px-2 py-6 space-y-3' : 'px-4 py-8 space-y-1'} overflow-y-auto custom-scrollbar`}>
          {/* Operación Central & Monitoreo */}
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
          <NavItem to="/agro40" icon={Satellite} label="Agro 4.0: NDVI & Suelos" special={true} isCollapsed={isCollapsed} />
          <NavItem to="/intelligence" icon={BrainCircuit} label="Inteligencia Agrónoma" isCollapsed={isCollapsed} />
          <NavItem to="/advisor" icon={Bot} label="AI Terminal" isCollapsed={isCollapsed} />
          
          {/* Manejo Técnico & Campo (Estructura Geográfica y Labores) */}
          <div className={isCollapsed ? "pt-4 pb-1 border-t border-slate-200 dark:border-slate-800 my-2" : "pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"}>
            {!isCollapsed && "Manejo Técnico & Campo"}
          </div>
          <NavItem to="/locations" icon={Tractor} label="Campos & Sitios" isCollapsed={isCollapsed} />
          <NavItem to="/plots" icon={Sprout} label="Parcelas de Cultivo" isCollapsed={isCollapsed} />
          <NavItem to="/campaigns" icon={FolderKanban} label="Campañas Agrícolas" isCollapsed={isCollapsed} />
          <NavItem to="/tasks" icon={CheckSquare} label="Labores Agrícolas" badge={pendingTasksCount > 0 ? pendingTasksCount : null} isCollapsed={isCollapsed} />
          <NavItem to="/calendar" icon={Calendar} label="Ciclo Biológico (BBCH)" isCollapsed={isCollapsed} />
          <NavItem to="/trials-lite" icon={ClipboardList} label="Monitoreo Agronómico" isCollapsed={isCollapsed} />
          <NavItem to="/phytosanitary" icon={ShieldCheck} label="Cuaderno Fitosanitario" isCollapsed={isCollapsed} />
          <NavItem to="/tools" icon={Calculator} label="Calculadoras Agronómicas" isCollapsed={isCollapsed} />
          
          {/* Botón Acceso Rápido Protocolo Técnico Anexo II */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsProtocolOpen(true)}
              title="Protocolo Técnico de Siembra y Manejo Agronómico (Anexo II - PDF Oficial)"
              className={isCollapsed
                ? "flex items-center justify-center h-12 w-12 mx-auto rounded-2xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 transition-all relative group"
                : "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border border-emerald-200/90 dark:border-emerald-800/60 transition-all font-bold text-sm tracking-tight shadow-sm"
              }
            >
              <div className="flex items-center space-x-3 min-w-0">
                <FileText size={isCollapsed ? 22 : 20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!isCollapsed && <span className="font-bold text-sm tracking-tight truncate">Protocolo de Siembra</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] font-mono font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0 ml-2 uppercase shadow-sm">
                  PDF
                </span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Protocolo de Siembra (Anexo II)
                </div>
              )}
            </button>
          </div>

          {/* Cadena de Valor & Logística */}
          <div className={isCollapsed ? "pt-4 pb-1 border-t border-slate-200 dark:border-slate-800 my-2" : "pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"}>
            {!isCollapsed && "Cadena de Valor & Logística"}
          </div>
          <NavItem to="/logistics-map" icon={Globe} label="Torre de Control" isCollapsed={isCollapsed} />
          <NavItem to="/seed-batches" icon={Package} label="Lotes de Semilla & Cosecha" isCollapsed={isCollapsed} />
          <NavItem to="/storage" icon={Warehouse} label="Almacenes & Custodia" isCollapsed={isCollapsed} />
          <NavItem to="/resources" icon={Archive} label="Insumos & Recursos" isCollapsed={isCollapsed} />
          <NavItem to="/varieties" icon={BookOpen} label="Banco Genético" isCollapsed={isCollapsed} />
          
          {!isClient && (
            <>
              <NavItem to="/suppliers" icon={Truck} label="Proveedores Homologados" isCollapsed={isCollapsed} />
              <NavItem to="/clients" icon={Building} label="Socios de Red" isCollapsed={isCollapsed} />
            </>
          )}
          {isClient && (
            <NavItem to="/clients" icon={Building} label="Mi Organización" isCollapsed={isCollapsed} />
          )}

          {/* Gestión Económica & Sistema */}
          <div className={isCollapsed ? "pt-4 pb-1 border-t border-slate-200 dark:border-slate-800 my-2" : "pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"}>
            {!isCollapsed && "Gestión & Sistema"}
          </div>
          <NavItem to="/finances" icon={DollarSign} label="Costos Operativos & Finanzas" isCollapsed={isCollapsed} />
          <NavItem to="/analytics" icon={BarChart3} label="Comparativa Genética" isCollapsed={isCollapsed} />
          <NavItem to="/integrity" icon={ShieldAlert} label="Integridad de Datos" isCollapsed={isCollapsed} />
          
          {!isClient && <NavItem to="/users" icon={UserCheck} label="Equipo & Accesos" isCollapsed={isCollapsed} />}
          {currentUser.role === 'super_admin' && <NavItem to="/settings" icon={Settings} label="Admin Server" isCollapsed={isCollapsed} />}

          {/* Descarga e Instalación de App Android & Windows Escritorio */}
          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
            <PWAInstallButton variant="sidebar" isCollapsed={isCollapsed} />
          </div>
        </nav>

        <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0`}>
           <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4 mb-6'}`}>
               <div className="relative group">
                    <img className="h-10 w-10 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md" src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}&background=16a34a&color=fff`} alt="Profile" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
               </div>
               {!isCollapsed && (
                 <div className="flex-1 min-w-0">
                     <p className="text-sm font-black truncate text-slate-900 dark:text-white uppercase tracking-tight">{currentUser.name}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role.replace('_', ' ')}</p>
                 </div>
               )}
           </div>
           
           {!isCollapsed ? (
             <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-3 rounded-2xl transition-all font-black uppercase tracking-widest border border-transparent hover:border-red-100 mt-2">
                 <LogOut size={16} /> <span>Cerrar Conexión</span>
             </button>
           ) : (
             <button onClick={logout} title="Cerrar Conexión" className="w-10 h-10 mx-auto flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all mt-3">
                 <LogOut size={18} />
             </button>
           )}

           {!isCollapsed && (
             <div className="mt-3 text-center text-[10px] font-mono text-slate-400">
                 Nucleus • v7.13.0 ONLINE
             </div>
           )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 md:px-8 flex items-center justify-between z-40 sticky top-0 shadow-sm">
          <div className="flex items-center space-x-3">
              <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                <Menu size={22}/>
              </button>
              
              {/* Botón Desktop para ocultar / mostrar menú lateral */}
              <button 
                onClick={toggleCollapse} 
                title={isCollapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}
                className="hidden lg:flex p-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-slate-200 dark:border-slate-800"
              >
                {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>

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
                  {/* Botones Instalar App Android y Windows Escritorio */}
                  <div className="flex items-center mr-1">
                    <PWAInstallButton variant="header" />
                  </div>

                  {/* Botón Protocolo de Siembra Anexo II en Header */}
                  <button
                    onClick={() => setIsProtocolOpen(true)}
                    title="Protocolo Técnico de Siembra Oficial (Anexo II - PDF)"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold transition-all shadow-sm mr-1 cursor-pointer"
                  >
                    <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="font-mono text-[11px] font-black uppercase">Anexo II (PDF)</span>
                  </button>

                  <button 
                    onClick={() => setIsNotificationsOpen(true)}
                    title="Centro de Alertas & Push (Service Worker)"
                    className="p-3 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all relative group cursor-pointer"
                  >
                      <Bell size={20} className={unreadAlertsCount > 0 ? 'text-slate-800 dark:text-white' : ''} />
                      {unreadAlertsCount > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-mono font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                          {unreadAlertsCount}
                        </span>
                      ) : pushStatus === 'default' ? (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900" title="Push disponible para activar" />
                      ) : null}
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

      {/* MODAL / DRAWER CENTRO DE NOTIFICACIONES PUSH */}
      <NotificationCenterModal 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />

      {/* MODAL OFICIAL PROTOCOLO TÉCNICO DE SIEMBRA ANEXO II */}
      <SeedingProtocolModal
        isOpen={isProtocolOpen}
        onClose={() => setIsProtocolOpen(false)}
      />

      {/* INDICADOR DE MODO CAMPO OFFLINE */}
      <OfflineIndicator />
    </div>
  );
}
