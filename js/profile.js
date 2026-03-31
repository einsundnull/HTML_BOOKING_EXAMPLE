/**
 * profile.js — Ski Instructor Profile System
 *
 * Objekte:
 *   ProfileI18n   — Übersetzungen (Namespace: profile, Deutsch Standard)
 *   ProfileStore  — Profil-Daten via localStorage (app_profiles)
 *   ProfileEdit   — Profil-Editor (profile-edit.html)
 *   ProfileView   — Öffentliche Profilansicht (profile-view.html)
 *
 * Regeln:
 *   var only, function(){}, string concatenation, no arrow functions,
 *   no ?. or ??, no template literals, no inline styles
 *
 * Abhängigkeiten:
 *   store.js, auth.js, ui.js (Modal, Toast)
 */

/* ── i18n ─────────────────────────────────────────────────────── */
var ProfileI18n = {
  de: {
    /* Page titles */
    editTitle:          'Profil bearbeiten',
    editSubtitle:       'Dein öffentliches Profil für Schüler',
    viewTitle:          'Lehrerprofil',

    /* Sections */
    sectionBasic:       'Basisinformationen',
    sectionBasicDesc:   'Name, Foto, Standort und kurze Vorstellung',
    sectionTeaching:    'Unterricht',
    sectionTeachingDesc:'Unterrichtsart, Zielgruppe und Level',
    sectionTerrain:     'Terrain & Pisten',
    sectionTerrainDesc: 'Auf welchen Pisten du unterrichtest',
    sectionCerts:       'Zertifikate & Ausbildung',
    sectionCertsDesc:   'Deine Qualifikationen und Lizenzen',
    sectionSpecs:       'Spezialisierungen',
    sectionSpecsDesc:   'Deine besonderen Stärken und Fachgebiete',
    sectionContact:     'Kontakt & Sichtbarkeit',
    sectionContactDesc: 'Wie Schüler dich erreichen können',

    /* Basic fields */
    labelPhoto:         'Profilbild',
    labelPhotoHint:     'JPG oder PNG, max. 2 MB',
    labelPhotoChange:   'Foto ändern',
    labelPhotoRemove:   'Entfernen',
    labelName:          'Name',
    labelAge:           'Alter',
    labelGender:        'Geschlecht',
    labelLocation:      'Standort / Skigebiet',
    labelBio:           'Kurzbeschreibung',
    labelBioPlaceholder:'Erzähl Schülern etwas über dich, deine Erfahrung und deinen Unterrichtsstil...',
    labelPrice:         'Preis pro 30 Minuten (€)',
    labelExperience:    'Jahre Erfahrung',
    labelLanguages:     'Sprachen',

    /* Gender options */
    genderMale:         'Männlich',
    genderFemale:       'Weiblich',
    genderDiverse:      'Divers',
    genderNoAnswer:     'Keine Angabe',

    /* Teaching fields */
    labelLessonTypes:   'Unterrichtsart',
    labelAudience:      'Zielgruppe',
    labelAgeFrom:       'Alter von',
    labelAgeTo:         'Alter bis',
    labelLevels:        'Level der Schüler',
    labelMaxGroup:      'Max. Gruppengröße',

    /* Lesson types */
    lessonPrivate:      'Einzelunterricht',
    lessonGroup:        'Gruppenunterricht',
    lessonPrivateGroup: 'Privatgruppe',

    /* Audience */
    audienceKids:       'Kinder',
    audienceTeens:      'Jugendliche',
    audienceAdults:     'Erwachsene',
    audienceSeniors:    'Senioren',

    /* Levels */
    levelBeginner:      'Anfänger',
    levelIntermediate:  'Mittelstufe',
    levelAdvanced:      'Fortgeschritten',
    levelExpert:        'Experten',

    /* Terrain */
    terrainGreen:       'Grüne Pisten',
    terrainBlue:        'Blaue Pisten',
    terrainRed:         'Rote Pisten',
    terrainBlack:       'Schwarze Pisten',
    terrainGreenSub:    'Anfänger',
    terrainBlueSub:     'Intermediate',
    terrainRedSub:      'Fortgeschritten',
    terrainBlackSub:    'Experten',

    /* Certs */
    labelCertOrg:       'Organisation',
    labelCertLevel:     'Level',
    labelCertYear:      'Jahr',
    labelAddCert:       '+ Zertifikat hinzufügen',
    labelNoCerts:       'Noch keine Zertifikate eingetragen.',

    /* Cert orgs */
    certISIA:           'ISIA (International)',
    certBASI:           'BASI (UK)',
    certPSIA:           'PSIA (USA)',
    certCSIA:           'CSIA (Kanada)',
    certDSV:            'DSV / DSLV (Deutschland)',
    certOther:          'Sonstige',

    /* Cert levels */
    certLevel1:         'Level 1',
    certLevel2:         'Level 2',
    certLevel3:         'Level 3',
    certLevel4:         'Level 4 / Master',

    /* Specializations */
    specKids:           'Kinderunterricht',
    specFreeride:       'Freeride / Off-piste',
    specFreestyle:      'Freestyle / Park',
    specRacing:         'Renntraining',
    specAnxiety:        'Angst-Training',
    specAdaptive:       'Adaptive Skiing',
    specSnowboard:      'Snowboard',
    specTelemark:       'Telemark',
    specFirstAid:       'Erste Hilfe',
    specAvalanche:      'Lawinenkurs',

    /* Contact */
    labelEmail:         'E-Mail',
    labelEmailVisible:  'E-Mail öffentlich anzeigen',
    labelPhone:         'Telefon',
    labelPhoneVisible:  'Telefon öffentlich anzeigen',
    labelInstagram:     'Instagram',
    labelWebsite:       'Website',

    /* Languages */
    langDE:             'Deutsch',
    langEN:             'Englisch',
    langFR:             'Französisch',
    langIT:             'Italienisch',
    langES:             'Spanisch',
    langRU:             'Russisch',
    langJA:             'Japanisch',
    langZH:             'Chinesisch',
    langOther:          'Weitere',

    /* Actions */
    save:               'Profil speichern',
    saving:             'Wird gespeichert...',
    saved:              'Profil gespeichert',
    cancel:             'Abbrechen',
    viewProfile:        'Profil ansehen',
    editProfile:        'Profil bearbeiten',
    backToEdit:         'Zurück',
    bookNow:            'Buchung anfragen',
    bookNowHint:        'Wähle zuerst diesen Lehrer im Katalog aus.',

    /* Skill level (student) */
    labelSkillLevel:      'Eigenes Fahrkönnen',
    skillBeginner:        'Anfänger',
    skillIntermediate:    'Mittelstufe',
    skillAdvanced:        'Fortgeschritten',
    skillExpert:          'Experte',
    viewSkillLevel:       'Fahrkönnen',
    sectionStudentInfo:   'Fahrerinfo',
    sectionStudentInfoDesc: 'Dein aktuelles Niveau und Sprachen',

    /* Booking permission (student) */
    labelBookingPermission:   'Einplanungserlaubnis für Lehrer',
    bookingPermAlways:        'Immer erlaubt',
    bookingPermOnRequest:     'Nur auf Nachfrage',
    bookingPermNever:         'Niemals',
    sectionBookingPerm:       'Buchungseinstellungen',
    sectionBookingPermDesc:   'Darf ein Lehrer dich direkt einplanen?',

    /* Currency (student) */
    sectionCurrency:      'Währungseinstellungen',
    sectionCurrencyDesc:  'Deine bevorzugte Anzeigewährung im Wallet',
    labelDisplayCurrency: 'Anzeigewährung (Wallet)',

    /* Validation */
    errorNameRequired:  'Name ist erforderlich.',
    errorPriceInvalid:  'Bitte einen gültigen Preis eingeben.',

    /* Profile view labels */
    viewExperience:     'Jahre Erfahrung',
    viewPrice:          'pro 30 Min.',
    viewLessonTypes:    'Unterrichtsart',
    viewAudience:       'Zielgruppe',
    viewLevels:         'Level',
    viewMaxGroup:       'Max. Gruppe',
    viewAgeRange:       'Altersbereich',
    viewLanguages:      'Sprachen',
    viewCerts:          'Zertifikate',
    viewSpecs:          'Spezialisierungen',
    viewTerrain:        'Terrain',
    viewContact:        'Kontakt',
    viewNoProfile:      'Kein Profil gefunden.',
    viewProfileIncomplete: 'Dieses Profil ist noch nicht vollständig ausgefüllt.',

    /* Unsaved changes dialog */
    unsavedTitle:       'Ungespeicherte Änderungen',
    unsavedBody:        'Du hast ungespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?',
    unsavedLeave:       'Verlassen',
    unsavedStay:        'Bleiben',

    /* Payment settings */
    sectionPayment:          'Preise & Zahlung',
    sectionPaymentDesc:      'Stundenpreis, Deposit und Zahlungsart',
    labelRequiresDeposit:    'Deposit erforderlich',
    labelRequiresDepositHint:'Schüler müssen beim Buchen ein Deposit hinterlegen',
    labelDepositMode:        'Deposit-Art',
    depositModeFixed:        'Fixbetrag (€)',
    depositModePercent:      'Prozentsatz (%)',
    labelDepositFixed:       'Deposit-Betrag (€)',
    labelDepositPercent:     'Deposit-Prozentsatz (%)',
    labelPaymentMode:        'Zahlungsart',
    paymentModeInstant:      'Sofortzahlung',
    paymentModeCash:         'Bar vor Ort',
    labelDepositPreview:     'Deposit bei aktuellem Preis',
    depositPreviewNone:      'Kein Deposit',
    depositPreviewNoPrice:   'Preis noch nicht gesetzt'
  },
  t: function(key) {
    return this.de[key] || key;
  }
};

/* ── ProfileStore ─────────────────────────────────────────────── */
var ProfileStore = (function() {

  var KEY = 'app_profiles';

  function _load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) {
      return {};
    }
  }

  function _save(data) {
    try {
      var serialized = JSON.stringify(data);
      var sizeKB = Math.round(serialized.length / 1024);
      console.log('[ProfileStore] writing ' + sizeKB + ' KB to localStorage');
      localStorage.setItem(KEY, serialized);
      console.log('[ProfileStore] write OK');
    } catch(e) {
      console.error('[ProfileStore] save FAILED:', e.name, e.message);
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        if (typeof Toast !== 'undefined') {
          Toast.error('Speichern fehlgeschlagen: Speicher voll. Bitte Foto verkleinern.');
        }
      }
    }
  }

  function get(uid) {
    var all = _load();
    return all[uid] || null;
  }

  function save(uid, profileData) {
    var all = _load();
    profileData.uid       = uid;
    profileData.updatedAt = new Date().toISOString();
    all[uid] = profileData;
    _save(all);
    return profileData;
  }

  function getDefault(uid) {
    var user = Store.Users.byUid(uid);  /* profile.js loads before AppService — direct Store access acceptable here */
    return {
      uid:           uid,
      name:          user ? user.name : '',
      age:           '',
      gender:        '',
      location:      '',
      bio:           '',
      photo:         '',
      pricePerHalfHour: '',
      priceCurrency:    'EUR', /* ISO 4217 — currency of teacher's price */
      displayCurrency:  'EUR', /* ISO 4217 — user's preferred display currency */
      experienceYears:  '',
      languages:     [],
      lessonTypes:   [],
      audience:      [],
      ageFrom:       '',
      ageTo:         '',
      levels:        [],
      maxGroupSize:  '',
      terrain:       [],
      certifications: [],
      specializations: [],
      email:         user ? (user.email || '') : '',
      emailVisible:  false,
      phone:         '',
      phoneVisible:  false,
      instagram:     '',
      website:       '',
      updatedAt:     null,
      /* Zahlungseinstellungen (nur fuer Teacher relevant) */
      requiresDeposit:      true,
      depositMode:          'percent',
      depositFixed:         20,
      depositPercent:       20,
      paymentMode:          'instant',
      cancellationWindow:   48,
      cancellationPartial:  50,
      cancellationStrict:   false,
      /* Schüler-spezifisch */
      skillLevel:           '',
      bookingPermission:    'always',
      /* Timezone — IANA string e.g. "Europe/Berlin". Empty = browser default. */
      timezone:             ''
    };
  }

  function getOrDefault(uid) {
    return get(uid) || getDefault(uid);
  }

  /* Display name: Profil-Name hat Vorrang vor Store-Name */
  function getDisplayName(uid) {
    if (!uid) return '—';
    var profile = get(uid);
    if (profile && profile.name && profile.name.trim()) return profile.name.trim();
    var user = Store.Users.byUid(uid);  /* profile.js loads before AppService — direct Store access acceptable here */
    return user ? user.name : uid;
  }

  /* Profilbild oder null */
  function getPhoto(uid) {
    var profile = get(uid);
    return (profile && profile.photo) ? profile.photo : null;
  }

  /* Preis oder null */
  function getPrice(uid) {
    var profile = get(uid);
    return (profile && profile.pricePerHalfHour) ? profile.pricePerHalfHour : null;
  }

  /* Spezialisierungen oder [] */
  function getSpecializations(uid) {
    var profile = get(uid);
    return (profile && profile.specializations) ? profile.specializations : [];
  }

  function getSkillLevel(uid) {
    var profile = get(uid);
    return (profile && profile.skillLevel) ? profile.skillLevel : '';
  }

  return {
    get:               get,
    save:              save,
    getDefault:        getDefault,
    getOrDefault:      getOrDefault,
    getDisplayName:    getDisplayName,
    getPhoto:          getPhoto,
    getPrice:          getPrice,
    getSpecializations: getSpecializations,
    getSkillLevel:     getSkillLevel,
    getBookingPermission: function(uid) {
      var p = get(uid);
      return (p && p.bookingPermission) ? p.bookingPermission : 'always';
    }
  };

})();

/* ── ProfileEdit ──────────────────────────────────────────────── */
var ProfileEdit = (function() {

  var _uid      = null;
  var _profile  = null;
  var _dirty    = false;
  var _snapshot = null; /* Net-change detection: serialized state at load/save */

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    try {
      console.log('[ProfileEdit] init — URL:', window.location.href);
      var user = Auth.current();
      console.log('[ProfileEdit] Auth.current():', user ? ('uid=' + user.uid + ' role=' + user.role) : 'NULL');

      if (!user) {
        var main = document.getElementById('profile-edit-main');
        if (main) main.innerHTML = '<p class="page-access-error">Kein Zugriff — bitte mit ?uid= aufrufen.</p>';
        return;
      }
      if (user.role !== 'teacher' && user.role !== 'student') {
        var main2 = document.getElementById('profile-edit-main');
        if (main2) main2.innerHTML = '<p class="page-access-error">Kein Zugriff.</p>';
        return;
      }

      /* ── Ownership check ──────────────────────────────────
         The caller must pass ?owner=SESSION_UID so we can verify
         the editing user actually owns this profile.
         Without this, any ?uid= in the URL would be editable by anyone. */
      var urlParams  = new URLSearchParams(window.location.search);
      var ownerParam = urlParams.get('owner');
      if (ownerParam && ownerParam !== user.uid) {
        var mainOwn = document.getElementById('profile-edit-main');
        if (mainOwn) mainOwn.innerHTML =
          '<p class="page-access-error">Kein Zugriff — du kannst nur dein eigenes Profil bearbeiten.</p>';
        console.warn('[ProfileEdit] Ownership mismatch: uid=' + user.uid + ' owner=' + ownerParam);
        return;
      }
      _uid     = user.uid;
      _profile = ProfileStore.getOrDefault(_uid);
      console.log('[ProfileEdit] profile loaded:', JSON.stringify(_profile).slice(0, 120));
      _render();
      _bindAll();
      _loadValues();
      if (user.role === 'teacher') { _bindPaymentEvents(); }
      _snapshot = _serializeState();
      _bindFabKeyboard();
      _bindEditJumper();
    } catch(e) {
      console.error('[ProfileEdit] init error:', e.message, e.stack);
    }
  }

  /* ── Render ────────────────────────────────────────────── */
  function _render() {
    var main = document.getElementById('profile-edit-main');
    if (!main) return;
    var isStudent = _profile && ProfileStore.get(_profile.uid) && Auth.current() && Auth.current().role === 'student';
    if (!isStudent) { isStudent = (Auth.current() && Auth.current().role === 'student'); }

    if (isStudent) {
      /* Students: only basic info + contact — no teaching/payment/terrain/certs/specs */
      main.innerHTML =
        _buildPhotoSection() +
        _buildAccordion('basic',      ProfileI18n.t('sectionBasic'),           ProfileI18n.t('sectionBasicDesc'),           _buildBasicFields()) +
        _buildAccordion('studentinfo', ProfileI18n.t('sectionStudentInfo'),    ProfileI18n.t('sectionStudentInfoDesc'),     _buildSkillLevelField()) +
        _buildAccordion('bookingperm', ProfileI18n.t('sectionBookingPerm'),    ProfileI18n.t('sectionBookingPermDesc'),     _buildBookingPermField()) +
        _buildAccordion('currency',   ProfileI18n.t('sectionCurrency'),        ProfileI18n.t('sectionCurrencyDesc'),        _buildStudentCurrencyFields()) +
        _buildAccordion('contact',    ProfileI18n.t('sectionContact'),         ProfileI18n.t('sectionContactDesc'),         _buildContactFields());
    } else {
      main.innerHTML =
        _buildPhotoSection() +
        _buildAccordion('basic',    ProfileI18n.t('sectionBasic'),    ProfileI18n.t('sectionBasicDesc'),    _buildBasicFields()) +
        _buildAccordion('teaching', ProfileI18n.t('sectionTeaching'), ProfileI18n.t('sectionTeachingDesc'), _buildTeachingFields()) +
        _buildAccordion('payment',  ProfileI18n.t('sectionPayment'),  ProfileI18n.t('sectionPaymentDesc'),  _buildPaymentFields()) +
        _buildAccordion('terrain',  ProfileI18n.t('sectionTerrain'),  ProfileI18n.t('sectionTerrainDesc'),  _buildTerrainFields()) +
        _buildAccordion('certs',    ProfileI18n.t('sectionCerts'),    ProfileI18n.t('sectionCertsDesc'),    _buildCertsSection()) +
        _buildAccordion('specs',    ProfileI18n.t('sectionSpecs'),    ProfileI18n.t('sectionSpecsDesc'),    _buildSpecsFields()) +
        _buildAccordion('contact',  ProfileI18n.t('sectionContact'),  ProfileI18n.t('sectionContactDesc'),  _buildContactFields());
    }
  }

  function _buildAccordion(id, title, desc, content) {
    return '<div class="profile-accordion" id="acc-' + id + '">' +
      '<button class="profile-acc-header" data-acc="' + id + '" aria-expanded="true">' +
        '<div class="profile-acc-title-wrap">' +
          '<span class="profile-acc-title">' + title + '</span>' +
          '<span class="profile-acc-desc">' + desc + '</span>' +
        '</div>' +
        '<svg class="profile-acc-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">' +
          '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +
      '<div class="profile-acc-body" id="acc-body-' + id + '">' +
        '<div class="profile-acc-inner">' + content + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── Custom dropdown builder ───────────────────────────── */
  /* Erzeugt ein Custom-Dropdown (kein nativer <select>).
   * id:      wird auf data-dropdown-id gesetzt (für _collect / _loadValues)
   * options: Array von [value, label]
   * current: aktuell ausgewählter Wert
   */
  function _buildCustomDropdown(id, options, current) {
    var currentLabel = options[0] ? options[0][1] : '';
    for (var i = 0; i < options.length; i++) {
      if (options[i][0] === current) { currentLabel = options[i][1]; break; }
    }
    var chevronSVG = '<svg class="custom-dropdown-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">' +
      '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    var itemsHTML = '';
    for (var j = 0; j < options.length; j++) {
      var isActive = options[j][0] === current;
      itemsHTML += '<li class="custom-dropdown-item' + (isActive ? ' is-active' : '') + '" ' +
        'role="option" data-value="' + options[j][0] + '" ' +
        'aria-selected="' + (isActive ? 'true' : 'false') + '">' +
        options[j][1] +
        '</li>';
    }
    return '<div class="custom-dropdown" data-dropdown-id="' + id + '">' +
      '<button type="button" class="custom-dropdown-trigger" ' +
        'aria-haspopup="listbox" aria-expanded="false" ' +
        'data-dropdown-trigger="' + id + '">' +
        '<span class="custom-dropdown-label" data-dropdown-label="' + id + '">' + currentLabel + '</span>' +
        chevronSVG +
      '</button>' +
      '<ul class="custom-dropdown-list" role="listbox" ' +
        'data-dropdown-list="' + id + '">' +
        itemsHTML +
      '</ul>' +
    '</div>';
  }

  function _buildPhotoSection() {
    return '<div class="profile-photo-section">' +
      '<div class="profile-photo-wrap">' +
        '<div class="profile-photo-preview" id="photo-preview">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>' +
        '<div class="profile-photo-actions">' +
          '<label class="btn btn-secondary btn-sm profile-photo-label" for="photo-input">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 10v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2M8 2v7M5 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            ProfileI18n.t('labelPhotoChange') +
          '</label>' +
          '<input type="file" id="photo-input" accept="image/jpeg,image/png" class="profile-photo-input" aria-label="' + ProfileI18n.t('labelPhoto') + '" />' +
          '<button type="button" class="btn btn-ghost btn-sm" id="photo-remove-btn">' + ProfileI18n.t('labelPhotoRemove') + '</button>' +
        '</div>' +
        '<span class="form-hint">' + ProfileI18n.t('labelPhotoHint') + '</span>' +
      '</div>' +
    '</div>';
  }

  function _buildBasicFields() {
    return '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-name">' + ProfileI18n.t('labelName') + '</label>' +
          '<input type="text" class="form-input" id="field-name" autocomplete="name" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-username">Benutzername</label>' +
          '<div class="auth-username-wrap">' +
            '<span class="auth-username-prefix">@</span>' +
            '<input type="text" class="form-input auth-username-input" id="field-username" autocomplete="username" placeholder="benutzername" />' +
          '</div>' +
          '<span class="form-hint">Eindeutig · 3–30 Zeichen · Buchstaben, Zahlen, Punkt</span>' +
          '<span class="form-error-msg is-hidden" id="field-username-error"></span>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-age">' + ProfileI18n.t('labelAge') + '</label>' +
          '<input type="number" class="form-input" id="field-age" min="18" max="80" />' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label">' + ProfileI18n.t('labelGender') + '</label>' +
          _buildCustomDropdown('field-gender', [
            ['',        '— Keine Angabe —'],
            ['male',    ProfileI18n.t('genderMale')],
            ['female',  ProfileI18n.t('genderFemale')],
            ['diverse', ProfileI18n.t('genderDiverse')]
          ], '') +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-location">' + ProfileI18n.t('labelLocation') + '</label>' +
          '<input type="text" class="form-input" id="field-location" placeholder="z.B. Zermatt, Schweiz" />' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-bio">' + ProfileI18n.t('labelBio') + '</label>' +
          '<textarea class="form-input profile-bio" id="field-bio" rows="4" placeholder="' + ProfileI18n.t('labelBioPlaceholder') + '"></textarea>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-experience">' + ProfileI18n.t('labelExperience') + '</label>' +
          '<input type="number" class="form-input" id="field-experience" min="0" max="50" />' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">' + ProfileI18n.t('labelLanguages') + '</label>' +
        '<div class="profile-tag-grid" id="tag-languages">' +
          _buildTagChips('languages', [
            ['de', ProfileI18n.t('langDE')],
            ['en', ProfileI18n.t('langEN')],
            ['fr', ProfileI18n.t('langFR')],
            ['it', ProfileI18n.t('langIT')],
            ['es', ProfileI18n.t('langES')],
            ['ru', ProfileI18n.t('langRU')],
            ['ja', ProfileI18n.t('langJA')],
            ['zh', ProfileI18n.t('langZH')]
          ]) +
          _buildCustomChipInput('languages', 'Sonstige Sprache') +
        '</div>' +
      '</div>';
  }

  function _buildStudentCurrencyFields() {
    var currencyOptions = [
      ['EUR','€ Euro'],['USD','$ US-Dollar'],['GBP','£ Britisches Pfund'],
      ['CHF','Fr Schweizer Franken'],['GEL','₾ Georgischer Lari'],
      ['JPY','¥ Japanischer Yen'],['TRY','₺ Türkische Lira'],
      ['PLN','zł Polnischer Zloty'],['CZK','Kč Tschechische Krone'],
      ['SEK','kr Schwedische Krone'],['RUB','₽ Russischer Rubel'],
      ['AED','د.إ Dirham (VAE)']
    ];
    var currentCurrency = (_profile && _profile.displayCurrency) ? _profile.displayCurrency : 'EUR';
    return '<div class="form-group">' +
      '<label class="form-label">' + ProfileI18n.t('labelDisplayCurrency') + '</label>' +
      _buildCustomDropdown('field-display-currency', currencyOptions, currentCurrency) +
      '<label class="form-label" for="field-timezone">Zeitzone</label>' +
      (typeof TimezoneService !== 'undefined'
        ? _buildCustomDropdown('field-timezone',
            [['', 'Browser-Zeitzone (automatisch)']].concat(TimezoneService.TIMEZONES),
            '')
        : '<input type="text" class="form-input" id="field-timezone" placeholder="z.B. Europe/Berlin" />') +
    '</div>';
  }

  function _buildBookingPermField() {
    return '<div class="form-group">' +
      '<label class="form-label">' + ProfileI18n.t('labelBookingPermission') + '</label>' +
      '<div class="profile-tag-grid">' +
        _buildTagChips('bookingPermission', [
          ['always',     ProfileI18n.t('bookingPermAlways')],
          ['on_request', ProfileI18n.t('bookingPermOnRequest')],
          ['never',      ProfileI18n.t('bookingPermNever')]
        ]) +
      '</div>' +
    '</div>';
  }

  function _buildSkillLevelField() {
    return '<div class="form-group">' +
      '<label class="form-label">' + ProfileI18n.t('labelSkillLevel') + '</label>' +
      '<div class="profile-tag-grid">' +
        _buildTagChips('skillLevel', [
          ['beginner',     ProfileI18n.t('skillBeginner')],
          ['intermediate', ProfileI18n.t('skillIntermediate')],
          ['advanced',     ProfileI18n.t('skillAdvanced')],
          ['expert',       ProfileI18n.t('skillExpert')]
        ]) +
      '</div>' +
    '</div>';
  }

  function _buildTeachingFields() {
    return '<div class="form-group">' +
        '<label class="form-label">' + ProfileI18n.t('labelLessonTypes') + '</label>' +
        '<div class="profile-tag-grid">' +
          _buildTagChips('lessonTypes', [
            ['private',       ProfileI18n.t('lessonPrivate')],
            ['group',         ProfileI18n.t('lessonGroup')],
            ['private_group', ProfileI18n.t('lessonPrivateGroup')]
          ]) +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">' + ProfileI18n.t('labelAudience') + '</label>' +
        '<div class="profile-tag-grid">' +
          _buildTagChips('audience', [
            ['kids',    ProfileI18n.t('audienceKids')],
            ['teens',   ProfileI18n.t('audienceTeens')],
            ['adults',  ProfileI18n.t('audienceAdults')],
            ['seniors', ProfileI18n.t('audienceSeniors')]
          ]) +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">' + ProfileI18n.t('labelLevels') + '</label>' +
        '<div class="profile-tag-grid">' +
          _buildTagChips('levels', [
            ['beginner',     ProfileI18n.t('levelBeginner')],
            ['intermediate', ProfileI18n.t('levelIntermediate')],
            ['advanced',     ProfileI18n.t('levelAdvanced')],
            ['expert',       ProfileI18n.t('levelExpert')]
          ]) +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-age-from">' + ProfileI18n.t('labelAgeFrom') + '</label>' +
          '<input type="number" class="form-input" id="field-age-from" min="3" max="99" placeholder="z.B. 6" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-age-to">' + ProfileI18n.t('labelAgeTo') + '</label>' +
          '<input type="number" class="form-input" id="field-age-to" min="3" max="99" placeholder="z.B. 99" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-max-group">' + ProfileI18n.t('labelMaxGroup') + '</label>' +
          '<input type="number" class="form-input" id="field-max-group" min="1" max="20" placeholder="z.B. 6" />' +
        '</div>' +
      '</div>';
  }

  function _buildTerrainFields() {
    return '<div class="profile-terrain-grid">' +
      _buildTerrainToggle('green', '🟢', ProfileI18n.t('terrainGreen'), ProfileI18n.t('terrainGreenSub')) +
      _buildTerrainToggle('blue',  '🔵', ProfileI18n.t('terrainBlue'),  ProfileI18n.t('terrainBlueSub'))  +
      _buildTerrainToggle('red',   '🔴', ProfileI18n.t('terrainRed'),   ProfileI18n.t('terrainRedSub'))   +
      _buildTerrainToggle('black', '⚫', ProfileI18n.t('terrainBlack'), ProfileI18n.t('terrainBlackSub')) +
    '</div>';
  }

  function _buildTerrainToggle(val, emoji, label, sub) {
    return '<button type="button" class="profile-terrain-btn" data-terrain="' + val + '" data-group="terrain">' +
      '<span class="profile-terrain-emoji">' + emoji + '</span>' +
      '<span class="profile-terrain-label">' + label + '</span>' +
      '<span class="profile-terrain-sub">' + sub + '</span>' +
    '</button>';
  }

  function _buildPaymentFields() {
    return '<div class="form-group">' +
        '<label class="form-label" for="field-price">' + ProfileI18n.t('labelPrice') + '</label>' +
        '<input type="number" class="form-input" id="field-price" min="0" step="0.5" placeholder="z.B. 45" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Preis-Währung</label>' +
        _buildCustomDropdown('field-price-currency',[['EUR','€ Euro'],['USD','$ US-Dollar'],['GBP','£ Britisches Pfund'],['CHF','Fr Schweizer Franken'],['GEL','₾ Georgischer Lari'],['JPY','¥ Japanischer Yen'],['TRY','₺ Türkische Lira'],['PLN','zł Polnischer Zloty'],['CZK','Kč Tschechische Krone'],['SEK','kr Schwedische Krone'],['RUB','₽ Russischer Rubel'],['AED','د.إ Dirham (VAE)']],'EUR') +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Anzeigewährung (mein Wallet)</label>' +
        _buildCustomDropdown('field-display-currency',[['EUR','€ Euro'],['USD','$ US-Dollar'],['GBP','£ Britisches Pfund'],['CHF','Fr Schweizer Franken'],['GEL','₾ Georgischer Lari'],['JPY','¥ Japanischer Yen'],['TRY','₺ Türkische Lira'],['PLN','zł Polnischer Zloty'],['CZK','Kč Tschechische Krone'],['SEK','kr Schwedische Krone'],['RUB','₽ Russischer Rubel'],['AED','د.إ Dirham (VAE)']],'EUR') +
        '<label class="form-label" for="field-timezone">Zeitzone</label>' +
        (typeof TimezoneService !== 'undefined'
          ? _buildCustomDropdown('field-timezone',
              [['', 'Browser-Zeitzone (automatisch)']].concat(TimezoneService.TIMEZONES),
              '')
          : '<input type="text" class="form-input" id="field-timezone" placeholder="z.B. Europe/Berlin" />') +
      '</div>' +
      '<div class="profile-payment-divider"></div>' +
      '<div class="form-group">' +
        '<label class="form-label">' + ProfileI18n.t('labelPaymentMode') + '</label>' +
        _buildCustomDropdown('field-payment-mode', [
          ['instant',      ProfileI18n.t('paymentModeInstant')],
          ['cash_on_site', ProfileI18n.t('paymentModeCash')]
        ], 'instant') +
      '</div>' +
      '<div class="profile-visibility-row">' +
        '<label class="profile-toggle-label">' +
          '<input type="checkbox" class="profile-toggle-input" id="field-requires-deposit" />' +
          '<span class="profile-toggle-track"><span class="profile-toggle-thumb"></span></span>' +
          '<span>' + ProfileI18n.t('labelRequiresDeposit') + '</span>' +
        '</label>' +
      '</div>' +
      '<div id="deposit-fields-wrap">' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label class="form-label">' + ProfileI18n.t('labelDepositMode') + '</label>' +
            _buildCustomDropdown('field-deposit-mode', [
              ['fixed',   ProfileI18n.t('depositModeFixed')],
              ['percent', ProfileI18n.t('depositModePercent')]
            ], 'fixed') +
          '</div>' +
          '<div class="form-group" id="deposit-fixed-wrap">' +
            '<label class="form-label" for="field-deposit-fixed">' + ProfileI18n.t('labelDepositFixed') + '</label>' +
            '<input type="number" class="form-input" id="field-deposit-fixed" min="0" step="1" placeholder="z.B. 50" />' +
          '</div>' +
          '<div class="form-group" id="deposit-percent-wrap">' +
            '<label class="form-label" for="field-deposit-percent">' + ProfileI18n.t('labelDepositPercent') + '</label>' +
            '<input type="number" class="form-input" id="field-deposit-percent" min="1" max="100" step="1" placeholder="z.B. 20" />' +
          '</div>' +
        '</div>' +
        '<div class="profile-deposit-preview" id="deposit-preview">' +
          '<span class="profile-deposit-preview-label">' + ProfileI18n.t('labelDepositPreview') + '</span>' +
          '<span class="profile-deposit-preview-value" id="deposit-preview-value">—</span>' +
        '</div>' +
        '<div class="form-section-divider"></div>' +
        '<div class="form-row">' +
          '<label class="form-label">Stornierungsfenster (Stunden)</label>' +
          '<input type="number" class="form-input" id="field-cancel-window" min="1" max="336" step="1" placeholder="z.B. 48" />' +
        '</div>' +
        '<div class="form-row">' +
          '<label class="form-label">Teilerstattung bei Storno (% des Deposits)</label>' +
          '<input type="number" class="form-input" id="field-cancel-partial" min="0" max="100" step="5" placeholder="z.B. 50" />' +
        '</div>' +
        '<div class="form-row form-row-check">' +
          '<input type="checkbox" id="field-cancel-strict" />' +
          '<label class="form-label" for="field-cancel-strict">Strikt — kein Deposit wird je erstattet</label>' +
        '</div>' +
      '</div>';
  }

  function _buildCertsSection() {
    return '<div id="certs-list"></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="add-cert-btn">' +
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        ProfileI18n.t('labelAddCert') +
      '</button>';
  }

  function _buildSpecsFields() {
    return '<div class="profile-tag-grid">' +
      _buildTagChips('specializations', [
        ['kids',      ProfileI18n.t('specKids')],
        ['freeride',  ProfileI18n.t('specFreeride')],
        ['freestyle', ProfileI18n.t('specFreestyle')],
        ['racing',    ProfileI18n.t('specRacing')],
        ['anxiety',   ProfileI18n.t('specAnxiety')],
        ['adaptive',  ProfileI18n.t('specAdaptive')],
        ['snowboard', ProfileI18n.t('specSnowboard')],
        ['telemark',  ProfileI18n.t('specTelemark')],
        ['firstaid',  ProfileI18n.t('specFirstAid')],
        ['avalanche', ProfileI18n.t('specAvalanche')]
      ]) +
    '</div>';
  }

  function _buildContactFields() {
    return '<div class="form-group">' +
        '<label class="form-label" for="field-email">' + ProfileI18n.t('labelEmail') + '</label>' +
        '<input type="email" class="form-input" id="field-email" />' +
      '</div>' +
      '<div class="profile-visibility-row">' +
        '<label class="profile-toggle-label">' +
          '<input type="checkbox" class="profile-toggle-input" id="field-email-visible" />' +
          '<span class="profile-toggle-track"><span class="profile-toggle-thumb"></span></span>' +
          '<span>' + ProfileI18n.t('labelEmailVisible') + '</span>' +
        '</label>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="field-phone">' + ProfileI18n.t('labelPhone') + '</label>' +
        '<input type="tel" class="form-input" id="field-phone" />' +
      '</div>' +
      '<div class="profile-visibility-row">' +
        '<label class="profile-toggle-label">' +
          '<input type="checkbox" class="profile-toggle-input" id="field-phone-visible" />' +
          '<span class="profile-toggle-track"><span class="profile-toggle-thumb"></span></span>' +
          '<span>' + ProfileI18n.t('labelPhoneVisible') + '</span>' +
        '</label>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-instagram">' + ProfileI18n.t('labelInstagram') + '</label>' +
          '<input type="text" class="form-input" id="field-instagram" placeholder="@username" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="field-website">' + ProfileI18n.t('labelWebsite') + '</label>' +
          '<input type="url" class="form-input" id="field-website" placeholder="https://" />' +
        '</div>' +
      '</div>';
  }

  function _buildTagChips(group, pairs) {
    var html = '';
    for (var i = 0; i < pairs.length; i++) {
      html += '<button type="button" class="profile-tag-chip" data-group="' + group + '" data-val="' + pairs[i][0] + '">' +
        pairs[i][1] +
      '</button>';
    }
    return html;
  }

  /* ── Custom chip input ("Sonstige") ──────────────────── */
  function _buildCustomChipInput(group, placeholder) {
    return '<div class="profile-custom-chip-wrap" data-group-custom="' + group + '">' +
      '<div class="profile-custom-chip-row">' +
        '<input type="text" class="form-input profile-custom-chip-input" ' +
          'placeholder="' + placeholder + '" ' +
          'data-custom-group="' + group + '" />' +
        '<button type="button" class="btn btn-secondary btn-sm profile-custom-chip-add" ' +
          'data-custom-group="' + group + '">+ Hinzufügen</button>' +
      '</div>' +
      '<div class="profile-custom-chip-list" id="custom-chips-' + group + '"></div>' +
    '</div>';
  }

  /* ── Cert row builder ──────────────────────────────────── */
  function _buildCertRow(cert, idx) {
    var orgOptions = [
      ['', '— Organisation —'],
      ['isia',  ProfileI18n.t('certISIA')],
      ['basi',  ProfileI18n.t('certBASI')],
      ['psia',  ProfileI18n.t('certPSIA')],
      ['csia',  ProfileI18n.t('certCSIA')],
      ['dsv',   ProfileI18n.t('certDSV')],
      ['other', ProfileI18n.t('certOther')]
    ];
    var levelOptions = [
      ['', '— Level —'],
      ['1', ProfileI18n.t('certLevel1')],
      ['2', ProfileI18n.t('certLevel2')],
      ['3', ProfileI18n.t('certLevel3')],
      ['4', ProfileI18n.t('certLevel4')]
    ];

    var orgHTML = '';
    for (var i = 0; i < orgOptions.length; i++) {
      orgHTML += '<option value="' + orgOptions[i][0] + '"' + (cert.org === orgOptions[i][0] ? ' selected' : '') + '>' + orgOptions[i][1] + '</option>';
    }
    var levelHTML = '';
    for (var j = 0; j < levelOptions.length; j++) {
      levelHTML += '<option value="' + levelOptions[j][0] + '"' + (cert.level === levelOptions[j][0] ? ' selected' : '') + '>' + levelOptions[j][1] + '</option>';
    }

    return '<div class="profile-cert-row" data-cert-idx="' + idx + '">' +
      '<div class="profile-cert-org">' + _buildCustomDropdown('cert-org-' + idx, orgOptions, cert.org || '') + '</div>' +
      '<div class="profile-cert-level">' + _buildCustomDropdown('cert-level-' + idx, levelOptions, cert.level || '') + '</div>' +
      '<input type="number" class="form-input profile-cert-year" data-cert-field="year" value="' + (cert.year || '') + '" placeholder="Jahr" min="1980" max="2030" />' +
      '<button type="button" class="btn btn-ghost btn-sm profile-cert-remove" data-cert-idx="' + idx + '" aria-label="Entfernen">' +
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      '</button>' +
    '</div>';
  }

  function _renderCerts() {
    var list = document.getElementById('certs-list');
    if (!list) return;
    if (!_profile.certifications.length) {
      list.innerHTML = '<p class="form-hint" id="certs-empty">' + ProfileI18n.t('labelNoCerts') + '</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < _profile.certifications.length; i++) {
      html += _buildCertRow(_profile.certifications[i], i);
    }
    list.innerHTML = html;
  }

  /* ── Load values into form ─────────────────────────────── */
  function _loadValues() {
    var p = _profile;
    _setVal('field-name',       p.name);
    /* username lives on the user object, not the profile */
    var userObj = AppService.getUserSync(_uid);
    var unEl = document.getElementById('field-username');
    if (unEl && userObj) unEl.value = userObj.username || '';
    _setVal('field-age',        p.age);
    _setVal('field-location',   p.location);
    _setDropdownVal('field-timezone', p.timezone || '');
    _setVal('field-bio',        p.bio);
    _setVal('field-price',      p.pricePerHalfHour);
      _setDropdownVal('field-price-currency',  p.priceCurrency   || 'EUR');
      _setDropdownVal('field-display-currency', p.displayCurrency || 'EUR');
    _setVal('field-experience', p.experienceYears);
    _setVal('field-age-from',   p.ageFrom);
    _setVal('field-age-to',     p.ageTo);
    _setVal('field-max-group',  p.maxGroupSize);
    _setVal('field-email',      p.email);
    _setVal('field-phone',      p.phone);
    _setVal('field-instagram',  p.instagram);
    _setVal('field-website',    p.website);

    var emailVis = document.getElementById('field-email-visible');
    var phoneVis = document.getElementById('field-phone-visible');
    if (emailVis) emailVis.checked = !!p.emailVisible;
    if (phoneVis) phoneVis.checked = !!p.phoneVisible;

    /* Custom dropdowns */
    _setDropdownVal('field-gender',       p.gender      || '');
    _setDropdownVal('field-payment-mode', p.paymentMode || 'instant');
    _setDropdownVal('field-deposit-mode', p.depositMode || 'fixed');

    _setActiveChips('bookingPermission', [_profile.bookingPermission || 'always']);
    _setActiveChips('skillLevel',     p.skillLevel     ? [p.skillLevel] : []);
    _setActiveChips('languages',      p.languages      || []);
    _setActiveChips('lessonTypes',    p.lessonTypes    || []);
    _setActiveChips('audience',       p.audience       || []);
    _setActiveChips('levels',         p.levels         || []);
    _setActiveChips('specializations',p.specializations|| []);
    _setActiveTerrain(p.terrain || []);

    if (p.photo) _setPhotoPreview(p.photo);

    _renderCerts();

    /* Payment fields */
    var reqDep = document.getElementById('field-requires-deposit');
    if (reqDep) reqDep.checked = (p.requiresDeposit !== false);
    _setVal('field-deposit-fixed',   p.depositFixed   != null ? String(p.depositFixed)   : '50');
    _setVal('field-deposit-percent', p.depositPercent != null ? String(p.depositPercent) : '20');
    _setVal('field-cancel-window',   p.cancellationWindow  != null ? String(p.cancellationWindow)  : '48');
    _setVal('field-cancel-partial',  p.cancellationPartial != null ? String(p.cancellationPartial) : '50');
    var strictEl = document.getElementById('field-cancel-strict');
    if (strictEl) strictEl.checked = (p.cancellationStrict === true);
  }

  function _setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  /* Liest den aktuellen Wert eines Custom Dropdowns (data-dropdown-value) */
  function _getDropdownVal(id) {
    var dd = document.querySelector('[data-dropdown-id="' + id + '"]');
    return dd ? (dd.getAttribute('data-dropdown-value') || '') : '';
  }

  /* Setzt einen Custom Dropdown programmatisch auf einen Wert */
  function _setDropdownVal(id, val) {
    var dd = document.querySelector('[data-dropdown-id="' + id + '"]');
    if (!dd) return;
    var list   = dd.querySelector('.custom-dropdown-list');
    var label  = dd.querySelector('.custom-dropdown-label');
    if (!list || !label) return;
    var items = list.querySelectorAll('.custom-dropdown-item');
    for (var i = 0; i < items.length; i++) {
      var isMatch = items[i].getAttribute('data-value') === val;
      items[i].classList.toggle('is-active', isMatch);
      items[i].setAttribute('aria-selected', isMatch ? 'true' : 'false');
      if (isMatch) label.textContent = items[i].textContent;
    }
    dd.setAttribute('data-dropdown-value', val || '');
  }

  function _setActiveChips(group, vals) {
    /* Always clear the group first to avoid stale active states */
    var chips = document.querySelectorAll('[data-group="' + group + '"]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.remove('is-active');
      chips[i].setAttribute('aria-pressed', 'false');
    }
    for (var j = 0; j < chips.length; j++) {
      if (vals.indexOf(chips[j].getAttribute('data-val')) !== -1) {
        chips[j].classList.add('is-active');
        chips[j].setAttribute('aria-pressed', 'true');
      }
    }
  }

  function _setActiveTerrain(vals) {
    var btns = document.querySelectorAll('[data-terrain]');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      if (vals.indexOf(btn.getAttribute('data-terrain')) !== -1) {
        btn.classList.add('is-active');
      }
    }
  }

  function _setPhotoPreview(dataUrl) {
    var preview = document.getElementById('photo-preview');
    if (!preview) return;
    preview.innerHTML = '<img src="' + dataUrl + '" class="profile-photo-img" alt="Profilbild" />';
  }

  /* ── Bind events ───────────────────────────────────────── */
  function _bindAll() {
    _bindAccordions();
    _bindTagChips();
    _bindTerrainBtns();
    _bindPhoto();
    _bindCerts();
    _bindSave();
    _bindViewBtn();
    _bindDirtyTracking();
    _bindCustomChipInputs();
    _bindCustomDropdowns();
  }

  /* ── Custom dropdown events ────────────────────────────── */
  /* Bindet alle .custom-dropdown im #profile-edit-main.
   * Beim Klick auf ein Item: Label updaten, is-active setzen,
   * data-dropdown-value auf dem Wrapper schreiben, _markDirty. */
  function _bindCustomDropdowns() {
    var root = document.getElementById('profile-edit-main');
    if (!root) return;

    /* Schließt alle offenen Dropdowns außer dem angegebenen */
    function _closeAll(except) {
      var all = root.querySelectorAll('.custom-dropdown-trigger.is-open');
      for (var i = 0; i < all.length; i++) {
        if (all[i] === except) continue;
        all[i].classList.remove('is-open');
        all[i].setAttribute('aria-expanded', 'false');
        var ddId = all[i].getAttribute('data-dropdown-trigger');
        var lst  = root.querySelector('[data-dropdown-list="' + ddId + '"]');
        if (lst) lst.classList.remove('is-open');
      }
    }

    var dropdowns = root.querySelectorAll('.custom-dropdown');
    for (var d = 0; d < dropdowns.length; d++) {
      (function(dd) {
        var ddId    = dd.getAttribute('data-dropdown-id');
        var trigger = dd.querySelector('.custom-dropdown-trigger');
        var list    = dd.querySelector('.custom-dropdown-list');
        var label   = dd.querySelector('.custom-dropdown-label');
        if (!trigger || !list || !label) return;

        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          var isOpen = trigger.classList.contains('is-open');
          _closeAll(trigger);
          trigger.classList.toggle('is-open', !isOpen);
          trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
          list.classList.toggle('is-open', !isOpen);
        });

        var items = list.querySelectorAll('.custom-dropdown-item');
        for (var i = 0; i < items.length; i++) {
          (function(item) {
            item.addEventListener('click', function(e) {
              e.stopPropagation();
              var val = item.getAttribute('data-value');
              /* Update active state */
              var allItems = list.querySelectorAll('.custom-dropdown-item');
              for (var j = 0; j < allItems.length; j++) {
                allItems[j].classList.remove('is-active');
                allItems[j].setAttribute('aria-selected', 'false');
              }
              item.classList.add('is-active');
              item.setAttribute('aria-selected', 'true');
              /* Update label */
              label.textContent = item.textContent;
              /* Store value on wrapper */
              dd.setAttribute('data-dropdown-value', val);
              /* Close */
              trigger.classList.remove('is-open');
              trigger.setAttribute('aria-expanded', 'false');
              list.classList.remove('is-open');
              _markDirty();
              /* Fire custom event so _bindPaymentEvents can react */
              var ev = document.createEvent('Event');
              ev.initEvent('dropdown-change', true, true);
              dd.dispatchEvent(ev);
            });
          })(items[i]);
        }

        /* Init: set data-dropdown-value from active item */
        var active = list.querySelector('.custom-dropdown-item.is-active');
        dd.setAttribute('data-dropdown-value', active ? active.getAttribute('data-value') : '');
      })(dropdowns[d]);
    }

    /* Close all on outside click */
    document.addEventListener('click', function() { _closeAll(null); });
  }

  function _bindPaymentEvents() {
    var toggle       = document.getElementById('field-requires-deposit');
    var fixedInput   = document.getElementById('field-deposit-fixed');
    var percentInput = document.getElementById('field-deposit-percent');

    function _updateDepositVisibility() {
      var wrap = document.getElementById('deposit-fields-wrap');
      if (!wrap || !toggle) return;
      wrap.classList.toggle('is-hidden', !toggle.checked);
    }

    function _updateModeFields() {
      var fixedWrap   = document.getElementById('deposit-fixed-wrap');
      var percentWrap = document.getElementById('deposit-percent-wrap');
      if (!fixedWrap || !percentWrap) return;
      var isFixed = _getDropdownVal('field-deposit-mode') === 'fixed';
      fixedWrap.classList.toggle('is-hidden', !isFixed);
      percentWrap.classList.toggle('is-hidden', isFixed);
    }

    function _updatePreview() {
      var previewEl = document.getElementById('deposit-preview-value');
      if (!previewEl) return;
      if (!toggle || !toggle.checked) {
        previewEl.textContent = ProfileI18n.t('depositPreviewNone');
        return;
      }
      var priceInput = document.getElementById('field-price');
      var price = priceInput ? parseFloat(priceInput.value) : 0;
      if (!price || isNaN(price)) {
        previewEl.textContent = ProfileI18n.t('depositPreviewNoPrice');
        return;
      }
      var amount = 0;
      if (_getDropdownVal('field-deposit-mode') === 'fixed') {
        amount = fixedInput ? parseFloat(fixedInput.value) || 0 : 0;
      } else {
        var pct = percentInput ? parseFloat(percentInput.value) || 0 : 0;
        amount = Math.round(price * pct / 100 * 100) / 100;
      }
      var _pCur = _getDropdownVal('field-price-currency') || 'EUR';
      previewEl.textContent = (typeof CurrencyService !== 'undefined')
        ? CurrencyService.format(amount, _pCur)
        : '€' + amount.toFixed(2);
    }

    if (toggle) {
      toggle.addEventListener('change', function() {
        _updateDepositVisibility();
        _updatePreview();
        _markDirty();
      });
    }

    /* Listen for custom dropdown-change events */
    var root = document.getElementById('profile-edit-main');
    if (root) {
      root.addEventListener('dropdown-change', function(e) {
        var dd = e.target;
        if (!dd) return;
        var ddId = dd.getAttribute('data-dropdown-id');
        if (ddId === 'field-deposit-mode') {
          _updateModeFields();
          _updatePreview();
        }
      });
    }

    if (fixedInput) {
      fixedInput.addEventListener('input', function() { _updatePreview(); _markDirty(); });
    }
    if (percentInput) {
      percentInput.addEventListener('input', function() { _updatePreview(); _markDirty(); });
    }
    var priceField = document.getElementById('field-price');
    if (priceField) {
      priceField.addEventListener('input', function() { _updatePreview(); });
    }

    /* Initial state */
    _updateDepositVisibility();
    _updateModeFields();
    _updatePreview();
  }

  function _bindAccordions() {
    var headers = document.querySelectorAll('.profile-acc-header');
    for (var i = 0; i < headers.length; i++) {
      (function(header) {
        header.addEventListener('click', function() {
          var id   = header.getAttribute('data-acc');
          var body = document.getElementById('acc-body-' + id);
          if (!body) return;
          var open = body.classList.contains('is-open');
          body.classList.toggle('is-open', !open);
          header.setAttribute('aria-expanded', !open ? 'true' : 'false');
          var chevron = header.querySelector('.profile-acc-chevron');
          if (chevron) chevron.classList.toggle('is-flipped', !open);
        });
        var id   = header.getAttribute('data-acc');
        var body = document.getElementById('acc-body-' + id);
        if (body) {
          body.classList.add('is-open');
          header.setAttribute('aria-expanded', 'true');
        }
      })(headers[i]);
    }
  }

  function _bindTagChips() {
    var singleSelectGroups = { 'bookingPermission': true, 'skillLevel': true };
    var chips = document.querySelectorAll('.profile-tag-chip');
    for (var i = 0; i < chips.length; i++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          var group = chip.getAttribute('data-group');
          if (singleSelectGroups[group]) {
            /* Deactivate all siblings in group first */
            var siblings = document.querySelectorAll('[data-group="' + group + '"]');
            for (var j = 0; j < siblings.length; j++) {
              siblings[j].classList.remove('is-active');
              siblings[j].setAttribute('aria-pressed', 'false');
            }
            chip.classList.add('is-active');
            chip.setAttribute('aria-pressed', 'true');
          } else {
            chip.classList.toggle('is-active');
            chip.setAttribute('aria-pressed', chip.classList.contains('is-active') ? 'true' : 'false');
          }
          _markDirty();
        });
      })(chips[i]);
    }
  }

  function _bindTerrainBtns() {
    var btns = document.querySelectorAll('[data-terrain]');
    for (var i = 0; i < btns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          btn.classList.toggle('is-active');
          _markDirty();
        });
      })(btns[i]);
    }
  }

  function _bindPhoto() {
    var input     = document.getElementById('photo-input');
    var removeBtn = document.getElementById('photo-remove-btn');

    if (input) {
      input.addEventListener('change', function() {
        var file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          Toast.error('Bild ist zu groß. Max. 5 MB.');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          /* Compress via canvas to max 400x400, quality 0.8 */
          var img = new Image();
          img.onload = function() {
            var MAX = 400;
            var w = img.width;
            var h = img.height;
            if (w > MAX || h > MAX) {
              if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
              else       { w = Math.round(w * MAX / h); h = MAX; }
            }
            var canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            var compressed = canvas.toDataURL('image/jpeg', 0.8);
            console.log('[ProfileEdit] photo compressed to ' + Math.round(compressed.length / 1024) + ' KB');
            _profile.photo = compressed;
            _setPhotoPreview(compressed);
            _markDirty();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        _profile.photo = '';
        var preview = document.getElementById('photo-preview');
        if (preview) {
          preview.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        _markDirty();
      });
    }
  }

  function _bindCerts() {
    var addBtn = document.getElementById('add-cert-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        _profile.certifications.push({ org: '', level: '', year: '' });
        _renderCerts();
        _bindCertRows();
        _markDirty();
      });
    }
    _bindCertRows();
  }

  function _bindCertRows() {
    var removes = document.querySelectorAll('.profile-cert-remove');
    for (var i = 0; i < removes.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-cert-idx'), 10);
          _profile.certifications.splice(idx, 1);
          _renderCerts();
          _bindCertRows();
          _bindCustomDropdowns();
          _markDirty();
        });
      })(removes[i]);
    }

    /* Year input */
    var yearFields = document.querySelectorAll('[data-cert-field="year"]');
    for (var j = 0; j < yearFields.length; j++) {
      (function(field) {
        field.addEventListener('change', function() {
          var row = field.closest('.profile-cert-row');
          var idx = parseInt(row.getAttribute('data-cert-idx'), 10);
          if (_profile.certifications[idx]) {
            _profile.certifications[idx].year = field.value;
          }
          _markDirty();
        });
      })(yearFields[j]);
    }

    /* Cert custom dropdowns — listen for dropdown-change */
    var root = document.getElementById('profile-edit-main');
    if (root) {
      var certDDs = root.querySelectorAll('.profile-cert-org .custom-dropdown, .profile-cert-level .custom-dropdown');
      for (var k = 0; k < certDDs.length; k++) {
        (function(dd) {
          dd.addEventListener('dropdown-change', function() {
            var row   = dd.closest('.profile-cert-row');
            var idx   = parseInt(row.getAttribute('data-cert-idx'), 10);
            var ddId  = dd.getAttribute('data-dropdown-id');
            var field = ddId.indexOf('cert-org-') === 0 ? 'org' : 'level';
            if (_profile.certifications[idx]) {
              _profile.certifications[idx][field] = dd.getAttribute('data-dropdown-value') || '';
            }
          });
        })(certDDs[k]);
      }
    }
  }

  function _bindCustomChipInputs() {
    var addBtns = document.querySelectorAll('.profile-custom-chip-add');
    for (var i = 0; i < addBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var group   = btn.getAttribute('data-custom-group');
          var input   = document.querySelector('.profile-custom-chip-input[data-custom-group="' + group + '"]');
          var listEl  = document.getElementById('custom-chips-' + group);
          if (!input || !listEl) return;
          var val = input.value.trim();
          if (!val) return;
          /* Check for duplicates */
          var existing = document.querySelector('[data-group="' + group + '"][data-val="' + val + '"]');
          if (existing) { input.value = ''; return; }
          /* Create chip */
          var chip = document.createElement('span');
          chip.className = 'profile-custom-chip';
          chip.setAttribute('data-group', group);
          chip.setAttribute('data-val', val);
          chip.innerHTML = val + '<button type="button" class="profile-custom-chip-remove" aria-label="Entfernen">&times;</button>';
          chip.querySelector('.profile-custom-chip-remove').addEventListener('click', function() {
            chip.parentNode.removeChild(chip);
            _markDirty();
          });
          listEl.appendChild(chip);
          input.value = '';
          _markDirty();
        });
        /* Also trigger on Enter key */
        var input2 = document.querySelector('.profile-custom-chip-input[data-custom-group="' + btn.getAttribute('data-custom-group') + '"]');
        if (input2) {
          input2.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
          });
        }
      })(addBtns[i]);
    }
  }

  /* ── FAB above soft keyboard (visualViewport) ──────────── */
  function _bindFabKeyboard() {
    if (!window.visualViewport) return;
    function _reposition() {
      var fab    = document.getElementById('profile-save-fab');
      var jumper = document.getElementById('edit-section-jumper');
      var vvH    = window.visualViewport.height;
      var pageH  = document.documentElement.clientHeight;
      var kbH    = Math.max(0, pageH - vvH - window.visualViewport.offsetTop);
      var fabBottom    = kbH > 50 ? kbH + 12 : 20;
      var jumperBottom = fabBottom === 20
        ? (20 + 34 + 10)           /* default: above chat-fab position */
        : (kbH + 12 + 34 + 6 + 8); /* above FAB when keyboard open */
      if (fab)    fab.style.bottom    = fabBottom    + 'px';
      if (jumper) jumper.style.bottom = jumperBottom + 'px';
    }
    window.visualViewport.addEventListener('resize', _reposition);
    window.visualViewport.addEventListener('scroll', _reposition);
    _reposition();
  }

  /* ── Section jumper for ProfileEdit ──────────────────── */
  function _getEditJumpTargets() {
    var targets = [];
    var page = document.querySelector('.profile-edit-page');
    if (page) targets.push(page);
    var accordions = document.querySelectorAll('.profile-accordion');
    for (var i = 0; i < accordions.length; i++) targets.push(accordions[i]);
    return targets;
  }

  function _getEditStickyOffset() {
    var navbar = document.querySelector('.navbar');
    return navbar ? navbar.offsetHeight + 8 : 8;
  }

  function _getEditCurrentIdx(targets) {
    var offset = _getEditStickyOffset();
    var scrollY = window.scrollY + offset + 10;
    var best = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].getBoundingClientRect().top + window.scrollY <= scrollY) best = i;
    }
    return best;
  }

  function _updateEditJumper() {
    var jumper  = document.getElementById('edit-section-jumper');
    var upBtn   = document.getElementById('edit-jump-up');
    var downBtn = document.getElementById('edit-jump-down');
    var topBtn  = document.getElementById('edit-jump-top');
    if (!jumper || !upBtn || !downBtn || !topBtn) return;
    var targets = _getEditJumpTargets();
    var idx     = _getEditCurrentIdx(targets);
    jumper.classList.toggle('is-visible', window.scrollY > 80);
    upBtn.classList.toggle('is-dimmed',   idx <= 0);
    downBtn.classList.toggle('is-dimmed', idx >= targets.length - 1);
    topBtn.classList.toggle('is-dimmed',  window.scrollY < 80);
  }

  function _jumpEditSection(delta) {
    var targets = _getEditJumpTargets();
    var idx     = _getEditCurrentIdx(targets);
    var next    = idx + delta;
    if (next < 0 || next >= targets.length) return;
    var offset = _getEditStickyOffset();
    var top    = targets[next].getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
    setTimeout(_updateEditJumper, 400);
  }

  function _bindEditJumper() {
    window.addEventListener('scroll', _updateEditJumper);
    var upBtn   = document.getElementById('edit-jump-up');
    var downBtn = document.getElementById('edit-jump-down');
    var topBtn  = document.getElementById('edit-jump-top');
    if (upBtn)   upBtn.addEventListener('click',  function() { _jumpEditSection(-1); });
    if (downBtn) downBtn.addEventListener('click', function() { _jumpEditSection(1);  });
    if (topBtn)  topBtn.addEventListener('click',  function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(_updateEditJumper, 400);
    });
  }

  function _bindSave() {
    var btn     = document.getElementById('profile-save-btn');
    var discard = document.getElementById('profile-fab-discard');
    if (btn) btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      _save();
    });
    if (discard) {
      discard.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        _profile = ProfileStore.getOrDefault(_uid);
        _loadValues();
        _snapshot = _serializeState(); /* Net-change reset after discard */
        _dirty = false;
        var fab = document.getElementById('profile-save-fab');
        if (fab) fab.classList.remove('is-visible');
      });
    }
  }

  function _bindViewBtn() {
    var btn = document.getElementById('profile-view-btn');
    if (!btn) return;
    btn.addEventListener('click', function() {
      window.location.href = './profile-view.html?uid=' + encodeURIComponent(_uid) + '&viewer=' + encodeURIComponent(_uid);
    });
  }

  function _bindDirtyTracking() {
    var inputs = document.querySelectorAll('.form-input, .form-select, .profile-toggle-input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('input', function() { _markDirty(); });
      inputs[i].addEventListener('change', function() { _markDirty(); });
    }
  }

  function _serializeState() {
    var parts = [];
    var root = document.getElementById('profile-edit-main');
    if (!root) return '';

    /* 1. All text/number/email/tel/url/textarea inputs */
    var inputs = root.querySelectorAll('input.form-input, textarea.form-input');
    for (var i = 0; i < inputs.length; i++) {
      parts.push(inputs[i].id + ':' + inputs[i].value);
    }

    /* 2. Custom dropdowns */
    var dropdowns = root.querySelectorAll('.custom-dropdown[data-dropdown-id]');
    for (var i = 0; i < dropdowns.length; i++) {
      var ddId  = dropdowns[i].getAttribute('data-dropdown-id');
      var ddVal = dropdowns[i].getAttribute('data-dropdown-value') || '';
      parts.push('dd:' + ddId + ':' + ddVal);
    }

    /* 3. All toggle checkboxes */
    var toggles = root.querySelectorAll('.profile-toggle-input');
    for (var i = 0; i < toggles.length; i++) {
      parts.push(toggles[i].id + ':' + (toggles[i].checked ? '1' : '0'));
    }

    /* 4. Active tag chips (sorted per group for stability) */
    var chipBtns = root.querySelectorAll('button.profile-tag-chip.is-active');
    var byGroup = {};
    for (var i = 0; i < chipBtns.length; i++) {
      var g = chipBtns[i].getAttribute('data-group');
      var v = chipBtns[i].getAttribute('data-val');
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(v);
    }
    var groupKeys = Object.keys(byGroup).sort();
    for (var k = 0; k < groupKeys.length; k++) {
      parts.push('chip:' + groupKeys[k] + ':' + byGroup[groupKeys[k]].sort().join(','));
    }

    /* 5. Terrain buttons */
    var terrainBtns = root.querySelectorAll('.profile-terrain-btn.is-active');
    var terrainVals = [];
    for (var i = 0; i < terrainBtns.length; i++) {
      terrainVals.push(terrainBtns[i].getAttribute('data-terrain'));
    }
    parts.push('terrain:' + terrainVals.sort().join(','));

    /* 6. Custom chips (user-added free-text values) */
    var customChips = root.querySelectorAll('.profile-custom-chip[data-val]');
    var customByGroup = {};
    for (var i = 0; i < customChips.length; i++) {
      var g = customChips[i].getAttribute('data-group');
      var v = customChips[i].getAttribute('data-val');
      if (!customByGroup[g]) customByGroup[g] = [];
      customByGroup[g].push(v);
    }
    var customKeys = Object.keys(customByGroup).sort();
    for (var k = 0; k < customKeys.length; k++) {
      parts.push('custom:' + customKeys[k] + ':' + customByGroup[customKeys[k]].sort().join(','));
    }

    /* 7. Certificate rows — each field per row */
    var certRows = root.querySelectorAll('.profile-cert-row');
    for (var i = 0; i < certRows.length; i++) {
      var certFields = certRows[i].querySelectorAll('[data-cert-field]');
      var certParts = [];
      for (var j = 0; j < certFields.length; j++) {
        certParts.push(certFields[j].getAttribute('data-cert-field') + '=' + certFields[j].value);
      }
      parts.push('cert' + i + ':' + certParts.join(';'));
    }

    /* 8. Photo — include length only (not full data to keep comparison fast) */
    parts.push('photo:' + (_profile ? (_profile.photo ? _profile.photo.length : 0) : 0));

    return parts.join('|');
  }

  function _markDirty() {
    var fab = document.getElementById('profile-save-fab');
    if (!fab) return;
    /* Compare with snapshot — only show FAB if net changes exist */
    var current = _serializeState();
    var hasChanges = (_snapshot === null) || (current !== _snapshot);
    _dirty = hasChanges;
    fab.classList.toggle('is-visible', hasChanges);
  }

  /* ── Collect & Save ────────────────────────────────────── */
  function _collect() {
    _profile.name             = _getVal('field-name');
    /* Save username separately via AppService (user object, not profile) */
    var unInput = document.getElementById('field-username');
    if (unInput) {
      var newUsername = unInput.value.trim().toLowerCase().replace(/^@/, '');
      if (newUsername) {
        AppService.updateUser(_uid, { username: newUsername }, function(err) {
          if (err) {
            var errEl = document.getElementById('field-username-error');
            if (errEl) { errEl.textContent = err.message; errEl.classList.remove('is-hidden'); }
          }
        });
      }
    }
    _profile.age              = _getVal('field-age');
    _profile.gender           = _getDropdownVal('field-gender');
    _profile.location         = _getVal('field-location');
    _profile.timezone         = _getDropdownVal('field-timezone');
    _profile.bio              = _getVal('field-bio');
    _profile.pricePerHalfHour = _getVal('field-price');
    _profile.priceCurrency    = _getDropdownVal('field-price-currency')   || 'EUR';
    _profile.displayCurrency  = _getDropdownVal('field-display-currency') || 'EUR';
    _profile.experienceYears  = _getVal('field-experience');
    _profile.ageFrom          = _getVal('field-age-from');
    _profile.ageTo            = _getVal('field-age-to');
    _profile.maxGroupSize     = _getVal('field-max-group');
    _profile.email            = _getVal('field-email');
    _profile.phone            = _getVal('field-phone');
    _profile.instagram        = _getVal('field-instagram');
    _profile.website          = _getVal('field-website');

    var emailVis = document.getElementById('field-email-visible');
    var phoneVis = document.getElementById('field-phone-visible');
    _profile.emailVisible = emailVis ? emailVis.checked : false;
    _profile.phoneVisible = phoneVis ? phoneVis.checked : false;

    var permChips  = _getActiveChips('bookingPermission');
    _profile.bookingPermission = permChips.length ? permChips[0] : 'always';
    var skillChips = _getActiveChips('skillLevel');
    _profile.skillLevel      = skillChips.length ? skillChips[0] : '';
    _profile.languages       = _getActiveChips('languages');
    _profile.lessonTypes     = _getActiveChips('lessonTypes');
    _profile.audience        = _getActiveChips('audience');
    _profile.levels          = _getActiveChips('levels');
    _profile.specializations = _getActiveChips('specializations');
    _profile.terrain         = _getActiveTerrain();

    /* Payment fields */
    var reqDep = document.getElementById('field-requires-deposit');
    _profile.requiresDeposit     = reqDep ? reqDep.checked : true;
    _profile.depositMode         = _getDropdownVal('field-deposit-mode')    || 'fixed';
    _profile.depositFixed        = parseFloat(_getVal('field-deposit-fixed'))   || 0;
    _profile.depositPercent      = parseFloat(_getVal('field-deposit-percent')) || 0;
    _profile.paymentMode         = _getDropdownVal('field-payment-mode')    || 'instant';
    _profile.cancellationWindow  = parseFloat(_getVal('field-cancel-window'))  || 48;
    _profile.cancellationPartial = parseFloat(_getVal('field-cancel-partial')) || 50;
    var cancelStrict = document.getElementById('field-cancel-strict');
    _profile.cancellationStrict  = cancelStrict ? cancelStrict.checked : false;
  }

  function _getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function _getActiveChips(group) {
    var result = [];
    /* Standard toggle chips */
    var chips = document.querySelectorAll('[data-group="' + group + '"].is-active');
    for (var i = 0; i < chips.length; i++) {
      result.push(chips[i].getAttribute('data-val'));
    }
    /* Custom chips added via text input */
    var customChips = document.querySelectorAll('#custom-chips-' + group + ' [data-val]');
    for (var j = 0; j < customChips.length; j++) {
      var val = customChips[j].getAttribute('data-val');
      if (result.indexOf(val) === -1) result.push(val);
    }
    return result;
  }

  function _getActiveTerrain() {
    var result = [];
    var btns   = document.querySelectorAll('[data-terrain].is-active');
    for (var i = 0; i < btns.length; i++) {
      result.push(btns[i].getAttribute('data-terrain'));
    }
    return result;
  }

  function _validate() {
    if (!_profile.name) {
      Toast.error(ProfileI18n.t('errorNameRequired'));
      return false;
    }
    if (_profile.pricePerHalfHour && isNaN(parseFloat(_profile.pricePerHalfHour))) {
      Toast.error(ProfileI18n.t('errorPriceInvalid'));
      return false;
    }
    return true;
  }

  function _save() {
    _collect();
    if (!_validate()) return;
    console.log('[ProfileEdit] saving uid=' + _uid + ' name=' + _profile.name + ' photo=' + (_profile.photo ? 'yes(' + _profile.photo.length + 'chars)' : 'no'));
    var saved = ProfileStore.save(_uid, _profile);
    console.log('[ProfileEdit] saved OK, verifying read-back:', ProfileStore.get(_uid) ? 'found' : 'NOT FOUND');
    _dirty = false;
    _snapshot = _serializeState(); /* Net-change reset after save */
    var fab = document.getElementById('profile-save-fab');
    if (fab) fab.classList.remove('is-visible');
    Toast.success(ProfileI18n.t('saved'));
  }

  /* ── Section jumper for ProfileView ──────────────────── */
  function _getJumpTargets() {
    var ids = ['pv-hero','pv-section-about','pv-section-teaching','pv-section-terrain','pv-section-certs'];
    var targets = [];
    var top = document.querySelector('.profile-view-page');
    if (top) targets.push(top);
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) targets.push(el);
    }
    return targets;
  }

  function _getStickyOffset() {
    var navbar = document.querySelector('.navbar');
    return navbar ? navbar.offsetHeight + 8 : 8;
  }

  function _getCurrentIdx(targets) {
    var offset = _getStickyOffset();
    var scrollY = window.scrollY + offset + 10;
    var best = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].getBoundingClientRect().top + window.scrollY <= scrollY) best = i;
    }
    return best;
  }

  function _updateJumper() {
    var jumper  = document.getElementById('pv-section-jumper');
    var upBtn   = document.getElementById('pv-jump-up');
    var downBtn = document.getElementById('pv-jump-down');
    var topBtn  = document.getElementById('pv-jump-top');
    if (!jumper || !upBtn || !downBtn || !topBtn) return;
    var targets = _getJumpTargets();
    var idx     = _getCurrentIdx(targets);
    var isVisible = window.scrollY > 80;
    jumper.classList.toggle('is-visible', isVisible);
    upBtn.classList.toggle('is-dimmed',   idx <= 0);
    downBtn.classList.toggle('is-dimmed', idx >= targets.length - 1);
    topBtn.classList.toggle('is-dimmed',  window.scrollY < 80);
  }

  function _jumpSection(delta) {
    var targets = _getJumpTargets();
    var idx     = _getCurrentIdx(targets);
    var next    = idx + delta;
    if (next < 0 || next >= targets.length) return;
    var offset = _getStickyOffset();
    var top    = targets[next].getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
    setTimeout(_updateJumper, 400);
  }

  function _jumpTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(_updateJumper, 400);
  }

  function _bindJumper() {
    window.addEventListener('scroll', _updateJumper);
    var upBtn   = document.getElementById('pv-jump-up');
    var downBtn = document.getElementById('pv-jump-down');
    var topBtn  = document.getElementById('pv-jump-top');
    var editBtn = document.getElementById('pv-edit-fab');
    if (upBtn)   upBtn.addEventListener('click',  function() { _jumpSection(-1); });
    if (downBtn) downBtn.addEventListener('click', function() { _jumpSection(1);  });
    if (topBtn)  topBtn.addEventListener('click',  _jumpTop);
    /* Edit FAB — nur sichtbar wenn der Viewer das eigene Profil ansieht */
    if (editBtn && _viewer && _viewer.uid === _uid) {
      editBtn.classList.add('is-visible');
      editBtn.addEventListener('click', function() {
        window.location.href = './profile-edit.html?uid=' + encodeURIComponent(_uid) + '&owner=' + encodeURIComponent(_uid);
      });
    }
  }

  function setTimezone(tz) {
    _setDropdownVal('field-timezone', tz || '');
    if (_profile) _profile.timezone = tz || '';
  }

  return { init: init, setTimezone: setTimezone };

})();

/* ── Currency helper ─────────────────────────────────── */
function _getPriceSymbol(profile) {
  if (typeof CurrencyService === 'undefined') return '\u20ac';
  var code = (profile && profile.priceCurrency) ? profile.priceCurrency : 'EUR';
  return CurrencyService.getSymbol(code);
}

/* ── ProfileView ──────────────────────────────────────────────── */
var ProfileView = (function() {

  var _uid         = null;
  var _profile     = null;
  var _viewer      = null;
  var _profileUser = null;   /* cached user object for _uid — loaded via AppService */

  function init() {
    try {
      var params = new URLSearchParams(window.location.search);
      _uid    = params.get('uid');
      /* viewer = the logged-in user, passed explicitly so we never confuse
         the profile being viewed (?uid=) with the session owner.
         SECURITY: Auth.current() MUST NOT be used as fallback here.
         On profile-view.html the ?uid= param identifies the PROFILE being
         viewed — not the session owner. If Auth.current() were called it
         would return the profile owner, making _viewer.uid === _uid always
         true and granting edit access to every visitor.
         Rule: if ?viewer= is absent or empty → _viewer = null → read-only. */
      var viewerUid = params.get('viewer');
      _viewer = (viewerUid && viewerUid.trim())
        ? AppService.getUserSync(decodeURIComponent(viewerUid.trim()))
        : null;

      if (!_uid) {
        _renderError(ProfileI18n.t('viewNoProfile'));
        return;
      }

      /* Use getOrDefault so users without a saved profile still get a view */
      _profileUser = AppService.getUserSync(_uid);
      if (!_profileUser) {
        _renderError(ProfileI18n.t('viewNoProfile'));
        return;
      }
      _profile = ProfileStore.getOrDefault(_uid);

      _render();
      _bindJumper();
    } catch(e) {
      console.error('[ProfileView] init error:', e.message);
    }
  }

  function _render() {
    var main = document.getElementById('profile-view-main');
    if (!main) return;

    var p = _profile;

    main.innerHTML =
      _buildHeroSection(p) +
      _buildAboutSection(p) +
      _buildTeachingSection(p) +
      _buildTerrainSection(p) +
      _buildCertsSection(p) +
      _buildSpecsSection(p) +
      _buildContactSection(p) +
      _buildCTASection(p);
  }

  function _buildHeroSection(p) {
    var photoHTML = p.photo
      ? '<img src="' + p.photo + '" class="pv-hero-photo" alt="' + _esc(p.name) + '" />'
      : '<div class="pv-hero-photo pv-hero-photo-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';

    var locationHTML = p.location
      ? '<span class="pv-hero-location"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 015-5z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg>' + _esc(p.location) + '</span>'
      : '';

    var priceHTML = '';
    if (p.pricePerHalfHour) {
      var _tCur = p.priceCurrency || 'EUR';
      var _rawP = parseFloat(p.pricePerHalfHour);
      var _displayStr;
      if (typeof CurrencyService !== 'undefined') {
        /* Viewer currency: logged-in viewer OR guest (reads GuestSettings) */
        var _vUid = (_viewer && _viewer.uid) ? _viewer.uid : null;
        var _vCur = CurrencyService.getUserCurrency(_vUid);
        if (_vCur && _vCur !== _tCur) {
          /* Show price in viewer's currency */
          var _conv = CurrencyService.convertSync(_rawP, _tCur, _vCur);
          _displayStr = (_conv !== null)
            ? CurrencyService.format(_conv, _vCur)
            : CurrencyService.format(_rawP, _tCur);
        } else {
          _displayStr = CurrencyService.format(_rawP, _tCur);
        }
      } else {
        _displayStr = _getPriceSymbol(p) + p.pricePerHalfHour;
      }
      priceHTML = '<div class="pv-hero-price">'
        + '<span class="pv-price-value">' + _displayStr + '</span>'
        + '<span class="pv-price-label">' + ProfileI18n.t('viewPrice') + '</span>'
        + '</div>';
    }

    var expHTML = p.experienceYears
      ? '<div class="pv-hero-stat"><span class="pv-stat-value">' + _esc(p.experienceYears) + '</span><span class="pv-stat-label">' + ProfileI18n.t('viewExperience') + '</span></div>'
      : '';

    var langsHTML = '';
    if (p.languages && p.languages.length) {
      var langMap = { de:'DE', en:'EN', fr:'FR', it:'IT', es:'ES', ru:'RU', ja:'JA', zh:'ZH' };
      for (var i = 0; i < p.languages.length; i++) {
        langsHTML += '<span class="pv-lang-badge">' + (langMap[p.languages[i]] || p.languages[i].toUpperCase()) + '</span>';
      }
    }

    return '<div class="pv-hero" id="pv-hero">' +
      photoHTML +
      '<div class="pv-hero-info">' +
        '<h1 class="pv-hero-name">' + _esc(p.name || '—') + '</h1>' +
        locationHTML +
        '<div class="pv-hero-meta">' +
          expHTML +
          priceHTML +
        '</div>' +
        (langsHTML ? '<div class="pv-lang-row">' + langsHTML + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function _buildAboutSection(p) {
    var levelMap = { beginner:'Anfänger', intermediate:'Mittelstufe', advanced:'Fortgeschritten', expert:'Experte' };
    var skillHTML = p.skillLevel
      ? '<div class="pv-skill-level"><span class="pv-detail-label">' + ProfileI18n.t('viewSkillLevel') + ':</span>' +
        '<span class="pv-skill-badge">' + _esc(levelMap[p.skillLevel] || p.skillLevel) + '</span></div>'
      : '';
    if (!p.bio && !skillHTML) return '';
    return '<div class="pv-section" id="pv-section-about">' +
      '<h2 class="pv-section-title">Über mich</h2>' +
      skillHTML +
      (p.bio ? '<p class="pv-bio">' + _esc(p.bio) + '</p>' : '') +
    '</div>';
  }

  function _buildTeachingSection(p) {
    var rows = [];

    if (p.lessonTypes && p.lessonTypes.length) {
      var ltMap = { private: ProfileI18n.t('lessonPrivate'), group: ProfileI18n.t('lessonGroup'), private_group: ProfileI18n.t('lessonPrivateGroup') };
      var ltLabels = [];
      for (var i = 0; i < p.lessonTypes.length; i++) ltLabels.push(ltMap[p.lessonTypes[i]] || p.lessonTypes[i]);
      rows.push([ProfileI18n.t('viewLessonTypes'), ltLabels.join(', ')]);
    }
    if (p.audience && p.audience.length) {
      var audMap = { kids: ProfileI18n.t('audienceKids'), teens: ProfileI18n.t('audienceTeens'), adults: ProfileI18n.t('audienceAdults'), seniors: ProfileI18n.t('audienceSeniors') };
      var audLabels = [];
      for (var j = 0; j < p.audience.length; j++) audLabels.push(audMap[p.audience[j]] || p.audience[j]);
      rows.push([ProfileI18n.t('viewAudience'), audLabels.join(', ')]);
    }
    if (p.levels && p.levels.length) {
      var lvMap = { beginner: ProfileI18n.t('levelBeginner'), intermediate: ProfileI18n.t('levelIntermediate'), advanced: ProfileI18n.t('levelAdvanced'), expert: ProfileI18n.t('levelExpert') };
      var lvLabels = [];
      for (var k = 0; k < p.levels.length; k++) lvLabels.push(lvMap[p.levels[k]] || p.levels[k]);
      rows.push([ProfileI18n.t('viewLevels'), lvLabels.join(', ')]);
    }
    if (p.ageFrom || p.ageTo) {
      rows.push([ProfileI18n.t('viewAgeRange'), (p.ageFrom || '?') + ' – ' + (p.ageTo || '?') + ' Jahre']);
    }
    if (p.maxGroupSize) {
      rows.push([ProfileI18n.t('viewMaxGroup'), p.maxGroupSize + ' Personen']);
    }

    if (!rows.length) return '';

    var html = '<div class="pv-section" id="pv-section-teaching"><h2 class="pv-section-title">' + ProfileI18n.t('sectionTeaching') + '</h2><div class="pv-detail-list">';
    for (var r = 0; r < rows.length; r++) {
      html += '<div class="pv-detail-row"><span class="pv-detail-label">' + _esc(rows[r][0]) + '</span><span class="pv-detail-value">' + _esc(rows[r][1]) + '</span></div>';
    }
    return html + '</div></div>';
  }

  function _buildTerrainSection(p) {
    if (!p.terrain || !p.terrain.length) return '';
    var terrainMap = {
      green: { emoji: '🟢', label: ProfileI18n.t('terrainGreen'),  sub: ProfileI18n.t('terrainGreenSub') },
      blue:  { emoji: '🔵', label: ProfileI18n.t('terrainBlue'),   sub: ProfileI18n.t('terrainBlueSub')  },
      red:   { emoji: '🔴', label: ProfileI18n.t('terrainRed'),    sub: ProfileI18n.t('terrainRedSub')   },
      black: { emoji: '⚫', label: ProfileI18n.t('terrainBlack'),  sub: ProfileI18n.t('terrainBlackSub') }
    };
    var html = '<div class="pv-section" id="pv-section-terrain"><h2 class="pv-section-title">' + ProfileI18n.t('sectionTerrain') + '</h2><div class="pv-terrain-row">';
    for (var i = 0; i < p.terrain.length; i++) {
      var t = terrainMap[p.terrain[i]];
      if (!t) continue;
      html += '<div class="pv-terrain-badge"><span class="pv-terrain-emoji">' + t.emoji + '</span><span class="pv-terrain-label">' + t.label + '</span><span class="pv-terrain-sub">' + t.sub + '</span></div>';
    }
    return html + '</div></div>';
  }

  function _buildCertsSection(p) {
    if (!p.certifications || !p.certifications.length) return '';
    var orgMap = { isia: 'ISIA', basi: 'BASI', psia: 'PSIA', csia: 'CSIA', dsv: 'DSV/DSLV', other: 'Sonstige' };
    var html = '<div class="pv-section" id="pv-section-certs"><h2 class="pv-section-title">' + ProfileI18n.t('sectionCerts') + '</h2><div class="pv-cert-list">';
    for (var i = 0; i < p.certifications.length; i++) {
      var c = p.certifications[i];
      if (!c.org && !c.level) continue;
      html += '<div class="pv-cert-item">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span class="pv-cert-org">' + _esc(orgMap[c.org] || c.org) + '</span>' +
        '<span class="pv-cert-level">Level ' + _esc(c.level) + '</span>' +
        (c.year ? '<span class="pv-cert-year">' + _esc(c.year) + '</span>' : '') +
      '</div>';
    }
    return html + '</div></div>';
  }

  function _buildSpecsSection(p) {
    if (!p.specializations || !p.specializations.length) return '';
    var specMap = {
      kids: ProfileI18n.t('specKids'), freeride: ProfileI18n.t('specFreeride'),
      freestyle: ProfileI18n.t('specFreestyle'), racing: ProfileI18n.t('specRacing'),
      anxiety: ProfileI18n.t('specAnxiety'), adaptive: ProfileI18n.t('specAdaptive'),
      snowboard: ProfileI18n.t('specSnowboard'), telemark: ProfileI18n.t('specTelemark'),
      firstaid: ProfileI18n.t('specFirstAid'), avalanche: ProfileI18n.t('specAvalanche')
    };
    var html = '<div class="pv-section"><h2 class="pv-section-title">' + ProfileI18n.t('sectionSpecs') + '</h2><div class="pv-spec-chips">';
    for (var i = 0; i < p.specializations.length; i++) {
      html += '<span class="pv-spec-chip">' + _esc(specMap[p.specializations[i]] || p.specializations[i]) + '</span>';
    }
    return html + '</div></div>';
  }

  function _buildContactSection(p) {
    var items = [];
    if (p.emailVisible && p.email) {
      items.push('<a class="pv-contact-link" href="mailto:' + _esc(p.email) + '">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zM1 4l7 5 7-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        _esc(p.email) + '</a>');
    }
    if (p.phoneVisible && p.phone) {
      items.push('<a class="pv-contact-link" href="tel:' + _esc(p.phone) + '">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 10.67v2a1.33 1.33 0 01-1.45 1.33A13.2 13.2 0 016.99 12 12.98 12.98 0 012 7.01 13.2 13.2 0 01.01 3.45 1.33 1.33 0 011.33 2h2a1.33 1.33 0 011.33 1.14c.084.64.24 1.267.467 1.87a1.33 1.33 0 01-.3 1.4L3.83 7.4a10.65 10.65 0 005.77 5.77l1-.01a1.33 1.33 0 011.4-.3c.603.227 1.23.383 1.87.467A1.33 1.33 0 0114 10.67z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        _esc(p.phone) + '</a>');
    }
    if (p.instagram) {
      items.push('<a class="pv-contact-link" href="https://instagram.com/' + _esc(p.instagram.replace('@','')) + '" target="_blank" rel="noopener">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>' +
        _esc(p.instagram) + '</a>');
    }
    if (p.website) {
      items.push('<a class="pv-contact-link" href="' + _esc(p.website) + '" target="_blank" rel="noopener">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 2a9.6 9.6 0 010 12M8 2a9.6 9.6 0 000 12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        _esc(p.website) + '</a>');
    }

    if (!items.length) return '';

    return '<div class="pv-section"><h2 class="pv-section-title">' + ProfileI18n.t('sectionContact') + '</h2>' +
      '<div class="pv-contact-list">' + items.join('') + '</div></div>';
  }

  function _buildCTASection(p) {
    var isOwnProfile = _viewer && _viewer.uid === _uid;
    if (isOwnProfile) {
      return '<div class="pv-cta">' +
        '<a href="./profile-edit.html?uid=' + _esc(_uid) + '&owner=' + _esc(_uid) + '" class="btn btn-secondary">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          ProfileI18n.t('editProfile') +
        '</a>' +
      '</div>';
    }
    /* Booking CTA is only relevant for teacher profiles */
    /* _profileUser is loaded once in init() — no Store access needed here */
    if (!_profileUser || _profileUser.role !== 'teacher') return '';

    return '<div class="pv-cta">' +
      '<button class="btn btn-primary pv-book-btn" id="pv-book-btn">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        ProfileI18n.t('bookNow') +
      '</button>' +
      '<p class="pv-cta-hint">' + ProfileI18n.t('bookNowHint') + '</p>' +
    '</div>';
  }

  function _renderError(msg) {
    var main = document.getElementById('profile-view-main');
    if (main) main.innerHTML = '<div class="empty-state"><p>' + msg + '</p></div>';
  }

  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Section jumper for ProfileView ──────────────────── */
  function _getJumpTargets() {
    var ids = ['pv-hero','pv-section-about','pv-section-teaching','pv-section-terrain','pv-section-certs'];
    var targets = [];
    var top = document.querySelector('.profile-view-page');
    if (top) targets.push(top);
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) targets.push(el);
    }
    return targets;
  }

  function _getStickyOffset() {
    var navbar = document.querySelector('.navbar');
    return navbar ? navbar.offsetHeight + 8 : 8;
  }

  function _getCurrentIdx(targets) {
    var offset = _getStickyOffset();
    var scrollY = window.scrollY + offset + 10;
    var best = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].getBoundingClientRect().top + window.scrollY <= scrollY) best = i;
    }
    return best;
  }

  function _updateJumper() {
    var jumper  = document.getElementById('pv-section-jumper');
    var upBtn   = document.getElementById('pv-jump-up');
    var downBtn = document.getElementById('pv-jump-down');
    var topBtn  = document.getElementById('pv-jump-top');
    if (!jumper || !upBtn || !downBtn || !topBtn) return;
    var targets = _getJumpTargets();
    var idx     = _getCurrentIdx(targets);
    var isVisible = window.scrollY > 80;
    jumper.classList.toggle('is-visible', isVisible);
    upBtn.classList.toggle('is-dimmed',   idx <= 0);
    downBtn.classList.toggle('is-dimmed', idx >= targets.length - 1);
    topBtn.classList.toggle('is-dimmed',  window.scrollY < 80);
  }

  function _jumpSection(delta) {
    var targets = _getJumpTargets();
    var idx     = _getCurrentIdx(targets);
    var next    = idx + delta;
    if (next < 0 || next >= targets.length) return;
    var offset = _getStickyOffset();
    var top    = targets[next].getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
    setTimeout(_updateJumper, 400);
  }

  function _jumpTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(_updateJumper, 400);
  }

  function _bindJumper() {
    window.addEventListener('scroll', _updateJumper);
    var upBtn   = document.getElementById('pv-jump-up');
    var downBtn = document.getElementById('pv-jump-down');
    var topBtn  = document.getElementById('pv-jump-top');
    var editBtn = document.getElementById('pv-edit-fab');
    if (upBtn)   upBtn.addEventListener('click',  function() { _jumpSection(-1); });
    if (downBtn) downBtn.addEventListener('click', function() { _jumpSection(1);  });
    if (topBtn)  topBtn.addEventListener('click',  _jumpTop);
    /* Edit FAB — nur sichtbar wenn der Viewer das eigene Profil ansieht */
    if (editBtn && _viewer && _viewer.uid === _uid) {
      editBtn.classList.add('is-visible');
      editBtn.addEventListener('click', function() {
        window.location.href = './profile-edit.html?uid=' + encodeURIComponent(_uid) + '&owner=' + encodeURIComponent(_uid);
      });
    }
  }

  return { init: init };

})();
