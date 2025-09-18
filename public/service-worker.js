// Nome do cache
const CACHE_NAME = 'portaria-express-v1';

// Arquivos para guardar em cache inicialmente
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/icons/base-icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalação do service worker
self.addEventListener('install', event => {
  // Ativa o service worker imediatamente, sem esperar por recarga
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', event => {
  // Ignorar requisições não GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições de API
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('.supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a resposta for válida, clona e armazena no cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Se falhar, tenta buscar do cache
        return caches.match(event.request);
      })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
  // Assume o controle de clientes não controlados (abas/janelas)
  clients.claim();
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});