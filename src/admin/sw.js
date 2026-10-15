// Service worker מינימלי: מאפשר התקנה כאפליקציה. רשת קודם, ושמירת מעטפת האפליקציה לפתיחה בלי קליטה.
// לא שומר בשום מקרה תשובות של /api/ (נתונים אישיים).
const CACHE = 'admin-shell-v1';
const SHELL = ['/admin/', '/admin/admin.js', '/admin/admin.css', '/admin/meta.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (!u.pathname.startsWith('/admin/') && !u.pathname.startsWith('/assets/')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && u.pathname.startsWith('/admin/')) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
