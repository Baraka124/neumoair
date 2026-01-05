// Spirolite - Service Worker v1.0
// Cache name with version for updates
const CACHE_NAME = 'spirolite-cache-v1.0.0';

// Files to cache on install
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icon.svg',
  './icon2.svg',
  './icons.js',
  // Add these if you have them or will create them:
  // './icon-192.png',
  // './icon-512.png',
  
  // External CDN resources
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For API requests, use network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({
            error: 'You are offline. Please check your connection.',
            offline: true
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone the response to cache it
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] Network failed, serving offline page');
            
            // For HTML requests, return offline page
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match('./offline.html');
            }
            
            // For other requests, return appropriate offline response
            if (event.request.url.includes('.css')) {
              return new Response('/* Offline - styles not available */', {
                headers: { 'Content-Type': 'text/css' }
              });
            }
            
            if (event.request.url.includes('.js')) {
              return new Response('// Offline - script not available', {
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
            
            // Default offline response
            return new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-visits') {
    console.log('[Service Worker] Background sync: sync-visits');
    event.waitUntil(syncVisits());
  }
});

async function syncVisits() {
  // This would sync offline data when connection is restored
  // You can implement this based on your app's data storage
  console.log('[Service Worker] Syncing offline data...');
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  
  const title = 'Spirolite';
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-data') {
    console.log('[Service Worker] Periodic sync: update-data');
    event.waitUntil(updateCachedData());
  }
});

async function updateCachedData() {
  // Update cached resources in the background
  try {
    const cache = await caches.open(CACHE_NAME);
    
    for (const url of STATIC_CACHE_URLS) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.log(`[Service Worker] Failed to update ${url}:`, error);
      }
    }
    
    console.log('[Service Worker] Background update complete');
  } catch (error) {
    console.error('[Service Worker] Background update failed:', error);
  }
}
