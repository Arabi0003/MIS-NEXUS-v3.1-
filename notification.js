/* ============================================================
   MIS-NEXUS™
   SMART NOTIFICATION ENGINE
   ------------------------------------------------------------
   Standalone notification system
   - In-app notification overlay
   - No page navigation when loaded on index.html
   - Existing href="notifications.html" is intercepted
   - Unread notification badge support
   - LocalStorage persistence
   - Cross-tab synchronization
   - Three themes:
       1. Silver
       2. Navy Blue + White
       3. Light
   - Keyboard support
   - Touch friendly
   - Accessible
   - Ready for future Supabase Realtime integration
   ============================================================ */

(function () {

  "use strict";

  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const CONFIG = {

    storageKey:
      "MIS_NEXUS_NOTIFICATIONS",

    themeKey:
      "MIS_NEXUS_THEME",

    eventName:
      "mis-nexus-notification-update",

    maximumNotifications:
      100,

    animationDuration:
      240,

    defaultTheme:
      "silver"

  };


  /* ==========================================================
     INTERNAL STATE
     ========================================================== */

  let notifications = [];

  let overlay = null;

  let panel = null;

  let isOpen = false;

  let initialized = false;


  /* ==========================================================
     DEFAULT NOTIFICATIONS
     ========================================================== */

  const DEFAULT_NOTIFICATIONS = [

    {
      id:
        "welcome-" + Date.now(),

      title:
        "Welcome to MIS-NEXUS™",

      message:
        "Your school application hub is ready.",

      type:
        "system",

      timestamp:
        Date.now(),

      read:
        false
    },

    {
      id:
        "updates-" + (Date.now() + 1),

      title:
        "System Updates",

      message:
        "Important school updates and announcements will appear here.",

      type:
        "announcement",

      timestamp:
        Date.now() - 5000,

      read:
        false
    }

  ];


  /* ==========================================================
     SVG ICONS
     ========================================================== */

  const ICONS = {

    notification:
      `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
        ></path>

        <path
          d="M10 21h4"
        ></path>
      </svg>
      `,

    announcement:
      `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M4 11h5l8-4v10l-8-4H4z"
        ></path>

        <path
          d="M9 15l1.5 5"
        ></path>
      </svg>
      `,

    attendance:
      `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M5 4h14v16H5z"
        ></path>

        <path
          d="m8 12 2.2 2.2L16 8.5"
        ></path>
      </svg>
      `,

    classes:
      `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="6"
          height="6"
          rx="1.5"
        ></rect>

        <rect
          x="14"
          y="4"
          width="6"
          height="6"
          rx="1.5"
        ></rect>

        <rect
          x="4"
          y="14"
          width="6"
          height="6"
          rx="1.5"
        ></rect>

        <rect
          x="14"
          y="14"
          width="6"
          height="6"
          rx="1.5"
        ></rect>
      </svg>
      `,

    close:
      `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="m7 7 10 10"
        ></path>

        <path
          d="m17 7-10 10"
        ></path>
      </svg>
      `,

    check:
      `
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="m5 12 4 4L19 6"
        ></path>
      </svg>
      `

  };


  /* ==========================================================
     UTILITY: ESCAPE HTML
     ========================================================== */

  function escapeHTML(value) {

    return String(value || "")

      .replaceAll(
        "&",
        "&amp;"
      )

      .replaceAll(
        "<",
        "&lt;"
      )

      .replaceAll(
        ">",
        "&gt;"
      )

      .replaceAll(
        '"',
        "&quot;"
      )

      .replaceAll(
        "'",
        "&#039;"
      );

  }


  /* ==========================================================
     UTILITY: GENERATE ID
     ========================================================== */

  function generateID() {

    return (

      "notification-" +

      Date.now() +

      "-" +

      Math.random()
        .toString(36)
        .substring(2, 10)

    );

  }


  /* ==========================================================
     STORAGE: READ
     ========================================================== */

  function readStorage() {

    try {

      const saved =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!saved) {

        return [];

      }

      const parsed =
        JSON.parse(saved);

      if (!Array.isArray(parsed)) {

        return [];

      }

      return parsed;

    }

    catch (error) {

      console.error(
        "MIS-NEXUS™ notification storage error:",
        error
      );

      return [];

    }

  }


  /* ==========================================================
     STORAGE: WRITE
     ========================================================== */

  function writeStorage(data) {

    try {

      localStorage.setItem(

        CONFIG.storageKey,

        JSON.stringify(
          data.slice(
            0,
            CONFIG.maximumNotifications
          )
        )

      );

    }

    catch (error) {

      console.error(
        "MIS-NEXUS™ notification write error:",
        error
      );

    }

    window.dispatchEvent(

      new CustomEvent(
        CONFIG.eventName,
        {
          detail:
            data
        }
      )

    );

  }


  /* ==========================================================
     LOAD NOTIFICATIONS
     ========================================================== */

  function loadNotifications() {

    const stored =
      readStorage();

    if (
      stored.length === 0
    ) {

      notifications =
        DEFAULT_NOTIFICATIONS.map(
          item => ({
            ...item
          })
        );

      writeStorage(
        notifications
      );

      return;

    }

    notifications =
      stored;

  }


  /* ==========================================================
     SAVE NOTIFICATIONS
     ========================================================== */

  function saveNotifications() {

    writeStorage(
      notifications
    );

  }


  /* ==========================================================
     UNREAD COUNT
     ========================================================== */

  function getUnreadCount() {

    return notifications.filter(
      notification =>
        notification.read === false
    ).length;

  }


  /* ==========================================================
     FORMAT TIME
     ========================================================== */

  function formatTime(timestamp) {

    if (!timestamp) {

      return "JUST NOW";

    }

    const date =
      new Date(timestamp);

    const now =
      new Date();

    const difference =
      now.getTime() -
      date.getTime();

    const minute =
      60 * 1000;

    const hour =
      60 * minute;

    const day =
      24 * hour;


    if (
      difference < minute
    ) {

      return "JUST NOW";

    }


    if (
      difference < hour
    ) {

      const value =
        Math.floor(
          difference / minute
        );

      return (
        value +
        (
          value === 1
            ? " MINUTE AGO"
            : " MINUTES AGO"
        )
      );

    }


    if (
      difference < day
    ) {

      const value =
        Math.floor(
          difference / hour
        );

      return (
        value +
        (
          value === 1
            ? " HOUR AGO"
            : " HOURS AGO"
        )
      );

    }


    if (
      difference < 7 * day
    ) {

      const value =
        Math.floor(
          difference / day
        );

      return (
        value +
        (
          value === 1
            ? " DAY AGO"
            : " DAYS AGO"
        )
      );

    }


    return date.toLocaleDateString(
      "en-NG",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric"
      }
    );

  }


  /* ==========================================================
     GET ICON
     ========================================================== */

  function getIcon(type) {

    switch (type) {

      case "announcement":
        return ICONS.announcement;

      case "attendance":
        return ICONS.attendance;

      case "classes":
        return ICONS.classes;

      default:
        return ICONS.notification;

    }

  }


  /* ==========================================================
     CREATE STYLES
     ========================================================== */

  function createStyles() {

    if (
      document.getElementById(
        "MISNexusNotificationStyles"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "MISNexusNotificationStyles";


    style.textContent = `

      #MISNexusNotificationRoot {

        position: fixed;

        inset: 0;

        z-index: 999999;

        pointer-events: none;

        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          Arial,
          sans-serif;

      }


      #MISNexusNotificationRoot * {

        box-sizing:
          border-box;

      }


      .mis-notification-backdrop {

        position: fixed;

        inset: 0;

        background:
          rgba(0,0,0,.38);

        opacity: 0;

        visibility: hidden;

        transition:
          opacity .22s ease,
          visibility .22s ease;

        backdrop-filter:
          blur(8px);

        -webkit-backdrop-filter:
          blur(8px);

      }


      .mis-notification-backdrop.open {

        opacity: 1;

        visibility:
          visible;

      }


      .mis-notification-panel {

        position: fixed;

        top:
          max(
            10px,
            env(safe-area-inset-top)
          );

        right: 12px;

        width:
          min(
            430px,
            calc(100vw - 24px)
          );

        max-height:
          min(
            720px,
            calc(100dvh - 20px)
          );

        overflow:
          hidden;

        display:
          flex;

        flex-direction:
          column;

        color:
          #f8fbff;

        background:
          rgba(
            29,
            34,
            40,
            .98
          );

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .12
          );

        border-radius:
          28px;

        box-shadow:
          0 30px 90px
          rgba(
            0,
            0,
            0,
            .48
          );

        opacity: 0;

        transform:
          translateY(-20px)
          scale(.97);

        pointer-events:
          none;

        transition:
          transform .24s
          cubic-bezier(
            .2,
            .8,
            .2,
            1
          ),
          opacity .2s ease;

      }


      .mis-notification-panel.open {

        opacity: 1;

        transform:
          translateY(0)
          scale(1);

        pointer-events:
          auto;

      }


      .mis-notification-header {

        display:
          flex;

        align-items:
          center;

        gap:
          11px;

        min-height:
          76px;

        padding:
          15px;

        border-bottom:
          1px solid
          rgba(
            255,
            255,
            255,
            .10
          );

      }


      .mis-notification-heading {

        flex:
          1;

        min-width:
          0;

      }


      .mis-notification-kicker {

        font-size:
          7px;

        font-weight:
          950;

        letter-spacing:
          1.6px;

        color:
          #aeb7c0;

        text-transform:
          uppercase;

      }


      .mis-notification-title {

        margin-top:
          4px;

        font-size:
          21px;

        line-height:
          1;

        font-weight:
          950;

        letter-spacing:
          -.05em;

      }


      .mis-notification-button {

        width:
          40px;

        height:
          40px;

        flex:
          0 0 40px;

        display:
          grid;

        place-items:
          center;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .11
          );

        border-radius:
          14px;

        background:
          rgba(
            255,
            255,
            255,
            .07
          );

        color:
          #f7f9fb;

        cursor:
          pointer;

        touch-action:
          manipulation;

        transition:
          transform .15s ease,
          background .15s ease;

      }


      .mis-notification-button:active {

        transform:
          scale(.91);

      }


      .mis-notification-button svg {

        width:
          18px;

        height:
          18px;

        fill:
          none;

        stroke:
          currentColor;

        stroke-width:
          1.8;

        stroke-linecap:
          round;

        stroke-linejoin:
          round;

      }


      .mis-notification-summary {

        display:
          flex;

        align-items:
          center;

        justify-content:
          space-between;

        gap:
          10px;

        padding:
          11px 15px;

        border-bottom:
          1px solid
          rgba(
            255,
            255,
            255,
            .08
          );

      }


      .mis-notification-count {

        font-size:
          9px;

        color:
          #aeb7c0;

      }


      .mis-notification-count strong {

        color:
          #fff;

        font-size:
          13px;

      }


      .mis-notification-readall {

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .11
          );

        border-radius:
          11px;

        padding:
          8px 10px;

        background:
          rgba(
            255,
            255,
            255,
            .06
          );

        color:
          #fff;

        font-size:
          7px;

        font-weight:
          950;

        cursor:
          pointer;

      }


      .mis-notification-list {

        overflow-y:
          auto;

        overscroll-behavior:
          contain;

        padding:
          10px;

        display:
          grid;

        gap:
          8px;

        -webkit-overflow-scrolling:
          touch;

      }


      .mis-notification-item {

        position:
          relative;

        display:
          flex;

        gap:
          11px;

        padding:
          13px;

        border:
          1px solid
          rgba(
            255,
            255,
            255,
            .10
          );

        border-radius:
          19px;

        background:
          rgba(
            255,
            255,
            255,
            .065
          );

        cursor:
          pointer;

        touch-action:
          manipulation;

        transition:
          transform .15s ease,
          background .15s ease;

      }


      .mis-notification-item:active {

        transform:
          scale(.985);

      }


      .mis-notification-item.unread {

        border-color:
          rgba(
            215,
            222,
            229,
            .36
          );

      }


      .mis-notification-item.unread::before {

        content:
          "";

        position:
          absolute;

        left:
          6px;

        top:
          17px;

        width:
          5px;

        height:
          5px;

        border-radius:
          50%;

        background:
          #d95568;

        box-shadow:
          0 0 12px
          rgba(
            217,
            85,
            104,
            .45
          );

      }


      .mis-notification-icon {

        width:
          40px;

        height:
          40px;

        flex:
          0 0 40px;

        display:
          grid;

        place-items:
          center;

        border-radius:
          13px;

        background:
          rgba(
            0,
            0,
            0,
            .16
          );

        color:
          #d7dee5;

      }


      .mis-notification-icon svg {

        width:
          18px;

        height:
          18px;

        fill:
          none;

        stroke:
          currentColor;

        stroke-width:
          1.8;

        stroke-linecap:
          round;

        stroke-linejoin:
          round;

      }


      .mis-notification-content {

        flex:
          1;

        min-width:
          0;

      }


      .mis-notification-item-title {

        font-size:
          11px;

        line-height:
          1.3;

        font-weight:
          950;

      }


      .mis-notification-message {

        margin-top:
          4px;

        color:
          #aeb7c0;

        font-size:
          9px;

        line-height:
          1.5;

      }


      .mis-notification-time {

        margin-top:
          7px;

        color:
          #89939c;

        font-size:
          6.5px;

        font-weight:
          900;

        letter-spacing:
          .8px;

        text-transform:
          uppercase;

      }


      .mis-notification-empty {

        padding:
          48px 18px;

        text-align:
          center;

        color:
          #9ba5ae;

        font-size:
          10px;

      }


      .mis-notification-empty strong {

        display:
          block;

        margin-bottom:
          5px;

        color:
          #fff;

        font-size:
          13px;

      }


      @media(max-width:520px) {

        .mis-notification-panel {

          top:
            7px;

          right:
            7px;

          left:
            7px;

          width:
            auto;

          max-height:
            calc(100dvh - 14px);

          border-radius:
            25px;

        }

      }


      @media(prefers-reduced-motion:reduce) {

        .mis-notification-panel,
        .mis-notification-backdrop,
        .mis-notification-item,
        .mis-notification-button {

          transition:
            none !important;

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* ==========================================================
     CREATE DOM
     ========================================================== */

  function createInterface() {

    if (
      document.getElementById(
        "MISNexusNotificationRoot"
      )
    ) {

      return;

    }


    const root =
      document.createElement(
        "div"
      );


    root.id =
      "MISNexusNotificationRoot";


    root.innerHTML = `

      <div
        class="mis-notification-backdrop"
        data-notification-close
      ></div>


      <section
        class="mis-notification-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >

        <header
          class="mis-notification-header"
        >

          <div
            class="mis-notification-heading"
          >

            <div
              class="mis-notification-kicker"
            >
              MIS-NEXUS™ • LIVE UPDATES
            </div>


            <div
              class="mis-notification-title"
            >
              Notifications
            </div>

          </div>


          <button
            type="button"
            class="mis-notification-button"
            data-notification-readall
            aria-label="Mark all notifications as read"
          >

            ${ICONS.check}

          </button>


          <button
            type="button"
            class="mis-notification-button"
            data-notification-close
            aria-label="Close notifications"
          >

            ${ICONS.close}

          </button>

        </header>


        <div
          class="mis-notification-summary"
        >

          <div
            class="mis-notification-count"
          >

            <strong
              id="MISNexusUnreadCount"
            >
              0
            </strong>

            unread updates

          </div>


          <button
            type="button"
            class="mis-notification-readall"
            data-notification-readall
          >
            MARK ALL READ
          </button>

        </div>


        <div
          class="mis-notification-list"
          id="MISNexusNotificationList"
        ></div>

      </section>

    `;


    document.body.appendChild(
      root
    );


    overlay =
      root.querySelector(
        ".mis-notification-backdrop"
      );


    panel =
      root.querySelector(
        ".mis-notification-panel"
      );


    root
      .querySelectorAll(
        "[data-notification-close]"
      )
      .forEach(
        element => {

          element.addEventListener(
            "click",
            close
          );

        }
      );


    root
      .querySelectorAll(
        "[data-notification-readall]"
      )
      .forEach(
        element => {

          element.addEventListener(
            "click",
            markAllRead
          );

        }
      );

  }


  /* ==========================================================
     RENDER
     ========================================================== */

  function render() {

    if (!panel) {

      return;

    }


    const list =
      document.getElementById(
        "MISNexusNotificationList"
      );


    const count =
      document.getElementById(
        "MISNexusUnreadCount"
      );


    if (!list) {

      return;

    }


    const unread =
      getUnreadCount();


    if (count) {

      count.textContent =
        unread;

    }


    if (
      notifications.length === 0
    ) {

      list.innerHTML = `

        <div
          class="mis-notification-empty"
        >

          <strong>
            You're all caught up.
          </strong>

          No new notifications right now.

        </div>

      `;

      return;

    }


    list.innerHTML =
      notifications
        .map(
          notification => {

            const unreadClass =
              notification.read
                ? ""
                : "unread";


            return `

              <article
                class="
                  mis-notification-item
                  ${unreadClass}
                "
                data-notification-id="
                  ${escapeHTML(
                    notification.id
                  )}
                "
                tabindex="0"
                role="button"
              >

                <div
                  class="mis-notification-icon"
                >

                  ${getIcon(
                    notification.type
                  )}

                </div>


                <div
                  class="mis-notification-content"
                >

                  <div
                    class="mis-notification-item-title"
                  >
                    ${escapeHTML(
                      notification.title
                    )}
                  </div>


                  <div
                    class="mis-notification-message"
                  >
                    ${escapeHTML(
                      notification.message
                    )}
                  </div>


                  <div
                    class="mis-notification-time"
                  >
                    ${formatTime(
                      notification.timestamp
                    )}
                  </div>

                </div>

              </article>

            `;

          }
        )
        .join("");


    list
      .querySelectorAll(
        "[data-notification-id]"
      )
      .forEach(
        element => {

          const activate =
            function () {

              const id =
                element.dataset
                  .notificationId;

              markRead(
                id
              );

            };


          element.addEventListener(
            "click",
            activate
          );


          element.addEventListener(
            "keydown",
            event => {

              if (
                event.key === "Enter" ||
                event.key === " "
              ) {

                event.preventDefault();

                activate();

              }

            }
          );

        }
      );

  }


  /* ==========================================================
     OPEN
     ========================================================== */

  function open() {

    if (!overlay || !panel) {

      createInterface();

    }


    render();


    requestAnimationFrame(
      function () {

        overlay.classList.add(
          "open"
        );

        panel.classList.add(
          "open"
        );

      }
    );


    isOpen =
      true;


    document.body.dataset
      .misNexusNotificationOpen =
        "true";


    document.addEventListener(
      "keydown",
      keyboardHandler,
      true
    );


    document.body.style
      .overflow =
        "hidden";

  }


  /* ==========================================================
     CLOSE
     ========================================================== */

  function close() {

    if (
      !overlay ||
      !panel
    ) {

      return;

    }


    overlay.classList.remove(
      "open"
    );


    panel.classList.remove(
      "open"
    );


    isOpen =
      false;


    delete document.body
      .dataset
      .misNexusNotificationOpen;


    document.removeEventListener(
      "keydown",
      keyboardHandler,
      true
    );


    document.body.style
      .overflow =
        "";

  }


  /* ==========================================================
     TOGGLE
     ========================================================== */

  function toggle() {

    if (isOpen) {

      close();

    }

    else {

      open();

    }

  }


  /* ==========================================================
     KEYBOARD
     ========================================================== */

  function keyboardHandler(
    event
  ) {

    if (
      event.key === "Escape"
    ) {

      close();

    }

  }


  /* ==========================================================
     MARK ONE AS READ
     ========================================================== */

  function markRead(id) {

    notifications =
      notifications.map(
        notification => {

          if (
            notification.id === id
          ) {

            return {

              ...notification,

              read:
                true

            };

          }

          return notification;

        }
      );


    saveNotifications();

    render();

    updateExternalBadge();

  }


  /* ==========================================================
     MARK ALL READ
     ========================================================== */

  function markAllRead() {

    notifications =
      notifications.map(
        notification => ({

          ...notification,

          read:
            true

        })
      );


    saveNotifications();

    render();

    updateExternalBadge();

  }


  /* ==========================================================
     ADD NOTIFICATION
     ========================================================== */

  function add(notification) {

    if (
      !notification ||
      typeof notification !== "object"
    ) {

      return null;

    }


    const item = {

      id:
        notification.id ||
        generateID(),

      title:
        notification.title ||
        "New update",

      message:
        notification.message ||
        notification.body ||
        "",

      type:
        notification.type ||
        "system",

      timestamp:
        notification.timestamp ||
        Date.now(),

      read:
        notification.read === true

    };


    notifications =
      notifications.filter(
        existing =>
          existing.id !== item.id
      );


    notifications.unshift(
      item
    );


    notifications =
      notifications.slice(
        0,
        CONFIG.maximumNotifications
      );


    saveNotifications();

    render();

    updateExternalBadge();


    return item;

  }


  /* ==========================================================
     REMOVE NOTIFICATION
     ========================================================== */

  function remove(id) {

    notifications =
      notifications.filter(
        notification =>
          notification.id !== id
      );


    saveNotifications();

    render();

    updateExternalBadge();

  }


  /* ==========================================================
     CLEAR ALL
     ========================================================== */

  function clearAll() {

    notifications =
      [];

    saveNotifications();

    render();

    updateExternalBadge();

  }


  /* ==========================================================
     GET ALL
     ========================================================== */

  function getAll() {

    return notifications.map(
      notification => ({
        ...notification
      })
    );

  }


  /* ==========================================================
     UPDATE EXISTING BADGE
     ========================================================== */

  function updateExternalBadge() {

    const badge =
      document.getElementById(
        "notificationBadge"
      );


    if (!badge) {

      return;

    }


    const count =
      getUnreadCount();


    if (count <= 0) {

      badge.classList.remove(
        "visible"
      );

      badge.dataset.count =
        "0";

      badge.textContent =
        "";

      return;

    }


    badge.classList.add(
      "visible"
    );


    badge.dataset.count =
      String(
        Math.min(
          count,
          99
        )
      );


    if (
      count > 9
    ) {

      badge.textContent =
        count > 99
          ? "99+"
          : String(count);

    }

    else {

      badge.textContent =
        "";

    }

  }


  /* ==========================================================
     INTERCEPT NOTIFICATION LINK
     ========================================================== */

  function installLinkInterceptor() {

    document.addEventListener(

      "click",

      function (event) {

        const target =
          event.target.closest?.(
            'a[href="notifications.html"]'
          );


        if (!target) {

          return;

        }


        /*
          IMPORTANT:

          This prevents:

              notifications.html

          from opening.

          Instead the notification panel
          appears directly over the current
          application interface.
        */

        event.preventDefault();

        event.stopPropagation();

        event.stopImmediatePropagation();


        open();

      },

      true

    );

  }


  /* ==========================================================
     HANDLE CUSTOM NOTIFICATION BUTTONS
     ========================================================== */

  function installCustomTriggers() {

    document.addEventListener(

      "click",

      function (event) {

        const trigger =
          event.target.closest?.(
            "[data-open-notifications]"
          );


        if (!trigger) {

          return;

        }


        event.preventDefault();

        event.stopPropagation();

        open();

      },

      true

    );

  }


  /* ==========================================================
     CROSS TAB STORAGE
     ========================================================== */

  function installStorageListener() {

    window.addEventListener(

      "storage",

      function (event) {

        if (
          event.key ===
          CONFIG.storageKey
        ) {

          loadNotifications();

          render();

          updateExternalBadge();

        }

      }

    );

  }


  /* ==========================================================
     INTERNAL EVENT
     ========================================================== */

  function installInternalListener() {

    window.addEventListener(

      CONFIG.eventName,

      function () {

        loadNotifications();

        render();

        updateExternalBadge();

      }

    );

  }


  /* ==========================================================
     THEME
     ========================================================== */

  function getTheme() {

    try {

      const saved =
        localStorage.getItem(
          CONFIG.themeKey
        );


      if (
        saved === "silver" ||
        saved === "navy" ||
        saved === "light"
      ) {

        return saved;

      }

    }

    catch (error) {

      console.warn(
        error
      );

    }


    return CONFIG.defaultTheme;

  }


  function setTheme(theme) {

    const valid =
      [
        "silver",
        "navy",
        "light"
      ];


    if (
      !valid.includes(theme)
    ) {

      theme =
        CONFIG.defaultTheme;

    }


    document.documentElement
      .dataset
      .theme =
        theme;


    try {

      localStorage.setItem(
        CONFIG.themeKey,
        theme
      );

    }

    catch (error) {

      console.warn(
        error
      );

    }

  }


  /* ==========================================================
     INITIALIZE THEME
     ========================================================== */

  function initializeTheme() {

    setTheme(
      getTheme()
    );

  }


  /* ==========================================================
     SUPABASE-READY BRIDGE
     ========================================================== */

  function receiveRealtimeNotification(
    payload
  ) {

    if (!payload) {

      return;

    }


    /*
      Future Supabase Realtime data can
      be passed directly here.

      Example:

      MISNEXUSNotifications
        .receiveRealtimeNotification({
          id: "attendance-001",
          title: "Attendance Updated",
          message: "Your class attendance has been updated.",
          type: "attendance"
        });
    */


    const data =
      payload.new ||
      payload.record ||
      payload;


    add({

      id:
        data.id,

      title:
        data.title ||
        data.subject ||
        "New Update",

      message:
        data.message ||
        data.body ||
        data.description ||
        "",

      type:
        data.type ||
        "system",

      timestamp:
        data.created_at
          ? new Date(
              data.created_at
            ).getTime()
          : Date.now(),

      read:
        false

    });

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  window.MISNEXUSNotifications = {

    open:
      open,

    close:
      close,

    toggle:
      toggle,

    add:
      add,

    remove:
      remove,

    clearAll:
      clearAll,

    markRead:
      markRead,

    markAllRead:
      markAllRead,

    getAll:
      getAll,

    getUnreadCount:
      getUnreadCount,

    setTheme:
      setTheme,

    getTheme:
      getTheme,

    receiveRealtimeNotification:
      receiveRealtimeNotification

  };


  /* ==========================================================
     INITIALIZATION
     ========================================================== */

  function initialize() {

    if (initialized) {

      return;

    }


    initialized =
      true;


    createStyles();

    createInterface();

    loadNotifications();

    initializeTheme();

    installLinkInterceptor();

    installCustomTriggers();

    installStorageListener();

    installInternalListener();

    render();

    updateExternalBadge();

  }


  /* ==========================================================
     DOM READY
     ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once:
          true
      }
    );

  }

  else {

    initialize();

  }


})();