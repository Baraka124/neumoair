// PulmoMetrics Pro Service Worker
const CACHE_NAME = 'pulmometrics-pro-v4';
const STATIC_CACHE = 'pulmometrics-static-v4';
const DYNAMIC_CACHE = 'pulmometrics-dynamic-v4';

// Static assets to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './icons.js',
  './manifest.json',
  './offline.html',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// Install event
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event with intelligent caching
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Handle different caching strategies
  if (url.origin === location.origin) {
    // Same origin: Cache with network fallback
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Update cache in background
          fetchAndCache(event.request);
          return cachedResponse;
        }
        return fetchAndCache(event.request);
      }).catch(() => {
        // If both cache and network fail, show offline page for HTML
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./offline.html');
        }
      })
    );
  } else {
    // External resources: Network with cache fallback
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request);
        })
    );
  }
});

// Helper function to fetch and cache
function fetchAndCache(request) {
  return fetch(request).then(networkResponse => {
    if (!networkResponse || networkResponse.status !== 200) {
      return networkResponse;
    }
    const responseToCache = networkResponse.clone();
    caches.open(DYNAMIC_CACHE).then(cache => {
      cache.put(request, responseToCache);
    });
    return networkResponse;
  });
}

// Handle push notifications (for future use)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New update available',
    icon: './icon.svg',
    badge: './icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'PulmoMetrics Pro', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

// Background sync (for future offline data sync)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-visits') {
    event.waitUntil(syncOfflineVisits());
  }
});

async function syncOfflineVisits() {
  // Implementation for syncing offline data
  console.log('[Service Worker] Syncing offline visits...');
}
