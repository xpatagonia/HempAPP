import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, BellRing, Check, CheckCheck, Trash2, X, AlertTriangle, 
  Clock, Sprout, ShieldAlert, Sparkles, Volume2, VolumeX, Settings,
  ExternalLink, Info, CheckCircle2, RefreshCw, Send, Radio
} from 'lucide-react';
import { 
  PushNotificationItem, 
  PushSettings,
  getStoredNotifications, 
  getNotificationPermissionStatus,
  requestPushPermission,
  getPushSettings,
  savePushSettings,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteStoredNotification,
  clearAllStoredNotifications,
  triggerTestPlotAlert,
  triggerTestTaskReminder
} from '../src/services/pushNotificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenterModal({ isOpen, onClose }: NotificationCenterModalProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [settings, setSettings] = useState<PushSettings>(getPushSettings());
  const [activeTab, setActiveTab] = useState<'all' | 'plot_critical' | 'task_reminder' | 'settings'>('all');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [testSending, setTestSending] = useState<'plot' | 'task' | null>(null);
  const [swActive, setSwActive] = useState<boolean>(false);

  // Cargar estado inicial y suscribir a cambios
  const loadData = () => {
    setNotifications(getStoredNotifications());
    setPermission(getNotificationPermissionStatus());
    setSettings(getPushSettings());
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      setSwActive(!!navigator.serviceWorker.controller);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('nucleus:push-notification-change', handleUpdate);
    return () => {
      window.removeEventListener('nucleus:push-notification-change', handleUpdate);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'plot_critical') return item.category === 'plot_critical';
    if (activeTab === 'task_reminder') return item.category === 'task_reminder';
    return true;
  });

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    const granted = await requestPushPermission();
    setPermission(getNotificationPermissionStatus());
    setIsRequestingPermission(false);
    if (granted) {
      // Disparar bienvenida push
      triggerTestPlotAlert('Parcela Demo Experimental');
    }
  };

  const handleTriggerTest = async (type: 'plot' | 'task') => {
    setTestSending(type);
    if (type === 'plot') {
      await triggerTestPlotAlert();
    } else {
      await triggerTestTaskReminder();
    }
    setTimeout(() => {
      setTestSending(null);
      loadData();
    }, 400);
  };

  const handleNavigate = (url: string, id: string) => {
    markNotificationAsRead(id);
    onClose();
    if (url.startsWith('/')) {
      navigate(url);
    }
  };

  const handleToggleSetting = (key: keyof PushSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key]
    };
    setSettings(updated);
    savePushSettings(updated);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Hace instantes';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
      {/* Fondo desenfocado */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Lateral */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 z-10">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BellRing size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Centro de Alertas & Push</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-rose-500 text-white rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Service Worker & Alertas Agronómicas en Vivo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estado del Service Worker & Permisos */}
        <div className="px-5 py-3.5 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${permission === 'granted' ? 'bg-emerald-500 animate-pulse' : permission === 'denied' ? 'bg-rose-500' : 'bg-amber-500'}`} />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {permission === 'granted' 
                ? 'Notificaciones Push: Activas' 
                : permission === 'denied'
                  ? 'Push Bloqueadas en Navegador'
                  : 'Push Pendiente de Activación'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
              SW {swActive ? 'Online' : 'Registrado'}
            </span>
          </div>

          {permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              disabled={isRequestingPermission}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center space-x-1"
            >
              <Radio size={12} className="animate-spin" />
              <span>{isRequestingPermission ? 'Activando...' : 'Activar Push'}</span>
            </button>
          )}
        </div>

        {/* Tabs de Filtro */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('plot_critical')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${activeTab === 'plot_critical' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <ShieldAlert size={13} />
              <span>Parcelas</span>
            </button>
            <button
              onClick={() => setActiveTab('task_reminder')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${activeTab === 'task_reminder' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Clock size={13} />
              <span>Labores</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${activeTab === 'settings' ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Settings size={13} />
              <span>Ajustes</span>
            </button>
          </div>

          {activeTab !== 'settings' && notifications.length > 0 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={markAllNotificationsAsRead}
                title="Marcar todas como leídas"
                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <CheckCheck size={16} />
              </button>
              <button
                onClick={clearAllStoredNotifications}
                title="Borrar historial"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Contenedor Principal con Scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
          
          {/* VISTA: Ajustes de Push */}
          {activeTab === 'settings' ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Configuración de Emisión Push</h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Alertas Críticas de Parcelas</p>
                      <p className="text-[11px] text-slate-500">Heladas (&lt;3°C), olas de calor, déficit hídrico y estrés</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.notifyCriticalPlots} 
                      onChange={() => handleToggleSetting('notifyCriticalPlots')}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2.5">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Recordatorios de Tareas & Labores</p>
                      <p className="text-[11px] text-slate-500">Vencimientos de hoy y labores agendadas en 48 horas</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.notifyUpcomingTasks} 
                      onChange={() => handleToggleSetting('notifyUpcomingTasks')}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2.5">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Alertas de Catástrofes Regionales</p>
                      <p className="text-[11px] text-slate-500">Riesgo de incendios (FWI) y vientos severos (&gt;45 km/h)</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.notifyCatastrophes} 
                      onChange={() => handleToggleSetting('notifyCatastrophes')}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2.5">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Sonido de Notificación</p>
                      <p className="text-[11px] text-slate-500">Emisión sonora armónica al recibir alerta crítica</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.soundEnabled} 
                      onChange={() => handleToggleSetting('soundEnabled')}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Prueba */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                  <Sparkles size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">Pruebas en Vivo de Service Worker</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Envía una notificación push real a través del Service Worker registrado en tu navegador para verificar sonido y acción.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleTriggerTest('plot')}
                    disabled={testSending === 'plot'}
                    className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                  >
                    <ShieldAlert size={14} />
                    <span>{testSending === 'plot' ? 'Emitiendo...' : 'Test Alerta Parcela'}</span>
                  </button>
                  <button
                    onClick={() => handleTriggerTest('task')}
                    disabled={testSending === 'task'}
                    className="p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                  >
                    <Clock size={14} />
                    <span>{testSending === 'task' ? 'Emitiendo...' : 'Test Recordatorio'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA: Lista de Notificaciones */
            <>
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Sin alertas pendientes</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Todas las parcelas y labores programadas se encuentran en rangos operativos normales.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => handleTriggerTest('plot')}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Disparar alerta de prueba para verificar
                    </button>
                  </div>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isCritical = notif.severity === 'critical';
                  const isWarning = notif.severity === 'warning';
                  
                  return (
                    <div 
                      key={notif.id}
                      className={`p-4 rounded-2xl border transition-all relative group ${
                        !notif.read 
                          ? isCritical 
                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-sm'
                            : isWarning
                              ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-sm'
                              : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60 shadow-sm'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCritical 
                            ? 'bg-rose-500 text-white' 
                            : isWarning 
                              ? 'bg-amber-500 text-slate-950' 
                              : 'bg-emerald-500 text-white'
                        }`}>
                          {notif.category === 'plot_critical' ? <ShieldAlert size={16} /> : <Clock size={16} />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {notif.category === 'plot_critical' ? 'Estado de Parcela' : 'Labor Agrícola'} • {formatTimestamp(notif.timestamp)}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>

                          <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                            {notif.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {notif.body}
                          </p>

                          <div className="pt-2 flex items-center justify-between">
                            <button
                              onClick={() => handleNavigate(notif.targetUrl, notif.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-black rounded-xl transition-all shadow-sm"
                            >
                              <span>{notif.actionLabel || 'Ver Detalles'}</span>
                              <ExternalLink size={12} />
                            </button>

                            <div className="flex items-center space-x-1">
                              {!notif.read && (
                                <button
                                  onClick={() => markNotificationAsRead(notif.id)}
                                  title="Marcar como leída"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteStoredNotification(notif.id)}
                                title="Eliminar"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Footer con Quick Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between text-xs">
          <button
            onClick={() => handleTriggerTest('plot')}
            className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold hover:underline"
          >
            <ShieldAlert size={14} />
            <span>Simular Helada</span>
          </button>

          <button
            onClick={() => handleTriggerTest('task')}
            className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-bold hover:underline"
          >
            <Clock size={14} />
            <span>Simular Labor</span>
          </button>

          <span className="text-[10px] font-mono text-slate-400">
            Web Push Protocol
          </span>
        </div>

      </div>
    </div>
  );
}
