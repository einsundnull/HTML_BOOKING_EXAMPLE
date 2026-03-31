/**
 * skiing-catalog.js — Skiing Teacher Catalog
 *
 * Lädt alle Teacher via AppService.getTeachersWithProfiles(),
 * rendert Karten mit Collapse/Expand-Verhalten.
 * Buchen-Button: eingeloggte User → teacher.html, nicht eingeloggte → AuthModal.
 *
 * Datenzugriff: NUR über AppService — kein direkter Store/ProfileStore-Zugriff.
 *
 * i18n Namespace: skiing-catalog (Deutsch Standard)
 * Regeln: var only, function(){}, string concat, no arrow functions,
 *         no ?. or ??, no template literals, no inline styles
 *
 * Wiederverwendung:
 *   - pv-* CSS-Klassen aus profile.css (Sections, Terrain, Certs, Specs)
 *   - AuthModal aus landing.js
 *   - Navbar.init(page, options) aus navbar.js
 */

/* ── i18n ───────────────────────────────────────────────── */
/* Strings werden aus locales/skiing-catalog.json geladen.
   CatalogI18n dient als Fallback-Objekt, bis das JSON verfügbar ist. */
var CatalogI18n = {
  subtitle:             ' Lehrer verfügbar',
  subtitleNone:         'Keine Lehrer gefunden',
  experienceYears:      'Jahre Erfahrung',
  pricePerHalf:         'pro 30 Min.',
  expandBtn:            'Details anzeigen',
  collapseBtn:          'Schließen',
  bookBtn:              'Lehrer buchen',
  bookHintLoggedIn:     'Du wirst zum Buchungskalender weitergeleitet.',
  bookHintGuest:        'Melde dich an, um zu buchen.',
  emptyState:           'Kein Lehrer gefunden.',
  resetFilters:         'Filter zurücksetzen',
  noBio:                'Kein Profil-Text vorhanden.',
  sectionAbout:         'Über mich',
  loginToBook:          'Anmelden um zu buchen',
  filterBtn:            'Filter',
  filterBtnActive:      'Filter ({n})',
  badgeRemove:          'Filter entfernen',
  favAdd:               'Als Favorit speichern',
  favRemove:            'Aus Favoriten entfernen',
  favTabLabel:          'Favoriten',
  favEmpty:             'Noch keine Favoriten gespeichert.',
  connectAdd:           'Lehrer hinzufügen',
  connectRemove:        'Lehrer entfernen',
  connectAddedToast:    'wurde hinzugefügt. Warte auf Bestätigung.',
  connectRemovedToast:  'wurde entfernt.',
  actionChat:           'Nachricht',
  actionDetails:        'Details'
};

/* ── Discipline Tabs ────────────────────────────────────── */
var _DISC_TABS = [
  { key: 'all',        label: 'Alle'        },
  { key: 'ski',        label: 'Ski'         },
  { key: 'snowboard',  label: 'Snowboard'   },
  { key: 'paragliding',label: 'Paragliding' },
  { key: 'climbing',   label: 'Klettern'    },
  { key: 'diving',     label: 'Tauchen'     },
  { key: 'other',      label: 'Sonstiges'   }
];
var _activeTab = 'all'; /* currently selected discipline key */

/* ── State ──────────────────────────────────────────────── */
var _allTeachers      = [];   /* [{user, profile}] */
var _filteredTeachers = [];
var _expandedUid      = null; /* only one open at a time */
var _favoriteUids     = {};   /* { teacherUid: true } — loaded once on init, updated on toggle */
var _showFavoritesTab  = false; /* true when Favoriten-tab is active */
var _showMyTeachersTab = false; /* true when Meine Lehrer-tab is active */
var _showPendingTab    = false; /* true when Ausstehend-tab is active */
var _currentUser       = null;  /* Auth.current() — resolved once on init */

/* Drawer-Filter (vom CatalogFilterDrawer) */
var _drawerFilters = {
  level:           [],
  lesson:          [],
  languages:       [],
  audience:        [],
  terrain:         [],
  specializations: [],
  priceMin:        0,
  priceMax:        300,
  expMin:          0,
  expMax:          40,
  location:        '',
  gender:          []
};

/* ── Init ───────────────────────────────────────────────── */
/* Use 'load' not 'DOMContentLoaded': defer scripts run after DOMContentLoaded. */
window.addEventListener('load', function() {
  function _initCatalog() {
  Navbar.init('catalog', {
    loginBtn: {
      label:   'Anmelden',
      onClick: function() { AuthModal.open('signin'); }
    }
  });

  _initCurrentUser();
  /* Initialize chat panel on load — binds FAB, badge, cross-tab listener */
  if (typeof ChatPanel !== 'undefined' && ChatPanel.init) {
    ChatPanel.init();
  }
  _loadTeachers();
  _loadFavorites();
  _buildTabs();

  /* Drawer initialisieren — lädt Template + bindet Events */
  CatalogFilterDrawer.init({
    onChange: function(filters) {
      _drawerFilters = filters;
      _expandedUid   = null;
      _buildTabs();
      _render();
      _renderActiveBadges();
      _updateFilterBtn();
      CatalogFilterDrawer.setCount(_filteredTeachers.length);
    }
  });

  /* ── Teacher search combo — mockup-renderCatalog-searchDropdown-2026-03-24_11-44 ── */
  var headerRow = document.querySelector('.catalog-header-row');
  if (headerRow && typeof buildTeacherSearchCombo !== 'undefined') {
    var _buildSearchData = function() {
      return (_filteredTeachers || []).map(function(t) {
        var u = t.user || t; var p = t.profile || {};
        var uid = u.uid || u;
        var avail = AppService.getSlotsByTeacherSync(uid)
          .filter(function(s) { return s.status === 'available'; }).length;
        return {
          uid:        uid,
          name:       AppService.getDisplayNameSync(uid) || uid,
          discipline: u.discipline || '',
          price:      p.pricePerHalfHour ? p.pricePerHalfHour + ' €' : '',
          photo:      (typeof ProfileStore !== 'undefined') ? ProfileStore.getPhoto(uid) : null,
          availCount: avail
        };
      });
    };
    var _catalogSearchComboEl = null;
    var _rebuildCombo = function() {
      /* Remove old search if present */
      var existingSearch = document.getElementById('catalog-search-row');
      if (existingSearch) existingSearch.parentNode.removeChild(existingSearch);

      var comboData = _buildSearchData();
      _catalogSearchComboEl = buildTeacherSearchCombo(
        'catalog-name-search',
        'Lehrer suchen…',
        comboData,
        function(uid) {
          var grid = document.getElementById('catalog-grid') ||
                     document.querySelector('.catalog-grid');
          if (!grid) return;
          var cards = grid.querySelectorAll('.tc-card');
          for (var _ci = 0; _ci < cards.length; _ci++) {
            var isMatch = uid && cards[_ci].getAttribute('data-uid') === uid;
            cards[_ci].classList.toggle('catalog-search-highlight', !!uid && isMatch);
            cards[_ci].classList.toggle('catalog-search-dim', !!uid && !isMatch);
            if (isMatch) cards[_ci].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        'catalog-grid'
      );
      /* Insert search as its own row BELOW the header row, not inside it */
      var searchRow = document.createElement('div');
      searchRow.id = 'catalog-search-row';
      searchRow.style.marginBottom = 'var(--sp-3)';
      searchRow.appendChild(_catalogSearchComboEl);
      headerRow.parentNode.insertBefore(searchRow, headerRow.nextSibling);
    };
    _rebuildCombo();
    /* Rebuild when filters change so teacher list stays current */
    window._catalogSearchRebuild = _rebuildCombo;
  }

  _bindFilterBtn();
  _bindResetBtn();
  _render();
  _renderActiveBadges();
  _updateFilterBtn();

  /* Cards + jump buttons bound ONCE — not inside _render() */
  _bindCards();
  _bindJumpBtns();
  updateCatalogJumpBtns();
  _updateFabForExpanded(); /* sets neutral FAB state on load */
  } /* end _initCatalog */

  if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
    CurrencyService.onReady(_initCatalog);
  } else {
    _initCatalog();
  }
});

/* ── Load all teachers ──────────────────────────────────── */
function _loadTeachers() {
  AppService.getTeachersWithProfiles(function(err, pairs) {
    if (err) {
      console.error('[skiing-catalog] _loadTeachers Fehler:', err);
      _allTeachers = [];
      _applyFilters();
      _buildTabs();
      _render();
      return;
    }
    _allTeachers = pairs || [];
    _applyFilters();
    _buildTabs();
    _render();
    CatalogFilterDrawer.setCount(_filteredTeachers.length);
  });
}

/* ── Resolve current user once ─────────────────────────── */
function _initCurrentUser() {
  _currentUser = (typeof Auth !== 'undefined') ? Auth.current() : null;
}

/* ── Load favorites from Store (sync, student only) ─────── */
function _loadFavorites() {
  _favoriteUids = {};
  if (!_currentUser || _currentUser.role !== 'student') return;
  var favs = AppService.getFavoriteTeacherIdsSync(_currentUser.uid);
  for (var i = 0; i < favs.length; i++) {
    _favoriteUids[favs[i]] = true;
  }
}

/* ── Toggle favorite for a teacher ─────────────────────── */
function _toggleFavorite(teacherUid) {
  if (!_currentUser || _currentUser.role !== 'student') return;
  var sid = _currentUser.uid;
  if (_favoriteUids[teacherUid]) {
    AppService.removeFavorite(sid, teacherUid, function(err) {
      if (err) { Toast.error(err.message || 'Fehler'); return; }
      delete _favoriteUids[teacherUid];
      _render();
    });
  } else {
    AppService.addFavorite(sid, teacherUid, function(err) {
      if (err) { Toast.error(err.message || 'Fehler'); return; }
      _favoriteUids[teacherUid] = true;
      _render();
    });
  }
}

/* ── Discipline Tabs UI ─────────────────────────────────── */
function _buildTabs() {
  var container = document.getElementById('catalog-tabs');
  if (!container) return;
  container.innerHTML = '';

  /* Discipline tabs */
  _DISC_TABS.forEach(function(tab) {
    var isActive = !_showFavoritesTab && (_activeTab === tab.key);
    var btn = document.createElement('button');
    btn.className  = 'catalog-tab' + (isActive ? ' is-active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('data-disc', tab.key);
    btn.textContent = tab.label;

    /* Count badge */
    var count = _countForTab(tab.key);
    if (count > 0) {
      var badge = document.createElement('span');
      badge.className = 'catalog-tab-count';
      badge.textContent = count;
      btn.appendChild(badge);
    }

    btn.addEventListener('click', function() {
      _showFavoritesTab  = false;
      _showMyTeachersTab = false;
      _showPendingTab    = false;
      _activeTab = tab.key;
      _buildTabs();
      _applyFilters();
      _render();
    });

    container.appendChild(btn);
  });

  /* Favoriten tab — only for logged-in students */
  if (_currentUser && _currentUser.role === 'student') {
    var favCount = Object.keys(_favoriteUids).length;
    var favBtn = document.createElement('button');
    favBtn.className = 'catalog-tab catalog-tab--favorites' + (_showFavoritesTab ? ' is-active' : '');
    favBtn.setAttribute('role', 'tab');
    favBtn.setAttribute('aria-selected', _showFavoritesTab ? 'true' : 'false');
    favBtn.setAttribute('data-disc', 'favorites');

    /* Heart icon + label */
    var heartSVG = '<svg width="12" height="12" viewBox="0 0 16 16" fill="' +
      (_showFavoritesTab ? 'var(--catalog-fav-fill)' : 'none') +
      '" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 13.5S1.5 9.5 1.5 5.5a3.5 3.5 0 017 0 3.5 3.5 0 017 0c0 4-6.5 8-6.5 8z"/>' +
      '</svg>';
    favBtn.innerHTML = heartSVG + ' Favoriten';

    if (favCount > 0) {
      var favBadge = document.createElement('span');
      favBadge.className = 'catalog-tab-count';
      favBadge.textContent = favCount;
      favBtn.appendChild(favBadge);
    }

    favBtn.addEventListener('click', function() {
      _showFavoritesTab  = true;
      _showMyTeachersTab = false;
      _showPendingTab    = false;
      _buildTabs();
      _applyFilters();
      _render();
    });
    container.appendChild(favBtn);

    /* ── Meine Lehrer tab ── */
    var myTeacherIds = AppService.getSelectionsByStudentSync(_currentUser.uid)
      .map(function(s) { return s.teacherId; });
    var myTeachersCount = myTeacherIds.length;

    var myBtn = document.createElement('button');
    myBtn.className = 'catalog-tab' + (_showMyTeachersTab ? ' is-active' : '');
    myBtn.setAttribute('role', 'tab');
    myBtn.setAttribute('aria-selected', _showMyTeachersTab ? 'true' : 'false');
    myBtn.setAttribute('data-disc', 'my-teachers');
    myBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"' +
      ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 1a4 4 0 100 8A4 4 0 008 1zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"/>' +
      '<path d="M12 5l2 2 3-3" stroke-width="1.8"/>' +
      '</svg> ' + _esc(CatalogI18n.myTeachersTab || 'Meine Lehrer');

    if (myTeachersCount > 0) {
      var myBadge = document.createElement('span');
      myBadge.className = 'catalog-tab-count';
      myBadge.textContent = myTeachersCount;
      myBtn.appendChild(myBadge);
    }
    myBtn.addEventListener('click', function() {
      _showMyTeachersTab = true;
      _showFavoritesTab  = false;
      _showPendingTab    = false;
      _buildTabs();
      _applyFilters();
      _render();
    });
    container.appendChild(myBtn);

    /* ── Ausstehend tab ── */
    var pendingTeachers = _allTeachers.filter(function(t) {
      if (myTeacherIds.indexOf(t.uid) !== -1) return false;
      var status = (typeof ChatStore !== 'undefined')
        ? ChatStore.getRequestStatus(t.uid, _currentUser.uid)
        : null;
      return status === 'pending';
    });
    var pendingCount = pendingTeachers.length;

    var pendBtn = document.createElement('button');
    pendBtn.className = 'catalog-tab catalog-tab--pending' + (_showPendingTab ? ' is-active' : '');
    pendBtn.setAttribute('role', 'tab');
    pendBtn.setAttribute('aria-selected', _showPendingTab ? 'true' : 'false');
    pendBtn.setAttribute('data-disc', 'pending');
    pendBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"' +
      ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6"/>' +
      '<path d="M8 5v3.5l2 1.5"/>' +
      '</svg> ' + _esc(CatalogI18n.pendingTab || 'Ausstehend');

    if (pendingCount > 0) {
      var pendBadge = document.createElement('span');
      pendBadge.className = 'catalog-tab-count catalog-tab-count--pending';
      pendBadge.textContent = pendingCount;
      pendBtn.appendChild(pendBadge);
    }
    pendBtn.addEventListener('click', function() {
      _showPendingTab    = true;
      _showFavoritesTab  = false;
      _showMyTeachersTab = false;
      _buildTabs();
      _applyFilters();
      _render();
    });
    container.appendChild(pendBtn);
  }
}

function _countForTab(key) {
  var known = ['ski', 'snowboard', 'paragliding', 'climbing', 'diving'];
  return _allTeachers.filter(function(t) {
    var d = (t.user && t.user.discipline) ? t.user.discipline : '';
    if (key === 'all')   return true;
    if (key === 'other') return !d || known.indexOf(d) === -1;
    return d === key;
  }).length;
}

/* ── Tab pre-filter (applied before drawer filters) ─────── */
function _filterByTab(teachers) {
  /* Favoriten-Tab */
  if (_showFavoritesTab) {
    return teachers.filter(function(t) { return !!_favoriteUids[t.user.uid]; });
  }
  /* Meine Lehrer-Tab — confirmed selections */
  if (_showMyTeachersTab) {
    if (!_currentUser) return [];
    var myIds = AppService.getSelectionsByStudentSync(_currentUser.uid)
      .map(function(s) { return s.teacherId; });
    return teachers.filter(function(t) { return myIds.indexOf(t.user.uid) !== -1; });
  }
  /* Ausstehend-Tab — pending requests */
  if (_showPendingTab) {
    if (!_currentUser) return [];
    var confirmedIds = AppService.getSelectionsByStudentSync(_currentUser.uid)
      .map(function(s) { return s.teacherId; });
    return teachers.filter(function(t) {
      if (confirmedIds.indexOf(t.user.uid) !== -1) return false;
      var status = (typeof ChatStore !== 'undefined')
        ? ChatStore.getRequestStatus(t.user.uid, _currentUser.uid)
        : null;
      return status === 'pending';
    });
  }
  /* Discipline tabs */
  var known = ['ski', 'snowboard', 'paragliding', 'climbing', 'diving'];
  if (_activeTab === 'all') return teachers;
  return teachers.filter(function(t) {
    var d = (t.user && t.user.discipline) ? t.user.discipline : '';
    if (_activeTab === 'other') return !d || known.indexOf(d) === -1;
    return d === _activeTab;
  });
}

/* ── Filter logic ───────────────────────────────────────── */
/*
 * Logik: OR innerhalb einer Gruppe, AND zwischen Gruppen.
 * Range-Filter: min <= Wert <= max (leere Ranges = kein Filter)
 * Location: case-insensitive substring
 */
function _applyFilters() {
  var f = _drawerFilters;
  _filteredTeachers = [];

  var tabFiltered = _filterByTab(_allTeachers);

  for (var i = 0; i < tabFiltered.length; i++) {
    var t = tabFiltered[i];
    var p = t.profile;

    /* Discipline — OR within (matches user.discipline field) */
    if (f.discipline && f.discipline.length) {
      var userDisc = (t.user && t.user.discipline) ? t.user.discipline : '';
      if (f.discipline.indexOf(userDisc) === -1) continue;
    }

    /* Level — OR within */
    if (f.level && f.level.length) {
      if (!_arrIntersects(p.levels || [], f.level)) continue;
    }

    /* Lesson types — OR within */
    if (f.lesson && f.lesson.length) {
      if (!_arrIntersects(p.lessonTypes || [], f.lesson)) continue;
    }

    /* Languages — OR within */
    if (f.languages && f.languages.length) {
      if (!_arrIntersects(p.languages || [], f.languages)) continue;
    }

    /* Audience — OR within */
    if (f.audience && f.audience.length) {
      if (!_arrIntersects(p.audience || [], f.audience)) continue;
    }

    /* Terrain — OR within */
    if (f.terrain && f.terrain.length) {
      if (!_arrIntersects(p.terrain || [], f.terrain)) continue;
    }

    /* Specializations — OR within */
    if (f.specializations && f.specializations.length) {
      if (!_arrIntersects(p.specializations || [], f.specializations)) continue;
    }

    /* Price — Range (compare in viewer's display currency) */
    if (f.priceMin > 0 || f.priceMax < Infinity) {
      if (p.pricePerHalfHour !== undefined && p.pricePerHalfHour !== null) {
        var rawPrice   = parseFloat(p.pricePerHalfHour);
        var tCur       = p.priceCurrency || 'EUR';
        var vCur       = (typeof CurrencyService !== 'undefined')
          ? CurrencyService.getUserCurrency(_currentUser ? _currentUser.uid : null)
          : 'EUR';
        var dispPrice  = (typeof CurrencyService !== 'undefined' && tCur !== vCur)
          ? (CurrencyService.convertSync(rawPrice, tCur, vCur) || rawPrice)
          : rawPrice;
        if (!isNaN(dispPrice) && (dispPrice < f.priceMin || dispPrice > f.priceMax)) continue;
      }
    }

    /* Experience — Range */
    if (f.expMin > 0 || f.expMax < 40) {
      if (p.experienceYears !== undefined && p.experienceYears !== null) {
        var exp = parseFloat(p.experienceYears);
        if (!isNaN(exp) && (exp < f.expMin || exp > f.expMax)) continue;
      }
    }

    /* Location — case-insensitive substring */
    if (f.location) {
      var loc = (p.location || '').toLowerCase();
      if (loc.indexOf(f.location.toLowerCase()) === -1) continue;
    }

    /* Gender — OR within */
    if (f.gender && f.gender.length) {
      if (f.gender.indexOf(p.gender || '') === -1) continue;
    }

    _filteredTeachers.push(t);
  }
}

/* OR-within helper: true wenn arr1 mindestens ein Element aus arr2 enthält */
function _arrIntersects(arr1, arr2) {
  for (var i = 0; i < arr2.length; i++) {
    for (var j = 0; j < arr1.length; j++) {
      if (arr1[j] === arr2[i]) return true;
    }
  }
  return false;
}

/* ── Render ─────────────────────────────────────────────── */
function _render() {
  _applyFilters();

  var grid  = document.getElementById('catalog-grid');
  var empty = document.getElementById('catalog-empty');
  var sub   = document.getElementById('catalog-subtitle');
  if (!grid) return;

  /* Subtitle */
  if (sub) {
    var tabLabel = '';
    for (var ti = 0; ti < _DISC_TABS.length; ti++) {
      if (_DISC_TABS[ti].key === _activeTab) { tabLabel = _DISC_TABS[ti].label; break; }
    }
    var prefix = (_activeTab === 'all') ? '' : tabLabel + '-';
    sub.textContent = _filteredTeachers.length > 0
      ? _filteredTeachers.length + ' ' + prefix + (CatalogI18n.subtitle || 'Lehrer gefunden')
      : CatalogI18n.subtitleNone;
  }

  /* Empty state */
  if (!_filteredTeachers.length) {
    grid.innerHTML = '';
    if (empty) {
      empty.classList.remove('is-hidden');
      /* Favourites-specific empty message */
      var emptyText = empty.querySelector('.catalog-empty-text');
      if (emptyText) {
        if (_showFavoritesTab)  emptyText.textContent = CatalogI18n.favEmpty;
        else if (_showMyTeachersTab) emptyText.textContent = CatalogI18n.myTeachersEmpty || 'Du hast noch keine Lehrer hinzugefügt.';
        else if (_showPendingTab)    emptyText.textContent = CatalogI18n.pendingEmpty    || 'Keine ausstehenden Anfragen.';
        else                         emptyText.textContent = CatalogI18n.emptyState || 'Kein Lehrer gefunden.';
      }
    }
    return;
  }
  if (empty) empty.classList.add('is-hidden');

  /* Rebuild grid */
  grid.innerHTML = '';
  for (var i = 0; i < _filteredTeachers.length; i++) {
    var card = _buildCard(_filteredTeachers[i], i);
    grid.appendChild(card);
  }

  /* Update jump buttons after every render */
  setTimeout(updateCatalogJumpBtns, 50);
}

/* ── Build Card DOM ─────────────────────────────────────── */
function _buildCard(teacher, idx) {
  var user    = teacher.user;
  var p       = teacher.profile;
  var uid     = user.uid;
  var isOpen  = (_expandedUid === uid);

  var card = document.createElement('div');
  card.className = 'tc-card' + (isOpen ? ' is-expanded' : '');
  card.setAttribute('data-uid', uid);

  card.innerHTML = _buildSummaryHTML(p, uid, isOpen, user) +
    _buildPreviewHTML(p, isOpen) +
    _buildDetailHTML(p, uid);

  return card;
}

/* ── Summary (always visible) — mockup-_buildCard-teacherCard-2026-03-24_07-32 ── */
function _buildSummaryHTML(p, uid, isOpen, user) {
  var isStudent = _currentUser && _currentUser.role === 'student';
  var isFav     = isStudent && !!_favoriteUids[uid];

  /* Discipline banner color */
  var disc      = user && user.discipline ? user.discipline : '';
  var _DISC_LABELS = (typeof DISC_LABELS !== 'undefined') ? DISC_LABELS : { ski: 'Ski', snowboard: 'Snowboard', paragliding: 'Paragliding', climbing: 'Klettern', diving: 'Tauchen', telemark: 'Telemark', nordic: 'Langlauf' };
  var discLabel = disc && _DISC_LABELS[disc] ? _DISC_LABELS[disc] : '';
  var bannerClass = 'tc-banner' + (disc ? ' tc-banner--' + disc : '');

  /* Fav button */
  var favHTML = isStudent
    ? '<button class="tc-fav-btn' + (isFav ? ' is-favorite' : '') + '"' +
        ' data-fav-uid="' + _esc(uid) + '"' +
        ' aria-label="' + _esc(isFav ? CatalogI18n.favRemove : CatalogI18n.favAdd) + '"' +
        ' aria-pressed="' + (isFav ? 'true' : 'false') + '">' +
        '<svg width="14" height="14" viewBox="0 0 16 16"' +
          ' fill="' + (isFav ? 'var(--catalog-fav-fill)' : 'none') + '"' +
          ' stroke="' + (isFav ? 'var(--catalog-fav-fill)' : 'currentColor') + '"' +
          ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M8 13.5S1.5 9 1.5 5.5a3.5 3.5 0 017 0 3.5 3.5 0 017 0c0 3.5-6.5 8-6.5 8z"/>' +
        '</svg>' +
      '</button>'
    : '';

  /* Avatar */
  var avatarInner = p.photo
    ? '<img src="' + _esc(p.photo) + '" alt="' + _esc(p.name || uid) + '">'
    : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">' +
        '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"' +
        ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

  /* Price — individual price for logged-in students, profile price for guests */
  var priceStr = '';
  if (p.pricePerHalfHour) {
    var _tCur   = p.priceCurrency || 'EUR';
    var _tPrice = (_currentUser && _currentUser.role === 'student' &&
                   typeof AppService !== 'undefined' &&
                   typeof AppService.getStudentPriceForTeacherSync === 'function')
      ? AppService.getStudentPriceForTeacherSync(_currentUser.uid, uid)
      : parseFloat(p.pricePerHalfHour);
    if (typeof CurrencyService !== 'undefined') {
      var _vUid = _currentUser ? _currentUser.uid : null;
      var _vCur = CurrencyService.getUserCurrency(_vUid);
      if (_vCur && _vCur !== _tCur) {
        var _conv = CurrencyService.convertSync(_tPrice, _tCur, _vCur);
        priceStr = (_conv !== null) ? CurrencyService.format(_conv, _vCur) : CurrencyService.format(_tPrice, _tCur);
      } else {
        priceStr = CurrencyService.format(_tPrice, _tCur);
      }
    } else {
      priceStr = '\u20ac' + _tPrice;
    }
  }
  var priceHTML = priceStr ? '<span class="tc-avatar-price">' + priceStr + ' / 30min</span>' : '';

  /* Discipline badge */
  var discBadgeHTML = discLabel
    ? '<span class="tc-discipline-badge tc-discipline-badge-' + _esc(disc) + '">' + _esc(discLabel) + '</span>'
    : '';

  /* Exp + location */
  var expHTML = p.experienceYears
    ? '<span class="tc-summary-exp">' + _esc(p.experienceYears) + ' J.</span>'
    : '';
  var locationHTML = p.location
    ? '<span class="tc-summary-location">' +
        '<svg width="11" height="11" viewBox="0 0 16 16" fill="none">' +
          '<path d="M8 1a5 5 0 015 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 015-5z" stroke="currentColor" stroke-width="1.5"/>' +
          '<circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/>' +
        '</svg>' +
        _esc(p.location) +
      '</span>'
    : '';

  /* Languages */
  var langMap = { de:'DE', en:'EN', fr:'FR', it:'IT', es:'ES', ru:'RU', ja:'JA', zh:'ZH' };
  var langsHTML = '';
  if (p.languages && p.languages.length) {
    for (var i = 0; i < p.languages.length; i++) {
      langsHTML += '<span class="pv-lang-badge">' + _esc(langMap[p.languages[i]] || p.languages[i].toUpperCase()) + '</span>';
    }
    langsHTML = '<div class="tc-summary-langs">' + langsHTML + '</div>';
  }

  /* Actions row */
  var isConnected   = isStudent && (typeof Store !== 'undefined') && Store.Selections.exists(_currentUser.uid, uid);
  var isPendingConn = !isConnected && isStudent && (typeof ChatStore !== 'undefined') &&
    ChatStore.getRequestStatus(uid, _currentUser.uid) === 'pending';
  var connectLabel  = isConnected
    ? CatalogI18n.connectRemove
    : (isPendingConn ? (CatalogI18n.pendingTab || 'Ausstehend') : CatalogI18n.connectAdd);
  var expandLabel   = isOpen ? CatalogI18n.collapseBtn : CatalogI18n.expandBtn;

  var connectIconPath = isConnected
    ? '<path d="M9 11a4 4 0 10-8 0h8z"/><path d="M5 7a3 3 0 100-6 3 3 0 000 6z"/><path d="M12 5l2 2 3-3" stroke-width="1.8"/>'
    : '<path d="M9 11a4 4 0 10-8 0h8z"/><path d="M5 7a3 3 0 100-6 3 3 0 000 6z"/><path d="M13 4v6M10 7h6"/>';

  var actionsHTML = isStudent
    ? '<div class="tc-actions">' +
        '<button class="tc-action-btn tc-connect-btn' +
          (isConnected ? ' is-connected' : (isPendingConn ? ' is-pending' : '')) + '"' +
          ' data-connect-uid="' + _esc(uid) + '"' +
          ' aria-label="' + _esc(connectLabel) + '"' +
          ' aria-pressed="' + (isConnected ? 'true' : 'false') + '">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"' +
            ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            connectIconPath +
          '</svg>' +
          '<span>' + _esc(connectLabel) + '</span>' +
        '</button>' +
        '<button class="tc-action-btn tc-chat-btn" data-chat-uid="' + _esc(uid) + '"' +
          ' aria-label="Chat mit ' + _esc(p.name || uid) + '">' +
          '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"' +
            ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6l-4 3V4z"/>' +
          '</svg>' +
          '<span>' + _esc(CatalogI18n.actionChat) + '</span>' +
        '</button>' +
        '<button class="tc-action-btn tc-expand-btn"' +
          ' data-uid="' + _esc(uid) + '"' +
          ' aria-label="' + _esc(expandLabel) + '"' +
          ' aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
            '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"' +
              ' stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          '<span>' + _esc(CatalogI18n.actionDetails) + '</span>' +
        '</button>' +
      '</div>'
    : '<div class="tc-actions">' +
        '<button class="tc-action-btn tc-chat-btn" data-chat-uid="' + _esc(uid) + '">' +
          '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"' +
            ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6l-4 3V4z"/>' +
          '</svg>' +
          '<span>' + _esc(CatalogI18n.actionChat) + '</span>' +
        '</button>' +
        '<button class="tc-action-btn tc-expand-btn" data-uid="' + _esc(uid) + '"' +
          ' aria-label="' + _esc(expandLabel) + '"' +
          ' aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
            '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"' +
              ' stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          '<span>' + _esc(CatalogI18n.actionDetails) + '</span>' +
        '</button>' +
      '</div>';

  return '<div class="' + bannerClass + '">' +
           '<span class="tc-banner-disc">' + _esc(discLabel) + '</span>' +
           favHTML +
         '</div>' +
         '<div class="tc-avatar-row">' +
           '<div class="tc-avatar-circle">' + avatarInner + '</div>' +
           priceHTML +
         '</div>' +
         '<div class="tc-card-body">' +
           '<div class="tc-name-row">' +
             '<span class="tc-summary-name">' + _esc(p.name || uid) + '</span>' +
             discBadgeHTML +
           '</div>' +
           '<div class="tc-meta-row">' +
             expHTML + locationHTML + langsHTML +
           '</div>' +
         '</div>' +
         actionsHTML;
}


/* ── Preview (bio + chips, hidden when expanded) ────────── */
function _buildPreviewHTML(p, isOpen) {
  if (isOpen) return '';

  var bioHTML = '';
  if (p.bio) {
    bioHTML = '<p class="tc-preview-bio">' + _esc(p.bio) + '</p>';
  }

  var specMap = {
    kids: 'Kinder', freeride: 'Freeride', freestyle: 'Freestyle',
    racing: 'Racing', anxiety: 'Angst-Training', adaptive: 'Adaptive',
    snowboard: 'Snowboard', telemark: 'Telemark',
    firstaid: 'Erste Hilfe', avalanche: 'Lawinenkurs'
  };

  var chipsHTML = '';
  var specs = p.specializations || [];
  var maxChips = 3;
  for (var i = 0; i < specs.length && i < maxChips; i++) {
    chipsHTML += '<span class="tc-preview-chip">' + _esc(specMap[specs[i]] || specs[i]) + '</span>';
  }
  if (specs.length > maxChips) {
    chipsHTML += '<span class="tc-preview-chip-more">+' + (specs.length - maxChips) + '</span>';
  }

  if (!bioHTML && !chipsHTML) return '';

  return '<div class="tc-preview">' +
    bioHTML +
    (chipsHTML ? '<div class="tc-preview-specs">' + chipsHTML + '</div>' : '') +
  '</div>';
}

/* ── Detail (expanded only) ─────────────────────────────── */
function _buildDetailHTML(p, uid) {
  var aboutHTML = p.bio
    ? '<div class="pv-section">' +
        '<h2 class="pv-section-title">' + CatalogI18n.sectionAbout + '</h2>' +
        '<p class="pv-bio">' + _esc(p.bio) + '</p>' +
      '</div>'
    : '';

  var teachingHTML = _buildTeachingSection(p);
  var terrainHTML  = _buildTerrainSection(p);
  var certsHTML    = _buildCertsSection(p);
  var specsHTML    = _buildSpecsSection(p);
  var contactHTML  = _buildContactSection(p);

  /* Two-col grid for teaching + terrain */
  var gridHTML = '';
  if (teachingHTML || terrainHTML) {
    gridHTML = '<div class="tc-detail-grid">' +
      (teachingHTML || '') +
      (terrainHTML  || '') +
    '</div>';
  }

  /* Full-width: specs + certs */
  var fullHTML = '';
  if (specsHTML) fullHTML += '<div class="tc-detail-full">' + specsHTML + '</div>';
  if (certsHTML) fullHTML += '<div class="tc-detail-full">' + certsHTML + '</div>';
  if (contactHTML) fullHTML += '<div class="tc-detail-full">' + contactHTML + '</div>';

  /* Book CTA */
  var user       = Auth.current();
  var isLoggedIn = !!user;
  var bookHint   = isLoggedIn ? CatalogI18n.bookHintLoggedIn : CatalogI18n.bookHintGuest;
  var bookLabel  = isLoggedIn ? CatalogI18n.bookBtn : CatalogI18n.loginToBook;

  var ctaHTML = '<div class="tc-book-row">' +
    '<span class="tc-book-hint">' + _esc(bookHint) + '</span>' +
    '<button class="btn btn-primary tc-book-btn" data-book-uid="' + _esc(uid) + '">' +
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>' +
      _esc(bookLabel) +
    '</button>' +
  '</div>';

  return '<div class="tc-detail">' +
    (aboutHTML ? '<div class="tc-detail-full">' + aboutHTML + '</div>' : '') +
    gridHTML +
    fullHTML +
    ctaHTML +
  '</div>';
}

/* ── Section builders (reuse ProfileView logic) ─────────── */
function _buildTeachingSection(p) {
  var rows = [];
  var ltMap  = { private: 'Einzelunterricht', group: 'Gruppenunterricht', private_group: 'Privatgruppe' };
  var audMap = { kids: 'Kinder', teens: 'Jugendliche', adults: 'Erwachsene', seniors: 'Senioren' };
  var lvMap  = { beginner: 'Anfänger', intermediate: 'Mittelstufe', advanced: 'Fortgeschritten', expert: 'Experten' };

  if (p.lessonTypes && p.lessonTypes.length) {
    var labels = [];
    for (var i = 0; i < p.lessonTypes.length; i++) labels.push(ltMap[p.lessonTypes[i]] || p.lessonTypes[i]);
    rows.push(['Unterrichtsart', labels.join(', ')]);
  }
  if (p.audience && p.audience.length) {
    var audLabels = [];
    for (var j = 0; j < p.audience.length; j++) audLabels.push(audMap[p.audience[j]] || p.audience[j]);
    rows.push(['Zielgruppe', audLabels.join(', ')]);
  }
  if (p.levels && p.levels.length) {
    var lvLabels = [];
    for (var k = 0; k < p.levels.length; k++) lvLabels.push(lvMap[p.levels[k]] || p.levels[k]);
    rows.push(['Level', lvLabels.join(', ')]);
  }
  if (p.ageFrom || p.ageTo) rows.push(['Altersbereich', (p.ageFrom || '?') + ' – ' + (p.ageTo || '?') + ' J.']);
  if (p.maxGroupSize) rows.push(['Max. Gruppe', p.maxGroupSize + ' Personen']);

  if (!rows.length) return '';

  var html = '<div class="pv-section"><h2 class="pv-section-title">Unterricht</h2><div class="pv-detail-list">';
  for (var r = 0; r < rows.length; r++) {
    html += '<div class="pv-detail-row">' +
      '<span class="pv-detail-label">' + _esc(rows[r][0]) + '</span>' +
      '<span class="pv-detail-value">' + _esc(rows[r][1]) + '</span>' +
    '</div>';
  }
  return html + '</div></div>';
}

function _buildTerrainSection(p) {
  if (!p.terrain || !p.terrain.length) return '';
  var map = {
    green: { emoji: '🟢', label: 'Grüne Pisten',    sub: 'Anfänger'       },
    blue:  { emoji: '🔵', label: 'Blaue Pisten',    sub: 'Intermediate'   },
    red:   { emoji: '🔴', label: 'Rote Pisten',     sub: 'Fortgeschritten' },
    black: { emoji: '⚫', label: 'Schwarze Pisten', sub: 'Experten'       }
  };
  var html = '<div class="pv-section"><h2 class="pv-section-title">Terrain &amp; Pisten</h2><div class="pv-terrain-row">';
  for (var i = 0; i < p.terrain.length; i++) {
    var t = map[p.terrain[i]];
    if (!t) continue;
    html += '<div class="pv-terrain-badge">' +
      '<span class="pv-terrain-emoji">' + t.emoji + '</span>' +
      '<span class="pv-terrain-label">' + t.label + '</span>' +
      '<span class="pv-terrain-sub">' + t.sub + '</span>' +
    '</div>';
  }
  return html + '</div></div>';
}

function _buildCertsSection(p) {
  if (!p.certifications || !p.certifications.length) return '';
  var orgMap = { isia: 'ISIA', basi: 'BASI', psia: 'PSIA', csia: 'CSIA', dsv: 'DSV/DSLV', other: 'Sonstige' };
  var html = '<div class="pv-section"><h2 class="pv-section-title">Zertifikate</h2><div class="pv-cert-list">';
  for (var i = 0; i < p.certifications.length; i++) {
    var c = p.certifications[i];
    if (!c.org && !c.level) continue;
    html += '<div class="pv-cert-item">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">' +
        '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"' +
        ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
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
    kids: 'Kinderunterricht', freeride: 'Freeride / Off-piste',
    freestyle: 'Freestyle / Park', racing: 'Renntraining',
    anxiety: 'Angst-Training', adaptive: 'Adaptive Skiing',
    snowboard: 'Snowboard', telemark: 'Telemark',
    firstaid: 'Erste Hilfe', avalanche: 'Lawinenkurs'
  };
  var html = '<div class="pv-section"><h2 class="pv-section-title">Spezialisierungen</h2><div class="pv-spec-chips">';
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
  if (!items.length) return '';
  return '<div class="pv-section"><h2 class="pv-section-title">Kontakt</h2><div class="pv-contact-list">' + items.join('') + '</div></div>';
}

/* ── Bind card interactions ─────────────────────────────── */
function _bindCards() {
  var grid = document.getElementById('catalog-grid');
  if (!grid) return;

  /* Card click (delegate from whole card)
     Priority order:
     1. .tc-fav-btn     → toggle favorite (students only)
     2. .tc-connect-btn → connect / disconnect teacher (students only)
     3. .tc-chat-btn    → open chat
     4. .tc-expand-btn  → toggle detail panel (chevron only)
     5. [data-book-uid] → book handler (inside expanded detail)
     6. Any other area  → navigate to teacher profile */
  grid.addEventListener('click', function(e) {
    /* 1. Favorite button */
    var favBtn = _closest(e.target, '.tc-fav-btn');
    if (favBtn) {
      e.stopPropagation();
      var favUid = favBtn.getAttribute('data-fav-uid');
      _toggleFavorite(favUid);
      return;
    }

    /* 2. Connect button */
    var connectBtn = _closest(e.target, '.tc-connect-btn');
    if (connectBtn) {
      e.stopPropagation();
      var connectUid = connectBtn.getAttribute('data-connect-uid');
      _handleConnect(connectUid);
      return;
    }

    /* 3. Chat button */
    var chatBtn = _closest(e.target, '.tc-chat-btn');
    if (chatBtn) {
      e.stopPropagation();
      var chatUid = chatBtn.getAttribute('data-chat-uid');
      _handleChat(chatUid);
      return;
    }

    /* 4. Expand/collapse chevron — toggle detail panel only */
    var expandBtn = _closest(e.target, '.tc-expand-btn');
    if (expandBtn) {
      e.stopPropagation();
      var expandUid = expandBtn.getAttribute('data-uid');
      _toggleCard(expandUid);
      return;
    }

    /* 5. Book button inside detail */
    var bookBtn = _closest(e.target, '[data-book-uid]');
    if (bookBtn) {
      e.stopPropagation();
      var bookUid = bookBtn.getAttribute('data-book-uid');
      _handleBook(bookUid);
      return;
    }

    /* 6. Any other click on the card → navigate to teacher profile */
    var card = _closest(e.target, '.tc-card');
    if (card) {
      var uid = card.getAttribute('data-uid');
      if (!uid) return;
      var viewerUid = (_currentUser) ? _currentUser.uid : '';
      window.location.href = './profile-view.html?uid=' + encodeURIComponent(uid) +
        '&viewer=' + encodeURIComponent(viewerUid);
    }
  });
}

function _toggleCard(uid) {
  if (_expandedUid === uid) {
    _expandedUid = null;
  } else {
    _expandedUid = uid;
  }
  _render();
  _updateFabForExpanded();

  /* Scroll expanded card into view */
  if (_expandedUid) {
    setTimeout(function() {
      var card = document.querySelector('.tc-card.is-expanded');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

/* ── Connect / Disconnect teacher ───────────────────────── */
function _handleConnect(teacherUid) {
  if (!_currentUser || _currentUser.role !== 'student') {
    AuthModal.open('signin');
    return;
  }
  var sid = _currentUser.uid;
  var teacherName = ProfileStore.getDisplayName(teacherUid);

  if (Store.Selections.exists(sid, teacherUid)) {
    /* Already confirmed — disconnect */
    AppService.deleteSelection(sid, teacherUid, function(err) {
      if (err) { Toast.error(err.message || 'Fehler beim Trennen.'); return; }
      Toast.info(teacherName + ' ' + CatalogI18n.connectRemovedToast);
      _render();
    });
    return;
  }

  /* Check if a pending request already exists */
  var existingStatus = (typeof ChatStore !== 'undefined')
    ? ChatStore.getRequestStatus(teacherUid, sid)
    : null;

  if (existingStatus === 'pending') {
    /* Already pending — do nothing, inform user */
    Toast.info(CatalogI18n.connectAlreadyPending.replace('{name}', teacherName));
    return;
  }

  /* Send service request — Selection is created only after teacher accepts */
  if (typeof ChatStore !== 'undefined' && ChatStore.sendServiceMessage) {
    ChatStore.sendServiceMessage(teacherUid, sid, 'student_request');
  }
  /* Email notification to teacher */
  if (typeof EmailService !== 'undefined' && EmailService.onRequestReceived) {
    var _stuName = (typeof AppService !== 'undefined') ? AppService.getDisplayNameSync(sid) : sid;
    EmailService.onRequestReceived(teacherUid, _stuName);
  }
  Toast.success(teacherName + ' ' + CatalogI18n.connectAddedToast);
  _render();
}

function _handleChat(teacherUid) {
  var user = Auth.current();
  if (!user) {
    /* Find teacher name for hint — async */
    AppService.getDisplayName(teacherUid, function(err, name) {
      var displayName = (!err && name) ? name : 'dem Lehrer';
      AuthModal.open('signin', 'Melde dich an, um mit ' + displayName + ' Kontakt aufzunehmen.');
    });
    return;
  }
  /* Logged in — open chat directly with this teacher */
  if (typeof ChatPanel !== 'undefined' && ChatPanel.openWith) {
    ChatPanel.openWith(teacherUid);
  }
}

function _updateFabForExpanded() {
  var fab = document.getElementById('chat-fab');
  if (!fab) return;

  if (_expandedUid) {
    AppService.getDisplayName(_expandedUid, function(err, name) {
      var displayName = (!err && name) ? name : _expandedUid;
      var currentFab = document.getElementById('chat-fab');
      if (currentFab) currentFab.setAttribute('aria-label', 'Chat mit ' + displayName);
    });
    fab.setAttribute('aria-label', 'Chat mit ...');
    fab.classList.add('tc-fab-active');

    /* Replace FAB click handler */
    var newFab = fab.cloneNode(true);
    fab.parentNode.replaceChild(newFab, newFab.parentNode.querySelector('#chat-fab') || fab);
    /* Re-query after potential DOM swap */
    var activeFab = document.getElementById('chat-fab');
    if (activeFab) {
      activeFab.setAttribute('aria-label', 'Chat mit ' + name);
      activeFab.classList.add('tc-fab-active');
      activeFab.onclick = function() { _handleChat(_expandedUid); };
    }
  } else {
    var neutralFab = document.getElementById('chat-fab');
    if (neutralFab) {
      neutralFab.setAttribute('aria-label', 'Chat');
      neutralFab.classList.remove('tc-fab-active');
      neutralFab.onclick = function() {
        var user = Auth.current();
        if (!user) { AuthModal.open('signin'); return; }
        if (typeof ChatPanel !== 'undefined') ChatPanel.open();
      };
    }
  }
}

function _handleBook(teacherUid) {
  var user = Auth.current();
  if (!user) {
    AuthModal.open('signin');
    return;
  }
  /* Logged in: navigate to teacher page with teacher uid as context */
  window.location.href = './teacher.html?uid=' + encodeURIComponent(user.uid) + '&teacherUid=' + encodeURIComponent(teacherUid);
}

/* ── Filter-Button (öffnet Drawer) ──────────────────────── */
function _bindFilterBtn() {
  var btn = document.getElementById('catalog-filter-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    CatalogFilterDrawer.open();
    CatalogFilterDrawer.setCount(_filteredTeachers.length);
  });
}

function _updateFilterBtn() {
  var btn = document.getElementById('catalog-filter-btn');
  if (!btn) return;
  var count = _countActiveFilters();
  var label = btn.querySelector('.catalog-filter-btn-label');
  var badge = btn.querySelector('.catalog-filter-btn-count');
  if (count > 0) {
    btn.classList.add('has-active');
    if (label) label.textContent = 'Filter';
    if (badge) { badge.textContent = String(count); badge.classList.remove('is-hidden'); }
  } else {
    btn.classList.remove('has-active');
    if (label) label.textContent = 'Filter';
    if (badge) badge.classList.add('is-hidden');
  }
}

function _countActiveFilters() {
  var f = _drawerFilters;
  var n = 0;
  var arrKeys = ['level', 'lesson', 'languages', 'audience', 'terrain', 'specializations', 'gender'];
  for (var i = 0; i < arrKeys.length; i++) {
    if (f[arrKeys[i]] && f[arrKeys[i]].length) n++;
  }
  if (f.priceMin > 0 || f.priceMax < (typeof CatalogFilterDrawer !== 'undefined' && CatalogFilterDrawer.getPriceMax ? CatalogFilterDrawer.getPriceMax() : 300)) n++;
  if (f.expMin > 0 || f.expMax < 40) n++;
  if (f.location) n++;
  return n;
}

/* ── Active Filter Badges im Header ──────────────────────── */
var _BADGE_LABEL_MAPS = {
  level:  { beginner: 'Anfänger', intermediate: 'Mittelstufe', advanced: 'Fortgeschritten', expert: 'Experten' },
  lesson: { private: 'Einzelunterricht', group: 'Gruppenunterricht', private_group: 'Privat-Gruppe' },
  languages: { de: 'Deutsch', en: 'Englisch', fr: 'Französisch', it: 'Italienisch', es: 'Spanisch', ru: 'Russisch', ja: 'Japanisch', zh: 'Chinesisch' },
  audience:  { kids: 'Kinder', teens: 'Jugendliche', adults: 'Erwachsene', seniors: 'Senioren' },
  terrain:   { green: '🟢 Grün', blue: '🔵 Blau', red: '🔴 Rot', black: '⚫ Schwarz' },
  specializations: { kids: 'Kinderunterricht', freeride: 'Freeride', freestyle: 'Freestyle', racing: 'Renntraining', anxiety: 'Angst', adaptive: 'Adaptiv', snowboard: 'Snowboard', telemark: 'Telemark', firstaid: 'Erste Hilfe', avalanche: 'Lawinen' },
  gender: { male: 'Männlich', female: 'Weiblich', diverse: 'Divers' }
};

function _renderActiveBadges() {
  var container = document.getElementById('catalog-active-filters');
  if (!container) return;

  container.innerHTML = '';
  var f = _drawerFilters;
  var hasBadge = false;

  /* Array-Gruppen */
  var arrKeys = ['level', 'lesson', 'languages', 'audience', 'terrain', 'specializations', 'gender'];
  for (var ki = 0; ki < arrKeys.length; ki++) {
    var key = arrKeys[ki];
    var vals = f[key] || [];
    for (var vi = 0; vi < vals.length; vi++) {
      var map    = _BADGE_LABEL_MAPS[key] || {};
      var labelTxt = map[vals[vi]] || vals[vi];
      container.appendChild(_makeBadge(labelTxt, key, vals[vi]));
      hasBadge = true;
    }
  }

  /* Preis */
  if (f.priceMin > 0 || f.priceMax < (typeof CatalogFilterDrawer !== 'undefined' && CatalogFilterDrawer.getPriceMax ? CatalogFilterDrawer.getPriceMax() : 300)) {
    var _filterSym = (typeof CurrencyService !== 'undefined' && typeof currentUser !== 'undefined' && currentUser)
      ? CurrencyService.getSymbol(CurrencyService.getUserCurrency(currentUser.uid)) : '€';
    container.appendChild(_makeBadge(_filterSym + ' ' + f.priceMin + '–' + f.priceMax, 'price', null));
    hasBadge = true;
  }

  /* Erfahrung */
  if (f.expMin > 0 || f.expMax < 40) {
    container.appendChild(_makeBadge(f.expMin + '–' + f.expMax + ' J.', 'experience', null));
    hasBadge = true;
  }

  /* Location */
  if (f.location) {
    container.appendChild(_makeBadge('📍 ' + f.location, 'location', null));
    hasBadge = true;
  }

  container.classList.toggle('is-empty', !hasBadge);
}

function _makeBadge(labelTxt, filterKey, filterValue) {
  var badge = document.createElement('span');
  badge.className = 'catalog-active-badge';

  var text = document.createElement('span');
  text.textContent = labelTxt;

  var removeBtn = document.createElement('button');
  removeBtn.className = 'catalog-badge-remove';
  removeBtn.type      = 'button';
  removeBtn.setAttribute('aria-label', 'Filter entfernen: ' + labelTxt);
  removeBtn.innerHTML =
    '<svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
      '<path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>';

  /* Badge-Klick: Einzelnen Filter entfernen */
  (function(key, val) {
    removeBtn.addEventListener('click', function() {
      _removeSingleFilter(key, val);
    });
  }(filterKey, filterValue));

  badge.appendChild(text);
  badge.appendChild(removeBtn);
  return badge;
}

function _removeSingleFilter(key, val) {
  var f = CatalogFilterDrawer.getFilters();
  if (key === 'price') {
    f.priceMin = 0; f.priceMax = 300;
  } else if (key === 'experience') {
    f.expMin = 0; f.expMax = 40;
  } else if (key === 'location') {
    f.location = '';
  } else if (f[key] && val !== null) {
    var newArr = [];
    for (var i = 0; i < f[key].length; i++) {
      if (f[key][i] !== val) newArr.push(f[key][i]);
    }
    f[key] = newArr;
  }
  /* Drawer-State zurückschreiben via Reset + neu init ist nicht ideal,
     daher: State direkt im Catalog spiegeln und Drawer per reset+partial nicht möglich.
     Best-practice: Filter komplett im Catalog-State halten, Drawer nur als UI. */
  _drawerFilters = f;
  _expandedUid   = null;
  _render();
  _renderActiveBadges();
  _updateFilterBtn();
  CatalogFilterDrawer.setCount(_filteredTeachers.length);
  /* Drawer intern syncen — Reset + neu setzen nicht einfach möglich ohne API.
     Daher nur visuell im Header aktualisieren; beim nächsten Drawer-Öffnen
     spiegelt der Stand den _drawerFilters-State nicht automatisch.
     TODO: CatalogFilterDrawer.setFilters(f) API für Zwei-Wege-Sync ergänzen. */
}

function _bindResetBtn() {
  var btn = document.getElementById('catalog-reset-filters');
  if (!btn) return;
  btn.addEventListener('click', function() {
    CatalogFilterDrawer.reset();
    _activeTab   = 'all';
    _expandedUid = null;
    _buildTabs();
    _render();
  });
}

/* ── Helpers ────────────────────────────────────────────── */
function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Section Jump ───────────────────────────────────────── */
/*
 * Jump targets:
 *   - When a card is expanded: all .tc-summary elements (one per card)
 *   - When nothing expanded: jumper hidden (page too short)
 * Top button: always visible once scrollY > navbar height
 */

function _getCatalogJumpTargets() {
  if (!_expandedUid) return [];
  /* All card summaries = one jump target per teacher card */
  var summaries = document.querySelectorAll('.tc-summary');
  return Array.prototype.slice.call(summaries);
}

function _getNavbarHeight() {
  var navbar = document.querySelector('.navbar');
  return navbar ? navbar.offsetHeight : 52;
}

function _getCurrentJumpIndex(targets) {
  var navH   = _getNavbarHeight();
  var scrollY = window.scrollY + navH + 10;
  var best = 0;
  for (var i = 0; i < targets.length; i++) {
    var top = targets[i].getBoundingClientRect().top + window.scrollY;
    if (top <= scrollY) best = i;
  }
  return best;
}

function updateCatalogJumpBtns() {
  var jumper  = document.getElementById('section-jumper');
  var upBtn   = document.getElementById('jump-up');
  var downBtn = document.getElementById('jump-down');
  var topBtn  = document.getElementById('jump-top');
  if (!jumper) return;

  var targets  = _getCatalogJumpTargets();
  var navH     = _getNavbarHeight();
  var hasCards = targets.length > 1;
  var scrolled = window.scrollY > navH;

  /* Show jumper if cards are expandable-navigable OR page is scrolled */
  jumper.classList.toggle('is-visible', hasCards || scrolled);

  if (upBtn && downBtn) {
    var idx = _getCurrentJumpIndex(targets);
    upBtn.classList.toggle('is-dimmed', !hasCards || idx <= 0);
    downBtn.classList.toggle('is-dimmed', !hasCards || idx >= targets.length - 1);
    /* Hide up/down entirely when no expanded card */
    upBtn.classList.toggle('is-hidden', !hasCards);
    downBtn.classList.toggle('is-hidden', !hasCards);
  }

  if (topBtn) {
    topBtn.classList.toggle('is-hidden-top', !scrolled);
  }
}

function _jumpCatalogSection(delta) {
  var targets = _getCatalogJumpTargets();
  if (!targets.length) return;
  var idx  = _getCurrentJumpIndex(targets);
  var next = idx + delta;
  if (next < 0 || next >= targets.length) return;
  var navH = _getNavbarHeight();
  var top  = targets[next].getBoundingClientRect().top + window.scrollY - navH - 8;
  window.scrollTo({ top: top, behavior: 'smooth' });
  setTimeout(updateCatalogJumpBtns, 400);
}

function _bindJumpBtns() {
  var upBtn  = document.getElementById('jump-up');
  var downBtn = document.getElementById('jump-down');
  var topBtn  = document.getElementById('jump-top');
  var chatFab = document.getElementById('chat-fab');

  if (upBtn)   upBtn.addEventListener('click',   function() { _jumpCatalogSection(-1); });
  if (downBtn) downBtn.addEventListener('click',  function() { _jumpCatalogSection(1);  });
  if (topBtn)  topBtn.addEventListener('click',   function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  if (chatFab) chatFab.addEventListener('click',  function() { /* placeholder — chat not implemented on catalog yet */ });

  window.addEventListener('scroll', updateCatalogJumpBtns);
}

/* ── Public API: refreshPrices ──────────────────────────────
   Wird von der Navbar aufgerufen wenn der Benutzer die Währung
   wechselt — rendert alle Preise neu ohne Seiten-Reload.
   Exportiert als window.SkiingCatalog.refreshPrices          */
window.SkiingCatalog = window.SkiingCatalog || {};
window.SkiingCatalog.refreshPrices = function() {
  /* Re-render des gesamten Katalogs — Preise werden im _buildCard()
     frisch aus CurrencyService.getUserCurrency() gelesen */
  if (typeof _render === 'function') {
    _applyFilters();
    _render();
    _bindCards();
  }
};
