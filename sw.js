/* Service worker do Treino 12 — deixa o app abrir rápido e funcionar sem internet.
   AO PUBLICAR UMA NOVA VERSÃO: altere VERSAO abaixo (ex.: '2.0.1'). Isso avisa os celulares
   ("Nova versão disponível → Atualizar"). Os dados das pessoas não são afetados. */
const VERSAO = '2.0.0';
const CACHE = 'treino12-' + VERSAO;
const ASSETS = [
  './', './index.html', './styles.css', './plano.js', './manifest.webmanifest',
  './js/core.js', './js/model.js', './js/store.js', './js/charts.js', './js/ui.js', './js/views-a.js', './js/views-b.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.svg'
];
self.addEventListener('install', e => {
  // cache: 'reload' evita pegar arquivos antigos do cache HTTP ao instalar uma versão nova
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('treino12') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
