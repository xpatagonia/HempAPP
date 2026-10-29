import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, Menu, Leaf, LogOut, 
  Calendar, Sun, Moon, 
  Tractor, BookOpen, Bot, Settings, 
  FolderKanban, CheckSquare, BarChart3, Warehouse, Package, X, Bell, Globe, Building, ShieldAlert, FileText, BrainCircuit, Satellite,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, DollarSign,
  Calculator, Truck, UserCheck, ClipboardList, Archive,
  ChevronDown, ChevronRight, Search, Megaphone
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
import { wakeUpRenderEngine } from '../src/services/telemetryStreamService';

const NavItem = ({ to, icon: Icon, label, badge, special, isCollapsed, onClickMobile }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  if (isCollapsed) {
    return (
      <Link 
        to={to} 
        onClick={onClickMobile}
        title={label}
        className={`flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-150 relative group ${
          isActive 
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' 
            : special 
              ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 border border-cyan-200 dark:border-cyan-800/60' 
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Icon size={19} className={isActive ? 'text-white' : special ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-300'} />
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[9px] font-mono font-black rounded-full flex items-center justify-center border border-white dark:border-slate-900">
            {badge}
          </span>
        )}
        
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {label}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClickMobile}
      className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 ${
        isActive 
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 font-black' 
          : special 
            ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-50/80 dark:bg-cyan-950/40 hover:bg-cyan-100/80 border border-cyan-200/80 dark:border-cyan-800/60 font-bold' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white font-semibold'
      }`}
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <Icon size={17} className={isActive ? 'text-white shrink-0' : special ? 'text-cyan-500 dark:text-cyan-400 shrink-0' : 'text-slate-400 dark:text-slate-400 shrink-0'} />
        <span className="text-xs tracking-tight truncate">{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] font-mono font-black bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-md shrink-0 ml-2">
          {badge}
        </span>
      )}
    </Link>
  );
};

export default function Layout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser, logout, theme, toggleTheme, tasks, plots, locations, clients, suppliers,
    appName, appLogo, impersonatingAdmin, startImpersonation, stopImpersonation, usersList
  } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifInitialTab, setNotifInitialTab] = useState<'all' | 'compose' | 'plot_critical' | 'task_reminder' | 'settings'>('all');
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    central: true,
    campo: true,
    logistica: true,
    sistema: true
  });

  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(() => {
    return getStoredNotifications().filter(n => !n.read).length;
  });
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  useEffect(() => {
    wakeUpRenderEngine();
    registerServiceWorker().then(() => {
      setPushStatus(getNotificationPermissionStatus());
    });

    const handleNotifChange = () => {
      setUnreadAlertsCount(getStoredNotifications().filter(n => !n.read).length);
      setPushStatus(getNotificationPermissionStatus());
    };
    window.addEventListener('nucleus:push-notification-change', handleNotifChange);

    const handleOpenComposerGlobal = () => {
      setNotifInitialTab('compose');
      setIsNotificationsOpen(true);
    };
    window.addEventListener('nucleus:open-push-composer', handleOpenComposerGlobal);

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE' && event.data.path) {
        setIsNotificationsOpen(false);
        navigate(event.data.path);
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    if (plots && plots.length > 0) {
      evaluateCriticalPlotAlerts(plots, locations || []);
    }
    if (tasks && tasks.length > 0) {
      evaluateUpcomingTasksReminders(tasks);
    }

    return () => {
      window.removeEventListener('nucleus:push-notification-change', handleNotifChange);
      window.removeEventListener('nucleus:open-push-composer', handleOpenComposerGlobal);
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

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  if (!currentUser) return <>{children}</>;

  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente').length;
  const isClient = currentUser.role === 'client';
  const isSupplierUser = Boolean(currentUser.supplierId && !currentUser.clientId);
  const currentSupplierName = isSupplierUser
    ? (suppliers || []).find(s => String(s.id) === String(currentUser.supplierId))?.name || currentUser.organizationName || 'Semillero Homologado'
    : null;

  const navGroups = [
    {
      id: 'central',
      title: 'Comando & Telemetría',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Centro de Control' },
        { to: '/agro40', icon: Satellite, label: 'Agro 4.0: NDVI & Clima', special: true },
        { to: '/intelligence', icon: BrainCircuit, label: 'Inteligencia Agrónoma' },
        { to: '/advisor', icon: Bot, label: 'Terminal Asesor IA' }
      ]
    },
    {
      id: 'campo',
      title: 'Manejo Técnico & Campo',
      items: [
        { to: '/locations', icon: Tractor, label: 'Campos & Sitios' },
        { to: '/plots', icon: Sprout, label: 'Parcelas de Cultivo' },
        { to: '/campaigns', icon: FolderKanban, label: 'Campañas Agrícolas' },
        { to: '/tasks', icon: CheckSquare, label: 'Labores Agrícolas', badge: pendingTasksCount > 0 ? pendingTasksCount : null },
        { to: '/calendar', icon: Calendar, label: 'Ciclo Biológico (BBCH)' },
        { to: '/trials-lite', icon: ClipboardList, label: 'Monitoreo Rápido' },
        { to: '/phytosanitary', icon: ShieldCheck, label: 'Cuaderno Fitosanitario' },
        { to: '/tools', icon: Calculator, label: 'Calculadoras de Dosis' }
      ]
    },
    {
      id: 'logistica',
      title: 'Trazabilidad & Logística',
      items: [
        { to: '/logistics-map', icon: Globe, label: 'Torre de Control' },
        { to: '/seed-batches', icon: Package, label: 'Semillas & Cosecha' },
        { to: '/storage', icon: Warehouse, label: 'Almacenes & Custodia' },
        { to: '/resources', icon: Archive, label: 'Insumos & Inventario' },
        { to: '/varieties', icon: BookOpen, label: 'Banco Genético' },
        ...(isSupplierUser
          ? [{ to: '/suppliers', icon: Truck, label: 'Mi Semillero / Proveedor' }]
          : !isClient
            ? [
                { to: '/suppliers', icon: Truck, label: 'Proveedores' },
                { to: '/clients', icon: Building, label: 'Socios de Red' }
              ]
            : [{ to: '/clients', icon: Building, label: 'Mi Organización' }])
      ]
    },
    {
      id: 'sistema',
      title: 'Finanzas & Gobernanza',
      items: [
        ...(!isSupplierUser ? [{ to: '/finances', icon: DollarSign, label: 'Costos & Finanzas' }] : []),
        { to: '/analytics', icon: BarChart3, label: 'Comparativa Genética' },
        { to: '/integrity', icon: ShieldAlert, label: 'Integridad & Licencias' },
        ...(!isClient && !isSupplierUser ? [{ to: '/users', icon: UserCheck, label: 'Equipo & Accesos' }] : []),
        ...(currentUser.role === 'super_admin' ? [{ to: '/settings', icon: Settings, label: 'Admin Server' }] : [])
      ]
    }
  ];

  const openNotificationDrawer = (tab: 'all' | 'compose' = 'all') => {
    setNotifInitialTab(tab);
    setIsNotificationsOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR COMPACTO Y ORGANIZADO */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'} bg-[#DDDB00] border-b border-[#b8b600]/60 shrink-0`}>
          <Link to="/" className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2.5'} min-w-0 group`}>
            <div
              className={`flex items-center justify-center shrink-0 overflow-hidden transition-transform group-hover:scale-[1.02] ${
                isCollapsed ? 'w-12 h-11' : 'h-11 w-[106px]'
              }`}
            >
              <img
                src={appLogo || '/hempc-logo-cropped.png?v=7.18.2'}
                alt="HempC"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-sm font-black tracking-tight text-slate-900 truncate uppercase italic block leading-tight">
                  {appName && appName.toUpperCase() !== 'HEMPC' ? `Nucleus ${appName}` : 'Nucleus Cooperativa'}
                </span>
                <span className="text-[9px] font-mono font-bold text-emerald-950/80 uppercase tracking-wider block mt-0.5 truncate">
                  {/* @ts-ignore */}
                  {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'V7.20.0-STABLE'}
                </span>
              </div>
            )}
          </Link>
          <button className="lg:hidden p-1.5 text-slate-800 hover:text-slate-950" onClick={() => setIsMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Buscador Rápido de Módulos (cuando está expandido) */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                placeholder="Buscar módulo..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {navSearch && (
                <button
                  onClick={() => setNavSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        <nav className={`flex-1 ${isCollapsed ? 'px-2 py-3 space-y-2' : 'px-3 py-2 space-y-3'} overflow-y-auto custom-scrollbar`}>
          {navGroups.map(group => {
            const filteredItems = group.items.filter(item =>
              !navSearch.trim() || item.label.toLowerCase().includes(navSearch.toLowerCase())
            );
            if (filteredItems.length === 0) return null;

            const isGroupActive = filteredItems.some(i => location.pathname === i.to);
            const isOpen = navSearch.trim() ? true : (openGroups[group.id] ?? true);

            return (
              <div key={group.id} className="space-y-1">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider transition cursor-pointer"
                  >
                    <span className={isGroupActive ? 'text-emerald-600 dark:text-emerald-400' : ''}>{group.title}</span>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                ) : (
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                )}

                {(isCollapsed || isOpen) && (
                  <div className="space-y-0.5">
                    {filteredItems.map(item => (
                      <NavItem
                        key={item.to}
                        {...item}
                        isCollapsed={isCollapsed}
                        onClickMobile={() => setIsMobileOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Acceso Directo Protocolo Anexo II y Descarga App */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <button
              type="button"
              onClick={() => setIsProtocolOpen(true)}
              title="Protocolo Técnico de Siembra (Anexo II - PDF)"
              className={isCollapsed
                ? "flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 transition"
                : "w-full flex items-center justify-between px-3 py-2 rounded-xl text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 border border-emerald-200/90 dark:border-emerald-800/60 transition font-bold text-xs cursor-pointer"
              }
            >
              <div className="flex items-center space-x-2 min-w-0">
                <FileText size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Protocolo Anexo II</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] font-mono font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase">
                  PDF
                </span>
              )}
            </button>

            <PWAInstallButton variant="sidebar" isCollapsed={isCollapsed} />
          </div>
        </nav>

        {/* Perfil de Usuario Compacto */}
        <div className={`${isCollapsed ? 'p-2' : 'p-3.5'} border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shrink-0`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  className="h-8 w-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=16a34a&color=fff`}
                  alt="Profile"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-black truncate text-slate-900 dark:text-white uppercase leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">
                    {currentUser.role.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              title="Cerrar Conexión"
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition shrink-0 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {impersonatingAdmin && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold z-50 border-b border-amber-600 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 text-[10px] font-black uppercase">
                Simulación de Rol Activa
              </span>
              <span>
                Viendo sistema como: <strong className="uppercase">{currentUser.name}</strong> ({currentUser.role})
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="px-2 py-0.5 rounded bg-amber-400/60 border border-slate-950/20 text-[11px] font-black">
                {isSupplierUser
                  ? `🌱 Semillero Aislado: ${currentSupplierName} (${plots.length} parcelas con su semilla)`
                  : currentUser.clientId
                    ? `🔒 Establecimiento Aislado: ${clients.find(c => c.id === currentUser.clientId)?.name || currentUser.organizationName || 'Socio'} (${plots.length} parcelas)`
                    : `🌐 Red Global (${plots.length} parcelas)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currentUser.id}
                onChange={e => startImpersonation(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-[11px] font-mono font-bold border border-slate-950/20 outline-none cursor-pointer"
                title="Cambiar usuario simulado"
              >
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) — {u.organizationName || 'Red Central'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => stopImpersonation()}
                className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-mono font-black uppercase cursor-pointer"
              >
                Salir de Simulación
              </button>
            </div>
          </div>
        )}
        <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between z-40 sticky top-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <Menu size={20} />
            </button>

            <button 
              onClick={toggleCollapse} 
              title={isCollapsed ? "Expandir menú lateral" : "Compactar menú lateral"}
              className="hidden lg:flex p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <div className="hidden md:flex items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-300">
              <span className="text-slate-800 dark:text-slate-200 font-black capitalize">
                {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <OfflineIndicator />
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase border ${
                  isSupplierUser
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                    : currentUser.clientId
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                }`}
                title="Alcance de datos habilitado para la sesión actual"
              >
                {isSupplierUser
                  ? `Semillero: ${currentSupplierName} (${plots.length} Lotes con su Semilla)`
                  : currentUser.clientId
                    ? `Establecimiento: ${clients.find(c => c.id === currentUser.clientId)?.name || currentUser.organizationName || 'Socio'} (${plots.length} Lotes)`
                    : `Red Global (${plots.length} Lotes)`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 dark:border-slate-800">
              <PWAInstallButton variant="header" />

              <button
                onClick={() => setIsProtocolOpen(true)}
                title="Protocolo Técnico de Siembra Oficial (Anexo II - PDF)"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
              >
                <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-[10px] font-black uppercase">Anexo II</span>
              </button>

              {/* Botón Directo: Emitir Push Manual sin Scroll */}
              <button
                onClick={() => openNotificationDrawer('compose')}
                title="Emitir Notificación Push Manual / Difusión Rápida"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-xs transition cursor-pointer"
              >
                <Megaphone size={14} />
                <span className="hidden sm:inline text-[11px]">Emitir Push</span>
              </button>

              {/* Botón Bandeja de Notificaciones */}
              <button 
                onClick={() => openNotificationDrawer('all')}
                title="Bandeja de Alertas & Configuración Push"
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition relative cursor-pointer border border-slate-200/70 dark:border-slate-800"
              >
                <Bell size={18} className={unreadAlertsCount > 0 ? 'text-slate-900 dark:text-white' : ''} />
                {unreadAlertsCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-rose-500 text-white text-[9px] font-mono font-black rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                    {unreadAlertsCount}
                  </span>
                ) : pushStatus === 'default' ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
                ) : null}
              </button>
            </div>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 px-3 font-bold text-xs cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
              <span className="font-mono text-[11px] font-bold hidden xl:inline">
                {theme === 'dark' ? 'Claro' : 'Oscuro'}
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 scroll-smooth">
          {children}
        </div>
      </main>

      <NotificationCenterModal 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)}
        initialTab={notifInitialTab}
      />

      <SeedingProtocolModal
        isOpen={isProtocolOpen}
        onClose={() => setIsProtocolOpen(false)}
      />
    </div>
  );
}
