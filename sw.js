/* CISSP 演習帳 — offline cache.
   Strategy: stale-while-revalidate. The app opens instantly from cache (even
   with no signal) and quietly refreshes itself in the background, so a new
   upload is picked up on the next launch. */
var CACHE = "cissp-drill-v1";
var SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL)["catch"](function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches["delete"](k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.status === 200 && res.type === "basic") c.put(req, res.clone());
          return res;
        })["catch"](function () {
          // Offline: fall back to whatever we have, or the app shell for navigations.
          return hit || c.match("./index.html", { ignoreSearch: true });
        });
        return hit || net;
      });
    })
  );
});
