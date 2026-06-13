/* AGS Auditoria — Service Worker
   Estratégia:
   - HTML (navegação): network-first → sempre tenta a versão online mais nova;
     se estiver offline, usa o cache. É isso que faz o app se atualizar sozinho.
   - Demais arquivos (manifest, ícones): cache-first, rápidos e offline.
   IMPORTANTE: a cada versão nova do app, troque CACHE_VERSION abaixo.
*/
const CACHE_VERSION = 'ags-v3.3332';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(CORE)).catch(() => {})
  );
  // Não chama skipWaiting aqui: espera o usuário tocar em "Atualizar agora".
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nomes =>
      Promise.all(nomes.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Permite que a página force a ativação do SW novo (botão "Atualizar agora")
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Só gerencia arquivos do próprio app (mesma origem)
  if (url.origin !== location.origin) return;

  const ehNavegacao = req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');

  if (ehNavegacao) {
    // network-first: pega o HTML novo do servidor; offline cai no cache
    event.respondWith(
      fetch(req).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE_VERSION).then(c => c.put('./index.html', copia)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // cache-first para os outros recursos
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      const copia = resp.clone();
      caches.open(CACHE_VERSION).then(c => c.put(req, copia)).catch(() => {});
      return resp;
    }).catch(() => hit))
  );
});
