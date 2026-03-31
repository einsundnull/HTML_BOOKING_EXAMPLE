/**
 * my-students.js — Meine Schüler (Standalone-Page)
 *
 * Zeigt alle Schüler des eingeloggten Lehrers in Karten.
 * Pro Schüler: individuelle Preisanpassung (priceOverride auf der Selection).
 *
 * Wiederverwendete globals aus ui.js (geladen via app-config.js _PAGE_ASSETS):
 *   fmtDate, buildAvatarHTML, showProfileSheet, _fmtForUser, _esc,
 *   buildSearchInput, _calcBookingBlockCounts, Toast
 *
 * Keine Imports — IIFE-Pattern, globale Variable MyStudentsPage.
 * Regeln: var only, function(){}, no arrow functions, no template literals.
 */

/* ── i18n ─────────────────────────────────────────────── */
var _msI18n = {};

var _MS_I18N_DEFAULTS = {
  pageTitle:            'Meine Schüler',
  pageSubtitle:         'Schüler verwalten und individuelle Preise festlegen.',
  searchPlaceholder:    'Schüler suchen\u2026',
  summaryBooking:       'Buchung',
  summaryBookingPlural: 'Buchungen',
  badgeAll:             'Alle',
  badgePending:         'Unbest.',
  badgeConfirmed:       'Best. \u2713',
  accPriceTitle:        'Preiseinstellungen',
  accPricePer30:        '\u20ac / 30 Min.',
  priceLabel:           'Preis pro 30 Min.',
  priceDefaultBadge:    'Standardpreis',
  priceOverrideBadge:   'Individuell',
  priceHintPrefix:      'Standardpreis: ',
  priceSave:            'Speichern',
  priceReset:           'Zur\u00fccksetzen',
  gridBtnTitle:         'Individuelle Einstellungen',
  gridBtnSub:           'Sichtbarkeit im Wochen-Grid',
  accBookingsTitle:     'Buchungen',
  accBookingsTotal:     'gesamt',
  bookingsEmpty:        'Noch keine Buchungen.',
  statusConfirmed:      'Best. \u2713',
  statusPending:        'Unbest.',
  emptyNoStudents:      'Noch keine Sch\u00fcler verkn\u00fcpft.',
  emptyNoResults:       'Kein Sch\u00fcler gefunden.',
  toastInvalidPrice:    'Bitte einen g\u00fcltigen Preis eingeben.',
  toastSaveError:       'Fehler beim Speichern.',
  toastSaveSuccess:     'Preis gespeichert.',
  toastResetError:      'Fehler beim Zur\u00fccksetzen.',
  toastResetSuccess:    'Auf Standardpreis zur\u00fcckgesetzt.'
};

function _msLoadI18n(cb) {
  var v   = typeof APP_VERSION !== 'undefined' ? ('?v=' + APP_VERSION) : '';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', './locales/my-students.json' + v);
  xhr.onload = function() {
    try { _msI18n = JSON.parse(xhr.responseText); } catch(e) { _msI18n = {}; }
    cb();
  };
  xhr.onerror = function() { _msI18n = {}; cb(); };
  xhr.send();
}

function _t(key) {
  if (_msI18n && _msI18n[key]) return _msI18n[key];
  return _MS_I18N_DEFAULTS[key] || key;
}

/* ── Module ───────────────────────────────────────────── */
var MyStudentsPage = (function() {
  'use strict';

  var _currentUser = null;
  var _searchQuery = '';

  /* ── Simple block-merge: consecutive half-hours same date = 1 block ── */
  function _mergeBlocks(dateStr, slots) {
    var sorted = slots.slice().sort(function(a, b) { return a.time < b.time ? -1 : 1; });
    var blocks = [];
    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      var last = blocks.length ? blocks[blocks.length - 1] : null;
      if (last && last.date === s.date && last._endTime === s.time) {
        last._endTime = _halfHourAfter(s.time);
        last.bookedSlots.push(s);
        if (s.confirmedAt) last.isFullyConfirmed = true;
      } else {
        blocks.push({
          date:             s.date,
          bookedSlots:      [s],
          _endTime:         _halfHourAfter(s.time),
          isFullyConfirmed: !!s.confirmedAt
        });
      }
    }
    return blocks;
  }

  function _halfHourAfter(timeStr) {
    if (!timeStr) return timeStr;
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    m += 30;
    if (m >= 60) { m -= 60; h += 1; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ── Build a single student card ── */
  function _buildCard(student) {
    var today = fmtDate(new Date());
    var profile = AppService.getProfileOrDefaultSync(student.uid);
    var slots   = AppService.getSlotsByStudentSync(student.uid).filter(function(s) {
      return s.teacherId === _currentUser.uid && s.status === 'booked';
    });

    var counts = _calcBookingBlockCounts(slots, today, {
      mergeFn: _mergeBlocks,
      priceFn: function(s) { return parseFloat(s.price) || 0; }
    });

    /* Selection for this student — needed for priceOverride */
    var sel = AppService.getSelectionsByTeacherSync(_currentUser.uid).filter(function(s) {
      return s.studentId === student.uid;
    })[0] || null;

    var effectivePrice = AppService.getStudentPriceForTeacherSync(student.uid, _currentUser.uid);
    var defaultPrice   = AppService.getTeacherPriceSync(_currentUser.uid);
    var hasOverride    = sel && sel.priceOverride !== undefined && sel.priceOverride !== null && sel.priceOverride !== '';

    /* ── Card wrapper ── */
    var card = document.createElement('div');
    card.className = 'card student-card';
    card.setAttribute('data-uid', student.uid);

    /* ── Card top: avatar + name/subtitle + chevron ── */
    var cardTop = document.createElement('div');
    cardTop.className = 'student-card-top';
    cardTop.setAttribute('tabindex', '0');
    cardTop.setAttribute('role', 'button');

    var avatarWrap = document.createElement('div');
    avatarWrap.className = 'student-card-avatar';
    avatarWrap.innerHTML = buildAvatarHTML(student.uid, { size: 'md', role: 'student' });
    (function(uid) {
      avatarWrap.addEventListener('click', function(e) {
        e.stopPropagation();
        showProfileSheet(uid);
      });
    })(student.uid);

    var nameCol = document.createElement('div');
    nameCol.className = 'student-card-name-col';

    var nameEl = document.createElement('div');
    nameEl.className   = 'student-card-name';
    nameEl.textContent = AppService.getDisplayNameSync(student.uid);
    nameCol.appendChild(nameEl);

    var subtitle = (profile.location || '').trim() ||
      (profile.bio ? profile.bio.trim().slice(0, 40) + (profile.bio.length > 40 ? '\u2026' : '') : '');
    if (subtitle) {
      var subEl = document.createElement('div');
      subEl.className   = 'student-card-subtitle';
      subEl.textContent = subtitle;
      nameCol.appendChild(subEl);
    }

    var chevron = document.createElement('span');
    chevron.className = 'student-chevron';
    chevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    cardTop.appendChild(avatarWrap);
    cardTop.appendChild(nameCol);
    cardTop.appendChild(chevron);

    /* ── Booking summary ── */
    var summaryEl = document.createElement('div');
    summaryEl.className = 'student-card-summary';
    var summaryWord = counts.all !== 1 ? _t('summaryBookingPlural') : _t('summaryBooking');
    summaryEl.textContent = counts.all + ' ' + summaryWord +
      (counts.totalAll > 0 ? ' \u00b7 ' + _fmtForUser(counts.totalAll, _currentUser.uid) : '');

    /* ── Badge row ── */
    var badgeRow = document.createElement('div');
    badgeRow.className = 'student-card-badges';
    var badgeDefs = [
      { label: _t('badgeAll'),       val: counts.all,        total: counts.totalAll,        cls: '' },
      { label: _t('badgePending'),   val: counts.unconfirmed, total: counts.totalUnconfirmed, cls: 'student-card-badge--pending' },
      { label: _t('badgeConfirmed'), val: counts.confirmed,  total: counts.totalConfirmed,  cls: 'student-card-badge--confirmed' }
    ];
    badgeDefs.forEach(function(b) {
      if (b.val === 0) return;
      var chip = document.createElement('span');
      chip.className = 'student-card-badge ' + b.cls;
      var cntSpan = document.createElement('span');
      cntSpan.className = 'student-card-badge-count';
      cntSpan.textContent = b.val;
      chip.appendChild(document.createTextNode(b.label + ' '));
      chip.appendChild(cntSpan);
      if (b.total > 0) {
        var priceSpan = document.createElement('span');
        priceSpan.className = 'student-card-badge-price';
        priceSpan.textContent = ' ' + _fmtForUser(b.total, _currentUser.uid);
        chip.appendChild(priceSpan);
      }
      badgeRow.appendChild(chip);
    });

    /* ── Detail panel (expandable) ── */
    var detail = document.createElement('div');
    detail.className = 'student-booking-detail';

    /* ── Assemble card ── */
    card.appendChild(cardTop);
    card.appendChild(summaryEl);
    card.appendChild(badgeRow);
    card.appendChild(detail);

    /* ── Toggle expand ── */
    function _toggle() {
      var isOpen = detail.classList.contains('is-open');
      if (isOpen) {
        chevron.classList.remove('is-open');
        detail.classList.remove('is-open');
        detail.innerHTML = '';
      } else {
        chevron.classList.add('is-open');
        detail.classList.add('is-open');
        _populateDetail(detail, student, slots, sel, effectivePrice, defaultPrice, hasOverride);
      }
    }
    cardTop.addEventListener('click', _toggle);
    cardTop.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') _toggle();
    });

    return card;
  }

  /* ── Detail panel: accordion sections + grid navigation button ── */
  function _populateDetail(detail, student, slots, sel, effectivePrice, defaultPrice, hasOverride) {
    detail.innerHTML = '';

    /* 1. Preiseinstellungen accordion */
    var priceMeta = (hasOverride ? effectivePrice : defaultPrice) + ' ' + _t('accPricePer30');
    var priceAcc  = _buildAccordion('ms-accordion-icon-price', '\u20ac', _t('accPriceTitle'), priceMeta);
    var priceBody = priceAcc.querySelector('.ms-accordion-body');

    var priceHeader = document.createElement('div');
    priceHeader.className = 'ms-price-header';
    var priceLabel = document.createElement('span');
    priceLabel.className   = 'ms-price-label';
    priceLabel.textContent = _t('priceLabel');
    priceHeader.appendChild(priceLabel);
    var defaultBadge = document.createElement('span');
    defaultBadge.className   = 'ms-price-default-badge' + (hasOverride ? ' is-hidden' : '');
    defaultBadge.id          = 'ms-def-badge-' + student.uid;
    defaultBadge.textContent = _t('priceDefaultBadge');
    priceHeader.appendChild(defaultBadge);
    var overrideBadge = document.createElement('span');
    overrideBadge.className   = 'ms-price-override-badge' + (hasOverride ? '' : ' is-hidden');
    overrideBadge.id          = 'ms-ovr-badge-' + student.uid;
    overrideBadge.textContent = _t('priceOverrideBadge');
    priceHeader.appendChild(overrideBadge);
    priceBody.appendChild(priceHeader);

    var priceRow = document.createElement('div');
    priceRow.className = 'ms-price-row';
    var priceInput = document.createElement('input');
    priceInput.type        = 'number';
    priceInput.className   = 'ms-price-input';
    priceInput.id          = 'ms-price-input-' + student.uid;
    priceInput.min         = '0';
    priceInput.step        = '0.50';
    priceInput.placeholder = String(defaultPrice || '0');
    priceInput.value       = hasOverride ? String(effectivePrice) : '';
    var priceHint = document.createElement('span');
    priceHint.className   = 'ms-price-hint';
    priceHint.id          = 'ms-price-hint-' + student.uid;
    priceHint.textContent = _t('priceHintPrefix') + (defaultPrice || '0');
    var priceActions = document.createElement('div');
    priceActions.className = 'ms-price-actions';
    var saveBtn = document.createElement('button');
    saveBtn.type        = 'button';
    saveBtn.className   = 'btn btn-sm btn-primary ms-price-save';
    saveBtn.textContent = _t('priceSave');
    var resetBtn = document.createElement('button');
    resetBtn.type        = 'button';
    resetBtn.className   = 'btn btn-sm btn-ghost ms-price-reset' + (hasOverride ? '' : ' is-hidden');
    resetBtn.id          = 'ms-reset-btn-' + student.uid;
    resetBtn.textContent = _t('priceReset');
    priceActions.appendChild(saveBtn);
    priceActions.appendChild(resetBtn);
    priceRow.appendChild(priceInput);
    priceRow.appendChild(priceHint);
    priceRow.appendChild(priceActions);
    priceBody.appendChild(priceRow);

    saveBtn.addEventListener('click', function() {
      var raw = priceInput.value.trim();
      var val = raw === '' ? null : parseFloat(raw);
      if (raw !== '' && (isNaN(val) || val < 0)) { Toast.error(_t('toastInvalidPrice')); return; }
      AppService.updateSelection(student.uid, _currentUser.uid, { priceOverride: val }, function(err) {
        if (err) { Toast.error(_t('toastSaveError')); return; }
        Toast.success(_t('toastSaveSuccess'));
        var isNowOvr = val !== null;
        var db = document.getElementById('ms-def-badge-' + student.uid);
        var ob = document.getElementById('ms-ovr-badge-' + student.uid);
        var rb = document.getElementById('ms-reset-btn-' + student.uid);
        if (db) db.className = 'ms-price-default-badge'  + (isNowOvr ? ' is-hidden' : '');
        if (ob) ob.className = 'ms-price-override-badge' + (isNowOvr ? '' : ' is-hidden');
        if (rb) rb.className = 'btn btn-sm btn-ghost ms-price-reset' + (isNowOvr ? '' : ' is-hidden');
      });
    });

    resetBtn.addEventListener('click', function() {
      AppService.updateSelection(student.uid, _currentUser.uid, { priceOverride: null }, function(err) {
        if (err) { Toast.error(_t('toastResetError')); return; }
        priceInput.value = '';
        Toast.success(_t('toastResetSuccess'));
        var db = document.getElementById('ms-def-badge-' + student.uid);
        var ob = document.getElementById('ms-ovr-badge-' + student.uid);
        var rb = document.getElementById('ms-reset-btn-' + student.uid);
        if (db) db.className = 'ms-price-default-badge';
        if (ob) ob.className = 'ms-price-override-badge is-hidden';
        if (rb) rb.className = 'btn btn-sm btn-ghost ms-price-reset is-hidden';
      });
    });

    detail.appendChild(priceAcc);

    /* 2. Individuelle Einstellungen button */
    var gridBtn = document.createElement('a');
    gridBtn.className = 'ms-btn-grid';
    gridBtn.href = './teacher.html?uid=' + encodeURIComponent(_currentUser.uid) +
                  '&openGrid=visibility&visStudent=' + encodeURIComponent(student.uid);
    var gIcon = document.createElement('div');
    gIcon.className = 'ms-btn-grid-icon';
    gIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    var gText = document.createElement('div');
    gText.className = 'ms-btn-grid-text';
    var gTitle = document.createElement('span');
    gTitle.className   = 'ms-btn-grid-title';
    gTitle.textContent = _t('gridBtnTitle');
    var gSub = document.createElement('span');
    gSub.className   = 'ms-btn-grid-sub';
    gSub.textContent = _t('gridBtnSub');
    gText.appendChild(gTitle);
    gText.appendChild(gSub);
    var gChip = document.createElement('div');
    gChip.className = 'ms-btn-grid-chip';
    var gChipAv = document.createElement('div');
    gChipAv.className   = 'ms-btn-grid-chip-av';
    var gName = AppService.getDisplayNameSync(student.uid) || student.uid;
    gChipAv.textContent = (gName.charAt(0) || '?').toUpperCase();
    var gChipName = document.createElement('span');
    gChipName.textContent = gName;
    gChip.appendChild(gChipAv);
    gChip.appendChild(gChipName);
    var gArrow = document.createElement('span');
    gArrow.className   = 'ms-btn-grid-arrow';
    gArrow.textContent = '\u203a';
    gridBtn.appendChild(gIcon);
    gridBtn.appendChild(gText);
    gridBtn.appendChild(gChip);
    gridBtn.appendChild(gArrow);
    detail.appendChild(gridBtn);

    /* 3. Buchungen accordion */
    var bookingAcc  = _buildAccordion('ms-accordion-icon-bookings', '', _t('accBookingsTitle'), slots.length + ' ' + _t('accBookingsTotal'));
    var bookingBody = bookingAcc.querySelector('.ms-accordion-body');
    var bIcon = bookingAcc.querySelector('.ms-accordion-icon');
    if (bIcon) {
      bIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>';
    }

    if (!slots.length) {
      var empty = document.createElement('p');
      empty.className   = 'text-muted student-bookings-empty';
      empty.textContent = _t('bookingsEmpty');
      bookingBody.appendChild(empty);
    } else {
      var todayStr = fmtDate(new Date());
      var byDate   = {};
      var dateOrder = [];
      for (var i = 0; i < slots.length; i++) {
        var d = slots[i].date;
        if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
        byDate[d].push(slots[i]);
      }
      dateOrder.sort();
      for (var di = 0; di < dateOrder.length; di++) {
        var dateStr  = dateOrder[di];
        var daySlots = byDate[dateStr].slice().sort(function(a, b) { return a.time < b.time ? -1 : 1; });
        var divider  = document.createElement('div');
        divider.className   = 'all-bookings-day-divider' + (dateStr < todayStr ? ' all-bookings-day-divider-past' : '');
        divider.textContent = _formatDateLabel(dateStr);
        bookingBody.appendChild(divider);
        for (var si = 0; si < daySlots.length; si++) {
          var s    = daySlots[si];
          var row  = document.createElement('div');
          row.className = 'student-booking-row' + (dateStr < todayStr ? ' is-past' : '') + (s.confirmedAt ? ' is-confirmed' : '');
          var timeEl   = document.createElement('span'); timeEl.className   = 'student-booking-time';   timeEl.textContent = s.time + '\u2013' + _halfHourAfter(s.time);
          var priceEl  = document.createElement('span'); priceEl.className  = 'student-booking-price';  priceEl.textContent = s.price ? _fmtForUser(parseFloat(s.price), _currentUser.uid) : '\u2014';
          var statusEl = document.createElement('span'); statusEl.className = 'student-booking-status'; statusEl.textContent = s.confirmedAt ? _t('statusConfirmed') : _t('statusPending');
          row.appendChild(timeEl); row.appendChild(priceEl); row.appendChild(statusEl);
          bookingBody.appendChild(row);
        }
      }
    }
    detail.appendChild(bookingAcc);
  }

  /* ── Reusable collapsible accordion builder ── */
  function _buildAccordion(iconClass, iconContent, title, meta) {
    var acc = document.createElement('div');
    acc.className = 'ms-accordion is-open';
    var header = document.createElement('div');
    header.className = 'ms-accordion-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'true');
    var icon = document.createElement('div');
    icon.className   = 'ms-accordion-icon ' + iconClass;
    icon.textContent = iconContent;
    var titleEl = document.createElement('div');
    titleEl.className   = 'ms-accordion-title';
    titleEl.textContent = title;
    var metaEl = document.createElement('div');
    metaEl.className   = 'ms-accordion-meta';
    metaEl.textContent = meta || '';
    var chevron = document.createElement('span');
    chevron.className = 'ms-accordion-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    header.appendChild(icon);
    header.appendChild(titleEl);
    header.appendChild(metaEl);
    header.appendChild(chevron);
    var body = document.createElement('div');
    body.className = 'ms-accordion-body';
    function _toggle() {
      var open = acc.classList.contains('is-open');
      acc.classList.toggle('is-open', !open);
      header.setAttribute('aria-expanded', String(!open));
    }
    header.addEventListener('click', _toggle);
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _toggle(); }
    });
    acc.appendChild(header);
    acc.appendChild(body);
    return acc;
  }

  function _formatDateLabel(dateStr) {
    if (!dateStr) return dateStr;
    var parts = dateStr.split('-');
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    var days   = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var months = ['Jan','Feb','M\u00e4r','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    return days[d.getDay()] + ', ' + d.getDate() + '. ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ── Render the full student list ── */
  function _render() {
    var container = document.getElementById('my-students-list');
    if (!container) return;
    container.innerHTML = '';

    var selections = AppService.getSelectionsByTeacherSync(_currentUser.uid);
    var students   = [];
    for (var i = 0; i < selections.length; i++) {
      var u = AppService.getUserSync(selections[i].studentId);
      if (u) students.push(u);
    }

    /* Search filter */
    var q = _searchQuery.toLowerCase().trim();
    if (q) {
      students = students.filter(function(u) {
        return (AppService.getDisplayNameSync(u.uid) || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    /* Search input */
    var searchWrap = document.createElement('div');
    searchWrap.innerHTML = buildSearchInput('ms-search', _t('searchPlaceholder'));
    var searchEl = searchWrap.firstChild;
    container.appendChild(searchEl);

    var searchInput = document.getElementById('ms-search');
    if (searchInput) {
      searchInput.value = _searchQuery;
      searchInput.addEventListener('input', function() {
        _searchQuery = searchInput.value;
        _render();
      });
    }

    if (!students.length) {
      var empty = document.createElement('p');
      /* V-04 FIX: was inline style.marginTop — now uses CSS class */
      empty.className = 'text-muted ms-empty-hint';
      empty.textContent = q ? _t('emptyNoResults') : _t('emptyNoStudents');
      container.appendChild(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    for (var si = 0; si < students.length; si++) {
      frag.appendChild(_buildCard(students[si]));
    }
    container.appendChild(frag);
  }

  /* ── Init ── */
  function init() {
    _currentUser = Auth.require('teacher');
    if (!_currentUser) return;

    Navbar.init('teacher');
    _render();
  }

  return { init: init };
}());

window.addEventListener('load', function() {
  _msLoadI18n(function() {
    if (typeof CurrencyService !== 'undefined' && typeof CurrencyService.onReady === 'function') {
      CurrencyService.onReady(function() { MyStudentsPage.init(); });
    } else {
      MyStudentsPage.init();
    }
  });
});
