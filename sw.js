// Offline-ish: app shell precached; chapters cached as you read (stale-while-revalidate).
const C = 'hhb-v13';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'morph.js', 'ads.js', 'ads.json', 'app.json', 'locales/en.json', 'locales/hi.json', 'manifest.json', 'icon.svg',
  'data/index.json', 'data/lex.json.gz', 'fonts/Inter.woff2', 'fonts/NotoSerifHebrew.woff2', 'fonts/NotoSansDevanagari.woff2',
  'fonts/NotoSerifGreek.woff2', 'fonts/NotoSerifGreekExt.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(C).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
