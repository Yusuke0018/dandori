const CACHE_NAME = 'dandori-cache-v16';
const ASSETS = [
  '/dandori/',
  '/dandori/index.html',
  '/dandori/manifest.json',
  '/dandori/css/base.css',
  '/dandori/css/theme.css',
  '/dandori/css/components.css',
  '/dandori/css/views.css',
  '/dandori/css/panel.css',
  '/dandori/js/main.js',
  '/dandori/js/modules/router.js',
  '/dandori/js/modules/uiController.js',
  '/dandori/js/modules/taskManager.js',
  '/dandori/js/modules/storage.js',
  '/dandori/js/modules/panelController.js',
  '/dandori/js/modules/dragDropController.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k.startsWith('dandori-cache-')).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function networkFirst(request) {
  return fetch(request, { cache: 'no-store' })
    .then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, copy));
      return resp;
    })
    .catch(() => caches.match(request).then(r => r || caches.match('/dandori/index.html')));
}

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, copy));
      return resp;
    }).catch(() => caches.match('/dandori/index.html'));
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const dest = req.destination;

  if (isHTML) {
    e.respondWith(networkFirst(req));
    return;
  }

  if (dest === 'script' || dest === 'style') {
    e.respondWith(networkFirst(req));
    return;
  }

  e.respondWith(cacheFirst(req));
});

// Messages from page to force actions
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'PURGE_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dandori-cache-')).map(k => caches.delete(k))))
    );
  }
});
