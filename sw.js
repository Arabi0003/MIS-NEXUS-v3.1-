/* ============================================================
   MIS-NEXUS™ SERVICE WORKER
   ------------------------------------------------------------
   Progressive Web App engine
   - Installable application
   - Offline shell
   - Smart caching
   - Automatic cache cleanup
   - Network-first HTML navigation
   - Cache-first static assets
   - Offline fallback
   - Update detection
   - Push notification foundation
   - Notification click handling
   ============================================================ */

"use strict";


/* ============================================================
   APPLICATION CONFIGURATION
   ============================================================ */

const APP_NAME =
  "MIS-NEXUS™";


const CACHE_VERSION =
  "mis-nexus-v1";


const STATIC_CACHE =
  CACHE_VERSION +
  "-static";


const RUNTIME_CACHE =
  CACHE_VERSION +
  "-runtime";


const OFFLINE_CACHE =
  CACHE_VERSION +
  "-offline";


/* ============================================================
   APPLICATION SHELL
   ============================================================ */

const APP_SHELL = [

  "./",

  "./index.html",

  "./notifications.html",

  "./notifications.js",

  "./manifest.webmanifest",

  "./logo.png"

];


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener(

  "install",

  event => {

    console.log(
      APP_NAME +
      " service worker installing."
    );


    event.waitUntil(

      caches.open(
        STATIC_CACHE
      )

      .then(
        cache => {

          return cache.addAll(
            APP_SHELL
          );

        }
      )

      .then(
        () => {

          return self.skipWaiting();

        }
      )

    );

  }

);


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener(

  "activate",

  event => {

    console.log(
      APP_NAME +
      " service worker activated."
    );


    event.waitUntil(

      caches.keys()

        .then(
          cacheNames => {

            return Promise.all(

              cacheNames

                .filter(
                  cacheName => {

                    return (

                      cacheName !==
                        STATIC_CACHE &&

                      cacheName !==
                        RUNTIME_CACHE &&

                      cacheName !==
                        OFFLINE_CACHE

                    );

                  }
                )

                .map(
                  cacheName =>
                    caches.delete(
                      cacheName
                    )
                )

            );

          }
        )

        .then(
          () =>
            self.clients.claim()
        )

    );

  }

);


/* ============================================================
   FETCH HANDLER
   ============================================================ */

self.addEventListener(

  "fetch",

  event => {

    const request =
      event.request;


    if (
      request.method !==
      "GET"
    ) {

      return;

    }


    const url =
      new URL(
        request.url
      );


    /*
      Navigation requests:

      Try network first.

      If network fails,
      use cached application shell.
    */

    if (
      request.mode ===
      "navigate"
    ) {

      event.respondWith(

        networkFirstNavigation(
          request
        )

      );

      return;

    }


    /*
      Static assets:

      Cache first.

      Network fallback.
    */

    if (
      isStaticAsset(
        url
      )
    ) {

      event.respondWith(

        cacheFirst(
          request
        )

      );

      return;

    }


    /*
      Everything else:

      Network first,
      then runtime cache.
    */

    event.respondWith(

      networkFirst(
        request
      )

    );

  }

);


/* ============================================================
   NETWORK-FIRST NAVIGATION
   ============================================================ */

async function networkFirstNavigation(
  request
) {

  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      const cache =
        await caches.open(
          RUNTIME_CACHE
        );


      cache.put(
        request,
        response.clone()
      );

    }


    return response;

  }

  catch (error) {

    console.warn(
      APP_NAME +
      " offline navigation:",
      error
    );


    const cached =
      await caches.match(
        request
      );


    if (cached) {

      return cached;

    }


    const index =
      await caches.match(
        "./index.html"
      );


    if (index) {

      return index;

    }


    return offlineResponse();

  }

}


/* ============================================================
   CACHE FIRST
   ============================================================ */

async function cacheFirst(
  request
) {

  const cached =
    await caches.match(
      request
    );


  if (cached) {

    refreshInBackground(
      request
    );


    return cached;

  }


  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      const cache =
        await caches.open(
          RUNTIME_CACHE
        );


      cache.put(
        request,
        response.clone()
      );

    }


    return response;

  }

  catch (error) {

    return offlineResponse();

  }

}


/* ============================================================
   NETWORK FIRST
   ============================================================ */

async function networkFirst(
  request
) {

  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      const cache =
        await caches.open(
          RUNTIME_CACHE
        );


      cache.put(
        request,
        response.clone()
      );

    }


    return response;

  }

  catch (error) {

    const cached =
      await caches.match(
        request
      );


    if (cached) {

      return cached;

    }


    return offlineResponse();

  }

}


/* ============================================================
   BACKGROUND REFRESH
   ============================================================ */

function refreshInBackground(
  request
) {

  fetch(
    request
  )

    .then(
      response => {

        if (
          !response ||
          !response.ok
        ) {

          return;

        }


        return caches
          .open(
            RUNTIME_CACHE
          )

          .then(
            cache => {

              cache.put(
                request,
                response.clone()
              );

            }
          );

      }
    )

    .catch(
      () => {}
    );

}


/* ============================================================
   STATIC ASSET DETECTION
   ============================================================ */

function isStaticAsset(
  url
) {

  const pathname =
    url.pathname
      .toLowerCase();


  const extensions = [

    ".css",

    ".js",

    ".png",

    ".jpg",

    ".jpeg",

    ".webp",

    ".svg",

    ".ico",

    ".woff",

    ".woff2",

    ".ttf",

    ".otf",

    ".json",

    ".webmanifest"

  ];


  return extensions.some(
    extension =>
      pathname.endsWith(
        extension
      )
  );

}


/* ============================================================
   OFFLINE RESPONSE
   ============================================================ */

function offlineResponse() {

  return new Response(

    `
    <!DOCTYPE html>

    <html lang="en">

    <head>

      <meta
        charset="UTF-8"
      >

      <meta
        name="viewport"
        content="width=device-width,
        initial-scale=1,
        maximum-scale=1,
        user-scalable=no"
      >

      <meta
        name="theme-color"
        content="#20252b"
      >

      <title>
        MIS-NEXUS™
      </title>

      <style>

        * {

          box-sizing:
            border-box;

        }

        html,
        body {

          margin:
            0;

          min-height:
            100%;

          background:
            #171b20;

          color:
            #f5f7fa;

          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        }

        body {

          min-height:
            100dvh;

          display:
            grid;

          place-items:
            center;

          padding:
            24px;

          text-align:
            center;

        }

        main {

          width:
            min(
              430px,
              100%
            );

          padding:
            32px 24px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .10
            );

          border-radius:
            26px;

          background:
            rgba(
              255,
              255,
              255,
              .055
            );

          box-shadow:
            0 25px 70px
            rgba(
              0,
              0,
              0,
              .35
            );

        }

        h1 {

          margin:
            0 0 10px;

          font-size:
            25px;

        }

        p {

          margin:
            0;

          color:
            #aeb7c0;

          font-size:
            11px;

          line-height:
            1.6;

        }

        button {

          margin-top:
            20px;

          border:
            0;

          border-radius:
            13px;

          padding:
            12px 18px;

          background:
            #f5f7fa;

          color:
            #171b20;

          font-weight:
            900;

          cursor:
            pointer;

        }

      </style>

    </head>

    <body>

      <main>

        <h1>
          MIS-NEXUS™
        </h1>

        <p>
          You are currently offline.
          Please reconnect to the internet
          and try again.
        </p>

        <button
          type="button"
          onclick="location.reload()"
        >
          TRY AGAIN
        </button>

      </main>

    </body>

    </html>
    `,

    {

      status:
        503,

      headers: {

        "Content-Type":
          "text/html; charset=utf-8"

      }

    }

  );

}


/* ============================================================
   MESSAGE HANDLER
   ============================================================ */

self.addEventListener(

  "message",

  event => {

    const data =
      event.data;


    if (!data) {

      return;

    }


    if (
      data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

      return;

    }


    if (
      data.type ===
      "CLEAR_CACHES"
    ) {

      event.waitUntil(

        caches.keys()

          .then(
            cacheNames =>
              Promise.all(
                cacheNames.map(
                  cacheName =>
                    caches.delete(
                      cacheName
                    )
                )
              )
          )

      );

    }

  }

);


/* ============================================================
   PUSH NOTIFICATION
   ============================================================ */

self.addEventListener(

  "push",

  event => {

    let data = {

      title:
        APP_NAME,

      body:
        "You have a new notification.",

      icon:
        "./logo.png",

      badge:
        "./logo.png",

      data:
        {
          url:
            "./index.html"
        }

    };


    try {

      if (event.data) {

        const parsed =
          event.data.json();


        data = {

          ...data,

          ...parsed

        };

      }

    }

    catch (error) {

      console.warn(
        APP_NAME +
        " push payload error:",
        error
      );

    }


    event.waitUntil(

      self.registration.showNotification(

        data.title ||
          APP_NAME,

        {

          body:
            data.body ||
            "",

          icon:
            data.icon ||
            "./logo.png",

          badge:
            data.badge ||
            "./logo.png",

          data:
            data.data ||
            {
              url:
                "./index.html"
            },

          tag:
            data.tag ||
            "mis-nexus-notification",

          renotify:
            Boolean(
              data.renotify
            )

        }

      )

    );

  }

);


/* ============================================================
   NOTIFICATION CLICK
   ============================================================ */

self.addEventListener(

  "notificationclick",

  event => {

    event.notification.close();


    const targetURL =
      event.notification?.data?.url ||
      "./index.html";


    event.waitUntil(

      self.clients.matchAll(
        {
          type:
            "window",
          includeUncontrolled:
            true
        }
      )

      .then(
        clients => {

          for (
            const client of clients
          ) {

            if (
              "focus" in client
            ) {

              return client.focus();

            }

          }


          if (
            self.clients.openWindow
          ) {

            return self.clients.openWindow(
              targetURL
            );

          }

        }
      )

    );

  }

);


/* ============================================================
   PERIODIC CACHE CLEANUP
   ============================================================ */

async function cleanRuntimeCache() {

  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  const requests =
    await cache.keys();


  /*
    Keep runtime cache from growing
    without limit.
  */

  const maximum =
    80;


  if (
    requests.length <=
    maximum
  ) {

    return;

  }


  const removeCount =
    requests.length -
    maximum;


  for (
    let index = 0;
    index < removeCount;
    index++
  ) {

    await cache.delete(
      requests[index]
    );

  }

}


/* ============================================================
   PERIODIC SYNC FOUNDATION
   ============================================================ */

self.addEventListener(

  "periodicsync",

  event => {

    if (
      event.tag ===
      "mis-nexus-refresh"
    ) {

      event.waitUntil(

        cleanRuntimeCache()

      );

    }

  }

);


/* ============================================================
   SYNC FOUNDATION
   ============================================================ */

self.addEventListener(

  "sync",

  event => {

    if (
      event.tag ===
      "mis-nexus-background-sync"
    ) {

      event.waitUntil(

        backgroundSync()

      );

    }

  }

);


/* ============================================================
   BACKGROUND SYNC
   ============================================================ */

async function backgroundSync() {

  try {

    await cleanRuntimeCache();

  }

  catch (error) {

    console.warn(
      APP_NAME +
      " background sync failed:",
      error
    );

  }

}


/* ============================================================
   SERVICE WORKER ERROR HANDLING
   ============================================================ */

self.addEventListener(

  "error",

  event => {

    console.error(
      APP_NAME +
      " service worker error:",
      event.error
    );

  }

);


/* ============================================================
   UNHANDLED PROMISE HANDLER
   ============================================================ */

self.addEventListener(

  "unhandledrejection",

  event => {

    console.error(
      APP_NAME +
      " service worker unhandled rejection:",
      event.reason
    );

  }

);


/* ============================================================
   READY
   ============================================================ */

console.log(
  APP_NAME +
  " Service Worker ready."
);