/**
 * navbar.js — Universal Navbar
 *
 * Injiziert die Navbar in jede Seite.
 * Aufruf: Navbar.init(activePage) nach store.js und auth.js.
 *
 * Features:
 *  - Hamburger-Button → Dropdown-Menü mit Menüpunkten
 *  - Dropdown-Menü: Home, Profil ansehen, Profil bearbeiten (role-abhängig)
 *  - Welcome-Dialog für Teacher ohne ausgefülltes Profil
 *  - Aktive Seite wird hervorgehoben
 *
 * Regeln: var only, function(){}, string concat, no arrow functions,
 *         no ?. or ??, no template literals, no inline styles
 */

var Navbar = {

  /* Nav-Links pro Rolle — AUSKOMMENTIERT, werden später aktiviert
  _links: {
    admin:   [{ label: 'Users',    href: './admin.html',   page: 'admin'   }],
    teacher: [{ label: 'Kalender', href: './teacher.html', page: 'teacher' }],
    student: [{ label: 'Katalog',  href: './skiing-catalog.html', page: 'catalog' }]
  },
  */
  _links: { admin: [], teacher: [], student: [] },

  /* Hamburger-Menü Einträge pro Rolle */
  _menuItems: {
    admin: [
      { label: 'Home',   href: './landing.html', icon: 'home'   },
      { label: 'Wallet', href: './wallet.html', icon: 'wallet', uidParam: true }
    ],
    teacher: [
      { label: 'Home',              href: './landing.html',        icon: 'home'      },
      { label: 'Dashboard',         href: './dashboard.html',      icon: 'dashboard', uidParam: true },
      { label: 'Kalender',          href: './teacher.html',        icon: 'calendar',  uidParam: true },
      { label: 'Meine Schüler',     href: './my-students.html',    icon: 'students',  uidParam: true },
      { label: 'Wallet',            href: './wallet.html',         icon: 'wallet',    uidParam: true },
      { label: 'Profil ansehen',    href: './profile-view.html',   icon: 'eye',       uidParam: true, profileUid: true },
      { label: 'Profil bearbeiten', href: './profile-edit.html',   icon: 'edit',      uidParam: true, ownerParam: true },
      { label: 'Finanzplaner',      href: './financial.html',      icon: 'finance',   uidParam: true },
      { label: '⚙ DB Seed',        href: './db-seed.html',        icon: 'seed' }
    ],
    student: [
      { label: 'Home',              href: './landing.html',        icon: 'home'    },
      { label: 'Dashboard',         href: './dashboard.html',      icon: 'dashboard', uidParam: true },
      { label: 'Katalog',           href: './skiing-catalog.html', icon: 'catalog', uidParam: true },
      { label: 'Kalender',          href: './student.html',        icon: 'calendar', uidParam: true },
      { label: 'Wallet',            href: './wallet.html',         icon: 'wallet',  uidParam: true },
      { label: 'Profil ansehen',    href: './profile-view.html',   icon: 'eye',     uidParam: true, profileUid: true },
      { label: 'Profil bearbeiten', href: './profile-edit.html',   icon: 'edit',    uidParam: true, ownerParam: true }
    ]
  },

  /* i18n Texte */
  _i18n: {
    welcomeTitle:    'Willkommen bei BookingSystem!',
    welcomeBody:     'Füll dein Profil aus, damit Schüler dich finden und buchen können.',
    welcomeBtn:      'Profil jetzt ausfüllen',
    welcomeSkip:     'Später',
    signOut:         'Abmelden'
  },

  /* Welcome-Dialog: localStorage-Key */
  _WELCOME_KEY: 'app_welcome_seen',

  /* ── init ──────────────────────────────────────────────── */
  /* options (optional): {
       loginBtn:   { label, onClick },
       signupBtn:  { label, onClick },
       viewerUid:  string  — explicit session-user uid. Use on pages where ?uid=
                            identifies the content being viewed (not the session owner),
                            e.g. profile-view.html where ?uid= = profile owner.
                            When omitted, Auth.current() (reads ?uid= from URL) is used.
   } */
  init: function(activePage, options) {
    var self = this;
    self._options    = options || {};

    /* Resolve session user:
       If options.viewerUid is supplied use that — prevents profile-view.html
       from mistakenly treating the profile owner as the logged-in user. */
    var user;
    if (self._options.viewerUid) {
      user = AppService.getUserSync(decodeURIComponent(self._options.viewerUid)) || null;
    } else {
      user = Auth.current();
    }

    self._user       = user;
    self._activePage = activePage;
    self._uid        = user ? encodeURIComponent(user.uid) : '';

    self._build();
    self._bindHamburger();
    self._bindScrollBehavior();

    /* Welcome-Dialog nur für Teacher */
    if (user && user.role === 'teacher') {
      self._maybeShowWelcome();
    }
  },

  /* ── Build Navbar ──────────────────────────────────────── */
  _build: function() {
    var self = this;
    var user = self._user;

    var nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.id        = 'main-navbar';

    /* Nav links (Hauptnavigation) */
    var linksHTML = '';
    if (user) {
      var roleLinks = self._links[user.role] || [];
      for (var i = 0; i < roleLinks.length; i++) {
        var l        = roleLinks[i];
        var href     = l.href + (self._uid ? '?uid=' + self._uid : '');
        var isActive = (self._activePage === l.page) ? ' active' : '';
        linksHTML   += '<a class="navbar-link' + isActive + '" href="' + href + '">' + l.label + '</a>';
      }
    }

    /* Optional auth buttons (für Seiten ohne Auth, z.B. Landing) */
    var loginBtnHTML = '';
    if (!user && self._options && self._options.loginBtn) {
      var lbl = self._options.loginBtn.label || 'Anmelden';
      loginBtnHTML = '<button class="btn btn-ghost btn-sm navbar-auth-btn" id="navbar-login-btn">' + lbl + '</button>';
    }
    var signupBtnHTML = '';
    if (!user && self._options && self._options.signupBtn) {
      var slbl = self._options.signupBtn.label || 'Registrieren';
      signupBtnHTML = '<button class="btn btn-secondary btn-sm navbar-auth-btn" id="navbar-signup-btn">' + slbl + '</button>';
    }

    nav.innerHTML =
      '<div class="navbar-inner">' +
        '<a class="navbar-brand" href="./landing.html">' +
          '<svg width="18" height="18" viewBox="0 0 20 20" fill="none">' +
            '<rect x="1" y="1" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/>' +
            '<path d="M6 10h8M10 6v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          '</svg>' +
          'BookingSystem' +
        '</a>' +
        '<div class="navbar-links">' + linksHTML + '</div>' +
        '<div class="navbar-right">' +
          (user ? '<a class="navbar-wallet-badge" id="navbar-wallet-badge" href="./wallet.html?uid=' + (self._uid || '') + '" aria-label="Wallet">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 8h14" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="11" r="1" fill="currentColor"/></svg>' +
            '<span id="navbar-wallet-amount">…</span>' +
          '</a>' : '') +
          /* Currency + language dropdowns — hidden on mobile (moved into drawer) */
          '<div class="navbar-selects-desktop">' +
            self._buildCurrencyDropdown(user) +
          '</div>' +
          loginBtnHTML +
          signupBtnHTML +
          /* Hamburger only for authenticated users */
          (user ?
            '<div class="navbar-hamburger-wrap">' +
              '<button class="navbar-hamburger" id="navbar-hamburger" aria-label="Menü öffnen" aria-expanded="false" aria-haspopup="true">' +
                '<span class="navbar-hamburger-bar"></span>' +
                '<span class="navbar-hamburger-bar"></span>' +
                '<span class="navbar-hamburger-bar"></span>' +
              '</button>' +
            '</div>'
          : '') +
        '</div>' +
      '</div>';

    document.body.insertBefore(nav, document.body.firstChild);

    /* ── Sub-Bar: Landing page only — currency + language ── */
    if (self._activePage === 'landing') {
      var subBar = document.createElement('div');
      subBar.className = 'navbar-subbar';
      subBar.id        = 'navbar-subbar';
      subBar.innerHTML = self._buildSubBar();
      document.body.insertBefore(subBar, nav.nextSibling);
      self._bindSubBar();
    }

    /* ── Drawer overlay + panel — appended to body (not inside navbar) ── */
    var overlay = document.createElement('div');
    overlay.className = 'navbar-drawer-overlay';
    overlay.id        = 'navbar-drawer-overlay';
    document.body.appendChild(overlay);

    var drawer = document.createElement('div');
    drawer.className = 'navbar-dropdown';
    drawer.id        = 'navbar-dropdown';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = self._buildDropdownItems();
    document.body.appendChild(drawer);
    /* Login-Button Callback binden */
    if (self._options && self._options.loginBtn && self._options.loginBtn.onClick) {
      var loginBtn = document.getElementById('navbar-login-btn');
      if (loginBtn) loginBtn.addEventListener('click', self._options.loginBtn.onClick);
    }
    /* Signup-Button Callback binden */
    if (self._options && self._options.signupBtn && self._options.signupBtn.onClick) {
      var signupBtn = document.getElementById('navbar-signup-btn');
      if (signupBtn) signupBtn.addEventListener('click', self._options.signupBtn.onClick);
    }
    /* Currency dropdown binden */
    self._bindCurrencyDropdown();

    /* Wallet-Badge befüllen — warte auf Currency-Cache */
    if (user && typeof AppService !== 'undefined') {
      function _fillNavBadge() {
        AppService.getWallet(user.uid, function(err, wallet) {
          var el = document.getElementById('navbar-wallet-amount');
          if (!el) return;
          el.textContent = err ? '—' : (typeof _fmtForUser !== 'undefined'
            ? _fmtForUser(parseFloat(wallet.balance), user.uid)
            : parseFloat(wallet.balance).toFixed(2).replace('.', ',') + ' €');
        });
      }
      if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
        CurrencyService.onReady(_fillNavBadge);
      } else {
        _fillNavBadge();
      }
    }
  },
  _buildDropdownItems: function() {
    var self  = this;
    var user  = self._user;
    if (!user) return '';

    var items = self._menuItems[user.role] || [];
    var roleLabel = { admin: 'Admin', teacher: 'Lehrer', student: 'Schüler' };

    /* Avatar HTML */
    var avatarHTML = (typeof buildAvatarHTML !== 'undefined')
      ? buildAvatarHTML(user.uid, { size: 'md', role: user.role })
      : '<div class="avatar-initials avatar-md avatar-role-' + user.role + '">' +
          (ProfileStore.getDisplayName(user.uid) || '?').slice(0,2).toUpperCase() +
        '</div>';

    /* ── Header: close button + avatar + name + role ── */
    var html =
      '<div class="navbar-dropdown-header">' +
        '<button class="navbar-drawer-close" id="navbar-drawer-close" aria-label="Menü schließen">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
            '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="navbar-dropdown-avatar">' + avatarHTML + '</div>' +
        '<div class="navbar-dropdown-user">' +
          '<span class="navbar-dropdown-username" id="navbar-dropdown-username">' +
            ProfileStore.getDisplayName(user.uid) +
          '</span>' +
          '<span class="navbar-dropdown-role">' + (roleLabel[user.role] || user.role) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="navbar-dropdown-scroll">';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var href = item.href;

      if (item.uidParam && self._uid) {
        href = href + '?uid=' + self._uid;
      }
      if (item.profileUid && self._uid) {
        href = item.href + '?uid=' + self._uid + '&viewer=' + self._uid;
      }
      if (item.ownerParam && self._uid) {
        href = href + '&owner=' + self._uid;
      }

      html +=
        '<a class="navbar-dropdown-item" href="' + href + '">' +
          self._buildIcon(item.icon) +
          '<span>' + item.label + '</span>' +
        '</a>';
    }

    html += '</div>'; /* close scroll */

    /* Settings section — inline currency + language plain buttons */
    html += '<div class="navbar-dropdown-settings">';
    html += self._buildDrawerCurrencyRow();
    html += self._buildDrawerLangRow();
    html += self._buildDrawerTimezoneRow();
    html += '</div>';

    /* Logout in footer */
    html +=
      '<div class="navbar-dropdown-footer">' +
        '<button class="navbar-dropdown-item navbar-dropdown-logout" id="navbar-dropdown-logout">' +
          self._buildIcon('logout') +
          '<span>' + self._i18n.signOut + '</span>' +
        '</button>' +
      '</div>';

    return html;
  },

  /* ── Drawer Currency Row ─────────────────────────────────
     Rendered inside the hamburger drawer (mobile + desktop).
     Uses same data + binding as the navbar pill — different HTML structure.  */
  _buildDrawerCurrencyRow: function() {
    if (typeof CurrencyService === 'undefined') return '';
    var self      = this;
    var user      = self._user;
    var uid       = user ? user.uid : null;
    var current   = CurrencyService.getUserCurrency(uid);
    var currencies = CurrencyService.getSupportedCurrencies();
    var sym       = CurrencyService.getSymbol(current);
    var currOpts  = '';
    for (var i = 0; i < currencies.length; i++) {
      var c   = currencies[i];
      var sel = c.code === current;
      currOpts +=
        '<button class="navbar-select-option' + (sel ? ' is-selected' : '') + '"' +
          ' data-currency="' + c.code + '"' +
          ' aria-selected="' + sel + '" role="option">' +
          '<span class="navbar-select-flag">' + c.flag + '</span>' +
          '<span class="navbar-select-code">' + c.code + '</span>' +
          '<span class="navbar-select-name">' + c.name + '</span>' +
        '</button>';
    }
    return (
      '<div class="navbar-drawer-setting-wrap" id="navbar-drawer-currency-wrap">' +
        '<button class="navbar-drawer-plain-btn" id="navbar-drawer-currency-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="W\u00e4hrung w\u00e4hlen">' +
          '<span id="navbar-drawer-currency-val">' + sym + '\u00a0' + current + '</span>' +
          '<svg class="navbar-drawer-plain-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="navbar-select-dropdown navbar-drawer-select-dropdown is-hidden" id="navbar-drawer-currency-dropdown" role="listbox" aria-label="Währung wählen">' +
          currOpts +
        '</div>' +
      '</div>'
    );
  },

  /* ── Drawer Language Row ──────────────────────────────── */
  _buildDrawerLangRow: function() {
    return (
      '<div class="navbar-drawer-setting-wrap" id="navbar-drawer-lang-wrap">' +
        '<button class="navbar-drawer-plain-btn" id="navbar-drawer-lang-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="Sprache w\u00e4hlen">' +
          '<span id="navbar-drawer-lang-val">DE</span>' +
          '<svg class="navbar-drawer-plain-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="navbar-select-dropdown navbar-drawer-select-dropdown is-hidden" id="navbar-drawer-lang-dropdown" role="listbox" aria-label="Sprache wählen">' +
          '<button class="navbar-select-option is-selected" data-lang="de" aria-selected="true" role="option">' +
            '<span class="navbar-select-flag">&#127465;&#127466;</span>' +
            '<span class="navbar-select-code">DE</span>' +
            '<span class="navbar-select-name">Deutsch</span>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  },

  /* ── Drawer Timezone Row ─────────────────────────────── */
  _buildDrawerTimezoneRow: function() {
    if (typeof TimezoneService === 'undefined') return '';
    var self    = this;
    var user    = self._user;
    var uid     = user ? user.uid : null;
    var current = TimezoneService.getUserTimezone(uid);
    /* Build options from TimezoneService.TIMEZONES */
    var tzOpts  = '<button class="navbar-select-option' + (!uid ? ' is-selected' : '') +
      '" data-tz="" aria-selected="false" role="option">' +
      '<span class="navbar-select-name">Browser-Zeitzone</span></button>';
    var zones   = TimezoneService.TIMEZONES;
    for (var i = 0; i < zones.length; i++) {
      var tz  = zones[i][0];
      var lbl = zones[i][1];
      var sel = tz === current;
      tzOpts +=
        '<button class="navbar-select-option' + (sel ? ' is-selected' : '') + '"' +
          ' data-tz="' + tz + '"' +
          ' aria-selected="' + sel + '" role="option">' +
          '<span class="navbar-select-name">' + lbl + '</span>' +
        '</button>';
    }
    /* Show abbreviated current TZ */
    var tzLabel = current ? current.split('/').pop().replace(/_/g, ' ') : 'Auto';
    return (
      '<div class="navbar-drawer-setting-wrap" id="navbar-drawer-tz-wrap">' +
        '<button class="navbar-drawer-plain-btn" id="navbar-drawer-tz-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="Zeitzone w\u00e4hlen">' +
          '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
            '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>' +
            '<path d="M8 2c0 0-3 2-3 6s3 6 3 6M8 2c0 0 3 2 3 6s-3 6-3 6M2 8h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
          '</svg>' +
          '<span id="navbar-drawer-tz-val">' + tzLabel + '</span>' +
          '<svg class="navbar-drawer-plain-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="navbar-select-dropdown navbar-drawer-select-dropdown is-hidden" id="navbar-drawer-tz-dropdown" role="listbox" aria-label="Zeitzone w\u00e4hlen">' +
          tzOpts +
        '</div>' +
      '</div>'
    );
  },

  /* ── Sub-Bar (Landing, unauthenticated) ──────────────────
     Second row below navbar with plain currency + language selectors.
     Only rendered when activePage === 'landing' and no user session.  */
  _buildSubBar: function() {
    if (typeof CurrencyService === 'undefined') return '';
    var uid      = this._user ? this._user.uid : null;
    var current  = CurrencyService.getUserCurrency(uid);
    var sym      = CurrencyService.getSymbol(current);
    var currencies = CurrencyService.getSupportedCurrencies();
    var currOpts = '';
    for (var i = 0; i < currencies.length; i++) {
      var c   = currencies[i];
      var sel = c.code === current;
      currOpts +=
        '<button class="navbar-select-option' + (sel ? ' is-selected' : '') + '"' +
          ' data-currency="' + c.code + '"' +
          ' aria-selected="' + sel + '" role="option">' +
          '<span class="navbar-select-flag">' + c.flag + '</span>' +
          '<span class="navbar-select-code">' + c.code + '</span>' +
          '<span class="navbar-select-name">' + c.name + '</span>' +
        '</button>';
    }
    var langOpts =
      '<button class="navbar-select-option is-selected" data-lang="de" aria-selected="true" role="option">' +
        '<span class="navbar-select-flag">&#127465;&#127466;</span>' +
        '<span class="navbar-select-code">DE</span>' +
        '<span class="navbar-select-name">Deutsch</span>' +
      '</button>';
    return (
      '<div class="navbar-subbar-inner">' +
        '<div class="navbar-subbar-wrap" id="navbar-subbar-currency-wrap">' +
          '<button class="navbar-subbar-btn" id="navbar-subbar-currency-btn"' +
            ' aria-haspopup="listbox" aria-expanded="false" aria-label="Währung wählen">' +
            '<span id="navbar-subbar-currency-val">' + sym + ' ' + current + '</span>' +
            '<svg class="navbar-subbar-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
              '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</button>' +
          '<div class="navbar-select-dropdown is-hidden" id="navbar-subbar-currency-dropdown" role="listbox" aria-label="Währung wählen">' +
            currOpts +
          '</div>' +
        '</div>' +
        '<div class="navbar-subbar-wrap" id="navbar-subbar-lang-wrap">' +
          '<button class="navbar-subbar-btn" id="navbar-subbar-lang-btn"' +
            ' aria-haspopup="listbox" aria-expanded="false" aria-label="Sprache wählen">' +
            '<span id="navbar-subbar-lang-val">DE</span>' +
            '<svg class="navbar-subbar-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
              '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</button>' +
          '<div class="navbar-select-dropdown is-hidden" id="navbar-subbar-lang-dropdown" role="listbox" aria-label="Sprache wählen">' +
            langOpts +
          '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _bindSubBar: function() {
    var self = this;

    function _bindSubSelect(btnId, panelId, onSelect) {
      var btn   = document.getElementById(btnId);
      var panel = document.getElementById(panelId);
      var wrap  = btn ? btn.parentNode : null;
      if (!btn || !panel) return;
      function close() { panel.classList.add('is-hidden'); btn.setAttribute('aria-expanded', 'false'); }
      function open()  { panel.classList.remove('is-hidden'); btn.setAttribute('aria-expanded', 'true'); }
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!panel.classList.contains('is-hidden')) { close(); return; }
        var allP = document.querySelectorAll('.navbar-select-dropdown');
        for (var p = 0; p < allP.length; p++) { allP[p].classList.add('is-hidden'); }
        var allB = document.querySelectorAll('.navbar-subbar-btn, .navbar-select-btn');
        for (var b = 0; b < allB.length; b++) { allB[b].setAttribute('aria-expanded', 'false'); }
        open();
      });
      document.addEventListener('click', function(e) {
        if (wrap && !wrap.contains(e.target)) close();
      });
      panel.addEventListener('click', function(e) {
        var opt = null; var t = e.target;
        while (t && t !== panel) {
          if (t.classList && t.classList.contains('navbar-select-option')) { opt = t; break; }
          t = t.parentNode;
        }
        if (!opt) return;
        close();
        onSelect(opt);
      });
    }

    _bindSubSelect('navbar-subbar-currency-btn', 'navbar-subbar-currency-dropdown', function(opt) {
      var code = opt.getAttribute('data-currency');
      if (!code) return;
      if (typeof CurrencyService !== 'undefined') {
        CurrencyService.setGuestCurrency(code, null);
      }
      var val = document.getElementById('navbar-subbar-currency-val');
      if (val && typeof CurrencyService !== 'undefined') {
        val.textContent = CurrencyService.getSymbol(code) + ' ' + code;
      }
      /* Also sync desktop navbar pill */
      var sym = document.getElementById('navbar-currency-symbol');
      if (sym && typeof CurrencyService !== 'undefined') {
        sym.textContent = CurrencyService.getSymbol(code);
      }
      var opts = document.querySelectorAll('#navbar-subbar-currency-dropdown .navbar-select-option');
      for (var i = 0; i < opts.length; i++) {
        var sel = opts[i].getAttribute('data-currency') === code;
        opts[i].classList.toggle('is-selected', sel);
        opts[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      }
      if (typeof WalletPanel !== 'undefined' && typeof WalletPanel.refresh === 'function') {
        WalletPanel.refresh(null);
      }
    });

    _bindSubSelect('navbar-subbar-lang-btn', 'navbar-subbar-lang-dropdown', function(opt) {
      var lang = opt.getAttribute('data-lang');
      if (!lang) return;
      var val = document.getElementById('navbar-subbar-lang-val');
      if (val) val.textContent = lang.toUpperCase();
    });
  },

      /* ── Currency Dropdown ─────────────────────────────────── */
  _buildCurrencyDropdown: function(user) {
    if (typeof CurrencyService === 'undefined') return '';
    var currencies = CurrencyService.getSupportedCurrencies();
    var uid        = user ? user.uid : null;
    var current    = CurrencyService.getUserCurrency(uid);
    var sym        = CurrencyService.getSymbol(current);

    /* ── Währungs-Optionen ── */
    var currOpts = '';
    for (var i = 0; i < currencies.length; i++) {
      var c   = currencies[i];
      var sel = c.code === current;
      currOpts +=
        '<button class="navbar-select-option' + (sel ? ' is-selected' : '') + '"' +
          ' data-currency="' + c.code + '"' +
          ' aria-selected="' + sel + '" role="option">' +
          '<span class="navbar-select-flag">' + c.flag + '</span>' +
          '<span class="navbar-select-code">' + c.code + '</span>' +
          '<span class="navbar-select-name">' + c.name + '</span>' +
        '</button>';
    }

    /* ── Sprach-Optionen (vorerst nur Deutsch) ── */
    var langOpts =
      '<button class="navbar-select-option is-selected" data-lang="de" aria-selected="true" role="option">' +
        '<span class="navbar-select-flag">🇩🇪</span>' +
        '<span class="navbar-select-code">DE</span>' +
        '<span class="navbar-select-name">Deutsch</span>' +
      '</button>';

    return (
      /* Währungs-Combobox */
      '<div class="navbar-select-wrap" id="navbar-currency-wrap">' +
        '<button class="navbar-select-btn" id="navbar-currency-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="Währung wählen">' +
          '<span class="navbar-select-val" id="navbar-currency-symbol">' + sym + '</span>' +
          '<svg class="navbar-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="navbar-select-dropdown is-hidden" id="navbar-currency-dropdown" role="listbox" aria-label="Währung wählen">' +
          currOpts +
        '</div>' +
      '</div>' +
      /* Sprach-Combobox */
      '<div class="navbar-select-wrap" id="navbar-lang-wrap">' +
        '<button class="navbar-select-btn" id="navbar-lang-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="Sprache wählen">' +
          '<span class="navbar-select-val" id="navbar-lang-val">DE</span>' +
          '<svg class="navbar-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="navbar-select-dropdown is-hidden" id="navbar-lang-dropdown" role="listbox" aria-label="Sprache wählen">' +
          langOpts +
        '</div>' +
      '</div>'
    );
  },

  /* ── Bind Select Dropdowns (Währung + Sprache) ─────────── */
  _bindCurrencyDropdown: function() {
    var self = this;

    /* Generischer Dropdown-Binder */
    function _bindSelect(btnId, panelId, onSelect) {
      var btn   = document.getElementById(btnId);
      var panel = document.getElementById(panelId);
      var wrap  = btn ? btn.parentNode : null;
      if (!btn || !panel) return;

      function close() {
        panel.classList.add('is-hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
      function open() {
        panel.classList.remove('is-hidden');
        btn.setAttribute('aria-expanded', 'true');
      }

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!panel.classList.contains('is-hidden')) { close(); return; }
        /* Alle anderen Dropdowns schliessen */
        var allPanels = document.querySelectorAll('.navbar-select-dropdown');
        for (var p = 0; p < allPanels.length; p++) {
          allPanels[p].classList.add('is-hidden');
        }
        var allBtns = document.querySelectorAll('.navbar-select-btn');
        for (var b = 0; b < allBtns.length; b++) {
          allBtns[b].setAttribute('aria-expanded', 'false');
        }
        open();
      });

      document.addEventListener('click', function(e) {
        if (wrap && !wrap.contains(e.target)) close();
      });

      panel.addEventListener('click', function(e) {
        /* ES5 Traversal */
        var opt = null;
        var t = e.target;
        while (t && t !== panel) {
          if (t.classList && t.classList.contains('navbar-select-option')) { opt = t; break; }
          t = t.parentNode;
        }
        if (!opt) return;
        close();
        onSelect(opt);
      });
    }

    /* Währungs-Dropdown */
    _bindSelect('navbar-currency-btn', 'navbar-currency-dropdown', function(opt) {
      var code = opt.getAttribute('data-currency');
      if (!code) return;

      if (typeof CurrencyService !== 'undefined') {
        CurrencyService.setGuestCurrency(code, self._uid || null);
      }
      var sym = document.getElementById('navbar-currency-symbol');
      if (sym && typeof CurrencyService !== 'undefined') {
        sym.textContent = CurrencyService.getSymbol(code);
      }
      var opts = document.querySelectorAll('#navbar-currency-dropdown .navbar-select-option');
      for (var i = 0; i < opts.length; i++) {
        var sel = opts[i].getAttribute('data-currency') === code;
        opts[i].classList.toggle('is-selected', sel);
        opts[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      }
      /* Preise auf der aktuellen Seite neu berechnen — kein Reload */
      if (typeof SkiingCatalog !== 'undefined' && typeof SkiingCatalog.refreshPrices === 'function') {
        SkiingCatalog.refreshPrices();
      } else if (typeof StudentView !== 'undefined' && typeof StudentView.refreshPrices === 'function') {
        StudentView.refreshPrices();
      } else if (typeof ProfileView !== 'undefined' && typeof ProfileView.refreshPrices === 'function') {
        ProfileView.refreshPrices();
      } else {
        window.location.reload();
      }
      /* Wallet-Badge und Wallet-Panel immer sofort neu berechnen —
         unabhängig von der aktuellen Seite, da der Badge in jeder
         Navbar sichtbar ist und WalletPanel.refresh() idempotent ist. */
      if (typeof WalletPanel !== 'undefined' && typeof WalletPanel.refresh === 'function') {
        WalletPanel.refresh(self._uid || null);
      }
    });

    /* Sprach-Dropdown Desktop (vorerst nur Anzeige) */
    _bindSelect('navbar-lang-btn', 'navbar-lang-dropdown', function(opt) {
      var lang = opt.getAttribute('data-lang');
      if (!lang) return;
      var val = document.getElementById('navbar-lang-val');
      if (val) val.textContent = lang.toUpperCase();
      var opts = document.querySelectorAll('#navbar-lang-dropdown .navbar-select-option');
      for (var i = 0; i < opts.length; i++) {
        var sel = opts[i].getAttribute('data-lang') === lang;
        opts[i].classList.toggle('is-selected', sel);
        opts[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      }
    });

    /* ── Drawer: Währungs-Dropdown (same logic as desktop) ── */
    _bindSelect('navbar-drawer-currency-btn', 'navbar-drawer-currency-dropdown', function(opt) {
      var code = opt.getAttribute('data-currency');
      if (!code) return;

      if (typeof CurrencyService !== 'undefined') {
        CurrencyService.setGuestCurrency(code, self._uid || null);
      }
      /* Update drawer display value */
      var drawerVal = document.getElementById('navbar-drawer-currency-val');
      if (drawerVal && typeof CurrencyService !== 'undefined') {
        drawerVal.textContent = CurrencyService.getSymbol(code) + ' ' + code;
      }
      /* Also sync desktop pill symbol if visible */
      var sym = document.getElementById('navbar-currency-symbol');
      if (sym && typeof CurrencyService !== 'undefined') {
        sym.textContent = CurrencyService.getSymbol(code);
      }
      /* Update all drawer option states */
      var opts = document.querySelectorAll('#navbar-drawer-currency-dropdown .navbar-select-option');
      for (var i = 0; i < opts.length; i++) {
        var sel = opts[i].getAttribute('data-currency') === code;
        opts[i].classList.toggle('is-selected', sel);
        opts[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      }
      /* Also sync desktop dropdown states */
      var dOpts = document.querySelectorAll('#navbar-currency-dropdown .navbar-select-option');
      for (var j = 0; j < dOpts.length; j++) {
        var dSel = dOpts[j].getAttribute('data-currency') === code;
        dOpts[j].classList.toggle('is-selected', dSel);
        dOpts[j].setAttribute('aria-selected', dSel ? 'true' : 'false');
      }
      /* Refresh all page prices */
      if (typeof SkiingCatalog !== 'undefined' && typeof SkiingCatalog.refreshPrices === 'function') {
        SkiingCatalog.refreshPrices();
      } else if (typeof StudentView !== 'undefined' && typeof StudentView.refreshPrices === 'function') {
        StudentView.refreshPrices();
      } else if (typeof ProfileView !== 'undefined' && typeof ProfileView.refreshPrices === 'function') {
        ProfileView.refreshPrices();
      } else {
        window.location.reload();
      }
      if (typeof WalletPanel !== 'undefined' && typeof WalletPanel.refresh === 'function') {
        WalletPanel.refresh(self._uid || null);
      }
    });

    /* ── Drawer: Sprach-Dropdown (vorerst nur Anzeige) ── */
    _bindSelect('navbar-drawer-lang-btn', 'navbar-drawer-lang-dropdown', function(opt) {
      var lang = opt.getAttribute('data-lang');
      if (!lang) return;
      var drawerVal = document.getElementById('navbar-drawer-lang-val');
      if (drawerVal) drawerVal.textContent = lang.toUpperCase() + ' Deutsch';
      var val = document.getElementById('navbar-lang-val');
      if (val) val.textContent = lang.toUpperCase();
      var opts = document.querySelectorAll('#navbar-drawer-lang-dropdown .navbar-select-option');
      for (var i = 0; i < opts.length; i++) {
        var sel = opts[i].getAttribute('data-lang') === lang;
        opts[i].classList.toggle('is-selected', sel);
        opts[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      }
    });

    /* ── Timezone binding ── */
    if (document.getElementById('navbar-drawer-tz-btn')) {
      _bindSelect('navbar-drawer-tz-btn', 'navbar-drawer-tz-dropdown', function(opt) {
        var tz = opt.getAttribute('data-tz') || '';
        /* Save to profile */
        var uid = self._user ? self._user.uid : null;
        if (uid && typeof ProfileStore !== 'undefined') {
          var profile = ProfileStore.getOrDefault(uid);
          profile.timezone = tz;
          ProfileStore.save(uid, profile);
        }
        /* Sync profile edit form if open on same page */
        if (typeof ProfileEdit !== 'undefined' && ProfileEdit.setTimezone) {
          ProfileEdit.setTimezone(tz);
        }
        /* Update display label */
        var tzVal = document.getElementById('navbar-drawer-tz-val');
        if (tzVal) tzVal.textContent = tz ? tz.split('/').pop().replace(/_/g, ' ') : 'Auto';
        /* Update selected state */
        var opts2 = document.querySelectorAll('#navbar-drawer-tz-dropdown .navbar-select-option');
        for (var j = 0; j < opts2.length; j++) {
          var sel2 = (opts2[j].getAttribute('data-tz') || '') === tz;
          opts2[j].classList.toggle('is-selected', sel2);
          opts2[j].setAttribute('aria-selected', sel2 ? 'true' : 'false');
        }
      });
    }
  },

  /* ── SVG Icons ─────────────────────────────────────────── */
  _buildIcon: function(name) {
    var icons = {
      home:     '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 15V9h4v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      eye:      '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>',
      edit:     '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      logout:   '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l4-4-4-4M11 8H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      calendar: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      catalog:  '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      wallet:   '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 8h14" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="11" r="1" fill="currentColor"/></svg>',
      finance:  '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 8h2m2 0h2M5 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5 1l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      dashboard: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
      students:  '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="5" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 11.5c1 .5 1.5 1.3 1.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    };
    return icons[name] || '';
  },

  /* ── Bind Hamburger ────────────────────────────────────── */
  _bindHamburger: function() {
    var hamburger = document.getElementById('navbar-hamburger');
    var dropdown  = document.getElementById('navbar-dropdown');
    var overlay   = document.getElementById('navbar-drawer-overlay');
    var closeBtn  = document.getElementById('navbar-drawer-close');
    var logoutDd  = document.getElementById('navbar-dropdown-logout');

    if (!hamburger || !dropdown) return; /* not shown for unauthenticated */

    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (dropdown.classList.contains('is-open')) {
        Navbar._closeDropdown();
      } else {
        Navbar._openDropdown();
      }
    });

    /* Close on overlay click */
    if (overlay) {
      overlay.addEventListener('click', function() { Navbar._closeDropdown(); });
    }

    /* Close button inside drawer */
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { Navbar._closeDropdown(); });
    }

    /* Close with Escape */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') Navbar._closeDropdown();
    });

    /* Logout */
    if (logoutDd) {
      logoutDd.addEventListener('click', function() { Auth.logout(); });
    }
  },

  _openDropdown: function() {
    var hamburger = document.getElementById('navbar-hamburger');
    var dropdown  = document.getElementById('navbar-dropdown');
    var overlay   = document.getElementById('navbar-drawer-overlay');
    if (!dropdown) return;

    /* Refresh name + avatar when opening */
    var user = Auth.current();
    var nameEl = document.getElementById('navbar-dropdown-username');
    if (nameEl && user) {
      nameEl.textContent = ProfileStore.getDisplayName(user.uid);
    }

    dropdown.classList.add('is-open');
    dropdown.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('is-open');
    if (hamburger) {
      hamburger.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
    document.body.classList.add('overlay-open');
  },

  _closeDropdown: function() {
    var hamburger = document.getElementById('navbar-hamburger');
    var dropdown  = document.getElementById('navbar-dropdown');
    var overlay   = document.getElementById('navbar-drawer-overlay');
    if (!dropdown) return;
    dropdown.classList.remove('is-open');
    dropdown.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('is-open');
    if (hamburger) {
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('overlay-open');
  },

  /* ── Welcome Dialog ────────────────────────────────────── */
  _maybeShowWelcome: function() {
    var self    = this;
    var user    = self._user;
    if (!user) return;

    /* Never show on profile-edit or profile-view pages */
    var path = window.location.pathname;
    if (path.indexOf('profile-edit') !== -1) return;
    if (path.indexOf('profile-view') !== -1) return;

    /* Schon gesehen? */
    try {
      var seen = localStorage.getItem(self._WELCOME_KEY + '_' + user.uid);
      if (seen) return;
    } catch(e) { return; }

    /* Profil schon ausgefüllt (Name + mind. 1 weiteres Feld)? */
    var profile = null;
    try {
      profile = ProfileStore ? ProfileStore.get(user.uid) : null;
    } catch(e) { /* ProfileStore evtl. nicht geladen */ }

    if (profile && profile.bio && profile.pricePerHalfHour) return;

    /* Kleines Timeout damit die Seite erst rendert */
    setTimeout(function() {
      self._showWelcomeDialog();
    }, 600);
  },

  _showWelcomeDialog: function() {
    var self = this;
    var user = self._user;
    var uid  = self._uid;
    var t    = self._i18n;

    var overlay = document.createElement('div');
    overlay.className  = 'modal-overlay';
    overlay.id         = 'welcome-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t.welcomeTitle);

    overlay.innerHTML =
      '<div class="modal welcome-modal">' +
        '<div class="welcome-modal-icon">' +
          '<svg width="32" height="32" viewBox="0 0 32 32" fill="none">' +
            '<rect width="32" height="32" rx="8" fill="var(--color-900)"/>' +
            '<path d="M10 16h12M16 10v12" stroke="white" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>' +
        '</div>' +
        '<h2 class="modal-title welcome-modal-title">' + t.welcomeTitle + '</h2>' +
        '<p class="welcome-modal-body">' + t.welcomeBody + '</p>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost btn-sm" id="welcome-skip">' + t.welcomeSkip + '</button>' +
          '<a class="btn btn-primary" id="welcome-go" href="./profile-edit.html' + (uid ? '?uid=' + uid + '&owner=' + uid : '') + '">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            t.welcomeBtn +
          '</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function dismiss() {
      overlay.remove();
      try {
        localStorage.setItem(self._WELCOME_KEY + '_' + user.uid, '1');
      } catch(e) {}
    }

    document.getElementById('welcome-skip').addEventListener('click', dismiss);
    /* Also dismiss (set seen) when user clicks the profile link */
    var goBtn = document.getElementById('welcome-go');
    if (goBtn) goBtn.addEventListener('click', dismiss);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') {
        dismiss();
        document.removeEventListener('keydown', esc);
      }
    });
  },

  /* ── Smart scroll: hide on down, show on up ────────────── */
  _bindScrollBehavior: function() {
    var nav        = document.getElementById('main-navbar');
    if (!nav) return;

    var lastY      = window.pageYOffset || 0;
    var hidden     = false;
    var THRESHOLD  = 6;
    var ticking    = false;

    function update() {
      var currentY = window.pageYOffset || 0;
      var delta    = currentY - lastY;

      /* Always show at very top */
      if (currentY <= 4) {
        if (hidden) { nav.classList.remove('navbar-hidden'); document.body.classList.remove('navbar-is-hidden'); hidden = false; }
        lastY   = currentY;
        ticking = false;
        return;
      }

      /* Don't hide if dropdown is open */
      var dropdown = document.getElementById('navbar-dropdown');
      if (dropdown && dropdown.classList.contains('is-open')) {
        lastY   = currentY;
        ticking = false;
        return;
      }

      if (delta > THRESHOLD && !hidden) {
        nav.classList.add('navbar-hidden');
        document.body.classList.add('navbar-is-hidden');
        hidden = true;
      } else if (delta < -THRESHOLD && hidden) {
        nav.classList.remove('navbar-hidden');
        document.body.classList.remove('navbar-is-hidden');
        hidden = false;
      }

      lastY   = currentY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
  }

};

/* ── Navbar.updateTimezone — sync hamburger TZ display after external change ── */
Navbar.updateTimezone = function(tz) {
  var tzVal = document.getElementById('navbar-drawer-tz-val');
  if (tzVal) tzVal.textContent = tz ? tz.split('/').pop().replace(/_/g, ' ') : 'Auto';
  var opts = document.querySelectorAll('#navbar-drawer-tz-dropdown .navbar-select-option');
  for (var i = 0; i < opts.length; i++) {
    var sel = (opts[i].getAttribute('data-tz') || '') === (tz || '');
    opts[i].classList.toggle('is-selected', sel);
    opts[i].setAttribute('aria-selected', sel ? 'true' : 'false');
  }
};

window.Navbar = Navbar;
