const CACHE_NAME = 'mira-cache-v1.0.0';

const PRECACHE_ASSETS = [
  '/human/',
  '/human/favicon.ico',
  '/human/icon-192x192.png',
  '/human/icon-512x512.png',
];

// Instalar el Service Worker y almacenar en caché el App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cargando App Shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Advertencia al pre-cargar assets:', err);
      });
    })
  );
  // NO llamamos a self.skipWaiting() automáticamente aquí.
  // Dejamos que el cliente decida cuándo activar el nuevo SW.
});

// Activar el SW y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Nuevo Service Worker activado y reclamando clientes');
      return self.clients.claim();
    })
  );
});

// Interceptar las peticiones fetch
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Evitar interceptar el propio archivo del service worker
  if (url.pathname.includes('sw.js')) return;

  // 1. Estrategia Network-First para el documento principal (HTML) y manifest
  const isHTML = url.pathname === '/human/' || url.pathname === '/human' || url.pathname.endsWith('.html');
  const isManifest = url.pathname.includes('manifest');

  if (isHTML || isManifest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es válida, clonarla y guardarla en la caché
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red (offline), intentar responder con la caché
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Si no hay caché para el HTML, devolver fallback de la raíz
            if (isHTML) return caches.match('/human/');
          });
        })
    );
    return;
  }

  // 2. Estrategia Cache-First para recursos con hash de Next.js (_next/static/)
  // Como tienen hash único en el nombre, nunca cambian sus contenidos sin cambiar de URL.
  const isNextStatic = url.pathname.includes('/_next/static/');

  if (isNextStatic) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // 3. Estrategia Stale-While-Revalidate para otros recursos estáticos (imágenes, iconos, fuentes)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignorar errores de red en segundo plano si ya tenemos caché
          console.log('[SW] Falló fetch en background para:', url.pathname);
        });

      // Devolver la respuesta en caché de inmediato si existe, de lo contrario esperar a la red
      return cachedResponse || fetchPromise;
    })
  );
});

// Escuchar mensajes del cliente (para forzar activación)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recibido SKIP_WAITING, activando de inmediato');
    self.skipWaiting();
  }
});
