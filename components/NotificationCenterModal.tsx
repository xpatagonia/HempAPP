import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  BellRing, Check, CheckCheck, Trash2, X, 
  Clock, ShieldAlert, Sparkles, Settings,
  ExternalLink, CheckCircle2, Send, Radio,
  Mail, Zap, Search, Megaphone, MapPin, UserCheck, RotateCw
} from 'lucide-react';
import { 
  PushNotificationItem, 
  PushSettings,
  NotificationCategory,
  NotificationSeverity,
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
  triggerTestTaskReminder,
  dispatchPushNotification,
  evaluateCriticalPlotAlerts,
  evaluateUpcomingTasksReminders
} from '../src/services/pushNotificationService';
import { sendAgronomicAlertEmail } from '../src/services/emailNotificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'all' | 'compose' | 'plot_critical' | 'task_reminder' | 'settings';
}

const QUICK_PUSH_TEMPLATES = [
  {
    id: 'tpl-frost',
    label: '❄️ Alerta Helada',
    title: '❄️ Alerta de Helada Agronómica Inminente',
    body: 'Descenso térmico proyectado bajo 2°C en las próximas 6 horas. Activar protocolo de riego anti-helada y verificar cobertura en lote.',
    category: 'plot_critical' as NotificationCategory,
    severity: 'critical' as NotificationSeverity
  },
  {
    id: 'tpl-hydric',
    label: '💧 Déficit Hídrico',
    title: '💧 Alerta de Estrés Hídrico en Parcela',
    body: 'Humedad edáfica por debajo del umbral óptimo. Programar turno de riego suplementario y registrar caudal en monitoreo.',
    category: 'plot_critical' as NotificationCategory,
    severity: 'warning' as NotificationSeverity
  },
  {
    id: 'tpl-task',
    label: '🚜 Orden de Labor',
    title: '🚜 Orden de Labor Agrícola Prioritaria',
    body: 'Se requiere ejecución y homologación de labor cultural asignada en el lote. Verificar implementos, operario y condiciones de viento.',
    category: 'task_reminder' as NotificationCategory,
    severity: 'warning' as NotificationSeverity
  },
  {
    id: 'tpl-senasa',
    label: '🛡️ Carencia SENASA',
    title: '🛡️ Restricción Fitosanitaria / Carencia Activa',
    body: 'Lote con período de carencia legal vigente. Prohibido el corte o cosecha hasta el vencimiento del plazo sanitario.',
    category: 'plot_critical' as NotificationCategory,
    severity: 'critical' as NotificationSeverity
  },
  {
    id: 'tpl-coop',
    label: '📢 Comunicado Red',
    title: '📢 Comunicado Oficial Red Cooperativa HempC',
    body: 'Actualización de protocolo operativo de trazabilidad INASE/SENASA. Por favor sincronizar registros de campaña al cierre de la jornada.',
    category: 'system' as NotificationCategory,
    severity: 'info' as NotificationSeverity
  }
];

export default function NotificationCenterModal({ isOpen, onClose, initialTab }: NotificationCenterModalProps) {
  const navigate = useNavigate();
  const { plots, locations, tasks, usersList, clients, currentUser } = useAppContext();
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [settings, setSettings] = useState<PushSettings>(getPushSettings());
  const [activeTab, setActiveTab] = useState<'all' | 'compose' | 'plot_critical' | 'task_reminder' | 'settings'>(initialTab || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [testSending, setTestSending] = useState<'plot' | 'task' | 'batch' | null>(null);
  const [swActive, setSwActive] = useState<boolean>(false);

  // Estado del Emisor Manual Push ("Emitir Push")
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushSeverity, setPushSeverity] = useState<NotificationSeverity>('critical');
  const [pushCategory, setPushCategory] = useState<NotificationCategory>('plot_critical');
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState<string>('');
  const [alsoSendEmail, setAlsoSendEmail] = useState<boolean>(false);
  const [isDispatchingManual, setIsDispatchingManual] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const loadData = () => {
    setNotifications(getStoredNotifications());
    setPermission(getNotificationPermissionStatus());
    setSettings(getPushSettings());
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      setSwActive(!!navigator.serviceWorker.controller);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    const handleOpenComposer = (ev: Event) => {
      const customEv = ev as CustomEvent;
      setActiveTab('compose');
      if (customEv.detail) {
        if (customEv.detail.title) setPushTitle(customEv.detail.title);
        if (customEv.detail.body) setPushBody(customEv.detail.body);
        if (customEv.detail.plotId) setSelectedPlotId(customEv.detail.plotId);
        if (customEv.detail.severity) setPushSeverity(customEv.detail.severity);
      }
    };

    window.addEventListener('nucleus:push-notification-change', handleUpdate);
    window.addEventListener('nucleus:open-push-composer', handleOpenComposer);
    return () => {
      window.removeEventListener('nucleus:push-notification-change', handleUpdate);
      window.removeEventListener('nucleus:open-push-composer', handleOpenComposer);
    };
  }, [isOpen]);

  // Auto-seleccionar email del productor cuando se elige una parcela
  useEffect(() => {
    if (!selectedPlotId) {
      setSelectedRecipientEmail(currentUser?.email || 'gaston.barea.moreno@gmail.com');
      return;
    }
    const plot = plots.find(p => p.id === selectedPlotId);
    const loc = locations.find(l => l.id === plot?.locationId);
    const client = clients.find(c => c.id === loc?.clientId);
    const assignedUser = usersList.find(u => u.assignedPlotIds?.includes(selectedPlotId) || (loc?.clientId && u.clientId === loc.clientId));
    setSelectedRecipientEmail(client?.email || assignedUser?.email || currentUser?.email || 'gaston.barea.moreno@gmail.com');
  }, [selectedPlotId, plots, locations, clients, usersList, currentUser]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      if (activeTab === 'plot_critical' && item.category !== 'plot_critical') return false;
      if (activeTab === 'task_reminder' && item.category !== 'task_reminder') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q) ||
          (item.plotName && item.plotName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  if (!isOpen) return null;

  const showTempBanner = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    const granted = await requestPushPermission();
    setPermission(getNotificationPermissionStatus());
    setIsRequestingPermission(false);
    if (granted) {
      const targetPlot = plots[0];
      await triggerTestPlotAlert(targetPlot?.name, targetPlot?.id);
      showTempBanner('Permisos Push activados en este dispositivo.');
    }
  };

  const handleApplyTemplate = (tpl: typeof QUICK_PUSH_TEMPLATES[0]) => {
    const plotObj = plots.find(p => p.id === selectedPlotId);
    const suffix = plotObj ? ` — ${plotObj.name}` : '';
    setPushTitle(`${tpl.title}${suffix}`);
    setPushBody(tpl.body);
    setPushCategory(tpl.category);
    setPushSeverity(tpl.severity);
  };

  const handleManualPushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setIsDispatchingManual(true);
    try {
      const targetPlot = plots.find(p => p.id === selectedPlotId);
      const targetUrl = targetPlot
        ? `/plots/${targetPlot.id}`
        : pushCategory === 'task_reminder'
        ? '/tasks'
        : '/';

      await dispatchPushNotification({
        title: pushTitle.trim(),
        body: pushBody.trim(),
        category: pushCategory,
        severity: pushSeverity,
        plotId: targetPlot?.id,
        plotName: targetPlot?.name,
        targetUrl,
        actionLabel: targetPlot ? `Abrir ${targetPlot.name}` : 'Ver en Plataforma'
      });

      if (alsoSendEmail && selectedRecipientEmail.trim()) {
        const sevMap: Record<NotificationSeverity, 'Crítica' | 'Advertencia' | 'Informativa'> = {
          critical: 'Crítica',
          warning: 'Advertencia',
          info: 'Informativa',
          success: 'Informativa'
        };
        await sendAgronomicAlertEmail({
          toEmail: selectedRecipientEmail.trim(),
          toName: targetPlot?.ownerName || 'Productor Asociado Red HempC',
          alertTitle: pushTitle.trim(),
          plotName: targetPlot?.name || 'Red Cooperativa General',
          alertDetails: pushBody.trim(),
          severity: sevMap[pushSeverity],
          actionUrl: `${window.location.origin}/#${targetUrl}`
        });
      }

      loadData();
      showTempBanner(
        alsoSendEmail
          ? `Push emitido en vivo + Email enviado a ${selectedRecipientEmail}`
          : 'Notificación Push emitida inmediatamente a los dispositivos activos.'
      );
      setPushTitle('');
      setPushBody('');
    } finally {
      setIsDispatchingManual(false);
    }
  };

  const handleBatchSyncPush = async () => {
    setTestSending('batch');
    const critPlots = await evaluateCriticalPlotAlerts(plots, locations, { force: true });
    const critTasks = await evaluateUpcomingTasksReminders(tasks, { force: true });
    const total = critPlots.length + critTasks.length;
    if (total === 0) {
      const fallbackPlot = plots[0];
      await triggerTestPlotAlert(fallbackPlot?.name, fallbackPlot?.id);
    }
    setTimeout(() => {
      setTestSending(null);
      loadData();
      showTempBanner(`Barrido completado: ${Math.max(1, total)} alerta(s) push despachadas.`);
    }, 350);
  };

  const handleTriggerTest = async (type: 'plot' | 'task') => {
    setTestSending(type);
    if (type === 'plot') {
      const targetPlot = plots.find(p => p.status === 'Pausada') || plots[0];
      await triggerTestPlotAlert(targetPlot?.name, targetPlot?.id);
    } else {
      const targetTask = tasks.find(t => t.status === 'Pendiente') || tasks[0];
      await triggerTestTaskReminder(targetTask?.title, targetTask?.id);
    }
    setTimeout(() => {
      setTestSending(null);
      loadData();
      showTempBanner('Alerta Push de prueba emitida.');
    }, 300);
  };

  const handleRePushItem = async (e: React.MouseEvent, notif: PushNotificationItem) => {
    e.stopPropagation();
    await dispatchPushNotification({
      title: notif.title,
      body: notif.body,
      category: notif.category,
      severity: notif.severity,
      plotId: notif.plotId,
      plotName: notif.plotName,
      taskId: notif.taskId,
      taskTitle: notif.taskTitle,
      targetUrl: notif.targetUrl,
      actionLabel: notif.actionLabel
    });
    loadData();
    showTempBanner(`Re-enviado vía Push: ${notif.title}`);
  };

  const handleNavigate = (item: PushNotificationItem) => {
    markNotificationAsRead(item.id);
    onClose();

    let target = item.targetUrl;
    if (item.category === 'plot_critical') {
      if (item.plotId && plots.some(p => p.id.toLowerCase() === item.plotId?.toLowerCase())) {
        target = `/plots/${item.plotId}`;
      } else if (plots.length > 0) {
        target = `/plots/${plots[0].id}`;
      }
    } else if (item.category === 'task_reminder') {
      target = '/tasks';
    }

    if (target.startsWith('/')) {
      navigate(target);
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
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 z-10">
        
        {/* Header Compacto */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DDDB00]/20 border border-[#DDDB00]/40 flex items-center justify-center text-[#DDDB00]">
              <BellRing size={18} className={unreadCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-tight">Centro de Comando Push & Alertas</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-rose-500 text-white rounded-md">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className={`w-2 h-2 rounded-full ${permission === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{permission === 'granted' ? 'Canal Web Push Activo' : 'Permiso Push Pendiente'}</span>
                <span>•</span>
                <span className="font-mono text-[10px]">SW {swActive ? 'Online' : 'Listo'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {permission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Radio size={12} />
                <span>{isRequestingPermission ? '...' : 'Activar'}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab(activeTab === 'compose' ? 'all' : 'compose')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-[#DDDB00] text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Send size={12} />
              <span>Emitir Push</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Banner de Confirmación Instantánea */}
        {feedbackBanner && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{feedbackBanner.text}</span>
            </div>
            <button onClick={() => setFeedbackBanner(null)} className="text-white/80 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Barra de Navegación por Pestañas + Acciones Rápidas */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              Buzón ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
            >
              <Megaphone size={12} />
              <span>Push Manual</span>
            </button>
            <button
              onClick={() => setActiveTab('plot_critical')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'plot_critical'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert size={12} />
              <span>Lotes</span>
            </button>
            <button
              onClick={() => setActiveTab('task_reminder')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'task_reminder'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <Clock size={12} />
              <span>Labores</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <Settings size={12} />
            </button>
          </div>

          {activeTab !== 'settings' && activeTab !== 'compose' && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleBatchSyncPush}
                disabled={testSending === 'batch'}
                title="Emitir Push de todas las alertas críticas activas ahora"
                className="px-2 py-1 text-[10px] font-black uppercase bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <Zap size={11} />
                <span>{testSending === 'batch' ? 'Enviando...' : 'Barrido Push'}</span>
              </button>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllNotificationsAsRead}
                    title="Marcar todas como leídas"
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition cursor-pointer"
                  >
                    <CheckCheck size={14} />
                  </button>
                  <button
                    onClick={clearAllStoredNotifications}
                    title="Limpiar bandeja"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {activeTab === 'compose' ? (
            /* EMISOR DE PUSH MANUAL SIN SCROLL INNECESARIO */
            <form onSubmit={handleManualPushSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Plantillas Rápidas (1-Clic)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    Autocompleta mensaje
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PUSH_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Parcela / Lote Objetivo
                  </label>
                  <select
                    value={selectedPlotId}
                    onChange={e => setSelectedPlotId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">🌐 Difusión General (Toda la Red)</option>
                    {plots.map(p => (
                      <option key={p.id} value={p.id}>
                        📍 {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Prioridad / Severidad
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { id: 'critical', label: 'Crítica', cls: 'bg-rose-600 text-white border-rose-600' },
                      { id: 'warning', label: 'Alerta', cls: 'bg-amber-500 text-slate-950 border-amber-500' },
                      { id: 'info', label: 'Info', cls: 'bg-sky-600 text-white border-sky-600' }
                    ] as const).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPushSeverity(s.id)}
                        className={`py-2 rounded-xl text-[11px] font-black uppercase border transition cursor-pointer ${
                          pushSeverity === s.id
                            ? s.cls
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Título de la Notificación Push *
                </label>
                <input
                  type="text"
                  required
                  value={pushTitle}
                  onChange={e => setPushTitle(e.target.value)}
                  placeholder="Ej: ❄️ Alerta de Helada en Lote Alfa - Activar Riego"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Instrucción / Mensaje Operativo *
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">{pushBody.length}/240</span>
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={240}
                  value={pushBody}
                  onChange={e => setPushBody(e.target.value)}
                  placeholder="Escriba la directiva agronómica o recordatorio para disparar por Push..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Opción de Despacho Dual Push + Email */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Enviar copia simultánea por Correo Electrónico
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={alsoSendEmail}
                    onChange={e => setAlsoSendEmail(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>

                {alsoSendEmail && (
                  <div className="pt-1">
                    <input
                      type="email"
                      value={selectedRecipientEmail}
                      onChange={e => setSelectedRecipientEmail(e.target.value)}
                      placeholder="destinatario@campo.com.ar"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Volver al Buzón
                </button>
                <button
                  type="submit"
                  disabled={isDispatchingManual || !pushTitle.trim() || !pushBody.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Send size={14} />
                  <span>{isDispatchingManual ? 'Emitiendo...' : alsoSendEmail ? 'Emitir Push + Email' : 'Emitir Push Ahora'}</span>
                </button>
              </div>
            </form>
          ) : activeTab === 'settings' ? (
            /* CONFIGURACIÓN COMPACTA */
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Preferencias de Canal Push</h3>
                
                {[
                  { key: 'notifyCriticalPlots', title: 'Alertas Críticas de Parcelas', desc: 'Heladas, déficit hídrico y bloqueos SENASA' },
                  { key: 'notifyUpcomingTasks', title: 'Vencimiento de Labores Agrícolas', desc: 'Avisos 24h y 48h antes de cada labor' },
                  { key: 'notifyCatastrophes', title: 'Riesgos Climáticos Regionales', desc: 'Índice FWI de incendio y vientos severos' },
                  { key: 'soundEnabled', title: 'Alerta Sonora en Campo', desc: 'Tono acústico al recibir alertas críticas' }
                ].map(cfg => (
                  <label key={cfg.key} className="flex items-center justify-between py-1.5 border-b last:border-b-0 border-slate-200/70 dark:border-slate-800 cursor-pointer">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{cfg.title}</p>
                      <p className="text-[11px] text-slate-500">{cfg.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[cfg.key as keyof PushSettings])}
                      onChange={() => handleToggleSetting(cfg.key as keyof PushSettings)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>
                ))}
              </div>

              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <Sparkles size={14} />
                  <span className="text-[11px] font-black uppercase">Diagnóstico Rápido Service Worker</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTriggerTest('plot')}
                    disabled={testSending === 'plot'}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ShieldAlert size={13} />
                    <span>{testSending === 'plot' ? 'Enviando...' : 'Probar Push Lote'}</span>
                  </button>
                  <button
                    onClick={() => handleTriggerTest('task')}
                    disabled={testSending === 'task'}
                    className="p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Clock size={13} />
                    <span>{testSending === 'task' ? 'Enviando...' : 'Probar Push Labor'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* BUZÓN DE NOTIFICACIONES DE ALTA DENSIDAD (SIN EXCESO DE SCROLL) */
            <div className="space-y-2.5">
              {/* Buscador Rápido */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filtrar alertas por lote, labor o palabra clave..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {filteredNotifications.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-2">
                  <div className="w-11 h-11 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <CheckCircle2 size={22} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">Bandeja al día</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    No hay notificaciones pendientes para este filtro. Puedes emitir un Push manual en un clic.
                  </p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Redactar Push Manual</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {filteredNotifications.map(notif => {
                    const isCritical = notif.severity === 'critical';
                    const isWarning = notif.severity === 'warning';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNavigate(notif)}
                        className={`p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-start gap-2.5 ${
                          !notif.read ? 'bg-slate-50/80 dark:bg-slate-800/30' : 'opacity-80'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isCritical
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {notif.category === 'plot_critical' ? <ShieldAlert size={14} /> : <Clock size={14} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {notif.title}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono text-slate-400">
                                {formatTimestamp(notif.timestamp)}
                              </span>
                              {!notif.read && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                            {notif.body}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline">
                              <span>{notif.actionLabel || 'Abrir módulo'}</span>
                              <ExternalLink size={10} />
                            </span>

                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={e => handleRePushItem(e, notif)}
                                title="Re-emitir esta notificación vía Push ahora"
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Send size={10} />
                                <span>Push</span>
                              </button>
                              {!notif.read && (
                                <button
                                  onClick={() => markNotificationAsRead(notif.id)}
                                  title="Marcar leída"
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded transition cursor-pointer"
                                >
                                  <Check size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteStoredNotification(notif.id)}
                                title="Eliminar"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Compacto */}
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTriggerTest('plot')}
              className="text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert size={12} />
              <span>Simular Helada</span>
            </button>
            <button
              onClick={() => handleTriggerTest('task')}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Clock size={12} />
              <span>Simular Labor</span>
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            HempC Push Engine v2.4
          </span>
        </div>
      </div>
    </div>
  );
}
