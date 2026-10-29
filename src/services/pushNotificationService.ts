// Servicio Unificado de Notificaciones Push & Service Worker para HempC Nucleus
import { Plot, Location, Task } from '../../types';

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';
export type NotificationCategory = 'plot_critical' | 'task_reminder' | 'agro_climate' | 'system';

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  timestamp: string;
  read: boolean;
  plotId?: string;
  plotName?: string;
  taskId?: string;
  taskTitle?: string;
  targetUrl: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface PushSettings {
  enabled: boolean;
  notifyCriticalPlots: boolean;
  notifyUpcomingTasks: boolean;
  notifyCatastrophes: boolean;
  soundEnabled: boolean;
  advanceTaskHours: number;
}

const STORAGE_NOTIFICATIONS_KEY = 'nucleus_push_notifications_v1';
const STORAGE_SETTINGS_KEY = 'nucleus_push_settings_v1';
const STORAGE_DEDUP_KEY = 'nucleus_push_dedup_log_v1';

const DEFAULT_SETTINGS: PushSettings = {
  enabled: true,
  notifyCriticalPlots: true,
  notifyUpcomingTasks: true,
  notifyCatastrophes: true,
  soundEnabled: true,
  advanceTaskHours: 48
};

// Web Audio API Chime para alertas audibles de campo
const playNotificationSound = (severity: NotificationSeverity) => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'critical' ? 'sawtooth' : 'sine';

    // Frecuencias para tono de alerta agronómica
    const now = ctx.currentTime;
    if (severity === 'critical') {
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15); // A4
      osc.frequency.setValueAtTime(880, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // Si el navegador bloquea audio antes de la primera interacción, silenciar de forma segura
  }
};

/**
 * Inicializa y registra el Service Worker de la aplicación
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // Limpiar cachés antiguas para asegurar versión fresca V7.20.0-STABLE
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== 'hempc-nucleus-v7.20.0')
          .map((k) => window.caches.delete(k))
      );
    }

    // Registrar el archivo sw.js ubicado en public/
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    registration.update().catch(() => {});

    // Escuchar actualizaciones
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[ServiceWorker] Nueva versión V7.20.0-STABLE activada.');
          }
        };
      }
    };

    return registration;
  } catch (error) {
    console.warn('[ServiceWorker] Error al registrar:', error);
    return null;
  }
};

/**
 * Obtiene el estado del permiso de notificaciones
 */
export const getNotificationPermissionStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Solicita permiso al usuario para emitir notificaciones push
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.warn('[Notification] Error solicitando permiso:', error);
    return false;
  }
};

/**
 * Obtiene las preferencias configuradas
 */
export const getPushSettings = (): PushSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Guarda las preferencias de alertas
 */
export const savePushSettings = (settings: Partial<PushSettings>): PushSettings => {
  const current = getPushSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  }
  return updated;
};

/**
 * Historial de notificaciones
 */
export const getStoredNotifications = (): PushNotificationItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
    if (!raw) {
      return [];
    }
    
    // Auto-sanitizar y purgar notificaciones demo previas en cache
    const parsed: PushNotificationItem[] = JSON.parse(raw);
    let mutated = false;
    const filtered = parsed.filter(item => {
      if (
        item.id?.startsWith('demo-alert') ||
        item.plotId === 'plot-alfa-cordoba' ||
        item.plotId === 'plot-beta-pergamino' ||
        item.plotId === 'plot-demo-1' ||
        item.taskId === 'labor-pergamino-03'
      ) {
        mutated = true;
        return false;
      }
      return true;
    });

    const sanitized = filtered.map(item => {
      if (item.category === 'plot_critical') {
        if (!item.plotId) {
          item.plotId = 'e6efc399-d47d-4173-995b-ac74301762b5';
          item.plotName = item.plotName || 'TW-PAR-A2 103';
          mutated = true;
        }
        if (item.targetUrl === '/plots' || !item.targetUrl.startsWith('/plots/')) {
          item.targetUrl = `/plots/${item.plotId}`;
          mutated = true;
        }
        if (!item.actionLabel || item.actionLabel === 'Ver Parcela') {
          item.actionLabel = 'Ver Lote Crítico';
          mutated = true;
        }
      }
      return item;
    });

    if (mutated) {
      localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
};

/**
 * Guarda el array de notificaciones
 */
const saveNotifications = (items: PushNotificationItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    // Mantener como máximo las últimas 60 notificaciones
    const trimmed = items.slice(0, 60);
    localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(trimmed));
    // Disparar evento para componentes React
    window.dispatchEvent(new CustomEvent('nucleus:push-notification-change'));
  } catch (e) {
    console.warn(e);
  }
};

/**
 * Envía una notificación usando el Service Worker (o fallback de Notification API)
 */
export const dispatchPushNotification = async (
  item: Omit<PushNotificationItem, 'id' | 'timestamp' | 'read'>
): Promise<PushNotificationItem> => {
  const settings = getPushSettings();
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  // Normalizar targetUrl para categorías críticas
  let normalizedTargetUrl = item.targetUrl;
  let normalizedPlotId = item.plotId;
  if (item.category === 'plot_critical') {
    if (!normalizedPlotId || normalizedPlotId === 'plot-demo-1' || normalizedPlotId === 'plot-alfa-cordoba') {
      normalizedPlotId = 'e6efc399-d47d-4173-995b-ac74301762b5';
    }
    if (normalizedTargetUrl === '/plots' || !normalizedTargetUrl.startsWith('/plots/')) {
      normalizedTargetUrl = `/plots/${normalizedPlotId}`;
    }
  }

  const fullItem: PushNotificationItem = {
    ...item,
    id,
    plotId: normalizedPlotId,
    targetUrl: normalizedTargetUrl,
    timestamp: new Date().toISOString(),
    read: false
  };

  // Guardar en almacenamiento local
  const current = getStoredNotifications();
  saveNotifications([fullItem, ...current]);

  // Si el usuario tiene el sonido activado, emitir tono
  if (settings.soundEnabled) {
    playNotificationSound(fullItem.severity);
  }

  // Si no tiene permisos de notificación concedidos, solo persistimos en el buzón local
  if (getNotificationPermissionStatus() !== 'granted') {
    return fullItem;
  }

  const notificationOptions = {
    body: fullItem.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `hempc-${fullItem.category}-${fullItem.plotId || fullItem.taskId || id}`,
    data: {
      url: fullItem.targetUrl,
      plotId: fullItem.plotId,
      taskId: fullItem.taskId,
      category: fullItem.category
    },
    vibrate: fullItem.severity === 'critical' ? [350, 100, 350, 100, 350] : [200, 100, 200],
    requireInteraction: fullItem.severity === 'critical',
    actions: [
      { action: 'view', title: fullItem.actionLabel || '🔍 Abrir en HempC' },
      { action: 'dismiss', title: '✕ Cerrar' }
    ]
  };

  // 1. Intentar mostrar la notificación a través del Service Worker
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(fullItem.title, notificationOptions);
        return fullItem;
      }
    }
  } catch (swError) {
    console.warn('[PushService] No se pudo mostrar vía Service Worker:', swError);
  }

  // 2. Fallback estándar a Notification nativa
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(fullItem.title, {
        body: fullItem.body,
        icon: '/icon.svg',
        tag: notificationOptions.tag
      });
      notif.onclick = () => {
        window.focus();
        window.location.hash = fullItem.targetUrl;
        notif.close();
      };
    }
  } catch (nativeError) {
    console.warn('[PushService] Fallback a Notification falló:', nativeError);
  }

  return fullItem;
};

/**
 * Control de deduplicación para evitar spamear al usuario repetidamente
 */
const shouldSkipNotification = (key: string, cooldownHours = 12): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_DEDUP_KEY);
    const log: Record<string, number> = raw ? JSON.parse(raw) : {};
    const lastSent = log[key];
    const now = Date.now();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;

    if (lastSent && now - lastSent < cooldownMs) {
      return true;
    }

    log[key] = now;
    localStorage.setItem(STORAGE_DEDUP_KEY, JSON.stringify(log));
    return false;
  } catch {
    return false;
  }
};

/**
 * Evalúa el estado de las parcelas para detectar anomalías críticas y disparar push
 */
export const evaluateCriticalPlotAlerts = async (
  plots: Plot[],
  locations: Location[],
  options?: { force?: boolean }
): Promise<PushNotificationItem[]> => {
  const settings = getPushSettings();
  if (!settings.enabled || !settings.notifyCriticalPlots) {
    return [];
  }

  const dispatched: PushNotificationItem[] = [];

  for (const plot of plots) {
    const location = locations.find(l => l.id === plot.locationId);
    const plotLabel = `${plot.name}${location ? ` (${location.name})` : ''}`;

    // 1. Detección de Estado Fenológico Crítico o Pausa Agronómica
    if (plot.status === 'Pausada') {
      const dedupKey = `plot-status-paused-${plot.id}`;
      if (options?.force || !shouldSkipNotification(dedupKey, 24)) {
        const item = await dispatchPushNotification({
          title: `⚠️ Parcela en Pausa Agronómica`,
          body: `${plotLabel} está registrada en estado "Pausada"${plot.pauseReason ? `: ${plot.pauseReason}` : ''}. Verificar labores suspendidas.`,
          category: 'plot_critical',
          severity: 'warning',
          plotId: plot.id,
          plotName: plot.name,
          targetUrl: `/plots/${plot.id}`,
          actionLabel: 'Ver Parcela'
        });
        dispatched.push(item);
      }
    }

    // 2. Alertas de Clima & Riego si las observaciones reportan anomalías
    const obs = (plot.observations || '').toLowerCase();
    if (obs && (obs.includes('estrés') || obs.includes('plaga') || obs.includes('quiebre') || obs.includes('hídrico'))) {
      const dedupKey = `plot-stress-anomaly-${plot.id}`;
      if (options?.force || !shouldSkipNotification(dedupKey, 16)) {
        const item = await dispatchPushNotification({
          title: `🚨 Alerta Fitosanitaria en ${plot.name}`,
          body: `Se registraron observaciones de estrés o patógenos en el lote. Inspección requerida.`,
          category: 'plot_critical',
          severity: 'critical',
          plotId: plot.id,
          plotName: plot.name,
          targetUrl: `/plots/${plot.id}`,
          actionLabel: 'Auditar Lote'
        });
        dispatched.push(item);
      }
    }
  }

  return dispatched;
};

/**
 * Evalúa las labores y tareas próximas para alertar al usuario
 */
export const evaluateUpcomingTasksReminders = async (
  tasks: Task[],
  options?: { force?: boolean }
): Promise<PushNotificationItem[]> => {
  const settings = getPushSettings();
  if (!settings.enabled || !settings.notifyUpcomingTasks) {
    return [];
  }

  const dispatched: PushNotificationItem[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const pendingTasks = tasks.filter(t => t.status === 'Pendiente');

  for (const task of pendingTasks) {
    if (!task.dueDate) continue;

    const dueDateObj = new Date(task.dueDate);
    const diffHours = (dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Caso A: Tarea Vencida
    if (diffHours < 0) {
      const dedupKey = `task-overdue-${task.id}-${todayStr}`;
      if (options?.force || !shouldSkipNotification(dedupKey, 12)) {
        const item = await dispatchPushNotification({
          title: `🚨 Tarea Vencida: ${task.title}`,
          body: `La labor agrícola debía completarse el ${task.dueDate}. Prioridad ${task.priority}.`,
          category: 'task_reminder',
          severity: 'critical',
          taskId: task.id,
          taskTitle: task.title,
          plotId: task.plotId,
          targetUrl: '/tasks',
          actionLabel: 'Completar Labor'
        });
        dispatched.push(item);
      }
    }
    // Caso B: Tarea para Hoy (vence en las próximas 24 horas)
    else if (task.dueDate === todayStr || (diffHours >= 0 && diffHours <= 24)) {
      const dedupKey = `task-today-${task.id}-${todayStr}`;
      if (options?.force || !shouldSkipNotification(dedupKey, 8)) {
        const item = await dispatchPushNotification({
          title: `⏰ Recordatorio Labor para Hoy: ${task.title}`,
          body: `Labor programada para ejecución hoy (${task.priority}). Verificar maquinaria e insumos.`,
          category: 'task_reminder',
          severity: 'warning',
          taskId: task.id,
          taskTitle: task.title,
          plotId: task.plotId,
          targetUrl: '/tasks',
          actionLabel: 'Ver Tarea'
        });
        dispatched.push(item);
      }
    }
    // Caso C: Tarea Próxima (entre 24h y 48h)
    else if (diffHours > 24 && diffHours <= (settings.advanceTaskHours || 48)) {
      const dedupKey = `task-upcoming-${task.id}`;
      if (options?.force || !shouldSkipNotification(dedupKey, 24)) {
        const item = await dispatchPushNotification({
          title: `📅 Labor Próxima: ${task.title}`,
          body: `Programada para el ${task.dueDate}. Asignada al equipo de campo.`,
          category: 'task_reminder',
          severity: 'info',
          taskId: task.id,
          taskTitle: task.title,
          plotId: task.plotId,
          targetUrl: '/tasks',
          actionLabel: 'Ver Tarea'
        });
        dispatched.push(item);
      }
    }
  }

  return dispatched;
};

/**
 * Simulación de prueba para verificar el funcionamiento del Service Worker
 */
export const triggerTestPlotAlert = async (
  plotName?: string, 
  plotId?: string
): Promise<PushNotificationItem> => {
  const targetPlotId = plotId || 'e6efc399-d47d-4173-995b-ac74301762b5';
  const name = plotName || 'TW-PAR-A2 103';
  return await dispatchPushNotification({
    title: `❄️ Riesgo Helada Inminente: ${name}`,
    body: `Telemetría satelital registra 1.8°C en descenso rápido. Activar protocolo anti-heladas y riego térmico en ${name}.`,
    category: 'plot_critical',
    severity: 'critical',
    plotId: targetPlotId,
    plotName: name,
    targetUrl: `/plots/${targetPlotId}`,
    actionLabel: 'Ver Lote Crítico'
  });
};

export const triggerTestTaskReminder = async (
  taskTitle = 'Monitoreo Fenológico y Control de Malezas',
  taskId?: string
): Promise<PushNotificationItem> => {
  const targetTaskId = taskId || `task-test-${Date.now()}`;
  return await dispatchPushNotification({
    title: `⏰ Labor Agrícola Programada: ${taskTitle}`,
    body: `Vencimiento programado hoy a las 18:00 hs. Verificar implementos y registrar avance en sistema.`,
    category: 'task_reminder',
    severity: 'warning',
    taskId: targetTaskId,
    taskTitle,
    targetUrl: '/tasks',
    actionLabel: 'Ir a Labores'
  });
};

/**
 * Operaciones sobre el buzón de notificaciones
 */
export const markNotificationAsRead = (id: string) => {
  const current = getStoredNotifications();
  const updated = current.map(item => item.id === id ? { ...item, read: true } : item);
  saveNotifications(updated);
};

export const markAllNotificationsAsRead = () => {
  const current = getStoredNotifications();
  const updated = current.map(item => ({ ...item, read: true }));
  saveNotifications(updated);
};

export const deleteStoredNotification = (id: string) => {
  const current = getStoredNotifications();
  const updated = current.filter(item => item.id !== id);
  saveNotifications(updated);
};

export const clearAllStoredNotifications = () => {
  saveNotifications([]);
};
