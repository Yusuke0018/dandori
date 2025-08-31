const CACHE_NAME = 'dandori-cache-v5';
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
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((res) => res || fetch(e.request).then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
        return resp;
      }).catch(() => caches.match('/dandori/index.html')))
    );
  }
});
