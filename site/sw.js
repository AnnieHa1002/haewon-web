/* 꺼지지 않는 이름 · 오프라인 저장
   페이지·스크립트·데이터는 인터넷 먼저(3초 안에 안 오면 저장본), 사진·로고는 저장본 먼저.
   소리 파일은 건드리지 않는다(재생 구간 요청이 섞여서). 배포를 바꾸면 VERSION만 올린다. */
var VERSION = 'hw4-202611251300';
var CORE = ['./', 'index.html', 'stage.html'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).catch(function () {}));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function put(req, res) {
  if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || /\/audio\//.test(url.pathname) || /chk=/.test(url.search)) return;
  if (/\/img\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (r) { return put(req, r); }); }));
    return;
  }
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    var fallback = function () { return caches.match(req, { ignoreSearch: req.mode === 'navigate' }); };
    var timer = setTimeout(function () { fallback().then(function (hit) { if (hit && !done) { done = true; resolve(hit); } }); }, 3000);
    fetch(req).then(function (r) { clearTimeout(timer); put(req, r); if (!done) { done = true; resolve(r); } })
      .catch(function () { clearTimeout(timer); fallback().then(function (hit) { if (!done) { done = true; resolve(hit || Response.error()); } }); });
  }));
});
