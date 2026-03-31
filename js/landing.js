/**
 * landing.js — Landing Page Logic
 *
 * Verantwortlichkeiten:
 *  - Navbar initialisieren (kein Auth-Guard, public page)
 *  - AuthModal öffnen bei Login-Button und Hero-CTA
 *  - Skiing-Karte → skiing.html navigieren
 *  - Coming-soon Karten: keine Navigation
 *
 * i18n Namespace: landing
 * Regeln: var only, function(){}, string concat, no arrow functions,
 *         no ?. or ??, no template literals, no inline styles
 */

/* ── i18n ───────────────────────────────────────────────── */
var LandingI18n = {
  navLoginBtn:        'Anmelden',
  navSignupBtn:       'Registrieren',
  authModalTitle:     'Willkommen',
  authTabSignIn:      'Sign In',
  authTabSignUp:      'Sign Up',
  signInEmailLabel:   'E-Mail oder Benutzername',
  signInEmailPlaceholder: 'deine@email.com oder @benutzername',
  signInPasswordLabel: 'Passwort',
  signInPasswordPlaceholder: '••••••••',
  signInSubmit:       'Anmelden',
  signUpNameLabel:    'Vollständiger Name',
  signUpRoleLabel:    'Ich bin…',
  signUpRoleTeacher:  'Lehrer / Instruktor',
  signUpRoleStudent:  'Schüler / Kursteilnehmer',
  signUpDisciplineLabel: 'Beruf / Disziplin',
  signUpDisciplineHint: 'Wird in deinem öffentlichen Profil angezeigt.',
  signUpSuccessTeacher: 'Konto erstellt! Richte jetzt dein Profil ein.',
  signUpSuccessStudent: 'Konto erstellt! Willkommen.',
  errorEmptyName:     'Bitte Namen eingeben.',
  errorEmptyRole:     'Bitte Rolle wählen.',
  errorEmailExists:   'Diese E-Mail ist bereits registriert.',
  errorWeakPassword:  'Passwort muss mindestens 6 Zeichen haben.',
  signUpNamePlaceholder: 'Max Mustermann',
  signUpEmailLabel:   'E-Mail',
  signUpEmailPlaceholder: 'deine@email.com',
  signUpPasswordLabel: 'Passwort',
  signUpPasswordPlaceholder: 'Mindestens 8 Zeichen',
  signUpSubmit:          'Konto erstellen',
  signUpUsernameLabel:   'Benutzername',
  signUpUsernamePlaceholder: 'benutzername',
  signUpUsernameHint:    'Wird automatisch vorgeschlagen. Eindeutig, 3–30 Zeichen.',
  errorUsernameTaken:    'Dieser Benutzername ist bereits vergeben.',
  errorUsernameFormat:   'Nur Buchstaben, Zahlen, Punkt — mind. 3 Zeichen.',
  orDivider:             'oder',
  googleSignIn:       'Mit Google anmelden',
  googleSignUp:       'Mit Google registrieren',
  mockupNotice:       'Mockup — Funktion folgt demnächst.',
  errorEmptyEmail:    'Bitte E-Mail-Adresse eingeben.',
  errorEmptyPassword: 'Bitte Passwort eingeben.',
  errorEmptyName:     'Bitte Namen eingeben.',
  signUpNotice:       'Registrierung erfolgt über den Admin-Bereich.',
  comingSoon:         'Demnächst verfügbar'
};

/* ── Custom dropdown helper for Auth Modal ──────────────────
   Binds a .custom-dropdown[data-dropdown-id] inside the modal.
   onChange(value) is called when user picks an item.
──────────────────────────────────────────────────────────── */
function _bindAuthDropdown(ddId, onChange) {
  var dd = document.querySelector('[data-dropdown-id="' + ddId + '"]');
  if (!dd) return;
  var trigger = dd.querySelector('.custom-dropdown-trigger');
  var list    = dd.querySelector('.custom-dropdown-list');
  var label   = dd.querySelector('.custom-dropdown-label');
  if (!trigger || !list || !label) return;

  function _closeAll() {
    var open = document.querySelectorAll('.auth-modal .custom-dropdown-trigger.is-open, #auth-modal-overlay .custom-dropdown-trigger.is-open');
    for (var i = 0; i < open.length; i++) {
      if (open[i] === trigger) continue;
      open[i].classList.remove('is-open');
      open[i].setAttribute('aria-expanded', 'false');
      var lid = _closest(open[i], '.custom-dropdown');
      if (lid) lid.querySelector('.custom-dropdown-list').classList.remove('is-open');
    }
  }

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = trigger.classList.contains('is-open');
    _closeAll();
    trigger.classList.toggle('is-open', !isOpen);
    trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    list.classList.toggle('is-open', !isOpen);
  });

  var items = list.querySelectorAll('.custom-dropdown-item');
  for (var i = 0; i < items.length; i++) {
    (function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        var val = item.getAttribute('data-value') || '';
        var allItems = list.querySelectorAll('.custom-dropdown-item');
        for (var j = 0; j < allItems.length; j++) {
          allItems[j].classList.remove('is-active');
          allItems[j].setAttribute('aria-selected', 'false');
        }
        item.classList.add('is-active');
        item.setAttribute('aria-selected', 'true');
        label.textContent = item.textContent.trim();
        dd.setAttribute('data-dropdown-value', val);
        trigger.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.remove('is-open');
        if (onChange) onChange(val);
      });
    })(items[i]);
  }

  document.addEventListener('click', function _authDdClose(e) {
    if (!dd.contains(e.target)) {
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      list.classList.remove('is-open');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   AuthModal — Standalone-Objekt
══════════════════════════════════════════════════════════ */
var AuthModal = {

  _overlay: null,
  _activeTab: 'signin',
  _hint: null,

  open: function(initialTab, hint) {
    var self = this;
    self._activeTab = initialTab || 'signin';
    self._hint      = hint || null;

    if (self._overlay) {
      /* Update hint text if modal already open */
      var hintEl = document.getElementById('auth-modal-hint');
      if (hintEl) {
        hintEl.textContent = self._hint || '';
        hintEl.classList.toggle('is-hidden', !self._hint);
      }
      self._setTab(self._activeTab);
      return;
    }

    self._render();
    self._bind();
    self._setTab(self._activeTab);
  },

  close: function() {
    var self = this;
    if (!self._overlay) return;
    self._overlay.remove();
    self._overlay = null;
  },

  _render: function() {
    var self = this;
    var t    = LandingI18n;

    var overlay = document.createElement('div');
    overlay.className  = 'modal-overlay';
    overlay.id         = 'auth-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t.authModalTitle);

    overlay.innerHTML =
      '<div class="modal auth-modal">' +
        '<div class="modal-header">' +
          '<span class="modal-title">' + t.authModalTitle + '</span>' +
          '<button class="modal-close" id="auth-modal-close" aria-label="Schließen">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
              '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body">' +

          /* Contextual hint (e.g. "Melde dich an, um mit X zu chatten") */
          '<div class="auth-hint' + (self._hint ? '' : ' is-hidden') + '" id="auth-modal-hint">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
              '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>' +
              '<path d="M8 7v4M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
            '</svg>' +
            '<span id="auth-modal-hint-text">' + (self._hint ? self._hint : '') + '</span>' +
          '</div>' +

          /* Tab switcher */
          '<div class="auth-tabs" role="tablist">' +
            '<button class="auth-tab-btn" id="auth-tab-signin" role="tab" aria-controls="auth-panel-signin" aria-selected="false">' +
              t.authTabSignIn +
            '</button>' +
            '<button class="auth-tab-btn" id="auth-tab-signup" role="tab" aria-controls="auth-panel-signup" aria-selected="false">' +
              t.authTabSignUp +
            '</button>' +
          '</div>' +

          /* ── Sign In Panel ── */
          '<div class="auth-panel" id="auth-panel-signin" role="tabpanel" aria-labelledby="auth-tab-signin">' +

            '<div class="form-group">' +
              '<label class="form-label" for="signin-email">' + t.signInEmailLabel + '</label>' +
              '<input class="form-input" type="text" id="signin-email" placeholder="' + t.signInEmailPlaceholder + '" autocomplete="username" />' +
            '</div>' +

            '<div class="form-group">' +
              '<label class="form-label" for="signin-password">' + t.signInPasswordLabel + '</label>' +
              '<input class="form-input" type="password" id="signin-password" placeholder="' + t.signInPasswordPlaceholder + '" autocomplete="current-password" />' +
              '<span class="form-error-msg is-hidden" id="signin-error"></span>' +
            '</div>' +

            '<button class="btn btn-primary auth-submit-btn" id="signin-submit">' + t.signInSubmit + '</button>' +

            '<p class="auth-switch-hint">Noch kein Konto? <button type="button" class="auth-switch-link" id="auth-switch-to-signup">Jetzt registrieren</button></p>' +

            '<div class="auth-divider">' +
              '<span class="auth-divider-line"></span>' +
              '<span>' + t.orDivider + '</span>' +
              '<span class="auth-divider-line"></span>' +
            '</div>' +

            '<button class="auth-google-btn" id="signin-google">' +
              AuthModal._googleIcon() +
              t.googleSignIn +
            '</button>' +

            '</div>' +

          /* ── Sign Up Panel ── */
          '<div class="auth-panel" id="auth-panel-signup" role="tabpanel" aria-labelledby="auth-tab-signup">' +

            '<div class="form-group">' +
              '<label class="form-label" for="signup-name">' + t.signUpNameLabel + '</label>' +
              '<input class="form-input" type="text" id="signup-name" placeholder="' + t.signUpNamePlaceholder + '" autocomplete="name" />' +
              '<span class="form-error-msg is-hidden" id="signup-e-name"></span>' +
            '</div>' +

            '<div class="form-group">' +
              '<label class="form-label" for="signup-username">' + t.signUpUsernameLabel + '</label>' +
              '<div class="auth-username-wrap">' +
                '<span class="auth-username-prefix">@</span>' +
                '<input class="form-input auth-username-input" type="text" id="signup-username" placeholder="' + t.signUpUsernamePlaceholder + '" autocomplete="username" />' +
              '</div>' +
              '<span class="form-hint">' + t.signUpUsernameHint + '</span>' +
              '<span class="form-error-msg is-hidden" id="signup-e-username"></span>' +
            '</div>' +

            '<div class="form-group">' +
              '<label class="form-label" for="signup-email">' + t.signUpEmailLabel + '</label>' +
              '<input class="form-input" type="email" id="signup-email" placeholder="' + t.signUpEmailPlaceholder + '" autocomplete="email" />' +
              '<span class="form-error-msg is-hidden" id="signup-e-email"></span>' +
            '</div>' +

            '<div class="form-group">' +
              '<label class="form-label" for="signup-password">' + t.signUpPasswordLabel + '</label>' +
              '<input class="form-input" type="password" id="signup-password" placeholder="' + t.signUpPasswordPlaceholder + '" autocomplete="new-password" />' +
              '<span class="form-error-msg is-hidden" id="signup-e-password"></span>' +
            '</div>' +

            '<div class="form-group">' +
              '<label class="form-label">' + t.signUpRoleLabel + '</label>' +
              '<div class="custom-dropdown" id="signup-dd-role" data-dropdown-id="signup-role" data-dropdown-value="">' +
                '<button type="button" class="custom-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">' +
                  '<span class="custom-dropdown-label">Rolle wählen…</span>' +
                  '<svg class="custom-dropdown-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>' +
                '<ul class="custom-dropdown-list" role="listbox" data-dropdown-list="signup-role">' +
                  '<li class="custom-dropdown-item" role="option" data-value="teacher" aria-selected="false">' + t.signUpRoleTeacher + '</li>' +
                  '<li class="custom-dropdown-item" role="option" data-value="student" aria-selected="false">' + t.signUpRoleStudent + '</li>' +
                '</ul>' +
              '</div>' +
              '<span class="form-error-msg is-hidden" id="signup-e-role"></span>' +
            '</div>' +

            '<div class="form-group is-hidden" id="signup-discipline-group">' +
              '<label class="form-label">' + t.signUpDisciplineLabel + '</label>' +
              '<div class="custom-dropdown" id="signup-dd-discipline" data-dropdown-id="signup-discipline" data-dropdown-value="">' +
                '<button type="button" class="custom-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">' +
                  '<span class="custom-dropdown-label">Keine Angabe</span>' +
                  '<svg class="custom-dropdown-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>' +
                '<ul class="custom-dropdown-list" role="listbox" data-dropdown-list="signup-discipline">' +
                  '<li class="custom-dropdown-item is-active" role="option" data-value="" aria-selected="true">Keine Angabe</li>' +
                  '<li class="custom-dropdown-item" role="option" data-value="ski" aria-selected="false">Ski-Instruktor</li>' +
                  '<li class="custom-dropdown-item" role="option" data-value="snowboard" aria-selected="false">Snowboard-Instruktor</li>' +
                  '<li class="custom-dropdown-item" role="option" data-value="paragliding" aria-selected="false">Paragliding-Instruktor</li>' +
                  '<li class="custom-dropdown-item" role="option" data-value="climbing" aria-selected="false">Kletter-Instruktor</li>' +
                  '<li class="custom-dropdown-item" role="option" data-value="diving" aria-selected="false">Tauch-Instruktor</li>' +
                '</ul>' +
              '</div>' +
              '<span class="form-hint">' + t.signUpDisciplineHint + '</span>' +
            '</div>' +

            '<button class="btn btn-primary auth-submit-btn" id="signup-submit">' + t.signUpSubmit + '</button>' +

            '<p class="auth-switch-hint">Bereits registriert? <button type="button" class="auth-switch-link" id="auth-switch-to-signin">Anmelden</button></p>' +

            '<div class="auth-divider">' +
              '<span class="auth-divider-line"></span>' +
              '<span>' + t.orDivider + '</span>' +
              '<span class="auth-divider-line"></span>' +
            '</div>' +

            '<button class="auth-google-btn" id="signup-google">' +
              AuthModal._googleIcon() +
              t.googleSignUp +
            '</button>' +

          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    self._overlay = overlay;
  },

  _googleIcon: function() {
    return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
      '<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>' +
      '<path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>' +
      '<path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>' +
      '<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>' +
    '</svg>';
  },

  _bind: function() {
    var self = this;

    /* Bind custom dropdowns first — they must exist in DOM */
    _bindAuthDropdown('signup-role', function(val) {
      var grp = document.getElementById('signup-discipline-group');
      if (grp) grp.classList.toggle('is-hidden', val !== 'teacher');
      if (val !== 'teacher') {
        var discDd = document.getElementById('signup-dd-discipline');
        if (discDd) {
          discDd.setAttribute('data-dropdown-value', '');
          var discLbl = discDd.querySelector('.custom-dropdown-label');
          if (discLbl) discLbl.textContent = 'Keine Angabe';
          var discItems = discDd.querySelectorAll('.custom-dropdown-item');
          for (var k = 0; k < discItems.length; k++) {
            discItems[k].classList.remove('is-active');
            discItems[k].setAttribute('aria-selected', 'false');
          }
          var first = discDd.querySelector('.custom-dropdown-item');
          if (first) { first.classList.add('is-active'); first.setAttribute('aria-selected', 'true'); }
        }
      }
    });
    _bindAuthDropdown('signup-discipline', null);

    /* Close button */
    var closeBtn = document.getElementById('auth-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    /* Overlay click outside */
    self._overlay.addEventListener('click', function(e) {
      if (e.target === self._overlay) self.close();
    });

    /* Escape key */
    document.addEventListener('keydown', function authEsc(e) {
      if (e.key === 'Escape') {
        self.close();
        document.removeEventListener('keydown', authEsc);
      }
    });

    /* Tab buttons */
    var tabSignIn = document.getElementById('auth-tab-signin');
    var tabSignUp = document.getElementById('auth-tab-signup');

    if (tabSignIn) tabSignIn.addEventListener('click', function() { self._setTab('signin'); });
    if (tabSignUp) tabSignUp.addEventListener('click', function() { self._setTab('signup'); });

    /* Tab-switch links inside panels */
    var switchToSignup = document.getElementById('auth-switch-to-signup');
    var switchToSignin = document.getElementById('auth-switch-to-signin');
    if (switchToSignup) switchToSignup.addEventListener('click', function() { self._setTab('signup'); });
    if (switchToSignin) switchToSignin.addEventListener('click', function() { self._setTab('signin'); });

    /* ── Sign In: E-Mail oder Benutzername + Passwort ── */
    var signinSubmit = document.getElementById('signin-submit');
    if (signinSubmit) {
      signinSubmit.addEventListener('click', function() {
        self._clearSigninError();
        var query = (document.getElementById('signin-email').value || '').trim();
        var pw    = (document.getElementById('signin-password').value || '');
        if (!query) { self._showSigninError(LandingI18n.errorEmptyEmail); return; }
        if (!pw)    { self._showSigninError(LandingI18n.errorEmptyPassword); return; }
        signinSubmit.disabled = true;
        Auth.loginByEmailOrUsername(query, pw,
          function() { /* onSuccess — redirect handled inside */ },
          function(msg) {
            self._showSigninError(msg);
            signinSubmit.disabled = false;
          }
        );
      });
    }

    var signinPassword = document.getElementById('signin-password');
    if (signinPassword) {
      signinPassword.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { signinSubmit && signinSubmit.click(); }
      });
    }

    /* ── Sign In: Google Mock ─────────────────────── */
    var signinGoogle = document.getElementById('signin-google');
    if (signinGoogle) {
      signinGoogle.addEventListener('click', function() {
        self.close();
        _openGooglePicker();
      });
    }

    /* ── Sign Up: auto-generate username on name blur ── */
    var signupName = document.getElementById('signup-name');
    var signupUsername = document.getElementById('signup-username');
    if (signupName && signupUsername) {
      signupName.addEventListener('blur', function() {
        var n = signupName.value.trim();
        if (!n || signupUsername.value.trim()) return; /* skip if already filled */
        AppService.generateUsername(n, function(err, suggested) {
          if (!err && suggested && !signupUsername.value.trim()) {
            signupUsername.value = suggested;
          }
        });
      });
      signupUsername.addEventListener('input', function() {
        var uEl = document.getElementById('signup-e-username');
        if (uEl) { uEl.textContent = ''; uEl.classList.add('is-hidden'); }
      });
    }

    /* ── Sign Up: custom dropdown binding (role + discipline) ── */
    _bindAuthDropdown('signup-role', function(val) {
      var grp = document.getElementById('signup-discipline-group');
      if (grp) grp.classList.toggle('is-hidden', val !== 'teacher');
      if (val !== 'teacher') {
        var discDd = document.getElementById('signup-dd-discipline');
        if (discDd) {
          discDd.setAttribute('data-dropdown-value', '');
          var discLbl = discDd.querySelector('.custom-dropdown-label');
          if (discLbl) discLbl.textContent = 'Keine Angabe';
          var discItems = discDd.querySelectorAll('.custom-dropdown-item');
          for (var k = 0; k < discItems.length; k++) {
            discItems[k].classList.remove('is-active');
            discItems[k].setAttribute('aria-selected', 'false');
          }
          var first = discDd.querySelector('.custom-dropdown-item');
          if (first) { first.classList.add('is-active'); first.setAttribute('aria-selected', 'true'); }
        }
      }
    });
    _bindAuthDropdown('signup-discipline', null);

    /* ── Sign Up: real account creation ──────────────── */
    var signupSubmit = document.getElementById('signup-submit');
    if (signupSubmit) {
      signupSubmit.addEventListener('click', function() {
        self._clearSignupErrors();

        var name       = (document.getElementById('signup-name').value || '').trim();
        var usernameEl = document.getElementById('signup-username');
        var username   = (usernameEl ? usernameEl.value : '').trim().toLowerCase().replace(/^@/, '');
        var email      = (document.getElementById('signup-email').value || '').trim().toLowerCase();
        var pw         = (document.getElementById('signup-password').value || '');
        var roleDd     = document.getElementById('signup-dd-role');
        var role       = roleDd ? (roleDd.getAttribute('data-dropdown-value') || '') : '';
        var discDd     = document.getElementById('signup-dd-discipline');
        var discipline = role === 'teacher'
          ? (discDd ? (discDd.getAttribute('data-dropdown-value') || '') : '')
          : '';

        var valid = true;
        if (!name)         { self._showSignupError('signup-e-name',     LandingI18n.errorEmptyName);    valid = false; }
        if (!email)        { self._showSignupError('signup-e-email',    LandingI18n.errorEmptyEmail);   valid = false; }
        if (pw.length < 6) { self._showSignupError('signup-e-password', LandingI18n.errorWeakPassword); valid = false; }
        if (!role)         { self._showSignupError('signup-e-role',     LandingI18n.errorEmptyRole);    valid = false; }
        if (!valid) return;

        if (username && (username.length < 3 || !/^[a-z0-9._]+$/.test(username))) {
          self._showSignupError('signup-e-username', LandingI18n.errorUsernameFormat);
          return;
        }

        var existingUsers = AppService.getUsersByRoleSync('teacher')
          .concat(AppService.getUsersByRoleSync('student'))
          .concat(AppService.getUsersByRoleSync('admin'));
        for (var i = 0; i < existingUsers.length; i++) {
          if ((existingUsers[i].email || '').toLowerCase() === email) {
            self._showSignupError('signup-e-email', LandingI18n.errorEmailExists);
            return;
          }
        }

        var uidPrefix = role === 'teacher' ? 'u_t_' : 'u_s_';
        var newUid    = uidPrefix + Date.now();

        function _doCreate(finalUsername) {
          AppService.createUser({
            uid: newUid, name: name, username: finalUsername,
            email: email, password: pw, role: role, discipline: discipline
          }, function(err, newUser) {
            if (err) {
              if (err.message && err.message.indexOf('Username') !== -1) {
                self._showSignupError('signup-e-username', err.message);
              } else {
                self._showSignupError('signup-e-email', err.message || 'Fehler beim Erstellen.');
              }
              return;
            }
            self.close();
            Toast.show(role === 'teacher' ? LandingI18n.signUpSuccessTeacher : LandingI18n.signUpSuccessStudent, 'success');
            var target = role === 'teacher'
              ? './profile-edit.html?uid=' + encodeURIComponent(newUser.uid) + '&owner=' + encodeURIComponent(newUser.uid)
              : './student.html?uid='      + encodeURIComponent(newUser.uid);
            setTimeout(function() { window.location.href = target; }, 800);
          });
        }

        if (!username) {
          AppService.generateUsername(name, function(err, suggested) { _doCreate(err ? '' : suggested); });
        } else {
          AppService.isUsernameAvailable(username, function(err, available) {
            if (err || !available) {
              self._showSignupError('signup-e-username', err ? err.message : LandingI18n.errorUsernameTaken);
              return;
            }
            _doCreate(username);
          });
        }
      });
    }
    var signupGoogle = document.getElementById('signup-google');
    if (signupGoogle) {
      signupGoogle.addEventListener('click', function() {
        self.close();
        _openGooglePicker();
      });
    }
  },

  _showSigninError: function(msg) {
    var el = document.getElementById('signin-error');
    if (el) { el.textContent = msg; el.classList.remove('is-hidden'); }
  },
  _clearSigninError: function() {
    var el = document.getElementById('signin-error');
    if (el) { el.textContent = ''; el.classList.add('is-hidden'); }
  },
  _showSignupError: function(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('is-hidden'); }
  },
  _clearSignupErrors: function() {
    var ids = ['signup-e-name', 'signup-e-email', 'signup-e-password', 'signup-e-role'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) { el.textContent = ''; el.classList.add('is-hidden'); }
    }
  },

  _setTab: function(tab) {
    var self = this;
    self._activeTab = tab;

    var tabSignIn  = document.getElementById('auth-tab-signin');
    var tabSignUp  = document.getElementById('auth-tab-signup');
    var panelSignIn = document.getElementById('auth-panel-signin');
    var panelSignUp = document.getElementById('auth-panel-signup');

    if (!tabSignIn || !tabSignUp) return;

    if (tab === 'signin') {
      tabSignIn.classList.add('active');
      tabSignIn.setAttribute('aria-selected', 'true');
      tabSignUp.classList.remove('active');
      tabSignUp.setAttribute('aria-selected', 'false');
      if (panelSignIn) panelSignIn.classList.add('is-active');
      if (panelSignUp) panelSignUp.classList.remove('is-active');
    } else {
      tabSignUp.classList.add('active');
      tabSignUp.setAttribute('aria-selected', 'true');
      tabSignIn.classList.remove('active');
      tabSignIn.setAttribute('aria-selected', 'false');
      if (panelSignUp) panelSignUp.classList.add('is-active');
      if (panelSignIn) panelSignIn.classList.remove('is-active');
    }
  }
};

/* ══════════════════════════════════════════════════════════
   Landing Page Init — only called from landing.html
   AuthModal bleibt global verfügbar für andere Seiten.
══════════════════════════════════════════════════════════ */
var LandingPage = {
  init: function() {
    /* Navbar — kein Auth-Guard, public page */
    Navbar.init('landing', {
      loginBtn: {
        label:   LandingI18n.navLoginBtn,
        onClick: function() { AuthModal.open('signin'); }
      },
      signupBtn: {
        label:   LandingI18n.navSignupBtn,
        onClick: function() { AuthModal.open('signup'); }
      }
    });

  /* Hero CTA */
  var heroCta = document.getElementById('hero-cta-signin');
  if (heroCta) {
    heroCta.addEventListener('click', function() {
      AuthModal.open('signin');
    });
  }

  /* Instructor CTA → SignUp */
  var instructorCta = document.getElementById('instructor-cta');
  if (instructorCta) {
    instructorCta.addEventListener('click', function() {
      AuthModal.open('signup', 'Registriere dich als Instruktor und erstelle dein Lehrerprofil.');
    });
  }

  /* Skiing card → skiing.html */
    var skiCard = document.getElementById('sport-skiing');
    if (skiCard) {
      skiCard.addEventListener('click', function() {
        window.location.href = './skiing.html';
      });

      /* Keyboard support */
      skiCard.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = './skiing.html';
        }
      });
    }

    /* Scroll-to-top button */
    var jumper = document.getElementById('section-jumper');
    var topBtn = document.getElementById('jump-top');

    function _updateLandingScrollBtn() {
      var navH = ((document.querySelector('.navbar') || {}).offsetHeight || 52) +
                 ((document.querySelector('.navbar-subbar') || {}).offsetHeight || 0);
      var scrolled = window.scrollY > navH;
      if (jumper) jumper.classList.toggle('is-visible', scrolled);
      if (topBtn) topBtn.classList.toggle('is-hidden-top', !scrolled);
    }

    if (topBtn) {
      topBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    window.addEventListener('scroll', _updateLandingScrollBtn);
    _updateLandingScrollBtn();
  }
};


/* ══════════════════════════════════════════════════════════
   Google Account Picker (Landing)
══════════════════════════════════════════════════════════ */
function _openGooglePicker() {
  /* Remove any existing picker */
  var old = document.getElementById('landing-google-picker-overlay');
  if (old) old.remove();

  var accounts = Auth.googleAccounts();

  var overlay = document.createElement('div');
  overlay.id        = 'landing-google-picker-overlay';
  overlay.className = 'google-picker-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Konto wählen');

  var listHTML = '';
  if (!accounts.length) {
    listHTML = '<div class="google-picker-empty">Keine Konten mit E-Mail-Adresse vorhanden.<br>Bitte erst im Admin-Bereich E-Mail-Adressen setzen.</div>';
  } else {
    for (var i = 0; i < accounts.length; i++) {
      var u       = accounts[i];
      var initial = (u.name || u.uid).charAt(0).toUpperCase();
      var roleLabel = u.role === 'teacher' ? 'Lehrer' : 'Schüler';
      listHTML +=
        '<button class="google-picker-item" data-uid="' + _escAttr(u.uid) + '" type="button">' +
          '<span class="google-picker-avatar">' + initial + '</span>' +
          '<span class="google-picker-info">' +
            '<span class="google-picker-name">' + _escHtml(u.name || u.uid) + '</span>' +
            '<span class="google-picker-email">' + _escHtml(u.email) + '</span>' +
          '</span>' +
          '<span class="google-picker-role">' + roleLabel + '</span>' +
        '</button>';
    }
  }

  overlay.innerHTML =
    '<div class="google-picker">' +
      '<div class="google-picker-header">' +
        '<div class="google-picker-logo">' +
          '<svg viewBox="0 0 24 24" width="22" height="22">' +
            '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>' +
            '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>' +
            '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>' +
            '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>' +
          '</svg>' +
        '</div>' +
        '<div>' +
          '<div class="google-picker-title">Konto wählen</div>' +
          '<div class="google-picker-sub">Weiter zu BookingSystem</div>' +
        '</div>' +
        '<button class="google-picker-close" id="landing-picker-close" aria-label="Schließen">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
            '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="google-picker-list">' + listHTML + '</div>' +
      '<div class="google-picker-footer">' +
        '<span class="google-picker-hint">Mock-Login — kein echtes Google-Konto</span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  /* Close handlers */
  document.getElementById('landing-picker-close').addEventListener('click', function() {
    overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  /* Account click */
  var items = overlay.querySelectorAll('.google-picker-item');
  for (var j = 0; j < items.length; j++) {
    (function(item) {
      item.addEventListener('click', function() {
        overlay.remove();
        Auth.loginByGoogle(item.getAttribute('data-uid'));
      });
    })(items[j]);
  }
}

function _escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _escAttr(str) {
  return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Landing Currency Widget ──────────────────────────── */
function _initCurrencyWidget() {
  var footer = document.getElementById('landing-footer');
  if (!footer) return;
  if (typeof CurrencyService === 'undefined') return;

  var uid      = (typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().uid : null;
  var current  = CurrencyService.getUserCurrency(uid);
  var sym      = CurrencyService.getSymbol(current);
  var currencies = CurrencyService.getSupportedCurrencies();

  /* ── Währungs-Optionen ── */
  var currOpts = '';
  for (var i = 0; i < currencies.length; i++) {
    var c   = currencies[i];
    var sel = c.code === current;
    currOpts +=
      '<button class="footer-select-option' + (sel ? ' is-selected' : '') + '"' +
        ' data-currency="' + c.code + '" aria-selected="' + sel + '" role="option">' +
        '<span class="footer-select-flag">' + c.flag + '</span>' +
        '<span class="footer-select-code">' + c.code + '</span>' +
        '<span class="footer-select-name">' + c.name + '</span>' +
      '</button>';
  }

  /* ── Sprach-Optionen ── */
  var langOpts =
    '<button class="footer-select-option is-selected" data-lang="de" aria-selected="true" role="option">' +
      '<span class="footer-select-flag">🇩🇪</span>' +
      '<span class="footer-select-code">DE</span>' +
      '<span class="footer-select-name">Deutsch</span>' +
    '</button>';

  /* ── HTML injizieren ── */
  var html =
    /* Währungs-Combobox */
    '<div class="footer-select-group">' +
      '<label class="footer-select-label">Währung</label>' +
      '<div class="footer-select-wrap" id="footer-currency-wrap">' +
        '<button class="footer-select-btn" id="footer-currency-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="Währung wählen">' +
          '<span class="footer-select-val" id="footer-currency-val">' + sym + ' ' + current + '</span>' +
          '<svg class="footer-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="footer-select-dropdown is-hidden" id="footer-currency-dropdown" role="listbox">' +
          currOpts +
        '</div>' +
      '</div>' +
    '</div>' +
    /* Sprach-Combobox */
    '<div class="footer-select-group">' +
      '<label class="footer-select-label">Sprache</label>' +
      '<div class="footer-select-wrap" id="footer-lang-wrap">' +
        '<button class="footer-select-btn" id="footer-lang-btn"' +
          ' aria-haspopup="listbox" aria-expanded="false" aria-label="Sprache wählen">' +
          '<span class="footer-select-val" id="footer-lang-val">🇩🇪 Deutsch</span>' +
          '<svg class="footer-select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="footer-select-dropdown is-hidden" id="footer-lang-dropdown" role="listbox">' +
          langOpts +
        '</div>' +
      '</div>' +
    '</div>';

  /* In footer-right injizieren */
  var right = footer.querySelector('.landing-footer-right');
  if (right) right.innerHTML = html;

  /* ── Generischer Dropdown-Binder ── */
  function bindSelect(btnId, panelId, onSelect) {
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
      /* Alle schliessen */
      var allPanels = footer.querySelectorAll('.footer-select-dropdown');
      for (var p = 0; p < allPanels.length; p++) allPanels[p].classList.add('is-hidden');
      var allBtns = footer.querySelectorAll('.footer-select-btn');
      for (var b = 0; b < allBtns.length; b++) allBtns[b].setAttribute('aria-expanded', 'false');
      open();
    });

    document.addEventListener('click', function(e) {
      if (wrap && !wrap.contains(e.target)) close();
    });

    panel.addEventListener('click', function(e) {
      var opt = null;
      var t = e.target;
      while (t && t !== panel) {
        if (t.classList && t.classList.contains('footer-select-option')) { opt = t; break; }
        t = t.parentNode;
      }
      if (!opt) return;
      close();
      onSelect(opt);
    });
  }

  /* Währung binden */
  bindSelect('footer-currency-btn', 'footer-currency-dropdown', function(opt) {
    var code = opt.getAttribute('data-currency');
    if (!code || typeof CurrencyService === 'undefined') return;
    CurrencyService.setGuestCurrency(code, uid);

    var val = document.getElementById('footer-currency-val');
    if (val) val.textContent = CurrencyService.getSymbol(code) + ' ' + code;

    var opts = document.querySelectorAll('#footer-currency-dropdown .footer-select-option');
    for (var i = 0; i < opts.length; i++) {
      var s = opts[i].getAttribute('data-currency') === code;
      opts[i].classList.toggle('is-selected', s);
      opts[i].setAttribute('aria-selected', s ? 'true' : 'false');
    }
    /* Navbar-Symbol mitaktualisieren */
    var navSym = document.getElementById('navbar-currency-symbol');
    if (navSym) navSym.textContent = CurrencyService.getSymbol(code);
    /* Preise auf der aktuellen Seite neu berechnen — kein Reload */
    if (typeof SkiingCatalog !== 'undefined' && typeof SkiingCatalog.refreshPrices === 'function') {
      SkiingCatalog.refreshPrices();
    } else if (typeof ProfileView !== 'undefined' && typeof ProfileView.refreshPrices === 'function') {
      ProfileView.refreshPrices();
    }
  });

  /* Sprache binden (vorerst nur Anzeige) */
  bindSelect('footer-lang-btn', 'footer-lang-dropdown', function(opt) {
    var lang = opt.getAttribute('data-lang');
    if (!lang) return;
    var val = document.getElementById('footer-lang-val');
    var flag = opt.querySelector('.footer-select-flag');
    if (val) val.textContent = (flag ? flag.textContent + ' ' : '') + opt.querySelector('.footer-select-name').textContent;
    var opts = document.querySelectorAll('#footer-lang-dropdown .footer-select-option');
    for (var i = 0; i < opts.length; i++) {
      var s = opts[i].getAttribute('data-lang') === lang;
      opts[i].classList.toggle('is-selected', s);
      opts[i].setAttribute('aria-selected', s ? 'true' : 'false');
    }
  });
}

/* Init widget after CurrencyService is ready */
if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
  CurrencyService.onReady(_initCurrencyWidget);
} else {
  window.addEventListener('load', _initCurrencyWidget);
}

window.AuthModal  = AuthModal;
window.LandingPage = LandingPage;
