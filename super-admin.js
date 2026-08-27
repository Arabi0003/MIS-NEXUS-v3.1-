/* ========================================================================
   MIS-NEXUS™
   MISBAHUL 'ILM SCHOOLS ABUJA
   YALERIMA-TECHNOLOGIES / YALERIMA_GROUP

   SUPER ADMINISTRATOR ENGINE
   ------------------------------------------------------------------------
   Supabase schema correspondence:

   profiles
   teachers
   classes
   teacher_class_assignments
   students
   parents
   parent_students
   teacher_attendance
   student_attendance
   boarding_attendance
   security_events
   login_history
   audit_logs
   active_sessions
   login_ip_history
   notifications
   system_settings
   dashboard_themes
   background_settings
   report_exports
   system_activity
   school_profile
   super_admin_dashboard_stats
   teacher_dashboard_view
   daily_teacher_attendance_view
   daily_student_attendance_view

   IMPORTANT:
   Authentication/password creation is intentionally handled through
   Supabase Auth / Edge Functions. This browser file NEVER stores or
   exposes a Supabase service-role key.
========================================================================= */

'use strict';

/* =========================================================================
   01. SUPABASE CONFIGURATION
========================================================================= */

const MIS_NEXUS_CONFIG = Object.freeze({

    SUPABASE_URL:
        window.MIS_SUPABASE_URL ||
        'https://YOUR-PROJECT.supabase.co',

    SUPABASE_ANON_KEY:
        window.MIS_SUPABASE_ANON_KEY ||
        'YOUR_SUPABASE_PUBLISHABLE_KEY',

    EDGE_FUNCTIONS: Object.freeze({
        CREATE_TEACHER: 'create-teacher',
        SECURITY_EVENT: 'security-event',
        CREATE_SESSION: 'create-session',
        END_SESSION: 'end-session',
        RECORD_LOGIN: 'record-login',
        RECORD_ACTIVITY: 'record-activity',
        GET_CLIENT_IP: 'get-client-ip'
    }),

    SESSION_TIMEOUT_MINUTES: 5,

    REFRESH_INTERVAL:
        30000,

    CLOCK_INTERVAL:
        1000,

    NOTIFICATION_INTERVAL:
        15000,

    SESSION_ACTIVITY_INTERVAL:
        30000,

    LOCATION_TIMEOUT:
        10000,

    LOCATION_MAX_AGE:
        30000,

    SCHOOL_RADIUS_METERS:
        250
});


/* =========================================================================
   02. SUPABASE CLIENT
========================================================================= */

let supabaseClient = null;

function initializeSupabase() {

    if (!window.supabase) {

        console.error(
            'MIS-NEXUS™: Supabase SDK was not loaded.'
        );

        return null;
    }

    try {

        supabaseClient =
            window.supabase.createClient(
                MIS_NEXUS_CONFIG.SUPABASE_URL,
                MIS_NEXUS_CONFIG.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storageKey: 'mis-nexus-auth'
                    },

                    global: {
                        headers: {
                            'x-application-name':
                                'MIS-NEXUS'
                        }
                    }
                }
            );

        return supabaseClient;

    } catch (error) {

        console.error(
            'MIS-NEXUS™ Supabase initialization failed:',
            error
        );

        return null;
    }
}


/* =========================================================================
   03. GLOBAL APPLICATION STATE
========================================================================= */

const MIS_STATE = {

    initialized: false,

    destroyed: false,

    user: null,

    session: null,

    profile: null,

    school: null,

    currentTheme: null,

    currentBackground: null,

    currentPage: 'dashboard',

    selectedTeacher: null,

    selectedClass: null,

    selectedStudent: null,

    selectedNotification: null,

    teachers: [],

    classes: [],

    students: [],

    parents: [],

    notifications: [],

    sessions: [],

    loginHistory: [],

    ipHistory: [],

    securityEvents: [],

    auditLogs: [],

    activities: [],

    themes: [],

    backgrounds: [],

    settings: {},

    dashboardStats: null,

    location: null,

    clientIP: null,

    sessionId: null,

    sessionStartedAt: null,

    lastActivity:
        Date.now(),

    idleWarningShown: false,

    loading: false,

    realtimeChannels: [],

    timers: [],

    eventHandlers: [],

    cache: new Map(),

    pagination: {
        teachers: 0,
        classes: 0,
        students: 0,
        notifications: 0,
        auditLogs: 0,
        securityEvents: 0
    }
};


/* =========================================================================
   04. DOM CACHE
========================================================================= */

const DOM = {

    root:
        document.documentElement,

    body:
        document.body,

    app:
        document.querySelector(
            '#app'
        ),

    loading:
        document.querySelector(
            '#globalLoading'
        ),

    loadingLogo:
        document.querySelector(
            '#loadingLogo'
        ),

    loadingText:
        document.querySelector(
            '#loadingText'
        ),

    clock:
        document.querySelector(
            '#liveClock'
        ),

    date:
        document.querySelector(
            '#liveDate'
        ),

    prayer:
        document.querySelector(
            '#nextPrayer'
        ),

    previousPrayer:
        document.querySelector(
            '#previousPrayer'
        ),

    notificationButton:
        document.querySelector(
            '#notificationButton'
        ),

    notificationBadge:
        document.querySelector(
            '#notificationBadge'
        ),

    notificationPanel:
        document.querySelector(
            '#notificationPanel'
        ),

    notificationList:
        document.querySelector(
            '#notificationList'
        ),

    profileName:
        document.querySelector(
            '#profileName'
        ),

    profileRole:
        document.querySelector(
            '#profileRole'
        ),

    avatar:
        document.querySelector(
            '#profileAvatar'
        ),

    teacherCount:
        document.querySelector(
            '#teacherCount'
        ),

    activeTeacherCount:
        document.querySelector(
            '#activeTeacherCount'
        ),

    classCount:
        document.querySelector(
            '#classCount'
        ),

    studentCount:
        document.querySelector(
            '#studentCount'
        ),

    teacherPresent:
        document.querySelector(
            '#teacherPresent'
        ),

    teacherAbsent:
        document.querySelector(
            '#teacherAbsent'
        ),

    teacherLate:
        document.querySelector(
            '#teacherLate'
        ),

    studentPresent:
        document.querySelector(
            '#studentPresent'
        ),

    studentAbsent:
        document.querySelector(
            '#studentAbsent'
        ),

    teacherTable:
        document.querySelector(
            '#teacherTable'
        ),

    teacherTableBody:
        document.querySelector(
            '#teacherTableBody'
        ),

    classTable:
        document.querySelector(
            '#classTable'
        ),

    classTableBody:
        document.querySelector(
            '#classTableBody'
        ),

    studentTable:
        document.querySelector(
            '#studentTable'
        ),

    studentTableBody:
        document.querySelector(
            '#studentTableBody'
        ),

    themePanel:
        document.querySelector(
            '#themePanel'
        ),

    themeList:
        document.querySelector(
            '#themeList'
        ),

    backgroundPanel:
        document.querySelector(
            '#backgroundPanel'
        ),

    backgroundList:
        document.querySelector(
            '#backgroundList'
        ),

    settingsPanel:
        document.querySelector(
            '#settingsPanel'
        ),

    auditTableBody:
        document.querySelector(
            '#auditTableBody'
        ),

    securityTableBody:
        document.querySelector(
            '#securityTableBody'
        ),

    sessionTableBody:
        document.querySelector(
            '#sessionTableBody'
        ),

    ipTableBody:
        document.querySelector(
            '#ipTableBody'
        ),

    reportTable:
        document.querySelector(
            '#reportTable'
        ),

    toast:
        document.querySelector(
            '#toast'
        ),

    toastTitle:
        document.querySelector(
            '#toastTitle'
        ),

    toastMessage:
        document.querySelector(
            '#toastMessage'
        ),

    modal:
        document.querySelector(
            '#appModal'
        ),

    modalTitle:
        document.querySelector(
            '#modalTitle'
        ),

    modalBody:
        document.querySelector(
            '#modalBody'
        ),

    modalClose:
        document.querySelector(
            '#modalClose'
        ),

    logoutButton:
        document.querySelector(
            '#logoutButton'
        ),

    search:
        document.querySelector(
            '#globalSearch'
        ),

    navigation:
        document.querySelector(
            '#mainNavigation'
        )
};


/* =========================================================================
   05. GENERIC DOM HELPERS
========================================================================= */

function $(selector, parent = document) {

    return parent.querySelector(selector);
}


function $all(selector, parent = document) {

    return [
        ...parent.querySelectorAll(selector)
    ];
}


function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';
    }

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


function safeText(value) {

    return escapeHTML(value ?? '');
}


function uuid() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === 'function'
    ) {

        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}


function debounce(
    callback,
    delay = 300
) {

    let timer = null;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(
            () => callback(...args),
            delay
        );
    };
}


function throttle(
    callback,
    delay = 250
) {

    let last = 0;

    return (...args) => {

        const now =
            Date.now();

        if (
            now - last >= delay
        ) {

            last = now;

            callback(...args);
        }
    };
}


/* =========================================================================
   06. LOADING SYSTEM
========================================================================= */

function showLoading(
    message = 'Loading MIS-NEXUS™...'
) {

    MIS_STATE.loading = true;

    if (
        DOM.loadingText
    ) {

        DOM.loadingText.textContent =
            message;
    }

    if (
        DOM.loading
    ) {

        DOM.loading.hidden = false;

        DOM.loading.classList.add(
            'active'
        );
    }

    document.body.classList.add(
        'is-loading'
    );
}


function hideLoading() {

    MIS_STATE.loading = false;

    if (
        DOM.loading
    ) {

        DOM.loading.classList.remove(
            'active'
        );

        window.setTimeout(
            () => {

                DOM.loading.hidden =
                    true;

            },
            250
        );
    }

    document.body.classList.remove(
        'is-loading'
    );
}


function loading(
    message,
    promise
) {

    showLoading(message);

    return Promise.resolve(promise)
        .finally(
            hideLoading
        );
}


/* =========================================================================
   07. TOAST SYSTEM
========================================================================= */

let toastTimer = null;


function showToast(
    title,
    message,
    type = 'info',
    duration = 4000
) {

    if (
        !DOM.toast
    ) {

        console.log(
            `[${type}] ${title}: ${message}`
        );

        return;
    }

    if (
        toastTimer
    ) {

        clearTimeout(
            toastTimer
        );
    }

    DOM.toast.dataset.type =
        type;

    if (
        DOM.toastTitle
    ) {

        DOM.toastTitle.textContent =
            title;
    }

    if (
        DOM.toastMessage
    ) {

        DOM.toastMessage.textContent =
            message;
    }

    DOM.toast.classList.add(
        'visible'
    );

    toastTimer =
        setTimeout(
            () => {

                DOM.toast.classList.remove(
                    'visible'
                );

            },
            duration
        );
}


function success(
    message,
    title = 'Success'
) {

    showToast(
        title,
        message,
        'success'
    );
}


function errorToast(
    message,
    title = 'Error'
) {

    showToast(
        title,
        message,
        'error',
        6000
    );
}


function warning(
    message,
    title = 'Warning'
) {

    showToast(
        title,
        message,
        'warning'
    );
}


function info(
    message,
    title = 'MIS-NEXUS™'
) {

    showToast(
        title,
        message,
        'info'
    );
}


/* =========================================================================
   08. SUPABASE QUERY WRAPPER
========================================================================= */

async function db(
    table,
    operation
) {

    if (!supabaseClient) {

        throw new Error(
            'Supabase client is not initialized.'
        );
    }

    try {

        return await operation(
            supabaseClient
                .from(table)
        );

    } catch (error) {

        console.error(
            `MIS-NEXUS™ database error [${table}]`,
            error
        );

        throw error;
    }
}


async function selectRows(
    table,
    {
        columns = '*',
        filters = [],
        orderBy = null,
        ascending = false,
        limit = null
    } = {}
) {

    let query =
        supabaseClient
            .from(table)
            .select(columns);

    for (
        const filter of filters
    ) {

        if (
            !filter ||
            !filter.method
        ) {

            continue;
        }

        const {
            method,
            args = []
        } = filter;

        query =
            query[method](...args);
    }

    if (
        orderBy
    ) {

        query =
            query.order(
                orderBy,
                {
                    ascending
                }
            );
    }

    if (
        Number.isInteger(limit)
    ) {

        query =
            query.limit(
                limit
            );
    }

    const {
        data,
        error
    } =
        await query;

    if (error) {

        throw error;
    }

    return data || [];
}


async function insertRow(
    table,
    payload,
    options = {}
) {

    let query =
        supabaseClient
            .from(table)
            .insert(payload);

    if (
        options.select
    ) {

        query =
            query.select(
                options.select === true
                    ? '*'
                    : options.select
            );
    }

    if (
        options.single
    ) {

        query =
            query.single();
    }

    const {
        data,
        error
    } =
        await query;

    if (error) {

        throw error;
    }

    return data;
}


async function updateRows(
    table,
    payload,
    filters = []
) {

    let query =
        supabaseClient
            .from(table)
            .update(payload);

    for (
        const filter of filters
    ) {

        if (
            !filter ||
            !filter.method
        ) {

            continue;
        }

        query =
            query[
                filter.method
            ](
                ...(filter.args || [])
            );
    }

    const {
        data,
        error
    } =
        await query
            .select();

    if (error) {

        throw error;
    }

    return data || [];
}


async function deleteRows(
    table,
    filters = []
) {

    let query =
        supabaseClient
            .from(table)
            .delete();

    for (
        const filter of filters
    ) {

        query =
            query[
                filter.method
            ](
                ...(filter.args || [])
            );
    }

    const {
        data,
        error
    } =
        await query
            .select();

    if (error) {

        throw error;
    }

    return data || [];
}


/* =========================================================================
   09. AUTHENTICATION GUARD
========================================================================= */

async function getSession() {

    if (!supabaseClient) {

        throw new Error(
            'Supabase is unavailable.'
        );
    }

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getSession();

    if (error) {

        throw error;
    }

    return data.session;
}


async function requireAuthenticatedUser() {

    const session =
        await getSession();

    if (!session) {

        redirectToLogin();

        return null;
    }

    MIS_STATE.session =
        session;

    MIS_STATE.user =
        session.user;

    return session.user;
}


function redirectToLogin() {

    const loginPages = [
        'login.html',
        'index.html',
        'admin-login.html'
    ];

    const current =
        location.pathname
            .split('/')
            .pop();

    if (
        loginPages.includes(current)
    ) {

        return;
    }

    window.location.replace(
        'login.html'
    );
}


/* =========================================================================
   10. PROFILE AUTHORIZATION
========================================================================= */

async function loadCurrentProfile() {

    if (
        !MIS_STATE.user
    ) {

        return null;
    }

    const rows =
        await selectRows(
            'profiles',
            {
                columns: '*',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'id',
                            MIS_STATE.user.id
                        ]
                    }
                ],
                limit: 1
            }
        );

    const profile =
        rows[0] || null;

    MIS_STATE.profile =
        profile;

    return profile;
}


async function requireSuperAdmin() {

    const profile =
        await loadCurrentProfile();

    if (!profile) {

        await safeSignOut(
            'No MIS-NEXUS™ profile was found.'
        );

        return false;
    }

    if (
        profile.role !==
        'super_admin'
    ) {

        errorToast(
            'This dashboard is restricted to the Super Administrator.'
        );

        await safeSignOut(
            'Unauthorized dashboard access.'
        );

        return false;
    }

    if (
        profile.status !==
        'active'
    ) {

        errorToast(
            'Your administrator account is not active.'
        );

        await safeSignOut(
            'Inactive account.'
        );

        return false;
    }

    return true;
}


/* =========================================================================
   11. SCHOOL PROFILE
========================================================================= */

async function loadSchoolProfile() {

    const rows =
        await selectRows(
            'school_profile',
            {
                columns: '*',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'active',
                            true
                        ]
                    }
                ],
                orderBy:
                    'created_at',
                ascending: true,
                limit: 1
            }
        );

    MIS_STATE.school =
        rows[0] || null;

    applySchoolBranding();

    return MIS_STATE.school;
}


function applySchoolBranding() {

    const school =
        MIS_STATE.school;

    if (!school) {

        return;
    }

    document
        .querySelectorAll(
            '[data-school-name]'
        )
        .forEach(
            element => {

                element.textContent =
                    school.school_name ||
                    'MISBAHUL \'ILM SCHOOLS ABUJA';
            }
        );

    document
        .querySelectorAll(
            '[data-brand-name]'
        )
        .forEach(
            element => {

                element.textContent =
                    school.brand_name ||
                    'MIS-NEXUS™';
            }
        );

    document
        .querySelectorAll(
            '[data-watermark]'
        )
        .forEach(
            element => {

                element.textContent =
                    school.watermark ||
                    'MIS_ABUJA';
            }
        );

    if (
        school.logo_url
    ) {

        document
            .querySelectorAll(
                'img[data-school-logo]'
            )
            .forEach(
                image => {

                    image.src =
                        school.logo_url;
                }
            );
    }

    document.title =
        'MIS-NEXUS™ | Super Administrator';
}


/* =========================================================================
   12. USER HEADER
========================================================================= */

function renderCurrentUser() {

    const profile =
        MIS_STATE.profile;

    if (!profile) {

        return;
    }

    if (
        DOM.profileName
    ) {

        DOM.profileName.textContent =
            profile.full_name ||
            MIS_STATE.user.email ||
            'Super Administrator';
    }

    if (
        DOM.profileRole
    ) {

        DOM.profileRole.textContent =
            'SUPER ADMINISTRATOR';
    }

    if (
        DOM.avatar
    ) {

        DOM.avatar.src =
            profile.avatar_url ||
            DOM.avatar.src ||
            '';
    }
}


/* =========================================================================
   13. LIVE NIGERIAN CLOCK
========================================================================= */

function updateNigerianClock() {

    const now =
        new Date();

    const formatter =
        new Intl.DateTimeFormat(
            'en-NG',
            {
                timeZone:
                    'Africa/Lagos',
                hour:
                    '2-digit',
                minute:
                    '2-digit',
                second:
                    '2-digit',
                hour12:
                    true
            }
        );

    const dateFormatter =
        new Intl.DateTimeFormat(
            'en-NG',
            {
                timeZone:
                    'Africa/Lagos',
                weekday:
                    'long',
                day:
                    '2-digit',
                month:
                    'long',
                year:
                    'numeric'
            }
        );

    if (
        DOM.clock
    ) {

        DOM.clock.textContent =
            formatter.format(now);
    }

    if (
        DOM.date
    ) {

        DOM.date.textContent =
            dateFormatter.format(now);
    }
}


/* =========================================================================
   14. PRAYER TIME ENGINE
========================================================================= */

const PRAYER_API =
    'https://api.aladhan.com/v1/timingsByCity';


async function loadPrayerTimes() {

    try {

        const school =
            MIS_STATE.school;

        const city =
            school?.city ||
            'Abuja';

        const country =
            school?.country ||
            'Nigeria';

        const url =
            `${PRAYER_API}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=3`;

        const response =
            await fetch(
                url,
                {
                    method: 'GET',
                    cache: 'no-store'
                }
            );

        if (!response.ok) {

            throw new Error(
                'Prayer service unavailable.'
            );
        }

        const result =
            await response.json();

        const timings =
            result?.data?.timings;

        if (!timings) {

            return;
        }

        const prayers = [
            ['Fajr', timings.Fajr],
            ['Dhuhr', timings.Dhuhr],
            ['Asr', timings.Asr],
            ['Maghrib', timings.Maghrib],
            ['Isha', timings.Isha]
        ];

        const now =
            new Date();

        const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();

        let previous = null;
        let next = null;

        for (
            const [
                name,
                value
            ] of prayers
        ) {

            const clean =
                String(value)
                    .split(' ')[0];

            const [
                hour,
                minute
            ] =
                clean
                    .split(':')
                    .map(Number);

            const prayerMinutes =
                hour * 60 +
                minute;

            if (
                prayerMinutes <=
                currentMinutes
            ) {

                previous = {
                    name,
                    value: clean
                };

            } else if (
                !next
            ) {

                next = {
                    name,
                    value: clean
                };
            }
        }

        if (!next) {

            next = {
                name: 'Fajr',
                value:
                    prayers[0][1]
            };
        }

        if (
            DOM.prayer
        ) {

            DOM.prayer.textContent =
                `${next.name} • ${next.value}`;
        }

        if (
            DOM.previousPrayer
        ) {

            DOM.previousPrayer.textContent =
                previous
                    ? `${previous.name} • ${previous.value}`
                    : '—';
        }

    } catch (error) {

        console.warn(
            'Prayer timing unavailable:',
            error
        );

        if (
            DOM.prayer
        ) {

            DOM.prayer.textContent =
                'Prayer timing unavailable';
        }
    }
}


/* =========================================================================
   15. GEOLOCATION
========================================================================= */

async function requestLocation() {

    if (
        !navigator.geolocation
    ) {

        return null;
    }

    return new Promise(
        resolve => {

            navigator.geolocation.getCurrentPosition(
                position => {

                    MIS_STATE.location = {

                        latitude:
                            Number(
                                position.coords.latitude
                            ),

                        longitude:
                            Number(
                                position.coords.longitude
                            ),

                        accuracy:
                            Number(
                                position.coords.accuracy
                            )
                    };

                    resolve(
                        MIS_STATE.location
                    );
                },

                () => {

                    MIS_STATE.location =
                        null;

                    resolve(null);
                },

                {
                    enableHighAccuracy:
                        true,

                    timeout:
                        MIS_NEXUS_CONFIG.LOCATION_TIMEOUT,

                    maximumAge:
                        MIS_NEXUS_CONFIG.LOCATION_MAX_AGE
                }
            );
        }
    );
}


function getLocationPayload() {

    if (
        !MIS_STATE.location
    ) {

        return {
            latitude: null,
            longitude: null,
            accuracy_meters: null
        };
    }

    return {

        latitude:
            MIS_STATE.location.latitude,

        longitude:
            MIS_STATE.location.longitude,

        accuracy_meters:
            MIS_STATE.location.accuracy
    };
}


/* =========================================================================
   16. CLIENT IP
========================================================================= */

async function detectClientIP() {

    try {

        const response =
            await fetch(
                'https://api.ipify.org?format=json',
                {
                    cache: 'no-store'
                }
            );

        if (!response.ok) {

            throw new Error(
                'IP service failed.'
            );
        }

        const data =
            await response.json();

        MIS_STATE.clientIP =
            data.ip || null;

        return MIS_STATE.clientIP;

    } catch {

        MIS_STATE.clientIP =
            null;

        return null;
    }
}


/* =========================================================================
   17. EDGE FUNCTION CALLER
========================================================================= */

async function invokeEdgeFunction(
    functionName,
    body = {}
) {

    if (!supabaseClient) {

        throw new Error(
            'Supabase is not initialized.'
        );
    }

    const {
        data,
        error
    } =
        await supabaseClient.functions.invoke(
            functionName,
            {
                body
            }
        );

    if (error) {

        throw error;
    }

    return data;
}


/* =========================================================================
   18. SECURITY EVENT
========================================================================= */

async function recordSecurityEvent(
    eventType,
    {
        success = true,
        failureReason = null,
        metadata = {}
    } = {}
) {

    try {

        const location =
            getLocationPayload();

        return await invokeEdgeFunction(
            MIS_NEXUS_CONFIG.EDGE_FUNCTIONS.SECURITY_EVENT,
            {

                user_id:
                    MIS_STATE.user?.id,

                profile_id:
                    MIS_STATE.profile?.id,

                event_type:
                    eventType,

                success,

                failure_reason:
                    failureReason,

                ip_address:
                    MIS_STATE.clientIP,

                latitude:
                    location.latitude,

                longitude:
                    location.longitude,

                accuracy_meters:
                    location.accuracy_meters,

                user_agent:
                    navigator.userAgent,

                device_id:
                    getDeviceID(),

                session_id:
                    MIS_STATE.sessionId,

                metadata
            }
        );

    } catch (error) {

        console.warn(
            'Security event could not be recorded:',
            error
        );

        return null;
    }
}


/* =========================================================================
   19. DEVICE IDENTIFIER
========================================================================= */

function getDeviceID() {

    const key =
        'mis-nexus-device-id';

    let id =
        localStorage.getItem(key);

    if (!id) {

        id =
            uuid();

        localStorage.setItem(
            key,
            id
        );
    }

    return id;
}


/* =========================================================================
   20. SESSION ENGINE
========================================================================= */

async function createApplicationSession() {

    if (!MIS_STATE.user) {

        return null;
    }

    MIS_STATE.sessionId =
        uuid();

    MIS_STATE.sessionStartedAt =
        new Date();

    MIS_STATE.lastActivity =
        Date.now();

    try {

        const location =
            await requestLocation();

        const result =
            await invokeEdgeFunction(
                MIS_NEXUS_CONFIG.EDGE_FUNCTIONS.CREATE_SESSION,
                {

                    user_id:
                        MIS_STATE.user.id,

                    session_id:
                        MIS_STATE.sessionId,

                    device_id:
                        getDeviceID(),

                    device_name:
                        navigator.userAgent,

                    ip_address:
                        MIS_STATE.clientIP,

                    latitude:
                        location?.latitude ??
                        null,

                    longitude:
                        location?.longitude ??
                        null,

                    expires_at:
                        new Date(
                            Date.now() +
                            MIS_NEXUS_CONFIG
                                .SESSION_TIMEOUT_MINUTES *
                            60 *
                            1000
                        ).toISOString()
                }
            );

        return result;

    } catch (error) {

        console.warn(
            'Active session registration failed:',
            error
        );

        return null;
    }
}


/* =========================================================================
   21. SESSION ACTIVITY
========================================================================= */

function registerActivity() {

    MIS_STATE.lastActivity =
        Date.now();

    MIS_STATE.idleWarningShown =
        false;
}


async function refreshApplicationSession() {

    if (
        !MIS_STATE.sessionId ||
        !MIS_STATE.user
    ) {

        return;
    }

    try {

        await updateRows(
            'active_sessions',
            {
                last_activity_at:
                    new Date().toISOString()
            },
            [
                {
                    method: 'eq',
                    args: [
                        'session_id',
                        MIS_STATE.sessionId
                    ]
                },

                {
                    method: 'eq',
                    args: [
                        'user_id',
                        MIS_STATE.user.id
                    ]
                }
            ]
        );

    } catch (error) {

        console.warn(
            'Session heartbeat failed:',
            error
        );
    }
}


/* =========================================================================
   22. AUTOMATIC INACTIVITY LOGOUT
========================================================================= */

function checkInactivity() {

    const elapsed =
        Date.now() -
        MIS_STATE.lastActivity;

    const timeout =
        MIS_NEXUS_CONFIG
            .SESSION_TIMEOUT_MINUTES *
        60 *
        1000;

    const warningPoint =
        timeout -
        60 *
        1000;

    if (
        elapsed >= warningPoint &&
        !MIS_STATE.idleWarningShown
    ) {

        MIS_STATE.idleWarningShown =
            true;

        warning(
            'You will be automatically logged out after five minutes of inactivity.'
        );
    }

    if (
        elapsed >= timeout
    ) {

        autoLogout();
    }
}


async function autoLogout() {

    await recordSecurityEvent(
        'session_expired',
        {
            metadata: {
                reason:
                    'Inactivity timeout'
            }
        }
    );

    await safeSignOut(
        'Your MIS-NEXUS™ session expired because of inactivity.'
    );
}


/* =========================================================================
   23. SIGN OUT
========================================================================= */

async function safeSignOut(
    message = null
) {

    try {

        if (
            MIS_STATE.sessionId
        ) {

            try {

                await invokeEdgeFunction(
                    MIS_NEXUS_CONFIG
                        .EDGE_FUNCTIONS.END_SESSION,
                    {
                        user_id:
                            MIS_STATE.user?.id,

                        session_id:
                            MIS_STATE.sessionId,

                        logout_reason:
                            message ||
                            'User logout'
                    }
                );

            } catch (error) {

                console.warn(
                    'Secure session termination failed:',
                    error
                );
            }
        }

        await recordSecurityEvent(
            'logout',
            {
                metadata: {
                    reason:
                        message ||
                        'User logout'
                }
            }
        );

        await supabaseClient
            .auth
            .signOut();

    } catch (error) {

        console.error(
            'Logout error:',
            error
        );

        try {

            await supabaseClient
                .auth
                .signOut();

        } catch {

            // Intentionally ignored.
        }

    } finally {

        MIS_STATE.destroyed =
            true;

        sessionStorage.clear();

        window.location.replace(
            'login.html'
        );
    }
}


/* =========================================================================
   24. DASHBOARD STATISTICS
========================================================================= */

async function loadDashboardStatistics() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                'super_admin_dashboard_stats'
            )
            .select('*')
            .single();

    if (error) {

        throw error;
    }

    MIS_STATE.dashboardStats =
        data;

    renderDashboardStatistics(
        data
    );

    return data;
}


function setValue(
    element,
    value
) {

    if (
        element
    ) {

        element.textContent =
            Number(value || 0)
                .toLocaleString(
                    'en-NG'
                );
    }
}


function renderDashboardStatistics(
    stats
) {

    if (!stats) {

        return;
    }

    setValue(
        DOM.teacherCount,
        stats.total_teachers
    );

    setValue(
        DOM.activeTeacherCount,
        stats.active_teachers
    );

    setValue(
        DOM.classCount,
        stats.active_classes
    );

    setValue(
        DOM.studentCount,
        stats.active_students
    );

    setValue(
        DOM.teacherPresent,
        stats.teachers_present_today
    );

    setValue(
        DOM.teacherAbsent,
        stats.teachers_absent_today
    );

    setValue(
        DOM.teacherLate,
        stats.teachers_late_today
    );

    setValue(
        DOM.studentPresent,
        stats.students_present_today
    );

    setValue(
        DOM.studentAbsent,
        stats.students_absent_today
    );
}


/* =========================================================================
   25. TEACHERS
========================================================================= */

async function loadTeachers() {

    const teachers =
        await selectRows(
            'teachers',
            {
                columns: '*',
                orderBy:
                    'created_at',
                ascending:
                    false
            }
        );

    MIS_STATE.teachers =
        teachers;

    renderTeachers(
        teachers
    );

    return teachers;
}


function teacherStatusClass(
    status
) {

    return String(
        status || 'unknown'
    )
        .toLowerCase()
        .replaceAll(
            '_',
            '-'
        );
}


function renderTeachers(
    teachers
) {

    if (
        !DOM.teacherTableBody
    ) {

        return;
    }

    if (!teachers.length) {

        DOM.teacherTableBody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        No teachers have been registered.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    DOM.teacherTableBody.innerHTML =
        teachers
            .map(
                teacher => `

                    <tr
                        data-teacher-id="${safeText(teacher.id)}"
                    >

                        <td>
                            ${safeText(
                                teacher.teacher_id
                            )}
                        </td>

                        <td>
                            <strong>
                                ${safeText(
                                    teacher.full_name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${safeText(
                                teacher.department ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                teacher.designation ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                teacher.phone ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                teacher.email ||
                                '—'
                            )}
                        </td>

                        <td>
                            <span
                                class="status-badge ${teacherStatusClass(
                                    teacher.status
                                )}"
                            >
                                ${safeText(
                                    teacher.status
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                teacher.temporary_password_required
                                    ? 'Required'
                                    : 'Completed'
                            }
                        </td>

                        <td>
                            ${
                                formatDate(
                                    teacher.created_at
                                )
                            }
                        </td>

                        <td>
                            <div class="row-actions">

                                <button
                                    type="button"
                                    data-action="view-teacher"
                                    data-id="${safeText(teacher.id)}"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    data-action="edit-teacher"
                                    data-id="${safeText(teacher.id)}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    data-action="teacher-status"
                                    data-id="${safeText(teacher.id)}"
                                >
                                    Status
                                </button>

                            </div>
                        </td>

                    </tr>
                `
            )
            .join('');
}


/* =========================================================================
   26. CREATE TEACHER ACCOUNT
========================================================================= */

async function createTeacherAccount(
    teacherData
) {

    if (
        MIS_STATE.profile?.role !==
        'super_admin'
    ) {

        throw new Error(
            'Only a Super Administrator may create teacher accounts.'
        );
    }

    if (
        !teacherData.teacher_id
    ) {

        throw new Error(
            'Teacher ID is required.'
        );
    }

    if (
        !teacherData.full_name
    ) {

        throw new Error(
            'Teacher full name is required.'
        );
    }

    const existing =
        await selectRows(
            'teachers',
            {
                columns:
                    'id,teacher_id',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'teacher_id',
                            teacherData.teacher_id
                        ]
                    }
                ],
                limit: 1
            }
        );

    if (existing.length) {

        throw new Error(
            'That Teacher ID already exists.'
        );
    }

    /*
       The actual Supabase Auth account must be created
       server-side through the Edge Function.
    */

    const result =
        await invokeEdgeFunction(
            MIS_NEXUS_CONFIG
                .EDGE_FUNCTIONS.CREATE_TEACHER,
            {

                teacher_id:
                    teacherData.teacher_id,

                full_name:
                    teacherData.full_name,

                first_name:
                    teacherData.first_name ||
                    null,

                middle_name:
                    teacherData.middle_name ||
                    null,

                last_name:
                    teacherData.last_name ||
                    null,

                gender:
                    teacherData.gender ||
                    null,

                phone:
                    teacherData.phone ||
                    null,

                email:
                    teacherData.email ||
                    null,

                qualification:
                    teacherData.qualification ||
                    null,

                department:
                    teacherData.department ||
                    null,

                designation:
                    teacherData.designation ||
                    null,

                employment_date:
                    teacherData.employment_date ||
                    null,

                address:
                    teacherData.address ||
                    null,

                emergency_contact_name:
                    teacherData.emergency_contact_name ||
                    null,

                emergency_contact_phone:
                    teacherData.emergency_contact_phone ||
                    null,

                notes:
                    teacherData.notes ||
                    null,

                assigned_by:
                    MIS_STATE.user.id
            }
        );

    await writeAudit(
        'CREATE_TEACHER',
        'teachers',
        result?.teacher?.id || null,
        'Created teacher account',
        null,
        result?.teacher || teacherData
    );

    await loadTeachers();

    await loadDashboardStatistics();

    success(
        'Teacher account created successfully.'
    );

    return result;
}


/* =========================================================================
   27. UPDATE TEACHER
========================================================================= */

async function updateTeacher(
    teacherUUID,
    changes
) {

    const rows =
        await updateRows(
            'teachers',
            {
                ...changes,
                updated_at:
                    new Date().toISOString()
            },
            [
                {
                    method: 'eq',
                    args: [
                        'id',
                        teacherUUID
                    ]
                }
            ]
        );

    await writeAudit(
        'UPDATE_TEACHER',
        'teachers',
        teacherUUID,
        'Updated teacher record',
        null,
        changes
    );

    await loadTeachers();

    return rows[0] || null;
}


/* =========================================================================
   28. TEACHER STATUS
========================================================================= */

async function changeTeacherStatus(
    teacherUUID,
    status
) {

    const allowed = [
        'active',
        'inactive',
        'suspended',
        'pending',
        'locked'
    ];

    if (
        !allowed.includes(status)
    ) {

        throw new Error(
            'Invalid teacher account status.'
        );
    }

    const teacher =
        MIS_STATE.teachers.find(
            item =>
                item.id ===
                teacherUUID
        );

    const result =
        await updateTeacher(
            teacherUUID,
            {
                status
            }
        );

    await writeAudit(
        'CHANGE_TEACHER_STATUS',
        'teachers',
        teacherUUID,
        `Changed teacher status to ${status}`,
        teacher || null,
        result || null
    );

    return result;
}


/* =========================================================================
   29. CLASSES
========================================================================= */

async function loadClasses() {

    const classes =
        await selectRows(
            'classes',
            {
                columns: '*',
                orderBy:
                    'class_order',
                ascending:
                    true
            }
        );

    MIS_STATE.classes =
        classes;

    renderClasses(
        classes
    );

    return classes;
}


function renderClasses(
    classes
) {

    if (
        !DOM.classTableBody
    ) {

        return;
    }

    if (!classes.length) {

        DOM.classTableBody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        No classes have been registered.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    DOM.classTableBody.innerHTML =
        classes
            .map(
                item => {

                    const teacher =
                        MIS_STATE.teachers
                            .find(
                                teacher =>
                                    teacher.id ===
                                    item.class_teacher_id
                            );

                    return `

                        <tr
                            data-class-id="${safeText(item.id)}"
                        >

                            <td>
                                ${safeText(
                                    item.class_code
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${safeText(
                                        item.class_name
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${safeText(
                                    item.section ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.level ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.academic_year ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.room_name ||
                                    '—'
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    item.capacity ??
                                    '—'
                                )}
                            </td>

                            <td>
                                ${safeText(
                                    teacher?.full_name ||
                                    'Not assigned'
                                )}
                            </td>

                            <td>
                                <span class="status-badge ${
                                    item.active
                                        ? 'active'
                                        : 'inactive'
                                }">
                                    ${
                                        item.active
                                            ? 'Active'
                                            : 'Inactive'
                                    }
                                </span>
                            </td>

                            <td>

                                <div class="row-actions">

                                    <button
                                        type="button"
                                        data-action="view-class"
                                        data-id="${safeText(item.id)}"
                                    >
                                        View
                                    </button>

                                    <button
                                        type="button"
                                        data-action="edit-class"
                                        data-id="${safeText(item.id)}"
                                    >
                                        Edit
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join('');
}


/* =========================================================================
   30. CREATE CLASS
========================================================================= */

async function createClass(
    classData
) {

    if (
        !MIS_STATE.profile ||
        ![
            'super_admin',
            'school_admin'
        ].includes(
            MIS_STATE.profile.role
        )
    ) {

        throw new Error(
            'You do not have permission to create classes.'
        );
    }

    const payload = {

        class_code:
            classData.class_code,

        class_name:
            classData.class_name,

        section:
            classData.section ||
            null,

        level:
            classData.level ||
            null,

        academic_year:
            classData.academic_year ||
            null,

        class_order:
            Number(
                classData.class_order
            ) || null,

        room_name:
            classData.room_name ||
            null,

        capacity:
            classData.capacity
                ? Number(
                    classData.capacity
                )
                : null,

        class_teacher_id:
            classData.class_teacher_id ||
            null,

        active:
            classData.active !== false,

        created_by:
            MIS_STATE.user.id
    };

    const created =
        await insertRow(
            'classes',
            payload,
            {
                select: true,
                single: true
            }
        );

    await writeAudit(
        'CREATE_CLASS',
        'classes',
        created?.id || null,
        'Created class',
        null,
        created
    );

    await loadClasses();

    await loadDashboardStatistics();

    success(
        'Class created successfully.'
    );

    return created;
}


/* =========================================================================
   31. UPDATE CLASS
========================================================================= */

async function updateClass(
    classUUID,
    changes
) {

    const result =
        await updateRows(
            'classes',
            {
                ...changes,
                updated_at:
                    new Date().toISOString()
            },
            [
                {
                    method: 'eq',
                    args: [
                        'id',
                        classUUID
                    ]
                }
            ]
        );

    await writeAudit(
        'UPDATE_CLASS',
        'classes',
        classUUID,
        'Updated class',
        null,
        changes
    );

    await loadClasses();

    return result[0] || null;
}


/* =========================================================================
   32. DELETE CLASS
========================================================================= */

async function deleteClass(
    classUUID
) {

    if (
        MIS_STATE.profile?.role !==
        'super_admin'
    ) {

        throw new Error(
            'Only the Super Administrator can delete classes.'
        );
    }

    const target =
        MIS_STATE.classes.find(
            item =>
                item.id ===
                classUUID
        );

    if (!target) {

        throw new Error(
            'Class not found.'
        );
    }

    await deleteRows(
        'classes',
        [
            {
                method: 'eq',
                args: [
                    'id',
                    classUUID
                ]
            }
        ]
    );

    await writeAudit(
        'DELETE_CLASS',
        'classes',
        classUUID,
        'Deleted class',
        target,
        null
    );

    await loadClasses();

    await loadDashboardStatistics();

    success(
        'Class deleted.'
    );
}


/* =========================================================================
   33. STUDENTS
========================================================================= */

async function loadStudents() {

    const students =
        await selectRows(
            'students',
            {
                columns: '*',
                orderBy:
                    'created_at',
                ascending:
                    false
            }
        );

    MIS_STATE.students =
        students;

    renderStudents(
        students
    );

    return students;
}


function getClassName(
    classId
) {

    return MIS_STATE.classes
        .find(
            item =>
                item.id === classId
        )
        ?.class_name ||
        'Unassigned';
}


function renderStudents(
    students
) {

    if (
        !DOM.studentTableBody
    ) {

        return;
    }

    if (!students.length) {

        DOM.studentTableBody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        No students have been registered.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    DOM.studentTableBody.innerHTML =
        students
            .map(
                student => `

                    <tr>

                        <td>
                            ${safeText(
                                student.student_id
                            )}
                        </td>

                        <td>
                            ${safeText(
                                student.admission_number ||
                                '—'
                            )}
                        </td>

                        <td>
                            <strong>
                                ${safeText(
                                    [
                                        student.first_name,
                                        student.middle_name,
                                        student.last_name
                                    ]
                                        .filter(Boolean)
                                        .join(' ')
                                )}
                            </strong>
                        </td>

                        <td>
                            ${safeText(
                                student.gender ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                getClassName(
                                    student.class_id
                                )
                            )}
                        </td>

                        <td>
                            ${
                                student.boarding_student
                                    ? 'Boarder'
                                    : 'Day Student'
                            }
                        </td>

                        <td>
                            ${safeText(
                                student.phone ||
                                '—'
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${
                                teacherStatusClass(
                                    student.status
                                )
                            }">
                                ${safeText(
                                    student.status
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatDate(
                                student.created_at
                            )}
                        </td>

                    </tr>
                `
            )
            .join('');
}


/* =========================================================================
   34. TEACHER-CLASS ASSIGNMENTS
========================================================================= */

async function loadTeacherAssignments(
    teacherId = null,
    classId = null
) {

    const filters = [];

    if (teacherId) {

        filters.push({
            method: 'eq',
            args: [
                'teacher_id',
                teacherId
            ]
        });
    }

    if (classId) {

        filters.push({
            method: 'eq',
            args: [
                'class_id',
                classId
            ]
        });
    }

    return await selectRows(
        'teacher_class_assignments',
        {
            columns: '*',
            filters,
            orderBy:
                'created_at',
            ascending:
                false
        }
    );
}


async function createTeacherAssignment(
    payload
) {

    const created =
        await insertRow(
            'teacher_class_assignments',
            {
                teacher_id:
                    payload.teacher_id,

                class_id:
                    payload.class_id,

                subject_name:
                    payload.subject_name ||
                    null,

                is_primary_teacher:
                    Boolean(
                        payload.is_primary_teacher
                    ),

                academic_year:
                    payload.academic_year ||
                    null,

                active:
                    payload.active !== false,

                assigned_by:
                    MIS_STATE.user.id
            },
            {
                select: true,
                single: true
            }
        );

    await writeAudit(
        'CREATE_TEACHER_CLASS_ASSIGNMENT',
        'teacher_class_assignments',
        created?.id || null,
        'Assigned teacher to class',
        null,
        created
    );

    success(
        'Teacher assignment created.'
    );

    return created;
}


/* =========================================================================
   35. NOTIFICATIONS
========================================================================= */

async function loadNotifications() {

    if (
        !MIS_STATE.user
    ) {

        return [];
    }

    const rows =
        await selectRows(
            'notifications',
            {
                columns: '*',
                filters: [
                    {
                        method: 'or',
                        args: [
                            `recipient_id.eq.${MIS_STATE.user.id},recipient_id.is.null`
                        ]
                    }
                ],
                orderBy:
                    'created_at',
                ascending:
                    false,
                limit:
                    100
            }
        );

    MIS_STATE.notifications =
        rows;

    renderNotifications(
        rows
    );

    updateNotificationBadge(
        rows
    );

    return rows;
}


function renderNotifications(
    notifications
) {

    if (
        !DOM.notificationList
    ) {

        return;
    }

    if (!notifications.length) {

        DOM.notificationList.innerHTML = `
            <div class="notification-empty">
                <strong>No notifications</strong>
                <span>Everything is up to date.</span>
            </div>
        `;

        return;
    }

    DOM.notificationList.innerHTML =
        notifications
            .map(
                notification => `

                    <article
                        class="notification-item ${
                            notification.read
                                ? 'read'
                                : 'unread'
                        }"
                        data-notification-id="${safeText(
                            notification.id
                        )}"
                    >

                        <div class="notification-icon">
                            ${getNotificationIcon(
                                notification.notification_type
                            )}
                        </div>

                        <div class="notification-content">

                            <strong>
                                ${safeText(
                                    notification.title
                                )}
                            </strong>

                            <p>
                                ${safeText(
                                    notification.message
                                )}
                            </p>

                            <time>
                                ${formatDateTime(
                                    notification.created_at
                                )}
                            </time>

                        </div>

                    </article>
                `
            )
            .join('');
}


function getNotificationIcon(
    type
) {

    const icons = {

        attendance:
            '✓',

        security:
            '⌁',

        warning:
            '⚠',

        system:
            '◆',

        teacher:
            '◉',

        student:
            '●'
    };

    return icons[type] ||
        icons.system;
}


function updateNotificationBadge(
    notifications
) {

    const unread =
        notifications.filter(
            item =>
                !item.read
        ).length;

    if (
        DOM.notificationBadge
    ) {

        DOM.notificationBadge.textContent =
            unread > 99
                ? '99+'
                : String(unread);

        DOM.notificationBadge.hidden =
            unread === 0;
    }
}


async function markNotificationRead(
    notificationId
) {

    const result =
        await updateRows(
            'notifications',
            {
                read:
                    true,

                read_at:
                    new Date()
                        .toISOString()
            },
            [
                {
                    method: 'eq',
                    args: [
                        'id',
                        notificationId
                    ]
                },

                {
                    method: 'eq',
                    args: [
                        'recipient_id',
                        MIS_STATE.user.id
                    ]
                }
            ]
        );

    await loadNotifications();

    return result;
}


async function markAllNotificationsRead() {

    await updateRows(
        'notifications',
        {
            read:
                true,

            read_at:
                new Date()
                    .toISOString()
        },
        [
            {
                method: 'eq',
                args: [
                    'recipient_id',
                    MIS_STATE.user.id
                ]
            },

            {
                method: 'eq',
                args: [
                    'read',
                    false
                ]
            }
        ]
    );

    await loadNotifications();

    success(
        'All notifications marked as read.'
    );
}


/* =========================================================================
   36. THEMES
========================================================================= */

async function loadThemes() {

    const themes =
        await selectRows(
            'dashboard_themes',
            {
                columns: '*',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'active',
                            true
                        ]
                    }
                ],
                orderBy:
                    'created_at',
                ascending:
                    true
            }
        );

    MIS_STATE.themes =
        themes;

    renderThemes(
        themes
    );

    return themes;
}


function renderThemes(
    themes
) {

    if (
        !DOM.themeList
    ) {

        return;
    }

    DOM.themeList.innerHTML =
        themes
            .map(
                theme => `

                    <button
                        type="button"
                        class="theme-option"
                        data-theme="${safeText(
                            theme.theme_key
                        )}"
                        style="
                            --theme-primary:${safeText(
                                theme.primary_color
                            )};
                            --theme-secondary:${safeText(
                                theme.secondary_color
                            )};
                            --theme-accent:${safeText(
                                theme.accent_color
                            )};
                        "
                    >

                        <span
                            class="theme-preview"
                        ></span>

                        <span>
                            ${safeText(
                                theme.theme_name
                            )}
                        </span>

                    </button>
                `
            )
            .join('');
}


function applyTheme(
    theme
) {

    if (!theme) {

        return;
    }

    MIS_STATE.currentTheme =
        theme;

    const root =
        document.documentElement;

    root.style.setProperty(
        '--theme-primary',
        theme.primary_color ||
        ''
    );

    root.style.setProperty(
        '--theme-secondary',
        theme.secondary_color ||
        ''
    );

    root.style.setProperty(
        '--theme-accent',
        theme.accent_color ||
        ''
    );

    root.style.setProperty(
        '--theme-background',
        theme.background_color ||
        ''
    );

    root.style.setProperty(
        '--theme-text',
        theme.text_color ||
        ''
    );

    root.dataset.theme =
        theme.theme_key;

    localStorage.setItem(
        'mis-nexus-theme',
        theme.theme_key
    );
}


async function selectTheme(
    themeKey
) {

    const theme =
        MIS_STATE.themes.find(
            item =>
                item.theme_key ===
                themeKey
        );

    if (!theme) {

        return;
    }

    applyTheme(
        theme
    );

    await writeSystemActivity(
        'THEME_CHANGED',
        'appearance',
        `Changed dashboard theme to ${theme.theme_name}`,
        {
            theme_key:
                theme.theme_key
        }
    );
}


/* =========================================================================
   37. BACKGROUNDS
========================================================================= */

async function loadBackgrounds() {

    const backgrounds =
        await selectRows(
            'background_settings',
            {
                columns: '*',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'active',
                            true
                        ]
                    }
                ],
                orderBy:
                    'created_at',
                ascending:
                    false
            }
        );

    MIS_STATE.backgrounds =
        backgrounds;

    renderBackgrounds(
        backgrounds
    );

    const active =
        backgrounds.find(
            item =>
                item.active
        );

    if (active) {

        applyBackground(
            active
        );
    }

    return backgrounds;
}


function renderBackgrounds(
    backgrounds
) {

    if (
        !DOM.backgroundList
    ) {

        return;
    }

    DOM.backgroundList.innerHTML =
        backgrounds
            .map(
                background => `

                    <button
                        type="button"
                        class="background-option"
                        data-background-id="${safeText(
                            background.id
                        )}"
                    >

                        <span>
                            ${safeText(
                                background.name
                            )}
                        </span>

                        <small>
                            ${safeText(
                                background.background_type
                            )}
                        </small>

                    </button>
                `
            )
            .join('');
}


function applyBackground(
    background
) {

    if (!background) {

        return;
    }

    MIS_STATE.currentBackground =
        background;

    const body =
        document.body;

    const opacity =
        Number(
            background.opacity ??
            0.66
        );

    body.style.setProperty(
        '--background-opacity',
        String(opacity)
    );

    switch (
        background.background_type
    ) {

        case 'image':

            body.style.backgroundImage =
                `linear-gradient(
                    rgba(0,0,0,${Math.max(
                        0,
                        Math.min(
                            1,
                            1 - opacity
                        )
                    )}),
                    rgba(0,0,0,${Math.max(
                        0,
                        Math.min(
                            1,
                            1 - opacity
                        )
                    )})
                ),
                url("${background.value}")`;

            break;

        case 'gradient':

            body.style.backgroundImage =
                background.value ||
                '';

            break;

        case 'video':

            body.style.backgroundImage =
                '';

            break;

        default:

            body.style.backgroundImage =
                '';

            break;
    }
}


async function activateBackground(
    backgroundId
) {

    if (
        MIS_STATE.profile?.role !==
        'super_admin'
    ) {

        throw new Error(
            'Only Super Administrator can change system backgrounds.'
        );
    }

    await updateRows(
        'background_settings',
        {
            active:
                false
        },
        [
            {
                method: 'eq',
                args: [
                    'active',
                    true
                ]
            }
        ]
    );

    const activated =
        await updateRows(
            'background_settings',
            {
                active:
                    true
            },
            [
                {
                    method: 'eq',
                    args: [
                        'id',
                        backgroundId
                    ]
                }
            ]
        );

    await loadBackgrounds();

    await writeAudit(
        'CHANGE_BACKGROUND',
        'background_settings',
        backgroundId,
        'Changed administrator dashboard background',
        null,
        activated[0] || null
    );

    success(
        'Dashboard background updated.'
    );
}


/* =========================================================================
   38. SYSTEM SETTINGS
========================================================================= */

async function loadSystemSettings() {

    const rows =
        await selectRows(
            'system_settings',
            {
                columns: '*',
                orderBy:
                    'setting_key',
                ascending:
                    true
            }
        );

    MIS_STATE.settings =
        Object.fromEntries(
            rows.map(
                row => [
                    row.setting_key,
                    row.setting_value
                ]
            )
        );

    renderSystemSettings(
        rows
    );

    return rows;
}


function renderSystemSettings(
    rows
) {

    if (
        !DOM.settingsPanel
    ) {

        return;
    }

    const container =
        DOM.settingsPanel;

    const existing =
        container.querySelector(
            '[data-settings-generated]'
        );

    if (existing) {

        existing.remove();
    }

    const wrapper =
        document.createElement(
            'div'
        );

    wrapper.dataset.settingsGenerated =
        'true';

    wrapper.className =
        'settings-generated';

    wrapper.innerHTML =
        rows
            .map(
                setting => `

                    <div
                        class="setting-row"
                        data-setting-key="${safeText(
                            setting.setting_key
                        )}"
                    >

                        <div>

                            <strong>
                                ${formatSettingName(
                                    setting.setting_key
                                )}
                            </strong>

                            <small>
                                ${safeText(
                                    setting.description ||
                                    ''
                                )}
                            </small>

                        </div>

                        <code>
                            ${safeText(
                                stringifyJSON(
                                    setting.setting_value
                                )
                            )}
                        </code>

                    </div>
                `
            )
            .join('');

    container.appendChild(
        wrapper
    );
}


function formatSettingName(
    key
) {

    return String(key || '')
        .replaceAll(
            '_',
            ' '
        )
        .replace(
            /\b\w/g,
            char =>
                char.toUpperCase()
        );
}


function stringifyJSON(
    value
) {

    if (
        typeof value ===
        'string'
    ) {

        return value;
    }

    try {

        return JSON.stringify(
            value
        );

    } catch {

        return String(
            value
        );
    }
}


/* =========================================================================
   39. AUDIT LOGS
========================================================================= */

async function loadAuditLogs(
    limit = 200
) {

    const rows =
        await selectRows(
            'audit_logs',
            {
                columns: '*',
                orderBy:
                    'created_at',
                ascending:
                    false,
                limit
            }
        );

    MIS_STATE.auditLogs =
        rows;

    renderAuditLogs(
        rows
    );

    return rows;
}


function renderAuditLogs(
    logs
) {

    if (
        !DOM.auditTableBody
    ) {

        return;
    }

    DOM.auditTableBody.innerHTML =
        logs.length
            ? logs.map(
                log => `

                    <tr>

                        <td>
                            ${formatDateTime(
                                log.created_at
                            )}
                        </td>

                        <td>
                            ${safeText(
                                log.actor_role ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                log.action
                            )}
                        </td>

                        <td>
                            ${safeText(
                                log.entity_type ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                log.description ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                log.ip_address ||
                                '—'
                            )}
                        </td>

                    </tr>
                `
            ).join('')
            : `
                <tr>
                    <td colspan="6">
                        No audit activity.
                    </td>
                </tr>
            `;
}


/* =========================================================================
   40. AUDIT WRITER
========================================================================= */

async function writeAudit(
    action,
    entityType = null,
    entityId = null,
    description = null,
    beforeData = null,
    afterData = null,
    metadata = {}
) {

    if (
        !MIS_STATE.user
    ) {

        return null;
    }

    const location =
        getLocationPayload();

    const payload = {

        actor_id:
            MIS_STATE.user.id,

        actor_role:
            MIS_STATE.profile?.role ||
            'super_admin',

        action,

        entity_type:
            entityType,

        entity_id:
            entityId,

        description,

        ip_address:
            MIS_STATE.clientIP,

        latitude:
            location.latitude,

        longitude:
            location.longitude,

        user_agent:
            navigator.userAgent,

        before_data:
            beforeData,

        after_data:
            afterData,

        metadata
    };

    try {

        return await invokeEdgeFunction(
            MIS_NEXUS_CONFIG
                .EDGE_FUNCTIONS.RECORD_ACTIVITY,
            {
                type:
                    'audit',

                payload
            }
        );

    } catch (error) {

        console.warn(
            'Audit event could not be written through Edge Function:',
            error
        );

        /*
           Direct insertion is intentionally not used as the primary
           mechanism because audit logs are security-sensitive.
        */

        return null;
    }
}


/* =========================================================================
   41. SECURITY EVENTS VIEW
========================================================================= */

async function loadSecurityEvents(
    limit = 200
) {

    const rows =
        await selectRows(
            'security_events',
            {
                columns: '*',
                orderBy:
                    'event_time',
                ascending:
                    false,
                limit
            }
        );

    MIS_STATE.securityEvents =
        rows;

    renderSecurityEvents(
        rows
    );

    return rows;
}


function renderSecurityEvents(
    rows
) {

    if (
        !DOM.securityTableBody
    ) {

        return;
    }

    DOM.securityTableBody.innerHTML =
        rows.length
            ? rows.map(
                event => `

                    <tr>

                        <td>
                            ${formatDateTime(
                                event.event_time
                            )}
                        </td>

                        <td>
                            ${safeText(
                                event.event_type
                            )}
                        </td>

                        <td>
                            ${
                                event.success
                                    ? 'Successful'
                                    : 'Failed'
                            }
                        </td>

                        <td>
                            ${safeText(
                                event.ip_address ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                event.latitude ??
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                event.longitude ??
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                event.failure_reason ||
                                '—'
                            )}
                        </td>

                    </tr>
                `
            ).join('')
            : `
                <tr>
                    <td colspan="7">
                        No security events.
                    </td>
                </tr>
            `;
}


/* =========================================================================
   42. LOGIN HISTORY
========================================================================= */

async function loadLoginHistory(
    limit = 200
) {

    const rows =
        await selectRows(
            'login_history',
            {
                columns: '*',
                orderBy:
                    'login_at',
                ascending:
                    false,
                limit
            }
        );

    MIS_STATE.loginHistory =
        rows;

    return rows;
}


/* =========================================================================
   43. LOGIN IP HISTORY
========================================================================= */

async function loadIPHistory() {

    const rows =
        await selectRows(
            'login_ip_history',
            {
                columns: '*',
                orderBy:
                    'last_seen_at',
                ascending:
                    false
            }
        );

    MIS_STATE.ipHistory =
        rows;

    renderIPHistory(
        rows
    );

    return rows;
}


function renderIPHistory(
    rows
) {

    if (
        !DOM.ipTableBody
    ) {

        return;
    }

    DOM.ipTableBody.innerHTML =
        rows.length
            ? rows.map(
                row => `

                    <tr>

                        <td>
                            ${safeText(
                                row.ip_address
                            )}
                        </td>

                        <td>
                            ${safeText(
                                row.login_count
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                row.first_seen_at
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                row.last_seen_at
                            )}
                        </td>

                        <td>
                            ${safeText(
                                row.last_latitude ??
                                '—'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                row.last_longitude ??
                                '—'
                            )}
                        </td>

                        <td>
                            ${
                                row.trusted
                                    ? 'Trusted'
                                    : 'Untrusted'
                            }
                        </td>

                        <td>
                            ${
                                row.blocked
                                    ? 'Blocked'
                                    : 'Allowed'
                            }
                        </td>

                        <td>

                            ${
                                MIS_STATE.profile?.role ===
                                'super_admin'
                                    ? `
                                        <button
                                            type="button"
                                            data-action="toggle-ip-block"
                                            data-id="${safeText(row.id)}"
                                            data-blocked="${String(
                                                row.blocked
                                            )}"
                                        >
                                            ${
                                                row.blocked
                                                    ? 'Unblock'
                                                    : 'Block'
                                            }
                                        </button>
                                      `
                                    : ''
                            }

                        </td>

                    </tr>
                `
            ).join('')
            : `
                <tr>
                    <td colspan="9">
                        No login IP history.
                    </td>
                </tr>
            `;
}


/* =========================================================================
   44. BLOCK / UNBLOCK IP
========================================================================= */

async function toggleIPBlock(
    recordId,
    blocked
) {

    if (
        MIS_STATE.profile?.role !==
        'super_admin'
    ) {

        throw new Error(
            'Only the Super Administrator may modify IP security.'
        );
    }

    await updateRows(
        'login_ip_history',
        {
            blocked:
                !blocked
        },
        [
            {
                method: 'eq',
                args: [
                    'id',
                    recordId
                ]
            }
        ]
    );

    await writeAudit(
        blocked
            ? 'UNBLOCK_IP'
            : 'BLOCK_IP',
        'login_ip_history',
        recordId,
        blocked
            ? 'Unblocked login IP'
            : 'Blocked login IP',
        {
            blocked
        },
        {
            blocked:
                !blocked
        }
    );

    await loadIPHistory();

    success(
        blocked
            ? 'IP address unblocked.'
            : 'IP address blocked.'
    );
}


/* =========================================================================
   45. ACTIVE SESSIONS
========================================================================= */

async function loadActiveSessions() {

    const rows =
        await selectRows(
            'active_sessions',
            {
                columns: '*',
                orderBy:
                    'last_activity_at',
                ascending:
                    false,
                limit:
                    200
            }
        );

    MIS_STATE.sessions =
        rows;

    renderActiveSessions(
        rows
    );

    return rows;
}


function renderActiveSessions(
    sessions
) {

    if (
        !DOM.sessionTableBody
    ) {

        return;
    }

    DOM.sessionTableBody.innerHTML =
        sessions.length
            ? sessions.map(
                session => `

                    <tr>

                        <td>
                            ${safeText(
                                session.session_id
                            )}
                        </td>

                        <td>
                            ${safeText(
                                session.device_name ||
                                'Unknown'
                            )}
                        </td>

                        <td>
                            ${safeText(
                                session.ip_address ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                session.started_at
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                session.last_activity_at
                            )}
                        </td>

                        <td>
                            ${
                                session.revoked
                                    ? 'Revoked'
                                    : 'Active'
                            }
                        </td>

                        <td>

                            ${
                                !session.revoked
                                    ? `
                                        <button
                                            type="button"
                                            data-action="revoke-session"
                                            data-id="${safeText(session.id)}"
                                        >
                                            Revoke
                                        </button>
                                      `
                                    : ''
                            }

                        </td>

                    </tr>
                `
            ).join('')
            : `
                <tr>
                    <td colspan="7">
                        No active sessions.
                    </td>
                </tr>
            `;
}


/* =========================================================================
   46. REVOKE SESSION
========================================================================= */

async function revokeSession(
    sessionUUID
) {

    if (
        MIS_STATE.profile?.role !==
        'super_admin'
    ) {

        throw new Error(
            'Only Super Administrator can revoke sessions.'
        );
    }

    await updateRows(
        'active_sessions',
        {
            revoked:
                true,

            revoked_at:
                new Date().toISOString(),

            revoked_by:
                MIS_STATE.user.id
        },
        [
            {
                method: 'eq',
                args: [
                    'id',
                    sessionUUID
                ]
            }
        ]
    );

    await writeAudit(
        'REVOKE_SESSION',
        'active_sessions',
        sessionUUID,
        'Revoked active user session'
    );

    await loadActiveSessions();

    success(
        'Session revoked.'
    );
}


/* =========================================================================
   47. SYSTEM ACTIVITY
========================================================================= */

async function loadSystemActivity(
    limit = 200
) {

    const rows =
        await selectRows(
            'system_activity',
            {
                columns: '*',
                orderBy:
                    'created_at',
                ascending:
                    false,
                limit
            }
        );

    MIS_STATE.activities =
        rows;

    return rows;
}


async function writeSystemActivity(
    activityType,
    module,
    message,
    metadata = {}
) {

    try {

        return await invokeEdgeFunction(
            MIS_NEXUS_CONFIG
                .EDGE_FUNCTIONS.RECORD_ACTIVITY,
            {

                type:
                    'system_activity',

                payload: {

                    actor_id:
                        MIS_STATE.user?.id ||
                        null,

                    activity_type:
                        activityType,

                    module:
                        module,

                    message:
                        message,

                    metadata
                }
            }
        );

    } catch (error) {

        console.warn(
            'System activity was not recorded:',
            error
        );

        return null;
    }
}


/* =========================================================================
   48. TEACHER ATTENDANCE
========================================================================= */

async function loadTeacherAttendance(
    date = null
) {

    const targetDate =
        date ||
        getLocalDate();

    const rows =
        await selectRows(
            'daily_teacher_attendance_view',
            {
                columns: '*',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'attendance_date',
                            targetDate
                        ]
                    }
                ],
                orderBy:
                    'full_name',
                ascending:
                    true
            }
        );

    return rows;
}


/* =========================================================================
   49. STUDENT ATTENDANCE
========================================================================= */

async function loadStudentAttendance(
    date = null
) {

    const targetDate =
        date ||
        getLocalDate();

    const rows =
        await selectRows(
            'daily_student_attendance_view',
            {
                columns: '*',
                filters: [
                    {
                        method: 'eq',
                        args: [
                            'attendance_date',
                            targetDate
                        ]
                    }
                ],
                orderBy:
                    'student_name',
                ascending:
                    true
            }
        );

    return rows;
}


/* =========================================================================
   50. BOARDING ATTENDANCE
========================================================================= */

async function loadBoardingAttendance(
    date = null
) {

    const targetDate =
        date ||
        getLocalDate();

    return await selectRows(
        'boarding_attendance',
        {
            columns: '*',
            filters: [
                {
                    method: 'eq',
                    args: [
                        'scan_date',
                        targetDate
                    ]
                }
            ],
            orderBy:
                'scan_time',
            ascending:
                false
        }
    );
}


/* =========================================================================
   51. REPORT GENERATION
========================================================================= */

async function generateTeacherAttendanceReport(
    startDate,
    endDate
) {

    const rows =
        await selectRows(
            'teacher_attendance',
            {
                columns: '*',
                filters: [
                    {
                        method: 'gte',
                        args: [
                            'attendance_date',
                            startDate
                        ]
                    },

                    {
                        method: 'lte',
                        args: [
                            'attendance_date',
                            endDate
                        ]
                    }
                ],
                orderBy:
                    'attendance_date',
                ascending:
                    false
            }
        );

    const teacherMap =
        new Map(
            MIS_STATE.teachers.map(
                teacher => [
                    teacher.id,
                    teacher
                ]
            )
        );

    const report =
        rows.map(
            row => {

                const teacher =
                    teacherMap.get(
                        row.teacher_id
                    );

                return {

                    Date:
                        row.attendance_date,

                    'Teacher ID':
                        teacher?.teacher_id ||
                        '',

                    'Teacher Name':
                        teacher?.full_name ||
                        '',

                    Department:
                        teacher?.department ||
                        '',

                    Status:
                        row.status,

                    'Check In':
                        row.check_in_at ||
                        '',

                    'Check Out':
                        row.check_out_at ||
                        '',

                    Method:
                        row.method,

                    Latitude:
                        row.latitude ??
                        '',

                    Longitude:
                        row.longitude ??
                        '',

                    Accuracy:
                        row.accuracy_meters ??
                        '',

                    'Inside School':
                        row.inside_school ??
                        '',

                    IP:
                        row.ip_address ||
                        ''
                };
            }
        );

    return report;
}


/* =========================================================================
   52. STUDENT REPORT
========================================================================= */

async function generateStudentAttendanceReport(
    startDate,
    endDate
) {

    const rows =
        await selectRows(
            'student_attendance',
            {
                columns: '*',
                filters: [
                    {
                        method: 'gte',
                        args: [
                            'attendance_date',
                            startDate
                        ]
                    },

                    {
                        method: 'lte',
                        args: [
                            'attendance_date',
                            endDate
                        ]
                    }
                ],
                orderBy:
                    'attendance_date',
                ascending:
                    false
            }
        );

    const studentMap =
        new Map(
            MIS_STATE.students.map(
                student => [
                    student.id,
                    student
                ]
            )
        );

    return rows.map(
        row => {

            const student =
                studentMap.get(
                    row.student_id
                );

            return {

                Date:
                    row.attendance_date,

                'Student ID':
                    student?.student_id ||
                    '',

                'Admission Number':
                    student?.admission_number ||
                    '',

                'Student Name':
                    [
                        student?.first_name,
                        student?.middle_name,
                        student?.last_name
                    ]
                        .filter(Boolean)
                        .join(' '),

                Class:
                    getClassName(
                        student?.class_id
                    ),

                Status:
                    row.status,

                'Check In':
                    row.check_in_at ||
                    '',

                'Check Out':
                    row.check_out_at ||
                    '',

                Method:
                    row.method,

                Latitude:
                    row.latitude ??
                    '',

                Longitude:
                    row.longitude ??
                    '',

                Accuracy:
                    row.accuracy_meters ??
                    '',

                'Inside School':
                    row.inside_school ??
                    '',

                IP:
                    row.ip_address ||
                    ''
            };
        }
    );
}


/* =========================================================================
   53. CSV EXPORT
========================================================================= */

function convertToCSV(
    rows
) {

    if (
        !rows ||
        !rows.length
    ) {

        return '';
    }

    const headers =
        Object.keys(
            rows[0]
        );

    const escapeCSV =
        value => {

            const stringValue =
                String(
                    value ??
                    ''
                );

            return `"${stringValue
                .replaceAll(
                    '"',
                    '""'
                )}"`;
        };

    const lines = [

        headers
            .map(escapeCSV)
            .join(','),

        ...rows.map(
            row =>
                headers
                    .map(
                        header =>
                            escapeCSV(
                                row[header]
                            )
                    )
                    .join(',')
        )
    ];

    return lines.join(
        '\r\n'
    );
}


function downloadTextFile(
    filename,
    content,
    mime =
        'text/plain;charset=utf-8'
) {

    const blob =
        new Blob(
            [
                content
            ],
            {
                type: mime
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const anchor =
        document.createElement(
            'a'
        );

    anchor.href =
        url;

    anchor.download =
        filename;

    document.body.appendChild(
        anchor
    );

    anchor.click();

    anchor.remove();

    window.setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1000
    );
}


/* =========================================================================
   54. EXPORT REPORT
========================================================================= */

async function exportTeacherReport(
    startDate,
    endDate
) {

    const report =
        await generateTeacherAttendanceReport(
            startDate,
            endDate
        );

    if (!report.length) {

        warning(
            'No teacher attendance records were found for this period.'
        );

        return;
    }

    const csv =
        convertToCSV(
            report
        );

    downloadTextFile(
        `MIS-NEXUS-Teacher-Attendance-${startDate}-to-${endDate}.csv`,
        csv,
        'text/csv;charset=utf-8'
    );

    await recordReportExport(
        'teacher_attendance',
        startDate,
        endDate,
        'csv',
        report.length
    );

    success(
        'Teacher attendance report exported.'
    );
}


async function exportStudentReport(
    startDate,
    endDate
) {

    const report =
        await generateStudentAttendanceReport(
            startDate,
            endDate
        );

    if (!report.length) {

        warning(
            'No student attendance records were found for this period.'
        );

        return;
    }

    const csv =
        convertToCSV(
            report
        );

    downloadTextFile(
        `MIS-NEXUS-Student-Attendance-${startDate}-to-${endDate}.csv`,
        csv,
        'text/csv;charset=utf-8'
    );

    await recordReportExport(
        'student_attendance',
        startDate,
        endDate,
        'csv',
        report.length
    );

    success(
        'Student attendance report exported.'
    );
}


/* =========================================================================
   55. REPORT EXPORT HISTORY
========================================================================= */

async function recordReportExport(
    reportType,
    startDate,
    endDate,
    format,
    rowCount
) {

    try {

        return await insertRow(
            'report_exports',
            {

                generated_by:
                    MIS_STATE.user.id,

                report_type:
                    reportType,

                period_start:
                    startDate,

                period_end:
                    endDate,

                file_format:
                    format,

                row_count:
                    rowCount,

                filters: {}
            },
            {
                select: true,
                single: true
            }
        );

    } catch (error) {

        console.warn(
            'Report export history could not be saved:',
            error
        );

        return null;
    }
}


/* =========================================================================
   56. SEARCH ENGINE
========================================================================= */

function searchAll(
    query
) {

    const term =
        String(
            query ||
            ''
        )
            .trim()
            .toLowerCase();

    if (!term) {

        return {
            teachers:
                MIS_STATE.teachers,

            classes:
                MIS_STATE.classes,

            students:
                MIS_STATE.students
        };
    }

    const teachers =
        MIS_STATE.teachers.filter(
            teacher =>
                [
                    teacher.teacher_id,
                    teacher.full_name,
                    teacher.department,
                    teacher.designation,
                    teacher.phone,
                    teacher.email
                ]
                    .filter(Boolean)
                    .some(
                        value =>
                            String(value)
                                .toLowerCase()
                                .includes(term)
                    )
        );

    const classes =
        MIS_STATE.classes.filter(
            item =>
                [
                    item.class_code,
                    item.class_name,
                    item.section,
                    item.level,
                    item.academic_year,
                    item.room_name
                ]
                    .filter(Boolean)
                    .some(
                        value =>
                            String(value)
                                .toLowerCase()
                                .includes(term)
                    )
        );

    const students =
        MIS_STATE.students.filter(
            student =>
                [
                    student.student_id,
                    student.admission_number,
                    student.first_name,
                    student.middle_name,
                    student.last_name,
                    student.phone
                ]
                    .filter(Boolean)
                    .some(
                        value =>
                            String(value)
                                .toLowerCase()
                                .includes(term)
                    )
        );

    return {
        teachers,
        classes,
        students
    };
}


/* =========================================================================
   57. FORMATTERS
========================================================================= */

function formatDate(
    value
) {

    if (!value) {

        return '—';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return '—';
    }

    return new Intl.DateTimeFormat(
        'en-NG',
        {
            day:
                '2-digit',

            month:
                'short',

            year:
                'numeric'
        }
    ).format(date);
}


function formatDateTime(
    value
) {

    if (!value) {

        return '—';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return '—';
    }

    return new Intl.DateTimeFormat(
        'en-NG',
        {
            dateStyle:
                'medium',

            timeStyle:
                'short'
        }
    ).format(date);
}


function getLocalDate(
    date = new Date()
) {

    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    'Africa/Lagos',

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit'
            }
        )
            .formatToParts(date)
            .reduce(
                (acc, part) => {

                    acc[part.type] =
                        part.value;

                    return acc;
                },
                {}
            );

    return `${parts.year}-${parts.month}-${parts.day}`;
}


/* =========================================================================
   58. MODAL
========================================================================= */

function openModal(
    title,
    content
) {

    if (
        !DOM.modal
    ) {

        return;
    }

    if (
        DOM.modalTitle
    ) {

        DOM.modalTitle.textContent =
            title;
    }

    if (
        DOM.modalBody
    ) {

        if (
            typeof content ===
            'string'
        ) {

            DOM.modalBody.innerHTML =
                content;

        } else {

            DOM.modalBody.replaceChildren(
                content
            );
        }
    }

    DOM.modal.hidden =
        false;

    DOM.modal.classList.add(
        'visible'
    );

    document.body.classList.add(
        'modal-open'
    );
}


function closeModal() {

    if (
        !DOM.modal
    ) {

        return;
    }

    DOM.modal.classList.remove(
        'visible'
    );

    document.body.classList.remove(
        'modal-open'
    );

    window.setTimeout(
        () => {

            DOM.modal.hidden =
                true;

        },
        200
    );
}


/* =========================================================================
   59. TEACHER VIEW MODAL
========================================================================= */

function showTeacherDetails(
    teacherId
) {

    const teacher =
        MIS_STATE.teachers.find(
            item =>
                item.id ===
                teacherId
        );

    if (!teacher) {

        return;
    }

    MIS_STATE.selectedTeacher =
        teacher;

    openModal(
        'Teacher Profile',
        `

            <div class="profile-detail">

                <div class="profile-detail-header">

                    <div class="profile-detail-avatar">

                        ${
                            teacher.profile_photo_url
                                ? `
                                    <img
                                        src="${safeText(
                                            teacher.profile_photo_url
                                        )}"
                                        alt=""
                                    >
                                  `
                                : `
                                    <span>
                                        ${safeText(
                                            teacher.full_name
                                                .charAt(0)
                                        )}
                                    </span>
                                  `
                        }

                    </div>

                    <div>

                        <h3>
                            ${safeText(
                                teacher.full_name
                            )}
                        </h3>

                        <p>
                            Teacher ID:
                            ${safeText(
                                teacher.teacher_id
                            )}
                        </p>

                    </div>

                </div>

                <div class="detail-grid">

                    <div>
                        <small>Department</small>
                        <strong>
                            ${safeText(
                                teacher.department ||
                                '—'
                            )}
                        </strong>
                    </div>

                    <div>
                        <small>Designation</small>
                        <strong>
                            ${safeText(
                                teacher.designation ||
                                '—'
                            )}
                        </strong>
                    </div>

                    <div>
                        <small>Phone</small>
                        <strong>
                            ${safeText(
                                teacher.phone ||
                                '—'
                            )}
                        </strong>
                    </div>

                    <div>
                        <small>Email</small>
                        <strong>
                            ${safeText(
                                teacher.email ||
                                '—'
                            )}
                        </strong>
                    </div>

                    <div>
                        <small>Status</small>
                        <strong>
                            ${safeText(
                                teacher.status
                            )}
                        </strong>
                    </div>

                    <div>
                        <small>Created</small>
                        <strong>
                            ${formatDateTime(
                                teacher.created_at
                            )}
                        </strong>
                    </div>

                </div>

            </div>
        `
    );
}


/* =========================================================================
   60. CLASS VIEW MODAL
========================================================================= */

function showClassDetails(
    classId
) {

    const item =
        MIS_STATE.classes.find(
            row =>
                row.id ===
                classId
        );

    if (!item) {

        return;
    }

    MIS_STATE.selectedClass =
        item;

    const teacher =
        MIS_STATE.teachers.find(
            row =>
                row.id ===
                item.class_teacher_id
        );

    openModal(
        'Class Profile',
        `

            <div class="detail-grid">

                <div>
                    <small>Class Code</small>
                    <strong>
                        ${safeText(
                            item.class_code
                        )}
                    </strong>
                </div>

                <div>
                    <small>Class Name</small>
                    <strong>
                        ${safeText(
                            item.class_name
                        )}
                    </strong>
                </div>

                <div>
                    <small>Section</small>
                    <strong>
                        ${safeText(
                            item.section ||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <small>Level</small>
                    <strong>
                        ${safeText(
                            item.level ||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <small>Academic Year</small>
                    <strong>
                        ${safeText(
                            item.academic_year ||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <small>Room</small>
                    <strong>
                        ${safeText(
                            item.room_name ||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <small>Capacity</small>
                    <strong>
                        ${safeText(
                            item.capacity ??
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <small>Class Teacher</small>
                    <strong>
                        ${safeText(
                            teacher?.full_name ||
                            'Not assigned'
                        )}
                    </strong>
                </div>

            </div>
        `
    );
}


/* =========================================================================
   61. EVENT DELEGATION
========================================================================= */

function setupDelegatedActions() {

    document.addEventListener(
        'click',
        async event => {

            const actionElement =
                event.target.closest(
                    '[data-action]'
                );

            if (!actionElement) {

                return;
            }

            const action =
                actionElement.dataset.action;

            const id =
                actionElement.dataset.id;

            try {

                switch (action) {

                    case 'view-teacher':

                        showTeacherDetails(
                            id
                        );

                        break;


                    case 'edit-teacher':

                        showTeacherEdit(
                            id
                        );

                        break;


                    case 'teacher-status':

                        await showTeacherStatusEditor(
                            id
                        );

                        break;


                    case 'view-class':

                        showClassDetails(
                            id
                        );

                        break;


                    case 'edit-class':

                        showClassEdit(
                            id
                        );

                        break;


                    case 'revoke-session':

                        if (
                            confirm(
                                'Revoke this active session?'
                            )
                        ) {

                            await revokeSession(
                                id
                            );
                        }

                        break;


                    case 'toggle-ip-block':

                        await toggleIPBlock(
                            id,
                            actionElement
                                .dataset
                                .blocked ===
                            'true'
                        );

                        break;


                    case 'mark-notification-read':

                        await markNotificationRead(
                            id
                        );

                        break;


                    case 'select-theme':

                        await selectTheme(
                            id
                        );

                        break;


                    case 'select-background':

                        await activateBackground(
                            id
                        );

                        break;


                    case 'close-modal':

                        closeModal();

                        break;


                    default:

                        break;
                }

            } catch (error) {

                console.error(
                    error
                );

                errorToast(
                    error.message ||
                    'The requested operation failed.'
                );
            }
        }
    );
}


/* =========================================================================
   62. TEACHER STATUS EDITOR
========================================================================= */

async function showTeacherStatusEditor(
    teacherId
) {

    const teacher =
        MIS_STATE.teachers.find(
            item =>
                item.id ===
                teacherId
        );

    if (!teacher) {

        return;
    }

    openModal(
        'Teacher Account Status',
        `

            <div class="form-stack">

                <p>
                    ${safeText(
                        teacher.full_name
                    )}
                    —
                    ${safeText(
                        teacher.teacher_id
                    )}
                </p>

                <label>
                    Account status

                    <select
                        id="teacherStatusSelect"
                    >

                        ${[
                            'active',
                            'inactive',
                            'suspended',
                            'pending',
                            'locked'
                        ]
                            .map(
                                status => `
                                    <option
                                        value="${status}"
                                        ${
                                            teacher.status ===
                                            status
                                                ? 'selected'
                                                : ''
                                        }
                                    >
                                        ${status}
                                    </option>
                                `
                            )
                            .join('')}

                    </select>

                </label>

                <button
                    type="button"
                    id="saveTeacherStatus"
                >
                    Save Status
                </button>

            </div>
        `
    );

    const button =
        document.querySelector(
            '#saveTeacherStatus'
        );

    button?.addEventListener(
        'click',
        async () => {

            try {

                const select =
                    document.querySelector(
                        '#teacherStatusSelect'
                    );

                await changeTeacherStatus(
                    teacherId,
                    select.value
                );

                closeModal();

                success(
                    'Teacher account status updated.'
                );

            } catch (error) {

                errorToast(
                    error.message
                );
            }
        }
    );
}


/* =========================================================================
   63. TEACHER EDITOR
========================================================================= */

function showTeacherEdit(
    teacherId
) {

    const teacher =
        MIS_STATE.teachers.find(
            item =>
                item.id ===
                teacherId
        );

    if (!teacher) {

        return;
    }

    openModal(
        'Edit Teacher',
        `

            <form
                id="teacherEditForm"
                class="form-stack"
            >

                <label>
                    Full Name

                    <input
                        name="full_name"
                        required
                        value="${safeText(
                            teacher.full_name
                        )}"
                    >
                </label>

                <label>
                    Department

                    <input
                        name="department"
                        value="${safeText(
                            teacher.department ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Designation

                    <input
                        name="designation"
                        value="${safeText(
                            teacher.designation ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Phone

                    <input
                        name="phone"
                        value="${safeText(
                            teacher.phone ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Email

                    <input
                        type="email"
                        name="email"
                        value="${safeText(
                            teacher.email ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Qualification

                    <input
                        name="qualification"
                        value="${safeText(
                            teacher.qualification ||
                            ''
                        )}"
                    >
                </label>

                <button
                    type="submit"
                >
                    Save Changes
                </button>

            </form>
        `
    );

    const form =
        document.querySelector(
            '#teacherEditForm'
        );

    form?.addEventListener(
        'submit',
        async event => {

            event.preventDefault();

            try {

                const formData =
                    new FormData(
                        form
                    );

                const changes =
                    Object.fromEntries(
                        formData.entries()
                    );

                await updateTeacher(
                    teacherId,
                    changes
                );

                closeModal();

                success(
                    'Teacher profile updated.'
                );

            } catch (error) {

                errorToast(
                    error.message
                );
            }
        }
    );
}


/* =========================================================================
   64. CLASS EDITOR
========================================================================= */

function showClassEdit(
    classId
) {

    const item =
        MIS_STATE.classes.find(
            row =>
                row.id ===
                classId
        );

    if (!item) {

        return;
    }

    openModal(
        'Edit Class',
        `

            <form
                id="classEditForm"
                class="form-stack"
            >

                <label>
                    Class Code

                    <input
                        name="class_code"
                        required
                        value="${safeText(
                            item.class_code
                        )}"
                    >
                </label>

                <label>
                    Class Name

                    <input
                        name="class_name"
                        required
                        value="${safeText(
                            item.class_name
                        )}"
                    >
                </label>

                <label>
                    Section

                    <input
                        name="section"
                        value="${safeText(
                            item.section ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Level

                    <input
                        name="level"
                        value="${safeText(
                            item.level ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Academic Year

                    <input
                        name="academic_year"
                        value="${safeText(
                            item.academic_year ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Room

                    <input
                        name="room_name"
                        value="${safeText(
                            item.room_name ||
                            ''
                        )}"
                    >
                </label>

                <label>
                    Capacity

                    <input
                        type="number"
                        min="1"
                        name="capacity"
                        value="${safeText(
                            item.capacity ||
                            ''
                        )}"
                    >
                </label>

                <button
                    type="submit"
                >
                    Save Class
                </button>

            </form>
        `
    );

    const form =
        document.querySelector(
            '#classEditForm'
        );

    form?.addEventListener(
        'submit',
        async event => {

            event.preventDefault();

            try {

                const data =
                    Object.fromEntries(
                        new FormData(
                            form
                        )
                    );

                data.capacity =
                    data.capacity
                        ? Number(
                            data.capacity
                        )
                        : null;

                await updateClass(
                    classId,
                    data
                );

                closeModal();

                success(
                    'Class updated successfully.'
                );

            } catch (error) {

                errorToast(
                    error.message
                );
            }
        }
    );
}


/* =========================================================================
   65. NAVIGATION
========================================================================= */

function navigateTo(
    page
) {

    MIS_STATE.currentPage =
        page;

    document
        .querySelectorAll(
            '[data-page]'
        )
        .forEach(
            element => {

                element.classList.toggle(
                    'active',
                    element.dataset.page ===
                    page
                );
            }
        );

    document
        .querySelectorAll(
            '[data-view]'
        )
        .forEach(
            view => {

                view.hidden =
                    view.dataset.view !==
                    page;
            }
        );

    window.dispatchEvent(
        new CustomEvent(
            'mis:navigate',
            {
                detail: {
                    page
                }
            }
        )
    );
}


/* =========================================================================
   66. SEARCH
========================================================================= */

function setupSearch() {

    if (
        !DOM.search
    ) {

        return;
    }

    const perform =
        debounce(
            event => {

                const results =
                    searchAll(
                        event.target.value
                    );

                document.dispatchEvent(
                    new CustomEvent(
                        'mis:search',
                        {
                            detail:
                                results
                        }
                    )
                );
            },
            250
        );

    DOM.search.addEventListener(
        'input',
        perform
    );
}


/* =========================================================================
   67. GLOBAL INTERACTION TRACKING
========================================================================= */

function setupActivityTracking() {

    const events = [
        'pointerdown',
        'keydown',
        'touchstart',
        'scroll',
        'mousemove'
    ];

    const handler =
        throttle(
            registerActivity,
            500
        );

    events.forEach(
        eventName => {

            document.addEventListener(
                eventName,
                handler,
                {
                    passive: true
                }
            );
        }
    );
}


/* =========================================================================
   68. AUTH STATE LISTENER
========================================================================= */

function setupAuthListener() {

    if (!supabaseClient) {

        return;
    }

    const {
        data
    } =
        supabaseClient
            .auth
            .onAuthStateChange(
                async (
                    event,
                    session
                ) => {

                    if (
                        event ===
                        'SIGNED_OUT'
                    ) {

                        if (
                            !MIS_STATE.destroyed
                        ) {

                            window.location.replace(
                                'login.html'
                            );
                        }

                        return;
                    }

                    if (
                        event ===
                            'TOKEN_REFRESHED' &&
                        session
                    ) {

                        MIS_STATE.session =
                            session;

                        MIS_STATE.user =
                            session.user;
                    }
                }
            );

    if (data?.subscription) {

        MIS_STATE.eventHandlers.push(
            data.subscription
        );
    }
}


/* =========================================================================
   69. REALTIME
========================================================================= */

function setupRealtime() {

    if (
        !supabaseClient
    ) {

        return;
    }

    const notificationChannel =
        supabaseClient
            .channel(
                'mis-nexus-notifications'
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter:
                        `recipient_id=eq.${MIS_STATE.user.id}`
                },
                async () => {

                    await loadNotifications();

                    playNotificationSound();
                }
            )
            .subscribe();

    const teacherChannel =
        supabaseClient
            .channel(
                'mis-nexus-teachers'
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'teachers'
                },
                async () => {

                    await loadTeachers();

                    await loadDashboardStatistics();
                }
            )
            .subscribe();

    const classChannel =
        supabaseClient
            .channel(
                'mis-nexus-classes'
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'classes'
                },
                async () => {

                    await loadClasses();

                    await loadDashboardStatistics();
                }
            )
            .subscribe();

    const studentChannel =
        supabaseClient
            .channel(
                'mis-nexus-students'
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'students'
                },
                async () => {

                    await loadStudents();

                    await loadDashboardStatistics();
                }
            )
            .subscribe();

    MIS_STATE.realtimeChannels.push(
        notificationChannel,
        teacherChannel,
        classChannel,
        studentChannel
    );
}


/* =========================================================================
   70. NOTIFICATION SOUND
========================================================================= */

let notificationAudioContext =
    null;


function playNotificationSound() {

    try {

        notificationAudioContext ||=
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const oscillator =
            notificationAudioContext
                .createOscillator();

        const gain =
            notificationAudioContext
                .createGain();

        oscillator.frequency.value =
            880;

        gain.gain.setValueAtTime(
            0.0001,
            notificationAudioContext
                .currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.05,
            notificationAudioContext
                .currentTime +
                0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            notificationAudioContext
                .currentTime +
                0.18
        );

        oscillator.connect(
            gain
        );

        gain.connect(
            notificationAudioContext
                .destination
        );

        oscillator.start();

        oscillator.stop(
            notificationAudioContext
                .currentTime +
            0.2
        );

    } catch {

        // Browser audio may require user interaction.
    }
}


/* =========================================================================
   71. PERIODIC REFRESH
========================================================================= */

function setupTimers() {

    MIS_STATE.timers.push(

        setInterval(
            updateNigerianClock,
            MIS_NEXUS_CONFIG
                .CLOCK_INTERVAL
        ),

        setInterval(
            checkInactivity,
            1000
        ),

        setInterval(
            refreshApplicationSession,
            MIS_NEXUS_CONFIG
                .SESSION_ACTIVITY_INTERVAL
        ),

        setInterval(
            async () => {

                try {

                    await loadDashboardStatistics();

                } catch (error) {

                    console.warn(
                        'Dashboard refresh failed:',
                        error
                    );
                }

            },
            MIS_NEXUS_CONFIG
                .REFRESH_INTERVAL
        ),

        setInterval(
            async () => {

                try {

                    await loadNotifications();

                } catch {

                    // Keep dashboard alive.
                }

            },
            MIS_NEXUS_CONFIG
                .NOTIFICATION_INTERVAL
        )
    );
}


/* =========================================================================
   72. THEME RESTORE
========================================================================= */

function restoreTheme() {

    const saved =
        localStorage.getItem(
            'mis-nexus-theme'
        );

    if (saved) {

        const theme =
            MIS_STATE.themes.find(
                item =>
                    item.theme_key ===
                    saved
            );

        if (theme) {

            applyTheme(
                theme
            );

            return;
        }
    }

    const defaultTheme =
        MIS_STATE.themes.find(
            item =>
                item.is_default
        );

    if (defaultTheme) {

        applyTheme(
            defaultTheme
        );
    }
}


/* =========================================================================
   73. KEYBOARD SHORTCUTS
========================================================================= */

function setupKeyboardShortcuts() {

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Escape'
            ) {

                closeModal();

                return;
            }

            if (
                event.ctrlKey &&
                event.key.toLowerCase() ===
                'k'
            ) {

                event.preventDefault();

                DOM.search?.focus();

                return;
            }

            if (
                event.ctrlKey &&
                event.key.toLowerCase() ===
                'l'
            ) {

                event.preventDefault();

                safeSignOut(
                    'Manual keyboard logout.'
                );
            }
        }
    );
}


/* =========================================================================
   74. NOTIFICATION UI
========================================================================= */

function setupNotificationUI() {

    DOM.notificationButton
        ?.addEventListener(
            'click',
            event => {

                event.stopPropagation();

                DOM.notificationPanel
                    ?.classList.toggle(
                        'visible'
                    );
            }
        );

    DOM.notificationPanel
        ?.addEventListener(
            'click',
            event => {

                event.stopPropagation();
            }
        );

    document.addEventListener(
        'click',
        () => {

            DOM.notificationPanel
                ?.classList.remove(
                    'visible'
                );
        }
    );
}


/* =========================================================================
   75. LOGOUT UI
========================================================================= */

function setupLogoutUI() {

    DOM.logoutButton
        ?.addEventListener(
            'click',
            async () => {

                const confirmed =
                    confirm(
                        'Are you sure you want to log out of MIS-NEXUS™?'
                    );

                if (
                    confirmed
                ) {

                    await safeSignOut(
                        'User initiated logout.'
                    );
                }
            }
        );
}


/* =========================================================================
   76. MODAL UI
========================================================================= */

function setupModalUI() {

    DOM.modalClose
        ?.addEventListener(
            'click',
            closeModal
        );

    DOM.modal
        ?.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    DOM.modal
                ) {

                    closeModal();
                }
            }
        );
}


/* =========================================================================
   77. THEME UI
========================================================================= */

function setupThemeUI() {

    DOM.themeList
        ?.addEventListener(
            'click',
            async event => {

                const option =
                    event.target.closest(
                        '[data-theme]'
                    );

                if (!option) {

                    return;
                }

                try {

                    await selectTheme(
                        option.dataset.theme
                    );

                } catch (error) {

                    errorToast(
                        error.message
                    );
                }
            }
        );
}


/* =========================================================================
   78. BACKGROUND UI
========================================================================= */

function setupBackgroundUI() {

    DOM.backgroundList
        ?.addEventListener(
            'click',
            async event => {

                const option =
                    event.target.closest(
                        '[data-background-id]'
                    );

                if (!option) {

                    return;
                }

                try {

                    await activateBackground(
                        option.dataset.backgroundId
                    );

                } catch (error) {

                    errorToast(
                        error.message
                    );
                }
            }
        );
}


/* =========================================================================
   79. NAVIGATION UI
========================================================================= */

function setupNavigationUI() {

    DOM.navigation
        ?.addEventListener(
            'click',
            event => {

                const button =
                    event.target.closest(
                        '[data-page]'
                    );

                if (!button) {

                    return;
                }

                event.preventDefault();

                navigateTo(
                    button.dataset.page
                );
            }
        );

    document.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-page]'
                );

            if (
                button &&
                !DOM.navigation?.contains(
                    button
                )
            ) {

                event.preventDefault();

                navigateTo(
                    button.dataset.page
                );
            }
        }
    );
}


/* =========================================================================
   80. DASHBOARD DATA LOADER
========================================================================= */

async function loadAllCoreData() {

    showLoading(
        'Loading MIS-NEXUS™ administrator data...'
    );

    try {

        await Promise.all([
            loadSchoolProfile(),
            loadDashboardStatistics(),
            loadTeachers(),
            loadClasses(),
            loadStudents(),
            loadNotifications(),
            loadThemes(),
            loadBackgrounds(),
            loadSystemSettings()
        ]);

        restoreTheme();

    } finally {

        hideLoading();
    }
}


/* =========================================================================
   81. SECURITY DATA LOADER
========================================================================= */

async function loadSecurityData() {

    try {

        await Promise.all([
            loadSecurityEvents(),
            loadAuditLogs(),
            loadActiveSessions(),
            loadIPHistory(),
            loadLoginHistory()
        ]);

    } catch (error) {

        console.warn(
            'Some security data could not be loaded:',
            error
        );
    }
}


/* =========================================================================
   82. LOCATION / IP INITIALIZATION
========================================================================= */

async function initializeSecurityContext() {

    await Promise.allSettled([
        detectClientIP(),
        requestLocation()
    ]);
}


/* =========================================================================
   83. LOGIN RECORDING
========================================================================= */

async function recordCurrentLogin() {

    if (!MIS_STATE.user) {

        return;
    }

    try {

        const location =
            getLocationPayload();

        await invokeEdgeFunction(
            MIS_NEXUS_CONFIG
                .EDGE_FUNCTIONS.RECORD_LOGIN,
            {

                user_id:
                    MIS_STATE.user.id,

                session_id:
                    MIS_STATE.sessionId,

                ip_address:
                    MIS_STATE.clientIP,

                latitude:
                    location.latitude,

                longitude:
                    location.longitude,

                accuracy_meters:
                    location.accuracy_meters,

                user_agent:
                    navigator.userAgent,

                device_id:
                    getDeviceID(),

                successful:
                    true
            }
        );

    } catch (error) {

        console.warn(
            'Login history recording failed:',
            error
        );
    }
}


/* =========================================================================
   84. PROFILE LAST LOGIN DISPLAY
========================================================================= */

function getLastLoginText() {

    return formatDateTime(
        MIS_STATE.profile
            ?.last_login_at
    );
}


function getLastLoginIP() {

    return (
        MIS_STATE.profile
            ?.last_login_ip ||
        'Unavailable'
    );
}


/* =========================================================================
   85. DASHBOARD HEALTH
========================================================================= */

async function getSystemHealth() {

    const health = {

        supabase:
            Boolean(
                supabaseClient
            ),

        authenticated:
            Boolean(
                MIS_STATE.user
            ),

        authorized:
            MIS_STATE.profile?.role ===
            'super_admin',

        database:
            false,

        realtime:
            MIS_STATE.realtimeChannels
                .length > 0,

        location:
            Boolean(
                MIS_STATE.location
            ),

        ip:
            Boolean(
                MIS_STATE.clientIP
            )
    };

    try {

        await selectRows(
            'school_profile',
            {
                columns: 'id',
                limit: 1
            }
        );

        health.database =
            true;

    } catch {

        health.database =
            false;
    }

    return health;
}


/* =========================================================================
   86. SERVICE STATUS UI
========================================================================= */

async function renderSystemHealth() {

    const health =
        await getSystemHealth();

    document
        .querySelectorAll(
            '[data-system-health]'
        )
        .forEach(
            element => {

                const key =
                    element.dataset
                        .systemHealth;

                const state =
                    health[key];

                element.dataset.status =
                    state
                        ? 'online'
                        : 'offline';

                element.textContent =
                    state
                        ? 'ONLINE'
                        : 'OFFLINE';
            }
        );
}


/* =========================================================================
   87. CLEANUP
========================================================================= */

function cleanupApplication() {

    MIS_STATE.timers.forEach(
        timer =>
            clearInterval(timer)
    );

    MIS_STATE.timers = [];

    MIS_STATE.realtimeChannels
        .forEach(
            channel => {

                try {

                    supabaseClient
                        ?.removeChannel(
                            channel
                        );

                } catch {

                    // Ignore cleanup failure.
                }
            }
        );

    MIS_STATE.realtimeChannels =
        [];

    MIS_STATE.eventHandlers
        .forEach(
            subscription => {

                try {

                    subscription.unsubscribe();

                } catch {

                    // Ignore.
                }
            }
        );

    MIS_STATE.eventHandlers =
        [];
}


window.addEventListener(
    'beforeunload',
    cleanupApplication
);


/* =========================================================================
   88. VISIBILITY SECURITY
========================================================================= */

document.addEventListener(
    'visibilitychange',
    () => {

        if (
            document.visibilityState ===
            'visible'
        ) {

            registerActivity();

            refreshApplicationSession();

        } else {

            /*
               We intentionally do not logout merely because the
               browser tab becomes hidden. The five-minute inactivity
               policy controls expiration.
            */
        }
    }
);


/* =========================================================================
   89. ONLINE / OFFLINE
========================================================================= */

window.addEventListener(
    'online',
    () => {

        document.body
            .classList
            .remove(
                'offline-mode'
            );

        info(
            'Internet connection restored.'
        );
    }
);


window.addEventListener(
    'offline',
    () => {

        document.body
            .classList
            .add(
                'offline-mode'
            );

        warning(
            'Internet connection lost. Live database operations may be unavailable.'
        );
    }
);


/* =========================================================================
   90. APPLICATION INITIALIZATION
========================================================================= */

async function initializeMISNexus() {

    if (
        MIS_STATE.initialized
    ) {

        return;
    }

    showLoading(
        'Starting MIS-NEXUS™...'
    );

    try {

        initializeSupabase();

        if (
            !supabaseClient
        ) {

            throw new Error(
                'Unable to initialize Supabase.'
            );
        }

        const user =
            await requireAuthenticatedUser();

        if (!user) {

            return;
        }

        const authorized =
            await requireSuperAdmin();

        if (!authorized) {

            return;
        }

        await initializeSecurityContext();

        await loadSchoolProfile();

        await loadCurrentProfile();

        renderCurrentUser();

        await createApplicationSession();

        await recordCurrentLogin();

        await loadAllCoreData();

        await loadSecurityData();

        setupAuthListener();

        setupRealtime();

        setupTimers();

        setupActivityTracking();

        setupKeyboardShortcuts();

        setupDelegatedActions();

        setupNavigationUI();

        setupSearch();

        setupNotificationUI();

        setupLogoutUI();

        setupModalUI();

        setupThemeUI();

        setupBackgroundUI();

        updateNigerianClock();

        await loadPrayerTimes();

        await renderSystemHealth();

        MIS_STATE.initialized =
            true;

        document.body
            .classList
            .add(
                'mis-nexus-ready'
            );

        success(
            'Super Administrator dashboard ready.',
            'MIS-NEXUS™'
        );

    } catch (error) {

        console.error(
            'MIS-NEXUS™ initialization error:',
            error
        );

        errorToast(
            error.message ||
            'The administrator dashboard could not be initialized.'
        );

        if (
            !MIS_STATE.user
        ) {

            redirectToLogin();
        }

    } finally {

        hideLoading();
    }
}


/* =========================================================================
   91. GLOBAL API
   -------------------------------------------------------------------------
   Exposes only application-level functions required by HTML controls.
========================================================================= */

window.MIS_NEXUS = Object.freeze({

    state:
        MIS_STATE,

    auth: {

        getSession,

        signOut:
            safeSignOut,

        requireSuperAdmin
    },

    dashboard: {

        load:
            loadDashboardStatistics,

        health:
            getSystemHealth,

        refresh:
            loadAllCoreData
    },

    teachers: {

        list:
            loadTeachers,

        create:
            createTeacherAccount,

        update:
            updateTeacher,

        changeStatus:
            changeTeacherStatus
    },

    classes: {

        list:
            loadClasses,

        create:
            createClass,

        update:
            updateClass,

        delete:
            deleteClass
    },

    students: {

        list:
            loadStudents
    },

    assignments: {

        list:
            loadTeacherAssignments,

        create:
            createTeacherAssignment
    },

    attendance: {

        teachers:
            loadTeacherAttendance,

        students:
            loadStudentAttendance,

        boarding:
            loadBoardingAttendance
    },

    notifications: {

        list:
            loadNotifications,

        markRead:
            markNotificationRead,

        markAllRead:
            markAllNotificationsRead
    },

    security: {

        events:
            loadSecurityEvents,

        audit:
            loadAuditLogs,

        sessions:
            loadActiveSessions,

        ips:
            loadIPHistory,

        loginHistory:
            loadLoginHistory,

        revokeSession,

        toggleIPBlock
    },

    appearance: {

        themes:
            loadThemes,

        backgrounds:
            loadBackgrounds,

        applyTheme,

        applyBackground,

        selectTheme,

        activateBackground
    },

    reports: {

        teachers:
            exportTeacherReport,

        students:
            exportStudentReport
    },

    navigation: {

        go:
            navigateTo
    },

    modal: {

        open:
            openModal,

        close:
            closeModal
    }

});


/* =========================================================================
   92. START
========================================================================= */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeMISNexus,
        {
            once: true
        }
    );

} else {

    initializeMISNexus();
}


/* =========================================================================
   END OF MIS-NEXUS™ SUPER ADMINISTRATOR ENGINE
========================================================================= */