/* MIS-NEXUS™ service worker — installation-safe PWA shell. */
"use strict";

const APP_NAME = "MIS-NEXUS™";
const CACHE_VERSION = "mis-nexus-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/*
 * All paths are relative so the PWA also works when the repository is
 * published as a GitHub Pages project site, e.g. /username/repository/.
 * Missing optional files must never make service-worker installation fail.
 */
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.svg",
  "./logo.png",
  "./notification.js",
  "./notifications.js",
  "./notifications.html"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);

    /* Cache what exists; one missing optional asset cannot abort installation. */
    await Promise.allSettled(
      APP_SHELL.map(async url => {
        try {
          const response = await fetch(url, { cache: "no-cache" });
          if (response && response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (_) {
          /* Optional asset unavailable; continue installing the PWA. */
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE]);
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => !keep.has(name))
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* Never interfere with third-party requests. */
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (
      await caches.match(request) ||
      await caches.match("./index.html") ||
      offlineResponse()
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    refresh(request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return offlineResponse();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || offlineResponse();
  }
}

function refresh(request) {
  fetch(request)
    .then(async response => {
      if (!response || !response.ok) return;
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    })
    .catch(() => {});
}

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|ttf|otf|json|webmanifest)$/i.test(url.pathname);
}

function offlineResponse() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#06130e"><title>${APP_NAME}</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#06130e;color:#fff;font-family:system-ui,sans-serif;text-align:center"><main><h1>${APP_NAME}</h1><p>You are offline. Reconnect and try again.</p></main></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", event => {
  let data = {
    title: APP_NAME,
    body: "You have a new notification.",
    icon: "./logo.png",
    badge: "./logo.png",
    data: { url: "./index.html" }
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title || APP_NAME, {
      body: data.body || "",
      icon: data.icon || "./logo.png",
      badge: data.badge || "./logo.png",
      data: data.data || { url: "./index.html" },
      tag: data.tag || "mis-nexus-notification",
      renotify: Boolean(data.renotify)
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetURL = event.notification?.data?.url || "./index.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(targetURL);
      })
  );
});

console.log(`${APP_NAME} service worker ready.`);