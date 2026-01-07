// ============================================
// SPIROLITE PROFESSIONAL - SERVICE WORKER v2.0
// Advanced offline support & update management
// ============================================

const APP_VERSION = '2.0.0';
const CACHE_NAMES = {
  static: `spirolite-static-v${APP_VERSION}`,
  runtime: `spirolite-runtime-v${APP_VERSION}`,
  data: `spirolite-data-v${APP_VERSION}`
};

// Precache these essential files
const PRECACHE_URLS = [
  // Core app files
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  
  // Icons
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  
  // Scripts
  './icons.js',
  './update-manager.js',
  './pwa-install.js',
  
  // External dependencies
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// File patterns for different caching strategies
const FILE_PATTERNS = {
  static: /\.(?:html|css|js|json|svg|png|ico|webmanifest)$/,
  images: /\.(?:png|jpg|jpeg|gif|webp|svg)$/,
  fonts: /\.(?:woff2|woff|ttf|eot)$/,
  data: /\.(?:json|xml)$/
};

// ========================
// INSTALL EVENT
// ========================
self.addEventListener('install', (event) => {
  console.log(`[SW ${APP_VERSION}] Installing...`);
  
  event.waitUntil(
    Promise.all([
      // Precache essential files
      caches.open(CACHE_NAMES.static)
        .then(cache => {
          console.log('[SW] Caching app shell');
          return cache.addAll(PRECACHE_URLS);
        })
        .catch(error => {
          console.error('[SW] Precache failed:', error);
        }),
      
      // Notify all clients about installation
      self.clients.matchAll()
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_INSTALLING',
              version: APP_VERSION
            });
          });
        }),
      
      // Force activation of this service worker
      self.skipWaiting()
    ])
  );
});

// ========================
// ACTIVATE EVENT
// ========================
self.addEventListener('activate', (event) => {
  console.log(`[SW ${APP_VERSION}] Activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              // Delete caches that don't match current version
              if (!Object.values(CACHE_NAMES).includes(cacheName)) {
                console.log('[SW] Deleting old cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        }),
      
      // Take control of all clients immediately
      self.clients.claim(),
      
      // Notify all clients about activation
      self.clients.matchAll()
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: APP_VERSION
            });
          });
        }),
      
      // Initialize data cache with empty structure
      caches.open(CACHE_NAMES.data)
        .then(cache => {
          // Store initial metadata
          const metadata = {
            version: APP_VERSION,
            installedAt: new Date().toISOString(),
            lastSync: new Date().toISOString()
          };
          
          const response = new Response(JSON.stringify(metadata), {
            headers: { 'Content-Type': 'application/json' }
          });
          
          return cache.put('./metadata.json', response);
        })
    ])
  );
});

// ========================
// FETCH EVENT - Advanced Caching Strategy
// ========================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests (except CDNs)
  if (!url.origin.startsWith(self.location.origin) && 
      !url.href.includes('cdn.jsdelivr.net') &&
      !url.href.includes('cdnjs.cloudflare.com')) {
    return;
  }
  
  // Handle different types of requests with different strategies
  if (request.mode === 'navigate') {
    // Navigation request - Network First with offline fallback
    event.respondWith(handleNavigationRequest(request));
  } else if (FILE_PATTERNS.images.test(url.pathname)) {
    // Images - Cache First, update in background
    event.respondWith(handleImageRequest(request));
  } else if (FILE_PATTERNS.static.test(url.pathname)) {
    // Static assets - Cache First
    event.respondWith(handleStaticRequest(request));
  } else if (url.pathname.includes('/api/') || url.pathname.includes('/data/')) {
    // API/data requests - Network First, cache for offline
    event.respondWith(handleApiRequest(request));
  } else {
    // Default - Network First
    event.respondWith(handleDefaultRequest(request));
  }
});

// ========================
// REQUEST HANDLERS
// ========================
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache the successful response
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.runtime);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving navigation from cache:', request.url);
      return cachedResponse;
    }
    
    // No cache - show offline page
    console.log('[SW] Showing offline page for:', request.url);
    return caches.match('./offline.html');
  }
}

async function handleStaticRequest(request) {
  // Cache First for static assets
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  // Not in cache - fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.static);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed and not in cache
    console.error('[SW] Static asset fetch failed:', error);
    throw error;
  }
}

async function handleImageRequest(request) {
  // Cache First for images
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Not in cache - fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.runtime);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return a placeholder image for missing images
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f0f9ff"/><text x="50" y="55" text-anchor="middle" fill="#1A5F7A" font-family="Arial" font-size="12">Image</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

async function handleApiRequest(request) {
  try {
    // Network First for API calls
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(CACHE_NAMES.data);
      cache.put(request, networkResponse.clone());
      
      // Update last sync time
      updateLastSync();
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // No cache available
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleDefaultRequest(request) {
  // Network First for everything else
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// ========================
// BACKGROUND SYNC
// ========================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-patient-data') {
    event.waitUntil(syncPatientData());
  }
  
  if (event.tag === 'sync-settings') {
    event.waitUntil(syncSettings());
  }
});

async function syncPatientData() {
  console.log('[SW] Syncing patient data...');
  
  try {
    const cache = await caches.open(CACHE_NAMES.data);
    const keys = await cache.keys();
    const patientRequests = keys.filter(req => 
      req.url.includes('/api/patients') || 
      req.url.includes('/api/visits')
    );
    
    for (const request of patientRequests) {
      try {
        await fetch(request);
        console.log('[SW] Synced:', request.url);
      } catch (error) {
        console.error('[SW] Sync failed for:', request.url);
      }
    }
    
    // Notify clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          timestamp: new Date().toISOString()
        });
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function syncSettings() {
  // Sync app settings
  console.log('[SW] Syncing settings...');
}

// ========================
// PUSH NOTIFICATIONS
// ========================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch (error) {
    data = {
      title: 'Spirolite',
      body: event.data.text() || 'New update available',
      icon: './icon-192.png'
    };
  }
  
  const options = {
    body: data.body || 'Spirolite notification',
    icon: data.icon || './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'spirolite-general',
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Spirolite', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  
  if (action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    })
    .then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// ========================
// MESSAGE HANDLING
// ========================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (!event.data) return;
  
  const { type, data, port } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skipping waiting phase');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      if (port) {
        port.postMessage({
          version: APP_VERSION,
          cacheNames: Object.values(CACHE_NAMES),
          timestamp: new Date().toISOString()
        });
      }
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
      
    case 'UPDATE_CACHE':
      updateSpecificCache(data);
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo(port);
      break;
      
    case 'SYNC_NOW':
      syncPatientData();
      break;
      
    case 'CHECK_UPDATES':
      self.registration.update();
      break;
      
    case 'PING':
      if (port) {
        port.postMessage({ pong: true, version: APP_VERSION });
      }
      break;
  }
});

// ========================
// PERIODIC SYNC
// ========================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-check') {
    console.log('[SW] Periodic update check');
    event.waitUntil(checkForUpdates());
  }
});

// ========================
// HELPER FUNCTIONS
// ========================
async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.runtime);
      cache.put(request, response);
    }
  } catch (error) {
    // Silent fail - background update only
  }
}

async function updateLastSync() {
  try {
    const cache = await caches.open(CACHE_NAMES.data);
    const metadata = {
      version: APP_VERSION,
      installedAt: new Date().toISOString(),
      lastSync: new Date().toISOString()
    };
    
    const response = new Response(JSON.stringify(metadata), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put('./metadata.json', response);
  } catch (error) {
    console.error('[SW] Failed to update last sync:', error);
  }
}

async function clearAllCaches() {
  console.log('[SW] Clearing all caches');
  
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  
  // Notify clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_CLEARED',
        timestamp: new Date().toISOString()
      });
    });
  });
}

async function updateSpecificCache(data) {
  const { url, content } = data;
  
  if (url && content) {
    const cache = await caches.open(CACHE_NAMES.data);
    const response = new Response(JSON.stringify(content), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(url, response);
  }
}

async function getCacheInfo(port) {
  if (!port) return;
  
  const cacheNames = await caches.keys();
  const cacheInfo = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    cacheInfo[cacheName] = {
      size: requests.length,
      urls: requests.slice(0, 10).map(req => req.url) // First 10 URLs only
    };
  }
  
  port.postMessage({
    cacheInfo,
    totalCaches: cacheNames.length
  });
}

async function checkForUpdates() {
  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    const serverVersion = await response.json();
    
    if (serverVersion.version !== APP_VERSION) {
      // Notify clients about available update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            currentVersion: APP_VERSION,
            newVersion: serverVersion.version
          });
        });
      });
    }
  } catch (error) {
    // Version check failed - continue offline
  }
}

// ========================
// ERROR HANDLING
// ========================
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

// ========================
// INITIALIZATION
// ========================
console.log(`[SW ${APP_VERSION}] Service Worker loaded`);

// Send ready message to all clients immediately
self.clients.matchAll().then(clients => {
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_READY',
      version: APP_VERSION,
      timestamp: new Date().toISOString()
    });
  });
});
