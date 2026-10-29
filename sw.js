/* 모아온 서비스 워커 — 화면 파일을 저장해 두어 빠르게 열고, 데이터는 항상 서버에서 새로 받아요 */
const CACHE = 'moaon-v8';
const FILES = ['./', './index.html', './admin.html', './config.js', './manifest.webmanifest', './manifest-admin.webmanifest',
  './assets/css/fonts.css', './assets/css/base.css', './assets/css/kids.css', './assets/css/admin.css',
  './assets/js/core.js', './assets/js/lesson.js', './assets/js/kids.js', './assets/js/admin.js', './assets/js/admin-pages.js', './assets/js/admin-pages2.js', './assets/js/xlsx.js', './assets/js/admin-export.js',
  './assets/img/logo.webp', './assets/img/roi.webp', './assets/img/moa.webp', './assets/img/face_roi.webp', './assets/img/face_moa.webp',
  './assets/img/face_roi2.webp', './assets/img/face_moa2.webp', './assets/img/face_moa3.webp', './assets/img/face_roi3.webp',
  './assets/img/icon-192.png', './assets/img/icon-rounded.png', './assets/img/favicon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // 서버(구글) 요청은 건드리지 않음
  // 화면 파일: 항상 서버에 새 버전이 있는지 확인하고(브라우저 캐시 무시), 인터넷이 없으면 저장본 사용
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
