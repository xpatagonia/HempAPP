// Service Worker para HempC • Red Cooperativa Nucleus
// Soporte de Notificaciones Push & Alertas Agronómicas en Segundo Plano

const CACHE_NAME = 'hempc-nucleus-v7.17.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Ciclo de vida: Instalación inmediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // En caso de fallas de red durante dev, continuar sin bloquear
      });
    })
  );
});

// Ciclo de vida: Activación y toma de control de clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// EVENTO PRINCIPAL: Notificaciones Push (Web Push Protocol)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'HempC • Alerta Agronómica',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'HempC • Alerta Agro';
  const options = {
    body: data.body || 'Alerta técnica de parcela o labor pendiente',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || `hempc-${Date.now()}`,
    data: data.data || { url: '/' },
    vibrate: data.vibrate || [300, 100, 300, 100, 300],
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
    actions: data.actions || [
      { action: 'view', title: '🔍 Ver Detalles' },
      { action: 'dismiss', title: '✕ Descartar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Interacción del usuario al hacer clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;

  if (action === 'dismiss') {
    return;
  }

  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  
  // Normalizar ruta para HashRouter: siempre debe resolver a /#/ruta
  let cleanPath = rawUrl;
  if (cleanPath.startsWith('/#')) {
    cleanPath = cleanPath.substring(2);
  } else if (cleanPath.startsWith('#')) {
    cleanPath = cleanPath.substring(1);
  }
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  const hashTarget = `/#${cleanPath}`;
  const fullTargetUrl = new URL(hashTarget, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // 1. Si ya hay una pestaña abierta del sistema, enfocar y navegar via postMessage
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          try {
            await client.focus();
            client.postMessage({
              type: 'NAVIGATE',
              path: cleanPath,
              hashTarget: hashTarget
            });
            return;
          } catch (e) {
            console.warn('[SW] Error al enfocar cliente:', e);
          }
        }
      }
      // 2. Si no hay pestañas abiertas, abrir una nueva con el hash correcto
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});

// Comunicación Cliente <-> Service Worker
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Emisión directa de notificación desde el contexto de la aplicación
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || 'HempC • Alerta Agronómica';
    const options = {
      body: payload.body || 'Notificación del sistema',
      icon: payload.icon || '/icon.svg',
      badge: payload.badge || '/icon.svg',
      tag: payload.tag || `hempc-local-${Date.now()}`,
      data: payload.data || { url: '/' },
      vibrate: payload.vibrate || [250, 100, 250],
      requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : true,
      actions: payload.actions || [
        { action: 'view', title: '🔍 Ver Detalles' },
        { action: 'dismiss', title: '✕ Descartar' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }

  // Comprobación de estado
  if (event.data.type === 'PING') {
    if (event.source && 'postMessage' in event.source) {
      event.source.postMessage({ type: 'PONG', active: true, version: '1.0.0' });
    }
  }
});
