/**
 * Service Worker para Corte Rápido - PWA
 * Cache-first para assets estáticos, network-first para API
 * Versão: incrementar a cada deploy para forçar atualização
 */

const CACHE_NAME = 'corte-rapido-v1';
const STATIC_CACHE = 'corte-rapido-static-v1';
const DYNAMIC_CACHE = 'corte-rapido-dynamic-v1';
const API_CACHE = 'corte-rapido-api-v1';

// Assets estáticos para cache imediato
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Estratégias de cache
const CACHE_STRATEGIES = {
  // Cache first - para assets imutáveis (JS, CSS, imagens)
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response('Offline', { status: 503 });
    }
  },

  // Network first - para API e conteúdo dinâmico
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response(JSON.stringify({ erro: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  // Stale while revalidate - para HTML e conteúdo que muda pouco
  staleWhileRevalidate: async (request) => {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then((response) => {
      if (response.ok) {
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => cached);

    return cached || fetchPromise;
  },
};

// Install - cache assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate - limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - roteamento de estratégias
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-HTTP
  if (!url.protocol.startsWith('http')) return;

  // API calls - network first
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api.')) {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }

  // Assets estáticos (JS, CSS, imagens, fonts) - cache first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // HTML / navegação - stale while revalidate
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
    return;
  }

  // Default - network first
  event.respondWith(CACHE_STRATEGIES.networkFirst(request));
});

// Background sync para ações offline (futuro)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-agendamentos') {
    event.waitUntil(syncAgendamentos());
  }
  if (event.tag === 'sync-avaliacoes') {
    event.waitUntil(syncAvaliacoes());
  }
});

async function syncAgendamentos() {
  // TODO: implementar sincronização de agendamentos offline
  console.log('[SW] Sync agendamentos pendentes');
}

async function syncAvaliacoes() {
  // TODO: implementar sincronização de avaliações offline
  console.log('[SW] Sync avaliações pendentes');
}

// Push notifications (futuro)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.texto || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url ? { url: data.url } : {},
    actions: data.acoes || [],
    requireInteraction: data.tipo === 'agendamento',
  };

  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Corte Rápido', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'abrir' && event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  } else if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

// Message from client (skip waiting, etc.)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'getVersion') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});