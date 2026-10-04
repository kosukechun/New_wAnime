const CACHE = "wanime-shell-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(["/offline.html", "/icon-192.png", "/icon-512.png"]),
      )
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("wanime-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  // 認証API・お気に入り・個人ページ・RSCはキャッシュしない。
  if (event.request.mode === "navigate")
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
  else if (
    ["/icon-192.png", "/icon-512.png", "/offline.html"].includes(
      new URL(event.request.url).pathname,
    )
  )
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request)),
    );
});
