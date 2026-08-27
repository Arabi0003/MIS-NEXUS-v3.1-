/* =========================================================
   MIS-NEXUS™ v3.1
   SERVICE WORKER
   MISBAHUL 'ILM SCHOOLS ABUJA
========================================================= */

"use strict";

const CACHE_NAME = "mis-nexus-v3.1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/institution.png",
  "/secure.png",
  "/welcome.mp3"
];

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())

  );

});


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))

        );

      })
      .then(() => self.clients.claim())

  );

});


/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    Do not intercept external requests.
    This is important for Supabase and other
    future external services.
  */

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(

    caches.match(request)
      .then(cachedResponse => {

        if (cachedResponse) {

          /*
            Return the cached application shell immediately,
            while allowing navigation resources to remain fast.
          */

          return cachedResponse;

        }

        return fetch(request)
          .then(networkResponse => {

            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== "basic"
            ) {

              return networkResponse;

            }

            const responseClone =
              networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {

                cache.put(
                  request,
                  responseClone
                );

              });

            return networkResponse;

          })
          .catch(() => {

            /*
              Offline navigation fallback.
            */

            if (
              request.mode === "navigate"
            ) {

              return caches.match(
                "/index.html"
              );

            }

            return new Response(
              "",
              {
                status: 503,
                statusText: "MIS-NEXUS Offline"
              }
            );

          });

      })

  );

});


/* =========================================================
   MESSAGE CONTROL
========================================================= */

self.addEventListener("message", event => {

  if (!event.data) {
    return;
  }

  switch (event.data.type) {

    case "SKIP_WAITING":

      self.skipWaiting();

      break;


    case "CLEAR_CACHE":

      event.waitUntil(

        caches
          .delete(CACHE_NAME)
          .then(() => {

            return caches.open(
              CACHE_NAME
            );

          })
          .then(cache => {

            return cache.addAll(
              APP_SHELL
            );

          })

      );

      break;


    case "GET_VERSION":

      if (event.source) {

        event.source.postMessage({

          type: "MIS_NEXUS_VERSION",

          version: "3.1",

          cache: CACHE_NAME

        });

      }

      break;

  }

});


/* =========================================================
   ONLINE / OFFLINE STATE BROADCAST
========================================================= */

self.addEventListener("online", () => {

  self.clients.matchAll()
    .then(clients => {

      clients.forEach(client => {

        client.postMessage({

          type: "NETWORK_STATUS",

          online: true

        });

      });

    });

});


self.addEventListener("offline", () => {

  self.clients.matchAll()
    .then(clients => {

      clients.forEach(client => {

        client.postMessage({

          type: "NETWORK_STATUS",

          online: false

        });

      });

    });

});


/* =========================================================
   PUSH FOUNDATION
   Reserved for future Supabase / notification system.
========================================================= */

self.addEventListener("push", event => {

  let data = {

    title: "MIS-NEXUS™",

    body:
      "MISBAHUL 'ILM SCHOOLS ABUJA notification.",

    icon: "/logo.png",

    badge: "/logo.png",

    tag: "mis-nexus-notification",

    data: {
      url: "/"
    }

  };


  try {

    if (event.data) {

      const incoming =
        event.data.json();

      data = {
        ...data,
        ...incoming
      };

    }

  } catch {

    /*
      Keep the default notification
      when the payload is not JSON.
    */

  }


  event.waitUntil(

    self.registration.showNotification(
      data.title,
      {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        vibrate: [100, 50, 100]
      }
    )

  );

});


/* =========================================================
   NOTIFICATION CLICK
========================================================= */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    const target =
      event.notification?.data?.url ||
      "/";


    event.waitUntil(

      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(clientList => {

          for (
            const client
            of clientList
          ) {

            if (
              "focus" in client
            ) {

              client.focus();

              if (
                "navigate" in client
              ) {

                client.navigate(
                  target
                );

              }

              return;

            }

          }

          if (
            self.clients.openWindow
          ) {

            return self.clients.openWindow(
              target
            );

          }

        })

    );

  }
);


/* =========================================================
   BACKGROUND SYNC FOUNDATION
========================================================= */

self.addEventListener(
  "sync",
  event => {

    if (
      event.tag ===
      "mis-nexus-attendance-sync"
    ) {

      event.waitUntil(
        synchronizeAttendance()
      );

    }

  }
);


async function synchronizeAttendance(){

  /*
    Reserved for the Supabase attendance
    queue.

    Future structure:

    IndexedDB
       ↓
    Pending attendance
       ↓
    Supabase
       ↓
    Confirmed record
       ↓
    Remove local queue
  */

  return true;

}