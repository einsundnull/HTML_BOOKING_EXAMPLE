/**
 * app-config.js — Asset-Version & Adapter-Switch
 *
 * Drei Verantwortlichkeiten:
 *   1. APP_VERSION  — Zentrale Asset-Version (SSOT, R-CACHE-05)
 *                     Bei jeder CSS-/JS-Änderung NUR HIER erhöhen.
 *                     Format: YYYY-MM-DD-{increment}
 *   2. _injectAssets() — Injiziert <link> und <script> Tags mit
 *                        APP_VERSION als ?v= Query-String.
 *                        Kein manuelles ?v= mehr in HTML-Dateien.
 *   3. AppAdapter   — Adapter-Swap für localStorage ↔ Firestore
 *
 * WICHTIG: Diese Datei wird als ERSTES Script in jeder HTML-Seite geladen.
 *          Sie selbst bekommt KEIN ?v= (R-CACHE-04).
 *
 * Regeln: var only, function(){}, no arrow functions,
 *         no template literals, no ?. or ??
 */

/* ── Asset-Version ──────────────────────────────────────────
   NUR HIER ändern — gilt automatisch für alle Seiten.       */

var APP_VERSION = '2026-03-30-9';

/* ── Zentrale Disziplin-Labels (SSOT für skiing-catalog.js, admin.js, profile.js) ── */
var DISC_LABELS = {
  ski:        'Ski',
  snowboard:  'Snowboard',
  paragliding:'Paragliding',
  climbing:   'Klettern',
  diving:     'Tauchen',
  telemark:   'Telemark',
  nordic:     'Langlauf',
  other:      'Sonstiges'
};

/* ── Seiten-spezifische Asset-Listen ────────────────────────
   Schlüssel = HTML-Dateiname ohne Pfad (z.B. 'student.html')
   css: [] CSS-Dateien in Ladereihenfolge (ohne ?v=)
   js:  [] JS-Dateien in Ladereihenfolge (ohne ?v=, ohne app-config.js)
   ---------------------------------------------------------- */
var _PAGE_ASSETS = {

  'dashboard.html': {
    css: [],
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/wallet-core.js',
      './js/wallet-panel.js',
      './js/chat.js',
      './js/dashboard.js'
    ]
  },

  'student.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/email.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/wallet-core.js',
      './js/wallet-panel.js',
      './js/student.js',
      './js/chat.js'
    ]
  },

  'teacher.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      /* Core — needed for first paint */
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/email.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/teacher.js'
    ],
    jsLazy: [
      /* Lazy — loaded after first paint, only needed for Wallet/Chat tabs */
      './js/wallet-core.js',
      './js/wallet-panel.js',
      './js/chat.js'
    ]
  },

  'db-seed.html': {
    css: [],
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/email.js',
      './js/auth.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/wallet-core.js',
      './js/chat.js'
    ]
  },

  'my-students.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/wallet-core.js',
      './js/wallet-panel.js',
      './js/my-students.js',
      './js/chat.js'
    ]
  },

  'admin.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/wallet-core.js',
      './js/admin.js'
    ]
  },

  'financial.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/financial.js',
      './js/chat.js'
    ]
  },

  'wallet.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/chat.js',
      './js/wallet-core.js',
      './js/wallet.js'
    ]
  },

  'wallet-standalone.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/wallet-core.js',
      './js/wallet.js',
      './js/chat.js'
    ]
  },

  'user-detail.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/profile.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/auth.js',
      './js/ui.js',
      './js/navbar.js',
      './js/wallet-core.js',
      './js/user-detail.js',
      './js/chat.js'
    ]
  },

  'profile-edit.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/email.js',
      './js/auth.js',
      './js/ui.js',
      './js/profile.js',
      './js/navbar.js',
      './js/chat.js'
    ]
  },

  'profile-view.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/email.js',
      './js/auth.js',
      './js/ui.js',
      './js/profile.js',
      './js/navbar.js',
      './js/chat.js'
    ]
  },

  'landing.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/auth.js',
      './js/profile.js',
      './js/ui.js',
      './js/navbar.js',
      './js/landing.js'
    ]
  },

  'skiing.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/auth.js',
      './js/profile.js',
      './js/ui.js',
      './js/navbar.js',
      './js/skiing.js'
    ]
  },

  'skiing-catalog.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/currency-provider-mock.js',
      './js/currency-service.js',
      './js/store.js',
      './js/auth.js',
      './js/profile.js',
      './js/email.js',
      './js/ui.js',
      './js/navbar.js',
      './js/landing.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/timezone-service.js',
      './js/chat.js',
      './js/catalog-filter-drawer.js',
      './js/skiing-catalog.js'
    ]
  },

  'index.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/store.js',
      './js/profile.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/auth.js'
    ]
  },

  'db-seed.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/store.js',
      './js/profile.js',
      './js/adapter-localstorage.js',
      './js/adapter-firestore.js',
      './js/app-service.js',
      './js/chat.js'
    ]
  },

  'debug.html': {
    css: []  /* CSS injected per-page inline script */,
    js: [
      './js/store.js',
      './js/auth.js'
    ]
  }

};

/* ── Asset-Injection ────────────────────────────────────────
   Liest die aktuelle Seite, sucht den passenden Eintrag in
   _PAGE_ASSETS und injiziert <link> + <script> Tags mit
   APP_VERSION als Cache-Buster.
   Wird sofort aufgerufen (sync, vor DOMContentLoaded).      */

(function _injectAssets() {
  if (typeof document === 'undefined') { return; }

  var page = window.location.pathname.split('/').pop() || 'index.html';
  if (!page || page === '') { page = 'index.html'; }

  var assets = _PAGE_ASSETS[page];
  if (!assets) { return; }   /* Fragment oder unbekannte Seite — nichts tun */

  var v = '?v=' + APP_VERSION;
  var head = document.head || document.getElementsByTagName('head')[0];
  if (!head) { return; }

  /* ── CSS: stamped via inline script in each HTML <head> ── */

  /* ── JS <script> Tags — defer so body is parsed first ── */
  for (var ji = 0; ji < assets.js.length; ji++) {
    var script = document.createElement('script');
    script.src   = assets.js[ji] + v;
    script.defer = true;
    head.appendChild(script);
  }

  /* ── Lazy JS — loaded after window.load so they never block first paint ── */
  if (assets.jsLazy && assets.jsLazy.length) {
    window.addEventListener('load', function() {
      /* Use requestIdleCallback when available for lowest-priority loading */
      var _loadLazy = function() {
        for (var li = 0; li < assets.jsLazy.length; li++) {
          var ls = document.createElement('script');
          ls.src = assets.jsLazy[li] + v;
          document.body.appendChild(ls);
        }
      };
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(_loadLazy, { timeout: 2000 });
      } else {
        setTimeout(_loadLazy, 100);
      }
    });
  }
}());

/* ── Adapter-Switch ─────────────────────────────────────────
   Genau eine Zeile ändern für die Migration.
   AppAdapter wird lazy nach DOMContentLoaded gesetzt,
   damit adapter-localstorage.js bereits geladen ist.       */

var AppAdapter = null;  /* wird von _resolveAdapter() gesetzt */

function _resolveAdapter() {
  /* Mockup (localStorage): */
  AppAdapter = LocalStorageAdapter;
  /* Produktion (Firestore):
  AppAdapter = FirestoreAdapter; */
}

if (typeof window !== 'undefined') {
  /* 'load' fires after all defer scripts have executed — LocalStorageAdapter is ready */
  window.addEventListener('load', _resolveAdapter);
}

/* ── Firestore-Konfiguration (nur relevant für Produktion) ──
   Beim Wechsel auf FirestoreAdapter hier die Firebase-Config
   eintragen und firebase SDK in den HTML-Dateien einbinden.

var FirebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID'
};
*/

/* ── One-time timezone migration — runs on every page load, skips if already done ── */
(function() {
  if (typeof AppService !== 'undefined' && typeof AppService.migrateTimesToUtc === 'function') {
    AppService.migrateTimesToUtc(function(err) {
      if (err) console.warn('[TZ Migration] error:', err);
    });
  }
})();
